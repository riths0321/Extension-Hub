// background.js — U-Scraper Service Worker v2.0

// ── Message Router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return;

  switch (message.action) {
    case 'fetchDetailPage':
      fetchDetailPage(message.url)
        .then(content => sendResponse({ content }))
        .catch(e => sendResponse({ error: e.message }));
      return true;

    case 'scrapeMultiPage':
      scrapeMultiPage(message.startUrl, message.maxPages, message.settings)
        .then(results => sendResponse({ success: true, data: results }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'recordAnalytics':
      recordAnalytics(message.data).then(() => sendResponse({ ok: true }));
      return true;

    case 'showNotification':
      showNotification(message.title, message.body);
      sendResponse({ ok: true });
      return;
  }
});

// ── Context Menu ────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'uscraper-scrape-page',
    title: 'Scrape this page with U-Scraper',
    contexts: ['page']
  });
  console.log('U-Scraper v2.0 installed');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'uscraper-scrape-page') {
    chrome.action.openPopup().catch(() => {});
  }
});

// ── Fetch Detail Page ────────────────────────────────────────────────────────
async function fetchDetailPage(url) {
  const validProtocols = ['http:', 'https:'];
  let urlObj;
  try {
    urlObj = new URL(url);
    if (!validProtocols.includes(urlObj.protocol)) throw new Error(`Invalid protocol: ${urlObj.protocol}`);
  } catch (e) {
    throw new Error(`Invalid URL: ${e.message}`);
  }

  const res = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(10000)
  });

  const ct = res.headers.get('content-type') || '';
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  if (!ct.includes('text/html')) throw new Error(`Invalid content type: ${ct}`);

  return res.text();
}

// ── Multi-page Scraping ──────────────────────────────────────────────────────
async function scrapeMultiPage(startUrl, maxPages = 5, settings = {}) {
  const results = [];
  let currentUrl = startUrl;
  let pageCount = 0;

  while (currentUrl && pageCount < maxPages) {
    try {
      // Notify progress
      chrome.runtime.sendMessage({
        action: 'scrapingProgress',
        progress: {
          current: Math.round((pageCount / maxPages) * 80) + 10,
          total: 100,
          step: `Scraping page ${pageCount + 1} of ${maxPages}`
        }
      }).catch(() => {});

      // Get the active tab and navigate or open a new tab
      const html = await fetchDetailPage(currentUrl);
      const parsed = parseHTMLPage(html, currentUrl);
      results.push(parsed);

      currentUrl = parsed.nextPageUrl || null;
      pageCount++;

      if (currentUrl) await sleep(500); // polite delay
    } catch (e) {
      console.error(`Multi-page error on ${currentUrl}:`, e);
      break;
    }
  }

  return results;
}

// ── Parse HTML String (for fetched pages) ───────────────────────────────────
function parseHTMLPage(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const getText = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const getAbs = (u) => { try { return new URL(u, url).href; } catch { return u; } };

  // Detect next page
  const nextSelectors = ['a[rel="next"]', '.next a', '.pagination .next a', 'a.next'];
  let nextPageUrl = null;
  for (const sel of nextSelectors) {
    const el = doc.querySelector(sel);
    if (el?.href && el.href !== url) { nextPageUrl = getAbs(el.href); break; }
  }

  return {
    url,
    title: doc.title,
    domain: new URL(url).hostname,
    paragraphs: Array.from(doc.querySelectorAll('p'))
      .map(p => getText(p)).filter(t => t.length > 3).slice(0, 500),
    headings: Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .map(h => ({ tag: h.tagName.toLowerCase(), text: getText(h) })).slice(0, 200),
    links: {
      internal: Array.from(doc.querySelectorAll('a[href]'))
        .map(a => { try { return new URL(a.href, url).href; } catch { return ''; } })
        .filter(h => h && new URL(h).origin === new URL(url).origin)
        .slice(0, 200)
    },
    images: Array.from(doc.querySelectorAll('img[src]'))
      .map(img => ({ src: getAbs(img.getAttribute('src')), alt: img.alt })).slice(0, 50),
    nextPageUrl,
    scrapedAt: new Date().toISOString()
  };
}

// ── Analytics Tracking ───────────────────────────────────────────────────────
async function recordAnalytics(eventData) {
  const now = new Date();
  const { scrapeHistory, analytics } = await chrome.storage.local.get(['scrapeHistory', 'analytics']);

  // Update history
  const history = scrapeHistory || [];
  const newEntry = {
    id: Date.now().toString(),
    url: eventData.url,
    title: eventData.title,
    domain: eventData.domain,
    timestamp: now.toISOString(),
    itemCount: eventData.itemCount || 0,
    duration: eventData.duration || 0,
    format: eventData.format || 'json',
    success: eventData.success !== false,
    error: eventData.error || null
  };
  history.unshift(newEntry);
  if (history.length > 100) history.splice(100);

  // Update aggregate stats
  const stats = analytics || {
    totalScrapes: 0,
    totalItems: 0,
    successCount: 0,
    errorCount: 0,
    domains: {},
    formats: { json: 0, csv: 0, html: 0, media: 0 },
    dailyScrapes: {}
  };

  stats.totalScrapes++;
  stats.totalItems += eventData.itemCount || 0;
  if (eventData.success !== false) stats.successCount++;
  else stats.errorCount++;

  const domain = eventData.domain || 'unknown';
  stats.domains[domain] = (stats.domains[domain] || 0) + 1;

  const fmt = eventData.format || 'json';
  if (stats.formats[fmt] !== undefined) stats.formats[fmt]++;

  const day = now.toISOString().substring(0, 10);
  stats.dailyScrapes[day] = (stats.dailyScrapes[day] || 0) + 1;
  // Keep last 30 days
  const keys = Object.keys(stats.dailyScrapes).sort();
  if (keys.length > 30) delete stats.dailyScrapes[keys[0]];

  await chrome.storage.local.set({ scrapeHistory: history, analytics: stats });
}

// ── Notifications ────────────────────────────────────────────────────────────
function showNotification(title, body) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title || 'U-Scraper',
    message: body || ''
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('U-Scraper v2.0 background worker initialized');

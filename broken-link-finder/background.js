// background.js — Service Worker (Manifest V3)
// Uses plain functions (no ES module imports) for MV3 service worker compatibility.

// ─── In-memory cache ───────────────────────────────────────────────────────────
const linkCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const MAX_CACHE = 2000;

function cacheGet(url) {
  const entry = linkCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { linkCache.delete(url); return null; }
  return entry.result;
}

function cacheSet(url, result) {
  if (linkCache.size >= MAX_CACHE) {
    linkCache.delete(linkCache.keys().next().value);
  }
  linkCache.set(url, { result, ts: Date.now() });
}

function cacheClearDomain(domain) {
  for (const key of linkCache.keys()) {
    try { if (new URL(key).hostname === domain) linkCache.delete(key); }
    catch (_) { linkCache.delete(key); }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of linkCache.entries()) {
    if (now - v.ts > CACHE_TTL) linkCache.delete(k);
  }
}, 60_000);

// ─── Link checking ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 10_000;
const SLOW_MS = 3_000;
const SKIP = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:', 'chrome:', 'chrome-extension:'];

function shouldSkip(url) {
  if (!url || url === '#') return true;
  for (const s of SKIP) if (url.startsWith(s)) return true;
  return false;
}

async function doFetch(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const resp = await fetch(url, { method, signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(timer);
    const responseTime = Date.now() - t0;

    // Track redirect chain
    const redirectChain = [];
    let finalUrl = url;
    let finalStatus = resp.status;
    let hops = 0;
    let curr = resp;
    let currUrl = url;

    while (curr.status >= 300 && curr.status < 400 && hops < 8) {
      const loc = curr.headers.get('location');
      if (!loc) break;
      try {
        const nextUrl = new URL(loc, currUrl).href;
        redirectChain.push({ from: currUrl, to: nextUrl, status: curr.status });
        currUrl = nextUrl;
        finalUrl = nextUrl;
        hops++;
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), TIMEOUT_MS);
        curr = await fetch(nextUrl, { method: 'HEAD', signal: c2.signal, redirect: 'manual' })
          .catch(() => ({ status: 0, headers: new Headers() }));
        clearTimeout(t2);
        finalStatus = curr.status;
      } catch (_) { break; }
    }

    return {
      url, finalUrl,
      status: finalStatus,
      ok: finalStatus >= 200 && finalStatus < 400,
      responseTime,
      redirectChain,
      redirectCount: redirectChain.length,
      tooManyRedirects: redirectChain.length > 3,
      networkError: false,
      timedOut: false,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      url, finalUrl: url,
      status: 0, ok: false,
      responseTime: Date.now() - t0,
      redirectChain: [],
      redirectCount: 0,
      tooManyRedirects: false,
      networkError: true,
      timedOut: err.name === 'AbortError',
      error: err.message,
    };
  }
}

async function checkLinkStatus(url) {
  if (shouldSkip(url)) {
    return { url, skipped: true, ok: true, status: null, responseTime: 0, redirectChain: [] };
  }

  const cached = cacheGet(url);
  if (cached) return cached;

  let result = await doFetch(url, 'HEAD');
  // 405 Method Not Allowed → retry with GET
  if (result.status === 405 || result.networkError) {
    const r2 = await doFetch(url, 'GET');
    if (!r2.networkError || result.networkError) result = r2;
  }

  cacheSet(url, result);
  return result;
}

function classifyStatus(r) {
  if (r.skipped) return 'skipped';
  if (r.networkError && !r.status) return r.timedOut ? 'slow' : 'error';
  const s = r.status;
  if (s >= 200 && s < 300) return r.responseTime > SLOW_MS ? 'slow' : 'live';
  if (s >= 300 && s < 400) return 'redirect';
  if (s === 404 || s === 410) return 'broken';
  if (s >= 400 && s < 500) return 'broken';
  if (s >= 500) return 'server_error';
  return 'error';
}

// ─── Scan history ──────────────────────────────────────────────────────────────
async function saveScanHistory(domain, stats) {
  const stored = await chrome.storage.local.get(['scanHistory']);
  const history = stored.scanHistory || {};
  if (!history[domain]) history[domain] = [];
  history[domain].unshift({
    time: Date.now(),
    total: stats.total,
    broken: stats.broken,
    live: stats.live,
    redirects: stats.redirects,
  });
  // Keep last 10 per domain
  history[domain] = history[domain].slice(0, 10);
  await chrome.storage.local.set({ scanHistory: history });
}

// ─── Install / context menus ───────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['settings'], (data) => {
    if (!data.settings) {
      chrome.storage.sync.set({
        settings: {
          autoHighlight: true,
          showNotifications: false,
          checkExternalLinks: false,
          darkMode: false,
          timeout: 10000,
          concurrency: 8,
        },
      });
    }
  });

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'scanPage', title: 'Scan page for broken links', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'scanLink', title: 'Check this link', contexts: ['link'] });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let targetTab = tab;
  if (!targetTab?.id) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTab = active;
  }
  if (!targetTab?.id) return;

  if (info.menuItemId === 'scanPage') {
    chrome.tabs.sendMessage(targetTab.id, { action: 'findAllLinks' });
  } else if (info.menuItemId === 'scanLink') {
    const result = await checkLinkStatus(info.linkUrl);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Link Check Result',
      message: `${info.linkUrl}\nStatus: ${result.ok ? 'Working' : 'Broken'} (${result.status || 'ERR'})`,
    });
  }
});

// ─── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'CHECK_LINK') {
    checkLinkStatus(request.url)
      .then((r) => sendResponse({ ...r, statusCategory: classifyStatus(r) }))
      .catch((e) => sendResponse({ ok: false, status: 0, error: e.message }));
    return true;
  }

  if (request.type === 'BATCH_CHECK') {
    const links = Array.isArray(request.links) ? request.links : [];
    const concurrency = Number.isFinite(request.concurrency) ? request.concurrency : 8;
    batchCheck(links, concurrency, (done, total, result) => {
      // Send progress updates back via storage (service worker can't push to popup directly)
      chrome.storage.session?.set({ scanProgress: { done, total } }).catch(() => {});
    })
      .then((results) => sendResponse({ results }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  if (request.type === 'SAVE_SCAN_HISTORY') {
    saveScanHistory(request.domain, request.stats)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (request.type === 'GET_SCAN_HISTORY') {
    chrome.storage.local.get(['scanHistory'], (data) => {
      sendResponse(data.scanHistory || {});
    });
    return true;
  }

  if (request.type === 'CLEAR_CACHE') {
    if (request.domain) cacheClearDomain(request.domain);
    else linkCache.clear();
    sendResponse({ ok: true });
  }

  if (request.type === 'BULK_SCAN') {
    handleBulkScan(request.baseUrl, request.maxDepth || 2)
      .then((results) => sendResponse({ results }))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  sendResponse({ error: 'Unknown request type' });
  return false;
});

// ─── Batch check ───────────────────────────────────────────────────────────────
async function batchCheck(links, concurrency, onProgress) {
  const results = new Array(links.length);
  let idx = 0;

  async function worker() {
    while (idx < links.length) {
      const i = idx++;
      const r = await checkLinkStatus(links[i].url);
      results[i] = { ...links[i], ...r, statusCategory: classifyStatus(r) };
      if (onProgress) onProgress(results.filter(Boolean).length, links.length, results[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, links.length || 1) }, worker));
  return results;
}

// ─── Bulk crawl ────────────────────────────────────────────────────────────────
async function handleBulkScan(baseUrl, maxDepth) {
  const visited = new Set();
  const pageResults = {};

  async function crawl(url, depth) {
    if (depth > maxDepth || visited.has(url)) return;
    visited.add(url);

    try {
      const resp = await fetch(url);
      const html = await resp.text();
      const links = extractLinks(html, url);
      const results = await batchCheck(links.map((u) => ({ url: u })), 6, null);

      pageResults[url] = results.map((r) => ({
        ...r,
        statusCategory: classifyStatus(r),
        sourcePage: url,
      }));

      for (const r of pageResults[url]) {
        if (r.ok) {
          try {
            const u = new URL(r.url);
            const b = new URL(baseUrl);
            if (u.hostname === b.hostname) await crawl(r.url, depth + 1);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  await crawl(baseUrl, 0);
  return pageResults;
}

function extractLinks(html, base) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).href;
      if (abs.startsWith('http')) links.add(abs);
    } catch (_) {}
  }
  return [...links];
}

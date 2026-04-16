
import { batchCheck, classifyStatus, classifyLinkType } from './linkService.js';
import * as cache from './cacheService.js';

/**
 * Scan a single tab. Returns structured scan result.
 */
export async function scanTab(tabId, { checkExternal = false, onProgress } = {}) {
  // Get links from content script
  const response = await chrome.tabs.sendMessage(tabId, {
    action: 'findAllLinks',
    checkExternal,
  });

  if (!response || !response.links) throw new Error('Failed to get links from page');

  const { links, pageOrigin } = response;

  // Batch-check all links
  const results = await batchCheck(links, {
    concurrency: 8,
    onProgress,
  });

  // Enrich results with classification
  const enriched = results.map((r) => ({
    ...r,
    linkType: classifyLinkType(r, pageOrigin || ''),
    statusCategory: classifyStatus(r),
  }));

  return {
    links: enriched,
    scannedAt: Date.now(),
    pageOrigin,
  };
}

/**
 * Bulk crawl a domain up to maxDepth pages.
 * Calls onPageDone(pageUrl, pageResults) after each page.
 */
export async function bulkScan(baseUrl, { maxDepth = 2, checkExternal = false, onPageDone } = {}) {
  const visited = new Set();
  const allResults = new Map(); // pageUrl -> results[]

  async function crawl(url, depth) {
    if (depth > maxDepth || visited.has(url)) return;
    visited.add(url);

    let html;
    try {
      const resp = await fetch(url);
      html = await resp.text();
    } catch (err) {
      return;
    }

    // Parse links from HTML
    const rawLinks = extractLinksFromHtml(html, url);
    const links = rawLinks.map((u) => ({ url: u, domType: 'anchor', text: '' }));

    const results = await batchCheck(links, { concurrency: 6 });
    const enriched = results.map((r) => ({
      ...r,
      linkType: classifyLinkType(r, new URL(baseUrl).origin),
      statusCategory: classifyStatus(r),
      sourcePage: url,
    }));

    allResults.set(url, enriched);
    if (onPageDone) onPageDone(url, enriched);

    // Crawl internal sub-pages
    if (depth < maxDepth) {
      for (const r of enriched) {
        if (r.ok && r.linkType === 'internal') {
          await crawl(r.url, depth + 1);
        }
      }
    }
  }

  await crawl(baseUrl, 0);
  return allResults;
}

function extractLinksFromHtml(html, baseUrl) {
  const links = new Set();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('a[href]').forEach((el) => {
    try {
      const abs = new URL(el.getAttribute('href'), baseUrl).href;
      if (abs.startsWith('http')) links.add(abs);
    } catch (_) {}
  });

  return [...links];
}

import * as cache from './cacheService.js';

const TIMEOUT_MS = 10_000;
const SLOW_THRESHOLD_MS = 3_000;

const SKIP_SCHEMES = new Set(['mailto:', 'tel:', 'javascript:', 'data:', 'blob:']);

/**
 * Classify a link result into a category string.
 * @param {object} result
 * @returns {'live'|'redirect'|'broken'|'server_error'|'slow'|'error'|'skipped'}
 */
export function classifyStatus(result) {
  if (result.skipped) return 'skipped';
  if (result.error && !result.status) return 'error';
  const s = result.status;
  if (s >= 200 && s < 300) {
    return result.responseTime > SLOW_THRESHOLD_MS ? 'slow' : 'live';
  }
  if (s >= 300 && s < 400) return 'redirect';
  if (s === 404 || s === 410) return 'broken';
  if (s >= 400 && s < 500) return 'broken';
  if (s >= 500) return 'server_error';
  return 'error';
}

/**
 * Classify a link by its type in the DOM.
 * @param {object} link  - {url, domType}  domType: 'anchor'|'image'|'script'|'stylesheet'
 * @param {string} pageOrigin
 * @returns {'internal'|'external'|'image'|'resource'}
 */
export function classifyLinkType(link, pageOrigin) {
  if (link.domType === 'image') return 'image';
  if (link.domType === 'script' || link.domType === 'stylesheet') return 'resource';
  try {
    const u = new URL(link.url);
    return u.origin === pageOrigin ? 'internal' : 'external';
  } catch (_) {
    return 'internal';
  }
}

/**
 * Check a single URL. Returns a structured result object.
 */
export async function checkLink(url) {
  // Skip non-http schemes
  try {
    const scheme = url.split(':')[0] + ':';
    if (SKIP_SCHEMES.has(scheme) || url === '#' || url === '') {
      return { url, skipped: true, status: null, ok: true, responseTime: 0, redirectChain: [] };
    }
  } catch (_) {
    return { url, skipped: true, status: null, ok: true, responseTime: 0, redirectChain: [] };
  }

  // Cache hit
  const cached = cache.get(url);
  if (cached) return cached;

  const result = await _fetchWithRetry(url);
  cache.set(url, result);
  return result;
}

async function _fetchWithRetry(url) {
  // Try HEAD first, fall back to GET
  let result = await _doFetch(url, 'HEAD');
  if (result.status === 405 || result.networkError) {
    result = await _doFetch(url, 'GET');
  }
  return result;
}

async function _doFetch(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  const redirectChain = [];

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'manual', // We track redirects manually
    });

    clearTimeout(timer);
    const responseTime = Date.now() - t0;

    // Handle redirect chain
    let currentUrl = url;
    let currentStatus = response.status;
    let hops = 0;

    // Follow redirects manually for chain tracking (up to 10 hops)
    let trackUrl = url;
    let trackResp = response;

    while (trackResp.status >= 300 && trackResp.status < 400 && hops < 10) {
      const location = trackResp.headers.get('location');
      if (!location) break;
      try {
        const nextUrl = new URL(location, trackUrl).href;
        redirectChain.push({ from: trackUrl, to: nextUrl, status: trackResp.status });
        trackUrl = nextUrl;
        hops++;

        // Follow the redirect
        const nextController = new AbortController();
        const nextTimer = setTimeout(() => nextController.abort(), TIMEOUT_MS);
        trackResp = await fetch(nextUrl, {
          method: 'HEAD',
          signal: nextController.signal,
          redirect: 'manual',
        }).catch(() => ({ status: 0, headers: { get: () => null } }));
        clearTimeout(nextTimer);
        currentStatus = trackResp.status;
        currentUrl = nextUrl;
      } catch (_) {
        break;
      }
    }

    const finalStatus = redirectChain.length > 0 ? currentStatus : response.status;

    return {
      url,
      finalUrl: currentUrl,
      status: finalStatus,
      ok: finalStatus >= 200 && finalStatus < 400,
      responseTime,
      redirectChain,
      redirectCount: redirectChain.length,
      tooManyRedirects: redirectChain.length > 3,
      networkError: false,
    };
  } catch (err) {
    clearTimeout(timer);
    const responseTime = Date.now() - t0;
    const isTimeout = err.name === 'AbortError';

    return {
      url,
      finalUrl: url,
      status: isTimeout ? 0 : 0,
      statusText: isTimeout ? 'Timeout' : 'Network Error',
      ok: false,
      responseTime,
      redirectChain: [],
      redirectCount: 0,
      tooManyRedirects: false,
      networkError: true,
      timedOut: isTimeout,
      error: err.message,
    };
  }
}

/**
 * Batch-check an array of links with concurrency control.
 * Calls onProgress(checkedCount, total, result) after each check.
 */
export async function batchCheck(links, { concurrency = 8, onProgress } = {}) {
  const results = new Array(links.length);
  let index = 0;

  async function worker() {
    while (index < links.length) {
      const i = index++;
      const link = links[i];
      const result = await checkLink(link.url);
      results[i] = { ...link, ...result };
      if (onProgress) onProgress(results.filter(Boolean).length, links.length, results[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, links.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Suggest alternatives for a broken link.
 * Basic heuristic: same domain + common fallbacks.
 */
export function suggestAlternatives(url, pageOrigin) {
  const suggestions = [];
  try {
    const u = new URL(url);
    const origin = u.origin;

    // Suggestion 1: domain root
    if (u.pathname !== '/') {
      suggestions.push({ url: origin + '/', reason: 'Domain root' });
    }

    // Suggestion 2: parent path
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      suggestions.push({ url: origin + '/' + parts.join('/') + '/', reason: 'Parent path' });
    }

    // Suggestion 3: www/non-www variant
    if (u.hostname.startsWith('www.')) {
      const noWww = u.hostname.slice(4);
      suggestions.push({ url: `${u.protocol}//${noWww}${u.pathname}`, reason: 'Without www' });
    } else {
      suggestions.push({ url: `${u.protocol}//www.${u.hostname}${u.pathname}`, reason: 'With www' });
    }

    // Suggestion 4: https if http
    if (u.protocol === 'http:') {
      suggestions.push({ url: 'https://' + u.hostname + u.pathname, reason: 'Try HTTPS' });
    }
  } catch (_) {}

  return suggestions.slice(0, 3);
}
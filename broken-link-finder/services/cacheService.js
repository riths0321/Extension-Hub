
const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 2000;

function get(url) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.result;
}

function set(url, result) {
  if (cache.size >= MAX_ENTRIES) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(url, { result, ts: Date.now() });
}

function clearDomain(domain) {
  for (const key of cache.keys()) {
    try {
      if (new URL(key).hostname === domain) cache.delete(key);
    } catch (_) {
      cache.delete(key);
    }
  }
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, val] of cache.entries()) {
    if (now - val.ts > TTL_MS) cache.delete(key);
  }
}

// Purge every minute
setInterval(purgeExpired, 60_000);

export { get, set, clearDomain };
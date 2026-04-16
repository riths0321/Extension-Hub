
const SKIP_SCHEMES = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:', 'chrome:', 'chrome-extension:'];

export function isCheckableUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url === '#' || url.startsWith('#')) return false;
  for (const s of SKIP_SCHEMES) {
    if (url.startsWith(s)) return false;
  }
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function normalizeUrl(url, base) {
  try {
    return new URL(url, base).href;
  } catch (_) {
    return url;
  }
}
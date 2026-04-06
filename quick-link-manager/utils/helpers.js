/**
 * Shared utility helpers — pure functions, no side effects.
 * CSP-compliant: No innerHTML, all DOM manipulation safe.
 */

/** Domain emoji map (fallback icons) */
const ICON_MAP = {
  'gmail.com': '📧',
  'mail.google.com': '📧',
  'google.com': '🔍',
  'calendar.google.com': '📅',
  'docs.google.com': '📄',
  'sheets.google.com': '📊',
  'drive.google.com': '💾',
  'youtube.com': '🎬',
  'instagram.com': '📷',
  'facebook.com': '👥',
  'twitter.com': '🐦',
  'x.com': '🐦',
  'linkedin.com': '💼',
  'amazon.com': '🛒',
  'amazon.in': '🛒',
  'flipkart.com': '📦',
  'myntra.com': '👕',
  'netflix.com': '🎥',
  'spotify.com': '🎵',
  'github.com': '💻',
  'notion.so': '📝',
  'slack.com': '💬',
  'discord.com': '💬',
  'whatsapp.com': '💚',
  'figma.com': '🎨',
  'medium.com': '📰',
  'reddit.com': '🤖',
  'stackoverflow.com': '💡',
  'vercel.com': '▲',
  'trello.com': '📋',
  'asana.com': '✅',
  'zoom.us': '📹',
};

/**
 * Create SVG element safely (CSP-compliant)
 * @param {string} width - SVG width
 * @param {string} height - SVG height
 * @param {string} viewBox - SVG viewBox
 * @param {Array} paths - Array of [elementName, attributes] pairs
 * @returns {SVGElement}
 */
export function createSvg(width, height, viewBox, paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  paths.forEach(([tagName, attrs]) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
    svg.appendChild(element);
  });
  
  return svg;
}

/**
 * Extract domain from URL.
 * @param {string} url
 * @returns {string}
 */
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Get icon for a URL.
 * @param {string} url
 * @returns {string}
 */
export function getIcon(url) {
  const domain = getDomain(url);
  return ICON_MAP[domain] || '🔗';
}

/**
 * Generate a UUID-ish ID.
 * @returns {string}
 */
export function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Format a date string as relative time.
 * @param {string} iso
 * @returns {string}
 */
export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Trigger a file download in the extension popup.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Create an element with optional class.
 * @param {string} tag
 * @param {string} cls
 * @returns {HTMLElement}
 */
export function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

/**
 * Create a text node.
 * @param {string} content
 * @returns {Text}
 */
export function text(content) {
  return document.createTextNode(content);
}

/**
 * Escape HTML special characters (CSP-safe)
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
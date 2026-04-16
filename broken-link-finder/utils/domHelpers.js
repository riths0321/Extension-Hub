
/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {object} attrs  - key/value pairs; 'className' maps to .className
 * @param {...(Node|string)} children
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      for (const [dk, dv] of Object.entries(value)) {
        element.dataset[dk] = dv;
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

/** Replace all children of a container node */
export function replaceChildren(container, ...children) {
  while (container.firstChild) container.removeChild(container.firstChild);
  for (const child of children) {
    if (child == null) continue;
    container.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Truncate a string to maxLen, appending ellipsis */
export function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/** Format milliseconds as a human-readable string */
export function formatMs(ms) {
  if (!ms || ms <= 0) return '—';
  if (ms < 1000) return ms + ' ms';
  return (ms / 1000).toFixed(1) + ' s';
}
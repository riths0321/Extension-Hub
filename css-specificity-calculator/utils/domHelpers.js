/**
 * domHelpers.js
 * CSP-safe DOM utilities — no innerHTML usage.
 */

/**
 * Create an element with optional attributes, classes, and text.
 */
export function el(tag, { cls, text, attrs, style } = {}) {
  const node = document.createElement(tag);
  if (cls) {
    (Array.isArray(cls) ? cls : [cls]).forEach(c => c && node.classList.add(c));
  }
  if (text !== undefined) node.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (style) Object.assign(node.style, style);
  return node;
}

/**
 * Append multiple children to a parent.
 */
export function append(parent, ...children) {
  children.flat().filter(Boolean).forEach(c => parent.appendChild(c));
  return parent;
}

/**
 * Clear all children from a node.
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Show or hide an element via display style.
 */
export function setVisible(node, visible, displayType = 'block') {
  node.style.display = visible ? displayType : 'none';
}

/**
 * Debounce a function.
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

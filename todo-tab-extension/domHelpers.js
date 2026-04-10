/* ═══════════════════════════════════════════
   domHelpers.js — CSP-safe DOM creation
   No innerHTML, no eval, no inline handlers
   ═══════════════════════════════════════════ */

const DOM = {
  /** Create element with attrs + optional children */
  el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class')    node.className = v;
      else if (k.startsWith('data-')) node.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      else if (k === 'text')  node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child == null) continue;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  },

  /** Build SVG element safely */
  svg(width, height, viewBox, paths) {
    const ns  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'none');
    for (const p of paths) {
      const el = document.createElementNS(ns, p.tag || 'path');
      for (const [k, v] of Object.entries(p)) {
        if (k !== 'tag') el.setAttribute(k, v);
      }
      svg.appendChild(el);
    }
    return svg;
  },

  /** Safely set text content */
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  /** Show / hide */
  show(el) { el && el.classList.remove('hidden'); },
  hide(el) { el && el.classList.add('hidden'); },

  /** Clear all children */
  clear(el) { while (el.firstChild) el.removeChild(el.firstChild); },

  /** Debounce */
  debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },
};

/* ── SVG Icon Library (CSP-safe) ─────────────── */
const ICONS = {
  check: () => DOM.svg(16, 16, '0 0 24 24', [
    { d: 'M9 11l3 3L22 4', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    { d: 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  plus: () => DOM.svg(16, 16, '0 0 24 24', [
    { d: 'M12 5v14M5 12h14', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round' },
  ]),
  trash: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  search: () => DOM.svg(15, 15, '0 0 24 24', [
    { tag: 'circle', cx: '11', cy: '11', r: '8', stroke: 'currentColor', 'stroke-width': '2' },
    { d: 'M21 21l-4.35-4.35', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  list: () => DOM.svg(16, 16, '0 0 24 24', [
    { d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' },
  ]),
  chart: () => DOM.svg(16, 16, '0 0 24 24', [
    { d: 'M18 20V10M12 20V4M6 20v-6', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  settings: () => DOM.svg(16, 16, '0 0 24 24', [
    { tag: 'circle', cx: '12', cy: '12', r: '3', stroke: 'currentColor', 'stroke-width': '2' },
    { d: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  sun: () => DOM.svg(16, 16, '0 0 24 24', [
    { tag: 'circle', cx: '12', cy: '12', r: '5', stroke: 'currentColor', 'stroke-width': '2' },
    { d: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  moon: () => DOM.svg(16, 16, '0 0 24 24', [
    { d: 'M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  export: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  import: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  close: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M18 6L6 18M6 6l12 12', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' },
  ]),
  flag: () => DOM.svg(12, 12, '0 0 24 24', [
    { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  calendar: () => DOM.svg(12, 12, '0 0 24 24', [
    { tag: 'rect', x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2', stroke: 'currentColor', 'stroke-width': '2' },
    { d: 'M16 2v4M8 2v4M3 10h18', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  note: () => DOM.svg(12, 12, '0 0 24 24', [
    { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
    { d: 'M14 2v6h6M16 13H8M16 17H8M10 9H8', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
  ]),
  shield: () => DOM.svg(12, 12, '0 0 24 24', [
    { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', stroke: 'currentColor', 'stroke-width': '2' },
  ]),
  markAll: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M2 12l5 5L22 4', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]),
  drag: () => DOM.svg(14, 14, '0 0 24 24', [
    { d: 'M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round' },
  ]),
};

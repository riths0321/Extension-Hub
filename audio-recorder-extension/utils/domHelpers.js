// domHelpers.js — NO innerHTML
var DOMHelpers = {
  clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  },
  show(el) { el.style.display = ''; },
  hide(el) { el.style.display = 'none'; },
  toggle(el, show) { el.style.display = show ? '' : 'none'; }
};

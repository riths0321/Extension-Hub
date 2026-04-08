/**
 * dropdowns.js — Custom dropdown wiring for all SnipVault selects
 * CSP-safe · MV3 · no eval
 */
(function () {
  'use strict';

  var OPEN_CLASS = 'open';
  var WRAP_CLASS = 'cdm-wrap';
  var BTN_CLASS = 'cdm-btn';
  var MENU_CLASS = 'cdm-menu';
  var ITEM_CLASS = 'cdm-item';
  var LABEL_CLASS = 'cdm-label';

  function selectedText(select) {
    var opt = select.options[select.selectedIndex];
    return opt ? opt.text : '';
  }

  function closeAll(exceptWrap) {
    var wraps = document.querySelectorAll('.' + WRAP_CLASS + '.' + OPEN_CLASS);
    Array.prototype.forEach.call(wraps, function (wrap) {
      if (exceptWrap && wrap === exceptWrap) return;
      wrap.classList.remove(OPEN_CLASS);
      var menu = wrap._menu;
      if (menu) menu.style.display = 'none';
      var btn = wrap.querySelector('.' + BTN_CLASS);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function setMenuPosition(btn, menu) {
    var rect = btn.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var menuMaxHeight = 242;

    menu.style.width = rect.width + 'px';
    menu.style.left = rect.left + 'px';

    if (rect.bottom + menuMaxHeight + 8 <= viewportHeight) {
      menu.style.top = rect.bottom + 6 + 'px';
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = (viewportHeight - rect.top + 6) + 'px';
      menu.style.top = 'auto';
    }
  }

  function syncWrap(select, wrap) {
    if (!select || !wrap) return;

    var label = wrap.querySelector('.' + LABEL_CLASS);
    if (label) label.textContent = selectedText(select);

    var menu = wrap._menu;
    if (!menu) return;

    var items = menu.querySelectorAll('.' + ITEM_CLASS);
    Array.prototype.forEach.call(items, function (item) {
      item.classList.toggle('active', item.dataset.val === select.value);
    });
  }

  function rebuildMenu(select, wrap) {
    var menu = wrap._menu;
    if (!menu) return;
    menu.textContent = '';

    var options = Array.prototype.slice.call(select.options);
    options.forEach(function (opt) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = ITEM_CLASS + (opt.value === select.value ? ' active' : '');
      item.dataset.val = opt.value;
      item.textContent = opt.text;
      menu.appendChild(item);
    });
  }

  // ── Generic dropdown factory ────────────────────────────────
  function buildDropdown(select) {
    if (!select || select._cdmBuilt) return null;
    select._cdmBuilt = true;

    var wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    var label = document.createElement('span');
    label.className = LABEL_CLASS;
    label.textContent = selectedText(select);

    var caret = document.createElement('span');
    caret.className = 'cdm-caret';
    caret.textContent = '▾';

    btn.appendChild(label);
    btn.appendChild(caret);

    var menu = document.createElement('div');
    menu.className = MENU_CLASS;
    menu.style.display = 'none';
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);

    wrap.appendChild(btn);
    wrap._menu = menu;

    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    function open() {
      closeAll(wrap);
      wrap.classList.add(OPEN_CLASS);
      setMenuPosition(btn, menu);
      menu.style.display = 'block';
      btn.setAttribute('aria-expanded', 'true');
      var active = menu.querySelector('.' + ITEM_CLASS + '.active');
      if (active) {
        setTimeout(function () {
          active.scrollIntoView({ block: 'nearest' });
        }, 20);
      }
    }

    function close() {
      wrap.classList.remove(OPEN_CLASS);
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains(OPEN_CLASS)) close();
      else open();
    });

    menu.addEventListener('click', function (e) {
      var item = e.target.closest('.' + ITEM_CLASS);
      if (!item) return;

      select.value = item.dataset.val;
      syncWrap(select, wrap);
      close();
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.addEventListener('click', function (e) {
      if (wrap.classList.contains(OPEN_CLASS) && !wrap.contains(e.target) && !menu.contains(e.target)) close();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    var observer = new MutationObserver(function () {
      rebuildMenu(select, wrap);
      syncWrap(select, wrap);
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value']
    });

    window.addEventListener('scroll', function () {
      if (wrap.classList.contains(OPEN_CLASS)) setMenuPosition(btn, menu);
    }, { passive: true });
    document.addEventListener('scroll', function () {
      if (wrap.classList.contains(OPEN_CLASS)) setMenuPosition(btn, menu);
    }, { passive: true, capture: true });
    window.addEventListener('resize', function () {
      if (wrap.classList.contains(OPEN_CLASS)) setMenuPosition(btn, menu);
    }, { passive: true });

    rebuildMenu(select, wrap);
    syncWrap(select, wrap);

    wrap._sync = function () {
      rebuildMenu(select, wrap);
      syncWrap(select, wrap);
    };

    return wrap;
  }

  function init() {
    var selects = document.querySelectorAll('select');
    Array.prototype.forEach.call(selects, function (s) { buildDropdown(s); });
  }

  function sync(id) {
    var select = document.getElementById(id);
    if (!select) return;
    var sibling = select.nextSibling;
    while (sibling && sibling.nodeType !== 1) sibling = sibling.nextSibling;
    if (sibling && typeof sibling._sync === 'function') sibling._sync();
  }

  window.SnipDropdowns = {
    init: init,
    build: buildDropdown,
    sync: sync
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

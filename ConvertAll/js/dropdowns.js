/**
 * dropdowns.js — ConvertAll Premium Dropdown System v2
 *
 * ROOT FIX: Menus are appended to <body> with position:fixed + JS coordinates.
 * This prevents overflow:hidden / z-index / stacking-context clipping
 * from .glass-panel, .form-group, or any ancestor.
 *
 * Design: white bg · #2563EB accent · Manrope · 16px radius
 * CSP-safe · no eval · MV3 compliant
 */
(function () {
  'use strict';

  var WRAP  = 'ca-dropdown';
  var MENU  = 'ca-menu';
  var ITEM  = 'ca-item';
  var OPEN  = 'ca-open';
  var ACT   = 'ca-active';

  /* ── 1. Inject styles ────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('ca-dd-styles')) return;
    var s = document.createElement('style');
    s.id = 'ca-dd-styles';
    s.textContent = [

      /* Wrapper — inline flow only, no overflow */
      '.' + WRAP + '{position:relative;display:block;width:100%;font-family:\'Manrope\',system-ui,sans-serif;}',

      /* Trigger */
      '.ca-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:48px;padding:0 16px;background:#FFFFFF;border:1.5px solid #e5e7eb;border-radius:16px;cursor:pointer;font-family:\'Manrope\',system-ui,sans-serif;font-size:15px;font-weight:500;color:#111111;text-align:left;outline:none;transition:border-color .18s ease,box-shadow .18s ease;box-shadow:0 1px 3px rgba(0,0,0,.04);white-space:nowrap;overflow:hidden;box-sizing:border-box;}',
      '.ca-trigger:hover{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.09);}',
      '.' + OPEN + ' .ca-trigger{border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.12);}',
      '.ca-trigger-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.ca-caret{flex-shrink:0;color:#6B7280;display:flex;align-items:center;transition:transform .18s ease,color .18s ease;pointer-events:none;}',
      '.' + OPEN + ' .ca-caret{transform:rotate(180deg);color:#2563EB;}',

      /* Menu — FIXED position, attached to body */
      '.' + MENU + '{position:fixed;z-index:999999;background:#FFFFFF;border:1.5px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.07);padding:6px;max-height:230px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;display:none;}',
      '.' + MENU + '.ca-vis{display:block;animation:caIn .15s ease;}',
      '@keyframes caIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}',

      /* Search */
      '.ca-sw{position:relative;margin-bottom:5px;}',
      '.ca-si{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none;display:flex;align-items:center;}',
      '.ca-search{display:block;width:100%;height:34px;padding:0 10px 0 30px;border:1.5px solid #e5e7eb;border-radius:10px;font-family:\'Manrope\',system-ui,sans-serif;font-size:13px;color:#111111;background:#F9FAFB;outline:none;transition:border-color .15s,background .15s;box-sizing:border-box;}',
      '.ca-search:focus{border-color:#2563EB;background:#FFFFFF;}',

      /* Items */
      '.' + ITEM + '{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:none;border-radius:10px;background:transparent;font-family:\'Manrope\',system-ui,sans-serif;font-size:14px;font-weight:500;color:#374151;cursor:pointer;text-align:left;outline:none;transition:background .1s ease,color .1s ease;box-sizing:border-box;}',
      '.' + ITEM + ':hover{background:rgba(37,99,235,.06);color:#2563EB;}',
      '.' + ITEM + '.' + ACT + '{background:rgba(37,99,235,.08);color:#2563EB;font-weight:700;}',
      '.ca-lbl{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.ca-chk{flex-shrink:0;display:none;color:#2563EB;align-items:center;}',
      '.' + ITEM + '.' + ACT + ' .ca-chk{display:flex;}',

      /* Empty */
      '.ca-empty{padding:12px;text-align:center;color:#9CA3AF;font-size:13px;}',

      /* Scrollbar */
      '.' + MENU + '::-webkit-scrollbar{width:4px;}',
      '.' + MENU + '::-webkit-scrollbar-track{background:transparent;}',
      '.' + MENU + '::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:4px;}',
      '.' + MENU + '::-webkit-scrollbar-thumb:hover{background:#d1d5db;}',

      /* Dark mode */
      'body.dark-mode .ca-trigger{background:#333;border-color:#404040;color:#fff;}',
      'body.dark-mode .ca-trigger:hover,body.dark-mode .' + OPEN + ' .ca-trigger{border-color:#2563EB;}',
      'body.dark-mode .ca-caret{color:#9ca3af;}',
      'body.dark-mode .' + OPEN + ' .ca-caret{color:#60a5fa;}',
      'body.dark-mode .' + MENU + '{background:#2d2d2d;border-color:#404040;box-shadow:0 12px 32px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.25);}',
      'body.dark-mode .' + ITEM + '{color:#e5e5e5;}',
      'body.dark-mode .' + ITEM + ':hover{background:rgba(37,99,235,.18);color:#60a5fa;}',
      'body.dark-mode .' + ITEM + '.' + ACT + '{background:rgba(37,99,235,.22);color:#60a5fa;}',
      'body.dark-mode .ca-chk{color:#60a5fa;}',
      'body.dark-mode .ca-search{background:#3a3a3a;border-color:#505050;color:#fff;}',
      'body.dark-mode .ca-search:focus{border-color:#2563EB;background:#444;}'

    ].join('');
    document.head.appendChild(s);
  }

  /* ── 2. Position menu with fixed coords ─────────────────── */
  function positionMenu(trigger, menu) {
    var rect = trigger.getBoundingClientRect();
    var vp   = window.innerHeight || document.documentElement.clientHeight;
    var mH   = 242;

    menu.style.width = rect.width + 'px';
    menu.style.left  = rect.left  + 'px';

    if (rect.bottom + mH + 8 <= vp) {
      // open downward
      menu.style.top    = (rect.bottom + 6) + 'px';
      menu.style.bottom = 'auto';
    } else {
      // open upward
      menu.style.bottom = (vp - rect.top + 6) + 'px';
      menu.style.top    = 'auto';
    }
  }

  /* ── 3. Helper ───────────────────────────────────────────── */
  function selText(select) {
    var o = select.options[select.selectedIndex];
    return o ? o.text : '';
  }

  /* ── 4. Build one dropdown ───────────────────────────────── */
  function buildDropdown(select) {
    if (!select || select._caBuilt) return null;
    select._caBuilt = true;

    var useSearch = select.options.length >= 8;

    /* wrapper */
    var wrap = document.createElement('div');
    wrap.className = WRAP;

    /* trigger */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ca-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded',  'false');

    var tText = document.createElement('span');
    tText.className   = 'ca-trigger-text';
    tText.textContent = selText(select);

    var tCaret = document.createElement('span');
    tCaret.className = 'ca-caret';
    tCaret.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(tText);
    trigger.appendChild(tCaret);

    /* menu — goes to body */
    var menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    menu._ownerWrap = wrap;

    /* search */
    var searchInput = null;
    if (useSearch) {
      var sw = document.createElement('div');
      sw.className = 'ca-sw';

      var si = document.createElement('span');
      si.className = 'ca-si';
      si.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';

      searchInput = document.createElement('input');
      searchInput.type        = 'text';
      searchInput.className   = 'ca-search';
      searchInput.placeholder = 'Search\u2026';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck  = false;

      sw.appendChild(si);
      sw.appendChild(searchInput);
      menu.appendChild(sw);
    }

    var listWrap = document.createElement('div');
    menu.appendChild(listWrap);

    /* populate */
    function populate(filter) {
      listWrap.innerHTML = '';
      var q = (filter || '').toLowerCase().trim();
      var count = 0;

      Array.from(select.options).forEach(function(opt) {
        if (q && opt.text.toLowerCase().indexOf(q) === -1) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = ITEM;
        btn.dataset.val = opt.value;
        btn.setAttribute('role', 'option');

        var lbl = document.createElement('span');
        lbl.className   = 'ca-lbl';
        lbl.textContent = opt.text;

        var chk = document.createElement('span');
        chk.className = 'ca-chk';
        chk.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

        btn.appendChild(lbl);
        btn.appendChild(chk);

        if (opt.value === select.value) btn.classList.add(ACT);

        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          select.value  = opt.value;
          tText.textContent = opt.text;
          listWrap.querySelectorAll('.' + ITEM).forEach(function(i) { i.classList.remove(ACT); });
          btn.classList.add(ACT);
          closeMenu();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        listWrap.appendChild(btn);
        count++;
      });

      if (count === 0) {
        var empty = document.createElement('div');
        empty.className   = 'ca-empty';
        empty.textContent = 'No results';
        listWrap.appendChild(empty);
      }
    }

    populate();

    if (searchInput) {
      searchInput.addEventListener('input', function() { populate(searchInput.value); });
    }

    /* open / close */
    var isOpen = false;

    function openMenu() {
      // close all other open menus
      document.querySelectorAll('.' + MENU + '.ca-vis').forEach(function(m) {
        if (m !== menu) {
          m.classList.remove('ca-vis');
          if (m._ownerWrap) m._ownerWrap.classList.remove(OPEN);
        }
      });

      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add('ca-vis');
      wrap.classList.add(OPEN);
      trigger.setAttribute('aria-expanded', 'true');

      var active = listWrap.querySelector('.' + ITEM + '.' + ACT);
      if (active) setTimeout(function() { active.scrollIntoView({ block: 'nearest' }); }, 20);

      if (searchInput) {
        searchInput.value = '';
        populate();
        setTimeout(function() { searchInput.focus(); }, 30);
      }
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove('ca-vis');
      wrap.classList.remove(OPEN);
      trigger.setAttribute('aria-expanded', 'false');
    }

    /* events */
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    document.addEventListener('click', function(e) {
      if (isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });

    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isOpen) openMenu(); }
      else if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('scroll',  function() { if (isOpen) positionMenu(trigger, menu); }, { passive: true });
    window.addEventListener('resize',  function() { if (isOpen) positionMenu(trigger, menu); }, { passive: true });

    /* observe external select mutations */
    var obs = new MutationObserver(function() {
      populate(searchInput ? searchInput.value : '');
      tText.textContent = selText(select);
    });
    obs.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

    /* public sync */
    wrap._sync = function() {
      tText.textContent = selText(select);
      populate();
    };

    /* insert wrapper in DOM */
    wrap.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  /* ── 5. Init all selects ─────────────────────────────────── */
  function init() {
    injectStyles();
    document.querySelectorAll('select').forEach(function(s) { buildDropdown(s); });
  }

  /* ── 6. Public API ───────────────────────────────────────── */
  window.CADropdowns = {
    init:  init,
    build: buildDropdown,
    sync:  function(id) {
      var s = document.getElementById(id);
      if (!s) return;
      var w = s.nextSibling;
      if (w && typeof w._sync === 'function') w._sync();
    }
  };

  /* ── 7. Auto-run ─────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
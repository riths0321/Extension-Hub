/**
 * dropdowns.js — Todo Tab Premium Dropdown System
 * CSP-safe · no eval · no innerHTML · MV3 compliant
 * Smooth animations via CSS classes only
 */
(function () {
  'use strict';

  var WRAP  = 'td-dropdown';
  var MENU  = 'td-menu';
  var ITEM  = 'td-item';
  var OPEN  = 'td-open';
  var ACT   = 'td-active';
  var VIS   = 'td-vis';

  /* ── Position menu ───────────────────────────── */
  function positionMenu(trigger, menu) {
    var rect  = trigger.getBoundingClientRect();
    var vp    = window.innerHeight || document.documentElement.clientHeight;
    var mH    = menu.scrollHeight || 260;
    var space = 8;

    menu.style.width = rect.width + 'px';
    menu.style.left  = rect.left + 'px';

    if (rect.bottom + mH + space <= vp) {
      menu.style.top      = (rect.bottom + space) + 'px';
      menu.style.bottom   = 'auto';
      menu.dataset.dir    = 'down';
    } else {
      menu.style.top      = 'auto';
      menu.style.bottom   = (vp - rect.top + space) + 'px';
      menu.dataset.dir    = 'up';
    }
  }

  /* ── Get selected text ───────────────────────── */
  function selText(select) {
    var o = select.options[select.selectedIndex];
    return o ? o.text : '';
  }

  /* ── Build one premium dropdown ──────────────── */
  function buildDropdown(select) {
    if (!select || select._tdBuilt) return null;
    select._tdBuilt = true;

    var useSearch = select.dataset.noSearch !== 'true' && select.options.length >= 8;

    /* wrapper */
    var wrap = document.createElement('div');
    wrap.className = WRAP;
    if (select.className) wrap.classList.add(select.className + '-wrap');

    /* ── Trigger button ─────────────────── */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'td-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded',  'false');

    var tContent = document.createElement('div');
    tContent.className = 'td-trigger-inner';

    var tText = document.createElement('span');
    tText.className   = 'td-trigger-text';
    tText.textContent = selText(select);

    /* caret SVG — CSP safe via createElementNS */
    var ns    = 'http://www.w3.org/2000/svg';
    var svgEl = document.createElementNS(ns, 'svg');
    svgEl.setAttribute('class',   'td-caret');
    svgEl.setAttribute('width',   '14');
    svgEl.setAttribute('height',  '14');
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('fill',    'none');
    var polyEl = document.createElementNS(ns, 'polyline');
    polyEl.setAttribute('points',        '6 9 12 15 18 9');
    polyEl.setAttribute('stroke',        'currentColor');
    polyEl.setAttribute('stroke-width',  '2.5');
    polyEl.setAttribute('stroke-linecap',  'round');
    polyEl.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(polyEl);

    tContent.appendChild(tText);
    tContent.appendChild(svgEl);
    trigger.appendChild(tContent);

    /* ── Floating menu — appended to body ──── */
    var menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    menu.dataset.dir = 'down';
    document.body.appendChild(menu);
    menu._ownerWrap = wrap;

    /* ── Search ─────────────────────────── */
    var searchInput = null;
    if (useSearch) {
      var sw = document.createElement('div');
      sw.className = 'td-search-wrap';

      var searchNS   = 'http://www.w3.org/2000/svg';
      var searchIcon = document.createElementNS(searchNS, 'svg');
      searchIcon.setAttribute('class',   'td-search-icon');
      searchIcon.setAttribute('width',   '13');
      searchIcon.setAttribute('height',  '13');
      searchIcon.setAttribute('viewBox', '0 0 24 24');
      searchIcon.setAttribute('fill',    'none');
      var circEl = document.createElementNS(searchNS, 'circle');
      circEl.setAttribute('cx', '11'); circEl.setAttribute('cy', '11'); circEl.setAttribute('r', '8');
      circEl.setAttribute('stroke', 'currentColor'); circEl.setAttribute('stroke-width', '2.5');
      var lineEl = document.createElementNS(searchNS, 'path');
      lineEl.setAttribute('d', 'm21 21-4.35-4.35');
      lineEl.setAttribute('stroke', 'currentColor'); lineEl.setAttribute('stroke-width', '2.5');
      lineEl.setAttribute('stroke-linecap', 'round');
      searchIcon.appendChild(circEl);
      searchIcon.appendChild(lineEl);

      searchInput = document.createElement('input');
      searchInput.type         = 'text';
      searchInput.className    = 'td-search-input';
      searchInput.placeholder  = 'Search…';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck   = false;

      sw.appendChild(searchIcon);
      sw.appendChild(searchInput);
      menu.appendChild(sw);
    }

    /* ── List container ─────────────────── */
    var listWrap = document.createElement('div');
    listWrap.className = 'td-list';
    menu.appendChild(listWrap);

    /* ── Populate items ─────────────────── */
    function populate(filter) {
      /* Remove existing items */
      while (listWrap.firstChild) listWrap.removeChild(listWrap.firstChild);

      var q     = (filter || '').toLowerCase().trim();
      var count = 0;

      Array.from(select.options).forEach(function (opt, idx) {
        if (q && opt.text.toLowerCase().indexOf(q) === -1) return;

        var btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = ITEM;
        btn.dataset.val = opt.value;
        btn.setAttribute('role',           'option');
        btn.setAttribute('aria-selected',  opt.value === select.value ? 'true' : 'false');

        /* animate-in stagger */
        btn.style.animationDelay = (idx * 18) + 'ms';

        /* color dot for category items */
        if (opt.dataset && opt.dataset.color) {
          var dot = document.createElement('span');
          dot.className = 'td-dot';
          dot.style.background = opt.dataset.color;
          btn.appendChild(dot);
        }

        var lbl = document.createElement('span');
        lbl.className   = 'td-lbl';
        lbl.textContent = opt.text;
        btn.appendChild(lbl);

        /* checkmark icon */
        var chkNS  = 'http://www.w3.org/2000/svg';
        var chkSvg = document.createElementNS(chkNS, 'svg');
        chkSvg.setAttribute('class',   'td-check');
        chkSvg.setAttribute('width',   '14');
        chkSvg.setAttribute('height',  '14');
        chkSvg.setAttribute('viewBox', '0 0 24 24');
        chkSvg.setAttribute('fill',    'none');
        var chkPoly = document.createElementNS(chkNS, 'polyline');
        chkPoly.setAttribute('points',       '20 6 9 17 4 12');
        chkPoly.setAttribute('stroke',       'currentColor');
        chkPoly.setAttribute('stroke-width', '2.5');
        chkPoly.setAttribute('stroke-linecap',  'round');
        chkPoly.setAttribute('stroke-linejoin', 'round');
        chkSvg.appendChild(chkPoly);
        btn.appendChild(chkSvg);

        if (opt.value === select.value) {
          btn.classList.add(ACT);
          btn.setAttribute('aria-selected', 'true');
        }

        btn.addEventListener('mouseenter', function () {
          listWrap.querySelectorAll('.' + ITEM).forEach(function (i) { i.classList.remove('td-hover'); });
          btn.classList.add('td-hover');
        });

        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          select.value      = opt.value;
          tText.textContent = opt.text;
          listWrap.querySelectorAll('.' + ITEM).forEach(function (i) {
            i.classList.remove(ACT);
            i.setAttribute('aria-selected', 'false');
          });
          btn.classList.add(ACT);
          btn.setAttribute('aria-selected', 'true');
          closeMenu();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        listWrap.appendChild(btn);
        count++;
      });

      /* Empty state */
      if (count === 0) {
        var empty = document.createElement('div');
        empty.className   = 'td-empty';
        empty.textContent = 'No results found';
        listWrap.appendChild(empty);
      }
    }

    populate();

    if (searchInput) {
      searchInput.addEventListener('input', function () { populate(searchInput.value); });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          var first = listWrap.querySelector('.' + ITEM);
          if (first) first.focus();
        }
      });
    }

    /* keyboard nav in list */
    listWrap.addEventListener('keydown', function (e) {
      var items = Array.from(listWrap.querySelectorAll('.' + ITEM));
      var idx   = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items[idx + 1]) items[idx + 1].focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); if (idx > 0) items[idx - 1].focus(); else if (searchInput) searchInput.focus(); }
      if (e.key === 'Escape')    { closeMenu(); trigger.focus(); }
    });

    /* ── Open / Close ───────────────────── */
    var isOpen = false;
    var closeRaf = null;

    function openMenu() {
      /* close other open menus */
      document.querySelectorAll('.' + MENU + '.' + VIS).forEach(function (m) {
        if (m !== menu && m._ownerWrap) {
          m.classList.remove(VIS);
          m._ownerWrap.classList.remove(OPEN);
        }
      });

      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add(VIS);
      wrap.classList.add(OPEN);
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('td-active-trigger');

      /* scroll active item into view */
      var active = listWrap.querySelector('.' + ITEM + '.' + ACT);
      if (active) {
        requestAnimationFrame(function () {
          active.scrollIntoView({ block: 'nearest' });
        });
      }

      if (searchInput) {
        searchInput.value = '';
        populate();
        setTimeout(function () { searchInput.focus(); }, 60);
      }
    }

    function closeMenu() {
      if (!isOpen) return;
      isOpen = false;
      wrap.classList.remove(OPEN);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove('td-active-trigger');

      menu.classList.add('td-closing');
      clearTimeout(closeRaf);
      closeRaf = setTimeout(function () {
        menu.classList.remove(VIS);
        menu.classList.remove('td-closing');
      }, 130);
    }

    /* ── Events ─────────────────────────── */
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    document.addEventListener('click', function (e) {
      if (isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) openMenu();
        else {
          var first = listWrap.querySelector('.' + ITEM);
          if (first) first.focus();
        }
      }
      if (e.key === 'Escape') { closeMenu(); }
      if (e.key === 'Tab')    { closeMenu(); }
    });

    window.addEventListener('scroll', function () { if (isOpen) positionMenu(trigger, menu); }, { passive: true });
    window.addEventListener('resize', function () { if (isOpen) positionMenu(trigger, menu); }, { passive: true });

    /* ── Observe external mutations ─────── */
    var obs = new MutationObserver(function () {
      populate(searchInput ? searchInput.value : '');
      tText.textContent = selText(select);
    });
    obs.observe(select, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['value', 'selected']
    });

    /* ── Public sync ────────────────────── */
    wrap._sync = function () {
      tText.textContent = selText(select);
      populate();
    };

    /* ── Insert into DOM ────────────────── */
    wrap.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  /* ── Init all selects ────────────────────────── */
  function init() {
    document.querySelectorAll('select').forEach(function (s) { buildDropdown(s); });
  }

  /* ── Public API ──────────────────────────────── */
  window.TDDropdowns = {
    init:  init,
    build: buildDropdown,
    sync:  function (id) {
      var s = document.getElementById(id);
      if (!s) return;
      var w = s.nextSibling;
      if (w && typeof w._sync === 'function') w._sync();
    },
  };

  /* ── Auto-run ────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

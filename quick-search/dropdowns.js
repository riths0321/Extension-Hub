
(function () {
  'use strict';

  var WRAP  = 'qs-dropdown';
  var MENU  = 'qs-menu';
  var ITEM  = 'qs-item';
  var OPEN  = 'qs-open';
  var ACT   = 'qs-active';
  var NS    = 'http://www.w3.org/2000/svg';

  /* ── SVG Helpers (CSP-safe) ────────────────────────────────── */
  function createSVG(width, height, viewBox, attrs, path) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', attrs.strokeWidth);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    var el = document.createElementNS(NS, path.tag);
    path.attrs.forEach(function(a) { el.setAttribute(a[0], a[1]); });
    svg.appendChild(el);
    
    return svg;
  }

  function createChevronDown() {
    return createSVG('16', '16', '0 0 24 24', { strokeWidth: '2' }, {
      tag: 'polyline',
      attrs: [['points', '6 9 12 15 18 9']]
    });
  }

  function createSearchIcon() {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '13');
    svg.setAttribute('height', '13');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    var circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    svg.appendChild(circle);
    
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'm21 21-4.35-4.35');
    svg.appendChild(path);
    
    return svg;
  }

  function createCheckmark() {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    
    var polyline = document.createElementNS(NS, 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);
    
    return svg;
  }

  /* ── 1. Position menu with fixed coords ─────────────────── */
  function positionMenu(trigger, menu) {
    var rect = trigger.getBoundingClientRect();
    var vp   = window.innerHeight || document.documentElement.clientHeight;
    var mH   = 242;

    menu.style.setProperty('--menu-width', rect.width + 'px');
    menu.style.setProperty('--menu-left', rect.left + 'px');

    if (rect.bottom + mH + 8 <= vp) {
      menu.style.setProperty('--menu-top', (rect.bottom + 6) + 'px');
      menu.style.setProperty('--menu-bottom', 'auto');
    } else {
      menu.style.setProperty('--menu-bottom', (vp - rect.top + 6) + 'px');
      menu.style.setProperty('--menu-top', 'auto');
    }
  }

  /* ── 2. Helper ───────────────────────────────────────────── */
  function selText(select) {
    var o = select.options[select.selectedIndex];
    return o ? o.text : '';
  }

  /* ── 3. Build one dropdown ───────────────────────────────── */
  function buildDropdown(select) {
    if (!select || select._qsBuilt) return null;
    select._qsBuilt = true;

    var useSearch = select.options.length >= 8;

    /* wrapper */
    var wrap = document.createElement('div');
    wrap.className = WRAP;

    /* trigger */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'qs-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded',  'false');

    var tText = document.createElement('span');
    tText.className   = 'qs-trigger-text';
    tText.textContent = selText(select);

    var tCaret = document.createElement('span');
    tCaret.className = 'qs-caret';
    tCaret.appendChild(createChevronDown());

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
      sw.className = 'qs-sw';

      var si = document.createElement('span');
      si.className = 'qs-si';
      si.appendChild(createSearchIcon());

      searchInput = document.createElement('input');
      searchInput.type        = 'text';
      searchInput.className   = 'qs-search';
      searchInput.placeholder = 'Search…';
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
      listWrap.replaceChildren();
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
        lbl.className   = 'qs-lbl';
        lbl.textContent = opt.text;

        var chk = document.createElement('span');
        chk.className = 'qs-chk';
        chk.appendChild(createCheckmark());

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
        empty.className   = 'qs-empty';
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
      document.querySelectorAll('.' + MENU + '.qs-vis').forEach(function(m) {
        if (m !== menu) {
          m.classList.remove('qs-vis');
          if (m._ownerWrap) m._ownerWrap.classList.remove(OPEN);
        }
      });

      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add('qs-vis');
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
      menu.classList.remove('qs-vis');
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
    select.classList.add('hidden');
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  /* ── 4. Init all selects ─────────────────────────────────── */
  function init() {
    document.querySelectorAll('select').forEach(function(s) { buildDropdown(s); });
  }

  /* ── 5. Public API ───────────────────────────────────────── */
  window.QSDropdowns = {
    init:  init,
    build: buildDropdown,
    sync:  function(id) {
      var s = document.getElementById(id);
      if (!s) return;
      var w = s.nextSibling;
      if (w && typeof w._sync === 'function') w._sync();
    }
  };

  /* ── 6. Auto-run ─────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

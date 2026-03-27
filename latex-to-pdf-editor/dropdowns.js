/**
 * dropdowns.js — LaTeX Studio Custom Dropdown v3
 * CSP-safe · no eval · no dynamic styles · MV3 compliant
 *
 * FIXES:
 *  1. mousedown + preventDefault on items → no spurious document close
 *  2. positionMenu uses getBoundingClientRect accurately
 *  3. menu width = trigger width, left-aligned to trigger
 *  4. animation: slides down from -4px, not upward
 */
(function () {
  'use strict';

  var WRAP = 'ca-dropdown';
  var MENU = 'ca-menu';
  var ITEM = 'ca-item';
  var OPEN = 'ca-open';
  var ACT  = 'ca-active';

  /* ── Position menu flush under trigger ─────────────────────── */
  function positionMenu(trigger, menu) {
    var rect    = trigger.getBoundingClientRect();
    var vpH     = window.innerHeight || document.documentElement.clientHeight;
    var menuH   = 244;
    var gap     = 4;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var scrollX = window.scrollX || window.pageXOffset || 0;

    /* width matches trigger exactly */
    menu.style.width    = rect.width + 'px';
    menu.style.minWidth = rect.width + 'px';

    /* horizontal: align left edge to trigger left */
    menu.style.left = (rect.left + scrollX) + 'px';

    /* vertical: below trigger unless no room */
    var spaceBelow = vpH - rect.bottom;
    if (spaceBelow >= menuH + gap) {
      menu.style.top    = (rect.bottom + scrollY + gap) + 'px';
      menu.style.bottom = 'auto';
    } else {
      menu.style.top    = 'auto';
      menu.style.bottom = (vpH - rect.top + scrollY + gap) + 'px';
    }
  }

  function selText(select) {
    var o = select.options[select.selectedIndex];
    return o ? o.text : '';
  }

  /* ── Build one custom dropdown ──────────────────────────────── */
  function buildDropdown(select) {
    if (!select || select._caBuilt) return null;
    select._caBuilt = true;

    var useSearch = select.options.length >= 8;

    /* wrapper div (replaces <select> visually) */
    var wrap = document.createElement('div');
    wrap.className = WRAP;

    /* trigger button */
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ca-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var tText = document.createElement('span');
    tText.className   = 'ca-trigger-text';
    tText.textContent = selText(select);

    var tCaret = document.createElement('span');
    tCaret.className = 'ca-caret';
    tCaret.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(tText);
    trigger.appendChild(tCaret);

    /* floating menu appended to <body> to escape overflow:hidden parents */
    var menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    menu._ownerWrap = wrap;

    /* optional search input */
    var searchInput = null;
    if (useSearch) {
      var sw = document.createElement('div');
      sw.className = 'ca-sw';

      var si = document.createElement('span');
      si.className = 'ca-si';
      si.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';

      searchInput = document.createElement('input');
      searchInput.type         = 'text';
      searchInput.className    = 'ca-search';
      searchInput.placeholder  = 'Search…';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck   = false;

      /* prevent mousedown on search from triggering outside-close */
      searchInput.addEventListener('mousedown', function (e) { e.stopPropagation(); });

      sw.appendChild(si);
      sw.appendChild(searchInput);
      menu.appendChild(sw);
    }

    var listWrap = document.createElement('div');
    listWrap.className = 'ca-list';
    menu.appendChild(listWrap);

    /* ── populate ── */
    function populate(filter) {
      listWrap.innerHTML = '';
      var q     = (filter || '').toLowerCase().trim();
      var count = 0;

      Array.from(select.options).forEach(function (opt) {
        if (q && opt.text.toLowerCase().indexOf(q) === -1) return;

        var btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = ITEM;
        btn.dataset.val = opt.value;
        btn.setAttribute('role', 'option');

        var lbl = document.createElement('span');
        lbl.className   = 'ca-lbl';
        lbl.textContent = opt.text;

        var chk = document.createElement('span');
        chk.className = 'ca-chk';
        chk.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

        btn.appendChild(lbl);
        btn.appendChild(chk);

        if (opt.value === select.value) btn.classList.add(ACT);

        /*
         * CRITICAL FIX: use mousedown + preventDefault.
         * This prevents the browser from blurring the trigger and firing
         * the document mousedown → closeMenu before we finish selecting.
         */
        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
          e.stopPropagation();

          select.value      = opt.value;
          tText.textContent = opt.text;

          listWrap.querySelectorAll('.' + ITEM).forEach(function (i) {
            i.classList.remove(ACT);
          });
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
      searchInput.addEventListener('input', function () {
        populate(searchInput.value);
      });
    }

    /* ── open / close state ── */
    var isOpen = false;

    function openMenu() {
      /* close other open menus */
      document.querySelectorAll('.' + MENU + '.ca-vis').forEach(function (m) {
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

      /* scroll active item into view */
      var active = listWrap.querySelector('.' + ITEM + '.' + ACT);
      if (active) {
        setTimeout(function () { active.scrollIntoView({ block: 'nearest' }); }, 20);
      }

      if (searchInput) {
        searchInput.value = '';
        populate();
        setTimeout(function () { searchInput.focus(); }, 30);
      }
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove('ca-vis');
      wrap.classList.remove(OPEN);
      trigger.setAttribute('aria-expanded', 'false');
    }

    /* trigger click toggles open/close */
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    /*
     * Outside close — use mousedown so it fires BEFORE any click events.
     * Item mousedowns call stopPropagation, so they never reach here.
     */
    document.addEventListener('mousedown', function (e) {
      if (isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });

    /* keyboard navigation on trigger */
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) {
          openMenu();
        } else {
          var first = listWrap.querySelector('.' + ITEM);
          if (first) first.focus();
        }
      } else if (e.key === 'Escape') {
        closeMenu();
        trigger.focus();
      }
    });

    /* keyboard navigation inside list */
    listWrap.addEventListener('keydown', function (e) {
      var items = Array.from(listWrap.querySelectorAll('.' + ITEM));
      var idx   = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < items.length - 1) items[idx + 1].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) items[idx - 1].focus(); else trigger.focus();
      } else if (e.key === 'Escape') {
        closeMenu();
        trigger.focus();
      }
    });

    /* reposition on scroll / resize */
    window.addEventListener('scroll', function () {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });

    /* watch for external changes to the <select> */
    var obs = new MutationObserver(function () {
      populate(searchInput ? searchInput.value : '');
      tText.textContent = selText(select);
    });
    obs.observe(select, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['value']
    });

    /* public sync method */
    wrap._sync = function () {
      tText.textContent = selText(select);
      populate();
    };

    /* insert wrapper right after the hidden <select> */
    wrap.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    document.querySelectorAll('select').forEach(function (s) {
      buildDropdown(s);
    });
  }

  /* ── Public API ─────────────────────────────────────────────── */
  window.CADropdowns = {
    init:  init,
    build: buildDropdown,
    sync:  function (id) {
      var s = document.getElementById(id);
      if (!s) return;
      var w = s.nextSibling;
      if (w && typeof w._sync === 'function') w._sync();
    }
  };

  /* ── Auto-run on DOM ready ──────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

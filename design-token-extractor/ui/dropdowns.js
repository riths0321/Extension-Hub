(function () {
  'use strict';

  var WRAP_CLASS = 'ca-dropdown';
  var MENU_CLASS = 'ca-menu';
  var ITEM_CLASS = 'ca-item';
  var OPEN_CLASS = 'ca-open';
  var ACTIVE_CLASS = 'ca-active';
  var VISIBLE_CLASS = 'ca-vis';
  var SEARCH_THRESHOLD = 8;
  var GAP = 6;
  var EDGE = 8;

  function makeIconChevron() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', '6 9 12 15 18 9');
    svg.appendChild(polyline);
    return svg;
  }

  function makeIconSearch() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.4');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '11');
    c.setAttribute('cy', '11');
    c.setAttribute('r', '8');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'm21 21-4.35-4.35');
    svg.appendChild(c);
    svg.appendChild(p);
    return svg;
  }

  function makeIconCheck() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);
    return svg;
  }

  function selectedText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.text : '';
  }

  function closeAllMenus(except) {
    document.querySelectorAll('.' + MENU_CLASS + '.' + VISIBLE_CLASS).forEach(function (menu) {
      if (menu === except) return;
      menu.classList.remove(VISIBLE_CLASS);
      if (menu._ownerWrap) menu._ownerWrap.classList.remove(OPEN_CLASS);
      if (menu._ownerTrigger) menu._ownerTrigger.setAttribute('aria-expanded', 'false');
      menu._isOpen = false;
    });
  }

  function positionMenu(trigger, menu) {
    var rect = trigger.getBoundingClientRect();
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var viewportW = window.innerWidth || document.documentElement.clientWidth;
    var menuHeight = Math.min(menu.scrollHeight || 260, 280);

    var width = Math.max(160, rect.width);
    var left = Math.min(Math.max(EDGE, rect.left), Math.max(EDGE, viewportW - width - EDGE));

    menu.style.width = width + 'px';
    menu.style.left = left + 'px';

    if (rect.bottom + GAP + menuHeight + EDGE <= viewportH) {
      menu.style.top = (rect.bottom + GAP) + 'px';
      menu.style.bottom = 'auto';
      return;
    }

    var bottom = viewportH - rect.top + GAP;
    menu.style.bottom = Math.max(EDGE, bottom) + 'px';
    menu.style.top = 'auto';
  }

  function setActiveItem(listWrap, index) {
    var items = Array.from(listWrap.querySelectorAll('.' + ITEM_CLASS));
    items.forEach(function (item, idx) {
      item.classList.toggle('ca-kbd', idx === index);
    });
    return items;
  }

  function buildDropdown(select) {
    if (!select || select._caBuilt) return null;
    select._caBuilt = true;

    var useSearch = select.options.length >= SEARCH_THRESHOLD;

    var wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ca-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var triggerText = document.createElement('span');
    triggerText.className = 'ca-trigger-text';
    triggerText.textContent = selectedText(select);

    var caret = document.createElement('span');
    caret.className = 'ca-caret';
    caret.appendChild(makeIconChevron());

    trigger.appendChild(triggerText);
    trigger.appendChild(caret);

    var menu = document.createElement('div');
    menu.className = MENU_CLASS;
    menu.setAttribute('role', 'listbox');
    menu._ownerWrap = wrap;
    menu._ownerTrigger = trigger;
    menu._isOpen = false;
    document.body.appendChild(menu);

    var searchInput = null;
    if (useSearch) {
      var searchWrap = document.createElement('div');
      searchWrap.className = 'ca-sw';
      var searchIcon = document.createElement('span');
      searchIcon.className = 'ca-si';
      searchIcon.appendChild(makeIconSearch());
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'ca-search';
      searchInput.placeholder = 'Search...';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck = false;
      searchWrap.appendChild(searchIcon);
      searchWrap.appendChild(searchInput);
      menu.appendChild(searchWrap);
    }

    var listWrap = document.createElement('div');
    listWrap.className = 'ca-list';
    menu.appendChild(listWrap);

    var kbdIndex = -1;
    var rafId = 0;

    function schedulePosition() {
      if (!menu._isOpen) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        if (!menu._isOpen) return;
        if (!document.body.contains(trigger) || !document.body.contains(menu)) {
          closeMenu();
          return;
        }
        positionMenu(trigger, menu);
      });
    }

    function populate(filter) {
      listWrap.textContent = '';
      var q = (filter || '').toLowerCase().trim();
      var visibleCount = 0;

      Array.from(select.options).forEach(function (opt) {
        if (q && opt.text.toLowerCase().indexOf(q) === -1) return;

        var item = document.createElement('button');
        item.type = 'button';
        item.className = ITEM_CLASS;
        item.dataset.val = opt.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', opt.value === select.value ? 'true' : 'false');

        var label = document.createElement('span');
        label.className = 'ca-lbl';
        label.textContent = opt.text;

        var check = document.createElement('span');
        check.className = 'ca-chk';
        check.appendChild(makeIconCheck());

        item.appendChild(label);
        item.appendChild(check);

        if (opt.value === select.value) item.classList.add(ACTIVE_CLASS);

        item.addEventListener('click', function (e) {
          e.stopPropagation();
          select.value = opt.value;
          triggerText.textContent = opt.text;
          listWrap.querySelectorAll('.' + ITEM_CLASS).forEach(function (i) {
            i.classList.remove(ACTIVE_CLASS);
            i.setAttribute('aria-selected', 'false');
          });
          item.classList.add(ACTIVE_CLASS);
          item.setAttribute('aria-selected', 'true');
          closeMenu();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        listWrap.appendChild(item);
        visibleCount++;
      });

      if (visibleCount === 0) {
        var empty = document.createElement('div');
        empty.className = 'ca-empty';
        empty.textContent = 'No results';
        listWrap.appendChild(empty);
      }

      kbdIndex = -1;
      setActiveItem(listWrap, kbdIndex);
    }

    function openMenu() {
      closeAllMenus(menu);
      menu._isOpen = true;
      schedulePosition();
      menu.classList.add(VISIBLE_CLASS);
      wrap.classList.add(OPEN_CLASS);
      trigger.setAttribute('aria-expanded', 'true');

      if (searchInput) {
        searchInput.value = '';
        populate('');
        setTimeout(function () { searchInput.focus(); }, 20);
      } else {
        var active = listWrap.querySelector('.' + ITEM_CLASS + '.' + ACTIVE_CLASS);
        if (active) active.scrollIntoView({ block: 'nearest' });
      }
    }

    function closeMenu() {
      menu._isOpen = false;
      menu.classList.remove(VISIBLE_CLASS);
      wrap.classList.remove(OPEN_CLASS);
      trigger.setAttribute('aria-expanded', 'false');
      kbdIndex = -1;
      setActiveItem(listWrap, kbdIndex);
    }

    function moveActive(delta) {
      var items = Array.from(listWrap.querySelectorAll('.' + ITEM_CLASS));
      if (!items.length) return;
      if (kbdIndex < 0) {
        var currentIndex = items.findIndex(function (x) { return x.classList.contains(ACTIVE_CLASS); });
        kbdIndex = currentIndex >= 0 ? currentIndex : 0;
      } else {
        kbdIndex = Math.max(0, Math.min(items.length - 1, kbdIndex + delta));
      }
      var resolved = setActiveItem(listWrap, kbdIndex);
      if (resolved[kbdIndex]) resolved[kbdIndex].scrollIntoView({ block: 'nearest' });
    }

    function selectActiveFromKeyboard() {
      var items = Array.from(listWrap.querySelectorAll('.' + ITEM_CLASS));
      if (kbdIndex < 0 || !items[kbdIndex]) return;
      items[kbdIndex].click();
    }

    populate('');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        populate(searchInput.value);
        schedulePosition();
      });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); selectActiveFromKeyboard(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); trigger.focus(); }
      });
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      menu._isOpen ? closeMenu() : openMenu();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!menu._isOpen) openMenu();
        moveActive(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!menu._isOpen) openMenu();
        moveActive(-1);
      } else if (e.key === 'Escape') {
        closeMenu();
      }
    });

    document.addEventListener('click', function (e) {
      if (menu._isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });

    function onResize() {
      if (menu._isOpen) schedulePosition();
    }

    function onAnyScroll() {
      if (menu._isOpen) schedulePosition();
    }

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('scroll', onAnyScroll, true);

    var observer = new MutationObserver(function () {
      triggerText.textContent = selectedText(select);
      populate(searchInput ? searchInput.value : '');
      if (menu._isOpen) schedulePosition();
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled']
    });

    wrap._sync = function () {
      triggerText.textContent = selectedText(select);
      populate(searchInput ? searchInput.value : '');
    };

    wrap._destroy = function () {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onAnyScroll, true);
      if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      select.style.display = '';
      select._caBuilt = false;
    };

    wrap.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);
    return wrap;
  }

  function init(root) {
    var scope = root || document;
    scope.querySelectorAll('select').forEach(function (select) {
      buildDropdown(select);
    });
  }

  function sync(id) {
    var select = document.getElementById(id);
    if (!select) return;
    var wrap = select.nextElementSibling;
    if (wrap && typeof wrap._sync === 'function') wrap._sync();
  }

  function destroy(id) {
    var select = document.getElementById(id);
    if (!select) return;
    var wrap = select.nextElementSibling;
    if (wrap && typeof wrap._destroy === 'function') wrap._destroy();
  }

  window.CADropdowns = {
    init: init,
    build: buildDropdown,
    sync: sync,
    destroy: destroy
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
})();

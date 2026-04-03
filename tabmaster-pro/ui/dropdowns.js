/**
 * dropdowns.js — TabMaster Pro Smooth Dropdown System
 * Styles live in popup.css
 */
(function () {
  'use strict';

  var WRAP = 'tm-dropdown';
  var TRIGGER = 'tm-trigger';
  var MENU = 'tm-menu';
  var ITEM = 'tm-item';
  var OPEN = 'tm-open';
  var ACTIVE = 'tm-active';
  var VISIBLE = 'tm-visible';

  function createSvg(width, height, viewBox, paths, strokeWidth) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth || 2));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    paths.forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });

    return svg;
  }

  function positionMenu(trigger, menu) {
    var rect = trigger.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var estimatedHeight = Math.min(Math.max(menu.scrollHeight || 0, 120), 260);

    menu.style.width = Math.max(rect.width, 92) + 'px';
    menu.style.left = rect.left + 'px';

    if (rect.bottom + estimatedHeight + 8 <= viewportHeight) {
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = (viewportHeight - rect.top + 6) + 'px';
      menu.style.top = 'auto';
    }
  }

  function selectedText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.text : '';
  }

  function closeAll(exceptMenu) {
    document.querySelectorAll('.' + MENU + '.' + VISIBLE).forEach(function (menu) {
      if (menu === exceptMenu) return;
      menu.classList.remove(VISIBLE);
      if (menu._ownerWrap) {
        menu._ownerWrap.classList.remove(OPEN);
        var trigger = menu._ownerWrap.querySelector('.' + TRIGGER);
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function buildDropdown(select) {
    if (!select || select._tmDropdownBuilt) return null;
    select._tmDropdownBuilt = true;

    var useSearch = select.options.length >= 8;

    var wrap = document.createElement('div');
    wrap.className = WRAP;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = TRIGGER;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var text = document.createElement('span');
    text.className = 'tm-trigger-text';
    text.textContent = selectedText(select);

    var caret = document.createElement('span');
    caret.className = 'tm-caret';
    caret.appendChild(createSvg(16, 16, '0 0 24 24', ['M6 9l6 6 6-6'], 2));

    trigger.appendChild(text);
    trigger.appendChild(caret);

    var menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    menu._ownerWrap = wrap;
    document.body.appendChild(menu);

    var searchInput = null;
    if (useSearch) {
      var searchWrap = document.createElement('div');
      searchWrap.className = 'tm-search-wrap';

      var searchIcon = document.createElement('span');
      searchIcon.className = 'tm-search-icon';
      searchIcon.appendChild(createSvg(13, 13, '0 0 24 24', ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16', 'm21 21-4.35-4.35'], 2.4));

      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'tm-search-input';
      searchInput.placeholder = 'Search...';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck = false;

      searchWrap.appendChild(searchIcon);
      searchWrap.appendChild(searchInput);
      menu.appendChild(searchWrap);
    }

    var list = document.createElement('div');
    list.className = 'tm-list';
    menu.appendChild(list);

    function populate(filter) {
      list.textContent = '';
      var query = (filter || '').toLowerCase().trim();
      var count = 0;

      Array.from(select.options).forEach(function (option) {
        if (query && option.text.toLowerCase().indexOf(query) === -1) return;

        var item = document.createElement('button');
        item.type = 'button';
        item.className = ITEM;
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');

        var label = document.createElement('span');
        label.className = 'tm-label';
        label.textContent = option.text;

        var check = document.createElement('span');
        check.className = 'tm-check';
        check.appendChild(createSvg(14, 14, '0 0 24 24', ['M20 6 9 17l-5-5'], 2.4));

        item.appendChild(label);
        item.appendChild(check);

        if (option.value === select.value) {
          item.classList.add(ACTIVE);
          item.setAttribute('aria-selected', 'true');
        } else {
          item.setAttribute('aria-selected', 'false');
        }

        item.addEventListener('click', function (event) {
          event.stopPropagation();
          select.value = option.value;
          text.textContent = option.text;

          list.querySelectorAll('.' + ITEM).forEach(function (node) {
            node.classList.remove(ACTIVE);
            node.setAttribute('aria-selected', 'false');
          });

          item.classList.add(ACTIVE);
          item.setAttribute('aria-selected', 'true');
          closeMenu();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        list.appendChild(item);
        count++;
      });

      if (count === 0) {
        var empty = document.createElement('div');
        empty.className = 'tm-empty';
        empty.textContent = 'No results';
        list.appendChild(empty);
      }
    }

    populate('');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        populate(searchInput.value);
      });
    }

    var isOpen = false;

    function openMenu() {
      closeAll(menu);
      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add(VISIBLE);
      wrap.classList.add(OPEN);
      trigger.setAttribute('aria-expanded', 'true');

      var activeItem = list.querySelector('.' + ITEM + '.' + ACTIVE);
      if (activeItem) {
        setTimeout(function () {
          activeItem.scrollIntoView({ block: 'nearest' });
        }, 20);
      }

      if (searchInput) {
        searchInput.value = '';
        populate('');
        setTimeout(function () {
          searchInput.focus();
        }, 30);
      }
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove(VISIBLE);
      wrap.classList.remove(OPEN);
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      if (isOpen) closeMenu();
      else openMenu();
    });

    document.addEventListener('click', function (event) {
      if (isOpen && !wrap.contains(event.target) && !menu.contains(event.target)) {
        closeMenu();
      }
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!isOpen) openMenu();
      } else if (event.key === 'Escape') {
        closeMenu();
      }
    });

    window.addEventListener('scroll', function () {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });

    var observer = new MutationObserver(function () {
      text.textContent = selectedText(select);
      populate(searchInput ? searchInput.value : '');
    });

    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled']
    });

    wrap._sync = function () {
      text.textContent = selectedText(select);
      populate('');
    };

    wrap.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  function init() {
    document.querySelectorAll('select').forEach(function (select) {
      buildDropdown(select);
    });
  }

  globalThis.TMDropdowns = {
    init: init,
    build: buildDropdown,
    sync: function (id) {
      var select = document.getElementById(id);
      if (!select) return;
      var next = select.nextElementSibling;
      if (next && typeof next._sync === 'function') {
        next._sync();
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

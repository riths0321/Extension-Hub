(function () {
  'use strict';

  var WRAP = 'ca-dropdown';
  var TRIGGER = 'ca-trigger';
  var TRIGGER_TEXT = 'ca-trigger-text';
  var MENU = 'ca-menu';
  var LIST = 'ca-list';
  var ITEM = 'ca-item';
  var LABEL = 'ca-lbl';
  var CHECK = 'ca-chk';
  var SEARCH_WRAP = 'ca-sw';
  var SEARCH_ICON = 'ca-si';
  var SEARCH_INPUT = 'ca-search';
  var OPEN = 'ca-open';
  var ACTIVE = 'ca-active';
  var FOCUSED = 'ca-focused';
  var VISIBLE = 'ca-vis';
  var DROPUP = 'ca-dropup';
  var COMPACT = 'ca-compact';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SEARCH_THRESHOLD = 8;
  var MENU_GAP = 6;
  var MENU_HEIGHT = 242;

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function createIcon(kind) {
    var svg = svgEl('svg', {
      width: kind === 'search' ? '13' : '16',
      height: kind === 'search' ? '13' : '16',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': kind === 'search' ? '2.5' : '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    if (kind === 'caret') {
      svg.appendChild(svgEl('polyline', { points: '6 9 12 15 18 9' }));
    } else if (kind === 'check') {
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('stroke-width', '2.5');
      svg.appendChild(svgEl('polyline', { points: '20 6 9 17 4 12' }));
    } else {
      svg.appendChild(svgEl('circle', { cx: '11', cy: '11', r: '8' }));
      svg.appendChild(svgEl('path', { d: 'm21 21-4.35-4.35' }));
    }

    return svg;
  }

  function selectedText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.text : '';
  }

  function updateMenuDirection(instance) {
    var rect = instance.trigger.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var availableBelow = viewportHeight - rect.bottom - MENU_GAP;
    var availableAbove = rect.top - MENU_GAP;
    var projectedHeight = Math.min(MENU_HEIGHT, instance.menu.scrollHeight || MENU_HEIGHT);
    var shouldOpenUp = availableBelow < projectedHeight && availableAbove > availableBelow;

    instance.wrap.classList.toggle(DROPUP, shouldOpenUp);
  }

  function buildDropdown(select) {
    if (!select || select._caDropdown || select.multiple || select.size > 1) {
      return select && select._caDropdown ? select._caDropdown.wrap : null;
    }

    var useSearch = select.options.length >= SEARCH_THRESHOLD;
    var focusIndex = -1;
    var isOpen = false;

    var wrap = document.createElement('div');
    wrap.className = WRAP;
    if (select.classList.contains('export-format') || select.closest('.action-buttons')) {
      wrap.classList.add(COMPACT);
    }

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = TRIGGER;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    if (select.id) {
      trigger.id = select.id + '-trigger';
    }

    var menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    menu.id = (select.id || 'ca-select-' + Date.now()) + '-menu';
    trigger.setAttribute('aria-controls', menu.id);

    var triggerText = document.createElement('span');
    triggerText.className = TRIGGER_TEXT;
    triggerText.textContent = selectedText(select);

    var caret = document.createElement('span');
    caret.className = 'ca-caret';
    caret.appendChild(createIcon('caret'));

    trigger.appendChild(triggerText);
    trigger.appendChild(caret);

    var searchInput = null;
    if (useSearch) {
      var searchWrap = document.createElement('div');
      searchWrap.className = SEARCH_WRAP;

      var searchGlyph = document.createElement('span');
      searchGlyph.className = SEARCH_ICON;
      searchGlyph.appendChild(createIcon('search'));

      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = SEARCH_INPUT;
      searchInput.placeholder = 'Search...';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck = false;
      searchInput.setAttribute('aria-label', 'Search options');

      searchWrap.appendChild(searchGlyph);
      searchWrap.appendChild(searchInput);
      menu.appendChild(searchWrap);
    }

    var listWrap = document.createElement('div');
    listWrap.className = LIST;
    menu.appendChild(listWrap);

    function syncLabel() {
      if (!select.id) {
        return;
      }

      var label = document.querySelector('label[for="' + select.id + '"]');
      if (!label) {
        return;
      }

      if (!label.id) {
        label.id = select.id + '-label';
      }

      trigger.setAttribute('aria-labelledby', label.id);

      if (!label.dataset.caLinked) {
        label.addEventListener('click', function (event) {
          event.preventDefault();
          if (trigger.disabled) {
            return;
          }
          trigger.focus();
          if (!isOpen) {
            openMenu();
          }
        });
        label.dataset.caLinked = 'true';
      }
    }

    function getItems() {
      return Array.prototype.slice.call(listWrap.querySelectorAll('.' + ITEM));
    }

    function updateFocus(nextIndex, shouldScroll) {
      var items = getItems();

      if (!items.length) {
        focusIndex = -1;
        menu.removeAttribute('aria-activedescendant');
        return;
      }

      if (nextIndex < 0) {
        nextIndex = 0;
      }

      if (nextIndex >= items.length) {
        nextIndex = items.length - 1;
      }

      focusIndex = nextIndex;
      items.forEach(function (item, index) {
        item.classList.toggle(FOCUSED, index === focusIndex);
      });

      menu.setAttribute('aria-activedescendant', items[focusIndex].id);
      if (shouldScroll) {
        items[focusIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    function refreshTrigger() {
      triggerText.textContent = selectedText(select);
      trigger.disabled = !!select.disabled;
      wrap.classList.toggle('is-disabled', !!select.disabled);
    }

    function selectOption(option, shouldDispatch) {
      if (!option) {
        return;
      }

      var changed = select.value !== option.value;
      select.value = option.value;
      refreshTrigger();
      populate(searchInput ? searchInput.value : '');
      closeMenu(true);

      if (changed && shouldDispatch) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function populate(filter) {
      var query = String(filter || '').toLowerCase().trim();
      var selectedValue = select.value;
      var count = 0;

      listWrap.innerHTML = '';

      Array.prototype.forEach.call(select.options, function (option, optionIndex) {
        if (query && option.text.toLowerCase().indexOf(query) === -1) {
          return;
        }

        var item = document.createElement('button');
        item.type = 'button';
        item.className = ITEM;
        item.id = menu.id + '-option-' + optionIndex + '-' + count;
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', option.value === selectedValue ? 'true' : 'false');

        var itemLabel = document.createElement('span');
        itemLabel.className = LABEL;
        itemLabel.textContent = option.text;

        var check = document.createElement('span');
        check.className = CHECK;
        check.appendChild(createIcon('check'));

        if (option.value === selectedValue) {
          item.classList.add(ACTIVE);
        }

        item.appendChild(itemLabel);
        item.appendChild(check);

        item.addEventListener('mouseenter', function () {
          updateFocus(getItems().indexOf(item), false);
        });

        item.addEventListener('click', function (event) {
          event.stopPropagation();
          selectOption(option, true);
        });

        listWrap.appendChild(item);
        count += 1;
      });

      if (count === 0) {
        var empty = document.createElement('div');
        empty.className = 'ca-empty';
        empty.textContent = 'No results';
        listWrap.appendChild(empty);
        updateFocus(-1, false);
        return;
      }

      var selectedIndex = getItems().findIndex(function (item) {
        return item.dataset.value === selectedValue;
      });

      updateFocus(selectedIndex === -1 ? 0 : selectedIndex, false);
    }

    function openMenu() {
      if (select.disabled) {
        return;
      }

      document.querySelectorAll('.' + MENU + '.' + VISIBLE).forEach(function (openMenuNode) {
        if (openMenuNode !== menu && openMenuNode._caClose) {
          openMenuNode._caClose(false);
        }
      });

      isOpen = true;
      refreshTrigger();

      if (searchInput) {
        searchInput.value = '';
        populate('');
        updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
        menu.classList.add(VISIBLE);
        wrap.classList.add(OPEN);
        trigger.setAttribute('aria-expanded', 'true');
        setTimeout(function () {
          searchInput.focus();
        }, 30);
      } else {
        populate('');
        updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
        menu.classList.add(VISIBLE);
        wrap.classList.add(OPEN);
        trigger.setAttribute('aria-expanded', 'true');
      }

      var activeItem = listWrap.querySelector('.' + ITEM + '.' + ACTIVE);
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }

    function closeMenu(shouldFocusTrigger) {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      menu.classList.remove(VISIBLE);
      wrap.classList.remove(OPEN, DROPUP);
      trigger.setAttribute('aria-expanded', 'false');
      menu.removeAttribute('aria-activedescendant');

      if (shouldFocusTrigger) {
        trigger.focus();
      }
    }

    function handleKeyboard(event) {
      var items = getItems();

      if (event.key === 'Tab') {
        closeMenu(false);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openMenu();
        return;
      }

      if (!isOpen || !items.length) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        updateFocus(focusIndex + 1, true);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateFocus(focusIndex - 1, true);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateFocus(0, true);
      } else if (event.key === 'End') {
        event.preventDefault();
        updateFocus(items.length - 1, true);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (focusIndex < 0 || !items[focusIndex]) {
          return;
        }

        var option = Array.prototype.find.call(select.options, function (entry) {
          return entry.value === items[focusIndex].dataset.value;
        });

        selectOption(option, true);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        populate(searchInput.value);
        if (isOpen) {
          updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
        }
      });

      searchInput.addEventListener('keydown', handleKeyboard);
    }

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      if (isOpen) {
        closeMenu(false);
      } else {
        openMenu();
      }
    });

    trigger.addEventListener('keydown', handleKeyboard);

    document.addEventListener('click', function (event) {
      if (isOpen && !wrap.contains(event.target) && !menu.contains(event.target)) {
        closeMenu(false);
      }
    });

    window.addEventListener('resize', function () {
      if (isOpen) {
        updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
      }
    }, { passive: true });

    window.addEventListener('scroll', function () {
      if (isOpen) {
        updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
      }
    }, { passive: true });

    select.addEventListener('change', function () {
      wrap._sync();
    });

    var observer = new MutationObserver(function () {
      refreshTrigger();
      populate(searchInput ? searchInput.value : '');
    });

    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'label', 'selected']
    });

    wrap._sync = function () {
      refreshTrigger();
      populate(searchInput ? searchInput.value : '');
      if (isOpen) {
        updateMenuDirection({ wrap: wrap, trigger: trigger, menu: menu });
      }
    };

    menu._caClose = closeMenu;
    select._caDropdown = {
      wrap: wrap,
      menu: menu,
      sync: wrap._sync,
      destroy: function () {
        observer.disconnect();
        menu.remove();
        select.hidden = false;
      }
    };

    refreshTrigger();
    populate('');
    syncLabel();

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    select.hidden = true;
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  function init(root) {
    (root || document).querySelectorAll('select').forEach(function (select) {
      buildDropdown(select);
    });
  }

  function sync(id) {
    var select = document.getElementById(id);
    if (select && select._caDropdown && typeof select._caDropdown.sync === 'function') {
      select._caDropdown.sync();
    }
  }

  window.CADropdowns = {
    init: init,
    build: buildDropdown,
    sync: sync,
    syncAll: function () {
      document.querySelectorAll('select').forEach(function (select) {
        if (select._caDropdown && typeof select._caDropdown.sync === 'function') {
          select._caDropdown.sync();
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
    });
  } else {
    init(document);
  }
}());

/**
 * dropdowns.js — SmartVoice Premium Dropdown System
 * CSP-safe · smooth animations · MV3 compliant
 * Replace <select> with custom dropdowns
 */
(function () {
  'use strict';

  const WRAP  = 'sv-dropdown';
  const MENU  = 'sv-menu';
  const ITEM  = 'sv-item';
  const OPEN  = 'sv-open';
  const ACT   = 'sv-active';

  function createSvgIcon(width, height, viewBox, strokeWidth, points) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", strokeWidth);
    
    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", points);
    svg.appendChild(polyline);
    
    return svg;
  }

  function createSearchIcon() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5");
    
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "8");
    
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "m21 21-4.35-4.35");
    
    svg.appendChild(circle);
    svg.appendChild(path);
    
    return svg;
  }

  function createCheckIcon() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5");
    
    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);
    
    return svg;
  }

  function positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    const vpHeight = window.innerHeight || document.documentElement.clientHeight;
    const menuHeight = 260; // Estimated

    menu.style.width = `${rect.width}px`;
    menu.style.left = `${rect.left}px`;

    if (rect.bottom + menuHeight + 8 <= vpHeight) {
      menu.style.top = `${rect.bottom + 6}px`;
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = `${vpHeight - rect.top + 6}px`;
      menu.style.top = 'auto';
    }
  }

  function getSelectedText(select) {
    const option = select.options[select.selectedIndex];
    return option ? option.text : '';
  }

  function buildDropdown(originalSelect) {
    if (!originalSelect || originalSelect._svBuilt) return;
    originalSelect._svBuilt = true;

    const hasSearch = originalSelect.options.length >= 8;
    const wrapper = document.createElement('div');
    wrapper.className = WRAP;

    // Trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'sv-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const triggerText = document.createElement('span');
    triggerText.className = 'sv-trigger-text';
    triggerText.textContent = getSelectedText(originalSelect);

    const triggerIcon = document.createElement('span');
    triggerIcon.className = 'sv-trigger-icon';
    const dropdownSvg = createSvgIcon("12", "12", "0 0 24 24", "2.5", "6 9 12 15 18 9");
    triggerIcon.appendChild(dropdownSvg);

    trigger.append(triggerText, triggerIcon);

    // Menu (appended to body)
    const menu = document.createElement('div');
    menu.className = MENU;
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    menu._ownerWrapper = wrapper;

    // Search if needed
    let searchInput = null;
    if (hasSearch) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'sv-search-wrap';

      const searchIcon = document.createElement('span');
      searchIcon.className = 'sv-search-icon';
      const searchSvg = createSearchIcon();
      searchIcon.appendChild(searchSvg);

      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'sv-search';
      searchInput.placeholder = 'Search voices…';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck = false;

      searchWrapper.append(searchIcon, searchInput);
      menu.appendChild(searchWrapper);
    }

    const listWrapper = document.createElement('div');
    menu.appendChild(listWrapper);

    function populateList(filter = '') {
      listWrapper.innerHTML = '';
      const query = filter.toLowerCase().trim();
      let count = 0;

      Array.from(originalSelect.options).forEach(option => {
        if (query && option.text.toLowerCase().indexOf(query) === -1) return;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = ITEM;
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');

        const label = document.createElement('span');
        label.className = 'sv-label';
        label.textContent = option.text;

        const check = document.createElement('span');
        check.className = 'sv-check';
        const checkSvg = createCheckIcon();
        check.appendChild(checkSvg);

        item.append(label, check);

        if (option.value === originalSelect.value) item.classList.add(ACT);

        item.addEventListener('click', e => {
          e.stopPropagation();
          originalSelect.value = option.value;
          triggerText.textContent = option.text;
          listWrapper.querySelectorAll(`.${ITEM}`).forEach(i => i.classList.remove(ACT));
          item.classList.add(ACT);
          closeMenu();
          originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        listWrapper.appendChild(item);
        count++;
      });

      if (count === 0) {
        const empty = document.createElement('div');
        empty.className = 'sv-empty';
        empty.textContent = 'No matching voices';
        listWrapper.appendChild(empty);
      }
    }

    populateList();

    if (searchInput) {
      searchInput.addEventListener('input', () => populateList(searchInput.value));
    }

    let isOpen = false;

    function openMenu() {
      // Close other menus
      document.querySelectorAll(`.${MENU}.sv-visible`).forEach(m => {
        if (m !== menu) {
          m.classList.remove('sv-visible');
          if (m._ownerWrapper) m._ownerWrapper.classList.remove(OPEN);
        }
      });

      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add('sv-visible');
      wrapper.classList.add(OPEN);
      trigger.setAttribute('aria-expanded', 'true');

      const activeItem = listWrapper.querySelector(`.${ITEM}.${ACT}`);
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });

      if (searchInput) {
        searchInput.value = '';
        populateList();
        searchInput.focus();
      }
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove('sv-visible');
      wrapper.classList.remove(OPEN);
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    document.addEventListener('click', e => {
      if (isOpen && !wrapper.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });

    trigger.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) openMenu();
      } else if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('scroll', () => { if (isOpen) positionMenu(trigger, menu); }, { passive: true });
    window.addEventListener('resize', () => { if (isOpen) positionMenu(trigger, menu); }, { passive: true });

    // Mutation observer for external changes
    const observer = new MutationObserver(() => {
      populateList(searchInput ? searchInput.value : '');
      triggerText.textContent = getSelectedText(originalSelect);
    });
    observer.observe(originalSelect, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

    // Replace original select
    wrapper.appendChild(trigger);
    originalSelect.style.display = 'none';
    originalSelect.parentNode.insertBefore(wrapper, originalSelect.nextSibling);

    wrapper._sync = () => {
      triggerText.textContent = getSelectedText(originalSelect);
      populateList();
    };

    return wrapper;
  }

  function initAll() {
    document.querySelectorAll('select').forEach(buildDropdown);
  }

  // Public API
  window.SVDropdowns = {
    init: initAll,
    build: buildDropdown,
    sync: id => {
      const select = document.getElementById(id);
      if (select) {
        const wrapper = select.nextElementSibling;
        if (wrapper && typeof wrapper._sync === 'function') wrapper._sync();
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
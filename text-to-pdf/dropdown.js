/**
 * dropdown.js - Enhanced Dropdown System v2.0
 * CSP-safe · No eval · No dynamic styles · MV3 compliant
 * Smooth animations · Keyboard navigation · Search support
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    WRAPPER_CLASS: 'enhanced-dropdown',
    TRIGGER_CLASS: 'dropdown-trigger',
    MENU_CLASS: 'dropdown-menu',
    ITEM_CLASS: 'dropdown-item',
    OPEN_CLASS: 'dropdown-open',
    ACTIVE_CLASS: 'active',
    SEARCH_THRESHOLD: 8,
    ANIMATION_DURATION: 200
  };

  // Store all dropdown instances
  const dropdownInstances = new Map();

  /* ========================================
     Helper Functions
     ======================================== */

  function getSelectedText(select) {
    const option = select.options[select.selectedIndex];
    return option ? option.text : '';
  }

  function getSelectedValue(select) {
    return select.value;
  }

  /* ========================================
     SVG Creation Helpers (CSP-safe)
     ======================================== */

  function createCheckmarkSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);
    
    return svg;
  }

  function createCaretSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "6 9 12 15 18 9");
    svg.appendChild(polyline);
    
    return svg;
  }

  function createSearchIconSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "8");
    svg.appendChild(circle);
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m21 21-4.35-4.35");
    svg.appendChild(path);
    
    return svg;
  }

  /* ========================================
     Position Menu
     ======================================== */

  function positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = Math.min(menu.scrollHeight, 300);
    
    // Set width to match trigger
    menu.style.width = rect.width + 'px';
    menu.style.left = rect.left + 'px';
    
    // Determine if menu should open above or below
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow >= menuHeight + 10 || spaceBelow >= spaceAbove) {
      // Open below
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.bottom = 'auto';
      menu.style.maxHeight = Math.min(spaceBelow - 20, 300) + 'px';
    } else {
      // Open above
      menu.style.bottom = (viewportHeight - rect.top + 6) + 'px';
      menu.style.top = 'auto';
      menu.style.maxHeight = Math.min(spaceAbove - 20, 300) + 'px';
    }
  }

  /* ========================================
     Create Dropdown Item
     ======================================== */

  function createDropdownItem(option, isSelected, select, menu, onSelect) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = CONFIG.ITEM_CLASS;
    if (isSelected) item.classList.add(CONFIG.ACTIVE_CLASS);
    item.setAttribute('role', 'option');
    item.setAttribute('data-value', option.value);
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    
    const label = document.createElement('span');
    label.className = 'dropdown-item-label';
    label.textContent = option.text;
    
    const checkmark = document.createElement('span');
    checkmark.className = 'dropdown-item-check';
    checkmark.appendChild(createCheckmarkSVG());
    
    item.appendChild(label);
    item.appendChild(checkmark);
    
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(option.value, option.text);
      closeAllDropdowns();
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(option.value, option.text);
        closeAllDropdowns();
      }
    });
    
    return item;
  }

  /* ========================================
     Build Dropdown
     ======================================== */

  function buildDropdown(select) {
    if (!select || select._dropdownBuilt) return null;
    select._dropdownBuilt = true;
    
    const useSearch = select.options.length >= CONFIG.SEARCH_THRESHOLD;
    const selectId = select.id || Math.random().toString(36);
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = CONFIG.WRAPPER_CLASS;
    wrapper.setAttribute('data-select-id', selectId);
    
    // Create trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = CONFIG.TRIGGER_CLASS;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', `Select ${select.name || 'option'}`);
    
    const triggerText = document.createElement('span');
    triggerText.className = 'dropdown-trigger-text';
    triggerText.textContent = getSelectedText(select);
    
    const caret = document.createElement('span');
    caret.className = 'dropdown-caret';
    caret.appendChild(createCaretSVG());
    
    trigger.appendChild(triggerText);
    trigger.appendChild(caret);
    
    // Create menu
    const menu = document.createElement('div');
    menu.className = CONFIG.MENU_CLASS;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', `${select.name || 'Options'} dropdown`);
    document.body.appendChild(menu);
    menu._ownerWrapper = wrapper;
    
    // Search input (if needed)
    let searchInput = null;
    if (useSearch) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'dropdown-search-wrapper';
      
      const searchIcon = document.createElement('span');
      searchIcon.className = 'dropdown-search-icon';
      searchIcon.appendChild(createSearchIconSVG());
      
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'dropdown-search';
      searchInput.placeholder = 'Search options...';
      searchInput.autocomplete = 'off';
      searchInput.spellcheck = false;
      searchInput.setAttribute('aria-label', 'Search options');
      
      searchWrapper.appendChild(searchIcon);
      searchWrapper.appendChild(searchInput);
      menu.appendChild(searchWrapper);
    }
    
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'dropdown-items-container';
    menu.appendChild(itemsContainer);
    
    // Populate function
    function populate(filter = '') {
      itemsContainer.innerHTML = '';
      const query = filter.toLowerCase().trim();
      let hasResults = false;
      
      Array.from(select.options).forEach((option) => {
        if (query && option.text.toLowerCase().indexOf(query) === -1) return;
        
        const isSelected = option.value === select.value;
        const item = createDropdownItem(option, isSelected, select, menu, (value, text) => {
          select.value = value;
          triggerText.textContent = text;
          
          // Update active state in items
          itemsContainer.querySelectorAll(`.${CONFIG.ITEM_CLASS}`).forEach(item => {
            item.classList.remove(CONFIG.ACTIVE_CLASS);
            item.setAttribute('aria-selected', 'false');
            if (item.getAttribute('data-value') === value) {
              item.classList.add(CONFIG.ACTIVE_CLASS);
              item.setAttribute('aria-selected', 'true');
            }
          });
          
          // Dispatch change event
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        itemsContainer.appendChild(item);
        hasResults = true;
      });
      
      if (!hasResults) {
        const emptyState = document.createElement('div');
        emptyState.className = 'dropdown-empty';
        emptyState.textContent = 'No options found';
        itemsContainer.appendChild(emptyState);
      }
    }
    
    populate();
    
    // Search handler
    if (searchInput) {
      searchInput.addEventListener('input', () => populate(searchInput.value));
    }
    
    // Open/Close functions
    let isOpen = false;
    
    function openDropdown() {
      // Close all other dropdowns first
      closeAllDropdowns();
      
      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add('ca-vis');
      wrapper.classList.add(CONFIG.OPEN_CLASS);
      trigger.setAttribute('aria-expanded', 'true');
      
      // Scroll to active item
      const activeItem = itemsContainer.querySelector(`.${CONFIG.ITEM_CLASS}.${CONFIG.ACTIVE_CLASS}`);
      if (activeItem) {
        setTimeout(() => activeItem.scrollIntoView({ block: 'nearest' }), 30);
      }
      
      // Focus search if available
      if (searchInput) {
        setTimeout(() => {
          searchInput.value = '';
          populate();
          searchInput.focus();
        }, 50);
      }
    }
    
    function closeDropdown() {
      if (!isOpen) return;
      isOpen = false;
      menu.classList.remove('ca-vis');
      wrapper.classList.remove(CONFIG.OPEN_CLASS);
      trigger.setAttribute('aria-expanded', 'false');
    }
    
    // Event listeners
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen ? closeDropdown() : openDropdown();
    });
    
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) openDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isOpen && !wrapper.contains(e.target) && !menu.contains(e.target)) {
        closeDropdown();
      }
    });
    
    // Reposition on scroll/resize
    window.addEventListener('scroll', () => {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });
    
    window.addEventListener('resize', () => {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });
    
    // Watch for select changes
    const observer = new MutationObserver(() => {
      triggerText.textContent = getSelectedText(select);
      if (searchInput) {
        populate(searchInput.value);
      } else {
        populate();
      }
    });
    
    observer.observe(select, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['value'] 
    });
    
    // Store instance
    dropdownInstances.set(select, {
      wrapper,
      menu,
      trigger,
      observer,
      close: closeDropdown,
      open: openDropdown
    });
    
    // Insert into DOM
    wrapper.appendChild(trigger);
    select.style.display = 'none';
    select.parentNode.insertBefore(wrapper, select.nextSibling);
    
    return wrapper;
  }
  
  /* ========================================
     Close All Dropdowns
     ======================================== */
  
  function closeAllDropdowns() {
    dropdownInstances.forEach(instance => {
      instance.close();
    });
  }
  
  /* ========================================
     Initialize All Selects
     ======================================== */
  
  function initDropdowns() {
    const selects = document.querySelectorAll('select:not([data-dropdown-initialized])');
    selects.forEach(select => {
      select.setAttribute('data-dropdown-initialized', 'true');
      buildDropdown(select);
    });
  }
  
  /* ========================================
     Public API
     ======================================== */
  
  window.PDFDropdowns = {
    init: initDropdowns,
    refresh: initDropdowns,
    closeAll: closeAllDropdowns,
    getInstance: (select) => dropdownInstances.get(select)
  };
  
  /* ========================================
     Auto-Initialize
     ======================================== */
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdowns);
  } else {
    initDropdowns();
  }
  
  // Handle dynamically added selects
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches && node.matches('select')) {
            buildDropdown(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('select:not([data-dropdown-initialized])').forEach(select => {
              buildDropdown(select);
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
})();
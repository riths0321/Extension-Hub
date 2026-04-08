(function () {
  "use strict";

  var WRAP = "ca-dropdown";
  var MENU = "ca-menu";
  var ITEM = "ca-item";
  var OPEN = "ca-open";
  var ACTIVE = "ca-active";
  var VISIBLE = "ca-vis";
  var NATIVE = "ca-native-select";
  var menuCount = 0;

  function viewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function selectedText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.text : "";
  }

  function listItems(listWrap) {
    return Array.prototype.slice.call(listWrap.querySelectorAll("." + ITEM)).filter(function (item) {
      return !item.disabled;
    });
  }

  function closeAll(exceptMenu) {
    document.querySelectorAll("." + MENU + "." + VISIBLE).forEach(function (menu) {
      if (menu !== exceptMenu && typeof menu._close === "function") {
        menu._close();
      }
    });
  }

  function positionMenu(trigger, menu) {
    var rect = trigger.getBoundingClientRect();
    var vp = viewportHeight();
    var gap = 8;
    var safeEdge = 12;
    var spaceBelow = Math.max(128, vp - rect.bottom - safeEdge);
    var spaceAbove = Math.max(128, rect.top - safeEdge);
    var openAbove = spaceBelow < 210 && spaceAbove > spaceBelow;
    var maxHeight = Math.min(280, openAbove ? spaceAbove : spaceBelow);

    menu.style.width = Math.round(rect.width) + "px";
    menu.style.left = Math.round(rect.left) + "px";
    menu.style.maxHeight = Math.round(maxHeight) + "px";
    menu.classList.toggle("ca-menu-above", openAbove);
    menu.classList.toggle("ca-menu-below", !openAbove);

    if (openAbove) {
      menu.style.bottom = Math.round(vp - rect.top + gap) + "px";
      menu.style.top = "auto";
    } else {
      menu.style.top = Math.round(rect.bottom + gap) + "px";
      menu.style.bottom = "auto";
    }
  }

  function buildDropdown(select) {
    if (!select || select._caBuilt || select.multiple || select.size > 1) {
      return null;
    }

    select._caBuilt = true;

    var useSearch = select.options.length >= 8;
    var wrap = document.createElement("div");
    wrap.className = WRAP;

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ca-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    var triggerText = document.createElement("span");
    triggerText.className = "ca-trigger-text";
    triggerText.textContent = selectedText(select);

    var triggerCaret = document.createElement("span");
    triggerCaret.className = "ca-caret";
    triggerCaret.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerCaret);
    wrap.appendChild(trigger);

    var menu = document.createElement("div");
    var menuId = "ca-menu-" + (++menuCount);
    menu.id = menuId;
    menu.className = MENU + " ca-menu-below";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", (select.getAttribute("aria-label") || select.name || select.id || "Options") + " options");
    document.body.appendChild(menu);

    trigger.setAttribute("aria-controls", menuId);
    menu._ownerWrap = wrap;

    var searchInput = null;
    if (useSearch) {
      var searchWrap = document.createElement("div");
      searchWrap.className = "ca-sw";

      var searchIcon = document.createElement("span");
      searchIcon.className = "ca-si";
      searchIcon.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';

      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "ca-search";
      searchInput.placeholder = "Search...";
      searchInput.autocomplete = "off";
      searchInput.spellcheck = false;

      searchWrap.appendChild(searchIcon);
      searchWrap.appendChild(searchInput);
      menu.appendChild(searchWrap);
    }

    var listWrap = document.createElement("div");
    listWrap.className = "ca-list";
    menu.appendChild(listWrap);

    var isOpen = false;

    function syncDisabledState() {
      wrap.classList.toggle("ca-disabled", !!select.disabled);
      trigger.disabled = !!select.disabled;
    }

    function focusItem(step) {
      var items = listItems(listWrap);
      if (!items.length) {
        return;
      }

      var current = document.activeElement;
      var currentIndex = items.indexOf(current);
      if (currentIndex === -1) {
        var activeItem = listWrap.querySelector("." + ITEM + "." + ACTIVE + ":not(:disabled)");
        currentIndex = activeItem ? items.indexOf(activeItem) : -1;
      }

      var nextIndex = currentIndex + step;
      if (nextIndex < 0) {
        nextIndex = items.length - 1;
      } else if (nextIndex >= items.length) {
        nextIndex = 0;
      }

      items[nextIndex].focus();
      items[nextIndex].scrollIntoView({ block: "nearest" });
    }

    function focusPreferredItem(preferLast, preferBoundary) {
      var items = listItems(listWrap);
      if (!items.length) {
        return;
      }

      var activeItem = listWrap.querySelector("." + ITEM + "." + ACTIVE + ":not(:disabled)");
      var fallback = preferLast ? items[items.length - 1] : items[0];
      var target = preferBoundary ? fallback : (activeItem || fallback);
      target.focus();
      target.scrollIntoView({ block: "nearest" });
    }

    function updateSelectedState(button, isSelected) {
      button.classList.toggle(ACTIVE, isSelected);
      button.setAttribute("aria-selected", isSelected ? "true" : "false");
    }

    function populate(filterValue) {
      var query = String(filterValue || "").toLowerCase().trim();
      var optionCount = 0;

      listWrap.textContent = "";

      Array.prototype.slice.call(select.options).forEach(function (option, index) {
        if (option.hidden) {
          return;
        }
        if (query && option.text.toLowerCase().indexOf(query) === -1) {
          return;
        }

        var item = document.createElement("button");
        item.type = "button";
        item.className = ITEM;
        item.dataset.value = option.value;
        item.dataset.index = String(index);
        item.disabled = !!option.disabled;
        item.setAttribute("role", "option");

        var label = document.createElement("span");
        label.className = "ca-lbl";
        label.textContent = option.text;

        var check = document.createElement("span");
        check.className = "ca-chk";
        check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

        item.appendChild(label);
        item.appendChild(check);
        updateSelectedState(item, option.value === select.value);

        item.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (option.disabled) {
            return;
          }

          var valueChanged = select.value !== option.value;
          select.value = option.value;
          triggerText.textContent = option.text;
          listWrap.querySelectorAll("." + ITEM).forEach(function (button) {
            updateSelectedState(button, button === item);
          });
          closeMenu({ focusTrigger: true });

          if (valueChanged) {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });

        item.addEventListener("keydown", function (event) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusItem(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            focusItem(-1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            closeMenu({ focusTrigger: true });
          } else if (event.key === "Tab") {
            closeMenu();
          }
        });

        listWrap.appendChild(item);
        optionCount += 1;
      });

      if (!optionCount) {
        var empty = document.createElement("div");
        empty.className = "ca-empty";
        empty.textContent = "No results";
        listWrap.appendChild(empty);
      }
    }

    function sync(filterValue) {
      triggerText.textContent = selectedText(select);
      syncDisabledState();
      populate(filterValue);
    }

    function openMenu(preferLast) {
      if (select.disabled) {
        return;
      }

      closeAll(menu);
      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add(VISIBLE);
      wrap.classList.add(OPEN);
      trigger.setAttribute("aria-expanded", "true");

      if (searchInput) {
        searchInput.value = "";
        populate("");
        window.setTimeout(function () {
          searchInput.focus();
        }, 24);
        return;
      }

      window.requestAnimationFrame(function () {
        focusPreferredItem(!!preferLast, false);
      });
    }

    function closeMenu(options) {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      menu.classList.remove(VISIBLE);
      wrap.classList.remove(OPEN);
      trigger.setAttribute("aria-expanded", "false");

      if (options && options.focusTrigger) {
        trigger.focus();
      }
    }

    menu._close = closeMenu;
    wrap._sync = function () {
      sync(searchInput ? searchInput.value : "");
    };

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        populate(searchInput.value);
      });

      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusPreferredItem(false, true);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          focusPreferredItem(true, true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeMenu({ focusTrigger: true });
        } else if (event.key === "Enter") {
          var firstItem = listItems(listWrap)[0];
          if (firstItem) {
            event.preventDefault();
            firstItem.click();
          }
        } else if (event.key === "Tab") {
          closeMenu();
        }
      });
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (isOpen) {
        closeMenu();
      } else {
        openMenu(false);
      }
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isOpen) {
          openMenu(false);
        } else {
          focusItem(1);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) {
          openMenu(true);
        } else {
          focusItem(-1);
        }
      } else if (event.key === "Escape") {
        closeMenu();
      }
    });

    document.addEventListener("click", function (event) {
      if (isOpen && !wrap.contains(event.target) && !menu.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (isOpen && event.key === "Escape") {
        closeMenu({ focusTrigger: true });
      }
    });

    window.addEventListener("resize", function () {
      if (isOpen) {
        positionMenu(trigger, menu);
      }
    }, { passive: true });

    window.addEventListener("scroll", function () {
      if (isOpen) {
        positionMenu(trigger, menu);
      }
    }, { passive: true });

    select.addEventListener("change", function () {
      sync(searchInput ? searchInput.value : "");
    });

    select.addEventListener("input", function () {
      sync(searchInput ? searchInput.value : "");
    });

    var observer = new MutationObserver(function () {
      sync(searchInput ? searchInput.value : "");
    });

    observer.observe(select, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "label", "selected", "value"]
    });

    if (select.id) {
      document.querySelectorAll('label[for="' + select.id + '"]').forEach(function (label) {
        label.addEventListener("click", function (event) {
          event.preventDefault();
          if (select.disabled) {
            return;
          }

          trigger.focus();
          if (isOpen) {
            closeMenu();
          } else {
            openMenu(false);
          }
        });
      });
    }

    select.classList.add(NATIVE);
    select.tabIndex = -1;
    select.parentNode.insertBefore(wrap, select.nextSibling);
    sync("");

    return wrap;
  }

  function init(root) {
    var scope = root && typeof root.querySelectorAll === "function" ? root : document;
    scope.querySelectorAll("select").forEach(function (select) {
      buildDropdown(select);
    });
  }

  window.CADropdowns = {
    init: init,
    build: buildDropdown,
    closeAll: closeAll,
    sync: function (id) {
      var select = document.getElementById(id);
      var wrap = select ? select.nextElementSibling : null;
      if (wrap && typeof wrap._sync === "function") {
        wrap._sync();
      }
    },
    syncAll: function () {
      document.querySelectorAll("." + WRAP).forEach(function (wrap) {
        if (typeof wrap._sync === "function") {
          wrap._sync();
        }
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    }, { once: true });
  } else {
    init();
  }
})();

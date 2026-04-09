/**
 * dropdowns.js - ConvertAll Premium Dropdown System v3
 * CSP-safe, DOM-only icons, no injected styles, MV3 compliant
 */
(function () {
  "use strict";

  var WRAP = "ca-dropdown";
  var MENU = "ca-menu";
  var ITEM = "ca-item";
  var OPEN = "ca-open";
  var OPEN_VISIBLE = "ca-vis";
  var OPEN_UP = "ca-up";
  var ACT = "ca-active";
  var SVG_NS = "http://www.w3.org/2000/svg";

  function createSvgIcon(width, height, viewBox, strokeWidth, children) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", String(strokeWidth));
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    children.forEach(function (childConfig) {
      var node = document.createElementNS(SVG_NS, childConfig.tag);
      Object.keys(childConfig.attrs).forEach(function (name) {
        node.setAttribute(name, childConfig.attrs[name]);
      });
      svg.appendChild(node);
    });

    return svg;
  }

  function createChevronIcon() {
    return createSvgIcon(16, 16, "0 0 24 24", 2, [
      { tag: "polyline", attrs: { points: "6 9 12 15 18 9" } }
    ]);
  }

  function createSearchIcon() {
    return createSvgIcon(13, 13, "0 0 24 24", 2.5, [
      { tag: "circle", attrs: { cx: "11", cy: "11", r: "8" } },
      { tag: "path", attrs: { d: "m21 21-4.35-4.35" } }
    ]);
  }

  function createCheckIcon() {
    return createSvgIcon(14, 14, "0 0 24 24", 2.5, [
      { tag: "polyline", attrs: { points: "20 6 9 17 4 12" } }
    ]);
  }

  function selText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.text : "";
  }

  function clearNode(node) {
    node.replaceChildren();
  }

  function buildDropdown(select) {
    if (!select || select._caBuilt) return null;
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
    triggerText.textContent = selText(select);

    var triggerCaret = document.createElement("span");
    triggerCaret.className = "ca-caret";
    triggerCaret.appendChild(createChevronIcon());

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerCaret);

    var menu = document.createElement("div");
    menu.className = MENU;
    menu.setAttribute("role", "listbox");

    var searchInput = null;
    if (useSearch) {
      var searchWrap = document.createElement("div");
      searchWrap.className = "ca-sw";

      var searchIcon = document.createElement("span");
      searchIcon.className = "ca-si";
      searchIcon.appendChild(createSearchIcon());

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
    menu.appendChild(listWrap);

    function populate(filter) {
      clearNode(listWrap);

      var query = (filter || "").toLowerCase().trim();
      var count = 0;

      Array.from(select.options).forEach(function (option) {
        if (query && option.text.toLowerCase().indexOf(query) === -1) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = ITEM;
        btn.dataset.val = option.value;
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", option.value === select.value ? "true" : "false");

        var label = document.createElement("span");
        label.className = "ca-lbl";
        label.textContent = option.text;

        var check = document.createElement("span");
        check.className = "ca-chk";
        check.appendChild(createCheckIcon());

        btn.appendChild(label);
        btn.appendChild(check);

        if (option.value === select.value) {
          btn.classList.add(ACT);
        }

        btn.addEventListener("click", function (event) {
          event.stopPropagation();
          select.value = option.value;
          triggerText.textContent = option.text;

          listWrap.querySelectorAll("." + ITEM).forEach(function (item) {
            item.classList.remove(ACT);
            item.setAttribute("aria-selected", "false");
          });

          btn.classList.add(ACT);
          btn.setAttribute("aria-selected", "true");
          closeMenu();
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });

        listWrap.appendChild(btn);
        count++;
      });

      if (count === 0) {
        var empty = document.createElement("div");
        empty.className = "ca-empty";
        empty.textContent = "No results";
        listWrap.appendChild(empty);
      }
    }

    populate();

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        populate(searchInput.value);
      });
    }

    var isOpen = false;

    function shouldOpenUpward() {
      var rect = wrap.getBoundingClientRect();
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var menuHeight = 242;
      return rect.bottom + menuHeight + 8 > viewportHeight && rect.top > menuHeight;
    }

    function openMenu() {
      document.querySelectorAll("." + MENU + "." + OPEN_VISIBLE).forEach(function (openMenuEl) {
        if (openMenuEl !== menu) {
          if (openMenuEl.parentElement && typeof openMenuEl.parentElement._closeDropdown === "function") {
            openMenuEl.parentElement._closeDropdown();
          } else {
            openMenuEl.classList.remove(OPEN_VISIBLE);
            if (openMenuEl.parentElement) {
              openMenuEl.parentElement.classList.remove(OPEN, OPEN_UP);
            }
          }
        }
      });

      isOpen = true;
      wrap.classList.toggle(OPEN_UP, shouldOpenUpward());
      menu.classList.add(OPEN_VISIBLE);
      wrap.classList.add(OPEN);
      trigger.setAttribute("aria-expanded", "true");

      var active = listWrap.querySelector("." + ITEM + "." + ACT);
      if (active) {
        requestAnimationFrame(function () {
          active.scrollIntoView({ block: "nearest" });
        });
      }

      if (searchInput) {
        searchInput.value = "";
        populate();
        requestAnimationFrame(function () {
          searchInput.focus();
        });
      }
    }

    function closeMenu() {
      isOpen = false;
      menu.classList.remove(OPEN_VISIBLE);
      wrap.classList.remove(OPEN, OPEN_UP);
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener("click", function (event) {
      if (isOpen && !wrap.contains(event.target)) {
        closeMenu();
      }
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isOpen) openMenu();
      } else if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener(
      "resize",
      function () {
        if (isOpen) {
          wrap.classList.toggle(OPEN_UP, shouldOpenUpward());
        }
      },
      { passive: true }
    );

    var observer = new MutationObserver(function () {
      populate(searchInput ? searchInput.value : "");
      triggerText.textContent = selText(select);
    });

    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value"]
    });

    wrap._sync = function () {
      triggerText.textContent = selText(select);
      populate(searchInput ? searchInput.value : "");
    };
    wrap._closeDropdown = closeMenu;

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    select.hidden = true;
    select.setAttribute("aria-hidden", "true");
    select.parentNode.insertBefore(wrap, select.nextSibling);

    return wrap;
  }

  function init() {
    document.querySelectorAll("select").forEach(function (select) {
      buildDropdown(select);
    });
  }

  window.CADropdowns = {
    init: init,
    build: buildDropdown,
    sync: function (id) {
      var select = document.getElementById(id);
      if (!select) return;

      var wrap = select.nextElementSibling;
      if (wrap && typeof wrap._sync === "function") {
        wrap._sync();
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

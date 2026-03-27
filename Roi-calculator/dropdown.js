(function () {
  "use strict";

  const WRAP = "roi-dropdown";
  const MENU = "roi-dropdown-menu";
  const ITEM = "roi-dropdown-item";
  const OPEN = "roi-dropdown-open";
  const ACTIVE = "roi-dropdown-active";
  const VISIBLE = "roi-dropdown-visible";

  function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function createCaret() {
    const span = document.createElement("span");
    span.className = "roi-dropdown-caret";
    const svg = createSvgElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    svg.appendChild(createSvgElement("polyline", { points: "6 9 12 15 18 9" }));
    span.appendChild(svg);
    return span;
  }

  function createCheck() {
    const span = document.createElement("span");
    span.className = "roi-dropdown-check";
    const svg = createSvgElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    svg.appendChild(createSvgElement("polyline", { points: "20 6 9 17 4 12" }));
    span.appendChild(svg);
    return span;
  }

  function closeAllExcept(currentMenu) {
    document.querySelectorAll("." + MENU + "." + VISIBLE).forEach(menu => {
      if (menu !== currentMenu) {
        menu.classList.remove(VISIBLE);
        if (menu._ownerWrap) {
          menu._ownerWrap.classList.remove(OPEN);
          const trigger = menu._ownerWrap.querySelector(".roi-dropdown-trigger");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  function positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const estimatedHeight = Math.min(menu.scrollHeight || 220, 220);
    const gap = 8;

    menu.style.width = rect.width + "px";

    let left = rect.left;
    if (left + rect.width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - rect.width - 8);
    }
    menu.style.left = left + "px";

    if (rect.bottom + estimatedHeight + gap <= viewportHeight) {
      menu.style.top = rect.bottom + gap + "px";
      menu.style.bottom = "auto";
      menu.classList.remove("roi-dropdown-up");
    } else {
      menu.style.bottom = viewportHeight - rect.top + gap + "px";
      menu.style.top = "auto";
      menu.classList.add("roi-dropdown-up");
    }
  }

  function getSelectedText(select) {
    const option = select.options[select.selectedIndex];
    return option ? option.text : "";
  }

  function buildDropdown(select) {
    if (!select || select._roiDropdownBuilt) return null;
    select._roiDropdownBuilt = true;

    const wrap = document.createElement("div");
    wrap.className = WRAP;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "roi-dropdown-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const text = document.createElement("span");
    text.className = "roi-dropdown-text";
    text.textContent = getSelectedText(select);
    trigger.append(text, createCaret());

    const menu = document.createElement("div");
    menu.className = MENU;
    menu.setAttribute("role", "listbox");
    menu._ownerWrap = wrap;
    document.body.appendChild(menu);

    const list = document.createElement("div");
    list.className = "roi-dropdown-list";
    menu.appendChild(list);

    let isOpen = false;

    function closeMenu() {
      isOpen = false;
      menu.classList.remove(VISIBLE);
      wrap.classList.remove(OPEN);
      trigger.setAttribute("aria-expanded", "false");
    }

    function populate() {
      list.replaceChildren();
      Array.from(select.options).forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = ITEM;
        button.dataset.value = option.value;
        button.setAttribute("role", "option");
        if (option.value === select.value) button.classList.add(ACTIVE);

        const label = document.createElement("span");
        label.className = "roi-dropdown-label";
        label.textContent = option.text;

        button.append(label, createCheck());
        button.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          select.value = option.value;
          text.textContent = option.text;
          list.querySelectorAll("." + ITEM).forEach(item => item.classList.remove(ACTIVE));
          button.classList.add(ACTIVE);
          closeMenu();
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });

        list.appendChild(button);
      });
    }

    function openMenu() {
      closeAllExcept(menu);
      populate();
      isOpen = true;
      positionMenu(trigger, menu);
      menu.classList.add(VISIBLE);
      wrap.classList.add(OPEN);
      trigger.setAttribute("aria-expanded", "true");
    }

    trigger.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    document.addEventListener("click", e => {
      if (isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) {
        closeMenu();
      }
    });

    trigger.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen) openMenu();
      } else if (e.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("scroll", () => {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (isOpen) positionMenu(trigger, menu);
    }, { passive: true });

    const observer = new MutationObserver(() => {
      text.textContent = getSelectedText(select);
      if (isOpen) populate();
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "selected"]
    });

    wrap._sync = function () {
      text.textContent = getSelectedText(select);
      if (isOpen) populate();
    };

    wrap.appendChild(trigger);
    select.classList.add("roi-native-select");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");
    select.parentNode.insertBefore(wrap, select.nextSibling);
  }

  function init() {
    document.querySelectorAll("select").forEach(select => buildDropdown(select));
  }

  window.ROIDropdowns = {
    init,
    sync(id) {
      const select = document.getElementById(id);
      if (!select) return;
      const wrap = select.nextElementSibling;
      if (wrap && typeof wrap._sync === "function") wrap._sync();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

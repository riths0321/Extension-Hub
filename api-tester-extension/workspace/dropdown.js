/**
 * dropdown.js — Custom Smooth Dropdown System
 * Replaces all native <select> elements with smooth, white-bg custom dropdowns.
 * Works with both light and dark themes via CSS variable overrides.
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────
     INJECT STYLES
  ───────────────────────────────────────── */
  const STYLE = `
    /* ── Custom Dropdown Wrapper ── */
    .cd-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
      font-family: var(--font-ui, "Manrope", "Segoe UI", sans-serif);
    }

    /* ── Trigger Button (replaces <select>) ── */
    .cd-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 12px 9px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm, 12px);
      background: var(--surface-strong, #ffffff);
      color: var(--text, #0d1526);
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      transition: border-color 0.18s cubic-bezier(0.4,0,0.2,1),
                  box-shadow 0.18s cubic-bezier(0.4,0,0.2,1),
                  background 0.18s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 2px 6px rgba(13,21,38,0.06), 0 1px 2px rgba(13,21,38,0.04);
      user-select: none;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
    }

    [data-theme="dark"] .cd-trigger {
      background: var(--surface-strong, #1a1f2e);
      color: var(--text, #f0f4f9);
      border-color: rgba(148,163,184,0.30);
    }

    .cd-trigger:hover {
      border-color: var(--border-strong, rgba(99,102,241,0.26));
      background: var(--surface-hover, #ffffff);
      box-shadow: 0 4px 12px rgba(13,21,38,0.08);
    }

    .cd-trigger:focus,
    .cd-trigger.cd-open {
      border-color: var(--border-focus, rgba(99,102,241,0.55));
      box-shadow: 0 0 0 3px var(--primary-soft, rgba(82,83,204,0.10)),
                  0 2px 6px rgba(13,21,38,0.06);
      outline: none;
    }

    .cd-trigger-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Chevron Arrow ── */
    .cd-chevron {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint, #7088a8);
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                  color 0.18s ease;
    }

    .cd-trigger.cd-open .cd-chevron {
      transform: rotate(180deg);
      color: var(--primary, #5253cc);
    }

    /* ── Dropdown Menu Panel ── */
    .cd-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 99999;
      background: var(--surface-strong, #ffffff);
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: var(--radius-sm, 12px);
      box-shadow: 0 12px 36px rgba(13,21,38,0.13),
                  0 4px 12px rgba(13,21,38,0.07),
                  0 1px 3px rgba(13,21,38,0.05);
      overflow: hidden;
      min-width: 100%;

      /* Animation */
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
      transform-origin: top center;
      pointer-events: none;
      transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cd-menu.cd-visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* ── Options Scroll Container ── */
    .cd-options {
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(148,163,184,0.3) transparent;
    }

    .cd-options::-webkit-scrollbar {
      width: 4px;
    }
    .cd-options::-webkit-scrollbar-track {
      background: transparent;
    }
    .cd-options::-webkit-scrollbar-thumb {
      background: rgba(148,163,184,0.35);
      border-radius: 99px;
    }

    /* ── Individual Option ── */
    .cd-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      color: var(--text, #0d1526);
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: none;
    }

    [data-theme="dark"] .cd-option {
      color: var(--text, #f0f4f9);
    }

    .cd-option:hover {
      background: var(--primary-soft, rgba(82,83,204,0.07));
      color: var(--primary, #5253cc);
    }

    .cd-option.cd-selected {
      background: var(--primary-soft, rgba(82,83,204,0.10));
      color: var(--primary, #5253cc);
      font-weight: 700;
    }

    .cd-option.cd-selected::after {
      content: "";
      margin-left: auto;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' viewBox='0 0 24 24'%3E%3Cpath d='M20 6L9 17l-5-5' stroke='%235253cc' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

    /* ── Method-specific color badges in dropdown ── */
    .cd-option[data-value="GET"]     { }
    .cd-option[data-value="POST"]    { }
    .cd-option[data-value="PUT"]     { }
    .cd-option[data-value="PATCH"]   { }
    .cd-option[data-value="DELETE"]  { }

    .cd-option .cd-method-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cd-option[data-value="GET"] .cd-method-dot     { background: #059669; }
    .cd-option[data-value="POST"] .cd-method-dot    { background: #5253cc; }
    .cd-option[data-value="PUT"] .cd-method-dot     { background: #7c3aed; }
    .cd-option[data-value="PATCH"] .cd-method-dot   { background: #d97706; }
    .cd-option[data-value="DELETE"] .cd-method-dot  { background: #dc2626; }
    .cd-option[data-value="HEAD"] .cd-method-dot    { background: #0ea5e9; }
    .cd-option[data-value="OPTIONS"] .cd-method-dot { background: #7088a8; }

    /* ── Hide original <select> ── */
    .cd-hidden-select {
      position: absolute !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }
  `;

  function injectStyles() {
    if (document.getElementById("cd-styles")) return;
    const el = document.createElement("style");
    el.id = "cd-styles";
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  /* ─────────────────────────────────────────
     CHEVRON SVG
  ───────────────────────────────────────── */
  const CHEVRON_SVG = `<svg width="12" height="12" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  /* ─────────────────────────────────────────
     HTTP METHOD DOTS
  ───────────────────────────────────────── */
  const METHOD_IDS = new Set(["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"]);

  function isMethodSelect(select) {
    const opts = Array.from(select.options).map(o => o.value || o.text);
    return opts.some(v => METHOD_IDS.has(v.toUpperCase()));
  }

  /* ─────────────────────────────────────────
     BUILD ONE CUSTOM DROPDOWN
  ───────────────────────────────────────── */
  function buildDropdown(select) {
    // Skip if already converted
    if (select.dataset.cdConverted) return;
    select.dataset.cdConverted = "true";

    const isMethod = isMethodSelect(select);

    // Hide the original
    select.classList.add("cd-hidden-select");

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "cd-wrapper";

    // Trigger button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cd-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (select.id) trigger.setAttribute("aria-controls", `cd-menu-${select.id}`);

    const labelSpan = document.createElement("span");
    labelSpan.className = "cd-trigger-label";

    const chevron = document.createElement("span");
    chevron.className = "cd-chevron";
    chevron.innerHTML = CHEVRON_SVG;

    trigger.appendChild(labelSpan);
    trigger.appendChild(chevron);

    // Menu
    const menu = document.createElement("div");
    menu.className = "cd-menu";
    menu.setAttribute("role", "listbox");
    if (select.id) menu.id = `cd-menu-${select.id}`;

    const optionsList = document.createElement("div");
    optionsList.className = "cd-options";
    menu.appendChild(optionsList);

    // Insert into DOM before the hidden select
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    wrapper.appendChild(select);

    /* ── Populate options ── */
    function populateOptions() {
      optionsList.innerHTML = "";
      Array.from(select.options).forEach((opt) => {
        const div = document.createElement("div");
        div.className = "cd-option";
        div.setAttribute("role", "option");
        div.dataset.value = opt.value !== undefined ? opt.value : opt.text;

        if (isMethod) {
          const dot = document.createElement("span");
          dot.className = "cd-method-dot";
          div.appendChild(dot);
        }

        const text = document.createTextNode(opt.text);
        div.appendChild(text);

        div.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectOption(opt.value !== undefined ? opt.value : opt.text, div);
        });

        optionsList.appendChild(div);
      });
      refreshSelected();
    }

    /* ── Sync selected state ── */
    function refreshSelected() {
      const currentVal = select.value;
      const selectedOpt = Array.from(select.options).find(o => o.value === currentVal || o.text === currentVal);
      labelSpan.textContent = selectedOpt ? selectedOpt.text : (select.options[0]?.text || "");

      optionsList.querySelectorAll(".cd-option").forEach((div) => {
        const isSelected = div.dataset.value === currentVal;
        div.classList.toggle("cd-selected", isSelected);
        div.setAttribute("aria-selected", isSelected);
      });
    }

    /* ── Select an option ── */
    function selectOption(value, clickedDiv) {
      select.value = value;

      // Fallback: find by text if value doesn't match
      if (select.value !== value) {
        Array.from(select.options).forEach(opt => {
          if (opt.text === value) select.value = opt.value;
        });
      }

      // Fire change event on the original select
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));

      refreshSelected();
      closeMenu();
    }

    /* ── Open / Close ── */
    let isOpen = false;

    function openMenu() {
      isOpen = true;
      trigger.classList.add("cd-open");
      trigger.setAttribute("aria-expanded", "true");
      menu.classList.add("cd-visible");
      refreshSelected();

      // Scroll selected into view
      const sel = optionsList.querySelector(".cd-selected");
      if (sel) sel.scrollIntoView({ block: "nearest" });
    }

    function closeMenu() {
      isOpen = false;
      trigger.classList.remove("cd-open");
      trigger.setAttribute("aria-expanded", "false");
      menu.classList.remove("cd-visible");
    }

    function toggleMenu() {
      if (isOpen) closeMenu();
      else openMenu();
    }

    /* ── Events ── */
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) closeMenu();
    });

    // Keyboard navigation
    trigger.addEventListener("keydown", (e) => {
      const opts = Array.from(optionsList.querySelectorAll(".cd-option"));
      const currentIdx = opts.findIndex(o => o.classList.contains("cd-selected"));

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMenu();
      } else if (e.key === "Escape") {
        closeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) openMenu();
        const next = opts[Math.min(currentIdx + 1, opts.length - 1)];
        if (next) next.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) openMenu();
        const prev = opts[Math.max(currentIdx - 1, 0)];
        if (prev) prev.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      }
    });

    // Watch for programmatic .value changes on the original select
    const observer = new MutationObserver(() => {
      populateOptions();
    });
    observer.observe(select, { childList: true, subtree: true });

    // Also intercept .value = ... via property descriptor
    const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    if (origDescriptor) {
      Object.defineProperty(select, "value", {
        get() {
          return origDescriptor.get.call(this);
        },
        set(v) {
          origDescriptor.set.call(this, v);
          refreshSelected();
        },
        configurable: true,
      });
    }

    // Initial populate
    populateOptions();
  }

  /* ─────────────────────────────────────────
     CONVERT ALL SELECTS
  ───────────────────────────────────────── */
  function convertAll() {
    document.querySelectorAll("select.select").forEach((sel) => {
      buildDropdown(sel);
    });
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    injectStyles();
    convertAll();

    // Also watch for dynamically added selects (e.g. environmentSelect populated later)
    const bodyObserver = new MutationObserver(() => {
      document.querySelectorAll("select.select:not([data-cd-converted])").forEach((sel) => {
        buildDropdown(sel);
      });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
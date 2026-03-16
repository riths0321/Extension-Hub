document.addEventListener("DOMContentLoaded", () => {
  const btnPick = document.getElementById("btn-pick");
  const themeToggle = document.getElementById("theme-toggle");
  const rateLink = document.getElementById("rate-link");
  const historySearchToggle = document.getElementById("history-search-toggle");
  const historySearchRow = document.getElementById("history-search-row");
  const historySearch = document.getElementById("history-search");
  const historySearchClear = document.getElementById("history-search-clear");

  const panelHex = document.getElementById("panel-hex");
  const sv = document.getElementById("sv");
  const hue = document.getElementById("hue");
  const svHandle = document.getElementById("sv-handle");
  const hueHandle = document.getElementById("hue-handle");

  const previewSection = document.getElementById("preview-section");
  const colorSwatch = document.getElementById("color-swatch");
  const pickedHexLabel = document.getElementById("picked-hex");
  const inlineError = document.getElementById("inline-error");

  const valHex = document.getElementById("val-hex");
  const valRgb = document.getElementById("val-rgb");
  const valHsl = document.getElementById("val-hsl");

  const paletteHex = document.getElementById("palette-hex");
  const paletteGrid = document.getElementById("palette-grid");
  const paletteButtons = Array.from(document.querySelectorAll("[data-palette]"));
  const exportASE = document.getElementById("export-ase");
  const exportGPL = document.getElementById("export-gpl");
  const exportJSON = document.getElementById("export-json");

  const contrastSection = document.getElementById("contrast-section");
  const fgBtn = document.getElementById("fg-btn");
  const bgBtn = document.getElementById("bg-btn");
  const swapContrastBtn = document.getElementById("swap-contrast");
  const fgSwatch = document.getElementById("fg-swatch");
  const bgSwatch = document.getElementById("bg-swatch");
  const contrastRatioEl = document.getElementById("contrast-ratio");
  const badgeAA = document.getElementById("badge-aa");
  const badgeAAA = document.getElementById("badge-aaa");

  const historyGrid = document.getElementById("history-grid");
  const clearHistoryBtn = document.getElementById("clear-history");

  const toast = document.getElementById("toast");

  const HISTORY_LIMIT = 24;

  let isUpdating = false;
  let currentHex = null;
  let paletteMode = "mono";
  let fgHex = "#000000";
  let bgHex = "#FFFFFF";
  let historyColors = [];
  let historyQuery = "";
  let picker = { h: 0, s: 1, v: 1 };
  let pickerRaf = 0;
  let lastPalette = [];

  initTheme();
  loadHistory();
  setCurrent("#000000", { save: false });
  loadLastPicked();
  chrome.storage.onChanged.addListener(onStorageChanged);
  initRateLink();
  bindPicker();

  btnPick.addEventListener("click", onPickClick);
  themeToggle.addEventListener("click", toggleTheme);
  clearHistoryBtn.addEventListener("click", clearHistory);

  historySearchToggle.addEventListener("click", toggleHistorySearch);
  historySearchClear.addEventListener("click", () => {
    historyQuery = "";
    historySearch.value = "";
    renderHistory();
    historySearch.focus();
  });
  historySearch.addEventListener("input", () => {
    historyQuery = String(historySearch.value || "").trim().toUpperCase();
    renderHistory();
  });

  paletteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setPaletteMode(btn.dataset.palette);
    });
  });

  exportASE.addEventListener("click", () => exportPalette("ase"));
  exportGPL.addEventListener("click", () => exportPalette("gpl"));
  exportJSON.addEventListener("click", () => exportPalette("json"));

  fgBtn.addEventListener("click", () => {
    if (!currentHex) return;
    fgHex = currentHex;
    updateContrast();
    showToast("Foreground set");
  });

  bgBtn.addEventListener("click", () => {
    if (!currentHex) return;
    bgHex = currentHex;
    updateContrast();
    showToast("Background set");
  });

  swapContrastBtn.addEventListener("click", () => {
    const t = fgHex;
    fgHex = bgHex;
    bgHex = t;
    updateContrast();
  });

  valHex.addEventListener("input", () => {
    if (isUpdating) return;
    const normalized = normalizeHex(valHex.value);
    if (!normalized) return setInlineError("Enter HEX like #A1B2C3 or #ABC.");
    clearInlineError();
    setCurrent(normalized, { save: false });
  });

  valRgb.addEventListener("input", () => {
    if (isUpdating) return;
    const rgb = parseRgb(valRgb.value);
    if (!rgb) return setInlineError("Enter RGB like rgb(12, 34, 56) or 12,34,56.");
    clearInlineError();
    setCurrent(rgbToHex(rgb.r, rgb.g, rgb.b), { save: false });
  });

  valHsl.addEventListener("input", () => {
    if (isUpdating) return;
    const hsl = parseHsl(valHsl.value);
    if (!hsl) return setInlineError("Enter HSL like hsl(210, 40%, 50%) or 210,40,50.");
    clearInlineError();
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    setCurrent(rgbToHex(rgb.r, rgb.g, rgb.b), { save: false });
  });

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const kind = btn.dataset.copy;
      const text = kind === "hex" ? valHex.value : kind === "rgb" ? valRgb.value : valHsl.value;
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied");
      } catch {
        showToast("Copy failed");
      }
    });
  });

  async function onPickClick() {
    clearInlineError();
    btnPick.disabled = true;
    btnPick.classList.add("busy");
    try {
      const hex = await pickColor();
      if (!hex) return;
      setCurrent(hex, { save: true });
    } finally {
      btnPick.disabled = false;
      btnPick.classList.remove("busy");
    }
  }

  async function pickColor() {
    // Primary: native EyeDropper API.
    if (window.EyeDropper) {
      try {
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) return normalizeHex(result.sRGBHex);
      } catch (e) {
        // If user canceled selection, do nothing.
        if (e && e.name === "AbortError") return null;
      }
    }
    startFallbackInBackground();
    return null;
  }

  function startFallbackInBackground() {
    showToast("Click on page to pick, then reopen popup");
    chrome.runtime.sendMessage({ type: "PP_FALLBACK_START" }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (!resp || !resp.ok) return;
      if (resp.hex) setCurrent(resp.hex, { save: false });
    });
  }

  function setPaletteMode(mode) {
    paletteMode = mode;
    paletteButtons.forEach((b) => {
      const active = b.dataset.palette === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    updatePalette();
  }

  function setCurrent(hex, { save }) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;

    currentHex = normalized;

    isUpdating = true;
    valHex.value = normalized;
    const rgb = hexToRgb(normalized);
    valRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    valHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    isUpdating = false;

    pickedHexLabel.textContent = normalized;
    colorSwatch.style.backgroundColor = normalized;
    panelHex.textContent = normalized;
    paletteHex.textContent = normalized;
    syncPickerFromHexIfNeeded(normalized);

    previewSection.classList.remove("hidden");
    contrastSection.classList.remove("hidden");

    if (!fgHex) fgHex = normalized;
    updatePalette();
    updateContrast();

    if (save) saveToHistory(normalized);
  }

  function updatePalette() {
    if (!currentHex) return;
    const colors = generatePalette(currentHex, paletteMode);
    lastPalette = colors.slice();
    paletteGrid.replaceChildren();

    colors.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch-btn";
      btn.style.backgroundColor = hex;
      btn.title = hex;
      btn.setAttribute("aria-label", `Set color ${hex}`);
      btn.addEventListener("click", () => setCurrent(hex, { save: true }));
      paletteGrid.appendChild(btn);
    });
  }

  function exportPalette(kind) {
    if (!lastPalette || lastPalette.length === 0) return;
    const baseName = `pixel-perfect-palette-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    try {
      if (kind === "json") {
        const data = lastPalette.map((hex) => {
          const rgb = hexToRgb(hex);
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          return {
            hex,
            rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
            hsl: { h: hsl.h, s: hsl.s, l: hsl.l }
          };
        });
        downloadText(`${baseName}.json`, "application/json", JSON.stringify({ colors: data }, null, 2));
        showToast("Exported JSON");
        return;
      }

      if (kind === "gpl") {
        const lines = [];
        lines.push("GIMP Palette");
        lines.push("Name: Pixel Perfect");
        lines.push("Columns: 5");
        lines.push("#");
        lastPalette.forEach((hex) => {
          const rgb = hexToRgb(hex);
          lines.push(`${rgb.r}\t${rgb.g}\t${rgb.b}\t${hex}`);
        });
        downloadText(`${baseName}.gpl`, "text/plain", lines.join("\n") + "\n");
        showToast("Exported GPL");
        return;
      }

      if (kind === "ase") {
        const bytes = buildASE(lastPalette);
        downloadBytes(`${baseName}.ase`, "application/octet-stream", bytes);
        showToast("Exported ASE");
      }
    } catch {
      showToast("Export failed");
    }
  }

  function downloadText(filename, mime, text) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBytes(filename, mime, bytes) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function updateContrast() {
    if (!currentHex) return;
    fgSwatch.style.backgroundColor = fgHex;
    bgSwatch.style.backgroundColor = bgHex;

    const ratio = contrastRatio(fgHex, bgHex);
    contrastRatioEl.textContent = ratio.toFixed(2) + ":1";

    const passAA = ratio >= 4.5;
    const passAAA = ratio >= 7;
    badgeAA.classList.toggle("pass", passAA);
    badgeAA.classList.toggle("fail", !passAA);
    badgeAAA.classList.toggle("pass", passAAA);
    badgeAAA.classList.toggle("fail", !passAAA);
  }

  function saveToHistory(hex) {
    chrome.storage.local.get({ colors: [] }, (result) => {
      let colors = Array.isArray(result.colors) ? result.colors : [];
      colors = colors.filter((c) => c !== hex);
      colors.unshift(hex);
      if (colors.length > HISTORY_LIMIT) colors = colors.slice(0, HISTORY_LIMIT);
      chrome.storage.local.set({ colors }, () => loadHistory());
    });
  }

  function clearHistory() {
    chrome.storage.local.set({ colors: [] }, () => {
      historyGrid.replaceChildren();
      showToast("History cleared");
    });
  }

  function loadHistory() {
    chrome.storage.local.get({ colors: [] }, (result) => {
      historyColors = Array.isArray(result.colors) ? result.colors : [];
      renderHistory();
    });
  }

  function renderHistory() {
    historyGrid.replaceChildren();
    const q = historyQuery;
    const colors = q ? historyColors.filter((h) => String(h).toUpperCase().includes(q)) : historyColors;

    colors.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.style.backgroundColor = hex;
      btn.title = hex;
      btn.setAttribute("aria-label", `Use recent color ${hex}`);
      btn.addEventListener("click", async () => {
        setCurrent(hex, { save: false });
        try {
          await navigator.clipboard.writeText(hex);
          showToast("Copied HEX");
        } catch {
          showToast("Copy failed");
        }
      });
      historyGrid.appendChild(btn);
    });
  }

  function loadLastPicked() {
    chrome.storage.local.get({ lastPicked: null }, (result) => {
      if (!result || !result.lastPicked) return;
      setCurrent(result.lastPicked, { save: false });
    });
  }

  function onStorageChanged(changes, areaName) {
    if (areaName !== "local") return;
    if (!changes.lastPicked || !changes.lastPicked.newValue) return;
    setCurrent(changes.lastPicked.newValue, { save: false });
    if (changes.colors && Array.isArray(changes.colors.newValue)) {
      historyColors = changes.colors.newValue;
      renderHistory();
    }
  }

  function toggleHistorySearch() {
    const isOpen = !historySearchRow.classList.contains("hidden");
    historySearchRow.classList.toggle("hidden", isOpen);
    if (!isOpen) {
      historySearch.focus();
    } else {
      historySearch.value = "";
      historyQuery = "";
      renderHistory();
    }
  }

  function initRateLink() {
    // If you have a real Web Store reviews URL, set it here.
    // Example: https://chromewebstore.google.com/detail/<slug>/<extension_id>/reviews
    const saved = localStorage.getItem("ppRateUrl");
    if (saved) rateLink.href = saved;
  }

  function bindPicker() {
    // Initialize handle positions.
    syncPickerFromHex("#000000");

    bindDrag(sv, (pt) => {
      const rect = sv.getBoundingClientRect();
      const x = clamp01Unit((pt.x - rect.left) / rect.width);
      const y = clamp01Unit((pt.y - rect.top) / rect.height);
      picker.s = x;
      picker.v = 1 - y;
      applyPickerColor();
    });

    bindDrag(hue, (pt) => {
      const rect = hue.getBoundingClientRect();
      const x = clamp01Unit((pt.x - rect.left) / rect.width);
      picker.h = (x * 360) % 360;
      applyPickerColor();
    });
  }

  function bindDrag(el, onMove) {
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      onMove({ x: e.clientX, y: e.clientY });
      const onPointerMove = (ev) => onMove({ x: ev.clientX, y: ev.clientY });
      const onPointerUp = (ev) => {
        el.releasePointerCapture(ev.pointerId);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
      };
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
    });
  }

  function clamp01Unit(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function applyPickerColor() {
    // Throttle to animation frame to keep drag smooth.
    if (pickerRaf) cancelAnimationFrame(pickerRaf);
    pickerRaf = requestAnimationFrame(() => {
      pickerRaf = 0;
      updatePickerUI();
      const rgb = hsvToRgb(picker.h, picker.s, picker.v);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setCurrentFromPicker(hex);
    });
  }

  function setCurrentFromPicker(hex) {
    // Update the rest of the UI without overriding picker state.
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    currentHex = normalized;

    isUpdating = true;
    valHex.value = normalized;
    const rgb = hexToRgb(normalized);
    valRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    valHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    isUpdating = false;

    pickedHexLabel.textContent = normalized;
    colorSwatch.style.backgroundColor = normalized;
    panelHex.textContent = normalized;
    paletteHex.textContent = normalized;

    previewSection.classList.remove("hidden");
    contrastSection.classList.remove("hidden");

    updatePalette();
    updateContrast();
  }

  function syncPickerFromHexIfNeeded(hex) {
    // Avoid re-syncing during picker drag (we already set picker state).
    if (pickerRaf) return;
    syncPickerFromHex(hex);
  }

  function syncPickerFromHex(hex) {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    picker = { h: hsv.h, s: hsv.s, v: hsv.v };
    updatePickerUI();
  }

  function updatePickerUI() {
    // Set SV base hue color.
    sv.style.background = `hsl(${Math.round(picker.h)} 100% 50%)`;

    const svLeft = picker.s * 100;
    const svTop = (1 - picker.v) * 100;
    svHandle.style.left = `${svLeft}%`;
    svHandle.style.top = `${svTop}%`;

    const hueLeft = (picker.h / 360) * 100;
    hueHandle.style.left = `${hueLeft}%`;
    hueHandle.style.top = "50%";
  }

  function initTheme() {
    const saved = localStorage.getItem("ppTheme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    setTheme(theme);
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  function setTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("ppTheme", theme);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), 1300);
  }

  function setInlineError(message) {
    inlineError.textContent = message;
    inlineError.classList.remove("hidden");
  }

  function clearInlineError() {
    inlineError.textContent = "";
    inlineError.classList.add("hidden");
  }

  function clampInt(n, min, max) {
    return Math.max(min, Math.min(max, n | 0));
  }

  function normalizeHex(input) {
    if (!input) return null;
    let s = String(input).trim();
    if (!s) return null;
    if (s[0] !== "#") s = "#" + s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return ("#" + r + r + g + g + b + b).toUpperCase();
    }
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
    return null;
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex);
    if (!h) return { r: 0, g: 0, b: 0 };
    const v = parseInt(h.slice(1), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  function rgbToHex(r, g, b) {
    const rr = clamp255(r).toString(16).padStart(2, "0");
    const gg = clamp255(g).toString(16).padStart(2, "0");
    const bb = clamp255(b).toString(16).padStart(2, "0");
    return ("#" + rr + gg + bb).toUpperCase();
  }

  function clamp255(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function parseRgb(input) {
    if (!input) return null;
    const s = String(input).trim();
    const m = s.match(/rgb\\s*\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*\\)/i);
    if (m) return { r: clamp255(m[1]), g: clamp255(m[2]), b: clamp255(m[3]) };
    const parts = s.split(",").map((p) => p.trim());
    if (parts.length !== 3) return null;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return { r: clamp255(nums[0]), g: clamp255(nums[1]), b: clamp255(nums[2]) };
  }

  function parseHsl(input) {
    if (!input) return null;
    const s = String(input).trim();
    const m = s.match(/hsl\\s*\\(\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(\\d+(?:\\.\\d+)?)%\\s*,\\s*(\\d+(?:\\.\\d+)?)%\\s*\\)/i);
    if (m) return normalizeHsl({ h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) });

    const parts = s.split(",").map((p) => p.trim().replace(/%$/, ""));
    if (parts.length !== 3) return null;
    const h = Number(parts[0]);
    const sat = Number(parts[1]);
    const lig = Number(parts[2]);
    if (![h, sat, lig].every(Number.isFinite)) return null;
    return normalizeHsl({ h, s: sat, l: lig });
  }

  function normalizeHsl(hsl) {
    const h = ((hsl.h % 360) + 360) % 360;
    const s = Math.max(0, Math.min(100, hsl.s));
    const l = Math.max(0, Math.min(100, hsl.l));
    return { h: Math.round(h), s: Math.round(s), l: Math.round(l) };
  }

  function rgbToHsl(r, g, b) {
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rr:
          h = (gg - bb) / d + (gg < bb ? 6 : 0);
          break;
        case gg:
          h = (bb - rr) / d + 2;
          break;
        default:
          h = (rr - gg) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    const hh = ((h % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, s)) / 100;
    const ll = Math.max(0, Math.min(100, l)) / 100;

    if (ss === 0) {
      const v = Math.round(ll * 255);
      return { r: v, g: v, b: v };
    }

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r1 = 0, g1 = 0, b1 = 0;
    if (hh < 60) [r1, g1, b1] = [c, x, 0];
    else if (hh < 120) [r1, g1, b1] = [x, c, 0];
    else if (hh < 180) [r1, g1, b1] = [0, c, x];
    else if (hh < 240) [r1, g1, b1] = [0, x, c];
    else if (hh < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function generatePalette(hex, mode) {
    const rgb = hexToRgb(hex);
    const base = rgbToHsl(rgb.r, rgb.g, rgb.b);

    if (mode === "complementary") {
      const comp = { ...base, h: (base.h + 180) % 360 };
      return [
        hslToHex(base.h, base.s, clamp01(base.l - 14)),
        hslToHex(base.h, base.s, base.l),
        hslToHex(base.h, clamp01(base.s - 10), clamp01(base.l + 14)),
        hslToHex(comp.h, comp.s, comp.l),
        hslToHex(comp.h, clamp01(comp.s - 10), clamp01(comp.l + 14))
      ];
    }

    if (mode === "analogous") {
      const hs = [base.h - 40, base.h - 20, base.h, base.h + 20, base.h + 40];
      return hs.map((h) => hslToHex(h, base.s, base.l));
    }

    if (mode === "mono") {
      const ls = [base.l - 24, base.l - 12, base.l, base.l + 12, base.l + 24];
      return ls.map((l) => hslToHex(base.h, base.s, clamp01(l)));
    }

    // auto: balanced tints/shades
    const ls = [base.l - 22, base.l - 10, base.l, base.l + 10, base.l + 22];
    const ss = [base.s, base.s, base.s, Math.max(10, base.s - 8), Math.max(10, base.s - 14)];
    return ls.map((l, i) => hslToHex(base.h, ss[i], clamp01(l)));
  }

  function clamp01(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function hslToHex(h, s, l) {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function contrastRatio(hex1, hex2) {
    const a = hexToRgb(hex1);
    const b = hexToRgb(hex2);
    const L1 = relLuminance(a.r, a.g, a.b);
    const L2 = relLuminance(b.r, b.g, b.b);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function relLuminance(r, g, b) {
    const srgb = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function rgbToHsv(r, g, b) {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      switch (max) {
        case rr:
          h = (gg - bb) / d + (gg < bb ? 6 : 0);
          break;
        case gg:
          h = (bb - rr) / d + 2;
          break;
        default:
          h = (rr - gg) / d + 4;
          break;
      }
      h *= 60;
    }

    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h: ((h % 360) + 360) % 360, s, v };
  }

  function hsvToRgb(h, s, v) {
    const hh = ((h % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(1, s));
    const vv = Math.max(0, Math.min(1, v));

    const c = vv * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = vv - c;

    let r1 = 0, g1 = 0, b1 = 0;
    if (hh < 60) [r1, g1, b1] = [c, x, 0];
    else if (hh < 120) [r1, g1, b1] = [x, c, 0];
    else if (hh < 180) [r1, g1, b1] = [0, c, x];
    else if (hh < 240) [r1, g1, b1] = [0, x, c];
    else if (hh < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function buildASE(hexes) {
    // Minimal ASE writer for RGB colors.
    // Header: "ASEF" + version(1.0) + blockCount
    const blocks = hexes.map((hex) => buildASEColorBlock(hex));
    const totalLen = 4 + 2 + 2 + 4 + blocks.reduce((sum, b) => sum + b.length, 0);
    const buf = new ArrayBuffer(totalLen);
    const view = new DataView(buf);
    let o = 0;

    writeAscii(view, o, "ASEF"); o += 4;
    view.setUint16(o, 1, false); o += 2; // major
    view.setUint16(o, 0, false); o += 2; // minor
    view.setUint32(o, blocks.length, false); o += 4;

    blocks.forEach((b) => {
      new Uint8Array(buf, o, b.length).set(b);
      o += b.length;
    });

    return new Uint8Array(buf);
  }

  function buildASEColorBlock(hex) {
    const name = String(hex).toUpperCase();
    const rgb = hexToRgb(name);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const nameUtf16 = utf16beWithNull(name);
    const blockLen = 2 + nameUtf16.length + 4 + 12 + 2;

    const buf = new ArrayBuffer(2 + 4 + blockLen);
    const view = new DataView(buf);
    let o = 0;

    view.setUint16(o, 0x0001, false); o += 2; // color entry
    view.setUint32(o, blockLen, false); o += 4;

    view.setUint16(o, name.length + 1, false); o += 2; // UTF-16 code units incl null
    new Uint8Array(buf, o, nameUtf16.length).set(nameUtf16); o += nameUtf16.length;

    writeAscii(view, o, "RGB "); o += 4;
    view.setFloat32(o, r, false); o += 4;
    view.setFloat32(o, g, false); o += 4;
    view.setFloat32(o, b, false); o += 4;
    view.setUint16(o, 0, false); o += 2; // color type: global

    return new Uint8Array(buf);
  }

  function utf16beWithNull(str) {
    const out = new Uint8Array((str.length + 1) * 2);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      out[i * 2] = (code >> 8) & 0xff;
      out[i * 2 + 1] = code & 0xff;
    }
    // null terminator already 0,0
    return out;
  }

  function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i) & 0xff);
    }
  }
});

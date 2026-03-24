// ── popup.js — CSP safe: no innerHTML, no eval ────────────────────────────────

const DEFAULT_SETTINGS = {
  fullscreen:       false,
  clearHistory:     true,
  closeOriginalTab: false
};

// Map: storage key → switch element id
const TOGGLE_MAP = [
  { key: "fullscreen",       switchId: "switchFullscreen" },
  { key: "clearHistory",     switchId: "switchHistory"    },
  { key: "closeOriginalTab", switchId: "switchClose"      }
];

let settings = { ...DEFAULT_SETTINGS };

// ── Load current tab URL ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const urlEl = document.getElementById("urlText");
    if (!urlEl) return;

    if (tab && tab.url) {
      try {
        const u = new URL(tab.url);
        urlEl.textContent = u.hostname;
      } catch {
        urlEl.textContent = "Current page";
      }
    } else {
      urlEl.textContent = "No active tab";
    }
  });
});

// ── Load settings and apply to toggles ───────────────────────────────────────
chrome.storage.local.get("settings", (res) => {
  settings = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };
  applyToggles();
});

function applyToggles() {
  TOGGLE_MAP.forEach(({ key, switchId }) => {
    const sw = document.getElementById(switchId);
    if (!sw) return;
    if (settings[key]) {
      sw.classList.add("on");
    } else {
      sw.classList.remove("on");
    }
  });
}

function saveSettings() {
  chrome.storage.local.set({ settings });
}

// ── Toggle click handlers ─────────────────────────────────────────────────────
TOGGLE_MAP.forEach(({ key, switchId }) => {
  // Click the entire row
  const rowMap = {
    "switchFullscreen": "toggleFullscreen",
    "switchHistory":    "toggleHistory",
    "switchClose":      "toggleClose"
  };

  const rowId = rowMap[switchId];
  const row   = rowId ? document.getElementById(rowId) : null;
  const sw    = document.getElementById(switchId);

  const toggle = () => {
    settings[key] = !settings[key];
    if (sw) {
      sw.classList.toggle("on", settings[key]);
    }
    saveSettings();
  };

  if (row)  row.addEventListener("click", toggle);
});

// ── Main button ───────────────────────────────────────────────────────────────
const openBtn = document.getElementById("openBtn");
if (openBtn) {
  openBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "OPEN_INCOGNITO" }, (res) => {
    if (!res || !res.ok) return;

    openBtn.classList.add("clicked");

    const label = openBtn.querySelector(".btn-label");
    const arrow = openBtn.querySelector(".btn-arrow");
    if (label) label.textContent = "Opening...";
    if (arrow) arrow.textContent = "✓";

    const badge = document.getElementById("successBadge");
    if (badge) badge.classList.add("show");

    setTimeout(() => window.close(), 800);
  });
});
  
}
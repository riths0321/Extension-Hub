// ── background.js — Service Worker ───────────────────────────────────────────
// CSP safe · No innerHTML · No eval

const DEFAULT_SETTINGS = {
  fullscreen:       false,
  clearHistory:     true,
  closeOriginalTab: false
};

// ── Install ───────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // Set defaults only if not already set
  chrome.storage.local.get("settings", (res) => {
    if (!res.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });

  // Right-click context menu
  chrome.contextMenus.create({
    id: "open-incognito",
    title: "Open this tab in Incognito",
    contexts: ["page"]
  });
});

// ── Context menu click ────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-incognito" && tab) {
    openInIncognito(tab);
  }
});

// ── Message from popup ────────────────────────────────────────────────────────
// ── Secure message handler ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Allow only extension pages (popup/options), not webpages
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, reason: "Untrusted sender" });
    return;
  }

  if (msg.action === "OPEN_INCOGNITO") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) openInIncognito(tab);
    });
    sendResponse({ ok: true });
  }
});


// ── Keyboard shortcut ─────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-incognito") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) openInIncognito(tab);
    });
  }
});

// ── Core: open tab in incognito ───────────────────────────────────────────────
function openInIncognito(tab) {
  if (!tab || !tab.url) return;

  let parsed;
  try {
    parsed = new URL(tab.url);
  } catch {
    return; // invalid URL
  }

  // Allow only real web pages
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return;
  }

  chrome.storage.local.get("settings", (res) => {
    const s = { ...DEFAULT_SETTINGS, ...(res.settings || {}) };

    chrome.windows.create(
      {
        incognito: true,
        url: parsed.href,
        state: s.fullscreen ? "fullscreen" : "normal"
      },
      () => {
        if (chrome.runtime.lastError) return;

        // Remove only this exact URL (not entire history)
        if (s.clearHistory) {
          chrome.history.deleteUrl({ url: parsed.href });
        }

        if (s.closeOriginalTab && tab.id !== undefined) {
          chrome.tabs.remove(tab.id);
        }
      }
    );
  });
}

// ── Search engine definitions ─────────────────────────────────────────────────
const ENGINES = [
  { id: "google",       title: "Google Search",   icon: "G",  url: "https://www.google.com/search?q=%s" },
  { id: "youtube",      title: "YouTube",          icon: "YT", url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia",    title: "Wikipedia",        icon: "W",  url: "https://en.wikipedia.org/wiki/Special:Search?search=%s" },
  { id: "amazon",       title: "Amazon",           icon: "A",  url: "https://www.amazon.com/s?k=%s" },
  { id: "github",       title: "GitHub",           icon: "GH", url: "https://github.com/search?q=%s" },
  { id: "stackoverflow",title: "StackOverflow",    icon: "SO", url: "https://stackoverflow.com/search?q=%s" },
  { id: "twitter",      title: "Twitter / X",      icon: "X",  url: "https://twitter.com/search?q=%s" },
  { id: "reddit",       title: "Reddit",           icon: "R",  url: "https://www.reddit.com/search/?q=%s" },
  { id: "translate",    title: "Google Translate",  icon: "TR", url: "https://translate.google.com/?sl=auto&tl=en&text=%s" },
  { id: "images",       title: "Google Images",    icon: "IMG",url: "https://www.google.com/search?tbm=isch&q=%s" }
];

// ── Install: build context menu ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "qsearch-parent",
      title: "Quick Search",
      contexts: ["selection"]
    });

    ENGINES.forEach(e => {
      chrome.contextMenus.create({
        id: e.id,
        parentId: "qsearch-parent",
        title: e.title,
        contexts: ["selection"]
      });
    });

    chrome.contextMenus.create({
      id: "sep1",
      type: "separator",
      parentId: "qsearch-parent",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "custom-search",
      parentId: "qsearch-parent",
      title: "Add Custom Search...",
      contexts: ["selection"]
    });
  });
});

// ── Context menu click ────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = (info.selectionText || "").trim();
  if (!text) return;

  if (info.menuItemId === "custom-search") {
    chrome.tabs.sendMessage(tab.id, { type: "showPopup", text });
    return;
  }

  const engine = ENGINES.find(e => e.id === info.menuItemId);
  if (engine) {
    openSearch(engine.url, text);
    saveHistory(text, engine.title);
  } else {
    // Could be a custom engine id
    chrome.storage.local.get(["customEngines"], (data) => {
      const custom = (data.customEngines || []).find(e => e.id === info.menuItemId);
      if (custom) {
        openSearch(custom.url, text);
        saveHistory(text, custom.name);
      }
    });
  }
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === "quick-search") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "showPopup", text: "" });
      }
    });
  }
});

// ── Messages from popup / content ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (!isTrustedSender(sender)) {
    sendResponse({ ok: false, reason: "Untrusted sender" });
    return;
  }

  // 🔐 Centralized safe tab opening (from content.js & popup.js)
  if (msg.type === "openSearchTab") {
    if (!msg.url || !isSafeUrl(msg.url)) {
      sendResponse({ ok: false, reason: "Invalid URL" });
      return;
    }

    chrome.tabs.create({ url: msg.url, active: true });
    if (msg.text && msg.engine) {
      saveHistory(msg.text, msg.engine);
    }

    sendResponse({ ok: true });
    return;
  }

  // History search from popup
  if (msg.type === "performSearch") {
    if (!msg.url || !msg.text || !isSafeUrl(msg.url)) {
      sendResponse({ ok: false });
      return;
    }

    const finalUrl = msg.url.replace("%s", encodeURIComponent(msg.text));
    chrome.tabs.create({ url: finalUrl, active: true });
    saveHistory(msg.text, msg.engine);
    sendResponse({ ok: true });
    return;
  }

  // Save history
  if (msg.type === "saveHistory") {
    if (!msg.text || !msg.engine) return;
    saveHistory(msg.text, msg.engine);
    sendResponse({ ok: true });
    return;
  }

  // Custom engines
  if (msg.type === "saveCustomEngine") {
    chrome.storage.local.get(["customEngines"], (data) => {
      const engines = data.customEngines || [];
      engines.push(msg.engine);
      chrome.storage.local.set({ customEngines: engines }, () => {
        chrome.contextMenus.create({
          id: msg.engine.id,
          parentId: "qsearch-parent",
          title: msg.engine.name,
          contexts: ["selection"]
        });
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.type === "removeCustomEngine") {
    chrome.storage.local.get(["customEngines"], (data) => {
      const filtered = (data.customEngines || []).filter(e => e.id !== msg.id);
      chrome.storage.local.set({ customEngines: filtered }, () => {
        try { chrome.contextMenus.remove(msg.id); } catch (_) {}
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.type === "clearHistory") {
    chrome.storage.local.set({ searchHistory: [] }, () => sendResponse({ ok: true }));
    return true;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function openSearch(urlTemplate, text) {
  chrome.tabs.create({
    url: urlTemplate.replace("%s", encodeURIComponent(text)),
    active: true
  });
}

function saveHistory(text, engine) {
  chrome.storage.local.get(["searchHistory"], (data) => {
    const history = data.searchHistory || [];
    history.push({ text, engine, timestamp: Date.now() });
    // Keep only last 50
    if (history.length > 50) history.splice(0, history.length - 50);
    chrome.storage.local.set({ searchHistory: history });
  });
}

// ── Security: allow only extension scripts ─────────────────────────
function isTrustedSender(sender) {
  // allow extension pages & content scripts only
  return sender.id === chrome.runtime.id;
}

// ── Security: allow only http/https navigation ─────────────────────
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
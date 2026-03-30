// ── Quick Search v3 — Background Service Worker ────────────────────────────────

const ENGINES = [
  { id: "google",       title: "Google Search",    url: "https://www.google.com/search?q=%s" },
  { id: "youtube",      title: "YouTube",           url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia",    title: "Wikipedia",         url: "https://en.wikipedia.org/wiki/Special:Search?search=%s" },
  { id: "amazon",       title: "Amazon",            url: "https://www.amazon.com/s?k=%s" },
  { id: "github",       title: "GitHub",            url: "https://github.com/search?q=%s" },
  { id: "stackoverflow",title: "Stack Overflow",    url: "https://stackoverflow.com/search?q=%s" },
  { id: "twitter",      title: "Twitter / X",       url: "https://twitter.com/search?q=%s" },
  { id: "reddit",       title: "Reddit",            url: "https://www.reddit.com/search/?q=%s" },
  { id: "translate",    title: "Google Translate",  url: "https://translate.google.com/?sl=auto&tl=en&text=%s" },
  { id: "images",       title: "Google Images",     url: "https://www.google.com/search?tbm=isch&q=%s" }
];


// ── Install: build context menu ────────────────────────────────────────────────
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
      title: "Custom Engines…",
      contexts: ["selection"]
    });
  });
});

// ── Context menu click ─────────────────────────────────────────────────────────
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
    chrome.storage.local.get(["customEngines"], (data) => {
      const custom = (data.customEngines || []).find(e => e.id === info.menuItemId);
      if (custom) {
        openSearch(custom.url, text);
        saveHistory(text, custom.name);
      }
    });
  }
});

// ── Keyboard shortcut ──────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === "quick-search") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "showPopup", text: "" });
    });
  }
});

// ── Message handler ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (!isTrustedSender(sender)) {
    sendResponse({ ok: false, reason: "Untrusted sender" });
    return;
  }

  // Open a single search tab
  if (msg.type === "openSearchTab") {
    if (!msg.url || !isSafeUrl(msg.url)) {
      sendResponse({ ok: false, reason: "Invalid URL" });
      return;
    }
    chrome.tabs.create({ url: msg.url, active: true });
    if (msg.text && msg.engine) saveHistory(msg.text, msg.engine);
    sendResponse({ ok: true });
    return;
  }

  // Open multiple searches as tab group
  if (msg.type === "openTabGroup") {
    if (!msg.searches || !Array.isArray(msg.searches)) {
      sendResponse({ ok: false });
      return;
    }
    const safeSearches = msg.searches.filter(s => s.url && isSafeUrl(s.url));
    if (!safeSearches.length) { sendResponse({ ok: false }); return; }

    // Create tabs first, then group them
    const tabIds = [];
    let created = 0;

    safeSearches.forEach((search, i) => {
      chrome.tabs.create({ url: search.url, active: i === 0 }, (tab) => {
        tabIds.push(tab.id);
        created++;
        if (created === safeSearches.length) {
          // Group the tabs
          chrome.tabs.group({ tabIds }, (groupId) => {
            if (chrome.tabGroups && msg.groupName) {
              chrome.tabGroups.update(groupId, {
                title: msg.groupName.slice(0, 25),
                color: "blue"
              });
            }
          });
        }
      });
    });

    sendResponse({ ok: true });
    return;
  }

  // Perform search (from history re-search)
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

  // Delete single history item
  if (msg.type === "deleteHistoryItem") {
    chrome.storage.local.get(["searchHistory"], (data) => {
      const history = (data.searchHistory || []).filter(h => h.timestamp !== msg.id);
      chrome.storage.local.set({ searchHistory: history }, () => sendResponse({ ok: true }));
    });
    return true;
  }

  // Clear all history
  if (msg.type === "clearHistory") {
    chrome.storage.local.set({ searchHistory: [], favoriteHistory: [] }, () =>
      sendResponse({ ok: true })
    );
    return true;
  }

  // Save custom engine
  if (msg.type === "saveCustomEngine") {
    chrome.storage.local.get(["customEngines"], (data) => {
      const engines = data.customEngines || [];
      engines.push(msg.engine);
      chrome.storage.local.set({ customEngines: engines }, () => {
        try {
          chrome.contextMenus.create({
            id: msg.engine.id,
            parentId: "qsearch-parent",
            title: msg.engine.name,
            contexts: ["selection"]
          });
        } catch (_) {}
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  // Remove custom engine
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
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function openSearch(urlTemplate, text) {
  chrome.tabs.create({
    url: urlTemplate.replace("%s", encodeURIComponent(text)),
    active: true
  });
}

function saveHistory(text, engine) {
  chrome.storage.local.get(["searchHistory", "historyLimit"], (data) => {
    const limit   = data.historyLimit || 50;
    const history = data.searchHistory || [];
    history.push({ text, engine, timestamp: Date.now(), id: Date.now().toString() });
    if (history.length > limit) history.splice(0, history.length - limit);
    chrome.storage.local.set({ searchHistory: history });
  });
}

function isTrustedSender(sender) {
  return sender.id === chrome.runtime.id;
}

function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

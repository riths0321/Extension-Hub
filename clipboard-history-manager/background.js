const STORAGE_KEYS = {
  history: "clipboardHistory",
  settings: "clipboardSettings",
  totalSaves: "totalSaves"
};

const DEFAULT_SETTINGS = {
  autoSave: true,
  maxItems: 50,
  notifications: true
};

const CLEANUP_ALARM = "clipboard-history-cleanup";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  createContextMenu();
  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "saveToClipboard" && info.selectionText) {
    saveToHistory(info.selectionText);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-to-history") {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getSelectedTextFromPage
    });
    const selectedText = results?.[0]?.result || "";
    if (selectedText) {
      await saveToHistory(selectedText);
    }
  } catch (_error) {
    // Restricted pages will fail here. Ignore silently.
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleMessage(request)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CLEANUP_ALARM) {
    cleanupOldItems();
  }
});

async function handleMessage(request) {
  switch (request.action) {
    case "saveClipboard":
      await saveToHistory(request.text, request.type);
      return { success: true };
    case "copyItem":
      await updateUsageCount(request.text);
      return { success: true };
    case "getSettings":
      return {
        success: true,
        settings: await getSettings()
      };
    default:
      return { success: false, error: "Unknown action" };
  }
}

async function ensureDefaults() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.history,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.totalSaves
  ]);

  if (!Array.isArray(data[STORAGE_KEYS.history])) {
    await chrome.storage.local.set({ [STORAGE_KEYS.history]: [] });
  }

  if (typeof data[STORAGE_KEYS.totalSaves] !== "number") {
    await chrome.storage.local.set({ [STORAGE_KEYS.totalSaves]: 0 });
  }

  if (!data[STORAGE_KEYS.settings]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
}

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "saveToClipboard",
      title: "Save to Clipboard History",
      contexts: ["selection"]
    });
  });
}

async function getSettings() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  return {
    ...DEFAULT_SETTINGS,
    ...(data[STORAGE_KEYS.settings] || {})
  };
}

async function getHistoryState() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.history,
    STORAGE_KEYS.totalSaves
  ]);
  return {
    history: Array.isArray(data[STORAGE_KEYS.history]) ? data[STORAGE_KEYS.history] : [],
    totalSaves: typeof data[STORAGE_KEYS.totalSaves] === "number" ? data[STORAGE_KEYS.totalSaves] : 0
  };
}

async function saveToHistory(text, type = "text") {
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return;
  }

  const settings = await getSettings();
  if (!settings.autoSave) {
    return;
  }

  const { history, totalSaves } = await getHistoryState();
  const recentThreshold = Date.now() - 5 * 60 * 1000;
  const existingIndex = history.findIndex(
    (item) => item.content === cleanText && item.timestamp > recentThreshold
  );

  let nextHistory = [...history];
  let nextTotalSaves = totalSaves;

  if (existingIndex >= 0) {
    const existingItem = { ...nextHistory[existingIndex] };
    existingItem.timestamp = Date.now();
    existingItem.usageCount = (existingItem.usageCount || 0) + 1;
    nextHistory.splice(existingIndex, 1);
    nextHistory.unshift(existingItem);
  } else {
    nextHistory.unshift({
      content: cleanText,
      pinned: false,
      timestamp: Date.now(),
      type: detectType(cleanText, type),
      usageCount: 1
    });
    nextTotalSaves += 1;
  }

  nextHistory = trimHistory(nextHistory, settings.maxItems);

  await chrome.storage.local.set({
    [STORAGE_KEYS.history]: nextHistory,
    [STORAGE_KEYS.totalSaves]: nextTotalSaves
  });

  if (settings.notifications) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Clipboard Saved",
      message: cleanText.length > 60 ? `${cleanText.slice(0, 57)}...` : cleanText
    });
  }
}

async function updateUsageCount(text) {
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return;
  }

  const { history } = await getHistoryState();
  const nextHistory = history.map((item) => {
    if (item.content !== cleanText) {
      return item;
    }
    return {
      ...item,
      lastUsed: Date.now(),
      usageCount: (item.usageCount || 0) + 1
    };
  });

  await chrome.storage.local.set({ [STORAGE_KEYS.history]: nextHistory });
}

async function cleanupOldItems() {
  const { history } = await getHistoryState();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const nextHistory = history.filter((item) => item.pinned || item.timestamp > oneWeekAgo);
  if (nextHistory.length !== history.length) {
    await chrome.storage.local.set({ [STORAGE_KEYS.history]: nextHistory });
  }
}

function trimHistory(items, maxItems) {
  const pinned = items.filter((item) => item.pinned);
  const rest = items.filter((item) => !item.pinned);
  return [...pinned, ...rest].slice(0, Math.max(10, Math.min(maxItems || 50, 200)));
}

function detectType(text, providedType) {
  if (providedType && providedType !== "text") {
    return providedType;
  }
  if (/^https?:\/\//i.test(text)) {
    return "link";
  }
  if (
    /function\s|\bconst\b|\blet\b|\bvar\b|=>|{|}|;|<\/?[a-z]/i.test(text)
  ) {
    return "code";
  }
  return "text";
}

function getSelectedTextFromPage() {
  const activeElement = document.activeElement;
  if (
    activeElement &&
    (activeElement.tagName === "TEXTAREA" ||
      (activeElement.tagName === "INPUT" &&
        /^(text|search|url|tel|password|email)$/i.test(activeElement.type || "text")))
  ) {
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    return activeElement.value.slice(start, end).trim();
  }

  return window.getSelection().toString().trim();
}

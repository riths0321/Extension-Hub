const DEFAULTS = {
  autoScan: true,
  showBadge: true,
  enableSound: true,
  sensitivityLevel: "medium",
  scanHistory: []
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS, ...current };
  await chrome.storage.local.set(merged);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case "getSettings": {
        const settings = await chrome.storage.local.get(Object.keys(DEFAULTS));
        sendResponse({
          autoScan: settings.autoScan !== false,
          showBadge: settings.showBadge !== false,
          enableSound: settings.enableSound !== false,
          sensitivityLevel: settings.sensitivityLevel || "medium"
        });
        break;
      }
      case "updateSettings": {
        if (message.settings && typeof message.settings === "object") {
          await chrome.storage.local.set(message.settings);
        }
        sendResponse({ ok: true });
        break;
      }
      case "clearHistory": {
        await chrome.storage.local.set({ scanHistory: [] });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: "Unknown action" });
    }
  })().catch((error) => {
    sendResponse({ ok: false, error: error.message || "Background error" });
  });

  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !tab?.url || !/^https?:/i.test(tab.url)) return;

  const { autoScan = true } = await chrome.storage.local.get(["autoScan"]);
  if (!autoScan) return;

  const jobMarkers = ["job", "jobs", "career", "hiring", "employment", "position"];
  const isJobLike = jobMarkers.some((term) => tab.url.toLowerCase().includes(term));
  if (!isJobLike) return;

  try {
    await chrome.tabs.sendMessage(tabId, { action: "analyzePage" });
  } catch {
    // Content script may not be ready or not injectable on this page.
  }
});

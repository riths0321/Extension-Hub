// background.js — Draw Pencil Pro v14.0
const injectionJobs = new Map();

chrome.action.onClicked.addListener(async (tab) => { await toggleOnTab(tab); });
chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-draw") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await toggleOnTab(tab);
  }
});

function isRestrictedUrl(url) {
  if (!url) return true;
  const restrictedPrefixes = ["chrome://", "chrome-extension://", "edge://", "about:", "https://chrome.google.com/webstore"];
  return restrictedPrefixes.some(p => url.startsWith(p));
}

function canInjectIntoTab(tab) {
  if (!tab?.id || isRestrictedUrl(tab.url)) return false;
  if (tab.discarded) return false;
  if (tab.status && tab.status !== "complete") return false;
  return true;
}

async function toggleOnTab(tab) {
  if (!canInjectIntoTab(tab)) return;
  const alive = await new Promise(resolve => {
    chrome.tabs.sendMessage(tab.id, { action: "PING" }, (response) => {
      if (chrome.runtime.lastError) resolve(false);
      else resolve(response === "PONG");
    });
  });
  if (alive) {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE" }, () => {
      if (chrome.runtime.lastError) console.error("Toggle failed:", chrome.runtime.lastError.message);
    });
  } else {
    await injectAndSend(tab.id, "TOGGLE");
  }
}

async function injectAndSend(tabId, action) {
  if (injectionJobs.has(tabId)) {
    await injectionJobs.get(tabId);
    return;
  }
  const job = (async () => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!canInjectIntoTab(tab)) return;
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["style.css"] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action }, () => {
          if (chrome.runtime.lastError) console.error("Post-injection message failed:", chrome.runtime.lastError.message);
        });
      }, 250);
    } catch (err) {
      console.error("Injection failed:", err);
    }
  })();
  injectionJobs.set(tabId, job);
  try { await job; } finally { injectionJobs.delete(tabId); }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "SAVE_SETTINGS") {
    chrome.storage.local.set({ drawPencilSettings: msg.settings });
    sendResponse({ ok: true });
  } else if (msg.action === "LOAD_SETTINGS") {
    chrome.storage.local.get("drawPencilSettings", (data) => {
      sendResponse({ settings: data.drawPencilSettings || null });
    });
    return true;
  } else if (msg.action === "CAPTURE_TAB") {
    // Capture the visible tab as a PNG data URL, then composite with drawings in content.js
    const tabId = sender.tab?.id;
    const windowId = sender.tab?.windowId;
    if (!tabId || !windowId) { sendResponse({ ok: false, error: "No tab info" }); return; }
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, dataUrl });
      }
    });
    return true; // Keep channel open for async response
  } else if (msg.action === "SHOW_NOTIFICATION") {
    // Show a browser notification (focus timer ended)
    chrome.notifications.create("dp-focus-done-" + Date.now(), {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: msg.title || "Draw Pencil Pro",
      message: msg.message || "Your focus session is complete. Take a rest!",
      priority: 2,
      requireInteraction: true
    }, () => {});
    sendResponse({ ok: true });
  }
});

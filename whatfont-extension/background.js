// WhatFont — Background Service Worker v1.2.0

const DEFAULTS = {
  whatFontActive:  false,
  detectionMode:   'hover',
  detectedFonts:   [],
  showDownload:    true,
  showCSS:         true,
  showContrast:    true,
  highlightText:   false,
  panelPosition:   'top-right',
  bookmarkedFonts: []
};

const tabDetectedFonts = new Map();

function makeFontKey(fontInfo) {
  return `${fontInfo.family}|${fontInfo.size}|${fontInfo.weight}|${fontInfo.style}|${fontInfo.color}`;
}

function addTabFont(tabId, fontInfo) {
  if (tabId === undefined || tabId === null || !fontInfo?.family) return;

  const current = tabDetectedFonts.get(tabId) || [];
  const key = makeFontKey(fontInfo);
  if (current.some(item => makeFontKey(item) === key)) return;

  current.push(fontInfo);
  if (current.length > 120) current.splice(0, current.length - 120);
  tabDetectedFonts.set(tabId, current);
}

// ─── Install ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const patch = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) patch[key] = value;
  }

  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
});

// ─── Message Routing ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'fontDetected') {
    if (sender?.tab?.id !== undefined && sender?.tab?.id !== null) {
      const tabId = sender.tab.id;
      addTabFont(tabId, request.fontInfo);
      chrome.runtime.sendMessage({ ...request, tabId }).catch(() => {});
    }
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'toggleDetection') {
    const tabId = sender?.tab?.id;
    if (tabId === undefined || tabId === null) {
      sendResponse({ success: false, error: 'No active tab' });
      return false;
    }

    (async () => {
      const data = await chrome.storage.local.get(['whatFontActive', 'detectionMode']);
      const nextActive = !Boolean(data.whatFontActive);
      const mode = data.detectionMode || 'hover';
      const message = nextActive
        ? { action: 'activateFontDetection', mode }
        : { action: 'deactivateFontDetection' };

      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        if (!response?.success) {
          sendResponse({ success: false, error: 'Toggle failed' });
          return;
        }

        await chrome.storage.local.set({ whatFontActive: nextActive });
        chrome.runtime.sendMessage({
          action: 'detectionStateChanged',
          tabId,
          active: nextActive
        }).catch(() => {});
        sendResponse({ success: true, active: nextActive, mode });
      } catch {
        sendResponse({ success: false, error: 'Content script unavailable' });
      }
    })();

    return true;
  }

  if (request.action === 'getDetectedFontsForTab') {
    const fonts = tabDetectedFonts.get(request.tabId) || [];
    sendResponse({ success: true, fonts });
    return false;
  }

  if (request.action === 'clearDetectedFontsForTab') {
    if (request.tabId !== undefined && request.tabId !== null) {
      tabDetectedFonts.set(request.tabId, []);
    }
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
    return false;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// ─── Tab Lifecycle ───────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (typeof changeInfo.url === 'string') {
    tabDetectedFonts.set(tabId, []);
    await chrome.storage.local.set({ whatFontActive: false });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabDetectedFonts.delete(tabId);
});

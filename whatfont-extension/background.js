// WhatFont background service worker

const DEFAULTS = {
  whatFontActive: false,
  detectionMode: 'hover',
  detectedFonts: [],
  showDownload: true,
  showCSS: true,
  highlightText: false,
  panelPosition: 'top-right'
};
const tabDetectedFonts = new Map();

function makeFontKey(fontInfo) {
  return `${fontInfo.family}|${fontInfo.size}|${fontInfo.weight}|${fontInfo.style}|${fontInfo.color}`;
}

function addTabFont(tabId, fontInfo) {
  if (tabId === undefined || tabId === null || !fontInfo || !fontInfo.family) {
    return;
  }

  const current = tabDetectedFonts.get(tabId) || [];
  const key = makeFontKey(fontInfo);
  const exists = current.some((item) => makeFontKey(item) === key);
  if (exists) {
    return;
  }

  current.push(fontInfo);
  if (current.length > 120) {
    current.splice(0, current.length - 120);
  }

  tabDetectedFonts.set(tabId, current);
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const patch = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) {
      patch[key] = value;
    }
  }

  if (Object.keys(patch).length) {
    await chrome.storage.local.set(patch);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fontDetected') {
    // Forward only detections coming from a real page tab to avoid extension-context loops.
    if (sender?.tab?.id !== undefined && sender?.tab?.id !== null) {
      const tabId = sender.tab.id;
      addTabFont(tabId, request.fontInfo);
      chrome.runtime.sendMessage({ ...request, tabId }).catch(() => {
        // Popup is not open; ignore.
      });
    }

    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'getDetectedFontsForTab') {
    const tabId = request.tabId;
    const fonts = tabDetectedFonts.get(tabId) || [];
    sendResponse({ success: true, fonts });
    return false;
  }

  if (request.action === 'clearDetectedFontsForTab') {
    const tabId = request.tabId;
    if (tabId !== undefined && tabId !== null) {
      tabDetectedFonts.set(tabId, []);
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

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (typeof changeInfo.url === 'string') {
    // New navigation: clear previous tab page font cache.
    tabDetectedFonts.set(tabId, []);
    // Manual-start UX: never auto-keep detection active across navigations.
    await chrome.storage.local.set({ whatFontActive: false });
  }

  if (changeInfo.status !== 'complete' || !tab?.url) {
    return;
  }

  const url = tab.url;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('chrome-extension://')
  ) {
    return;
  }

  // Do not auto-activate detection here.
  // Detection must start only from explicit user action in popup.
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabDetectedFonts.delete(tabId);
});

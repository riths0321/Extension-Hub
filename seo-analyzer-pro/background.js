/* =====================================================
   SEO Analyzer Pro – Background Service Worker v3.0
   Manifest V3 compliant
===================================================== */
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ analysisHistory: [] });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_HISTORY') {
    chrome.storage.local.get(['analysisHistory'], (result) => {
      let history = result.analysisHistory || [];
      // Avoid duplicate consecutive entries for same URL
      if (history.length > 0 && history[0].url === message.entry.url) {
        history[0] = message.entry;
      } else {
        history.unshift(message.entry);
      }
      if (history.length > 50) history = history.slice(0, 50);
      chrome.storage.local.set({ analysisHistory: history });
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'CLEAR_HISTORY') {
    chrome.storage.local.set({ analysisHistory: [] });
    sendResponse({ ok: true });
    return true;
  }
});

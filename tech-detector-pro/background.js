// Tech Detector Pro v2.0 — Background Service Worker
'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    autoScan: false
  });
});

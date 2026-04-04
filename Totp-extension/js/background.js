/**
 * background.js — Service worker
 * Handles auto-lock alarm. When the alarm fires, we set a flag in
 * storage so the popup locks itself on next open.
 */

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'autoLock') {
    chrome.storage.local.set({ sessionLocked: true });
  }
});

// Minimal service worker - auto-lock handled

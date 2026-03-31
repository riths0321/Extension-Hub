'use strict';

/* ── Keyboard shortcut ───────────────────────────────── */
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === '_execute_action') {
    // popup opens automatically
  }
});

/* ── Login-page detection ────────────────────────────── */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  try {
    const url    = new URL(tab.url);
    const path   = url.pathname.toLowerCase();
    const search = url.search.toLowerCase();
    const isLogin =
      path.includes('login') || path.includes('signin') ||
      path.includes('sign-in') || path.includes('auth') ||
      search.includes('login') || search.includes('signin');

    if (isLogin) {
      chrome.tabs.sendMessage(tabId, { action: 'detectLoginPage', url: tab.url })
        .catch(() => {});
    }
  } catch (_) {}
});

/* ── Clipboard auto-clear alarm ──────────────────────── */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clearClipboard') {
    // Write empty string — best effort from service worker
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try { navigator.clipboard.writeText(''); } catch (_) {}
        }
      }).catch(() => {});
    });
  }
});

/* ── Schedule clipboard clear (called from popup) ───── */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'scheduleClearClipboard') {
    chrome.alarms.create('clearClipboard', { delayInMinutes: 0.5 }); // 30s
    sendResponse({ ok: true });
  }
  return false;
});

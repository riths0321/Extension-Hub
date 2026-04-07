/**
 * background.js — MV3 Service Worker
 */

import { ensureDefaults }            from './services/storage.js';
import { addToHistory, autoCleanup } from './services/clipboard.js';

const CLEANUP_ALARM = 'chm-cleanup';

// ─── Context Menu ─────────────────────────────────────────────────────────────
// Simple flat item — no parentId nesting (causes issues in some Chrome builds)

function rebuildContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id:       'chm-save-selection',
        title:    '📋 Save to Clipboard History',
        contexts: ['selection'],
      },
      () => {
        if (chrome.runtime.lastError) {
          // Suppress "already exists" noise
        }
      }
    );
  });
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'chm-save-selection' && info.selectionText) {
    addToHistory(info.selectionText);
  }
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  rebuildContextMenu();
  scheduleCleanup();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  rebuildContextMenu();
  scheduleCleanup();
});

// Rebuild on every service worker wake-up (MV3 kills SW frequently)
rebuildContextMenu();

// ─── Cleanup Alarm ────────────────────────────────────────────────────────────

function scheduleCleanup() {
  chrome.alarms.get(CLEANUP_ALARM, (a) => {
    if (!a) chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CLEANUP_ALARM) autoCleanup();
});

// ─── Commands ─────────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'copy-to-history') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   getSelectionFromPage,
    });
    const text = results?.[0]?.result || '';
    if (text) await addToHistory(text);
  } catch { /* restricted page */ }
});

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleMessage(request)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));
  return true;
});

async function handleMessage(req) {
  switch (req.action) {
    case 'saveClipboard': {
      const item = await addToHistory(req.text, req.type);
      return { success: true, item };
    }
    case 'notify': {
      chrome.notifications.create({
        type:    'basic',
        iconUrl: 'icons/icon48.png',
        title:   req.title || 'Clipboard',
        message: (req.message || '').slice(0, 80),
      });
      return { success: true };
    }
    case 'getSettings': {
      const { getSettings } = await import('./services/storage.js');
      return { success: true, settings: await getSettings() };
    }
    case 'pasteToTab': {
      const { tabId, text } = req;
      if (!tabId) return { success: false, error: 'No tabId' };
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func:   pasteTextIntoPage,
        args:   [text],
      });
      return { success: true, pasted: results?.[0]?.result?.pasted ?? false };
    }
    default:
      return { success: false, error: `Unknown action: ${req.action}` };
  }
}

// ─── Injected page functions ──────────────────────────────────────────────────

function getSelectionFromPage() {
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && /^(text|search|url|tel|email)$/i.test(el.type || 'text')))) {
    return el.value.slice(el.selectionStart || 0, el.selectionEnd || 0).trim();
  }
  return window.getSelection().toString().trim();
}

function pasteTextIntoPage(text) {
  const el = document.activeElement;
  if (!el) return { pasted: false };
  const isInput = el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && /^(text|search|url|tel|email|password)$/i.test(el.type || 'text'));
  if (isInput) {
    const s = el.selectionStart || 0, e = el.selectionEnd || 0;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    el.setSelectionRange(s + text.length, s + text.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return { pasted: true };
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0);
      r.deleteContents();
      r.insertNode(document.createTextNode(text));
      r.collapse(false);
    } else {
      el.textContent += text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return { pasted: true };
  }
  return { pasted: false };
}

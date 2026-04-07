/**
 * content.js — injected into every page.
 * Listens for copy/cut events and forwards the selected text to the background.
 */

let _lastCapture = '';
let _settingsCache = null;
let _settingsTtl = 0;

async function getSettings() {
  const now = Date.now();
  if (_settingsCache && now < _settingsTtl) return _settingsCache;
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (resp?.success) {
      _settingsCache = resp.settings;
      _settingsTtl   = now + 10_000; // cache for 10 s
    }
  } catch { /* extension may be reloading */ }
  return _settingsCache;
}

async function onCopyOrCut() {
  const settings = await getSettings();
  if (!settings?.autoSave) return;

  // Small delay so the browser can finalise the selection
  setTimeout(() => {
    const text = getSelectedText();
    if (!text || text === _lastCapture) return;
    _lastCapture = text;
    chrome.runtime.sendMessage({ action: 'saveClipboard', text }).catch(() => {});
  }, 50);
}

function getSelectedText() {
  const el = document.activeElement;
  if (el && (el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && /^(text|search|url|tel|email)$/i.test(el.type || 'text')))) {
    return el.value.slice(el.selectionStart || 0, el.selectionEnd || 0).trim();
  }
  return window.getSelection().toString().trim();
}

document.addEventListener('copy', onCopyOrCut, true);
document.addEventListener('cut',  onCopyOrCut, true);

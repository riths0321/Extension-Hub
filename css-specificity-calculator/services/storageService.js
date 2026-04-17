/**
 * storageService.js
 * Thin wrapper around chrome.storage.local with async/await support.
 */

const HISTORY_KEY = 'selectorHistory';
const THEME_KEY = 'theme';
const MAX_HISTORY = 5;

export async function getTheme() {
  return new Promise(resolve => {
    chrome.storage.local.get([THEME_KEY], data => resolve(data[THEME_KEY] || 'light'));
  });
}

export async function setTheme(theme) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [THEME_KEY]: theme }, resolve);
  });
}

export async function getHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get([HISTORY_KEY], data => resolve(data[HISTORY_KEY] || []));
  });
}

export async function addToHistory(selector) {
  if (!selector || !selector.trim()) return;
  const history = await getHistory();
  const filtered = history.filter(s => s !== selector);
  const updated = [selector, ...filtered].slice(0, MAX_HISTORY);
  return new Promise(resolve => {
    chrome.storage.local.set({ [HISTORY_KEY]: updated }, resolve);
  });
}

export async function clearHistory() {
  return new Promise(resolve => {
    chrome.storage.local.remove([HISTORY_KEY], resolve);
  });
}

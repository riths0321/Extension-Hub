const SETTINGS_KEY = "qs_settings";
const HISTORY_KEY = "qs_history_v1";
const DRAFT_KEY = "qs_draft_capture_v1";

export function defaultSettings() {
  return {
    format: "png", // png | jpg
    autoCopy: false,
    filenameIncludeDate: true,
    filenameIncludeTime: true,
    theme: "light", // light | dark
    jpgQuality: 0.92
  };
}

export async function getSettings() {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  return { ...defaultSettings(), ...(result[SETTINGS_KEY] || {}) };
}

export async function setSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function resetSettings() {
  const next = defaultSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getDraftCapture() {
  const result = await chrome.storage.local.get([DRAFT_KEY]);
  const draft = result[DRAFT_KEY] || null;
  if (!draft) return null;
  if (!draft.mode) return { mode: "single", ...draft };
  return draft;
}

export async function setDraftCapture(draft) {
  await chrome.storage.local.set({ [DRAFT_KEY]: draft });
}

export async function clearDraftCapture() {
  await chrome.storage.local.remove([DRAFT_KEY]);
}

export async function getHistory() {
  const result = await chrome.storage.local.get([HISTORY_KEY]);
  return Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
}

export async function setHistory(items) {
  await chrome.storage.local.set({ [HISTORY_KEY]: items });
}

export async function addHistoryItem(item, limit = 20) {
  const history = await getHistory();
  const next = [item, ...history].slice(0, limit);
  await setHistory(next);
  return next;
}

export async function deleteHistoryItem(id) {
  const history = await getHistory();
  const next = history.filter((h) => h.id !== id);
  await setHistory(next);
  return next;
}

export async function clearHistory() {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}

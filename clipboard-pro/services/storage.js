/**
 * StorageService — single source of truth for all chrome.storage.local I/O.
 * All keys live here; nothing else touches chrome.storage directly.
 */

export const KEYS = {
  HISTORY:     'chm_history',
  SETTINGS:    'chm_settings',
  TAGS:        'chm_tags',
  TOTAL_SAVES: 'chm_total_saves',
};

export const DEFAULTS = {
  settings: {
    autoSave:        true,
    notifications:   true,
    maxItems:        100,
    autoCleanDays:   7,
    fuzzySearch:     true,
  },
  tags: [],          // [{id, label, color}]
  history: [],
  totalSaves: 0,
};

export async function getAll() {
  const data = await chrome.storage.local.get([
    KEYS.HISTORY, KEYS.SETTINGS, KEYS.TAGS, KEYS.TOTAL_SAVES,
  ]);
  return {
    history:    Array.isArray(data[KEYS.HISTORY])              ? data[KEYS.HISTORY]    : [],
    settings:   { ...DEFAULTS.settings, ...(data[KEYS.SETTINGS] || {}) },
    tags:       Array.isArray(data[KEYS.TAGS])                 ? data[KEYS.TAGS]       : [],
    totalSaves: typeof data[KEYS.TOTAL_SAVES] === 'number'     ? data[KEYS.TOTAL_SAVES]: 0,
  };
}

export async function getHistory() {
  const d = await chrome.storage.local.get(KEYS.HISTORY);
  return Array.isArray(d[KEYS.HISTORY]) ? d[KEYS.HISTORY] : [];
}

export async function getSettings() {
  const d = await chrome.storage.local.get(KEYS.SETTINGS);
  return { ...DEFAULTS.settings, ...(d[KEYS.SETTINGS] || {}) };
}

export async function getTags() {
  const d = await chrome.storage.local.get(KEYS.TAGS);
  return Array.isArray(d[KEYS.TAGS]) ? d[KEYS.TAGS] : [];
}

export async function setHistory(history) {
  await chrome.storage.local.set({ [KEYS.HISTORY]: history });
}

export async function setSettings(settings) {
  await chrome.storage.local.set({ [KEYS.SETTINGS]: settings });
}

export async function setTags(tags) {
  await chrome.storage.local.set({ [KEYS.TAGS]: tags });
}

export async function bumpTotalSaves() {
  const d = await chrome.storage.local.get(KEYS.TOTAL_SAVES);
  const n = typeof d[KEYS.TOTAL_SAVES] === 'number' ? d[KEYS.TOTAL_SAVES] : 0;
  await chrome.storage.local.set({ [KEYS.TOTAL_SAVES]: n + 1 });
  return n + 1;
}

export async function ensureDefaults() {
  const data = await chrome.storage.local.get([
    KEYS.HISTORY, KEYS.SETTINGS, KEYS.TAGS, KEYS.TOTAL_SAVES,
  ]);
  const patch = {};
  if (!Array.isArray(data[KEYS.HISTORY]))              patch[KEYS.HISTORY]     = [];
  if (!data[KEYS.SETTINGS])                            patch[KEYS.SETTINGS]    = DEFAULTS.settings;
  if (!Array.isArray(data[KEYS.TAGS]))                 patch[KEYS.TAGS]        = [];
  if (typeof data[KEYS.TOTAL_SAVES] !== 'number')      patch[KEYS.TOTAL_SAVES] = 0;
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
}

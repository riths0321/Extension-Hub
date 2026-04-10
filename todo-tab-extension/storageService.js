/* ═══════════════════════════════════════════
   storageService.js — Local storage wrapper
   ═══════════════════════════════════════════ */

const KEYS = {
  TODOS:    'todotab_todos_v2',
  SETTINGS: 'todotab_settings_v2',
};

const DEFAULT_SETTINGS = Object.freeze({
  theme: 'light',
  defaultCategory: 'Work',
});

const StorageService = {
  getDefaultSettings() {
    return Object.assign({}, DEFAULT_SETTINGS);
  },

  saveTodos(todos) {
    try {
      localStorage.setItem(KEYS.TODOS, JSON.stringify(todos));
      return true;
    } catch (e) {
      console.error('[StorageService] saveTodos failed:', e);
      return false;
    }
  },

  loadTodos() {
    try {
      const raw = localStorage.getItem(KEYS.TODOS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[StorageService] loadTodos failed:', e);
      return [];
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('[StorageService] saveSettings failed:', e);
      return false;
    }
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      if (!raw) return StorageService.getDefaultSettings();
      const parsed = Object.assign(StorageService.getDefaultSettings(), JSON.parse(raw));
      if (parsed.theme !== 'light' && parsed.theme !== 'dark') parsed.theme = 'light';
      if (!parsed.defaultCategory || typeof parsed.defaultCategory !== 'string') parsed.defaultCategory = 'Work';
      return parsed;
    } catch (e) {
      return StorageService.getDefaultSettings();
    }
  },
};

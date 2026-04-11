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
  background: Object.freeze({
    mode: 'default',      // default | template | custom
    templateId: 'template-1',
    customDataUrl: '',
  }),
});

const StorageService = {
  getDefaultSettings() {
    return {
      theme: DEFAULT_SETTINGS.theme,
      defaultCategory: DEFAULT_SETTINGS.defaultCategory,
      background: Object.assign({}, DEFAULT_SETTINGS.background),
    };
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
      if (!parsed.background || typeof parsed.background !== 'object') {
        parsed.background = Object.assign({}, DEFAULT_SETTINGS.background);
      }
      if (!['default', 'template', 'custom'].includes(parsed.background.mode)) parsed.background.mode = 'default';
      if (!parsed.background.templateId || typeof parsed.background.templateId !== 'string') parsed.background.templateId = 'template-1';
      if (typeof parsed.background.customDataUrl !== 'string') parsed.background.customDataUrl = '';
      return parsed;
    } catch (e) {
      return StorageService.getDefaultSettings();
    }
  },
};

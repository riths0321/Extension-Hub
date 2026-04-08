/**
 * SnipVault – Snippet Service
 * Manages all snippet CRUD, search, filtering, and business logic.
 * NO innerHTML, NO eval. Fully CSP-safe.
 */

const SnippetService = (() => {
  const STORAGE_KEY = 'snipvault_snippets';
  const COLLECTIONS_KEY = 'snipvault_collections';
  const SETTINGS_KEY = 'snipvault_settings';
  const MAX_SYNC_BYTES = 98304; // ~96KB safe threshold

  /* ─── Storage Helpers ────────────────────────────────────────────── */

  function chromeGet(area, key) {
    return new Promise((resolve, reject) => {
      chrome.storage[area].get(key, (data) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(data);
      });
    });
  }

  function chromeSet(area, obj) {
    return new Promise((resolve, reject) => {
      chrome.storage[area].set(obj, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  /* ─── Snippets ───────────────────────────────────────────────────── */

  async function loadSnippets() {
    try {
      const sync = await chromeGet('sync', STORAGE_KEY);
      if (sync[STORAGE_KEY]?.length) return { ok: true, snippets: sync[STORAGE_KEY], source: 'sync' };
      const local = await chromeGet('local', STORAGE_KEY);
      return { ok: true, snippets: local[STORAGE_KEY] || [], source: 'local' };
    } catch (e) {
      try {
        const local = await chromeGet('local', STORAGE_KEY);
        return { ok: true, snippets: local[STORAGE_KEY] || [], source: 'local' };
      } catch (e2) {
        return { ok: false, snippets: [], error: e2.message };
      }
    }
  }

  async function saveSnippets(snippets) {
    const payload = { [STORAGE_KEY]: snippets };
    const size = JSON.stringify(payload).length;
    try {
      await chromeSet('local', payload);
      if (size < MAX_SYNC_BYTES) {
        await chromeSet('sync', payload);
        return { ok: true };
      }
      return { ok: true, warning: 'Too large for sync; saved locally only.' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /* ─── Collections ────────────────────────────────────────────────── */

  async function loadCollections() {
    try {
      const data = await chromeGet('local', COLLECTIONS_KEY);
      return data[COLLECTIONS_KEY] || [];
    } catch (_) { return []; }
  }

  async function saveCollections(collections) {
    try {
      await chromeSet('local', { [COLLECTIONS_KEY]: collections });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /* ─── Settings ────────────────────────────────────────────────────── */

  async function loadSettings() {
    try {
      const data = await chromeGet('local', SETTINGS_KEY);
      return data[SETTINGS_KEY] || defaultSettings();
    } catch (_) { return defaultSettings(); }
  }

  async function saveSettings(settings) {
    try {
      await chromeSet('local', { [SETTINGS_KEY]: settings });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function defaultSettings() {
    return { theme: 'light', defaultLanguage: 'javascript', fontSize: 13 };
  }

  /* ─── ID Generation ────────────────────────────────────────────────── */

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /* ─── Snippet Factory ───────────────────────────────────────────────── */

  function createSnippet({ title, code, language, tags = [], collectionId = null }) {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      title: title.trim().slice(0, 120),
      code,
      language: language || detectLanguage(code),
      tags: normalizeTags(tags),
      collectionId,
      favorite: false,
      date: now,
      updatedAt: now,
      usageCount: 0
    };
  }

  function updateSnippet(existing, { title, code, language, tags, collectionId }) {
    return {
      ...existing,
      title: title.trim().slice(0, 120),
      code,
      language,
      tags: normalizeTags(tags),
      collectionId: collectionId ?? existing.collectionId,
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return [...new Set(tags.map(t => String(t).toLowerCase().trim()).filter(Boolean))].slice(0, 10);
  }

  function normalizeSnippet(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const s = {
      id: String(raw.id || generateId()),
      title: String(raw.title || '').trim(),
      code: String(raw.code || ''),
      language: String(raw.language || 'plaintext'),
      tags: normalizeTags(raw.tags),
      collectionId: raw.collectionId || null,
      favorite: Boolean(raw.favorite),
      date: raw.date || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.date || new Date().toISOString(),
      usageCount: Number(raw.usageCount) || 0
    };
    if (!s.title || !s.code) return null;
    return s;
  }

  /* ─── Language Detection ─────────────────────────────────────────────── */

  function detectLanguage(code) {
    if (!code) return 'plaintext';
    const c = code.trim();
    if (/^(import|export|const|let|var|function|class|=>\s*{|async\s+function|\(\) =>)/.test(c)) return 'javascript';
    if (/^(def |class |import |from |if __name__|print\(|#!.*python)/.test(c)) return 'python';
    if (/^(<(!DOCTYPE|html|head|body|div|span|p|a|script|style)[\s>])/i.test(c)) return 'html';
    if (/(^|\n)\s*(\.|#|@media|:root|body\s*\{|[a-z-]+\s*:\s*[^;]+;)/.test(c) && !/</.test(c)) return 'css';
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\s/i.test(c)) return 'sql';
    if (/^(public|private|class|interface|import java|void main|System\.out)/.test(c)) return 'java';
    if (/#include|std::|cout|cin|int main\s*\(/.test(c)) return 'cpp';
    if (/^<\?php|echo\s+|function\s+\w+\s*\(/.test(c)) return 'php';
    if (/^(fn |use |let mut|impl |pub struct|mod |cargo)/.test(c)) return 'rust';
    if (/^(func |package main|import \(|:= |var |go func)/.test(c)) return 'go';
    if (/^(\s*\$|^\s*[a-z]+\s*=|echo |#!\/bin\/bash|if \[)/.test(c)) return 'bash';
    if (/^\s*\{[\s\S]*\}\s*$/.test(c) && c.includes(':')) return 'json';
    return 'plaintext';
  }

  /* ─── Search ─────────────────────────────────────────────────────────── */

  function fuzzyMatch(haystack, needle) {
    if (!needle) return true;
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase();
    if (h.includes(n)) return true;
    // Simple fuzzy: all chars of needle appear in order
    let hi = 0;
    for (let ni = 0; ni < n.length; ni++) {
      const idx = h.indexOf(n[ni], hi);
      if (idx === -1) return false;
      hi = idx + 1;
    }
    return true;
  }

  function filterSnippets(snippets, { query, language, tags, favoritesOnly, collectionId }) {
    return snippets.filter(s => {
      if (favoritesOnly && !s.favorite) return false;
      if (language && s.language !== language) return false;
      if (collectionId && s.collectionId !== collectionId) return false;
      if (tags && tags.length) {
        if (!tags.every(t => s.tags.includes(t))) return false;
      }
      if (query) {
        const q = query.trim();
        if (!fuzzyMatch(s.title, q) && !fuzzyMatch(s.code.slice(0, 500), q) && !s.tags.some(t => fuzzyMatch(t, q))) {
          return false;
        }
      }
      return true;
    });
  }

  /* ─── Import / Export ─────────────────────────────────────────────────── */

  function mergeImport(existing, incoming) {
    const map = new Map(existing.map(s => [s.id, s]));
    incoming.forEach(raw => {
      const s = normalizeSnippet(raw);
      if (s) {
        if (!map.has(s.id)) map.set(s.id, s);
        else map.set(s.id, { ...s, updatedAt: new Date().toISOString() });
      }
    });
    return Array.from(map.values());
  }

  /* ─── Validation ──────────────────────────────────────────────────────── */

  function validate({ title, code }) {
    if (!title?.trim()) return { valid: false, error: 'Title is required.' };
    if (!code?.trim()) return { valid: false, error: 'Code content is required.' };
    if (title.length > 120) return { valid: false, error: 'Title too long (max 120 chars).' };
    return { valid: true };
  }

  return {
    loadSnippets, saveSnippets,
    loadCollections, saveCollections,
    loadSettings, saveSettings,
    createSnippet, updateSnippet, normalizeSnippet, normalizeTags,
    detectLanguage,
    filterSnippets,
    mergeImport,
    validate,
    generateId
  };
})();

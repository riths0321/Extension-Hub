/**
 * services/sessionService.js
 * Save, restore, delete, and import/export browser sessions.
 */

const SessionService = (() => {

  const STORAGE_KEY  = 'tabmaster_sessions';
  const SETTINGS_KEY = 'sessionSettings';

  const DEFAULT_SETTINGS = {
    autoSnapshotOnRestore: true,
    preservePinned:        true,
    maxSessions:           50,
    confirmRestore:        true,
  };

  // ── Settings ──────────────────────────────────────────────────

  async function getSettings() {
    const d = await chrome.storage.local.get(SETTINGS_KEY);
    return sanitizeSettings(d[SETTINGS_KEY] ?? {});
  }

  async function saveSettings(partial) {
    const current = await getSettings();
    const next    = sanitizeSettings({ ...current, ...partial });
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }

  function sanitizeSettings(s) {
    return {
      autoSnapshotOnRestore: s.autoSnapshotOnRestore !== false,
      preservePinned:        s.preservePinned        !== false,
      maxSessions:           Helpers.clamp(Number(s.maxSessions), 5, 200, 50),
      confirmRestore:        s.confirmRestore        !== false,
    };
  }

  // ── Storage helpers ───────────────────────────────────────────

  async function loadSessions() {
    const d = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(d[STORAGE_KEY]) ? d[STORAGE_KEY] : [];
  }

  async function persistSessions(sessions) {
    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
  }

  // ── Save ──────────────────────────────────────────────────────

  /**
   * Save current window tabs as a named session.
   * @param {{ name?: string, tags?: string[], windowScope?: boolean }} opts
   */
  async function saveSession(opts = {}) {
    const { name, tags = [], windowScope = true } = opts;

    const tabs      = windowScope
      ? await chrome.tabs.query({ currentWindow: true })
      : await chrome.tabs.query({});
    const eligible  = TabService.serializeTabs(tabs);

    if (!eligible.length) {
      return { success: false, error: 'No saveable tabs in this window.' };
    }

    const session = {
      id:        Helpers.uid(),
      name:      (name || `Session ${Helpers.timeLabel()}`).trim(),
      tags:      tags.filter(Boolean),
      timestamp: Date.now(),
      tabCount:  eligible.length,
      tabs:      eligible,
    };

    const [existing, settings] = await Promise.all([loadSessions(), getSettings()]);
    const next = [session, ...existing].slice(0, settings.maxSessions);
    await persistSessions(next);
    return { success: true, session };
  }

  /** Auto-snapshot before restoring (so user doesn't lose current state) */
  async function saveAutoSnapshot() {
    return saveSession({ name: `Auto-snapshot ${Helpers.timeLabel()}`, tags: ['auto'] });
  }

  // ── Restore ───────────────────────────────────────────────────

  /**
   * Restore a saved session by ID.
   * Closes current tabs (respecting preservePinned), then opens session tabs.
   */
  async function restoreSession(sessionId) {
    const [sessions, settings] = await Promise.all([loadSessions(), getSettings()]);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { success: false, error: 'Session not found.' };

    // Auto-snapshot current state before replacing
    if (settings.autoSnapshotOnRestore) {
      await saveAutoSnapshot();
    }

    // Close current tabs (optionally keep pinned)
    const currentTabs = await chrome.tabs.query({ currentWindow: true });
    const toClose = settings.preservePinned
      ? currentTabs.filter(t => !t.pinned)
      : currentTabs;
    if (toClose.length) {
      await chrome.tabs.remove(toClose.map(t => t.id));
    }

    // Open session tabs
    const created = [];
    for (const [idx, tab] of session.tabs.entries()) {
      try {
        const t = await chrome.tabs.create({
          url:    tab.url,
          active: idx === 0,
          pinned: Boolean(tab.pinned),
        });
        created.push(t);
      } catch { /* skip restricted URLs */ }
    }

    // Group restored tabs
    if (created.length > 1) {
      try {
        const groupId = await chrome.tabs.group({ tabIds: created.map(t => t.id) });
        await chrome.tabGroups.update(groupId, {
          title: session.name,
          color: 'blue',
        });
      } catch { /* grouping optional */ }
    }

    return {
      success:      true,
      restoredTabs: created.length,
      sessionName:  session.name,
    };
  }

  // ── Delete ────────────────────────────────────────────────────

  async function deleteSession(sessionId) {
    const sessions = await loadSessions();
    const next     = sessions.filter(s => s.id !== sessionId);
    await persistSessions(next);
    return { success: true, remaining: next.length };
  }

  async function deleteAllSessions() {
    await persistSessions([]);
    return { success: true };
  }

  // ── Query ─────────────────────────────────────────────────────

  /**
   * Get sessions, optionally filtered by a search query.
   * @param {{ query?: string, tag?: string }} opts
   */
  async function getSessions({ query = '', tag = '' } = {}) {
    const sessions = await loadSessions();
    const q = query.toLowerCase().trim();
    const t = tag.toLowerCase().trim();

    return sessions.filter(s => {
      const matchesQuery = !q ||
        s.name.toLowerCase().includes(q) ||
        s.tabs.some(tab => (tab.title ?? '').toLowerCase().includes(q));
      const matchesTag = !t || (s.tags ?? []).some(st => st.toLowerCase() === t);
      return matchesQuery && matchesTag;
    });
  }

  // ── Export / Import ───────────────────────────────────────────

  /** Export all sessions as a JSON string */
  async function exportSessions() {
    const sessions  = await loadSessions();
    const settings  = await getSettings();
    return JSON.stringify({
      version:    1,
      exportedAt: Date.now(),
      sessions,
      settings,
    }, null, 2);
  }

  /**
   * Import sessions from JSON string.
   * @param {string} json
   * @param {{ merge?: boolean }} opts  — merge=true appends, false replaces
   */
  async function importSessions(json, { merge = true } = {}) {
    let parsed;
    try { parsed = JSON.parse(json); } catch { return { success: false, error: 'Invalid JSON.' }; }
    if (!Array.isArray(parsed.sessions)) return { success: false, error: 'No sessions array found.' };

    const incoming  = parsed.sessions.map(s => ({ ...s, id: Helpers.uid() })); // re-ID to avoid collisions
    const settings  = await getSettings();

    let next;
    if (merge) {
      const existing = await loadSessions();
      next = [...incoming, ...existing].slice(0, settings.maxSessions);
    } else {
      next = incoming.slice(0, settings.maxSessions);
    }

    await persistSessions(next);
    return { success: true, imported: incoming.length, total: next.length };
  }

  return {
    getSettings, saveSettings,
    saveSession, saveAutoSnapshot, restoreSession,
    deleteSession, deleteAllSessions,
    getSessions, loadSessions,
    exportSessions, importSessions,
  };
})();

if (typeof globalThis !== 'undefined') globalThis.SessionService = SessionService;

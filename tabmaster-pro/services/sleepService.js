/**
 * services/sleepService.js
 * Manages tab sleep (discard) and wake lifecycle.
 * Service-worker safe: no closures over timers.
 */

const SleepService = (() => {

  const ALARM_NAME     = 'tabmaster_sleep_check';
  const STORAGE_KEY    = 'sleepSettings';
  const ACTIVITY_KEY   = 'tabActivity';       // { [tabId]: timestamp }
  const CHECK_INTERVAL = 1;                   // alarm period in minutes

  const DEFAULT_SETTINGS = {
    enabled:       true,
    sleepMinutes:  15,
    ignorePinned:  true,
    ignoreAudio:   true,
    batteryMode:   false,
  };

  // ── Settings ──────────────────────────────────────────────────

  async function getSettings() {
    const d = await chrome.storage.local.get(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...(d[STORAGE_KEY] ?? {}) };
  }

  async function saveSettings(partial) {
    const current = await getSettings();
    const next    = sanitize({ ...current, ...partial });
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    // Reschedule alarm based on new settings
    if (next.enabled) {
      await scheduleAlarm(next.sleepMinutes);
    } else {
      await chrome.alarms.clear(ALARM_NAME);
    }
    return next;
  }

  function sanitize(s) {
    return {
      enabled:      Boolean(s.enabled ?? true),
      sleepMinutes: Helpers.clamp(Number(s.sleepMinutes), 1, 120, 15),
      ignorePinned: Boolean(s.ignorePinned ?? true),
      ignoreAudio:  Boolean(s.ignoreAudio  ?? true),
      batteryMode:  Boolean(s.batteryMode  ?? false),
    };
  }

  // ── Alarm scheduling ─────────────────────────────────────────

  async function scheduleAlarm(periodMinutes = 1) {
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: CHECK_INTERVAL,
      periodInMinutes: CHECK_INTERVAL,
    });
  }

  async function init() {
    const settings = await getSettings();
    if (settings.enabled) {
      await scheduleAlarm();
    }
  }

  // ── Activity tracking ─────────────────────────────────────────

  async function recordActivity(tabId) {
    const d  = await chrome.storage.local.get(ACTIVITY_KEY);
    const map = d[ACTIVITY_KEY] ?? {};
    map[tabId] = Date.now();
    // Prune entries older than 24h to keep storage lean
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const id of Object.keys(map)) {
      if (map[id] < cutoff) delete map[id];
    }
    await chrome.storage.local.set({ [ACTIVITY_KEY]: map });
  }

  async function clearActivity(tabId) {
    const d  = await chrome.storage.local.get(ACTIVITY_KEY);
    const map = d[ACTIVITY_KEY] ?? {};
    delete map[tabId];
    await chrome.storage.local.set({ [ACTIVITY_KEY]: map });
  }

  async function getActivityMap() {
    const d = await chrome.storage.local.get(ACTIVITY_KEY);
    return d[ACTIVITY_KEY] ?? {};
  }

  // ── Tab eligibility ───────────────────────────────────────────

  async function shouldSkip(tab, settings) {
    if (!tab || !tab.url)                                  return true;
    if (tab.active)                                        return true;
    if (tab.discarded)                                     return true;
    if (settings.ignorePinned && tab.pinned)               return true;
    if (settings.ignoreAudio  && tab.audible)              return true;
    if (Helpers.isInternalUrl(tab.url))                    return true;
    if (tab.autoDiscardable === false)                     return true;
    return false;
  }

  // ── Sleep / Wake ──────────────────────────────────────────────

  /**
   * Sleep (discard) a single tab.
   * @param {number} tabId
   * @param {'auto'|'manual'} mode
   */
  async function sleepTab(tabId, mode = 'auto') {
    try {
      const [tab, settings, activityMap] = await Promise.all([
        chrome.tabs.get(tabId),
        getSettings(),
        getActivityMap(),
      ]);

      if (await shouldSkip(tab, settings)) {
        return { slept: false, reason: 'skipped' };
      }

      // For auto mode: verify inactivity threshold
      if (mode === 'auto') {
        const lastActive  = activityMap[tabId] ?? 0;
        const idleMinutes = (Date.now() - lastActive) / 60_000;
        const threshold   = settings.batteryMode
          ? Math.max(1, Math.floor(settings.sleepMinutes / 2))
          : settings.sleepMinutes;
        if (idleMinutes < threshold) {
          return { slept: false, reason: 'recently_active' };
        }
      }

      await chrome.tabs.discard(tabId);
      await clearActivity(tabId);
      return { slept: true };
    } catch (err) {
      return { slept: false, reason: 'error', error: err.message };
    }
  }

  /** Wake (reload) a single tab */
  async function wakeTab(tabId) {
    try {
      await chrome.tabs.reload(tabId);
      await recordActivity(tabId);
      return { woken: true };
    } catch (err) {
      return { woken: false, error: err.message };
    }
  }

  /** Sleep all eligible tabs now (manual trigger) */
  async function sleepAll() {
    const [tabs, settings] = await Promise.all([chrome.tabs.query({}), getSettings()]);
    let slept = 0, skipped = 0;
    for (const tab of tabs) {
      if (await shouldSkip(tab, settings)) { skipped++; continue; }
      const r = await sleepTab(tab.id, 'manual');
      r.slept ? slept++ : skipped++;
    }
    await updateBadge();
    return { slept, skipped };
  }

  /** Wake all currently sleeping tabs */
  async function wakeAll() {
    const sleeping = await chrome.tabs.query({ discarded: true });
    let woken = 0;
    for (const tab of sleeping) {
      const r = await wakeTab(tab.id);
      if (r.woken) woken++;
    }
    await updateBadge();
    return { woken, requested: sleeping.length };
  }

  /** Called by the alarm — checks all tabs for inactivity */
  async function checkInactiveTabs() {
    const settings = await getSettings();
    if (!settings.enabled) return;
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (await shouldSkip(tab, settings)) continue;
      await sleepTab(tab.id, 'auto');
    }
    await updateBadge();
  }

  // ── Badge ─────────────────────────────────────────────────────

  async function updateBadge() {
    try {
      const tabs        = await chrome.tabs.query({ discarded: true });
      const sleepCount  = tabs.length;
      chrome.action.setBadgeText({ text: sleepCount > 0 ? String(sleepCount) : '' });
      chrome.action.setBadgeBackgroundColor({ color: sleepCount > 0 ? '#2563EB' : '#6B7280' });
    } catch { /* badge update is best-effort */ }
  }

  // ── Stats ─────────────────────────────────────────────────────

  async function getStats() {
    const [tabs, settings] = await Promise.all([chrome.tabs.query({}), getSettings()]);
    const sleeping  = tabs.filter(t => t.discarded).length;
    const active    = tabs.length - sleeping;
    return {
      total:          tabs.length,
      sleeping,
      active,
      memorySavedMB:  Helpers.estimateMemoryMB(sleeping),
      settings,
    };
  }

  return {
    init, scheduleAlarm,
    getSettings, saveSettings,
    recordActivity, clearActivity,
    sleepTab, wakeTab, sleepAll, wakeAll,
    checkInactiveTabs,
    updateBadge, getStats,
  };
})();

if (typeof globalThis !== 'undefined') globalThis.SleepService = SleepService;

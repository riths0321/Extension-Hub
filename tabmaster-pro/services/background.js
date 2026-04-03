'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE = {
  sessions:     'tm_sessions',
  sleepSettings:'tm_sleepSettings',
  appSettings:  'tm_appSettings',
  tabActivity:  'tm_tabActivity',
};

const DEFAULT_SLEEP_SETTINGS = {
  enabled:       true,
  timerMinutes:  15,
  ignorePinned:  true,
  ignoreAudio:   true,
  batteryMode:   true,
};

const DEFAULT_APP_SETTINGS = {
  autoSave:        false,
  preservePinned:  true,
  maxSessions:     50,
  confirmRestore:  true,
  badgeEnabled:    true,
};

// ─── Runtime State ────────────────────────────────────────────────────────────

let sleepSettings  = { ...DEFAULT_SLEEP_SETTINGS };
let appSettings    = { ...DEFAULT_APP_SETTINGS };
let tabActivity    = {};   // tabId -> lastActiveTimestamp (ms)
let isUserIdle     = false;

// ─── Initialization ────────────────────────────────────────────────────────────

async function initialize() {
  const data = await chrome.storage.local.get([
    STORAGE.sleepSettings,
    STORAGE.appSettings,
    STORAGE.sessions,
    STORAGE.tabActivity,
  ]);

  if (data[STORAGE.sleepSettings]) sleepSettings = { ...DEFAULT_SLEEP_SETTINGS, ...data[STORAGE.sleepSettings] };
  if (data[STORAGE.appSettings])   appSettings   = { ...DEFAULT_APP_SETTINGS,   ...data[STORAGE.appSettings] };
  if (data[STORAGE.tabActivity] && typeof data[STORAGE.tabActivity] === 'object') {
    tabActivity = data[STORAGE.tabActivity];
  }
  if (!Array.isArray(data[STORAGE.sessions])) {
    await chrome.storage.local.set({ [STORAGE.sessions]: [] });
  }
  await chrome.storage.local.set({
    [STORAGE.sleepSettings]: sleepSettings,
    [STORAGE.appSettings]: appSettings,
    [STORAGE.tabActivity]: tabActivity,
  });

  setupListeners();
  updateBadge();
  schedulePeriodicSleepCheck();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupListeners() {
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.tabs.onRemoved.addListener(onTabRemoved);
  chrome.windows.onFocusChanged.addListener(onWindowFocus);
  chrome.idle.setDetectionInterval(60);
  chrome.idle.onStateChanged.addListener(state => { isUserIdle = state !== 'active'; });
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.runtime.onMessage.addListener(onMessage);
  chrome.commands.onCommand.addListener(onCommand);
}

async function onTabActivated({ tabId }) {
  tabActivity[tabId] = Date.now();
  await chrome.storage.local.set({ [STORAGE.tabActivity]: tabActivity });
  updateBadge();
}

async function onTabUpdated(tabId, changeInfo) {
  if (changeInfo.status === 'complete') {
    tabActivity[tabId] = Date.now();
    await chrome.storage.local.set({ [STORAGE.tabActivity]: tabActivity });
  }
}

function onTabRemoved(tabId) {
  delete tabActivity[tabId];
  chrome.storage.local.set({ [STORAGE.tabActivity]: tabActivity });
}

async function onWindowFocus(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      tabActivity[tab.id] = Date.now();
      await chrome.storage.local.set({ [STORAGE.tabActivity]: tabActivity });
    }
  } catch {}
}

function onAlarm(alarm) {
  if (alarm.name === 'tm_sleepCheck') checkAndSleepInactiveTabs();
}

// ─── Sleep Check Scheduling ───────────────────────────────────────────────────

function schedulePeriodicSleepCheck() {
  chrome.alarms.clear('tm_sleepCheck');
  chrome.alarms.create('tm_sleepCheck', { periodInMinutes: 1 });
}

// ─── Sleep Logic (from Tab Sleep Timer) ──────────────────────────────────────

function getEffectiveSleepMinutes() {
  const base = sleepSettings.timerMinutes || 15;
  return (sleepSettings.batteryMode && isUserIdle) ? Math.max(5, Math.floor(base / 2)) : base;
}

function shouldIgnoreTab(tab) {
  if (!tab || !tab.url) return true;
  if (Helpers.isSystemUrl(tab.url)) return true;
  if (sleepSettings.ignorePinned && tab.pinned) return true;
  if (sleepSettings.ignoreAudio  && tab.audible) return true;
  if (tab.active) return true;
  return false;
}

async function sleepTab(tabId, mode = 'auto') {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return { slept: false, reason: 'not_found' };
    if (tab.discarded) return { slept: false, reason: 'already_sleeping' };
    if (shouldIgnoreTab(tab)) return { slept: false, reason: 'ignored' };

    if (mode === 'auto') {
      const lastActive = tabActivity[tabId] || 0;
      const idleMs = Date.now() - lastActive;
      if (idleMs < getEffectiveSleepMinutes() * 60_000) return { slept: false, reason: 'recently_active' };
    }

    await chrome.tabs.discard(tabId);
    updateBadge();
    return { slept: true };
  } catch (err) {
    return { slept: false, reason: err.message };
  }
}

async function wakeTab(tabId) {
  try {
    await chrome.tabs.reload(tabId);
    tabActivity[tabId] = Date.now();
    updateBadge();
    return { woken: true };
  } catch (err) {
    return { woken: false, reason: err.message };
  }
}

async function checkAndSleepInactiveTabs() {
  if (!sleepSettings.enabled) return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.discarded && !shouldIgnoreTab(tab)) {
        await sleepTab(tab.id, 'auto');
      }
    }
  } catch {}
}

async function sleepAllNow() {
  const tabs = await chrome.tabs.query({});
  let slept = 0;
  for (const tab of tabs) {
    if (!tab.discarded && !shouldIgnoreTab(tab)) {
      const result = await sleepTab(tab.id, 'manual');
      if (result.slept) slept++;
    }
  }
  return { slept };
}

async function wakeAll() {
  const tabs = await chrome.tabs.query({ discarded: true });
  let woken = 0;
  for (const tab of tabs) {
    const result = await wakeTab(tab.id);
    if (result.woken) woken++;
  }
  return { woken };
}

// ─── Badge ────────────────────────────────────────────────────────────────────

async function updateBadge() {
  if (!appSettings.badgeEnabled) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  try {
    const tabs = await chrome.tabs.query({});
    const sleeping = tabs.filter(t => t.discarded).length;
    if (sleeping > 0) {
      chrome.action.setBadgeText({ text: String(sleeping) });
      chrome.action.setBadgeBackgroundColor({ color: '#2563EB' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch {}
}

// ─── Stats ────────────────────────────────────────────────────────────────────

async function getStats() {
  const tabs = await chrome.tabs.query({});
  const sleeping = tabs.filter(t => t.discarded).length;
  const active   = tabs.length - sleeping;
  const pinned   = tabs.filter(t => t.pinned).length;
  const audible  = tabs.filter(t => t.audible).length;
  const windows  = new Set(tabs.map(t => t.windowId)).size;

  // Duplicate detection
  const seen = new Map();
  let dupes = 0;
  for (const tab of tabs) {
    const key = Helpers.normalizeUrl(tab.url);
    if (key && seen.has(key)) { dupes++; } else { seen.set(key, true); }
  }

  return {
    total: tabs.length,
    sleeping,
    active,
    pinned,
    audible,
    windows,
    duplicates: dupes,
    memorySaved: sleeping * 75,
    sleepSettings,
    appSettings,
  };
}

// ─── Session Logic (from Tab Context Saver) ───────────────────────────────────

function sanitizeAppSettings(s) {
  return {
    autoSave:       Boolean(s.autoSave),
    preservePinned: s.preservePinned !== false,
    maxSessions:    Helpers.clamp(Number(s.maxSessions), 1, 200, 50),
    confirmRestore: s.confirmRestore !== false,
    badgeEnabled:   s.badgeEnabled !== false,
  };
}

function sanitizeSleepSettings(s) {
  return {
    enabled:       s.enabled !== false,
    timerMinutes:  Helpers.clamp(Number(s.timerMinutes), 5, 240, 15),
    ignorePinned:  s.ignorePinned !== false,
    ignoreAudio:   s.ignoreAudio !== false,
    batteryMode:   Boolean(s.batteryMode),
  };
}

async function getSessions() {
  const data = await chrome.storage.local.get(STORAGE.sessions);
  return Array.isArray(data[STORAGE.sessions]) ? data[STORAGE.sessions] : [];
}

async function saveSession(name, mode = 'custom', windowId) {
  const query = windowId ? { windowId } : { currentWindow: true };
  const tabs   = await chrome.tabs.query(query);
  const valid  = tabs.filter(t => t.url && !Helpers.isSystemUrl(t.url));

  if (!valid.length) return { success: false, error: 'No saveable tabs found.' };

  const session = {
    id:        Helpers.uid(),
    name:      (name || `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`).trim(),
    mode,
    timestamp: Date.now(),
    tabCount:  valid.length,
    tabs:      valid.map(t => ({
      url:        t.url,
      title:      t.title || t.url,
      favIconUrl: t.favIconUrl || '',
      pinned:     Boolean(t.pinned),
    })),
  };

  const sessions = await getSessions();
  const next = [session, ...sessions].slice(0, appSettings.maxSessions);
  await chrome.storage.local.set({ [STORAGE.sessions]: next });
  return { success: true, session };
}

async function restoreSession(sessionId) {
  const sessions = await getSessions();
  const session  = sessions.find(s => s.id === Number(sessionId));
  if (!session) return { success: false, error: 'Session not found.' };

  // Auto-snapshot before restore
  if (appSettings.autoSave) {
    const current = await chrome.tabs.query({ currentWindow: true });
    if (current.length) {
      const snap = {
        id:        Helpers.uid(),
        name:      `Auto-snapshot ${new Date().toLocaleTimeString()}`,
        mode:      'custom',
        timestamp: Date.now(),
        tabCount:  current.length,
        tabs:      current.filter(t => t.url).map(t => ({
          url: t.url, title: t.title || t.url,
          favIconUrl: t.favIconUrl || '', pinned: Boolean(t.pinned),
        })),
      };
      const next = [snap, ...sessions].slice(0, appSettings.maxSessions);
      await chrome.storage.local.set({ [STORAGE.sessions]: next });
    }
  }

  // Close current tabs (respecting pinned setting)
  const current = await chrome.tabs.query({ currentWindow: true });
  const toClose = appSettings.preservePinned ? current.filter(t => !t.pinned) : current;
  if (toClose.length) {
    await chrome.tabs.remove(toClose.map(t => t.id)).catch(() => {});
  }

  // Open restored tabs
  const created = [];
  for (const [i, tab] of session.tabs.entries()) {
    try {
      const t = await chrome.tabs.create({ url: tab.url, active: i === 0, pinned: Boolean(tab.pinned) });
      created.push(t);
    } catch {}
  }

  // Group them
  if (created.length > 1) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: created.map(t => t.id) });
      await chrome.tabGroups.update(groupId, { title: session.name, color: Helpers.modeToGroupColor(session.mode) });
    } catch {}
  }

  return { success: true, restoredTabs: created.length, sessionName: session.name };
}

async function deleteSession(sessionId) {
  const sessions = await getSessions();
  const next     = sessions.filter(s => s.id !== Number(sessionId));
  await chrome.storage.local.set({ [STORAGE.sessions]: next });
  return { success: true };
}

// ─── Tab Manager Actions (from Tab Manager Pro) ────────────────────────────────

async function closeDuplicates() {
  const tabs   = await chrome.tabs.query({});
  const seen   = new Map();
  const remove = [];
  for (const tab of tabs) {
    const key = Helpers.normalizeUrl(tab.url);
    if (!key) continue;
    if (seen.has(key)) { remove.push(tab.id); } else { seen.set(key, true); }
  }
  if (remove.length) await chrome.tabs.remove(remove);
  return { closed: remove.length };
}

async function groupByDomain(tabIds) {
  const tabs = tabIds
    ? await Promise.all(tabIds.map(id => chrome.tabs.get(id).catch(() => null))).then(ts => ts.filter(Boolean))
    : await chrome.tabs.query({});

  const domainMap = new Map();
  for (const tab of tabs) {
    const host = Helpers.getHostname(tab.url);
    if (!host) continue;
    if (!domainMap.has(host)) domainMap.set(host, []);
    domainMap.get(host).push(tab.id);
  }

  const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  let colorIdx = 0;
  let groups = 0;
  for (const [domain, ids] of domainMap.entries()) {
    if (ids.length < 2) continue;
    try {
      const gId = await chrome.tabs.group({ tabIds: ids });
      await chrome.tabGroups.update(gId, { title: domain, color: colors[colorIdx % colors.length] });
      colorIdx++; groups++;
    } catch {}
  }
  return { groups };
}

// ─── Message Router ───────────────────────────────────────────────────────────

function onMessage(message, _sender, sendResponse) {
  (async () => {
    try {
      let result;
      switch (message.action) {

        // ── Stats & Info ──
        case 'getStats':
          result = await getStats(); break;

        case 'getAllTabs':
          result = { tabs: await chrome.tabs.query({}) }; break;

        // ── Sleep ──
        case 'sleepAll':
          result = await sleepAllNow(); break;

        case 'wakeAll':
          result = await wakeAll(); break;

        case 'sleepTab':
          result = await sleepTab(message.tabId, 'manual'); break;

        case 'wakeTab':
          result = await wakeTab(message.tabId); break;

        case 'updateSleepSettings':
          sleepSettings = sanitizeSleepSettings({ ...sleepSettings, ...message.settings });
          await chrome.storage.local.set({ [STORAGE.sleepSettings]: sleepSettings });
          result = { success: true }; break;

        // ── Sessions ──
        case 'getSessions':
          result = { sessions: await getSessions() }; break;

        case 'saveSession':
          result = await saveSession(message.name, message.mode, message.windowId); break;

        case 'restoreSession':
          result = await restoreSession(message.sessionId); break;

        case 'deleteSession':
          result = await deleteSession(message.sessionId); break;

        case 'deleteAllSessions':
          await chrome.storage.local.set({ [STORAGE.sessions]: [] });
          result = { success: true }; break;

        // ── App Settings ──
        case 'updateAppSettings':
          appSettings = sanitizeAppSettings({ ...appSettings, ...message.settings });
          await chrome.storage.local.set({ [STORAGE.appSettings]: appSettings });
          await updateBadge();
          result = { success: true }; break;

        // ── Tab Actions ──
        case 'closeDuplicates':
          result = await closeDuplicates(); break;

        case 'groupByDomain':
          result = await groupByDomain(message.tabIds); break;

        case 'switchTab':
          await chrome.tabs.update(message.tabId, { active: true });
          await chrome.windows.update(message.windowId, { focused: true });
          result = { success: true }; break;

        case 'closeTab':
          await chrome.tabs.remove(message.tabId);
          result = { success: true }; break;

        case 'closeTabs':
          await chrome.tabs.remove(message.tabIds || []);
          result = { success: true, closed: (message.tabIds || []).length }; break;

        case 'pinTab':
          await chrome.tabs.update(message.tabId, { pinned: message.pinned });
          result = { success: true }; break;

        case 'muteTab':
          await chrome.tabs.update(message.tabId, { muted: message.muted });
          result = { success: true }; break;

        case 'groupTabs':
          if (message.tabIds && message.tabIds.length >= 2) {
            const gId = await chrome.tabs.group({ tabIds: message.tabIds });
            await chrome.tabGroups.update(gId, { title: message.title || 'Group', color: 'blue' });
            result = { success: true, groupId: gId };
          } else {
            result = { success: false, error: 'Select 2+ tabs' };
          }
          break;

        default:
          result = { error: `Unknown action: ${message.action}` };
      }
      sendResponse(result);
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();
  return true; // async
}

// ─── Command Shortcuts ────────────────────────────────────────────────────────

async function onCommand(command) {
  if (command === 'save_session') {
    await saveSession(`Quick save ${new Date().toLocaleTimeString()}`, 'custom');
  }
  if (command === 'sleep_all') {
    await sleepAllNow();
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Helpers must be available in service worker scope — inline minimal version
const Helpers = {
  normalizeUrl(url) {
    try { const u = new URL(url); return u.hostname + u.pathname.replace(/\/$/, ''); } catch { return url || ''; }
  },
  getHostname(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  },
  clamp(v, mn, mx, fb) {
    const n = Number(v); return Number.isFinite(n) ? Math.min(mx, Math.max(mn, n)) : (fb !== undefined ? fb : mn);
  },
  uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); },
  isSystemUrl(url) {
    if (!url) return true;
    return ['chrome://', 'chrome-extension://', 'edge://', 'about:'].some(p => url.startsWith(p)) ||
           url === 'about:blank' || url === 'about:newtab';
  },
  modeToGroupColor(mode) {
    return ({ work:'blue', study:'purple', personal:'green', research:'orange', custom:'grey' })[mode] || 'grey';
  },
};

initialize();

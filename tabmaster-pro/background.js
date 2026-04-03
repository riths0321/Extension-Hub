/**
 * background.js — TabMaster Pro Service Worker
 * Single entry point that merges:
 *   • Tab Manager Pro  → tab lifecycle events
 *   • Tab Sleep Timer  → alarm-based sleep checks, activity tracking
 *   • Tab Context Saver → session commands
 *
 * Load order: helpers → services → this file
 */

importScripts(
  'utils/helpers.js',
  'services/tabService.js',
  'services/sleepService.js',
  'services/sessionService.js'
);

// ── Bootstrap ──────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await ensureStorageDefaults();
  await SleepService.init();
  if (reason === 'install') {
    console.info('[TabMaster Pro] Installed successfully.');
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await SleepService.init();
});

// ── Tab lifecycle → activity tracking ─────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await SleepService.recordActivity(tabId);
  await SleepService.updateBadge();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await SleepService.recordActivity(tabId);
  }
  if (changeInfo.discarded !== undefined) {
    await SleepService.updateBadge();
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await SleepService.clearActivity(tabId);
  await SleepService.updateBadge();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) await SleepService.recordActivity(tab.id);
  } catch { /* window may have closed */ }
});

// ── Alarm → sleep check ───────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'tabmaster_sleep_check') {
    await SleepService.checkInactiveTabs();
  }
});

// ── Keyboard commands ──────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save_session') {
    const result = await SessionService.saveSession({
      name: `Quick save ${Helpers.timeLabel()}`,
    });
    if (result.success) {
      chrome.action.setBadgeText({ text: '✓' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
    }
  }
});

// ── Message router ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true; // keep channel open for async
});

async function handleMessage(msg) {
  switch (msg.action) {

    // ── Tab actions ──────────────────────────────────────────
    case 'getTabs': {
      const tabs = await TabService.getAllTabs();
      return { success: true, tabs };
    }
    case 'switchTab': {
      await TabService.switchToTab(msg.tabId, msg.windowId);
      return { success: true };
    }
    case 'closeTabs': {
      const result = await TabService.closeTabs(msg.tabIds);
      return { success: true, ...result };
    }
    case 'closeDuplicates': {
      const tabs   = await TabService.getAllTabs();
      const result = await TabService.closeDuplicates(tabs);
      return { success: true, ...result };
    }
    case 'groupByDomain': {
      const tabs   = await TabService.getAllTabs();
      const result = await TabService.groupByDomain(tabs);
      return { success: true, ...result };
    }
    case 'groupTabs': {
      const groupId = await TabService.groupTabs(msg.tabIds, msg.title, msg.color);
      return { success: true, groupId };
    }
    case 'togglePin': {
      const result = await TabService.togglePin(msg.tabIds, msg.pinned);
      return { success: true, ...result };
    }
    case 'toggleMute': {
      const result = await TabService.toggleMute(msg.tabIds, msg.muted);
      return { success: true, ...result };
    }
    case 'muteAllAudio': {
      const tabs   = await TabService.getAllTabs();
      const result = await TabService.muteAllAudio(tabs);
      return { success: true, ...result };
    }
    case 'getTabStats': {
      const tabs  = await TabService.getAllTabs();
      const stats = TabService.computeStats(tabs);
      return { success: true, stats };
    }

    // ── Sleep actions ────────────────────────────────────────
    case 'getSleepStats':
      return { success: true, ...(await SleepService.getStats()) };
    case 'getSleepSettings':
      return { success: true, settings: await SleepService.getSettings() };
    case 'saveSleepSettings': {
      const settings = await SleepService.saveSettings(msg.settings);
      return { success: true, settings };
    }
    case 'sleepTab': {
      const result = await SleepService.sleepTab(msg.tabId, 'manual');
      await SleepService.updateBadge();
      return { success: true, ...result };
    }
    case 'sleepAll': {
      const result = await SleepService.sleepAll();
      return { success: true, ...result };
    }
    case 'wakeTab': {
      const result = await SleepService.wakeTab(msg.tabId);
      await SleepService.updateBadge();
      return { success: true, ...result };
    }
    case 'wakeAll': {
      const result = await SleepService.wakeAll();
      return { success: true, ...result };
    }

    // ── Session actions ──────────────────────────────────────
    case 'getSessions': {
      const sessions = await SessionService.getSessions({
        query: msg.query,
        tag:   msg.tag,
      });
      return { success: true, sessions };
    }
    case 'saveSession': {
      const result = await SessionService.saveSession(msg.opts ?? {});
      return result;
    }
    case 'restoreSession': {
      const result = await SessionService.restoreSession(msg.sessionId);
      return result;
    }
    case 'deleteSession': {
      const result = await SessionService.deleteSession(msg.sessionId);
      return result;
    }
    case 'deleteAllSessions': {
      return SessionService.deleteAllSessions();
    }
    case 'exportSessions': {
      const json = await SessionService.exportSessions();
      return { success: true, json };
    }
    case 'importSessions': {
      return SessionService.importSessions(msg.json, { merge: msg.merge ?? true });
    }
    case 'getSessionSettings':
      return { success: true, settings: await SessionService.getSettings() };
    case 'saveSessionSettings': {
      const settings = await SessionService.saveSettings(msg.settings);
      return { success: true, settings };
    }

    default:
      return { success: false, error: `Unknown action: ${msg.action}` };
  }
}

// ── Storage bootstrapping ──────────────────────────────────────

async function ensureStorageDefaults() {
  const keys = [
    'tabmaster_sessions',
    'sessionSettings',
    'sleepSettings',
    'tabActivity',
  ];
  const d = await chrome.storage.local.get(keys);
  const defaults = {};
  if (!Array.isArray(d.tabmaster_sessions)) defaults.tabmaster_sessions = [];
  if (!d.sessionSettings) defaults.sessionSettings = {};
  if (!d.sleepSettings)   defaults.sleepSettings   = {};
  if (!d.tabActivity)     defaults.tabActivity     = {};
  if (Object.keys(defaults).length) {
    await chrome.storage.local.set(defaults);
  }
}

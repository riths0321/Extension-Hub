const STORAGE_KEYS = {
  sessions: "sessions",
  settings: "settings"
};

const DEFAULT_SETTINGS = {
  autoSave: true,
  preservePinned: true,
  maxSessions: 50,
  confirmRestore: true
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleRequest(request)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save_session") {
    await saveSession({
      mode: "custom",
      name: `Quick save ${formatTimeLabel()}`
    });
  }

  if (command === "restore_last") {
    const data = await chrome.storage.local.get([STORAGE_KEYS.sessions]);
    const sessions = Array.isArray(data[STORAGE_KEYS.sessions]) ? data[STORAGE_KEYS.sessions] : [];
    if (sessions.length) {
      await restoreSessionById(sessions[0].id);
    }
  }
});

async function handleRequest(request) {
  switch (request.action) {
    case "saveSession":
      return saveSession(request.data || {});
    case "restoreSession":
      return restoreSessionById(request.sessionId);
    case "deleteSession":
      return deleteSessionById(request.sessionId);
    case "getSettings":
      return {
        success: true,
        settings: await getSettings()
      };
    case "updateSettings":
      await updateSettings(request.data || {});
      return { success: true };
    default:
      return { success: false, error: "Unknown action" };
  }
}

async function ensureDefaults() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions, STORAGE_KEYS.settings]);
  if (!Array.isArray(data[STORAGE_KEYS.sessions])) {
    await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: [] });
  }
  if (!data[STORAGE_KEYS.settings]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
}

async function getSettings() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  return sanitizeSettings(data[STORAGE_KEYS.settings] || {});
}

function sanitizeSettings(settings) {
  return {
    autoSave: settings.autoSave !== false,
    preservePinned: settings.preservePinned !== false,
    maxSessions: clampNumber(Number(settings.maxSessions), 10, 200, 50),
    confirmRestore: settings.confirmRestore !== false
  };
}

async function saveSession(sessionData) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const eligibleTabs = tabs.filter((tab) => !!tab.url);

  if (!eligibleTabs.length) {
    return { success: false, error: "No tabs available to save." };
  }

  const settings = await getSettings();
  const session = {
    id: Date.now(),
    mode: sessionData.mode || "custom",
    name: (sessionData.name || `Session ${formatTimeLabel()}`).trim(),
    timestamp: Date.now(),
    tabCount: eligibleTabs.length,
    tabs: eligibleTabs.map((tab) => ({
      favIconUrl: tab.favIconUrl || "",
      pinned: Boolean(tab.pinned),
      title: tab.title || tab.url,
      url: tab.url
    }))
  };

  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions]);
  const sessions = Array.isArray(data[STORAGE_KEYS.sessions]) ? data[STORAGE_KEYS.sessions] : [];
  const nextSessions = [session, ...sessions].slice(0, settings.maxSessions);

  await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: nextSessions });
  return { success: true, session };
}

async function restoreSessionById(sessionId) {
  const numericId = Number(sessionId);
  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions]);
  const settings = await getSettings();
  const sessions = Array.isArray(data[STORAGE_KEYS.sessions]) ? data[STORAGE_KEYS.sessions] : [];
  const session = sessions.find((item) => item.id === numericId);

  if (!session) {
    return { success: false, error: "Session not found." };
  }

  const currentTabs = await chrome.tabs.query({ currentWindow: true });
  if (settings.autoSave) {
    await saveAutoSnapshot(currentTabs, settings.maxSessions, sessions);
  }

  const tabsToClose = settings.preservePinned
    ? currentTabs.filter((tab) => !tab.pinned)
    : currentTabs;

  if (tabsToClose.length) {
    await chrome.tabs.remove(tabsToClose.map((tab) => tab.id));
  }

  const createdTabs = [];
  for (const [index, tab] of session.tabs.entries()) {
    try {
      const createdTab = await chrome.tabs.create({
        active: index === 0,
        pinned: Boolean(tab.pinned),
        url: tab.url
      });
      createdTabs.push(createdTab);
    } catch (_error) {
      // Skip restricted or invalid URLs.
    }
  }

  if (createdTabs.length > 1) {
    try {
      const groupId = await chrome.tabs.group({
        tabIds: createdTabs.map((tab) => tab.id)
      });
      await chrome.tabGroups.update(groupId, {
        title: session.name,
        color: modeToColor(session.mode)
      });
    } catch (_error) {
      // Grouping is optional.
    }
  }

  return {
    success: true,
    restoredTabs: createdTabs.length,
    sessionName: session.name
  };
}

async function saveAutoSnapshot(currentTabs, maxSessions, existingSessions) {
  const tabs = currentTabs.filter((tab) => !!tab.url);
  if (!tabs.length) {
    return;
  }

  const autoSession = {
    id: Date.now() + 1,
    mode: "custom",
    name: `Auto snapshot ${formatTimeLabel()}`,
    timestamp: Date.now(),
    tabCount: tabs.length,
    tabs: tabs.map((tab) => ({
      favIconUrl: tab.favIconUrl || "",
      pinned: Boolean(tab.pinned),
      title: tab.title || tab.url,
      url: tab.url
    }))
  };

  const nextSessions = [autoSession, ...existingSessions].slice(0, maxSessions);
  await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: nextSessions });
}

async function deleteSessionById(sessionId) {
  const numericId = Number(sessionId);
  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions]);
  const sessions = Array.isArray(data[STORAGE_KEYS.sessions]) ? data[STORAGE_KEYS.sessions] : [];
  const nextSessions = sessions.filter((session) => session.id !== numericId);
  await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: nextSessions });
  return { success: true, remaining: nextSessions.length };
}

async function updateSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  const data = await chrome.storage.local.get([STORAGE_KEYS.sessions]);
  const sessions = Array.isArray(data[STORAGE_KEYS.sessions]) ? data[STORAGE_KEYS.sessions] : [];
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: sanitized,
    [STORAGE_KEYS.sessions]: sessions.slice(0, sanitized.maxSessions)
  });
}

function modeToColor(mode) {
  const map = {
    work: "blue",
    study: "purple",
    entertainment: "green",
    custom: "yellow"
  };
  return map[mode] || "grey";
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function formatTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

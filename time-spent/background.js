const STORAGE_KEYS = {
  alertsSent: "alertsSent",
  sessionState: "sessionState",
  siteLimits: "siteLimits",
  timeData: "timeData"
};

const PULSE_ALARM = "time-spent-pulse";
const IDLE_THRESHOLD_SECONDS = 60;

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function normalizeDomain(url) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return "";
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function trimOldAlertEntries(alertsSent) {
  const today = todayKey();
  return Object.fromEntries(
    Object.entries(alertsSent || {}).filter(([date]) => date === today)
  );
}

async function storeSessionTime() {
  const now = Date.now();
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.alertsSent,
    STORAGE_KEYS.sessionState,
    STORAGE_KEYS.siteLimits,
    STORAGE_KEYS.timeData
  ]);

  const session = data[STORAGE_KEYS.sessionState];
  const timeData = data[STORAGE_KEYS.timeData] || {};
  const siteLimits = data[STORAGE_KEYS.siteLimits] || {};
  const alertsSent = trimOldAlertEntries(data[STORAGE_KEYS.alertsSent] || {});

  if (!session?.domain || !session?.startTime) {
    return {
      alertsSent,
      timeData,
      tracked: false
    };
  }

  const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
  if (elapsedSeconds <= 0 || elapsedSeconds > 60 * 60 * 12) {
    return {
      alertsSent,
      timeData,
      tracked: false
    };
  }

  const date = todayKey();
  if (!timeData[date]) {
    timeData[date] = {};
  }
  if (!timeData[date][session.domain]) {
    timeData[date][session.domain] = 0;
  }

  timeData[date][session.domain] += elapsedSeconds;

  const siteLimitMinutes = Number(siteLimits[session.domain] || 0);
  const siteSpentSeconds = timeData[date][session.domain];
  const shouldAlert =
    siteLimitMinutes > 0 && siteSpentSeconds >= siteLimitMinutes * 60;

  if (shouldAlert) {
    if (!alertsSent[date]) {
      alertsSent[date] = {};
    }

    if (!alertsSent[date][session.domain]) {
      alertsSent[date][session.domain] = true;
      await chrome.notifications.create(`limit-${session.domain}-${date}`, {
        type: "basic",
        iconUrl: "icons/icons128.png",
        title: "Time limit reached",
        message: `You have spent ${formatDuration(siteSpentSeconds)} on ${session.domain}.`
      });
    }
  }

  return {
    alertsSent,
    timeData,
    tracked: true
  };
}

async function setSessionForTab(tabId) {
  const { alertsSent, timeData } = await storeSessionTime();
  let nextSession = null;
  const idleState = await chrome.idle.queryState(IDLE_THRESHOLD_SECONDS);

  if (tabId && idleState === "active") {
    try {
      const tab = await chrome.tabs.get(tabId);
      const domain = normalizeDomain(tab.url);
      if (domain) {
        nextSession = {
          domain,
          startTime: Date.now(),
          tabId
        };
      }
    } catch (_error) {
      nextSession = null;
    }
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.alertsSent]: alertsSent,
    [STORAGE_KEYS.sessionState]: nextSession,
    [STORAGE_KEYS.timeData]: timeData
  });
}

async function getActiveTrackableTab(windowId) {
  const query = windowId
    ? { active: true, windowId }
    : { active: true, currentWindow: true };
  const tabs = await chrome.tabs.query(query);
  const tab = tabs[0];
  if (!tab?.id || !normalizeDomain(tab.url)) {
    return null;
  }
  return tab;
}

async function syncTrackingFromEnvironment() {
  const idleState = await chrome.idle.queryState(IDLE_THRESHOLD_SECONDS);
  if (idleState !== "active") {
    await setSessionForTab(null);
    return;
  }

  const currentWindow = await chrome.windows.getLastFocused();
  if (!currentWindow || currentWindow.id === chrome.windows.WINDOW_ID_NONE) {
    await setSessionForTab(null);
    return;
  }

  const activeTab = await getActiveTrackableTab(currentWindow.id);
  await setSessionForTab(activeTab?.id || null);
}

chrome.tabs.onActivated.addListener((info) => {
  setSessionForTab(info.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.status === "complete")) {
    setSessionForTab(tabId);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    setSessionForTab(null);
    return;
  }

  getActiveTrackableTab(windowId).then((tab) => setSessionForTab(tab?.id || null));
});

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    syncTrackingFromEnvironment();
    return;
  }
  setSessionForTab(null);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(PULSE_ALARM, { periodInMinutes: 1 });
  syncTrackingFromEnvironment();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(PULSE_ALARM, { periodInMinutes: 1 });
  syncTrackingFromEnvironment();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PULSE_ALARM) {
    syncTrackingFromEnvironment();
  }
});

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

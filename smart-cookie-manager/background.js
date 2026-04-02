
// ─── CONSTANTS & DEFAULTS ───────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  // Whitelist
  whitelist: ['google.com', 'github.com', 'youtube.com'],

  // Cleaning
  autoCleanOnStartup: false,
  autoCleanThreshold: 0, // 0 = disabled; >0 = clean when count exceeds this
  scheduledClean: null, // null | 'daily' | 'weekly'

  // Monitoring
  monitoringEnabled: true,
  alertThresholds: [86400, 3600, 900, 300], // seconds: 24h, 1h, 15m, 5m
  checkInterval: 60000, // 1 minute

  // Automation
  autoProtectVisited: false,
  notifications: true,

  // Theme
  darkMode: false
};

const DEFAULT_STATS = {
  cleaned: 0,
  lastCleanedAt: null,
  sessionsProtected: 0
};

// ─── STATE ───────────────────────────────────────────────────────────────────

let alertCache = new Map(); // Tracks sent expiry alerts to avoid duplicates
let settingsCache = null;
let statsCache = null;
let initPromise = null;
let thresholdCheckTimer = null;
let pendingSettingsSyncTimer = null;
let pendingSettingsSyncPromise = null;
let resolvePendingSettingsSync = null;

// ─── INITIALIZATION ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SCM] Installed / Updated:', details.reason);

  const { settings } = await initializeStorageState();
  await setupAlarms(settings);

  if (details.reason === 'install') {
    showNotification('Smart Cookie Manager Ready!',
      'Your cookies are now being monitored. Add sites to your whitelist to keep logins safe.');
  }

  // Auto-clean on startup if enabled
  if (settings?.autoCleanOnStartup) {
    await runCleaningCycle(settings);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await setupAlarms(settings);
});

// ─── ALARM SETUP ─────────────────────────────────────────────────────────────

async function setupAlarms(settings) {
  // Keep alarm configuration in sync with current settings.
  await chrome.alarms.clearAll();

  if (!settings) {
    settings = await getSettings();
  }
  if (!settings) return;

  // Scheduled cleaning
  if (settings.scheduledClean === 'daily') {
    chrome.alarms.create('scheduled-clean', { periodInMinutes: 1440 });
  } else if (settings.scheduledClean === 'weekly') {
    chrome.alarms.create('scheduled-clean', { periodInMinutes: 10080 });
  }

  // Cookie expiry monitoring alarm (every minute)
  if (settings.monitoringEnabled) {
    chrome.alarms.create('monitor-expiry', { periodInMinutes: 1 });
  }

  // Auto-clean threshold check (every 5 minutes)
  if (settings.autoCleanThreshold > 0) {
    chrome.alarms.create('threshold-check', { periodInMinutes: 5 });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const settings = await getSettings();
  if (!settings) return;

  if (alarm.name === 'scheduled-clean') {
    await runCleaningCycle(settings);
  } else if (alarm.name === 'monitor-expiry') {
    await checkCookieExpiry(settings);
  } else if (alarm.name === 'threshold-check') {
    await checkThreshold(settings);
  }
});

// ─── MONITORING ──────────────────────────────────────────────────────────────

async function checkCookieExpiry(settings) {
  try {
    if (!settings) {
      settings = await getSettings();
    }
    if (!settings.monitoringEnabled) return;

    const allCookies = await getAllCookiesSafe('monitoring');
    if (!allCookies) return;
    const now = Date.now();

    for (const cookie of allCookies) {
      if (!cookie.expirationDate) continue;

      const expiresAt = cookie.expirationDate * 1000;
      const timeLeft = expiresAt - now;
      if (timeLeft <= 0) continue;

      const timeLeftSec = Math.floor(timeLeft / 1000);

      for (const threshold of (settings.alertThresholds || DEFAULT_SETTINGS.alertThresholds)) {
        const alertKey = `${cookie.domain}__${cookie.name}__${threshold}`;
        const inWindow = Math.abs(timeLeftSec - threshold) < 30; // ±30s tolerance

        if (inWindow && !alertCache.has(alertKey)) {
          alertCache.set(alertKey, true);
          setTimeout(() => alertCache.delete(alertKey), 120_000);

          if (settings.notifications) {
            const label = formatThresholdLabel(threshold);
            showNotification(
              `🍪 Cookie Expiring in ${label}`,
              `"${cookie.name}" from ${cookie.domain.replace(/^\./, '')} expires soon.`
            );
          }
        }
      }
    }
  } catch (err) {
    logCookieAccessError('Monitor', err);
  }
}

async function checkThreshold(settings) {
  if (!settings?.autoCleanThreshold) return;
  const cookies = await getAllCookiesSafe('threshold check');
  if (!cookies) return;
  if (cookies.length > settings.autoCleanThreshold) {
    await runCleaningCycle(settings);
  }
}

// ─── CLEANING ────────────────────────────────────────────────────────────────

async function runCleaningCycle(settings) {
  if (!settings) {
    settings = await getSettings();
  }

  const whitelist = settings.whitelist || [];
  const cookies = await getAllCookiesSafe('cleaning');
  if (!cookies) return 0;
  let deletedCount = 0;

  for (const cookie of cookies) {
    const domain = cleanDomain(cookie.domain);
    const isProtected = whitelist.some(w =>
      domain.includes(w) || w.includes(domain)
    );

    if (!isProtected) {
      try {
        const protocol = cookie.secure ? 'https' : 'http';
        await chrome.cookies.remove({
          url: `${protocol}://${domain}${cookie.path || '/'}`,
          name: cookie.name
        });
        deletedCount++;
      } catch (e) {
        console.warn('[SCM] Could not delete cookie:', cookie.name);
      }
    }
  }

  // Update stats
  const stats = await getStats();
  stats.cleaned += deletedCount;
  stats.lastCleanedAt = Date.now();
  await saveStats(stats);

  if (deletedCount > 0 && settings.notifications) {
    showNotification(
      '🧹 Cookies Cleaned!',
      `Removed ${deletedCount} non-essential cookies. Your protected sites are safe.`
    );
  }

  return deletedCount;
}

// ─── AUTO-PROTECT ────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.startsWith('http')) return;

  const settings = await getSettings();
  if (!settings?.autoProtectVisited) return;

  const domain = extractDomain(tab.url);
  const whitelist = [...(settings.whitelist || [])];

  if (!whitelist.includes(domain)) {
    await saveSettingsDeferred({ ...settings, whitelist: [...whitelist, domain] });
    console.log('[SCM] Auto-protected:', domain);
  }
});

// ─── COOKIE CHANGE LISTENER ──────────────────────────────────────────────────

chrome.cookies.onChanged.addListener(async ({ removed, cookie }) => {
  if (removed) return;
  scheduleThresholdCheck();
});

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handle = async () => {
    switch (request.action) {
      case 'getCookies':
        return await getAllCookiesEnriched();

      case 'cleanCookies': {
        const settings = await getSettings();
        const count = await runCleaningCycle(settings);
        return { success: true, deleted: count };
      }

      case 'updateSettings': {
        const nextSettings = await saveSettings(request.settings);
        await setupAlarms(nextSettings);
        return { success: true };
      }

      case 'addToWhitelist': {
        const settings = await getSettings();
        const wl = [...(settings?.whitelist || [])];
        const domain = cleanDomain(request.domain || '');
        if (domain && !wl.includes(domain)) {
          await saveSettings({ ...settings, whitelist: [...wl, domain] });
        }
        return { success: true };
      }

      case 'removeFromWhitelist': {
        const settings = await getSettings();
        const domain = cleanDomain(request.domain || '');
        await saveSettings({
          ...settings,
          whitelist: (settings.whitelist || []).filter(d => d !== domain)
        });
        return { success: true };
      }

      case 'exportWhitelist': {
        const settings = await getSettings();
        return { whitelist: settings?.whitelist || [] };
      }

      case 'importWhitelist': {
        const settings = await getSettings();
        const merged = [...new Set([
          ...(settings?.whitelist || []),
          ...(request.domains || []).map(cleanDomain).filter(Boolean)
        ])];
        await saveSettings({ ...settings, whitelist: merged });
        return { success: true, count: merged.length };
      }

      case 'getStats': {
        return await getStats();
      }

      default:
        return { error: 'Unknown action' };
    }
  };

  handle().then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true; // async response
});

// ─── COOKIE ENRICHMENT ───────────────────────────────────────────────────────

async function getAllCookiesEnriched() {
  const [allCookies, settings] = await Promise.all([
    getAllCookiesSafe('popup refresh'),
    getSettings()
  ]);
  if (!allCookies) return [];

  const whitelist = settings?.whitelist || [];
  const now = Date.now();

  return allCookies.map(cookie => {
    const domain = cleanDomain(cookie.domain);
    const isProtected = whitelist.some(w => domain.includes(w) || w.includes(domain));
    let timeUntilExpiry = null;
    let expiryStatus = 'session';

    if (cookie.expirationDate) {
      const expiresAt = cookie.expirationDate * 1000;
      timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry <= 0) expiryStatus = 'expired';
      else if (timeUntilExpiry < 5 * 60 * 1000) expiryStatus = 'critical';
      else if (timeUntilExpiry < 60 * 60 * 1000) expiryStatus = 'warning';
      else if (timeUntilExpiry < 24 * 60 * 60 * 1000) expiryStatus = 'soon';
      else expiryStatus = 'safe';
    }

    return {
      name: cookie.name,
      domain: cookie.domain,
      cleanDomain: domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate || null,
      timeUntilExpiry,
      expiryStatus,
      isProtected
    };
  });
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

function showNotification(title, message) {
  chrome.notifications.create(`scm-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon16.png',
    title,
    message,
    priority: 2
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

function cleanDomain(domain) {
  return domain.replace(/^\./, '').replace(/^www\./, '');
}

function formatThresholdLabel(seconds) {
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)} day(s)`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hour(s)`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} minute(s)`;
  return `${seconds} seconds`;
}

async function initializeStorageState() {
  if (settingsCache && statsCache) {
    return { settings: settingsCache, stats: statsCache };
  }

  if (!initPromise) {
    initPromise = (async () => {
      const [syncStored, localStored] = await Promise.all([
        chrome.storage.sync.get(['settings']),
        chrome.storage.local.get(['stats'])
      ]);
      const mergedSettings = mergeSettings(syncStored.settings);
      const mergedStats = { ...DEFAULT_STATS, ...(localStored.stats || {}) };

      settingsCache = mergedSettings;
      statsCache = mergedStats;

      const writes = {};
      if (shouldWriteSettingsDefaults(syncStored.settings)) {
        writes.settings = mergedSettings;
      }
      await Promise.all([
        Object.keys(writes).length > 0 ? chrome.storage.sync.set(writes) : Promise.resolve(),
        !localStored.stats ? chrome.storage.local.set({ stats: mergedStats }) : Promise.resolve()
      ]);

      return { settings: settingsCache, stats: statsCache };
    })().finally(() => {
      initPromise = null;
    });
  }

  return await initPromise;
}

async function getSettings() {
  if (settingsCache) return settingsCache;
  const { settings } = await initializeStorageState();
  return settings;
}

async function saveSettings(nextSettings) {
  const mergedSettings = mergeSettings(nextSettings);
  if (settingsCache && areSettingsEqual(settingsCache, mergedSettings)) {
    return settingsCache;
  }
  settingsCache = mergedSettings;
  await chrome.storage.sync.set({ settings: mergedSettings });
  return settingsCache;
}

function saveSettingsDeferred(nextSettings, delayMs = 1500) {
  const mergedSettings = mergeSettings(nextSettings);
  if (settingsCache && areSettingsEqual(settingsCache, mergedSettings)) {
    return Promise.resolve(settingsCache);
  }

  settingsCache = mergedSettings;

  if (!pendingSettingsSyncPromise) {
    pendingSettingsSyncPromise = new Promise(resolve => {
      resolvePendingSettingsSync = resolve;
    });
  }

  if (pendingSettingsSyncTimer) {
    clearTimeout(pendingSettingsSyncTimer);
  }

  pendingSettingsSyncTimer = setTimeout(async () => {
    try {
      await chrome.storage.sync.set({ settings: settingsCache });
    } finally {
      pendingSettingsSyncTimer = null;
      const resolve = resolvePendingSettingsSync;
      resolvePendingSettingsSync = null;
      const promise = pendingSettingsSyncPromise;
      pendingSettingsSyncPromise = null;
      if (resolve) resolve(settingsCache);
      return promise;
    }
  }, delayMs);

  return pendingSettingsSyncPromise;
}

async function getStats() {
  if (statsCache) return statsCache;
  const { stats } = await initializeStorageState();
  return stats;
}

async function saveStats(nextStats) {
  const mergedStats = { ...DEFAULT_STATS, ...(nextStats || {}) };
  statsCache = mergedStats;
  await chrome.storage.local.set({ stats: mergedStats });
  return statsCache;
}

async function getAllCookiesSafe(context) {
  try {
    return await chrome.cookies.getAll({});
  } catch (err) {
    logCookieAccessError(context, err);
    return null;
  }
}

function logCookieAccessError(context, err) {
  const message = err?.message || String(err);
  if (message.includes('No SW')) {
    console.warn(`[SCM] ${context} skipped while Chrome service workers were unavailable: ${message}`);
    return;
  }
  console.error(`[SCM] ${context} error:`, err);
}

function mergeSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    whitelist: [...new Set((settings?.whitelist || DEFAULT_SETTINGS.whitelist).map(cleanDomain))]
  };
}

function shouldWriteSettingsDefaults(storedSettings) {
  if (!storedSettings) return true;
  return Object.keys(DEFAULT_SETTINGS).some(key => !(key in storedSettings));
}

function areSettingsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function scheduleThresholdCheck() {
  if (thresholdCheckTimer) {
    clearTimeout(thresholdCheckTimer);
  }

  thresholdCheckTimer = setTimeout(async () => {
    thresholdCheckTimer = null;
    const settings = await getSettings();
    if (settings?.autoCleanThreshold > 0) {
      await checkThreshold(settings);
    }
  }, 1500);
}

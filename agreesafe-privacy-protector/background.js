const STORAGE_KEYS = {
  isEnabled: 'isEnabled',
  whitelist: 'whitelist',
  trackerStats: 'trackerStats'
};

const STATIC_RULESET_ID = 'tracker_rules';
const WHITELIST_RULE_BASE = 200000;

let state = {
  isEnabled: true,
  whitelist: [],
  trackerStats: {}
};

// Per-tab session stats. Reset whenever tab navigates to a new site.
const tabSessionStats = new Map();
let isInitialized = false;

chrome.runtime.onInstalled.addListener(() => {
  initialize().catch((error) => {
    console.error('Initialization failed on install', error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  initialize().catch((error) => {
    console.error('Initialization failed on startup', error);
  });
});

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  try {
    const blockedDomain = new URL(details.request.url).hostname;

    // Keep global aggregate stats (for long-term totals / badge if needed).
    state.trackerStats[blockedDomain] = (state.trackerStats[blockedDomain] || 0) + 1;
    chrome.storage.local.set({ [STORAGE_KEYS.trackerStats]: state.trackerStats });

    // Track per-tab, per-site session stats for popup.
    const tabId = details.request.tabId;
    if (typeof tabId === 'number' && tabId >= 0) {
      let session = tabSessionStats.get(tabId);
      if (!session) {
        const inferredSite =
          getDomainFromUrl(details.request.initiator) ||
          getDomainFromUrl(details.request.documentUrl) ||
          '';
        session = {
          siteDomain: inferredSite,
          blocked: {},
          blockedTotal: 0,
          updatedAt: Date.now()
        };
        tabSessionStats.set(tabId, session);
      }

      session.blocked[blockedDomain] = (session.blocked[blockedDomain] || 0) + 1;
      session.blockedTotal += 1;
      session.updatedAt = Date.now();
    }

    updateBadge();
  } catch (error) {
    console.warn('Unable to process matched rule', error);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Reset as soon as URL changes so old-site history is removed immediately.
  if (typeof changeInfo.url === 'string') {
    const changedDomain = getDomainFromUrl(changeInfo.url);
    if (changedDomain) {
      tabSessionStats.set(tabId, {
        siteDomain: changedDomain,
        blocked: {},
        blockedTotal: 0,
        updatedAt: Date.now()
      });
    }
  }

  if (changeInfo.status === 'complete' && tab?.url) {
    ensureTabSession(tabId, tab.url);
    updateTabIcon(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (!chrome.runtime.lastError && tab?.url) {
      ensureTabSession(tabId, tab.url);
      updateTabIcon(tabId, tab.url);
    }
  });
  updateBadge();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabSessionStats.delete(tabId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  initialize().then(async () => {
    switch (request.action) {
      case 'getStats': {
        const tabId = typeof request.tabId === 'number' ? request.tabId : undefined;
        const currentDomain = typeof request.currentDomain === 'string' ? request.currentDomain : '';
        const siteData = getSiteStatsForTab(tabId, currentDomain);

        sendResponse({
          ...getPublicState(),
          siteStats: siteData.siteStats,
          siteBlockedTotal: siteData.siteBlockedTotal,
          siteDomain: siteData.siteDomain
        });
        break;
      }

      case 'toggleEnabled': {
        const desired = typeof request.enabled === 'boolean' ? request.enabled : !state.isEnabled;
        state.isEnabled = desired;
        await chrome.storage.local.set({ [STORAGE_KEYS.isEnabled]: state.isEnabled });
        await applyRulesState();
        await refreshAllTabIcons();
        updateBadge();
        sendResponse({ success: true, enabled: state.isEnabled });
        break;
      }

      case 'addToWhitelist': {
        const domain = normalizeDomain(request.domain);
        if (!domain) {
          sendResponse({ success: false, error: 'Invalid domain' });
          break;
        }

        if (!state.whitelist.includes(domain)) {
          state.whitelist.push(domain);
          state.whitelist.sort();
          await chrome.storage.local.set({ [STORAGE_KEYS.whitelist]: state.whitelist });
          await applyRulesState();
          await refreshAllTabIcons();
        }

        sendResponse({ success: true, whitelist: state.whitelist });
        break;
      }

      case 'removeFromWhitelist': {
        const domain = normalizeDomain(request.domain);
        if (!domain) {
          sendResponse({ success: false, error: 'Invalid domain' });
          break;
        }

        const before = state.whitelist.length;
        state.whitelist = state.whitelist.filter((entry) => entry !== domain);
        if (state.whitelist.length !== before) {
          await chrome.storage.local.set({ [STORAGE_KEYS.whitelist]: state.whitelist });
          await applyRulesState();
          await refreshAllTabIcons();
        }

        sendResponse({ success: true, whitelist: state.whitelist });
        break;
      }

      case 'clearStats':
        state.trackerStats = {};
        await chrome.storage.local.set({ [STORAGE_KEYS.trackerStats]: state.trackerStats });
        updateBadge();
        sendResponse({ success: true });
        break;

      case 'clearSiteStats': {
        const tabId = typeof request.tabId === 'number' ? request.tabId : undefined;
        if (typeof tabId !== 'number') {
          sendResponse({ success: false, error: 'Missing tab id' });
          break;
        }

        const session = tabSessionStats.get(tabId);
        if (session) {
          session.blocked = {};
          session.blockedTotal = 0;
          session.updatedAt = Date.now();
        }

        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
        break;
    }
  }).catch((error) => {
    sendResponse({ success: false, error: error.message || 'Operation failed' });
  });

  return true;
});

async function initialize() {
  if (isInitialized) {
    return;
  }

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.isEnabled,
    STORAGE_KEYS.whitelist,
    STORAGE_KEYS.trackerStats
  ]);

  state.isEnabled = stored[STORAGE_KEYS.isEnabled] !== false;
  state.whitelist = Array.isArray(stored[STORAGE_KEYS.whitelist])
    ? stored[STORAGE_KEYS.whitelist].map(normalizeDomain).filter(Boolean)
    : [];
  state.trackerStats = isObject(stored[STORAGE_KEYS.trackerStats]) ? stored[STORAGE_KEYS.trackerStats] : {};

  await chrome.storage.local.set({
    [STORAGE_KEYS.isEnabled]: state.isEnabled,
    [STORAGE_KEYS.whitelist]: state.whitelist,
    [STORAGE_KEYS.trackerStats]: state.trackerStats
  });

  await applyRulesState();
  await refreshAllTabIcons();
  updateBadge();

  isInitialized = true;
}

function getPublicState() {
  return {
    isEnabled: state.isEnabled,
    whitelist: [...state.whitelist],
    stats: { ...state.trackerStats }
  };
}

function getSiteStatsForTab(tabId, currentDomain) {
  if (typeof tabId !== 'number') {
    return { siteDomain: '', siteStats: {}, siteBlockedTotal: 0 };
  }

  const session = tabSessionStats.get(tabId);
  if (!session) {
    return { siteDomain: currentDomain || '', siteStats: {}, siteBlockedTotal: 0 };
  }

  const normalizedCurrent = normalizeDomain(currentDomain);

  // Safety: if popup domain and session domain differ, prefer fresh display.
  if (normalizedCurrent && session.siteDomain && normalizedCurrent !== session.siteDomain) {
    return { siteDomain: currentDomain, siteStats: {}, siteBlockedTotal: 0 };
  }

  return {
    siteDomain: session.siteDomain || currentDomain || '',
    siteStats: { ...session.blocked },
    siteBlockedTotal: Number(session.blockedTotal || 0)
  };
}

async function applyRulesState() {
  const enableRulesets = state.isEnabled ? [STATIC_RULESET_ID] : [];
  const disableRulesets = state.isEnabled ? [] : [STATIC_RULESET_ID];

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enableRulesets,
    disableRulesetIds: disableRulesets
  });

  const existingWhitelistRules = await getExistingWhitelistRuleIds();

  const whitelistRules = state.isEnabled
    ? state.whitelist.map((domain, index) => ({
        id: WHITELIST_RULE_BASE + index,
        priority: 10000,
        action: { type: 'allow' },
        condition: {
          requestDomains: [domain],
          resourceTypes: [
            'main_frame',
            'sub_frame',
            'script',
            'xmlhttprequest',
            'image',
            'font',
            'stylesheet',
            'media',
            'ping',
            'other'
          ]
        }
      }))
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingWhitelistRules,
    addRules: whitelistRules
  });
}

async function getExistingWhitelistRuleIds() {
  const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
  return dynamicRules
    .map((rule) => rule.id)
    .filter((id) => id >= WHITELIST_RULE_BASE && id < WHITELIST_RULE_BASE + 100000);
}

function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '');
}

function getDomainFromUrl(url) {
  try {
    if (!url) {
      return '';
    }

    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    return normalizeDomain(parsed.hostname);
  } catch {
    return '';
  }
}

function ensureTabSession(tabId, url) {
  if (tabId === undefined || tabId === null || !url) {
    return;
  }

  const domain = getDomainFromUrl(url);
  if (!domain) {
    return;
  }

  const existing = tabSessionStats.get(tabId);
  if (!existing || existing.siteDomain !== domain) {
    tabSessionStats.set(tabId, {
      siteDomain: domain,
      blocked: {},
      blockedTotal: 0,
      updatedAt: Date.now()
    });
  }
}

function isWhitelistedUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return state.whitelist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function updateTabIcon(tabId, url) {
  const disabled = !state.isEnabled || isWhitelistedUrl(url);
  const base = disabled ? 'icons/icon-disabled' : 'icons/icon';

  chrome.action.setIcon({
    tabId,
    path: {
      16: `${base}16.png`,
      32: `${base}32.png`,
      48: `${base}48.png`,
      128: `${base}128.png`
    }
  });
}

async function refreshAllTabIcons() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url) {
      ensureTabSession(tab.id, tab.url);
      updateTabIcon(tab.id, tab.url);
    }
  }
}

function getTotalBlocked() {
  return Object.values(state.trackerStats).reduce((sum, count) => sum + Number(count || 0), 0);
}

function updateBadge() {
  if (!state.isEnabled) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const total = getTotalBlocked();
  if (total > 0) {
    chrome.action.setBadgeText({ text: total > 999 ? '999+' : String(total) });
    chrome.action.setBadgeBackgroundColor({ color: '#0fa968' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

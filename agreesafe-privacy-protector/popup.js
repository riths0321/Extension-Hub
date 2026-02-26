let currentDomain = '';
let currentTabId = null;
let refreshTimer = null;

const toggleProtectionEl = document.getElementById('toggleProtection');
const statusTextEl = document.getElementById('statusText');
const statusPulseEl = document.getElementById('statusPulse');
const totalBlockedEl = document.getElementById('totalBlocked');
const sitesProtectedEl = document.getElementById('sitesProtected');
const currentSiteEl = document.getElementById('currentSite');
const whitelistBtnEl = document.getElementById('whitelistBtn');
const whitelistTextEl = document.getElementById('whitelistText');
const clearStatsEl = document.getElementById('clearStats');
const trackerListEl = document.getElementById('trackerList');
const whitelistListEl = document.getElementById('whitelistList');
const notificationContainer = document.getElementById('notificationContainer');

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializePopup();
});

function setupEventListeners() {
  toggleProtectionEl.addEventListener('change', onToggleProtection);
  whitelistBtnEl.addEventListener('click', onToggleWhitelist);
  clearStatsEl.addEventListener('click', onClearStats);
}

async function initializePopup() {
  await updateCurrentTabContext();
  await refreshUI();

  refreshTimer = setInterval(() => {
    updateCurrentTabContext().then(refreshUI);
  }, 2000);
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function refreshUI() {
  try {
    const data = await sendMessage({
      action: 'getStats',
      tabId: currentTabId,
      currentDomain
    });
    renderState(data || {});
  } catch (error) {
    showNotification(`Could not load stats: ${error.message}`, 'error');
  }
}

function renderState(data) {
  const stats = data.siteStats || {};
  const isEnabled = Boolean(data.isEnabled);
  const whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];

  toggleProtectionEl.checked = isEnabled;
  statusTextEl.textContent = isEnabled ? 'Active' : 'Disabled';
  statusTextEl.className = `status ${isEnabled ? 'active' : 'disabled'}`;
  statusPulseEl.className = `pulses ${isEnabled ? 'active' : 'disabled'}`;

  const totalBlocked = Number(data.siteBlockedTotal || 0);
  totalBlockedEl.textContent = totalBlocked.toLocaleString();
  sitesProtectedEl.textContent = Object.keys(stats).length.toLocaleString();

  renderTrackerList(stats);
  renderWhitelist(whitelist);
  updateWhitelistButtonState(whitelist.includes(currentDomain));
}

function renderTrackerList(stats) {
  trackerListEl.textContent = '';

  const entries = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No trackers blocked yet';
    trackerListEl.appendChild(empty);
    return;
  }

  for (const [domain, count] of entries) {
    const row = document.createElement('div');
    row.className = 'list-item';

    const domainEl = document.createElement('span');
    domainEl.className = 'item-domain';
    domainEl.textContent = domain;
    domainEl.title = domain;

    const countEl = document.createElement('span');
    countEl.className = 'item-count';
    countEl.textContent = String(count);

    row.append(domainEl, countEl);
    trackerListEl.appendChild(row);
  }
}

function renderWhitelist(whitelist) {
  whitelistListEl.textContent = '';

  if (!whitelist.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No whitelisted sites';
    whitelistListEl.appendChild(empty);
    return;
  }

  for (const domain of whitelist) {
    const row = document.createElement('div');
    row.className = 'list-item';

    const domainEl = document.createElement('span');
    domainEl.className = 'item-domain';
    domainEl.textContent = domain;
    domainEl.title = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => onRemoveWhitelist(domain));

    row.append(domainEl, removeBtn);
    whitelistListEl.appendChild(row);
  }
}

async function updateCurrentTabContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];

    if (!tab || !tab.url) {
      currentTabId = null;
      currentSiteEl.textContent = 'Unavailable';
      currentDomain = '';
      whitelistBtnEl.disabled = true;
      whitelistTextEl.textContent = 'Unavailable for this tab';
      return;
    }

    const parsed = new URL(tab.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      currentTabId = tab.id ?? null;
      currentSiteEl.textContent = 'Unsupported page';
      currentDomain = '';
      whitelistBtnEl.disabled = true;
      whitelistTextEl.textContent = 'Unavailable for this page';
      return;
    }

    currentTabId = tab.id ?? null;
    currentDomain = normalizeDomain(parsed.hostname);
    currentSiteEl.textContent = currentDomain;
    whitelistBtnEl.disabled = false;
  } catch (error) {
    currentTabId = null;
    currentSiteEl.textContent = 'Unable to read this tab';
    currentDomain = '';
    whitelistBtnEl.disabled = true;
    whitelistTextEl.textContent = 'Unavailable';
  }
}

function updateWhitelistButtonState(isWhitelisted) {
  if (!currentDomain) {
    return;
  }

  whitelistTextEl.textContent = isWhitelisted ? 'Remove from Whitelist' : 'Add to Whitelist';
  whitelistBtnEl.classList.toggle('remove', isWhitelisted);
}

async function onToggleProtection() {
  try {
    const response = await sendMessage({ action: 'toggleEnabled', enabled: toggleProtectionEl.checked });
    if (!response?.success) {
      throw new Error(response?.error || 'Unable to update protection');
    }

    showNotification(response.enabled ? 'Protection enabled' : 'Protection disabled', 'info');
    await refreshUI();
  } catch (error) {
    showNotification(error.message, 'error');
    await refreshUI();
  }
}

async function onToggleWhitelist() {
  if (!currentDomain) {
    return;
  }

  try {
    const state = await sendMessage({ action: 'getStats' });
    const whitelist = Array.isArray(state?.whitelist) ? state.whitelist : [];
    const isWhitelisted = whitelist.includes(currentDomain);

    const action = isWhitelisted ? 'removeFromWhitelist' : 'addToWhitelist';
    const result = await sendMessage({ action, domain: currentDomain });
    if (!result?.success) {
      throw new Error(result?.error || 'Could not update whitelist');
    }

    showNotification(isWhitelisted ? 'Removed from whitelist' : 'Added to whitelist', 'success');
    await refreshUI();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function onRemoveWhitelist(domain) {
  try {
    const result = await sendMessage({ action: 'removeFromWhitelist', domain });
    if (!result?.success) {
      throw new Error(result?.error || 'Could not remove domain');
    }

    showNotification('Domain removed from whitelist', 'info');
    await refreshUI();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function onClearStats() {
  const accepted = confirm('Clear blocked tracker history for current site?');
  if (!accepted) {
    return;
  }

  try {
    if (!currentTabId) {
      throw new Error('No active tab');
    }

    const result = await sendMessage({ action: 'clearSiteStats', tabId: currentTabId });
    if (!result?.success) {
      throw new Error(result?.error || 'Could not clear current site statistics');
    }

    showNotification('Current site statistics cleared', 'success');
    await refreshUI();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function showNotification(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `notification ${type}`;
  node.textContent = message;
  notificationContainer.appendChild(node);

  setTimeout(() => {
    node.remove();
  }, 2200);
}

window.addEventListener('beforeunload', () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
}

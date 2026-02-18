// Tab Sleep Timer - Background Service Worker
// Chrome CSP Compliant - No external resources

// Default settings
let settings = {
  sleepTimer: 15, // minutes
  ignorePinned: true,
  ignoreAudio: true,
  batteryMode: true
};

// Track tab activity
let tabTimers = {};
let lastActivity = {};
let isUserIdle = false;

// Initialize
async function initialize() {
  // Load settings
  const result = await chrome.storage.local.get(['sleepSettings']);
  if (result.sleepSettings) {
    settings = { ...settings, ...result.sleepSettings };
  }
  
  // Start monitoring
  setupListeners();
  updateBadge();
}

// Setup all event listeners
function setupListeners() {
  // Tab activation
  chrome.tabs.onActivated.addListener(handleTabActivated);
  
  // Tab updates
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  
  // Tab removal
  chrome.tabs.onRemoved.addListener(handleTabRemoved);
  
  // Window focus
  chrome.windows.onFocusChanged.addListener(handleWindowFocus);
  
  // Idle state
  chrome.idle.setDetectionInterval(60);
  chrome.idle.onStateChanged.addListener(handleIdleState);
  
  // Start periodic check
  setInterval(checkInactiveTabs, 60000); // Every minute
}

// Handle tab activation
async function handleTabActivated(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (chrome.runtime.lastError) return;
    
    // Wake up tab if it was sleeping
    if (tab.discarded) {
      chrome.tabs.reload(activeInfo.tabId);
    }
    
    // Update activity
    lastActivity[activeInfo.tabId] = Date.now();
    resetTabTimer(activeInfo.tabId);
    
    // Remove sleep overlay
    notifyTab(activeInfo.tabId, { action: 'tabWoken' });
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
}

// Handle tab updates
async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    lastActivity[tabId] = Date.now();
    resetTabTimer(tabId);
  }
}

// Handle tab removal
function handleTabRemoved(tabId) {
  delete tabTimers[tabId];
  delete lastActivity[tabId];
}

// Handle window focus
async function handleWindowFocus(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs && tabs[0]) {
      lastActivity[tabs[0].id] = Date.now();
      resetTabTimer(tabs[0].id);
    }
  } catch (error) {
    console.error('Error handling window focus:', error);
  }
}

// Handle idle state
function handleIdleState(state) {
  isUserIdle = state === 'idle' || state === 'locked';
}

// Use shorter timer if battery mode is enabled or system is idle
function getEffectiveSleepMinutes() {
  let sleepMinutes = settings.sleepTimer;
  if (settings.batteryMode || isUserIdle) {
    sleepMinutes = Math.max(5, Math.floor(sleepMinutes / 2));
  }
  return sleepMinutes;
}

// Reset timer for a tab
async function resetTabTimer(tabId) {
  // Clear existing timer
  if (tabTimers[tabId]) {
    clearTimeout(tabTimers[tabId]);
    delete tabTimers[tabId];
  }
  
  try {
    const tab = await chrome.tabs.get(tabId);
    if (chrome.runtime.lastError) return;
    
    // Don't set timer for special tabs
    if (await shouldIgnoreTab(tab)) return;
    
    // Calculate sleep time
    const sleepMinutes = getEffectiveSleepMinutes();
    
    // Set new timer
    tabTimers[tabId] = setTimeout(() => {
      sleepTab(tabId);
    }, sleepMinutes * 60 * 1000);
    
  } catch (error) {
    console.error('Error resetting tab timer:', error);
  }
}

// Check if tab should be ignored
async function shouldIgnoreTab(tab) {
  if (!tab) return true;
  
  // Ignore pinned tabs
  if (settings.ignorePinned && tab.pinned) return true;
  
  // Ignore tabs playing audio
  if (settings.ignoreAudio && tab.audible) return true;
  
  // Ignore special chrome pages
  if (tab.url?.startsWith('chrome://')) return true;
  if (tab.url?.startsWith('chrome-extension://')) return true;
  if (tab.url?.startsWith('about:')) return true;
  if (tab.url?.startsWith('edge://')) return true;
  
  // Ignore empty or new tabs
  if (!tab.url || tab.url === '') return true;
  if (tab.url === 'about:blank') return true;
  if (tab.url === 'about:newtab') return true;
  
  return false;
}

// Sleep a tab
async function sleepTab(tabId, mode = 'auto') {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (chrome.runtime.lastError) {
      return { slept: false, reason: 'tab_not_found' };
    }

    if (tab.discarded) {
      return { slept: false, reason: 'already_sleeping' };
    }
    
    // Double-check conditions
    if (await shouldIgnoreTab(tab)) {
      return { slept: false, reason: 'ignored_by_rules' };
    }
    
    // Check if recently active
    if (mode !== 'manual' &&
        lastActivity[tabId] && 
        (Date.now() - lastActivity[tabId]) < getEffectiveSleepMinutes() * 60 * 1000) {
      resetTabTimer(tabId);
      return { slept: false, reason: 'recently_active' };
    }
    
    // Don't sleep active tabs
    if (tab.active) {
      return { slept: false, reason: 'active_tab' };
    }

    // Some tabs are explicitly marked as non-discardable by Chrome/session state.
    if (tab.autoDiscardable === false) {
      return { slept: false, reason: 'discard_blocked' };
    }
    
    // Use Chrome's discard API
    try {
      await chrome.tabs.discard(tabId);
    } catch (discardError) {
      const message = discardError?.message || '';
      if (message.includes('Cannot discard tab')) {
        return { slept: false, reason: 'discard_blocked' };
      }
      throw discardError;
    }

    const updatedTab = await chrome.tabs.get(tabId);
    
    // Notify content script
    notifyTab(tabId, { 
      action: 'tabSlept', 
      timestamp: Date.now() 
    });
    
    // Update badge
    updateBadge();
    return {
      slept: Boolean(updatedTab.discarded),
      reason: updatedTab.discarded ? 'slept' : 'discard_not_applied'
    };
    
  } catch (error) {
    console.error('Error sleeping tab:', error);
    return { slept: false, reason: 'error', error: error.message };
  }
}

// Wake up a tab
async function wakeTab(tabId) {
  try {
    await chrome.tabs.reload(tabId);
    
    // Update activity
    lastActivity[tabId] = Date.now();
    resetTabTimer(tabId);
    
    // Update badge
    updateBadge();
    return { woken: true };
    
  } catch (error) {
    console.error('Error waking tab:', error);
    return { woken: false, error: error.message };
  }
}

// Notify content script
async function notifyTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Tab might be asleep or not ready - ignore
  }
}

// Check for inactive tabs
async function checkInactiveTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      // Skip if tab is already discarded
      if (tab.discarded) continue;
      
      // Skip if should be ignored
      if (await shouldIgnoreTab(tab)) continue;
      
      // Check inactivity
      const lastActive = lastActivity[tab.id] || 0;
      const inactiveMinutes = (Date.now() - lastActive) / (60 * 1000);
      
      if (inactiveMinutes > getEffectiveSleepMinutes()) {
        await sleepTab(tab.id, 'auto');
      }
    }
  } catch (error) {
    console.error('Error checking inactive tabs:', error);
  }
}

// Update extension badge
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});
    const sleepCount = tabs.filter(t => t.discarded).length;
    
    if (sleepCount > 0) {
      chrome.action.setBadgeText({ text: sleepCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Get statistics
async function getStats() {
  try {
    const tabs = await chrome.tabs.query({});
    const sleeping = tabs.filter(t => t.discarded).length;
    const active = tabs.length - sleeping;
    
    // Calculate memory saved (rough estimate - 75MB per tab)
    const memoryPerTab = 75;
    const memorySaved = sleeping * memoryPerTab;
    
    // Calculate battery saved (rough estimate)
    const batterySaved = Math.min(30, Math.floor(sleeping * 1.5));
    
    return {
      total: tabs.length,
      sleeping,
      active,
      memorySaved,
      batterySaved,
      settings
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      total: 0,
      sleeping: 0,
      active: 0,
      memorySaved: 0,
      batterySaved: 0,
      settings
    };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'getStats':
          const stats = await getStats();
          sendResponse(stats);
          break;
          
        case 'sleepNow':
          const tabs = await chrome.tabs.query({});
          let sleptCount = 0;
          const skipped = {
            ignored_by_rules: 0,
            active_tab: 0,
            already_sleeping: 0,
            recently_active: 0,
            discard_blocked: 0,
            discard_not_applied: 0,
            tab_not_found: 0,
            error: 0
          };
          for (const tab of tabs) {
            if (!await shouldIgnoreTab(tab)) {
              const result = await sleepTab(tab.id, 'manual');
              if (result?.slept) {
                sleptCount += 1;
              } else if (result?.reason && skipped[result.reason] !== undefined) {
                skipped[result.reason] += 1;
              }
            } else {
              skipped.ignored_by_rules += 1;
            }
          }
          sendResponse({
            success: true,
            sleptCount,
            skipped
          });
          break;
          
        case 'wakeAll':
          const discardedTabs = await chrome.tabs.query({ discarded: true });
          let wokenCount = 0;
          for (const tab of discardedTabs) {
            const result = await wakeTab(tab.id);
            if (result?.woken) {
              wokenCount += 1;
            }
          }
          sendResponse({
            success: true,
            wokenCount,
            requested: discardedTabs.length
          });
          break;
          
        case 'updateSettings':
          settings = { ...settings, ...message.settings };
          await chrome.storage.local.set({ sleepSettings: settings });
          sendResponse({ success: true });
          break;
          
        case 'wakeTab':
          await wakeTab(message.tabId);
          sendResponse({ success: true });
          break;

        case 'checkSleepState':
          if (sender.tab?.id) {
            const senderTab = await chrome.tabs.get(sender.tab.id);
            sendResponse({ isSleeping: Boolean(senderTab.discarded) });
          } else {
            sendResponse({ isSleeping: false });
          }
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

// Initialize on load
initialize();

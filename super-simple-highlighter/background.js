// background.js — Super Simple Highlighter service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Simple Highlighter installed');

  // Context menu (requires "contextMenus" permission in manifest)
  chrome.contextMenus.create({
    id:       'toggle-highlight',
    title:    'Toggle Highlight Mode',
    contexts: ['all']
  });

  // Default settings
  chrome.storage.sync.set({
    highlightColor: 'yellow',
    autoRestore:    true,
    showTooltip:    true
  });
});

// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggle-highlight') {
    chrome.tabs.sendMessage(tab.id, {
      action:  'setHighlightMode',
      enabled: true
    });
  }
});

// Keyboard shortcut (declared in manifest commands)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-highlight') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action:  'setHighlightMode',
          enabled: true
        });
      }
    });
  }
});

// Restore highlights on page load (if autoRestore is enabled)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.sync.get(['autoRestore'], (data) => {
      if (data.autoRestore !== false) {
        // Small delay so the page's own scripts settle first
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: 'refreshHighlights' })
            .catch(() => {
              // Content script not yet injected — this is normal on first load
            });
        }, 1000);
      }
    });
  }
});
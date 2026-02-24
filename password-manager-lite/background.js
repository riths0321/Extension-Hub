'use strict';

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    // Popup opens automatically via manifest action
    console.log('Password Vault opened via keyboard shortcut');
  }
});

// Listen for tab navigation to detect login pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const path = url.pathname.toLowerCase();
    const search = url.search.toLowerCase();

    const isLoginPage =
      path.includes('login') ||
      path.includes('signin') ||
      path.includes('sign-in') ||
      path.includes('auth') ||
      search.includes('login') ||
      search.includes('signin');

    if (isLoginPage) {
      chrome.tabs.sendMessage(tabId, {
        action: 'detectLoginPage',
        url: tab.url
      }).catch(() => {
        // Content script may not be injected on all pages — silently ignore
      });
    }
  } catch (_) {
    // Invalid URL (e.g. chrome://) — ignore
  }
});

/**
 * SnipVault – Background Service Worker
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('SnipVault installed. Happy coding!');
  } else if (reason === 'update') {
    console.log('SnipVault updated to v2.0');
  }
});

// Handle storage requests from content scripts if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSnippets') {
    chrome.storage.local.get('snipvault_snippets', (data) => {
      sendResponse({ snippets: data['snipvault_snippets'] || [] });
    });
    return true; // async response
  }
});

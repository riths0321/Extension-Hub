export async function detectStacksFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error('No active tab available for auto-detection.');
  }
  if (/^(chrome|chrome-extension|edge):\/\//.test(tab.url)) {
    throw new Error('Auto-detect is not available on internal browser pages.');
  }

  return chrome.runtime.sendMessage({ action: 'detectTechStack', tabId: tab.id });
}

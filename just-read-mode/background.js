/* background.js - Just Read Service Worker */

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        darkMode: false, serifFont: false, fontSize: 'medium',
        lineHeight: '1.6', autoDarkMode: false, removeImages: false,
        removeAds: true, removeSidebars: true, keepLinks: true,
        autoEnable: false, themeColor: '#4f8ef7',
        contentSelectors: 'article, .post-content, .story, #main-content',
        excludeDomains: ''
    });
});

chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-reading-mode') return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        const tabId = tabs[0].id;
        chrome.storage.local.get(['activeTabs'], (result) => {
            const activeTabs = result.activeTabs || {};
            const isActive = activeTabs[tabId];
            const action = isActive ? 'disableReadingMode' : 'enableReadingMode';
            chrome.tabs.sendMessage(tabId, { action }, () => {
                if (chrome.runtime.lastError) return;
                if (isActive) { delete activeTabs[tabId]; } else { activeTabs[tabId] = true; }
                chrome.storage.local.set({ activeTabs });
                updateIcon(!isActive, tabId);
            });
        });
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.sync.get([
            'darkMode', 'serifFont', 'fontSize', 'lineHeight', 'autoDarkMode',
            'removeImages', 'removeAds', 'removeSidebars', 'keepLinks',
            'themeColor', 'contentSelectors'
        ], (result) => sendResponse(result));
        return true;
    }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.storage.local.get(['activeTabs'], (result) => {
        updateIcon(!!(result.activeTabs && result.activeTabs[tabId]), tabId);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        chrome.storage.local.get(['activeTabs'], (result) => {
            const activeTabs = result.activeTabs || {};
            if (activeTabs[tabId]) {
                delete activeTabs[tabId];
                chrome.storage.local.set({ activeTabs });
                updateIcon(false, tabId);
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get(['activeTabs'], (result) => {
        const activeTabs = result.activeTabs || {};
        if (activeTabs[tabId]) {
            delete activeTabs[tabId];
            chrome.storage.local.set({ activeTabs });
        }
    });
});

function updateIcon(isActive, tabId) {
    const iconPath = isActive
        ? { 16: 'icons/icon-active.png', 48: 'icons/icon-active.png', 128: 'icons/icon-active.png' }
        : { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' };
    const details = { path: iconPath };
    if (tabId) details.tabId = tabId;
    chrome.action.setIcon(details).catch(() => {});
}

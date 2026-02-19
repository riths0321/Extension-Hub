// Initialize extension
chrome.runtime.onInstalled.addListener(() => {

    chrome.storage.sync.get(['quickLinks'], (result) => {
        if (!result.quickLinks) {
            chrome.storage.sync.set({ quickLinks: [] });
        }
    });

    chrome.contextMenus.create({
        id: "addToLinkManager",
        title: "Add to Link Manager",
        contexts: ["page", "link"]
    });
});


// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {

    if (info.menuItemId !== "addToLinkManager") return;

    const url = info.linkUrl || info.pageUrl;
    if (!url || url.startsWith("chrome://") || url.startsWith("edge://")) return;

    const title = tab?.title || "Saved Link";

    let category = 'general';
    const lower = url.toLowerCase();

    if (lower.includes('mail') || lower.includes('docs') || lower.includes('calendar')) category = 'work';
    else if (lower.includes('facebook') || lower.includes('instagram') || lower.includes('twitter')) category = 'social';
    else if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('shop')) category = 'shopping';
    else if (lower.includes('youtube') || lower.includes('netflix') || lower.includes('spotify')) category = 'entertainment';


    chrome.storage.sync.get(['quickLinks'], (result) => {

        const links = result.quickLinks || [];

        if (links.some(link => link.url === url)) return;

        links.push({
            title,
            url,
            category,
            dateAdded: new Date().toISOString()
        });

        chrome.storage.sync.set({ quickLinks: links });

    });
});


// optional messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === 'getLinks') {
        chrome.storage.sync.get(['quickLinks'], (result) => {
            sendResponse({ links: result.quickLinks || [] });
        });
        return true;
    }
});

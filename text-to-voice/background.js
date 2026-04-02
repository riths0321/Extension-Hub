// Background service worker for context menus and commands
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: "readSelection",
    title: "🔊 Read selected text",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "readPage",
    title: "📖 Read this page",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "saveToPlaylist",
    title: "📌 Save to Listen Later",
    contexts: ["selection", "page"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelection" && info.selectionText) {
    // Send text to popup
    chrome.storage.local.set({ selectedText: info.selectionText });
    chrome.action.openPopup();
  } else if (info.menuItemId === "readPage") {
    chrome.tabs.sendMessage(tab.id, { action: "readPage" });
  } else if (info.menuItemId === "saveToPlaylist") {
    const text = info.selectionText || "Page content";
    chrome.storage.local.get(["playlist"], (result) => {
      const playlist = result.playlist || [];
      playlist.unshift({
        id: Date.now(),
        text: text,
        title: text.substring(0, 50),
        url: tab.url,
        timestamp: new Date().toISOString()
      });
      chrome.storage.local.set({ playlist });
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Saved to Playlist",
        message: "Added to Listen Later"
      });
    });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "read-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { action: "readPage" });
    });
  } else if (command === "read-selection") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { action: "readSelection" });
    });
  }
});
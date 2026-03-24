chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected" && sender.tab) {
    chrome.runtime.sendMessage(request);
    sendResponse({ relayed: true });
    return true;
  }
  
  if (request.action === "ping") {
    sendResponse({ alive: true, time: Date.now() });
    return true;
  }
  
  return true;
});

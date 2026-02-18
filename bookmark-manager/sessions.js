/* ===========================
   Tab Session Management
=========================== */

// Delegates to showStatus defined in popup.js
function sessionNotify(message, type = "success") {
  if (typeof window.showStatus === "function") {
    window.showStatus(message, type);
  }
}

/* ===========================
   Save current tabs as a session
=========================== */

document.getElementById("saveSession").addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      sessionNotify("Error reading tabs", "error");
      return;
    }

    // Filter out internal browser pages that can't be restored
    const session = tabs
      .filter(tab => tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://"))
      .map(tab => ({
        title: tab.title || tab.url,
        url:   tab.url
      }));

    if (!session.length) {
      sessionNotify("No saveable tabs found", "error");
      return;
    }

    chrome.storage.local.set({ lastSession: session }, () => {
      if (chrome.runtime.lastError) {
        sessionNotify("Failed to save session", "error");
      } else {
        sessionNotify(`Session saved (${session.length} tab${session.length !== 1 ? "s" : ""})`);
      }
    });
  });
});

/* ===========================
   Restore last saved session
=========================== */

document.getElementById("restoreSession").addEventListener("click", () => {
  chrome.storage.local.get("lastSession", (res) => {
    if (chrome.runtime.lastError) {
      sessionNotify("Error reading session", "error");
      return;
    }

    if (!res.lastSession || !res.lastSession.length) {
      sessionNotify("No saved session found", "error");
      return;
    }

    res.lastSession.forEach(tab => {
      if (tab.url) {
        chrome.tabs.create({ url: tab.url });
      }
    });

    sessionNotify(`Restored ${res.lastSession.length} tab${res.lastSession.length !== 1 ? "s" : ""}`);
  });
});
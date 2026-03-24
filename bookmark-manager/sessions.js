function sessionNotify(message, type = "success") {
  if (typeof window.showStatus === "function") {
    window.showStatus(message, type);
  }
}

document.getElementById("saveSession").addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      sessionNotify("Could not read tabs", "error");
      return;
    }

    const session = tabs
      .filter(
        (tab) =>
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("chrome-extension://")
      )
      .map((tab) => ({
        title: tab.title || tab.url,
        url: tab.url
      }));

    if (!session.length) {
      sessionNotify("No saveable tabs found", "error");
      return;
    }

    chrome.storage.local.set(
      {
        lastSession: session,
        lastSessionSavedAt: Date.now()
      },
      () => {
        if (chrome.runtime.lastError) {
          sessionNotify("Failed to save session", "error");
          return;
        }
        sessionNotify(`Saved ${session.length} tab${session.length !== 1 ? "s" : ""}`);
        window.refreshOverview?.();
      }
    );
  });
});

document.getElementById("restoreSession").addEventListener("click", () => {
  chrome.storage.local.get(["lastSession"], (data) => {
    if (chrome.runtime.lastError) {
      sessionNotify("Could not read saved session", "error");
      return;
    }

    const session = Array.isArray(data.lastSession) ? data.lastSession : [];
    if (!session.length) {
      sessionNotify("No saved session found", "error");
      return;
    }

    session.forEach((tab) => {
      if (tab.url) {
        chrome.tabs.create({ url: tab.url });
      }
    });

    sessionNotify(`Restored ${session.length} tab${session.length !== 1 ? "s" : ""}`);
  });
});

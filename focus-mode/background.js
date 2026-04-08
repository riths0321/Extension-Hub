function isWithinTime(start, end) {
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = new Date();
  s.setHours(sh, sm, 0);
  const e = new Date();
  e.setHours(eh, em, 0);
  return now >= s && now <= e;
}

function isExtensionPage(url = "") {
  return url.startsWith("chrome-extension://");
}

function isTrackableWebUrl(url = "") {
  return url.startsWith("http://") || url.startsWith("https://");
}

function getBlockedPageUrl(targetUrl) {
  const url = new URL(chrome.runtime.getURL("blocked.html"));
  if (targetUrl) url.searchParams.set("returnTo", targetUrl);
  return url.toString();
}

function shouldBlockTab(tab, settings) {
  if (!tab?.url || isExtensionPage(tab.url) || !isTrackableWebUrl(tab.url))
    return false;

  const now = Date.now();
  if (!settings.focusOn || now < (settings.emergencyUntil || 0)) return false;
  if (!isWithinTime(settings.startTime || "09:00", settings.endTime || "18:00"))
    return false;

  if (settings.mode === "whitelist") {
    const whitelist = settings.whitelist || [];
    return !whitelist.some((site) => tab.url.includes(site));
  }

  return (settings.blocked || []).some((site) => tab.url.includes(site));
}

function blockTab(tabId, tab, settings) {
  if (!shouldBlockTab(tab, settings)) return;

  chrome.storage.sync.set({
    blockCount: (settings.blockCount || 0) + 1,
    totalBlocks: (settings.totalBlocks || 0) + 1,
    lastFocusDate: new Date().toDateString(),
  });
  updateFocusTime(true);
  chrome.tabs.update(tabId, { url: getBlockedPageUrl(tab.url) });
}

function restoreBlockedTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (
        !tab.url ||
        !tab.url.startsWith(chrome.runtime.getURL("blocked.html"))
      )
        return;

      const blockedUrl = new URL(tab.url);
      const returnTo = blockedUrl.searchParams.get("returnTo");
      if (returnTo) {
        chrome.tabs.update(tab.id, { url: returnTo });
      }
    });
  });
}

function applyFocusRulesToOpenTabs() {
  chrome.storage.sync.get(
    [
      "blocked",
      "focusOn",
      "startTime",
      "endTime",
      "emergencyUntil",
      "blockCount",
      "totalBlocks",
      "mode",
      "whitelist",
    ],
    (settings) => {
      if (!settings.focusOn) {
        restoreBlockedTabs();
        return;
      }

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => blockTab(tab.id, tab, settings));
      });
    },
  );
}

// reset blockCount daily
chrome.runtime.onStartup.addListener(resetIfNewDay);
chrome.runtime.onInstalled.addListener(resetIfNewDay);

function resetIfNewDay() {
  chrome.storage.sync.get(
    ["lastReset", "focusStreak", "lastFocusDate"],
    (res) => {
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      if (res.lastReset !== today) {
        // Check if focused yesterday to maintain streak
        let newStreak = res.focusStreak || 0;
        if (
          res.lastFocusDate === yesterdayString &&
          (res.blockCount || 0) > 0
        ) {
          newStreak++;
        } else if (res.lastFocusDate !== today) {
          newStreak = 0;
        }

        chrome.storage.sync.set({
          blockCount: 0,
          lastReset: today,
          focusStreak: newStreak,
          lastFocusDate: res.lastFocusDate,
        });
      }
    },
  );
}

// Track daily focus time
function updateFocusTime(siteBlocked) {
  chrome.storage.sync.get(["dailyFocusTime", "lastReset"], (res) => {
    const today = new Date().toDateString();
    if (res.lastReset !== today) {
      chrome.storage.sync.set({ dailyFocusTime: 0 });
    } else {
      const newTime = (res.dailyFocusTime || 0) + 1; // Add 1 minute per block
      chrome.storage.sync.set({ dailyFocusTime: newTime });
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url || changeInfo.status !== "complete") return;

  chrome.storage.sync.get(
    [
      "blocked",
      "focusOn",
      "startTime",
      "endTime",
      "emergencyUntil",
      "blockCount",
      "totalBlocks",
      "mode",
      "whitelist",
    ],
    (res) => {
      blockTab(tabId, tab, res);
    },
  );
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  const relevantKeys = [
    "blocked",
    "focusOn",
    "startTime",
    "endTime",
    "emergencyUntil",
    "mode",
    "whitelist",
  ];

  if (relevantKeys.some((key) => key in changes)) {
    applyFocusRulesToOpenTabs();
  }

  // If emergency access expired, re-block tabs
  if ("emergencyUntil" in changes) {
    const { oldValue, newValue } = changes["emergencyUntil"];
    if (oldValue && newValue < Date.now()) {
      // Emergency access expired, re-apply blocking
      applyFocusRulesToOpenTabs();
    }
  }
});

// Track site usage for analytics
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && isTrackableWebUrl(tab.url)) {
      const hostname = new URL(tab.url).hostname;
      chrome.storage.local.get(["siteAnalytics"], (res) => {
        const analytics = res.siteAnalytics || {};
        const today = new Date().toDateString();
        if (!analytics[today]) analytics[today] = {};
        if (!analytics[today][hostname]) analytics[today][hostname] = 0;
        analytics[today][hostname]++;
        chrome.storage.local.set({ siteAnalytics: analytics });
      });
    }
  });
});

applyFocusRulesToOpenTabs();

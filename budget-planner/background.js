const ALARM_NAME = "budgetCheck";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  chrome.storage.local.get(["wallet", "limit", "lastAlertMonth"]).then((res) => {
    const limit = Number(res.limit || 0);
    if (!limit) return;

    const monthKey = new Date().toISOString().slice(0, 7);
    const spent = (Array.isArray(res.wallet) ? res.wallet : []).reduce((sum, item) => {
      if (item.type !== "expense") return sum;
      if (!String(item.time).startsWith(monthKey)) return sum;
      return sum + Number(item.amount || 0);
    }, 0);

    if (spent <= limit) return;
    if (res.lastAlertMonth === monthKey) return;

    chrome.notifications
      .create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Budget Alert",
        message: `This month you spent more than your limit. Spent: ₹${spent.toFixed(
          2
        )}, Limit: ₹${limit.toFixed(2)}`
      })
      .catch(() => {});

    chrome.storage.local.set({ lastAlertMonth: monthKey }).catch(() => {});
  });
});

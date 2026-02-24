'use strict';

const ALARM_NAME = 'water-reminder';
const DEFAULT_INTERVAL = 30;
const DEFAULT_GOAL = 3000;

async function createAlarm(intervalMinutes) {
  await chrome.alarms.clear(ALARM_NAME);
  const interval = Number(intervalMinutes) || DEFAULT_INTERVAL;
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval,
  });
}

async function dailyResetCheck() {
  const today = new Date().toDateString();
  const data = await chrome.storage.sync.get([
    'lastDate', 'consumed', 'goal', 'streak'
  ]);

  if (data.lastDate !== today) {
    const goal = data.goal || DEFAULT_GOAL;
    const metGoal = (data.consumed || 0) >= goal;
    const newStreak = metGoal ? (data.streak || 0) + 1 : 0;

    await chrome.storage.sync.set({
      lastDate: today,
      consumed: 0,
      streak: newStreak,
    });
  }
}

function isInQuietHours(quietStart, quietEnd) {
  if (!quietStart || !quietEnd) return false;

  const now = new Date();
  const [sh, sm] = quietStart.split(':').map(Number);
  const [eh, em] = quietEnd.split(':').map(Number);

  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Handle overnight quiet hours (e.g. 22:00 to 07:00)
  if (startMins <= endMins) {
    return nowMins >= startMins && nowMins <= endMins;
  } else {
    return nowMins >= startMins || nowMins <= endMins;
  }
}

// On install: set defaults and start alarm
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get(['interval', 'goal']);

  await chrome.storage.sync.set({
    lastDate: new Date().toDateString(),
    consumed: 0,
    streak: 0,
    goal: data.goal || DEFAULT_GOAL,
    interval: data.interval || DEFAULT_INTERVAL,
  });

  await createAlarm(data.interval || DEFAULT_INTERVAL);
});

// On browser startup: reset day if needed, restore alarm
chrome.runtime.onStartup.addListener(async () => {
  await dailyResetCheck();
  const data = await chrome.storage.sync.get(['interval', 'hourly']);
  const interval = data.hourly ? 60 : (data.interval || DEFAULT_INTERVAL);
  await createAlarm(interval);
});

// Watch for interval changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.interval || changes.hourly) {
    chrome.storage.sync.get(['interval', 'hourly']).then((data) => {
      const interval = data.hourly ? 60 : (data.interval || DEFAULT_INTERVAL);
      createAlarm(interval);
    });
  }
});

// Alarm fires: check quiet hours and open alert window
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  await dailyResetCheck();

  const data = await chrome.storage.sync.get([
    'quietStart', 'quietEnd', 'quietEnabled', 'goal', 'consumed'
  ]);

  // Skip if quiet hours are enabled and active
  if (data.quietEnabled && isInQuietHours(data.quietStart, data.quietEnd)) {
    return;
  }

  // Don't show if goal already reached
  const goal = data.goal || DEFAULT_GOAL;
  if ((data.consumed || 0) >= goal) return;

  // Don't open if alert is already open
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['popup'] });
  const isAlertOpen = windows.some((win) =>
    win.tabs?.some((tab) => tab.url?.endsWith('alert.html'))
  );

  if (!isAlertOpen) {
    chrome.windows.create({
      url: 'alert.html',
      type: 'popup',
      width: 380,
      height: 440,
      focused: true,
    });
  }
});

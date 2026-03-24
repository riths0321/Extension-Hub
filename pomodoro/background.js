// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  workTime: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  longBreakInterval: 4,
};

// ── Install ───────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("pomodoro", (data) => {
    if (!data.pomodoro) {
      chrome.storage.local.set({
        pomodoro: {
          time: DEFAULTS.workTime,
          totalTime: DEFAULTS.workTime,
          mode: "work",
          running: false,
          session: 0,
          completedToday: 0,
          startedAt: null,
        },
        settings: { ...DEFAULTS },
      });
    }
  });
});

// ── Alarm handler ─────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "pomodoroTick") return;

  chrome.storage.local.get(["pomodoro", "settings"], ({ pomodoro, settings }) => {
    if (!pomodoro || !pomodoro.running) return;

    const now = Date.now();
    const elapsed = Math.floor((now - pomodoro.startedAt) / 1000);
    pomodoro.time = Math.max(0, pomodoro.totalTime - elapsed);

    if (pomodoro.time <= 0) {
      // Session complete
      chrome.alarms.clear("pomodoroTick");
      pomodoro.running = false;

      if (pomodoro.mode === "work") {
        pomodoro.session += 1;
        pomodoro.completedToday += 1;

        const isLongBreak = pomodoro.session % settings.longBreakInterval === 0;
        pomodoro.mode = isLongBreak ? "longBreak" : "shortBreak";
        pomodoro.totalTime = isLongBreak ? settings.longBreak : settings.shortBreak;

        chrome.notifications.clear("pomodoroEnd");
        chrome.notifications.create("pomodoroEnd", {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "🍅 Focus session complete!",
          message: isLongBreak
            ? "Great work! Time for a long break (15 min)."
            : "Nice! Take a short break (5 min).",
          priority: 2,
        });
      } else {
        pomodoro.mode = "work";
        pomodoro.totalTime = settings.workTime;

        chrome.notifications.create("pomodoroEnd", {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "☕ Break over!",
          message: "Ready to focus? Start your next session.",
          priority: 2,
        });
      }

      pomodoro.time = pomodoro.totalTime;
      pomodoro.startedAt = null;
    }

    chrome.storage.local.set({ pomodoro });
  });
});

// ── Message handler (start/pause/reset from popup) ────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  chrome.storage.local.get(["pomodoro", "settings"], ({ pomodoro, settings }) => {
    if (!pomodoro) return;

    if (msg.action === "start") {
      pomodoro.running = true;
      pomodoro.startedAt = Date.now() - (pomodoro.totalTime - pomodoro.time) * 1000;
      chrome.alarms.create("pomodoroTick", { periodInMinutes: 0.25 });
      chrome.storage.local.set({ pomodoro });
      sendResponse({ ok: true });
    }

    if (msg.action === "pause") {
      pomodoro.running = false;
      chrome.alarms.clear("pomodoroTick");
      chrome.storage.local.set({ pomodoro });
      sendResponse({ ok: true });
    }

    if (msg.action === "reset") {
      chrome.alarms.clear("pomodoroTick");
      pomodoro.running = false;
      pomodoro.mode = "work";
      pomodoro.time = settings.workTime;
      pomodoro.totalTime = settings.workTime;
      pomodoro.startedAt = null;
      chrome.storage.local.set({ pomodoro });
      sendResponse({ ok: true });
    }

    if (msg.action === "switchMode") {
      chrome.alarms.clear("pomodoroTick");
      pomodoro.running = false;
      pomodoro.mode = msg.mode;
      const timeMap = {
        work: settings.workTime,
        shortBreak: settings.shortBreak,
        longBreak: settings.longBreak,
      };
      pomodoro.time = timeMap[msg.mode];
      pomodoro.totalTime = timeMap[msg.mode];
      pomodoro.startedAt = null;
      chrome.storage.local.set({ pomodoro });
      sendResponse({ ok: true });
    }
  });
  return true;
});
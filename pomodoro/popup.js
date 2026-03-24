// ── Elements ──────────────────────────────────────────────────────────────────
const app          = document.getElementById("app");
const timeDisplay  = document.getElementById("timeDisplay");
const modeLabel    = document.getElementById("modeLabel");
const ringProgress = document.getElementById("ringProgress");
const mainBtn      = document.getElementById("mainBtn");
const mainBtnLabel = document.getElementById("mainBtnLabel");
const mainBtnIcon  = document.getElementById("mainBtnIcon");
const resetBtn     = document.getElementById("resetBtn");
const skipBtn      = document.getElementById("skipBtn");
const sessionCount = document.getElementById("sessionCount");
const todayCount   = document.getElementById("todayCount");
const totalMins    = document.getElementById("totalMins");
const streakVal    = document.getElementById("streakVal");
const tabs         = document.querySelectorAll(".tab");

// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";

// CSP-safe SVG builder helpers
function makeSvg(w, h) {
  const s = document.createElementNS(svgNS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${h}`);
  s.setAttribute("fill", "currentColor");
  s.setAttribute("width", w);
  s.setAttribute("height", h);
  return s;
}

function makePlayIcon() {
  const svg = makeSvg(14, 14);
  const poly = document.createElementNS(svgNS, "polygon");
  poly.setAttribute("points", "3,2 13,7 3,12");
  svg.appendChild(poly);
  return svg;
}

function makePauseIcon() {
  const svg = makeSvg(14, 14);
  const pts = ["2,2 5,2 5,12 2,12", "9,2 12,2 12,12 9,12"];
  pts.forEach(p => {
    const r = document.createElementNS(svgNS, "polygon");
    r.setAttribute("points", p);
    svg.appendChild(r);
  });
  return svg;
}

const RING_CIRCUMFERENCE = 553;

const MODE_LABELS = {
  work:       "Focus Time",
  shortBreak: "Short Break",
  longBreak:  "Long Break",
};

let localInterval = null;

// ── Alarm Sound ───────────────────────────────────────────────────────────────
function playAlarm() {
  try {
    const audio = new Audio(chrome.runtime.getURL("icons/alarm.mp3"));
    audio.volume = 0.8;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch {}
}

// Listen for storage changes — fires alarm when background ends a session
chrome.storage.onChanged.addListener((changes) => {
  if (!changes.pomodoro) return;
  const newVal = changes.pomodoro.newValue;
  const oldVal = changes.pomodoro.oldValue;
  // Trigger alarm: timer was running, now stopped, and time reset to full (session ended)
  if (
    oldVal && oldVal.running &&
    newVal && !newVal.running &&
    newVal.time === newVal.totalTime
  ) {
    playAlarm();
  }
  if (newVal && typeof newVal.time === "number") {
     render(newVal);
}

});

// ── Render ────────────────────────────────────────────────────────────────────
function render(pomodoro) {
  if (!pomodoro) return;

  const { time, totalTime, mode, running, session, completedToday } = pomodoro;

  const m = String(Math.floor(time / 60)).padStart(2, "0");
  const s = String(time % 60).padStart(2, "0");
  timeDisplay.textContent = `${m}:${s}`;

  modeLabel.textContent = MODE_LABELS[mode] || "Focus Time";

  const pct = totalTime > 0 ? time / totalTime : 1;
  ringProgress.setAttribute("stroke-dashoffset", String(RING_CIRCUMFERENCE * (1 - pct)));

  app.setAttribute("data-mode", mode);

  // Swap button icon with DOM nodes — no innerHTML
  mainBtnIcon.replaceChildren(running ? makePauseIcon() : makePlayIcon());
  mainBtnLabel.textContent = running ? "Pause" : "Start";
  app.classList.toggle("running", running);

  tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));

  sessionCount.textContent = session;
  todayCount.textContent   = completedToday;
  totalMins.textContent    = `${completedToday * 25}m`;
  streakVal.textContent    = session;
}

// ── Local tick ────────────────────────────────────────────────────────────────
function startLocalTick() {
  clearInterval(localInterval);
  localInterval = setInterval(() => {
    chrome.storage.local.get("pomodoro", ({ pomodoro }) => {
      if (!pomodoro) return;
      if (pomodoro.running && pomodoro.startedAt) {
        const elapsed = Math.floor((Date.now() - pomodoro.startedAt) / 1000);
        pomodoro.time = Math.max(0, pomodoro.totalTime - elapsed);
      }
      render(pomodoro);
    });
  }, 500);
}

function stopLocalTick() {
  clearInterval(localInterval);
  localInterval = null;
}

// ── Controls ──────────────────────────────────────────────────────────────────
mainBtn.addEventListener("click", () => {
  chrome.storage.local.get("pomodoro", ({ pomodoro }) => {
    if (pomodoro.running) {
      chrome.runtime.sendMessage({ action: "pause" }, () => {
        stopLocalTick();
        chrome.storage.local.get("pomodoro", ({ pomodoro: p }) => render(p));
      });
    } else {
      chrome.runtime.sendMessage({ action: "start" }, () => {
        startLocalTick();
      });
    }
  });
});

resetBtn.addEventListener("click", () => {
  stopLocalTick();
  chrome.runtime.sendMessage({ action: "reset" }, () => {
    chrome.storage.local.get("pomodoro", ({ pomodoro }) => render(pomodoro));
  });
});

skipBtn.addEventListener("click", () => {
  chrome.storage.local.get("pomodoro", ({ pomodoro }) => {
    const nextMode =
      pomodoro.mode === "work"       ? "shortBreak" :
      pomodoro.mode === "shortBreak" ? "longBreak"  : "work";
    stopLocalTick();
    chrome.runtime.sendMessage({ action: "switchMode", mode: nextMode }, () => {
      chrome.storage.local.get("pomodoro", ({ pomodoro: p }) => render(p));
    });
  });
});

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    stopLocalTick();
    chrome.runtime.sendMessage({ action: "switchMode", mode: tab.dataset.mode }, () => {
      chrome.storage.local.get("pomodoro", ({ pomodoro }) => render(pomodoro));
    });
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
chrome.storage.local.get("pomodoro", ({ pomodoro }) => {
  if (pomodoro && pomodoro.running && pomodoro.startedAt) {
    const elapsed = Math.floor((Date.now() - pomodoro.startedAt) / 1000);
    pomodoro.time = Math.max(0, pomodoro.totalTime - elapsed);
  }
  render(pomodoro || {
    time: 25 * 60, totalTime: 25 * 60,
    mode: "work", running: false,
    session: 0, completedToday: 0,
  });
  if (pomodoro && pomodoro.running) startLocalTick();
});
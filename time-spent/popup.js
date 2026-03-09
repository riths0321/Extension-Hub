const STORAGE_KEYS = {
  sessionState: "sessionState",
  siteLimits: "siteLimits",
  timeData: "timeData"
};

const dateLabel = document.getElementById("dateLabel");
const totalTime = document.getElementById("totalTime");
const summaryNote = document.getElementById("summaryNote");
const siteCount = document.getElementById("siteCount");
const currentDomain = document.getElementById("currentDomain");
const limitStatus = document.getElementById("limitStatus");
const currentSpent = document.getElementById("currentSpent");
const currentLimit = document.getElementById("currentLimit");
const statusText = document.getElementById("statusText");
const statsList = document.getElementById("statsList");
const limitInput = document.getElementById("limitInput");
const saveLimitBtn = document.getElementById("saveLimitBtn");
const removeLimitBtn = document.getElementById("removeLimitBtn");
const clearBtn = document.getElementById("clearBtn");

let activeDomain = "";

document.addEventListener("DOMContentLoaded", () => {
  saveLimitBtn.addEventListener("click", saveLimit);
  removeLimitBtn.addEventListener("click", removeLimit);
  clearBtn.addEventListener("click", resetAllData);
  render();
});

async function render() {
  const today = new Date().toISOString().split("T")[0];
  dateLabel.textContent = today;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeDomain = normalizeDomain(activeTab?.url);

  const data = await chrome.storage.local.get([
    STORAGE_KEYS.sessionState,
    STORAGE_KEYS.siteLimits,
    STORAGE_KEYS.timeData
  ]);

  const timeData = structuredClone(data[STORAGE_KEYS.timeData] || {});
  const limits = data[STORAGE_KEYS.siteLimits] || {};
  const session = data[STORAGE_KEYS.sessionState];

  const todayData = timeData[today] || {};
  includeLiveSession(todayData, session);

  const entries = Object.entries(todayData).sort((a, b) => b[1] - a[1]);
  const totalSeconds = entries.reduce((sum, [, value]) => sum + value, 0);

  totalTime.textContent = formatDuration(totalSeconds);
  siteCount.textContent = String(entries.length);
  summaryNote.textContent = entries.length
    ? `${entries[0][0]} is the most visited site today.`
    : "No website activity tracked yet.";

  renderCurrentSite(todayData, limits);
  renderStats(entries, limits, totalSeconds);
}

function includeLiveSession(todayData, session) {
  if (!session?.domain || !session?.startTime) {
    return;
  }

  const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  if (elapsedSeconds <= 0 || elapsedSeconds > 60 * 60 * 12) {
    return;
  }

  todayData[session.domain] = (todayData[session.domain] || 0) + elapsedSeconds;
}

function renderCurrentSite(todayData, limits) {
  if (!activeDomain) {
    currentDomain.textContent = "No active website";
    currentSpent.textContent = "0m";
    currentLimit.textContent = "Unavailable";
    limitStatus.textContent = "Trackable page not open";
    setPillState("is-warning");
    limitInput.value = "";
    removeLimitBtn.disabled = true;
    return;
  }

  const spentSeconds = todayData[activeDomain] || 0;
  const limitMinutes = Number(limits[activeDomain] || 0);
  currentDomain.textContent = activeDomain;
  currentSpent.textContent = formatDuration(spentSeconds);
  currentLimit.textContent = limitMinutes > 0 ? `${limitMinutes} min` : "Not set";
  limitInput.value = limitMinutes > 0 ? String(limitMinutes) : "";
  removeLimitBtn.disabled = limitMinutes <= 0;

  if (limitMinutes <= 0) {
    limitStatus.textContent = "No limit";
    setPillState("");
    statusText.textContent = "Add a limit to enable alerts";
    return;
  }

  const limitSeconds = limitMinutes * 60;
  if (spentSeconds >= limitSeconds) {
    limitStatus.textContent = "Limit reached";
    setPillState("is-alert");
    statusText.textContent = `Alert active for ${activeDomain}`;
    return;
  }

  const percent = Math.round((spentSeconds / limitSeconds) * 100);
  limitStatus.textContent = `${percent}% used`;
  setPillState(percent >= 75 ? "is-warning" : "is-safe");
  statusText.textContent = `Tracking ${activeDomain} in real time`;
}

function renderStats(entries, limits, totalSeconds) {
  statsList.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Open a few websites and keep them active to start building your daily breakdown.";
    statsList.appendChild(empty);
    return;
  }

  entries.forEach(([domain, seconds]) => {
    const row = document.createElement("div");
    row.className = "site-row";

    const top = document.createElement("div");
    top.className = "site-row-top";

    const textWrap = document.createElement("div");

    const domainNode = document.createElement("div");
    domainNode.className = "site-domain";
    domainNode.textContent = domain;

    const meta = document.createElement("div");
    meta.className = "site-meta";
    meta.textContent = `${Math.max(1, Math.round((seconds / Math.max(totalSeconds, 1)) * 100))}% of today's tracked time`;

    textWrap.appendChild(domainNode);
    textWrap.appendChild(meta);

    const timeNode = document.createElement("div");
    timeNode.className = "site-time";
    timeNode.textContent = formatDuration(seconds);

    top.appendChild(textWrap);
    top.appendChild(timeNode);

    const progress = document.createElement("div");
    progress.className = "site-progress";

    const fill = document.createElement("div");
    fill.className = "site-progress-fill";
    fill.style.width = `${Math.min(100, Math.round((seconds / Math.max(totalSeconds, 1)) * 100))}%`;
    progress.appendChild(fill);

    row.appendChild(top);
    row.appendChild(progress);

    const limitMinutes = Number(limits[domain] || 0);
    if (limitMinutes > 0) {
      const limitLine = document.createElement("div");
      limitLine.className = "site-limit";
      limitLine.textContent =
        seconds >= limitMinutes * 60
          ? `Limit ${limitMinutes} min reached`
          : `Limit ${limitMinutes} min`;
      row.appendChild(limitLine);
    }

    statsList.appendChild(row);
  });
}

async function saveLimit() {
  if (!activeDomain) {
    statusText.textContent = "Open a normal website to set a limit";
    return;
  }

  const minutes = Number(limitInput.value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    statusText.textContent = "Enter a valid minute value";
    return;
  }

  const data = await chrome.storage.local.get([STORAGE_KEYS.siteLimits]);
  const limits = data[STORAGE_KEYS.siteLimits] || {};
  limits[activeDomain] = Math.round(minutes);
  await chrome.storage.local.set({ [STORAGE_KEYS.siteLimits]: limits });
  statusText.textContent = `Saved ${limits[activeDomain]} min limit for ${activeDomain}`;
  render();
}

async function removeLimit() {
  if (!activeDomain) {
    return;
  }

  const data = await chrome.storage.local.get([STORAGE_KEYS.siteLimits]);
  const limits = data[STORAGE_KEYS.siteLimits] || {};
  delete limits[activeDomain];
  await chrome.storage.local.set({ [STORAGE_KEYS.siteLimits]: limits });
  statusText.textContent = `Removed limit for ${activeDomain}`;
  render();
}

async function resetAllData() {
  if (!window.confirm("Delete all tracked time and saved limits?")) {
    return;
  }

  await chrome.storage.local.set({
    alertsSent: {},
    sessionState: null,
    siteLimits: {},
    timeData: {}
  });
  statusText.textContent = "All tracking data cleared";
  render();
}

function setPillState(stateClass) {
  limitStatus.className = "pill";
  if (stateClass) {
    limitStatus.classList.add(stateClass);
  }
}

function normalizeDomain(url) {
  try {
    const parsed = new URL(url || "");
    if (!/^https?:$/.test(parsed.protocol)) {
      return "";
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

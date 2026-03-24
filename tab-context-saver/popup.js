const DEFAULT_SETTINGS = {
  autoSave: true,
  preservePinned: true,
  maxSessions: 50,
  confirmRestore: true
};

const state = {
  currentMode: "custom",
  sessions: [],
  filteredSessions: [],
  settings: { ...DEFAULT_SETTINGS },
  openTabCount: 0
};

const sessionsList = document.getElementById("sessionsList");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadState();
  render();
});

function bindEvents() {
  document.getElementById("saveBtn").addEventListener("click", openSaveModal);
  document.getElementById("restoreBtn").addEventListener("click", restoreLatestSession);
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });
  document.querySelectorAll(".mode-option").forEach((button) => {
    button.addEventListener("click", () => selectModalMode(button.dataset.mode));
  });
  document.getElementById("confirmSaveBtn").addEventListener("click", saveCurrentSession);
  document.getElementById("cancelSaveBtn").addEventListener("click", closeSaveModal);
  document.getElementById("settingsBtn").addEventListener("click", openSettingsModal);
  document.getElementById("cancelSettingsBtn").addEventListener("click", closeSettingsModal);
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  document.getElementById("saveModal").addEventListener("click", (event) => {
    if (event.target.id === "saveModal") {
      closeSaveModal();
    }
  });
  document.getElementById("settingsModal").addEventListener("click", (event) => {
    if (event.target.id === "settingsModal") {
      closeSettingsModal();
    }
  });
  document.addEventListener("keydown", handleKeyboardShortcuts);
  chrome.storage.onChanged.addListener(handleStorageChanges);
}

async function loadState() {
  const [tabs, storageData, settingsResponse] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    chrome.storage.local.get(["sessions"]),
    chrome.runtime.sendMessage({ action: "getSettings" })
  ]);

  state.openTabCount = tabs.length;
  state.sessions = Array.isArray(storageData.sessions) ? storageData.sessions : [];
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(settingsResponse?.settings || {})
  };
  fillSettingsForm();
  applyFilters();
}

function render() {
  renderSummary();
  renderSessions();
}

function renderSummary() {
  document.getElementById("openTabCount").textContent = String(state.openTabCount);
  document.getElementById("savedCount").textContent = String(state.sessions.length);
  document.getElementById("latestLabel").textContent = state.sessions.length
    ? getTimeAgo(state.sessions[0].timestamp)
    : "None";
}

function renderSessions() {
  sessionsList.replaceChildren();

  if (!state.filteredSessions.length) {
    emptyState.classList.remove("hidden");
    sessionsList.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  sessionsList.classList.remove("hidden");

  state.filteredSessions.forEach((session) => {
    sessionsList.appendChild(createSessionCard(session));
  });
}

function createSessionCard(session) {
  const card = document.createElement("article");
  card.className = "session-card";

  const top = document.createElement("div");
  top.className = "session-top";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "session-name";
  title.textContent = session.name;

  const badge = document.createElement("span");
  badge.className = "session-badge";
  badge.textContent = session.mode || "custom";

  titleWrap.append(title, badge);

  const meta = document.createElement("div");
  meta.className = "session-meta";
  meta.textContent = `${session.tabCount} tabs • ${getTimeAgo(session.timestamp)}`;

  titleWrap.appendChild(meta);
  top.appendChild(titleWrap);

  const preview = document.createElement("ul");
  preview.className = "session-preview";
  session.tabs.slice(0, 3).forEach((tab) => {
    const item = document.createElement("li");
    item.textContent = tab.title || tab.url;
    preview.appendChild(item);
  });

  const actions = document.createElement("div");
  actions.className = "session-actions";

  const restore = document.createElement("button");
  restore.type = "button";
  restore.className = "session-action";
  restore.textContent = "Restore";
  restore.addEventListener("click", () => restoreSession(session.id, session.name));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "session-action danger";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => deleteSession(session.id));

  actions.append(restore, remove);
  card.append(top, preview, actions);
  return card;
}

function applyFilters() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  state.filteredSessions = [...state.sessions]
    .filter((session) => {
      const matchesMode = state.currentMode === "custom" ? true : session.mode === state.currentMode;
      const matchesQuery =
        !query ||
        session.name.toLowerCase().includes(query) ||
        session.tabs.some((tab) => (tab.title || "").toLowerCase().includes(query));
      return matchesMode && matchesQuery;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  render();
}

function selectMode(mode) {
  state.currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  applyFilters();
}

function selectModalMode(mode) {
  document.querySelectorAll(".mode-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

function openSaveModal() {
  document.getElementById("sessionNameInput").value = suggestSessionName();
  document.getElementById("saveModal").classList.add("active");
}

function closeSaveModal() {
  document.getElementById("saveModal").classList.remove("active");
}

async function saveCurrentSession() {
  const input = document.getElementById("sessionNameInput");
  const activeMode = document.querySelector(".mode-option.active")?.dataset.mode || "custom";
  const response = await chrome.runtime.sendMessage({
    action: "saveSession",
    data: {
      mode: activeMode,
      name: input.value.trim() || suggestSessionName()
    }
  });

  if (!response?.success) {
    showToast(response?.error || "Could not save session", "is-error");
    return;
  }

  closeSaveModal();
  await loadState();
  render();
  showToast("Session saved", "is-success");
}

async function restoreLatestSession() {
  if (!state.sessions.length) {
    showToast("No saved session available", "is-error");
    return;
  }
  await restoreSession(state.sessions[0].id, state.sessions[0].name);
}

async function restoreSession(sessionId, sessionName) {
  if (state.settings.confirmRestore) {
    const approved = window.confirm(`Restore "${sessionName}"? Current window tabs will be replaced.`);
    if (!approved) {
      return;
    }
  }

  const response = await chrome.runtime.sendMessage({
    action: "restoreSession",
    sessionId
  });

  if (!response?.success) {
    showToast(response?.error || "Restore failed", "is-error");
    return;
  }

  showToast(`Restored ${response.restoredTabs} tabs`, "is-success");
  window.close();
}

async function deleteSession(sessionId) {
  const approved = window.confirm("Delete this saved session?");
  if (!approved) {
    return;
  }

  const response = await chrome.runtime.sendMessage({
    action: "deleteSession",
    sessionId
  });

  if (!response?.success) {
    showToast(response?.error || "Delete failed", "is-error");
    return;
  }

  await loadState();
  render();
  showToast("Session deleted", "is-success");
}

function openSettingsModal() {
  fillSettingsForm();
  document.getElementById("settingsModal").classList.add("active");
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("active");
}

async function saveSettings() {
  const nextSettings = {
    autoSave: document.getElementById("autoSaveSetting").checked,
    preservePinned: document.getElementById("preservePinnedSetting").checked,
    confirmRestore: document.getElementById("confirmRestoreSetting").checked,
    maxSessions: clampNumber(Number(document.getElementById("maxSessionsSetting").value), 10, 200, 50)
  };

  const response = await chrome.runtime.sendMessage({
    action: "updateSettings",
    data: nextSettings
  });

  if (!response?.success) {
    showToast("Could not save settings", "is-error");
    return;
  }

  state.settings = nextSettings;
  closeSettingsModal();
  showToast("Settings saved", "is-success");
}

function fillSettingsForm() {
  document.getElementById("autoSaveSetting").checked = state.settings.autoSave;
  document.getElementById("preservePinnedSetting").checked = state.settings.preservePinned;
  document.getElementById("confirmRestoreSetting").checked = state.settings.confirmRestore;
  document.getElementById("maxSessionsSetting").value = String(state.settings.maxSessions);
}

function handleKeyboardShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    document.getElementById("searchInput").focus();
    return;
  }

  if (event.key === "Escape") {
    if (document.getElementById("saveModal").classList.contains("active")) {
      closeSaveModal();
      return;
    }
    if (document.getElementById("settingsModal").classList.contains("active")) {
      closeSettingsModal();
      return;
    }
    window.close();
  }
}

async function handleStorageChanges(changes, areaName) {
  if (areaName !== "local") {
    return;
  }

  if (changes.sessions || changes.settings) {
    await loadState();
    render();
  }
}

function suggestSessionName() {
  const mode = document.querySelector(".mode-btn.active")?.dataset.mode || "custom";
  return `${capitalize(mode)} session ${new Date().toLocaleDateString()}`;
}

function showToast(text, className) {
  toast.textContent = text;
  toast.className = "toast";
  if (className) {
    toast.classList.add(className);
  }
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

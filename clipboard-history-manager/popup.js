const DEFAULT_SETTINGS = {
  autoSave: true,
  maxItems: 50,
  notifications: true
};

const state = {
  clipboardItems: [],
  filteredItems: [],
  settings: { ...DEFAULT_SETTINGS },
  totalSaves: 0,
  view: "recent"
};

const clipboardList = document.getElementById("clipboardList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterPanel = document.getElementById("filterPanel");
const toast = document.getElementById("toast");
const activeView = document.getElementById("activeView");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadState();
  render();
});

function bindEvents() {
  searchInput.addEventListener("input", applyFilters);
  document.getElementById("filterBtn").addEventListener("click", toggleFilterPanel);
  document.querySelectorAll("#filterPanel input").forEach((input) => {
    input.addEventListener("change", applyFilters);
  });
  document.getElementById("clearAllBtn").addEventListener("click", clearAllItems);
  document.getElementById("testCopyBtn").addEventListener("click", addDemoItems);
  document.getElementById("recentBtn").addEventListener("click", () => switchView("recent"));
  document.getElementById("pinModeBtn").addEventListener("click", () => switchView("pinned"));
  document.getElementById("frequentBtn").addEventListener("click", () => switchView("frequent"));
  document.getElementById("settingsBtn").addEventListener("click", openSettings);
  document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("resetSettings").addEventListener("click", resetSettings);
  document.getElementById("settingsModal").addEventListener("click", (event) => {
    if (event.target.id === "settingsModal") {
      closeSettings();
    }
  });
  document.addEventListener("keydown", handleKeyboardShortcuts);
  chrome.storage.onChanged.addListener(handleStorageChanges);
}

async function loadState() {
  const data = await chrome.storage.local.get([
    "clipboardHistory",
    "clipboardSettings",
    "totalSaves"
  ]);
  state.clipboardItems = Array.isArray(data.clipboardHistory) ? data.clipboardHistory : [];
  state.settings = { ...DEFAULT_SETTINGS, ...(data.clipboardSettings || {}) };
  state.totalSaves = typeof data.totalSaves === "number" ? data.totalSaves : 0;
  fillSettingsForm();
  applyFilters();
}

function render() {
  renderStats();
  renderList();
}

function renderStats() {
  document.getElementById("itemCount").textContent = String(state.filteredItems.length);
  document.getElementById("totalSaves").textContent = String(state.totalSaves);
  activeView.textContent = capitalize(state.view);
}

function renderList() {
  clipboardList.replaceChildren();

  if (!state.filteredItems.length) {
    emptyState.classList.remove("hidden");
    clipboardList.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  clipboardList.classList.remove("hidden");

  state.filteredItems.forEach((item) => {
    clipboardList.appendChild(createClipboardItem(item));
  });
}

function createClipboardItem(item) {
  const card = document.createElement("article");
  card.className = "clipboard-item";

  const head = document.createElement("div");
  head.className = "item-head";

  const type = document.createElement("span");
  type.className = `item-type type-${item.type || "text"}`;
  type.textContent = getTypeLabel(item.type);

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const pinButton = createMiniButton(item.pinned ? "Unpin" : "Pin");
  pinButton.addEventListener("click", () => togglePin(item.timestamp));

  const copyButton = createMiniButton("Copy");
  copyButton.addEventListener("click", () => handleCopyItem(item));

  const pasteButton = createMiniButton("Paste");
  pasteButton.addEventListener("click", () => handlePasteItem(item));

  const deleteButton = createMiniButton("Delete", true);
  deleteButton.addEventListener("click", () => deleteItem(item.timestamp));

  actions.append(pinButton, copyButton, pasteButton, deleteButton);
  head.append(type, actions);

  const content = document.createElement("div");
  content.className = "item-content";
  content.textContent = item.content.length > 220 ? `${item.content.slice(0, 217)}...` : item.content;

  const footer = document.createElement("div");
  footer.className = "item-footer clipboard-meta";

  const time = document.createElement("span");
  time.textContent = getTimeAgo(item.timestamp);

  const usage = document.createElement("span");
  usage.textContent = `${item.usageCount || 0} uses`;

  footer.append(time, usage);
  card.append(head, content, footer);
  return card;
}

function createMiniButton(text, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = danger ? "icon-btn danger" : "icon-btn";
  button.textContent = text;
  return button;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const showText = document.getElementById("filterText").checked;
  const showLinks = document.getElementById("filterLinks").checked;
  const showCode = document.getElementById("filterCode").checked;
  const todayOnly = document.getElementById("filterToday").checked;
  const today = new Date().toDateString();

  let items = [...state.clipboardItems];

  if (state.view === "pinned") {
    items = items.filter((item) => item.pinned);
  } else if (state.view === "frequent") {
    items = items.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else {
    items = items.sort((a, b) => b.timestamp - a.timestamp);
  }

  state.filteredItems = items.filter((item) => {
    if (item.type === "text" && !showText) {
      return false;
    }
    if (item.type === "link" && !showLinks) {
      return false;
    }
    if (item.type === "code" && !showCode) {
      return false;
    }
    if (todayOnly && new Date(item.timestamp).toDateString() !== today) {
      return false;
    }
    if (query && !item.content.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  render();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view-btn").forEach((button) => {
    button.classList.toggle("active", button.id === `${view === "pinned" ? "pinMode" : view}Btn`);
  });
  applyFilters();
}

function toggleFilterPanel() {
  filterPanel.classList.toggle("active");
}

async function togglePin(timestamp) {
  state.clipboardItems = state.clipboardItems.map((item) =>
    item.timestamp === timestamp ? { ...item, pinned: !item.pinned } : item
  );
  await persistHistory();
  applyFilters();
  showToast("Pin status updated", "is-success");
}

async function deleteItem(timestamp) {
  state.clipboardItems = state.clipboardItems.filter((item) => item.timestamp !== timestamp);
  await persistHistory();
  applyFilters();
  showToast("Item deleted", "is-success");
}

async function clearAllItems() {
  if (!window.confirm("Delete all clipboard history?")) {
    return;
  }

  state.clipboardItems = [];
  await chrome.storage.local.set({ clipboardHistory: [] });
  applyFilters();
  showToast("Clipboard history cleared", "is-success");
}

async function handleCopyItem(item) {
  try {
    await navigator.clipboard.writeText(item.content);
    await chrome.runtime.sendMessage({ action: "copyItem", text: item.content });
    await refreshHistory();
    showToast("Copied to clipboard", "is-success");
  } catch (_error) {
    showToast("Copy failed", "is-error");
  }
}

async function handlePasteItem(item) {
  await handleCopyItem(item);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showToast("No active page found", "is-error");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: insertTextIntoActiveField,
      args: [item.content]
    });

    if (results?.[0]?.result?.pasted) {
      showToast("Pasted into active field", "is-success");
    } else {
      showToast("Copied. Focus a text field to paste.", "is-success");
    }
  } catch (_error) {
    showToast("Copied. Paste manually on this page.", "is-error");
  }
}

async function addDemoItems() {
  const demoItems = [
    "https://github.com/openai/openai-cookbook",
    "const campaignName = 'spring_launch';",
    "Client call moved to 3 PM tomorrow.",
    "https://docs.example.com/design-system/colors",
    "npm install clipboard-history-manager"
  ];

  for (const entry of demoItems.reverse()) {
    state.clipboardItems.unshift({
      content: entry,
      pinned: false,
      timestamp: Date.now() + Math.floor(Math.random() * 1000),
      type: detectType(entry),
      usageCount: 0
    });
  }

  state.clipboardItems = trimHistory(state.clipboardItems, state.settings.maxItems);
  state.totalSaves += demoItems.length;
  await chrome.storage.local.set({
    clipboardHistory: state.clipboardItems,
    totalSaves: state.totalSaves
  });
  applyFilters();
  showToast("Demo items added", "is-success");
}

function openSettings() {
  fillSettingsForm();
  document.getElementById("settingsModal").classList.add("active");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.remove("active");
}

async function saveSettings() {
  state.settings = {
    autoSave: document.getElementById("autoSave").checked,
    notifications: document.getElementById("notifications").checked,
    maxItems: clampNumber(Number(document.getElementById("maxItems").value), 10, 200, 50)
  };

  state.clipboardItems = trimHistory(state.clipboardItems, state.settings.maxItems);
  await chrome.storage.local.set({
    clipboardHistory: state.clipboardItems,
    clipboardSettings: state.settings
  });
  closeSettings();
  applyFilters();
  showToast("Settings saved", "is-success");
}

function resetSettings() {
  state.settings = { ...DEFAULT_SETTINGS };
  fillSettingsForm();
  showToast("Defaults restored", "is-success");
}

function fillSettingsForm() {
  document.getElementById("autoSave").checked = state.settings.autoSave;
  document.getElementById("notifications").checked = state.settings.notifications;
  document.getElementById("maxItems").value = String(state.settings.maxItems);
}

function handleKeyboardShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    searchInput.focus();
    return;
  }

  if (event.key === "Escape") {
    if (document.getElementById("settingsModal").classList.contains("active")) {
      closeSettings();
    } else {
      window.close();
    }
  }
}

async function handleStorageChanges(changes, areaName) {
  if (areaName !== "local") {
    return;
  }

  if (changes.clipboardHistory || changes.clipboardSettings || changes.totalSaves) {
    await loadState();
  }
}

async function refreshHistory() {
  const data = await chrome.storage.local.get(["clipboardHistory", "totalSaves"]);
  state.clipboardItems = Array.isArray(data.clipboardHistory) ? data.clipboardHistory : [];
  state.totalSaves = typeof data.totalSaves === "number" ? data.totalSaves : state.totalSaves;
  applyFilters();
}

async function persistHistory() {
  await chrome.storage.local.set({ clipboardHistory: state.clipboardItems });
}

function showToast(text, className) {
  toast.textContent = text;
  toast.className = "toast";
  if (className) {
    toast.classList.add(className);
  }
}

function getTypeLabel(type) {
  if (type === "link") {
    return "Link";
  }
  if (type === "code") {
    return "Code";
  }
  return "Text";
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

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function detectType(text) {
  if (/^https?:\/\//i.test(text)) {
    return "link";
  }
  if (/function\s|\bconst\b|\blet\b|\bvar\b|=>|{|}|;|<\/?[a-z]/i.test(text)) {
    return "code";
  }
  return "text";
}

function trimHistory(items, maxItems) {
  const limit = clampNumber(maxItems, 10, 200, 50);
  const pinned = items.filter((item) => item.pinned);
  const rest = items.filter((item) => !item.pinned);
  return [...pinned, ...rest].slice(0, limit);
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function insertTextIntoActiveField(text) {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return { pasted: false };
  }

  const isTextInput =
    activeElement.tagName === "TEXTAREA" ||
    (activeElement.tagName === "INPUT" &&
      /^(text|search|url|tel|password|email)$/i.test(activeElement.type || "text"));

  if (isTextInput) {
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    const value = activeElement.value || "";
    activeElement.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    const cursor = start + text.length;
    activeElement.setSelectionRange(cursor, cursor);
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    activeElement.focus();
    return { pasted: true };
  }

  if (activeElement.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      activeElement.textContent += text;
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    activeElement.focus();
    return { pasted: true };
  }

  return { pasted: false };
}

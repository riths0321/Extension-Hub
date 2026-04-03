
"use strict";

// ─── DOM References ─────────────────────────────────────────────
const titleEl          = document.getElementById("title");
const urlInput         = document.getElementById("url");
const sourceInput      = document.getElementById("source");
const mediumInput      = document.getElementById("medium");
const campaignInput    = document.getElementById("campaign");
const termInput        = document.getElementById("term");
const contentInput     = document.getElementById("content");
const utmIdInput       = document.getElementById("utmId");
const result           = document.getElementById("result");
const copyBtn          = document.getElementById("copy");
const clearBtn         = document.getElementById("clear");
const msgEl            = document.getElementById("message");
const statusPill       = document.getElementById("statusPill");
const lengthMeta       = document.getElementById("lengthMeta");
const lengthWarning    = document.getElementById("lengthWarning");
const themeToggle      = document.getElementById("themeToggle");
const themeIcon        = themeToggle.querySelector(".theme-icon");
const copyFormat       = document.getElementById("copyFormat");
const copyFormatMenu   = document.getElementById("copyFormatMenu");
const copyFormatTrigger= document.getElementById("copyFormatTrigger");
const copyFormatLabel  = document.getElementById("copyFormatLabel");
const copyFormatOptions= document.getElementById("copyFormatOptions");
const qrToggle         = document.getElementById("qrToggle");
const qrContainer      = document.getElementById("qrContainer");
const qrImg            = document.getElementById("qrImg");
const qrDownload       = document.getElementById("qrDownload");
const exportCsvBtn     = document.getElementById("exportCsv");
const clearHistoryBtn  = document.getElementById("clearHistory");
const historyList      = document.getElementById("historyList");
const historyCount     = document.getElementById("historyCount");
const builtinPresetsEl = document.getElementById("builtinPresets");
const customPresetsList= document.getElementById("customPresetsList");
const savePresetBtn    = document.getElementById("savePreset");
const savePresetForm   = document.getElementById("savePresetForm");
const presetNameInput  = document.getElementById("presetNameInput");
const confirmSaveBtn   = document.getElementById("confirmSavePreset");
const cancelSaveBtn    = document.getElementById("cancelSavePreset");
const copyFormatOptionEls = Array.from(document.querySelectorAll(".select-option"));

const allInputs = [urlInput, sourceInput, mediumInput, campaignInput, termInput, contentInput, utmIdInput];

// ─── Constants ──────────────────────────────────────────────────
const MAX_HISTORY      = 15;
const MAX_CUSTOM_PRESETS = 10;
const WARN_URL_LENGTH  = 2000;
const QR_API_BASE      = "https://api.qrserver.com/v1/create-qr-code/?size=148x148&data=";

const BUILTIN_PRESETS = [
  { name: "Google CPC",       icon: "🔍", source: "google",       medium: "cpc"         },
  { name: "Facebook Paid",    icon: "📘", source: "facebook",     medium: "paid_social"  },
  { name: "Email Newsletter", icon: "📧", source: "newsletter",   medium: "email"        },
  { name: "LinkedIn",         icon: "💼", source: "linkedin",     medium: "social"       },
  { name: "Instagram Story",  icon: "📸", source: "instagram",    medium: "story"        },
  { name: "Twitter / X",      icon: "🐦", source: "twitter",      medium: "social"       },
  { name: "YouTube Video",    icon: "▶️",  source: "youtube",      medium: "video"        },
  { name: "WhatsApp",         icon: "💬", source: "whatsapp",     medium: "referral"     },
];

// ─── State ──────────────────────────────────────────────────────
let currentUrl     = "";
let linkHistory    = [];
let customPresets  = [];
let isDark         = false;
let qrVisible      = false;
let lastSavedUrl   = "";
let saveHistoryTimer;

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  titleEl.textContent = (typeof chrome !== "undefined" && chrome.i18n)
    ? (chrome.i18n.getMessage("appName") || "UTM Link Builder")
    : "UTM Link Builder";

  // Load persisted data
  try {
    const data = await chrome.storage.local.get(["utm_history", "utm_presets", "utm_theme"]);
    linkHistory   = data.utm_history  || [];
    customPresets = data.utm_presets  || [];
    isDark        = data.utm_theme === "dark";
  } catch (_) { /* extension storage unavailable */ }

  applyTheme();
  renderBuiltinPresets();
  renderCustomPresets();
  renderHistory();

  // Input listeners
  allInputs.forEach(input => input.addEventListener("input", generate));
  copyBtn.addEventListener("click", copyResult);
  clearBtn.addEventListener("click", clearFields);
  themeToggle.addEventListener("click", toggleTheme);
  qrToggle.addEventListener("click", toggleQr);
  exportCsvBtn.addEventListener("click", exportCsv);
  clearHistoryBtn.addEventListener("click", clearAllHistory);
  savePresetBtn.addEventListener("click", showSaveForm);
  confirmSaveBtn.addEventListener("click", confirmSave);
  cancelSaveBtn.addEventListener("click", hideSaveForm);
  initCopyFormatMenu();
  presetNameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") confirmSave();
    if (e.key === "Escape") hideSaveForm();
  });
  document.addEventListener("keydown", handleShortcuts);

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  generate();
});

// ────────────────────────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────────────────────────

function applyTheme() {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
}

function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  try { chrome.storage.local.set({ utm_theme: isDark ? "dark" : "light" }); } catch (_) {}
}

// ────────────────────────────────────────────────────────────────
// TABS
// ────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".tab-content").forEach(el => {
    el.classList.toggle("active", el.id === `tab-${tabId}`);
  });
}

// ────────────────────────────────────────────────────────────────
// GENERATE
// ────────────────────────────────────────────────────────────────

function generate() {
  clearMsg();

  const baseUrl  = urlInput.value.trim();
  const source   = sourceInput.value.trim();
  const medium   = mediumInput.value.trim();
  const campaign = campaignInput.value.trim();
  const term     = termInput.value.trim();
  const content  = contentInput.value.trim();
  const utmId    = utmIdInput.value.trim();

  // Empty state
  if (!baseUrl && !source && !medium && !campaign && !term && !content && !utmId) {
    result.value = "";
    currentUrl = "";
    setStatus("Waiting", "");
    updateMeta();
    hideQr();
    return;
  }

  // Incomplete
  if (!baseUrl || !source || !medium || !campaign) {
    result.value = "";
    currentUrl = "";
    setStatus("Incomplete", "is-error");
    showMsg("Fill in Base URL, Source, Medium, and Campaign to generate.", "is-error");
    updateMeta();
    hideQr();
    return;
  }

  // Validate URL
  let urlObj;
  try {
    urlObj = new URL(baseUrl);
  } catch (_) {
    result.value = "";
    currentUrl = "";
    setStatus("Invalid URL", "is-error");
    showMsg("Enter a valid URL starting with https:// or http://", "is-error");
    updateMeta();
    hideQr();
    return;
  }

  // Build UTM params
  const params = {
    utm_source:   source,
    utm_medium:   medium,
    utm_campaign: campaign,
    utm_term:     term,
    utm_content:  content,
    utm_id:       utmId,
  };

  for (const [key, val] of Object.entries(params)) {
    if (val) {
      urlObj.searchParams.set(key, val);
    } else {
      urlObj.searchParams.delete(key);
    }
  }

  const generated = urlObj.toString();

  result.value = generated;
  currentUrl   = generated;
  setStatus("Ready ✓", "is-success");
  showMsg("UTM link generated successfully.", "is-success");
  updateMeta();

  // Debounced history save
  if (generated !== lastSavedUrl) {
    lastSavedUrl = generated;
    clearTimeout(saveHistoryTimer);
    saveHistoryTimer = setTimeout(() => {
      addToHistory(generated, { source, medium, campaign });
      renderHistory();
    }, 600);
  }

  // Update QR if open
  if (qrVisible) updateQrImage();
}

// ────────────────────────────────────────────────────────────────
// COPY
// ────────────────────────────────────────────────────────────────

async function copyResult() {
  if (!currentUrl) {
    setStatus("Nothing to copy", "is-error");
    showMsg("Generate a UTM link first.", "is-error");
    return;
  }

  const format = copyFormat.value;
  let text = currentUrl;

  if (format === "markdown") {
    text = `[Visit Page](${currentUrl})`;
  } else if (format === "html") {
    text = `<a href="${currentUrl}">Visit Page</a>`;
  }

  try {
    await navigator.clipboard.writeText(text);
    const labels = { url: "plain URL", markdown: "Markdown", html: "HTML anchor" };
    setStatus("Copied!", "is-success");
    showMsg(`Copied as ${labels[format] || "URL"}.`, "is-success");
  } catch (_) {
    setStatus("Copy failed", "is-error");
    showMsg("Clipboard access failed. Try manually selecting the URL.", "is-error");
  }
}

// ────────────────────────────────────────────────────────────────
// COPY FORMAT MENU
// ────────────────────────────────────────────────────────────────

function initCopyFormatMenu() {
  syncCopyFormatMenu();

  copyFormatTrigger.addEventListener("click", () => {
    setCopyFormatMenuOpen(copyFormatOptions.classList.contains("hidden"));
  });

  copyFormatTrigger.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setCopyFormatMenuOpen(true);
    }
  });

  copyFormatOptionEls.forEach(option => {
    option.addEventListener("click", () => {
      copyFormat.value = option.dataset.value;
      syncCopyFormatMenu();
      setCopyFormatMenuOpen(false);
      copyFormatTrigger.focus();
    });
  });

  document.addEventListener("click", e => {
    if (!copyFormatMenu.contains(e.target)) {
      setCopyFormatMenuOpen(false);
    }
  });
}

function syncCopyFormatMenu() {
  const selectedOption = copyFormat.options[copyFormat.selectedIndex];
  copyFormatLabel.textContent = selectedOption ? selectedOption.textContent : "Plain URL";

  copyFormatOptionEls.forEach(option => {
    const selected = option.dataset.value === copyFormat.value;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
  });
}

function setCopyFormatMenuOpen(isOpen) {
  copyFormatMenu.classList.toggle("is-open", isOpen);
  copyFormatOptions.classList.toggle("hidden", !isOpen);
  copyFormatTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

// ────────────────────────────────────────────────────────────────
// CLEAR
// ────────────────────────────────────────────────────────────────

function clearFields() {
  allInputs.forEach(input => { input.value = ""; });
  result.value = "";
  currentUrl = "";
  lastSavedUrl = "";
  setStatus("Waiting", "");
  clearMsg();
  updateMeta();
  hideQr();
  urlInput.focus();
}

// ────────────────────────────────────────────────────────────────
// QR CODE
// ────────────────────────────────────────────────────────────────

function toggleQr() {
  if (!currentUrl) {
    showMsg("Generate a UTM link first, then create its QR code.", "is-error");
    return;
  }
  qrVisible = !qrVisible;
  if (qrVisible) {
    updateQrImage();
    qrContainer.classList.remove("hidden");
    qrToggle.textContent = "✕ Hide QR";
  } else {
    hideQr();
  }
}

function updateQrImage() {
  const encoded = encodeURIComponent(currentUrl);
  const src = `${QR_API_BASE}${encoded}`;
  qrImg.src = src;
  qrDownload.href = src;
}

function hideQr() {
  qrVisible = false;
  qrContainer.classList.add("hidden");
  qrToggle.textContent = "⊞ Generate QR";
}

// ────────────────────────────────────────────────────────────────
// HISTORY
// ────────────────────────────────────────────────────────────────

function addToHistory(url, { source, medium, campaign }) {
  // Remove duplicate
  linkHistory = linkHistory.filter(item => item.url !== url);
  linkHistory.unshift({ url, source, medium, campaign, ts: Date.now() });
  linkHistory = linkHistory.slice(0, MAX_HISTORY);
  try { chrome.storage.local.set({ utm_history: linkHistory }); } catch (_) {}
}

function renderHistory() {
  const count = linkHistory.length;
  historyCount.textContent = count === 0 ? "" : `${count} of ${MAX_HISTORY} links saved`;
  historyList.replaceChildren();

  if (count === 0) {
    historyList.appendChild(createEmptyState("No links yet — start building in the Builder tab!"));
    return;
  }

  linkHistory.forEach((item, i) => {
    const d = new Date(item.ts);
    const timeStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const displayUrl = item.url.length > 58 ? item.url.slice(0, 58) + "…" : item.url;
    const itemEl = document.createElement("div");
    itemEl.className = "history-item";

    const bodyEl = document.createElement("div");
    bodyEl.className = "history-item-body";

    const urlEl = document.createElement("div");
    urlEl.className = "history-item-url";
    urlEl.title = item.url;
    urlEl.textContent = displayUrl;

    const metaEl = document.createElement("div");
    metaEl.className = "history-item-meta";
    metaEl.textContent = `${item.source} · ${item.medium} · ${timeStr}`;

    bodyEl.append(urlEl, metaEl);

    const actionsEl = document.createElement("div");
    actionsEl.className = "history-item-actions";
    actionsEl.append(
      createHistoryActionButton("copy", i, "Copy URL", "📋"),
      createHistoryActionButton("load", i, "Load into Builder", "↑"),
      createHistoryActionButton("delete", i, "Remove", "✕")
    );

    itemEl.append(bodyEl, actionsEl);
    historyList.appendChild(itemEl);
  });
}

async function onHistoryAction(e) {
  const btn  = e.currentTarget;
  const idx  = parseInt(btn.dataset.i, 10);
  const item = linkHistory[idx];
  if (!item) return;

  if (btn.dataset.action === "copy") {
    try {
      await navigator.clipboard.writeText(item.url);
      showMsg("URL copied from history.", "is-success");
    } catch (_) {
      showMsg("Copy failed.", "is-error");
    }

  } else if (btn.dataset.action === "load") {
    loadUrlIntoBuilder(item.url);
    switchTab("builder");
    showMsg("Link loaded into Builder.", "is-success");

  } else if (btn.dataset.action === "delete") {
    linkHistory.splice(idx, 1);
    try { chrome.storage.local.set({ utm_history: linkHistory }); } catch (_) {}
    renderHistory();
  }
}

function loadUrlIntoBuilder(urlStr) {
  try {
    const u = new URL(urlStr);
    urlInput.value      = u.origin + u.pathname;
    sourceInput.value   = u.searchParams.get("utm_source")   || "";
    mediumInput.value   = u.searchParams.get("utm_medium")   || "";
    campaignInput.value = u.searchParams.get("utm_campaign") || "";
    termInput.value     = u.searchParams.get("utm_term")     || "";
    contentInput.value  = u.searchParams.get("utm_content")  || "";
    utmIdInput.value    = u.searchParams.get("utm_id")       || "";
    generate();
  } catch (_) {}
}

function clearAllHistory() {
  if (linkHistory.length === 0) { showMsg("History is already empty.", "is-error"); return; }

  // Two-click confirmation pattern
  if (clearHistoryBtn.dataset.confirm === "1") {
    linkHistory = [];
    try { chrome.storage.local.set({ utm_history: [] }); } catch (_) {}
    renderHistory();
    clearHistoryBtn.textContent = "🗑 Clear";
    delete clearHistoryBtn.dataset.confirm;
    showMsg("History cleared.", "is-success");
  } else {
    clearHistoryBtn.textContent = "⚠ Confirm?";
    clearHistoryBtn.dataset.confirm = "1";
    setTimeout(() => {
      clearHistoryBtn.textContent = "🗑 Clear";
      delete clearHistoryBtn.dataset.confirm;
    }, 2800);
  }
}

function exportCsv() {
  if (linkHistory.length === 0) {
    showMsg("No history to export.", "is-error");
    return;
  }

  const headers = ["URL", "Source", "Medium", "Campaign", "Date"];
  const rows = linkHistory.map(item => [
    `"${item.url.replace(/"/g, '""')}"`,
    `"${(item.source || "").replace(/"/g, '""')}"`,
    `"${(item.medium || "").replace(/"/g, '""')}"`,
    `"${(item.campaign || "").replace(/"/g, '""')}"`,
    `"${new Date(item.ts).toISOString()}"`,
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `utm-history-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);

  showMsg(`Exported ${linkHistory.length} links as CSV.`, "is-success");
}

// ────────────────────────────────────────────────────────────────
// PRESETS
// ────────────────────────────────────────────────────────────────

function renderBuiltinPresets() {
  builtinPresetsEl.replaceChildren();

  BUILTIN_PRESETS.forEach(preset => {
    const card = createPresetCard({
      icon: preset.icon,
      name: preset.name,
      detail: `${preset.source} / ${preset.medium}`,
      onClick: () => applyPreset(preset),
    });
    builtinPresetsEl.appendChild(card);
  });
}

function renderCustomPresets() {
  customPresetsList.replaceChildren();

  if (customPresets.length === 0) {
    customPresetsList.appendChild(createEmptyState("No custom presets yet.", "Fill in the Builder and click ＋ Save Current!"));
    return;
  }

  customPresets.forEach((preset, i) => {
    const card = createPresetCard({
      icon: "⭐",
      name: preset.name,
      detail: `${preset.source} / ${preset.medium}`,
      clickableInfo: true,
      onClick: () => applyPreset(preset),
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "preset-delete";
    deleteBtn.type = "button";
    deleteBtn.title = "Delete preset";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      customPresets.splice(i, 1);
      try { chrome.storage.local.set({ utm_presets: customPresets }); } catch (_) {}
      renderCustomPresets();
    });

    card.appendChild(deleteBtn);
    customPresetsList.appendChild(card);
  });
}

function applyPreset(preset) {
  if (preset.source)   sourceInput.value   = preset.source;
  if (preset.medium)   mediumInput.value   = preset.medium;
  if (preset.campaign) campaignInput.value = preset.campaign;
  generate();
  switchTab("builder");
  showMsg(`Preset "${preset.name}" applied. Add your campaign name to generate the link.`, "is-success");
}

// ── Preset save form

function showSaveForm() {
  const source = sourceInput.value.trim();
  const medium = mediumInput.value.trim();
  if (!source && !medium) {
    showMsg("Fill in at least Source or Medium before saving a preset.", "is-error");
    return;
  }
  presetNameInput.value = source && medium ? `${source}/${medium}` : (source || medium);
  savePresetForm.classList.remove("hidden");
  presetNameInput.focus();
  presetNameInput.select();
}

function hideSaveForm() {
  savePresetForm.classList.add("hidden");
  presetNameInput.value = "";
}

function confirmSave() {
  const name = presetNameInput.value.trim();
  if (!name) { presetNameInput.focus(); return; }

  const source   = sourceInput.value.trim();
  const medium   = mediumInput.value.trim();
  const campaign = campaignInput.value.trim();

  customPresets.unshift({ name, source, medium, campaign });
  customPresets = customPresets.slice(0, MAX_CUSTOM_PRESETS);
  try { chrome.storage.local.set({ utm_presets: customPresets }); } catch (_) {}
  renderCustomPresets();
  hideSaveForm();
  showMsg(`Preset "${name}" saved!`, "is-success");
}

// ────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ────────────────────────────────────────────────────────────────

function handleShortcuts(e) {
  if (e.key === "Escape" && copyFormatMenu.classList.contains("is-open")) {
    setCopyFormatMenuOpen(false);
    copyFormatTrigger.focus();
    return;
  }
  if (e.ctrlKey && e.key.toLowerCase() === "u") {
    e.preventDefault();
    switchTab("builder");
    urlInput.focus();
    return;
  }
  if (e.ctrlKey && e.key.toLowerCase() === "c" && document.activeElement !== result) {
    e.preventDefault();
    copyResult();
    return;
  }
  if (e.key === "Escape" && savePresetForm.classList.contains("hidden") === false) {
    hideSaveForm();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    clearFields();
  }
}

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

function updateMeta() {
  const len = result.value.length;
  lengthMeta.textContent = `${len.toLocaleString()} characters`;
  lengthWarning.classList.toggle("hidden", len <= WARN_URL_LENGTH);
}

function setStatus(text, cls) {
  statusPill.textContent = text;
  statusPill.className = "status-pill" + (cls ? ` ${cls}` : "");
}

function showMsg(text, cls) {
  msgEl.textContent = text;
  msgEl.className = "message" + (cls ? ` ${cls}` : "");
}

function clearMsg() {
  msgEl.textContent = "";
  msgEl.className = "message";
}

function createEmptyState(lineOne, lineTwo = "") {
  const emptyEl = document.createElement("p");
  emptyEl.className = "empty-state";
  emptyEl.textContent = lineOne;

  if (lineTwo) {
    emptyEl.appendChild(document.createElement("br"));
    emptyEl.appendChild(document.createTextNode(lineTwo));
  }

  return emptyEl;
}

function createHistoryActionButton(action, index, title, text) {
  const button = document.createElement("button");
  button.className = "mini-btn";
  button.type = "button";
  button.dataset.action = action;
  button.dataset.i = String(index);
  button.title = title;
  button.textContent = text;
  button.addEventListener("click", onHistoryAction);
  return button;
}

function createPresetCard({ icon, name, detail, clickableInfo = false, onClick }) {
  const card = document.createElement(clickableInfo ? "div" : "button");
  card.className = "preset-card";
  if (!clickableInfo) card.type = "button";

  const iconEl = document.createElement("span");
  iconEl.className = "preset-icon";
  iconEl.textContent = icon;

  const infoEl = document.createElement("div");
  infoEl.className = clickableInfo ? "preset-info preset-info--clickable" : "preset-info";
  infoEl.addEventListener("click", onClick);

  const nameEl = document.createElement("div");
  nameEl.className = "preset-name";
  nameEl.textContent = name;

  const detailEl = document.createElement("div");
  detailEl.className = "preset-detail";
  detailEl.textContent = detail;

  infoEl.append(nameEl, detailEl);
  card.append(iconEl, infoEl);

  if (!clickableInfo) {
    card.addEventListener("click", onClick);
  }

  return card;
}

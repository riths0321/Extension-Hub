// ── Quick Search v3 — popup.js ─────────────────────────────────────────────────

// ── Engine definitions ─────────────────────────────────────────────────────────
const ENGINES = [
  { id: "google",        label: "Google",     icon: "🔍", url: "https://www.google.com/search?q=%s",              cmd: "g" },
  { id: "youtube",       label: "YouTube",    icon: "▶",  url: "https://www.youtube.com/results?search_query=%s", cmd: "yt" },
  { id: "wikipedia",     label: "Wikipedia",  icon: "📖", url: "https://en.wikipedia.org/wiki/Special:Search?search=%s", cmd: "wiki" },
  { id: "amazon",        label: "Amazon",     icon: "🛒", url: "https://www.amazon.com/s?k=%s",                   cmd: "am" },
  { id: "github",        label: "GitHub",     icon: "💻", url: "https://github.com/search?q=%s",                  cmd: "gh" },
  { id: "stackoverflow", label: "S.Overflow", icon: "💬", url: "https://stackoverflow.com/search?q=%s",           cmd: "so" },
  { id: "twitter",       label: "Twitter/X",  icon: "✦",  url: "https://twitter.com/search?q=%s",                 cmd: "tw" },
  { id: "reddit",        label: "Reddit",     icon: "🔮", url: "https://www.reddit.com/search/?q=%s",             cmd: "r" },
  { id: "translate",     label: "Translate",  icon: "🌐", url: "https://translate.google.com/?sl=auto&tl=en&text=%s", cmd: "tr" },
  { id: "images",        label: "Images",     icon: "🖼",  url: "https://www.google.com/search?tbm=isch&q=%s",    cmd: "img" }
];

// ── DOM helpers ────────────────────────────────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)            e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── State ──────────────────────────────────────────────────────────────────────
let selectedEngines = new Set();       // multi-search
let historyFilter = "all";
let settings = {
  autoShow:      true,
  smartDetect:   true,
  commands:      true,
  defaultEngine: "google",
  historyLimit:  50
};

// ── Tabs ───────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    const t = tab.dataset.tab;
    if (t === "history")  loadHistory();
    if (t === "custom")   loadCustomEngines();
    if (t === "settings") loadSettings();
  });
});

// Settings tab toggle via gear icon
document.getElementById("settingsToggleBtn").addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelector(".tab[data-tab='settings']").classList.add("active");
  document.getElementById("panel-settings").classList.add("active");
  loadSettings();
});

// ── Smart Search Input ─────────────────────────────────────────────────────────
const searchInput = document.getElementById("searchInput");
const cmdSuggestions = document.getElementById("cmdSuggestions");
const smartBadge = document.getElementById("smartBadge");
const cmdHintBadge = document.getElementById("cmdHintBadge");

let activeCmdIndex = -1;
let cmdItems = [];

searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("keydown", handleSearchKeyDown);

function handleSearchInput() {
  const val = searchInput.value;

  // Command detection: "g:", "yt:", etc.
  const cmdMatch = val.match(/^([a-z]+):/i);
  if (cmdMatch) {
    const prefix = cmdMatch[1].toLowerCase();
    const query = val.slice(cmdMatch[0].length).trim();
    showCommandSuggestions(prefix, query);
    hideBadge();
    cmdHintBadge.classList.add("visible");
    return;
  }

  // Hide suggestions
  hideCmdSuggestions();
  cmdHintBadge.classList.remove("visible");

  if (!val.trim()) {
    hideBadge();
    return;
  }

  // Smart type detection
  if (settings.smartDetect) {
    detectAndBadge(val.trim());
  }
}

function handleSearchKeyDown(e) {
  const val = searchInput.value.trim();

  if (e.key === "ArrowDown" && cmdItems.length) {
    e.preventDefault();
    activeCmdIndex = Math.min(activeCmdIndex + 1, cmdItems.length - 1);
    updateCmdActive();
    return;
  }
  if (e.key === "ArrowUp" && cmdItems.length) {
    e.preventDefault();
    activeCmdIndex = Math.max(activeCmdIndex - 1, 0);
    updateCmdActive();
    return;
  }

  // Ctrl+Enter → multi search
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (val && selectedEngines.size > 0) {
      openMultiSearch(val);
    } else if (val) {
      searchWithEngine("google", val);
    }
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    // Check if a cmd suggestion is highlighted
    if (activeCmdIndex >= 0 && cmdItems[activeCmdIndex]) {
      cmdItems[activeCmdIndex].click();
      return;
    }

    // Check command prefix
    const cmdMatch = searchInput.value.match(/^([a-z]+):(.*)$/i);
    if (cmdMatch) {
      const prefix = cmdMatch[1].toLowerCase();
      const query = cmdMatch[2].trim();
      const engine = ENGINES.find(e2 => e2.cmd === prefix || e2.id === prefix);
      if (engine && query) {
        searchWithEngine(engine.id, query);
        return;
      }
    }

    // Default search
    if (val) searchWithEngine(settings.defaultEngine, val);
    return;
  }

  // 1–9 key shortcuts
  if (!e.ctrlKey && !e.metaKey && !e.altKey && val.length === 0) {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) {
      const engine = ENGINES[n - 1];
      if (engine) {
        e.preventDefault();
        searchWithEngine(engine.id, "");
      }
    }
  }

  e.stopPropagation();
}

function showCommandSuggestions(prefix, query) {
  const matches = ENGINES.filter(e => e.cmd.startsWith(prefix) || e.id.startsWith(prefix));
  cmdSuggestions.replaceChildren();
  activeCmdIndex = -1;
  cmdItems = [];

  if (!matches.length) {
    hideCmdSuggestions();
    return;
  }

  matches.slice(0, 5).forEach(engine => {
    const item = el("div", "cmd-item");

    const pfx = el("span", "cmd-item-prefix", engine.cmd + ":");
    const icon = el("span", "", engine.icon + " ");
    const lbl  = el("span", "cmd-item-label");
    lbl.appendChild(icon);
    lbl.appendChild(document.createTextNode(engine.label));
    const desc = el("span", "cmd-item-desc", query ? `→ search "${query}"` : "Type query…");

    item.appendChild(pfx);
    item.appendChild(lbl);
    item.appendChild(desc);

    item.addEventListener("click", () => {
      if (query) {
        searchWithEngine(engine.id, query);
      } else {
        searchInput.value = engine.cmd + ":";
        searchInput.focus();
        hideCmdSuggestions();
      }
    });

    cmdSuggestions.appendChild(item);
    cmdItems.push(item);
  });

  cmdSuggestions.classList.add("visible");
}

function hideCmdSuggestions() {
  cmdSuggestions.classList.remove("visible");
  cmdSuggestions.replaceChildren();
  activeCmdIndex = -1;
  cmdItems = [];
}

function updateCmdActive() {
  cmdItems.forEach((item, i) => {
    item.classList.toggle("active", i === activeCmdIndex);
  });
}

// ── Smart type detection ───────────────────────────────────────────────────────
function detectTextType(text) {
  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))             return "email";
  if (/[{};()=><]|function\s|const\s|let\s|var\s|def\s|import\s|class\s/.test(text)) return "code";
  if (/^(what|who|why|how|when|where|is|are|can|does|do|did)\b/i.test(text)) return "question";
  return "general";
}

const TYPE_INFO = {
  url:      { label: "URL detected — will open directly", icon: "🔗", cls: "type-url" },
  email:    { label: "Email — opens Gmail",               icon: "✉️",  cls: "type-email" },
  code:     { label: "Code — GitHub/SO suggested",        icon: "💻", cls: "type-code" },
  question: { label: "Question — Google suggested",       icon: "💡", cls: "type-question" },
  general:  { label: "",                                  icon: "",   cls: "" }
};

function detectAndBadge(text) {
  const type = detectTextType(text);
  if (type === "general") { hideBadge(); return; }
  const info = TYPE_INFO[type];
  smartBadge.className = "smart-badge visible " + info.cls;
  smartBadge.textContent = info.icon + "  " + info.label;
}

function hideBadge() {
  smartBadge.className = "smart-badge";
  smartBadge.textContent = "";
}

// ── Search helpers ─────────────────────────────────────────────────────────────
function searchWithEngine(engineId, text) {
  const engine = ENGINES.find(e => e.id === engineId);
  if (!engine || !text) return;
  const finalUrl = engine.url.includes("%s") ? engine.url.replace("%s", encodeURIComponent(text)) : engine.url;
  chrome.runtime.sendMessage({ type: "openSearchTab", url: finalUrl, engine: engine.label, text });
  searchInput.value = "";
  hideCmdSuggestions();
  hideBadge();
}

function openSearch(urlTemplate, text, engineLabel) {
  const url = urlTemplate.includes("%s") ? urlTemplate.replace("%s", encodeURIComponent(text)) : urlTemplate;
  chrome.runtime.sendMessage({ type: "openSearchTab", url, engine: engineLabel, text });
}

// ── Home: Engine Grid ──────────────────────────────────────────────────────────
function buildHomeGrid() {
  const grid = document.getElementById("homeEngineGrid");
  grid.replaceChildren();

  chrome.storage.local.get(["pinnedEngines"], (data) => {
    const pinned = data.pinnedEngines || [];

    ENGINES.forEach((engine, idx) => {
      const card = el("button", "eng-card");
      card.setAttribute("title", `${engine.label} (${idx + 1})`);
      card.dataset.engineId = engine.id;

      if (pinned.includes(engine.id)) card.classList.add("pinned");

      const pin = el("span", "eng-pin", "📌");
      const icon = el("span", "eng-icon", engine.icon);
      const name = el("span", "eng-name", engine.label);

      card.appendChild(pin);
      card.appendChild(icon);
      card.appendChild(name);

      // Right-click → pin/unpin
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        togglePin(engine.id);
      });

      card.addEventListener("click", (e) => {
        const text = searchInput.value.trim();

        if (e.ctrlKey || e.metaKey) {
          // Multi-select mode
          card.classList.toggle("selected");
          if (selectedEngines.has(engine.id)) {
            selectedEngines.delete(engine.id);
          } else {
            selectedEngines.add(engine.id);
          }
          updateMultiBar(text);
          return;
        }

        if (text) {
          openSearch(engine.url, text, engine.label);
          return;
        }

        // No text in search bar — trigger content script search on current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "searchWithEngine",
              url: engine.url,
              label: engine.label
            });
          }
        });
      });

      grid.appendChild(card);
    });

    buildPinnedSection(pinned);
  });
}

function updateMultiBar(text) {
  const bar   = document.getElementById("multiSearchBar");
  const count = document.getElementById("multiCount");
  if (selectedEngines.size === 0) {
    bar.classList.remove("visible");
    return;
  }
  bar.classList.add("visible");
  count.textContent = `${selectedEngines.size} engine${selectedEngines.size > 1 ? "s" : ""} selected`;
}

function openMultiSearch(text) {
  if (!text) { showToast("Type something to search", "error"); return; }
  selectedEngines.forEach(engineId => {
    const engine = ENGINES.find(e => e.id === engineId);
    if (engine) openSearch(engine.url, text, engine.label);
  });
  clearSelection();
}

async function openMultiGroup(text) {
  if (!text) { showToast("Type something to search", "error"); return; }
  const urls = [];
  selectedEngines.forEach(engineId => {
    const engine = ENGINES.find(e => e.id === engineId);
    if (engine) {
      const finalUrl = engine.url.includes("%s") ? engine.url.replace("%s", encodeURIComponent(text)) : engine.url;
      urls.push({ url: finalUrl, label: engine.label });
    }
  });
  chrome.runtime.sendMessage({ type: "openTabGroup", searches: urls, groupName: text.slice(0, 30) });
  clearSelection();
}

function clearSelection() {
  selectedEngines.clear();
  document.querySelectorAll(".eng-card.selected").forEach(c => c.classList.remove("selected"));
  document.getElementById("multiSearchBar").classList.remove("visible");
}

document.getElementById("multiTabsBtn").addEventListener("click", () => {
  openMultiSearch(searchInput.value.trim());
});
document.getElementById("multiGroupBtn").addEventListener("click", () => {
  openMultiGroup(searchInput.value.trim());
});

// ── Pinned Engines ─────────────────────────────────────────────────────────────
function buildPinnedSection(pinned) {
  const section = document.getElementById("pinnedSection");
  const row     = document.getElementById("pinnedRow");
  row.replaceChildren();

  if (!pinned.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  pinned.forEach(engineId => {
    const engine = ENGINES.find(e => e.id === engineId);
    if (!engine) return;

    const chip = el("button", "pinned-chip");
    const icon = el("span", "pinned-chip-icon", engine.icon);
    const name = document.createTextNode(" " + engine.label);
    chip.appendChild(icon);
    chip.appendChild(name);

    chip.addEventListener("click", () => {
      const text = searchInput.value.trim();
      if (text) openSearch(engine.url, text, engine.label);
    });

    chip.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      togglePin(engine.id);
    });

    row.appendChild(chip);
  });
}

function togglePin(engineId) {
  chrome.storage.local.get(["pinnedEngines"], (data) => {
    let pinned = data.pinnedEngines || [];
    const idx = pinned.indexOf(engineId);
    if (idx >= 0) {
      pinned.splice(idx, 1);
      showToast("Unpinned");
    } else {
      pinned.push(engineId);
      showToast("Pinned ✓", "success");
    }
    chrome.storage.local.set({ pinnedEngines: pinned }, buildHomeGrid);
  });
}

// ── History ────────────────────────────────────────────────────────────────────
function loadHistory(filter) {
  if (filter !== undefined) historyFilter = filter;

  chrome.storage.local.get(["searchHistory", "favoriteHistory", "historyLimit"], (data) => {
    let history = (data.searchHistory || []).slice().reverse();
    const favorites = new Set(data.favoriteHistory || []);
    const limit = data.historyLimit || 50;
    history = history.slice(0, limit);

    // Build filter pills
    const filtersEl = document.getElementById("historyFilters");
    filtersEl.replaceChildren();

    const allPill = el("button", "filter-pill" + (historyFilter === "all" ? " active" : ""), "All");
    allPill.dataset.filter = "all";
    allPill.addEventListener("click", () => loadHistory("all"));
    filtersEl.appendChild(allPill);

    const favPill = el("button", "filter-pill" + (historyFilter === "⭐" ? " active" : ""), "⭐ Favorites");
    favPill.dataset.filter = "⭐";
    favPill.addEventListener("click", () => loadHistory("⭐"));
    filtersEl.appendChild(favPill);

    const engines = [...new Set(history.map(h => h.engine))].slice(0, 5);
    engines.forEach(engine => {
      const pill = el("button", "filter-pill" + (historyFilter === engine ? " active" : ""), engine);
      pill.addEventListener("click", () => loadHistory(engine));
      filtersEl.appendChild(pill);
    });

    // Apply filter
    let filtered = history;
    if (historyFilter === "⭐") {
      filtered = history.filter(h => favorites.has(h.id || h.timestamp.toString()));
    } else if (historyFilter !== "all") {
      filtered = history.filter(h => h.engine === historyFilter);
    }

    const list = document.getElementById("historyList");
    list.replaceChildren();

    if (!filtered.length) {
      const empty = el("div", "empty-state");
      const icon = el("div", "empty-state-icon", "🕐");
      const msg  = el("div", "", "No searches yet");
      empty.appendChild(icon);
      empty.appendChild(msg);
      list.appendChild(empty);
      return;
    }

    filtered.forEach(item => {
      const id = item.id || item.timestamp.toString();
      const row = el("div", "history-row");

      const left = el("div", "history-left");

      const badge = el("span", "history-engine-badge", item.engine.toUpperCase());
      const textWrap = el("div", "history-text-wrap");
      const text = el("div", "history-text", item.text.length > 45 ? item.text.slice(0, 45) + "…" : item.text);
      const meta = el("div", "history-meta", formatTime(item.timestamp));
      textWrap.appendChild(text);
      textWrap.appendChild(meta);

      left.appendChild(badge);
      left.appendChild(textWrap);

      const actions = el("div", "history-actions");

      // Favorite button
      const favBtn = el("button", "history-fav-btn" + (favorites.has(id) ? " active" : ""), "⭐");
      favBtn.title = "Favorite";
      favBtn.addEventListener("click", () => {
        chrome.storage.local.get(["favoriteHistory"], (d) => {
          const favs = d.favoriteHistory || [];
          const fi = favs.indexOf(id);
          if (fi >= 0) favs.splice(fi, 1);
          else favs.push(id);
          chrome.storage.local.set({ favoriteHistory: favs }, () => loadHistory());
        });
      });

      // Re-search button
      const reBtn = el("button", "history-re-btn", "↗");
      reBtn.title = "Search again";
      reBtn.addEventListener("click", () => {
        const engine = ENGINES.find(e => e.label === item.engine);
        if (engine) {
          const finalUrl = engine.url.includes("%s") ? engine.url.replace("%s", encodeURIComponent(item.text)) : engine.url;
          chrome.tabs.create({ url: finalUrl, active: true });
        }
      });

      // Delete button
      const delBtn = el("button", "history-del-btn", "×");
      delBtn.title = "Remove";
      delBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "deleteHistoryItem", id: item.timestamp }, () => {
          row.style.opacity = "0";
          row.style.transform = "translateX(8px)";
          row.style.transition = "all 0.18s";
          setTimeout(() => loadHistory(), 180);
        });
      });

      actions.appendChild(favBtn);
      actions.appendChild(reBtn);
      actions.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(actions);
      list.appendChild(row);
    });
  });
}

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clearHistory" }, () => {
    showToast("History cleared");
    loadHistory();
  });
});

// ── Custom Engines ─────────────────────────────────────────────────────────────
function loadCustomEngines() {
  chrome.storage.local.get(["customEngines"], (data) => {
    const engines = data.customEngines || [];
    const list = document.getElementById("customEnginesList");
    list.replaceChildren();

    if (!engines.length) {
      const empty = el("div", "empty-state");
      const icon = el("div", "empty-state-icon", "🔌");
      const msg  = el("div", "", "No custom engines yet");
      empty.appendChild(icon);
      empty.appendChild(msg);
      list.appendChild(empty);
      return;
    }

    engines.forEach(engine => {
      const row = el("div", "custom-row");

      const icon = el("span", "custom-icon", engine.icon || "🔗");
      const nameWrap = el("div", "");
      nameWrap.style.flex = "1";
      nameWrap.style.minWidth = "0";

      const name = el("div", "custom-name", engine.name);
      const url  = el("div", "custom-url", engine.url.replace("https://", ""));
      nameWrap.appendChild(name);
      nameWrap.appendChild(url);

      const removeBtn = el("button", "remove-btn", "×");
      removeBtn.title = "Remove";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: "removeCustomEngine", id: engine.id }, loadCustomEngines);
      });

      row.appendChild(icon);
      row.appendChild(nameWrap);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  });
}

document.getElementById("addCustomEngineBtn").addEventListener("click", () => {
  const nameEl  = document.getElementById("engineName");
  const urlEl   = document.getElementById("engineUrl");
  const emojiEl = document.getElementById("engineEmoji");

  const name  = nameEl.value.trim();
  const url   = urlEl.value.trim();
  const icon  = emojiEl.value.trim() || "🔗";

  if (!name || !url) { showToast("Name and URL required", "error"); return; }
  if (!url.startsWith("http://") && !url.startsWith("https://")) { showToast("URL must start with http:// or https://", "error"); return; }

  const engine = {
    id:   "custom-" + name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
    name, url, icon
  };

  chrome.runtime.sendMessage({ type: "saveCustomEngine", engine }, () => {
    nameEl.value = urlEl.value = emojiEl.value = "";
    showToast("Engine added! ✓", "success");
    loadCustomEngines();
  });
});

document.getElementById("testCustomBtn").addEventListener("click", () => {
  const url = document.getElementById("engineUrl").value.trim();
  if (!url) { showToast("Enter URL first", "error"); return; }
  const testUrl = url.includes("%s") ? url.replace("%s", encodeURIComponent("test query")) : url;
  chrome.tabs.create({ url: testUrl, active: true });
});

// ── Settings ───────────────────────────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(["settings"], (data) => {
    const s = data.settings || {};
    settings = { ...settings, ...s };

    const autoShow  = document.getElementById("settingAutoShow");
    const smart     = document.getElementById("settingSmartDetect");
    const commands  = document.getElementById("settingCommands");
    const defEng    = document.getElementById("settingDefaultEngine");
    const histLim   = document.getElementById("settingHistoryLimit");

    autoShow.checked = settings.autoShow !== false;
    smart.checked    = settings.smartDetect !== false;
    commands.checked = settings.commands !== false;
    defEng.value     = settings.defaultEngine || "google";
    histLim.value    = String(settings.historyLimit || 50);
  });
}

function saveSettings() {
  settings.autoShow      = document.getElementById("settingAutoShow").checked;
  settings.smartDetect   = document.getElementById("settingSmartDetect").checked;
  settings.commands      = document.getElementById("settingCommands").checked;
  settings.defaultEngine = document.getElementById("settingDefaultEngine").value;
  settings.historyLimit  = parseInt(document.getElementById("settingHistoryLimit").value, 10);
  chrome.storage.local.set({ settings, historyLimit: settings.historyLimit });
}

["settingAutoShow","settingSmartDetect","settingCommands","settingDefaultEngine","settingHistoryLimit"]
  .forEach(id => {
    document.getElementById(id).addEventListener("change", saveSettings);
  });

document.getElementById("settingClearHistory").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clearHistory" }, () => showToast("History cleared"));
});

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  const existing = document.getElementById("qs-toast");
  if (existing) existing.remove();

  const toast = el("div", "toast" + (type ? " toast-" + type : ""), msg);
  toast.id = "qs-toast";
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  });
}

// ── Time formatter ─────────────────────────────────────────────────────────────
function formatTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildHomeGrid();
  loadSettings();
  searchInput.focus();
});

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!cmdSuggestions.contains(e.target) && e.target !== searchInput) {
    hideCmdSuggestions();
  }
});

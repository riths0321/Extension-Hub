// ── popup.js — CSP-safe: no innerHTML, no eval ────────────────────────────────

const ENGINES = [
  { id: "google",        label: "Google",      icon: "🔍", url: "https://www.google.com/search?q=%s" },
  { id: "youtube",       label: "YouTube",     icon: "▶",  url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia",     label: "Wikipedia",   icon: "📖", url: "https://en.wikipedia.org/wiki/Special:Search?search=%s" },
  { id: "amazon",        label: "Amazon",      icon: "🛒", url: "https://www.amazon.com/s?k=%s" },
  { id: "github",        label: "GitHub",      icon: "💻", url: "https://github.com/search?q=%s" },
  { id: "stackoverflow", label: "S.Overflow",  icon: "💬", url: "https://stackoverflow.com/search?q=%s" },
  { id: "twitter",       label: "Twitter/X",   icon: "✦",  url: "https://twitter.com/search?q=%s" },
  { id: "reddit",        label: "Reddit",      icon: "🔮", url: "https://www.reddit.com/search/?q=%s" },
  { id: "translate",     label: "Translate",   icon: "🌐", url: "https://translate.google.com/?sl=auto&tl=en&text=%s" },
  { id: "images",        label: "Images",      icon: "🖼",  url: "https://www.google.com/search?tbm=isch&q=%s" }
];

// ── DOM helpers ───────────────────────────────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "history") loadHistory();
    if (tab.dataset.tab === "custom") loadCustomEngines();
  });
});

// ── Home: build engine grid ───────────────────────────────────────────────────
function buildHomeGrid() {
  const grid = document.getElementById("homeEngineGrid");
  grid.replaceChildren();

  ENGINES.forEach(engine => {
    const card = el("button", "eng-card");
    card.setAttribute("title", engine.label);

    const icon = el("span", "eng-icon", engine.icon);
    const name = el("span", "eng-name", engine.label);
    card.appendChild(icon);
    card.appendChild(name);

    card.addEventListener("click", () => {
      // Notify content script of active tab to trigger search with current selection
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
}

// ── History ───────────────────────────────────────────────────────────────────
function loadHistory() {
  chrome.storage.local.get(["searchHistory"], (data) => {
    const history = (data.searchHistory || []).slice().reverse().slice(0, 20);
    const list = document.getElementById("historyList");
    list.replaceChildren();

    if (!history.length) {
      list.appendChild(el("div", "empty-state", "No recent searches yet"));
      return;
    }

    history.forEach(item => {
      const row = el("div", "history-row");

      const left = el("div", "history-left");
      const text = el("div", "history-text", item.text.length > 40 ? item.text.slice(0, 40) + "…" : item.text);
      const meta = el("div", "history-meta", `${item.engine} · ${formatTime(item.timestamp)}`);
      left.appendChild(text);
      left.appendChild(meta);

      const reBtn = el("button", "history-re-btn", "↗");
      reBtn.setAttribute("title", "Search again");
      reBtn.addEventListener("click", () => {
        const engine = ENGINES.find(e => e.label === item.engine);
        if (engine) {
          chrome.tabs.create({
            url: engine.url.replace("%s", encodeURIComponent(item.text)),
            active: true
          });
        }
      });

      row.appendChild(left);
      row.appendChild(reBtn);
      list.appendChild(row);
    });
  });
}

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clearHistory" }, () => {
    const list = document.getElementById("historyList");
    list.replaceChildren();
    list.appendChild(el("div", "empty-state", "No recent searches yet"));
  });
});

// ── Custom Engines ────────────────────────────────────────────────────────────
function loadCustomEngines() {
  chrome.storage.local.get(["customEngines"], (data) => {
    const engines = data.customEngines || [];
    const list = document.getElementById("customEnginesList");
    list.replaceChildren();

    if (!engines.length) {
      list.appendChild(el("div", "empty-state", "No custom engines yet"));
      return;
    }

    engines.forEach(engine => {
      const row = el("div", "custom-row");

      const icon = el("span", "custom-icon", "🔗");
      const name = el("span", "custom-name", engine.name);

      const removeBtn = el("button", "remove-btn", "×");
      removeBtn.setAttribute("title", "Remove");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: "removeCustomEngine", id: engine.id }, () => {
          loadCustomEngines();
        });
      });

      row.appendChild(icon);
      row.appendChild(name);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  });
}

document.getElementById("addCustomEngineBtn").addEventListener("click", () => {
  const nameInput = document.getElementById("engineName");
  const urlInput  = document.getElementById("engineUrl");
  const name = nameInput.value.trim();
  const url  = urlInput.value.trim();

  if (!name || !url) { showToast("Enter both name and URL"); return; }
  if (!url.includes("%s")) { showToast("URL must contain %s"); return; }

  const engine = {
    id:   "custom-" + name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
    name,
    url
  };

  chrome.runtime.sendMessage({ type: "saveCustomEngine", engine }, () => {
    nameInput.value = "";
    urlInput.value  = "";
    showToast("Engine added!");
    loadCustomEngines();
  });
});

document.getElementById("testCustomBtn").addEventListener("click", () => {
  const url = document.getElementById("engineUrl").value.trim();
  if (!url) { showToast("Enter a URL first"); return; }
  const final = url.replace("%s", encodeURIComponent("test query"));
  chrome.tabs.create({ url: final, active: true });
});

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.getElementById("qs-toast");
  if (existing) existing.remove();

  const toast = el("div", "toast", msg);
  toast.id = "qs-toast";
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  });
}

// ── Time formatter ────────────────────────────────────────────────────────────
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

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildHomeGrid();
});
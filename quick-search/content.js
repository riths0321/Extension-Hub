// ── Quick Search v3 — Content Script ──────────────────────────────────────────

const ENGINES = [
  { id: "google",        label: "Google",     icon: "🔍", url: "https://www.google.com/search?q=%s",              cmd: "g",    type: ["general", "question"] },
  { id: "youtube",       label: "YouTube",    icon: "▶",  url: "https://www.youtube.com/results?search_query=%s", cmd: "yt",   type: ["general"] },
  { id: "wikipedia",     label: "Wiki",       icon: "📖", url: "https://en.wikipedia.org/wiki/Special:Search?search=%s", cmd: "wiki", type: ["general", "question"] },
  { id: "amazon",        label: "Amazon",     icon: "🛒", url: "https://www.amazon.com/s?k=%s",                   cmd: "am",   type: ["general"] },
  { id: "github",        label: "GitHub",     icon: "💻", url: "https://github.com/search?q=%s",                  cmd: "gh",   type: ["code"] },
  { id: "stackoverflow", label: "S.Overflow", icon: "💬", url: "https://stackoverflow.com/search?q=%s",           cmd: "so",   type: ["code"] },
  { id: "twitter",       label: "Twitter/X",  icon: "✦",  url: "https://twitter.com/search?q=%s",                 cmd: "tw",   type: ["general"] },
  { id: "reddit",        label: "Reddit",     icon: "🔮", url: "https://www.reddit.com/search/?q=%s",             cmd: "r",    type: ["general", "question"] },
  { id: "translate",     label: "Translate",  icon: "🌐", url: "https://translate.google.com/?sl=auto&tl=en&text=%s", cmd: "tr", type: ["general"] },
  { id: "images",        label: "Images",     icon: "🖼",  url: "https://www.google.com/search?tbm=isch&q=%s",    cmd: "img",  type: ["general"] }
];

// ── Smart detection ────────────────────────────────────────────────────────────
function detectTextType(text) {
  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))             return "email";
  if (/[{};()=><]|function\s|const\s|let\s|var\s|def\s|import\s|class\s/.test(text)) return "code";
  if (/^(what|who|why|how|when|where|is|are|can|does|do|did)\b/i.test(text)) return "question";
  return "general";
}

function getRecommended(type) {
  if (type === "url")      return ["google"];
  if (type === "email")    return ["google"];
  if (type === "code")     return ["github", "stackoverflow"];
  if (type === "question") return ["google", "reddit", "wikipedia"];
  return ["google"];
}

// ── DOM helpers ────────────────────────────────────────────────────────────────
function makeEl(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

// ── Build popup ────────────────────────────────────────────────────────────────
function buildPopup() {
  const existing = document.getElementById("qs-popup");
  if (existing) existing.remove();

  const popup = makeEl("div");
  popup.id = "qs-popup";

  // ── Header ──
  const header = makeEl("div");
  header.id = "qs-header";

  const headerLeft = makeEl("div");
  headerLeft.id = "qs-header-left";

  // Logo mark (pure SVG via createElement)
  const logoMark = makeEl("div");
  logoMark.id = "qs-logo-mark";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "8"); circle.setAttribute("cy", "8"); circle.setAttribute("r", "5");
  circle.setAttribute("stroke", "white"); circle.setAttribute("stroke-width", "2");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", "12"); line.setAttribute("y1", "12"); line.setAttribute("x2", "17"); line.setAttribute("y2", "17");
  line.setAttribute("stroke", "white"); line.setAttribute("stroke-width", "2"); line.setAttribute("stroke-linecap", "round");
  svg.appendChild(circle); svg.appendChild(line);
  logoMark.appendChild(svg);

  const title = makeEl("div");
  title.id = "qs-title";
  title.textContent = "Quick Search";

  const sep = document.createTextNode(" · ");

  const selectedEl = makeEl("div");
  selectedEl.id = "qs-selected-text";

  const typeBadge = makeEl("span");
  typeBadge.id = "qs-type-badge";

  headerLeft.appendChild(logoMark);
  headerLeft.appendChild(title);
  headerLeft.appendChild(selectedEl);
  headerLeft.appendChild(typeBadge);

  const closeBtn = makeEl("button");
  closeBtn.id = "qs-close";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", hidePopup);

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  // ── Multi-select bar ──
  const multiBar = makeEl("div");
  multiBar.id = "qs-multi-bar";

  const multiCount = makeEl("span");
  multiCount.id = "qs-multi-count";
  multiCount.textContent = "0 selected";

  const multiActions = makeEl("div");
  multiActions.id = "qs-multi-actions";

  const openTabsBtn = makeEl("button");
  openTabsBtn.id = "qs-open-tabs";
  openTabsBtn.textContent = "Open All";
  openTabsBtn.addEventListener("click", () => openMultiSearch());

  const openGroupBtn = makeEl("button");
  openGroupBtn.id = "qs-open-group";
  openGroupBtn.textContent = "Tab Group";
  openGroupBtn.addEventListener("click", () => openMultiGroup());

  multiActions.appendChild(openGroupBtn);
  multiActions.appendChild(openTabsBtn);
  multiBar.appendChild(multiCount);
  multiBar.appendChild(multiActions);

  // ── Engine Grid ──
  const grid = makeEl("div");
  grid.id = "qs-grid";

  const type = detectTextType(currentText);
  const recommended = getRecommended(type);

  // Load custom engines
  chrome.storage.local.get(["customEngines", "settings"], (data) => {
    const customs = data.customEngines || [];
    const settings = data.settings || {};
    const allEngines = [...ENGINES, ...customs.map(c => ({
      id: c.id, label: c.name, icon: c.icon || "🔗", url: c.url,
      cmd: "", type: ["general"]
    }))];

    allEngines.forEach((engine, idx) => {
      const btn = makeEl("button", "qs-btn");
      if (recommended.includes(engine.id)) btn.classList.add("recommended");
      btn.setAttribute("data-engine-id", engine.id);
      btn.title = `${engine.label}${idx < 9 ? ` (${idx + 1})` : ""}`;

      const btnIcon = makeEl("span", "qs-btn-icon");
      btnIcon.textContent = engine.icon;
      const btnLabel = makeEl("span");
      btnLabel.textContent = engine.label;

      btn.appendChild(btnIcon);
      btn.appendChild(btnLabel);

      btn.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) {
          btn.classList.toggle("selected");
          if (selectedContentEngines.has(engine.id)) {
            selectedContentEngines.delete(engine.id);
          } else {
            selectedContentEngines.add(engine.id);
          }
          updateMultiBar(multiBar, multiCount);
          return;
        }

        const text = getSelectedText();
        if (!text) return;

        // Smart: URL → open directly
        if (detectTextType(text) === "url" && engine.id === "google") {
          const href = text.startsWith("http") ? text : "https://" + text;
          openSearch(href, text, engine.label, true);
        } else {
          openSearch(engine.url, text, engine.label);
        }
        hidePopup();
      });

      grid.appendChild(btn);
    });
  });

  // ── Cmd hint ──
  const cmdHint = makeEl("div");
  cmdHint.id = "qs-cmd-hint";
  const cmdHintText = makeEl("span");
  cmdHintText.id = "qs-cmd-hint-text";
  cmdHintText.textContent = "g:, yt:, gh:, r: — type a prefix to command-search";
  cmdHint.appendChild(cmdHintText);

  // ── Custom row ──
  const customRow = makeEl("div");
  customRow.id = "qs-custom-row";

  const customInput = makeEl("input");
  customInput.id = "qs-custom-input";
  customInput.type = "text";
  customInput.placeholder = "Custom URL with %s…";
  customInput.setAttribute("autocomplete", "off");

  const customGo = makeEl("button");
  customGo.id = "qs-custom-go";
  customGo.textContent = "Go";
  customGo.addEventListener("click", () => {
    const text = getSelectedText();
    if (!text) return;
    let url = customInput.value.trim();
    if (!url) return;
    if (!url.includes("%s")) url += (url.includes("?") ? "&" : "?") + "q=%s";
    openSearch(url, text, "Custom");
    hidePopup();
  });

  customRow.appendChild(customInput);
  customRow.appendChild(customGo);

  // ── Footer ──
  const footer = makeEl("div");
  footer.id = "qs-footer";

  const hint1 = makeEl("span", "qs-key-hint");
  const key1 = makeEl("span", "qs-key"); key1.textContent = "Esc";
  hint1.appendChild(key1);
  hint1.appendChild(document.createTextNode(" close"));

  const hint2 = makeEl("span", "qs-key-hint");
  const key2 = makeEl("span", "qs-key"); key2.textContent = "1-9";
  hint2.appendChild(key2);
  hint2.appendChild(document.createTextNode(" quick-pick"));

  const hint3 = makeEl("span", "qs-key-hint");
  const key3 = makeEl("span", "qs-key"); key3.textContent = "Ctrl+click";
  hint3.appendChild(key3);
  hint3.appendChild(document.createTextNode(" multi"));

  footer.appendChild(hint1);
  footer.appendChild(hint2);
  footer.appendChild(hint3);

  // Assemble
  popup.appendChild(header);
  popup.appendChild(multiBar);
  popup.appendChild(grid);
  popup.appendChild(customRow);
  popup.appendChild(footer);
  document.body.appendChild(popup);

  // Update type badge
  updateTypeBadge(typeBadge, type);

  return popup;
}

// ── Multi-search state ─────────────────────────────────────────────────────────
let selectedContentEngines = new Set();

function updateMultiBar(bar, count) {
  if (selectedContentEngines.size === 0) {
    bar.classList.remove("visible");
    return;
  }
  bar.classList.add("visible");
  count.textContent = `${selectedContentEngines.size} engine${selectedContentEngines.size > 1 ? "s" : ""} selected`;
}

function openMultiSearch() {
  const text = getSelectedText();
  if (!text) return;
  selectedContentEngines.forEach(id => {
    const engine = ENGINES.find(e => e.id === id);
    if (engine) openSearch(engine.url, text, engine.label);
  });
  selectedContentEngines.clear();
  hidePopup();
}

function openMultiGroup() {
  const text = getSelectedText();
  if (!text) return;
  const searches = [];
  selectedContentEngines.forEach(id => {
    const engine = ENGINES.find(e => e.id === id);
    if (engine) searches.push({ url: engine.url.replace("%s", encodeURIComponent(text)), label: engine.label });
  });
  chrome.runtime.sendMessage({ type: "openTabGroup", searches, groupName: text.slice(0, 30) });
  selectedContentEngines.clear();
  hidePopup();
}

function updateTypeBadge(badge, type) {
  const info = {
    url:      { label: "URL", cls: "type-url" },
    email:    { label: "Email", cls: "type-email" },
    code:     { label: "Code", cls: "type-code" },
    question: { label: "Question", cls: "type-question" }
  };
  if (!info[type]) return;
  badge.textContent = info[type].label;
  badge.className = "visible " + info[type].cls;
}

// ── State ──────────────────────────────────────────────────────────────────────
let popup = null;
let currentText = "";
let dismissTimer = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function getSelectedText() {
  return currentText || window.getSelection().toString().trim();
}

function openSearch(urlTemplate, text, engineLabel, isDirectUrl = false) {
  const finalUrl = isDirectUrl ? urlTemplate : urlTemplate.replace("%s", encodeURIComponent(text));
  chrome.runtime.sendMessage({ type: "openSearchTab", url: finalUrl, engine: engineLabel, text });
}

// ── Show / hide ────────────────────────────────────────────────────────────────
function showPopup(text, x, y) {
  currentText = text || window.getSelection().toString().trim();
  selectedContentEngines.clear();

  if (!popup || !document.body.contains(popup)) {
    popup = buildPopup();
  }

  const selectedEl = document.getElementById("qs-selected-text");
  if (selectedEl) {
    const display = currentText.length > 30 ? currentText.slice(0, 30) + "…" : currentText;
    selectedEl.textContent = display ? `"${display}"` : "";
  }

  popup.classList.add("visible");

  const vw = window.innerWidth;
  const pw = 340;
  const ph = 280;

  let left = (x !== undefined ? x : window.innerWidth / 2 - 170) + window.scrollX;
  let top  = (y !== undefined ? y : 120) + window.scrollY;

  if (left + pw > vw + window.scrollX) left = vw + window.scrollX - pw - 12;
  if (left < window.scrollX + 4) left = window.scrollX + 4;
  if (top + ph > window.innerHeight + window.scrollY) top = (y !== undefined ? y - ph - 14 : top) + window.scrollY;

  popup.style.setProperty('--popup-left', left + 'px');
  popup.style.setProperty('--popup-top', top + 'px');

  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(hidePopup, 14000);
}

function hidePopup() {
  if (popup) popup.classList.remove("visible");
  clearTimeout(dismissTimer);
  selectedContentEngines.clear();
}

// ── Keyboard shortcuts inside popup ───────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (!popup || !popup.classList.contains("visible")) return;

  if (e.key === "Escape") { hidePopup(); return; }

  // 1–9 shortcuts
  const n = parseInt(e.key, 10);
  if (!isNaN(n) && n >= 1 && n <= 9) {
    const engine = ENGINES[n - 1];
    if (engine && currentText) {
      openSearch(engine.url, currentText, engine.label);
      hidePopup();
    }
    return;
  }
});

// ── Selection listener ─────────────────────────────────────────────────────────
document.addEventListener("mouseup", (e) => {
  setTimeout(() => {
    const text = window.getSelection().toString().trim();
    if (text.length >= 2 && text.length <= 300) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showPopup(text, rect.left, rect.bottom + 10);
      }
    } else if (!text) {
      if (popup && !popup.contains(e.target)) hidePopup();
    }
  }, 250);
});

// ── Single message listener ────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "showPopup") {
    const text = (msg.text || "").trim();
    showPopup(text);
    sendResponse({ ok: true });
  }

  if (msg.type === "searchWithEngine") {
    const text = window.getSelection().toString().trim();
    if (!text || !msg.url) { sendResponse({ ok: false }); return; }
    chrome.runtime.sendMessage({
      type: "openSearchTab",
      url: msg.url.replace("%s", encodeURIComponent(text)),
      engine: msg.label || "Unknown",
      text
    });
    sendResponse({ ok: true });
  }
});

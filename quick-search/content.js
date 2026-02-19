// ── Quick Search Content Script ───────────────────────────────────────────────
// CSP-safe: NO innerHTML, NO eval, NO inline styles
// All styles are in content.css (injected via manifest)


const ENGINES = [
  { id: "google",        label: "Google",    icon: "🔍", url: "https://www.google.com/search?q=%s" },
  { id: "youtube",       label: "YouTube",   icon: "▶",  url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia",     label: "Wiki",      icon: "📖", url: "https://en.wikipedia.org/wiki/Special:Search?search=%s" },
  { id: "amazon",        label: "Amazon",    icon: "🛒", url: "https://www.amazon.com/s?k=%s" },
  { id: "github",        label: "GitHub",    icon: "💻", url: "https://github.com/search?q=%s" },
  { id: "stackoverflow", label: "S.Overflow",icon: "💬", url: "https://stackoverflow.com/search?q=%s" },
  { id: "twitter",       label: "Twitter/X", icon: "✦",  url: "https://twitter.com/search?q=%s" },
  { id: "reddit",        label: "Reddit",    icon: "🔮", url: "https://www.reddit.com/search/?q=%s" },
  { id: "translate",     label: "Translate", icon: "🌐", url: "https://translate.google.com/?sl=auto&tl=en&text=%s" },
  { id: "images",        label: "Images",    icon: "🖼",  url: "https://www.google.com/search?tbm=isch&q=%s" }
];

// ── Build popup DOM (CSP-safe: only createElement / textContent / setAttribute) ──
function buildPopup() {
  const existing = document.getElementById("qs-popup");
  if (existing) existing.remove();

  // Root
  const popup = document.createElement("div");
  popup.id = "qs-popup";

  // Header
  const header = document.createElement("div");
  header.id = "qs-header";

  const titleWrap = document.createElement("div");

  const title = document.createElement("div");
  title.id = "qs-title";
  title.textContent = "Quick Search";

  const selectedEl = document.createElement("div");
  selectedEl.id = "qs-selected-text";

  titleWrap.appendChild(title);
  titleWrap.appendChild(selectedEl);

  const closeBtn = document.createElement("button");
  closeBtn.id = "qs-close";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", hidePopup);

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // Engine grid
  const grid = document.createElement("div");
  grid.id = "qs-grid";

  ENGINES.forEach(engine => {
    const btn = document.createElement("button");
    btn.className = "qs-btn";
    btn.setAttribute("data-url", engine.url);
    btn.setAttribute("data-label", engine.label);

    const icon = document.createElement("span");
    icon.className = "qs-btn-icon";
    icon.textContent = engine.icon;

    const label = document.createElement("span");
    label.textContent = engine.label;

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.addEventListener("click", () => {
      const text = getSelectedText();
      if (!text) return;
      openSearch(engine.url, text, engine.label);
      hidePopup();
    });

    grid.appendChild(btn);
  });

  // Custom row
  const customRow = document.createElement("div");
  customRow.id = "qs-custom-row";

  const customInput = document.createElement("input");
  customInput.id = "qs-custom-input";
  customInput.type = "text";
  customInput.placeholder = "Custom URL with %s...";
  customInput.setAttribute("autocomplete", "off");

  const customGo = document.createElement("button");
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

  // Assemble
  popup.appendChild(header);
  popup.appendChild(grid);
  popup.appendChild(customRow);
  document.body.appendChild(popup);

  return popup;
}

// ── State ─────────────────────────────────────────────────────────────────────
let popup = null;
let currentText = "";
let dismissTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSelectedText() {
  return currentText || window.getSelection().toString().trim();
}

// 🔐 SAFE TAB OPEN (background controlled)
function openSearch(urlTemplate, text, engineLabel) {
  const finalUrl = urlTemplate.replace("%s", encodeURIComponent(text));

  chrome.runtime.sendMessage({
    type: "openSearchTab",
    url: finalUrl,
    engine: engineLabel,
    text: text
  });
}

function saveHistory(text, engine) {
  chrome.runtime.sendMessage({ type: "saveHistory", text, engine });
}

// ── Show / hide ───────────────────────────────────────────────────────────────
function showPopup(text, x, y) {
  currentText = text || window.getSelection().toString().trim();

  if (!popup || !document.body.contains(popup)) {
    popup = buildPopup();
  }

  // Update selected text label
  const selectedEl = document.getElementById("qs-selected-text");
  if (selectedEl) {
    const display = currentText.length > 35
      ? currentText.slice(0, 35) + "…"
      : currentText;
    selectedEl.textContent = display ? `"${display}"` : "";
  }

  // Position
  popup.style.display = "block";

  const vw = window.innerWidth;
  const ph = 260; // estimated popup height
  const pw = 320;

  let left = (x !== undefined ? x : window.innerWidth / 2 - 160) + window.scrollX;
  let top  = (y !== undefined ? y : 120) + window.scrollY;

  // Keep inside viewport
  if (left + pw > vw + window.scrollX) left = vw + window.scrollX - pw - 10;
  if (left < window.scrollX + 4) left = window.scrollX + 4;

  popup.style.left = left + "px";
  popup.style.top  = top + "px";

  // Auto-dismiss after 12s of no interaction
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(hidePopup, 12000);
}

function hidePopup() {
  if (popup) popup.style.display = "none";
  clearTimeout(dismissTimer);
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Show on text selection (mouseup)
document.addEventListener("mouseup", (e) => {
  // Small delay so selection is finalized
  setTimeout(() => {
    const text = window.getSelection().toString().trim();
    if (text.length >= 2 && text.length <= 200) {
      // Position just below the selection
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showPopup(text, rect.left, rect.bottom + 10);
      }
    } else if (!text) {
      // Clicked somewhere with no selection — hide if click outside popup
      if (popup && !popup.contains(e.target)) {
        hidePopup();
      }
    }
  }, 250);
});

// Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hidePopup();
});

// ── Single unified message listener (MV3: only one listener per script) ──────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "showPopup") {
    const text = (msg.text || "").trim();
    showPopup(text);
    sendResponse({ ok: true });
  }

  if (msg.type === "searchWithEngine") {
  const text = window.getSelection().toString().trim();
  if (!text || !msg.url) {
    sendResponse({ ok: false });
    return;
  }

  chrome.runtime.sendMessage({
    type: "openSearchTab",
    url: msg.url.replace("%s", encodeURIComponent(text)),
    engine: msg.label || "Unknown",
    text
  });

  sendResponse({ ok: true });
}

});
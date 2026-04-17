// content.js — Draw Pencil Pro v14.0
(function () {
  if (window.__drawPencilProLoaded) return;
  window.__drawPencilProLoaded = true;

  // ─── Theme & constants ────────────────────────────────────────────────────
  const THEME = { primary: "#2563EB", heading: "#111111", subheading: "#6B7280", background: "#FFFFFF", border: "#E5E7EB", panel: "#F8FAFC" };
  const COLORS = ["#111111", "#2563EB", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#8B5CF6", "#EC4899"];
  const DEFAULT_STUDY_STATE = {
    readingMode: false, rulerEnabled: false, rulerY: 220,
    readingFontSize: 20, readingLineHeight: 1.85, readingWidth: 860,
    focusGoalMinutes: 25, focusRemainingSeconds: 1500, focusRunning: false, focusStartedAt: null,
    highlights: [], flashcards: [], bookmarks: [], readingSessions: 0
  };

  // ─── SVG Icons ────────────────────────────────────────────────────────────
  const icons = {
    pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3L21 7L7 21H3V17L17 3Z"/><path d="M14 6L18 10"/></svg>`,
    highlighter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17L17 5"/><path d="M7 19L19 7"/><path d="M4 20h7"/></svg>`,
    eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21H21"/><path d="M5 17L15 7a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3l-9 9H8z"/></svg>`,
    line: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><path d="M13 4h7v7"/></svg>`,
    rect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>`,
    ellipse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>`,
    text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 7h16"/><path d="M12 7v10"/><path d="M8 17h8"/></svg>`,
    sticky: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8l6-6V5a2 2 0 0 0-2-2z"/><path d="M15 21v-6h6"/></svg>`,
    laser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2"/></svg>`,
    reader: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 17A2.5 2.5 0 0 0 4 14.5V5a2 2 0 0 1 2-2h14v14"/></svg>`,
    ruler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19h16"/><path d="M7 19v-4M11 19v-2M15 19v-4M19 19v-2"/></svg>`,
    timer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="13" r="8"/><path d="M12 13l3-2"/><path d="M9 2h6"/></svg>`,
    card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h10M7 14h6"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h12v17l-6-4-6 4z"/></svg>`,
    export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 21h16"/></svg>`,
    undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 14L4 9l5-5"/><path d="M20 20a8 8 0 0 0-8-8H4"/></svg>`,
    redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 14l5-5-5-5"/><path d="M4 20a8 8 0 0 1 8-8h8"/></svg>`,
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 4h6"/></svg>`,
    save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>`,
    coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>`
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let enabled = false, drawing = false, locked = false, current = null, shapeStart = null;
  let textInput = null, activeTool = "pencil", currentColor = THEME.primary;
  let currentSize = 3, currentOpacity = 1, pressureSimulation = true;
  let showGrid = false, fillShapes = false, canvasDimmed = false;
  let laserTrail = [], laserTimer = null, colorHistory = [];
  let paths = [], redoStack = [];
  let selectionBubble = null, readingOverlay = null, readingArticle = null;
  let readingSource = null, readingRuler = null, toolbar = null;
  let canvas = null, ctx = null, laserCanvas = null, laserCtx = null;
  let focusTimerId = null, restOverlay = null;
  let initialized = false, pendingToggleAfterInit = false;
  let toolbarDrag = { active: false, x: 0, y: 0 };
  let studyState = { ...DEFAULT_STUDY_STATE };

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    if (initialized) return true;
    if (!document.body) { waitForBody(); return false; }
    buildCanvas();
    buildLaserCanvas();
    buildReadingOverlay();
    buildReadingRuler();
    buildRestOverlay();
    buildToolbar();
    buildSelectionBubble();
    attachEvents();
    loadSettings();
    initialized = true;
    if (pendingToggleAfterInit) { pendingToggleAfterInit = false; toggle(); }
    return true;
  }

  function ensureUiReady() {
    if (!document.body) return false;
    if (!canvas || !canvas.isConnected) buildCanvas();
    if (!laserCanvas || !laserCanvas.isConnected) buildLaserCanvas();
    if (!readingOverlay || !readingOverlay.isConnected || !readingOverlay.querySelector("#dp-reading-article")) buildReadingOverlay();
    if (!readingRuler || !readingRuler.isConnected) buildReadingRuler();
    if (!restOverlay || !restOverlay.isConnected) buildRestOverlay();
    if (!toolbar || !toolbar.isConnected || !toolbar.querySelector("#dp-close")) buildToolbar();
    if (!selectionBubble || !selectionBubble.isConnected) buildSelectionBubble();
    return Boolean(canvas && laserCanvas && readingOverlay && readingArticle && readingRuler && toolbar && selectionBubble);
  }

  function waitForBody() {
    if (window.__drawPencilInitWaiting) return;
    window.__drawPencilInitWaiting = true;
    const onReady = () => {
      window.__drawPencilInitWaiting = false;
      document.removeEventListener("DOMContentLoaded", onReady, true);
      init();
    };
    document.addEventListener("DOMContentLoaded", onReady, true);
  }

  // ─── Canvas ───────────────────────────────────────────────────────────────
  function buildCanvas() {
    canvas = document.getElementById("dp-canvas") || document.createElement("canvas");
    canvas.id = "dp-canvas";
    if (!canvas.parentNode) document.documentElement.appendChild(canvas);
    Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "2147483640", pointerEvents: "none", background: "transparent", display: "block", cursor: "crosshair" });
    ctx = canvas.getContext("2d");
    resizeCanvas();
  }

  function buildLaserCanvas() {
    laserCanvas = document.getElementById("dp-laser") || document.createElement("canvas");
    laserCanvas.id = "dp-laser";
    if (!laserCanvas.parentNode) document.documentElement.appendChild(laserCanvas);
    Object.assign(laserCanvas.style, { position: "fixed", inset: "0", zIndex: "2147483641", pointerEvents: "none", background: "transparent", display: "none" });
    laserCtx = laserCanvas.getContext("2d");
    resizeCanvas();
  }

  // ─── Rest Overlay (shown when focus timer ends) ───────────────────────────
  function buildRestOverlay() {
    restOverlay = document.getElementById("dp-rest-overlay");
    if (!restOverlay) {
      restOverlay = document.createElement("div");
      restOverlay.id = "dp-rest-overlay";
      restOverlay.innerHTML = `
        <div class="dp-rest-card">
          <div class="dp-rest-icon">${icons.coffee}</div>
          <h2 class="dp-rest-title">Session Complete! ☕</h2>
          <p class="dp-rest-subtitle">Great work. Your focus session is done.<br>Take a proper break and reset before the next round.</p>
          <div class="dp-rest-timer-wrap">
            <div class="dp-rest-timer-label">Rest Time</div>
            <div class="dp-rest-countdown" id="dp-rest-countdown">05:00</div>
            <div class="dp-rest-progress-track"><div class="dp-rest-progress-bar" id="dp-rest-progress-bar"></div></div>
          </div>
          <div class="dp-rest-tips">
            <div class="dp-rest-tip">👀 Look away from the screen — focus on something 20 feet away for 20 seconds</div>
            <div class="dp-rest-tip">🚶 Stand up, stretch your legs and back</div>
            <div class="dp-rest-tip">💧 Drink some water and breathe deeply</div>
          </div>
          <div class="dp-rest-actions">
            <button class="dp-rest-btn primary" id="dp-rest-new-session">Start New Session</button>
            <button class="dp-rest-btn secondary" id="dp-rest-dismiss">Dismiss</button>
          </div>
        </div>
      `;
      document.body.appendChild(restOverlay);
    }
    restOverlay.querySelector("#dp-rest-new-session").onclick = () => {
      hideRestOverlay();
      resetFocusTimer();
      startFocusTimer();
    };
    restOverlay.querySelector("#dp-rest-dismiss").onclick = hideRestOverlay;
  }

  let restTimerId = null;
  let restSecondsLeft = 300;

  function showRestOverlay() {
    if (!restOverlay || !restOverlay.isConnected) buildRestOverlay();
    restSecondsLeft = 300; // 5 min rest
    restOverlay.style.display = "flex";
    requestAnimationFrame(() => restOverlay.classList.add("visible"));
    updateRestCountdown();
    if (restTimerId) clearInterval(restTimerId);
    restTimerId = setInterval(() => {
      restSecondsLeft -= 1;
      updateRestCountdown();
      if (restSecondsLeft <= 0) {
        clearInterval(restTimerId);
        restTimerId = null;
        showToast("Rest time over — ready for another session?");
      }
    }, 1000);
  }

  function updateRestCountdown() {
    const el = document.getElementById("dp-rest-countdown");
    const bar = document.getElementById("dp-rest-progress-bar");
    if (el) el.textContent = formatTime(Math.max(0, restSecondsLeft));
    if (bar) bar.style.width = `${(restSecondsLeft / 300) * 100}%`;
  }

  function hideRestOverlay() {
    if (restTimerId) { clearInterval(restTimerId); restTimerId = null; }
    if (restOverlay) {
      restOverlay.classList.remove("visible");
      setTimeout(() => { if (restOverlay) restOverlay.style.display = "none"; }, 400);
    }
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  function buildToolbar() {
    toolbar = document.getElementById("dp-toolbar");
    if (!toolbar) { toolbar = document.createElement("div"); toolbar.id = "dp-toolbar"; document.body.appendChild(toolbar); }
    toolbar.innerHTML = `
      <div id="dp-handle">
        <div class="dp-brand">
          <div class="dp-brand-mark">DP</div>
          <div>
            <div class="dp-title">Draw Pencil Pro</div>
            <div class="dp-subtitle">Advanced Study Toolkit</div>
          </div>
        </div>
        <button id="dp-close" class="dp-header-btn" title="Close (Esc)">✕</button>
      </div>

      <div class="dp-panel">
        <div class="dp-section-label">Drawing Tools</div>
        <div class="dp-tool-grid" id="dp-tools">
          ${toolButton("pencil","Pencil")} ${toolButton("highlighter","Highlight")}
          ${toolButton("eraser","Eraser")} ${toolButton("line","Line")}
          ${toolButton("arrow","Arrow")} ${toolButton("rect","Rect")}
          ${toolButton("ellipse","Ellipse")} ${toolButton("sticky","Note")}
        </div>

        <div class="dp-section-label">Actions</div>
        <div class="dp-action-row">
          ${actionButton("dp-undo", icons.undo, "Undo", "Undo (Ctrl+Z)")}
          ${actionButton("dp-redo", icons.redo, "Redo", "Redo (Ctrl+Y)")}
          ${actionButton("dp-screenshot", icons.save, "Save", "Save drawing (Ctrl+S)")}
          ${actionButton("dp-fullscreenshot", `${icons.copy}<span class="dp-action-badge">PG</span>`, "Full Page", "Capture full page")}
          ${actionButton("dp-copy", icons.copy, "Copy", "Copy to clipboard")}
          ${actionButton("dp-lock", icons.lock, "Lock", "Lock canvas")}
          ${actionButton("dp-clear", icons.clear, "Clear", "Clear all", "danger")}
        </div>

        <div class="dp-section-label">Color</div>
        <div class="dp-inline-heading">Color Picker</div>
        <div class="dp-color-row">
          ${COLORS.map(c => `<button class="dp-color-btn" data-color="${c}" style="background:${c}" title="${c}"></button>`).join("")}
          <label class="dp-pick-color-btn" for="dp-custom-color">
            <span class="dp-pick-color-swatch" id="dp-pick-color-swatch"></span>
            <span>Pick Color</span>
          </label>
          <input type="color" id="dp-custom-color" value="${THEME.primary}" title="Custom color">
        </div>
        <div id="dp-color-history-row" class="dp-history-row"></div>

        <div class="dp-section-label">Brush</div>
        <div class="dp-range-row">
          <label>Size</label>
          <input type="range" id="dp-size" min="1" max="40" value="3">
          <span id="dp-size-val">3px</span>
        </div>
        <div class="dp-range-row">
          <label>Opacity</label>
          <input type="range" id="dp-opacity" min="10" max="100" value="100">
          <span id="dp-opacity-val">100%</span>
        </div>

        <div class="dp-section-label">Workspace</div>
        <div class="dp-toggle-stack">
          ${toggleRow("dp-fill","Fill shapes")}
          ${toggleRow("dp-grid","Grid overlay")}
          ${toggleRow("dp-pressure","Pressure feel", true)}
          ${toggleRow("dp-dim","Dim page")}
        </div>

        <div class="dp-section-label">Reading Lab</div>
        <div class="dp-study-grid">
          <button class="dp-feature-btn" id="dp-reading-toggle">${icons.reader}<span>Reading Mode</span></button>
          <button class="dp-feature-btn" id="dp-ruler-toggle">${icons.ruler}<span>Reading Ruler</span></button>
          <button class="dp-feature-btn" id="dp-highlight-export">${icons.export}<span>Export Notes</span></button>
          <button class="dp-feature-btn" id="dp-open-summary">${icons.card}<span>Study Summary</span></button>
        </div>

        <div class="dp-section-label">Focus Timer (Pomodoro)</div>
        <div class="dp-timer-card">
          <div class="dp-timer-top">
            <div>
              <div class="dp-timer-label">Goal (mins)</div>
              <input type="number" id="dp-focus-goal" min="1" max="180" step="5" value="25">
            </div>
            <div class="dp-timer-badge" id="dp-focus-display">25:00</div>
          </div>
          <div class="dp-timer-progress-track"><div class="dp-timer-progress-bar" id="dp-timer-progress-bar"></div></div>
          <div class="dp-timer-actions">
            <button class="dp-action-wide primary" id="dp-focus-start">Start</button>
            <button class="dp-action-wide" id="dp-focus-reset">Reset</button>
          </div>
        </div>

        <div class="dp-section-label">Session Stats</div>
        <div class="dp-stats-grid">
          <div class="dp-stat-card"><strong id="dp-strokes-count">0</strong><span>Strokes</span></div>
          <div class="dp-stat-card"><strong id="dp-highlights-count">0</strong><span>Highlights</span></div>
          <div class="dp-stat-card"><strong id="dp-flashcards-count">0</strong><span>Flashcards</span></div>
          <div class="dp-stat-card"><strong id="dp-bookmarks-count">0</strong><span>Bookmarks</span></div>
        </div>
      </div>

      <div class="dp-footer">
        <div id="dp-session-note">Select text on the page to save highlights, flashcards & bookmarks.</div>
        <div id="dp-status">Ready · Alt+D to toggle</div>
      </div>
    `;
    wireToolbar();
  }

  function toolButton(tool, label) {
    return `<button class="dp-tool-btn ${tool === activeTool ? "active" : ""}" data-tool="${tool}" title="${label}">${icons[tool] || ""}<span>${label}</span></button>`;
  }

  function actionButton(id, icon, label, title, extraClass = "") {
    return `<button class="dp-action-btn ${extraClass}" id="${id}" title="${title}" aria-label="${title}">${icon}<span class="dp-action-hover">${label}</span></button>`;
  }

  function toggleRow(id, label, checked = false) {
    return `<label class="dp-toggle-label"><input type="checkbox" id="${id}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
  }

  function wireToolbar() {
    toolbar.querySelectorAll(".dp-tool-btn").forEach(btn => {
      btn.onclick = () => {
        const tool = btn.dataset.tool;
        if (tool === "reader") return toggleReadingMode();
        if (tool === "ruler") return toggleReadingRuler();
        setTool(tool);
      };
    });
    toolbar.querySelectorAll(".dp-color-btn").forEach(btn => { btn.onclick = () => setColor(btn.dataset.color); });
    document.getElementById("dp-custom-color").oninput = e => setColor(e.target.value);
    document.getElementById("dp-size").oninput = e => {
      currentSize = Number(e.target.value);
      document.getElementById("dp-size-val").textContent = `${currentSize}px`;
      saveSettings();
    };
    document.getElementById("dp-opacity").oninput = e => {
      currentOpacity = Number(e.target.value) / 100;
      document.getElementById("dp-opacity-val").textContent = `${e.target.value}%`;
      saveSettings();
    };
    document.getElementById("dp-fill").onchange = e => { fillShapes = e.target.checked; };
    document.getElementById("dp-grid").onchange = e => { showGrid = e.target.checked; redraw(); saveSettings(); };
    document.getElementById("dp-pressure").onchange = e => { pressureSimulation = e.target.checked; };
    document.getElementById("dp-dim").onchange = e => {
      canvasDimmed = e.target.checked;
      canvas.style.background = canvasDimmed ? "rgba(15,23,42,0.14)" : "transparent";
    };
    document.getElementById("dp-reading-toggle").onclick = toggleReadingMode;
    document.getElementById("dp-ruler-toggle").onclick = toggleReadingRuler;
    document.getElementById("dp-highlight-export").onclick = exportStudyNotes;
    document.getElementById("dp-open-summary").onclick = () => { if (!studyState.readingMode) toggleReadingMode(); else renderStudyPanels(); };
    document.getElementById("dp-focus-goal").onchange = e => {
      const mins = clamp(Number(e.target.value) || 25, 1, 180);
      studyState.focusGoalMinutes = mins;
      if (!studyState.focusRunning) studyState.focusRemainingSeconds = mins * 60;
      updateTimerDisplay(); saveSettings();
    };
    document.getElementById("dp-focus-start").onclick = toggleFocusTimer;
    document.getElementById("dp-focus-reset").onclick = resetFocusTimer;
    document.getElementById("dp-undo").onclick = undo;
    document.getElementById("dp-redo").onclick = redo;
    document.getElementById("dp-screenshot").onclick = saveScreenshot;
    document.getElementById("dp-fullscreenshot").onclick = saveFullPageScreenshot;
    document.getElementById("dp-copy").onclick = fullPageScreenshotToClipboard;
    document.getElementById("dp-lock").onclick = toggleLock;
    document.getElementById("dp-clear").onclick = clearAll;
    document.getElementById("dp-close").onclick = toggle;
    const handle = document.getElementById("dp-handle");
    handle.addEventListener("mousedown", startToolbarDrag, true);
  }

  // ─── Selection Bubble ────────────────────────────────────────────────────
  function buildSelectionBubble() {
    selectionBubble = document.getElementById("dp-selection-bubble");
    if (!selectionBubble) {
      selectionBubble = document.createElement("div");
      selectionBubble.id = "dp-selection-bubble";
      selectionBubble.innerHTML = `
        <button data-action="highlight">💛 Highlight</button>
        <button data-action="flashcard">🃏 Flashcard</button>
        <button data-action="bookmark">🔖 Bookmark</button>
      `;
      document.body.appendChild(selectionBubble);
    }
    selectionBubble.addEventListener("click", onSelectionBubbleClick);
  }

  // ─── Reading Overlay ─────────────────────────────────────────────────────
  function buildReadingOverlay() {
    readingOverlay = document.getElementById("dp-reading-overlay");
    if (!readingOverlay) {
      readingOverlay = document.createElement("div");
      readingOverlay.id = "dp-reading-overlay";
      readingOverlay.innerHTML = `
        <div class="dp-reading-shell">
          <div class="dp-reading-topbar">
            <div class="dp-reading-topbar-left">
              <div class="dp-reading-title">📖 Reading Mode</div>
              <div class="dp-reading-subtitle" id="dp-reading-source-label">Clean article view</div>
            </div>
            <div class="dp-reading-topbar-right">
              <button class="dp-header-btn" id="dp-reading-ruler-btn">Ruler</button>
              <button class="dp-header-btn" id="dp-reading-export-btn">Export</button>
              <button class="dp-header-btn danger-btn" id="dp-reading-close">✕ Close</button>
            </div>
          </div>

          <div class="dp-reading-controls">
            <label class="dp-reading-ctrl-label">
              <span>Text Size <strong id="dp-reading-font-size-val">20px</strong></span>
              <input type="range" id="dp-reading-font-size" min="14" max="32" value="20">
            </label>
            <label class="dp-reading-ctrl-label">
              <span>Line Height <strong id="dp-reading-line-height-val">1.85</strong></span>
              <input type="range" id="dp-reading-line-height" min="13" max="28" value="18">
            </label>
            <label class="dp-reading-ctrl-label">
              <span>Max Width <strong id="dp-reading-width-val">860px</strong></span>
              <input type="range" id="dp-reading-width" min="480" max="1200" value="860">
            </label>
          </div>

          <div class="dp-reading-content-wrap">
            <article id="dp-reading-article"></article>
            <aside class="dp-reading-side">
              <div class="dp-side-card">
                <div class="dp-side-heading">📊 Study Snapshot</div>
                <div class="dp-side-list" id="dp-study-summary"></div>
              </div>
              <div class="dp-side-card">
                <div class="dp-side-heading">💛 Highlights</div>
                <div class="dp-side-list" id="dp-highlights-list"></div>
              </div>
              <div class="dp-side-card">
                <div class="dp-side-heading">🃏 Flashcards</div>
                <div class="dp-side-list" id="dp-flashcards-list"></div>
              </div>
              <div class="dp-side-card">
                <div class="dp-side-heading">🔖 Bookmarks</div>
                <div class="dp-side-list" id="dp-bookmarks-list"></div>
              </div>
            </aside>
          </div>
        </div>
      `;
      document.body.appendChild(readingOverlay);
    }
    readingArticle = readingOverlay.querySelector("#dp-reading-article");
    wireReadingOverlay();
  }

  function wireReadingOverlay() {
    const close = readingOverlay.querySelector("#dp-reading-close");
    const rulerBtn = readingOverlay.querySelector("#dp-reading-ruler-btn");
    const exportBtn = readingOverlay.querySelector("#dp-reading-export-btn");
    const fontSlider = readingOverlay.querySelector("#dp-reading-font-size");
    const lineSlider = readingOverlay.querySelector("#dp-reading-line-height");
    const widthSlider = readingOverlay.querySelector("#dp-reading-width");

    if (close) close.onclick = toggleReadingMode;
    if (rulerBtn) rulerBtn.onclick = toggleReadingRuler;
    if (exportBtn) exportBtn.onclick = exportStudyNotes;
    if (fontSlider) fontSlider.oninput = e => {
      studyState.readingFontSize = Number(e.target.value);
      const val = readingOverlay.querySelector("#dp-reading-font-size-val");
      if (val) val.textContent = `${studyState.readingFontSize}px`;
      applyReadingSettings(); saveSettings();
    };
    if (lineSlider) lineSlider.oninput = e => {
      studyState.readingLineHeight = Number(e.target.value) / 10;
      const val = readingOverlay.querySelector("#dp-reading-line-height-val");
      if (val) val.textContent = studyState.readingLineHeight.toFixed(2);
      applyReadingSettings(); saveSettings();
    };
    if (widthSlider) widthSlider.oninput = e => {
      studyState.readingWidth = Number(e.target.value);
      const val = readingOverlay.querySelector("#dp-reading-width-val");
      if (val) val.textContent = `${studyState.readingWidth}px`;
      applyReadingSettings(); saveSettings();
    };
  }

  function buildReadingRuler() {
    readingRuler = document.getElementById("dp-reading-ruler");
    if (!readingRuler) {
      readingRuler = document.createElement("div");
      readingRuler.id = "dp-reading-ruler";
      document.body.appendChild(readingRuler);
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  function attachEvents() {
    canvas.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("selectionchange", onSelectionChange, true);
    window.addEventListener("scroll", onSelectionChange, true);
    window.addEventListener("mousemove", onWindowMouseMove, true);
    window.addEventListener("mouseup", stopToolbarDrag, true);
  }

  function startToolbarDrag(e) {
    if (e.target.id === "dp-close") return;
    const rect = toolbar.getBoundingClientRect();
    toolbarDrag.active = true;
    toolbarDrag.x = e.clientX - rect.left;
    toolbarDrag.y = e.clientY - rect.top;
    e.preventDefault();
  }

  function stopToolbarDrag() { toolbarDrag.active = false; }

  function onWindowMouseMove(e) {
    if (toolbarDrag.active) {
      const left = clamp(e.clientX - toolbarDrag.x, 12, window.innerWidth - toolbar.offsetWidth - 12);
      const top = clamp(e.clientY - toolbarDrag.y, 12, window.innerHeight - toolbar.offsetHeight - 12);
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${top}px`;
      toolbar.style.right = "auto";
    }
    if (studyState.rulerEnabled) { studyState.rulerY = e.clientY; updateReadingRuler(); }
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (!enabled || locked || studyState.readingMode) return;
    const point = { x: e.clientX, y: e.clientY };
    if (activeTool === "text") return placeTextInput(point);
    if (activeTool === "sticky") return placeStickyNote(point);
    if (activeTool === "laser") { drawing = true; laserTrail = [point]; return; }
    drawing = true;
    redoStack = [];
    shapeStart = point;
    current = {
      tool: activeTool,
      color: activeTool === "eraser" ? null : currentColor,
      size: currentSize,
      opacity: activeTool === "highlighter" ? Math.min(currentOpacity, 0.35) : currentOpacity,
      fill: fillShapes,
      points: [point],
      startX: point.x, startY: point.y, endX: point.x, endY: point.y
    };
    e.preventDefault(); e.stopPropagation();
  }

  function onMouseMove(e) {
    if (!drawing || !enabled) return;
    const point = { x: e.clientX, y: e.clientY };
    if (activeTool === "laser") {
      laserTrail.push(point);
      if (laserTrail.length > 60) laserTrail.shift();
      drawLaser(); return;
    }
    if (["pencil","highlighter","eraser"].includes(activeTool)) current.points.push(point);
    else { current.endX = point.x; current.endY = point.y; }
    redraw();
  }

  function onMouseUp() {
    if (!drawing || !enabled) return;
    drawing = false;
    if (activeTool === "laser") { clearTimeout(laserTimer); laserTimer = setTimeout(clearLaser, 700); return; }
    if (current) { paths.push(current); current = null; redraw(); refreshStats(); saveSettings(); }
  }

  function onTouchStart(e) {
    const t = e.touches[0]; if (!t) return;
    e.preventDefault();
    onMouseDown({ clientX: t.clientX, clientY: t.clientY, preventDefault() {}, stopPropagation() {} });
  }
  function onTouchMove(e) {
    const t = e.touches[0]; if (!t) return;
    e.preventDefault();
    onMouseMove({ clientX: t.clientX, clientY: t.clientY });
  }
  function onTouchEnd(e) { e.preventDefault(); onMouseUp(); }

  // ─── Text / Sticky ────────────────────────────────────────────────────────
  function placeTextInput(point) {
    cancelText();
    textInput = document.createElement("div");
    textInput.id = "dp-text-input";
    textInput.contentEditable = "true";
    Object.assign(textInput.style, {
      position: "fixed", left: `${point.x}px`, top: `${point.y}px`,
      minWidth: "120px", minHeight: "36px", padding: "8px 10px",
      borderRadius: "12px", border: `2px solid ${currentColor}`,
      background: "rgba(255,255,255,0.96)", color: currentColor,
      outline: "none", fontFamily: "'Manrope', sans-serif",
      fontSize: `${Math.max(14, currentSize * 4)}px`, fontWeight: "700",
      zIndex: "2147483645", boxShadow: "0 18px 40px rgba(15,23,42,0.18)"
    });
    document.body.appendChild(textInput);
    textInput.focus();
    textInput.addEventListener("blur", commitText);
    textInput.addEventListener("keydown", e => { if (e.key === "Escape") cancelText(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") commitText(); });
    setStatus("Typing text — click outside or Ctrl+Enter to place.");
  }

  function commitText() {
    if (!textInput) return;
    const text = textInput.innerText.trim();
    if (text) {
      const rect = textInput.getBoundingClientRect();
      paths.push({ tool: "text", color: currentColor, size: currentSize, opacity: currentOpacity, text, startX: rect.left, startY: rect.top });
      redraw(); refreshStats(); saveSettings();
    }
    textInput.remove(); textInput = null;
  }

  function cancelText() { if (!textInput) return; textInput.remove(); textInput = null; }

  function placeStickyNote(point) {
    const note = document.createElement("div");
    note.className = "dp-sticky-note";
    note.innerHTML = `
      <div class="dp-sticky-head"><span>📌 Study Note</span><button type="button">✕</button></div>
      <div class="dp-sticky-body" contenteditable="true" data-placeholder="Write a quick insight, formula or reminder."></div>
    `;
    note.style.left = `${point.x}px`; note.style.top = `${point.y}px`;
    document.body.appendChild(note);
    note.querySelector("button").onclick = () => note.remove();
    const head = note.querySelector(".dp-sticky-head");
    const body = note.querySelector(".dp-sticky-body");
    body.focus();
    let drag = null;
    head.addEventListener("mousedown", e => { const r = note.getBoundingClientRect(); drag = { x: e.clientX - r.left, y: e.clientY - r.top }; e.preventDefault(); });
    window.addEventListener("mousemove", e => { if (!drag) return; note.style.left = `${clamp(e.clientX - drag.x, 0, window.innerWidth - note.offsetWidth)}px`; note.style.top = `${clamp(e.clientY - drag.y, 0, window.innerHeight - note.offsetHeight)}px`; });
    window.addEventListener("mouseup", () => { drag = null; });
    setStatus("Sticky note placed.");
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  function redraw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showGrid) drawGrid();
    paths.forEach(renderPath);
    if (current) renderPath(current);
  }

  function drawGrid() {
    ctx.save(); ctx.strokeStyle = "rgba(37,99,235,0.12)"; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    ctx.restore();
  }

  function renderPath(path) {
    ctx.save(); ctx.globalAlpha = path.opacity ?? 1;
    if (path.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "#000"; ctx.lineWidth = path.size * 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      drawSmoothLine(path.points);
    } else if (path.tool === "pencil") {
      ctx.strokeStyle = path.color; ctx.lineCap = "round"; ctx.lineJoin = "round";
      drawPressureLine(path.points, path.size);
    } else if (path.tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.35;
      ctx.strokeStyle = path.color; ctx.lineWidth = path.size * 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      drawSmoothLine(path.points);
    } else if (path.tool === "line") {
      ctx.strokeStyle = path.color; ctx.lineWidth = path.size;
      ctx.beginPath(); ctx.moveTo(path.startX, path.startY); ctx.lineTo(path.endX, path.endY); ctx.stroke();
    } else if (path.tool === "arrow") { drawArrow(path);
    } else if (path.tool === "rect") { drawRect(path);
    } else if (path.tool === "ellipse") { drawEllipse(path);
    } else if (path.tool === "text") {
      ctx.fillStyle = path.color; ctx.font = `700 ${Math.max(14, path.size * 4)}px 'Manrope', sans-serif`;
      path.text.split("\n").forEach((line, i) => ctx.fillText(line, path.startX, path.startY + (i + 1) * Math.max(16, path.size * 5)));
    }
    ctx.restore();
  }

  function drawRect(path) {
    const x = Math.min(path.startX, path.endX), y = Math.min(path.startY, path.endY);
    const w = Math.abs(path.endX - path.startX), h = Math.abs(path.endY - path.startY);
    ctx.strokeStyle = path.color; ctx.lineWidth = path.size;
    if (path.fill) { ctx.fillStyle = path.color; ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(x, y, w, h);
  }

  function drawEllipse(path) {
    const cx = (path.startX + path.endX) / 2, cy = (path.startY + path.endY) / 2;
    const rx = Math.abs(path.endX - path.startX) / 2, ry = Math.abs(path.endY - path.startY) / 2;
    ctx.strokeStyle = path.color; ctx.lineWidth = path.size;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (path.fill) { ctx.fillStyle = path.color; ctx.fill(); }
    ctx.stroke();
  }

  function drawArrow(path) {
    const dx = path.endX - path.startX, dy = path.endY - path.startY;
    const angle = Math.atan2(dy, dx), head = Math.max(10, path.size * 4);
    ctx.strokeStyle = path.color; ctx.fillStyle = path.color; ctx.lineWidth = path.size;
    ctx.beginPath(); ctx.moveTo(path.startX, path.startY); ctx.lineTo(path.endX, path.endY); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(path.endX, path.endY);
    ctx.lineTo(path.endX - head * Math.cos(angle - Math.PI / 6), path.endY - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(path.endX - head * Math.cos(angle + Math.PI / 6), path.endY - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  }

  function drawSmoothLine(points) {
    if (!points || points.length < 2) return;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2, my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y); ctx.stroke();
  }

  function drawPressureLine(points, baseSize) {
    if (!points || points.length < 2) return;
    for (let i = 1; i < points.length; i++) {
      const t = pressureSimulation ? 0.3 + (0.7 * i / points.length) : 1;
      ctx.lineWidth = baseSize * t;
      ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
    }
  }

  // ─── Laser ────────────────────────────────────────────────────────────────
  function drawLaser() {
    if (!laserCtx || laserTrail.length < 2) return;
    laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
    for (let i = 1; i < laserTrail.length; i++) {
      const alpha = i / laserTrail.length;
      laserCtx.strokeStyle = `rgba(239,68,68,${alpha})`;
      laserCtx.lineWidth = 3 * alpha;
      laserCtx.lineCap = "round";
      laserCtx.beginPath(); laserCtx.moveTo(laserTrail[i - 1].x, laserTrail[i - 1].y);
      laserCtx.lineTo(laserTrail[i].x, laserTrail[i].y); laserCtx.stroke();
    }
    const tip = laserTrail[laserTrail.length - 1];
    const g = laserCtx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 18);
    g.addColorStop(0, "rgba(239,68,68,0.9)"); g.addColorStop(1, "rgba(239,68,68,0)");
    laserCtx.fillStyle = g; laserCtx.beginPath(); laserCtx.arc(tip.x, tip.y, 18, 0, Math.PI * 2); laserCtx.fill();
  }

  function clearLaser() { if (laserCtx) laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height); laserTrail = []; }

  // ─── Undo / Redo / Clear ─────────────────────────────────────────────────
  function undo() { if (!paths.length) return; redoStack.push(paths.pop()); redraw(); refreshStats(); setStatus("Undo."); }
  function redo() { if (!redoStack.length) return; paths.push(redoStack.pop()); redraw(); refreshStats(); setStatus("Redo."); }
  function clearAll() { if (!paths.length) return; redoStack = [...paths]; paths = []; redraw(); refreshStats(); setStatus("Canvas cleared."); }
  function toggleLock() { locked = !locked; canvas.style.pointerEvents = locked ? "none" : "auto"; document.getElementById("dp-lock").classList.toggle("active", locked); setStatus(locked ? "Drawing locked." : "Drawing unlocked."); }

  function saveScreenshot() {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `draw-pencil-pro-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Drawing saved");
    setStatus("Screenshot saved.");
  }

  function saveFullPageScreenshot() {
    showToast("📸 Capturing full page…");
    // Temporarily hide toolbar and selection bubble for clean capture
    const tbWas = toolbar ? toolbar.style.display : "";
    const sbWas = selectionBubble ? selectionBubble.style.display : "";
    if (toolbar) toolbar.style.display = "none";
    if (selectionBubble) selectionBubble.style.display = "none";
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "CAPTURE_TAB" }, (response) => {
        // Restore toolbar
        if (toolbar) toolbar.style.display = tbWas;
        if (selectionBubble) selectionBubble.style.display = sbWas;
        if (chrome.runtime.lastError || !response?.dataUrl) {
          const link = document.createElement("a");
          link.download = `draw-pencil-pro-${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png"); link.click();
          showToast("Drawing saved (page capture failed) ✓"); return;
        }
        const pageImg = new Image();
        pageImg.onload = () => {
          const offscreen = document.createElement("canvas");
          offscreen.width = canvas.width; offscreen.height = canvas.height;
          const octx = offscreen.getContext("2d");
          octx.drawImage(pageImg, 0, 0, canvas.width, canvas.height);
          if (canvasDimmed) { octx.fillStyle = "rgba(15,23,42,0.14)"; octx.fillRect(0, 0, offscreen.width, offscreen.height); }
          octx.drawImage(canvas, 0, 0);
          const link = document.createElement("a");
          link.download = `draw-pencil-fullpage-${Date.now()}.png`;
          link.href = offscreen.toDataURL("image/png"); link.click();
          showToast("📸 Full page + drawings saved ✓");
          setStatus("Full screenshot saved.");
        };
        pageImg.onerror = () => { const link = document.createElement("a"); link.download = `draw-pencil-pro-${Date.now()}.png`; link.href = canvas.toDataURL("image/png"); link.click(); showToast("Drawing saved ✓"); };
        pageImg.src = response.dataUrl;
      });
    }, 150); // Small delay to let toolbar hide render
  }

  function fullPageScreenshotToClipboard() {
    setStatus("Capturing full page for clipboard…");
    chrome.runtime.sendMessage({ action: "CAPTURE_TAB" }, (response) => {
      if (chrome.runtime.lastError || !response?.dataUrl) {
        copyToClipboard(); return;
      }
      const pageImg = new Image();
      pageImg.onload = () => {
        const offscreen = document.createElement("canvas");
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const octx = offscreen.getContext("2d");
        octx.drawImage(pageImg, 0, 0, canvas.width, canvas.height);
        if (canvasDimmed) { octx.fillStyle = "rgba(15,23,42,0.14)"; octx.fillRect(0, 0, offscreen.width, offscreen.height); }
        octx.drawImage(canvas, 0, 0);
        offscreen.toBlob(async blob => {
          if (!blob) return setStatus("Unable to copy.");
          try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); showToast("Full page copied ✓"); }
          catch (_) { setStatus("Clipboard not available here."); }
        });
      };
      pageImg.onerror = () => copyToClipboard();
      pageImg.src = response.dataUrl;
    });
  }

  function copyToClipboard() {
    canvas.toBlob(async blob => {
      if (!blob) return setStatus("Unable to copy.");
      try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); showToast("Copied ✓"); }
      catch (_) { setStatus("Clipboard not available here."); }
    });
  }

  // ─── Selection Bubble ────────────────────────────────────────────────────
  function onSelectionChange() {
    if (!enabled) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { selectionBubble.style.display = "none"; return; }
    const text = sel.toString().trim();
    if (!text || text.length < 2 || selectionBubble.contains(sel.anchorNode)) { selectionBubble.style.display = "none"; return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) { selectionBubble.style.display = "none"; return; }
    selectionBubble.style.display = "flex";
    // Use fixed positioning (viewport-relative)
    const bubbleWidth = 280;
    const left = clamp(rect.left + rect.width / 2 - bubbleWidth / 2, 12, window.innerWidth - bubbleWidth - 12);
    const top = Math.max(12, rect.top - 60);
    selectionBubble.style.left = `${left}px`;
    selectionBubble.style.top = `${top}px`;
  }

  function onSelectionBubbleClick(e) {
    const action = e.target.dataset.action;
    if (!action) return;
    const payload = getSelectionPayload();
    if (!payload) return;
    if (action === "highlight") addHighlight(payload);
    if (action === "flashcard") addFlashcard(payload);
    if (action === "bookmark") addBookmark(payload);
    window.getSelection()?.removeAllRanges();
    selectionBubble.style.display = "none";
  }

  function getSelectionPayload() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim().replace(/\s+/g, " ");
    if (!text) return null;
    const anchor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer;
    const section = anchor?.closest("article, section, p, div, li, h1, h2, h3");
    const context = (section?.innerText || document.title || "").trim().replace(/\s+/g, " ").slice(0, 220);
    return { id: createId(), text: text.slice(0, 600), context, url: location.href, title: document.title, createdAt: new Date().toISOString() };
  }

  function addHighlight(item) { studyState.highlights.unshift(item); studyState.highlights = studyState.highlights.slice(0, 50); refreshStats(); renderStudyPanels(); saveSettings(); showToast("💛 Highlight saved"); }
  function addFlashcard(item) {
    const question = item.text.length > 110 ? `What is the key idea in: "${item.text.slice(0, 110)}..."?` : `Recall: "${item.text}"`;
    studyState.flashcards.unshift({ id: item.id, question, answer: item.context || item.text, source: item.text, createdAt: item.createdAt });
    studyState.flashcards = studyState.flashcards.slice(0, 30);
    refreshStats(); renderStudyPanels(); saveSettings(); showToast("🃏 Flashcard created");
  }
  function addBookmark(item) {
    studyState.bookmarks.unshift({ id: item.id, label: item.text.slice(0, 90), url: item.url, title: item.title, createdAt: item.createdAt });
    studyState.bookmarks = studyState.bookmarks.slice(0, 30);
    refreshStats(); renderStudyPanels(); saveSettings(); showToast("🔖 Bookmark added");
  }

  // ─── Reading Mode ─────────────────────────────────────────────────────────
  function toggleReadingMode() {
    if (!ensureUiReady()) return;
    if (!studyState.readingMode) {
      const content = extractReadableContent();
      if (!content) { showToast("Could not extract content from this page."); setStatus("Reading mode: no content found."); return; }
      readingArticle.innerHTML = content.html;
      readingOverlay.style.display = "block";
      requestAnimationFrame(() => readingOverlay.classList.add("dp-reading-visible"));
      document.documentElement.classList.add("dp-reading-open");
      studyState.readingMode = true;
      studyState.readingSessions += 1;
      const label = readingOverlay.querySelector("#dp-reading-source-label");
      if (label) label.textContent = content.title || document.title;
      applyReadingSettings();
      renderStudyPanels();
      setStatus("Reading mode — Esc to close.");
      showToast("📖 Reading Mode ON");
      // Wire selection events inside reading overlay
      readingArticle.addEventListener("mouseup", onSelectionChange);
    } else {
      readingOverlay.classList.remove("dp-reading-visible");
      setTimeout(() => { readingOverlay.style.display = "none"; }, 300);
      document.documentElement.classList.remove("dp-reading-open");
      studyState.readingMode = false;
      setStatus("Reading mode closed.");
      showToast("Reading Mode OFF");
    }
    toolbar.querySelector('[data-tool="reader"]')?.classList.toggle("active", studyState.readingMode);
    toolbar.querySelector("#dp-reading-toggle")?.classList.toggle("active", studyState.readingMode);
    saveSettings();
  }

  /**
   * Improved content extraction — works on articles, news sites,
   * Wikipedia, blogs, documentation pages, and plain pages.
   */
  function extractReadableContent() {
    // Remove known noise element tags from scoring
    const NOISE_TAGS = ["script","style","nav","header","footer","aside","form","button","noscript","iframe","advertisement","figure.ad","[class*='cookie']","[class*='banner']","[class*='popup']","[id*='ad-']","[class*='sidebar']","[class*='widget']","[class*='share']","[class*='social']","[class*='comment']"];

    // Strategy 1: Semantic selectors ordered by confidence
    const CANDIDATE_SELECTORS = [
      "[itemprop='articleBody']", "[itemprop='text']",
      "article .post-content", "article .entry-content", "article .content",
      "article", "main article",
      "[role='main'] article", "[role='main']",
      ".post-content", ".article-content", ".entry-content",
      ".article-body", ".story-body", ".post-body", ".entry",
      ".content-body", ".content-area", ".page-content",
      "#article", "#content", "#main-content", "#story",
      "main", "[role='main']"
    ];

    let bestEl = null;
    let bestScore = 0;

    // Score all candidates
    const tried = new Set();
    for (const sel of CANDIDATE_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (tried.has(el)) continue;
        tried.add(el);
        const score = scoreElement(el);
        if (score > bestScore) { bestScore = score; bestEl = el; }
      }
    }

    // Strategy 2: Scan all large div/section/p clusters
    if (bestScore < 2000) {
      document.querySelectorAll("div, section").forEach(el => {
        if (tried.has(el)) return;
        tried.add(el);
        const score = scoreElement(el);
        if (score > bestScore) { bestScore = score; bestEl = el; }
      });
    }

    // Strategy 3: Fallback to body
    if (!bestEl || bestScore < 300) {
      bestEl = document.body;
    }

    // Clone and clean
    const clone = bestEl.cloneNode(true);
    const noiseSelectors = ["script","style","nav","header","footer","aside","form","button","noscript","iframe","[class*='cookie']","[class*='banner']","[class*='popup']","[id*='ad']","[class*='ad-']","[class*='advertisement']","[class*='promo']","[class*='share']","[class*='social']","[class*='comment']","[class*='widget']","[class*='sidebar']","[class*='related']","[class*='newsletter']","[class*='subscribe']","[class*='signup']"];
    noiseSelectors.forEach(sel => { try { clone.querySelectorAll(sel).forEach(n => n.remove()); } catch (_) {} });

    // Build clean HTML — inline images get removed to keep it text-focused, but keep headings and paragraphs
    const html = clone.innerHTML;
    if (!html.trim()) return null;

    return { html, title: document.title };
  }

  function scoreElement(el) {
    try {
      const text = (el.innerText || el.textContent || "").trim();
      if (text.length < 200) return 0;
      const paragraphs = el.querySelectorAll("p").length;
      const headings = el.querySelectorAll("h1,h2,h3,h4").length;
      const links = el.querySelectorAll("a").length;
      const linkRatio = links / Math.max(1, text.length / 100);
      // Penalize nav-heavy sections
      if (linkRatio > 5) return 0;
      return text.length + (paragraphs * 100) + (headings * 200) - (links * 10);
    } catch (_) { return 0; }
  }

  function applyReadingSettings() {
    if (!readingOverlay || !readingArticle) return;
    readingArticle.style.fontSize = `${studyState.readingFontSize}px`;
    readingArticle.style.lineHeight = String(studyState.readingLineHeight);
    readingArticle.style.maxWidth = `${studyState.readingWidth}px`;
    const fontInput = readingOverlay.querySelector("#dp-reading-font-size");
    const lineInput = readingOverlay.querySelector("#dp-reading-line-height");
    const widthInput = readingOverlay.querySelector("#dp-reading-width");
    const fontVal = readingOverlay.querySelector("#dp-reading-font-size-val");
    const lineVal = readingOverlay.querySelector("#dp-reading-line-height-val");
    const widthVal = readingOverlay.querySelector("#dp-reading-width-val");
    if (fontInput) fontInput.value = String(studyState.readingFontSize);
    if (lineInput) lineInput.value = String(Math.round(studyState.readingLineHeight * 10));
    if (widthInput) widthInput.value = String(studyState.readingWidth);
    if (fontVal) fontVal.textContent = `${studyState.readingFontSize}px`;
    if (lineVal) lineVal.textContent = studyState.readingLineHeight.toFixed(2);
    if (widthVal) widthVal.textContent = `${studyState.readingWidth}px`;
  }

  // ─── Reading Ruler ────────────────────────────────────────────────────────
  function toggleReadingRuler() {
    if (!ensureUiReady()) return;
    studyState.rulerEnabled = !studyState.rulerEnabled;
    updateReadingRuler();
    toolbar.querySelector('[data-tool="ruler"]')?.classList.toggle("active", studyState.rulerEnabled);
    toolbar.querySelector("#dp-ruler-toggle")?.classList.toggle("active", studyState.rulerEnabled);
    const rulerBtn = readingOverlay?.querySelector("#dp-reading-ruler-btn");
    if (rulerBtn) rulerBtn.classList.toggle("active", studyState.rulerEnabled);
    setStatus(studyState.rulerEnabled ? "Reading ruler ON — move mouse to position." : "Reading ruler OFF.");
    saveSettings();
  }

  function updateReadingRuler() {
    if (!readingRuler) return;
    readingRuler.style.display = studyState.rulerEnabled ? "block" : "none";
    readingRuler.style.top = `${studyState.rulerY}px`;
  }

  // ─── Focus Timer ──────────────────────────────────────────────────────────
  function toggleFocusTimer() {
    if (studyState.focusRunning) { stopFocusTimer(); setStatus("Focus timer paused."); }
    else { startFocusTimer(); setStatus("Focus timer running."); }
  }

  function startFocusTimer() {
    if (studyState.focusRemainingSeconds <= 0) studyState.focusRemainingSeconds = studyState.focusGoalMinutes * 60;
    studyState.focusRunning = true;
    studyState.focusStartedAt = Date.now();
    const btn = document.getElementById("dp-focus-start");
    if (btn) btn.textContent = "Pause";
    if (focusTimerId) clearInterval(focusTimerId);
    const totalSeconds = studyState.focusRemainingSeconds;
    focusTimerId = setInterval(() => {
      studyState.focusRemainingSeconds -= 1;
      if (studyState.focusRemainingSeconds <= 0) {
        studyState.focusRemainingSeconds = 0;
        stopFocusTimer();
        onFocusTimerComplete();
      }
      updateTimerDisplay(totalSeconds);
      saveSettings();
    }, 1000);
    updateTimerDisplay(totalSeconds);
    saveSettings();
  }

  function stopFocusTimer() {
    studyState.focusRunning = false;
    const btn = document.getElementById("dp-focus-start");
    if (btn) btn.textContent = "Start";
    if (focusTimerId) { clearInterval(focusTimerId); focusTimerId = null; }
    saveSettings();
  }

  function resetFocusTimer() {
    stopFocusTimer();
    studyState.focusRemainingSeconds = studyState.focusGoalMinutes * 60;
    updateTimerDisplay(studyState.focusGoalMinutes * 60);
    setStatus("Timer reset.");
    saveSettings();
  }

  function onFocusTimerComplete() {
    // 1. Show in-page rest overlay
    showRestOverlay();
    // 2. Try browser notification via background
    try {
      chrome.runtime.sendMessage({
        action: "SHOW_NOTIFICATION",
        title: "🎉 Focus Session Complete!",
        message: `Great work! You focused for ${studyState.focusGoalMinutes} minutes. Take a 5-minute rest now.`
      });
    } catch (_) {}
    // 3. Toast as fallback
    showToast("✅ Session done! Time to rest.");
    // 4. Browser tab title flash
    let flashCount = 0;
    const origTitle = document.title;
    const flashId = setInterval(() => {
      document.title = flashCount % 2 === 0 ? "🔔 Take a Rest! — Draw Pencil Pro" : origTitle;
      flashCount++;
      if (flashCount > 10) { clearInterval(flashId); document.title = origTitle; }
    }, 1000);
  }

  function updateTimerDisplay(totalSeconds) {
    const display = document.getElementById("dp-focus-display");
    if (display) display.textContent = formatTime(studyState.focusRemainingSeconds);
    // Progress bar
    const bar = document.getElementById("dp-timer-progress-bar");
    if (bar && totalSeconds) {
      const pct = (studyState.focusRemainingSeconds / totalSeconds) * 100;
      bar.style.width = `${pct}%`;
      bar.style.background = pct > 50 ? "#2563EB" : pct > 20 ? "#F97316" : "#EF4444";
    }
    const goalInput = document.getElementById("dp-focus-goal");
    if (goalInput) goalInput.value = String(studyState.focusGoalMinutes);
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  function exportStudyNotes() {
    const payload = { page: location.href, title: document.title, exportedAt: new Date().toISOString(), highlights: studyState.highlights, flashcards: studyState.flashcards, bookmarks: studyState.bookmarks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `draw-pencil-study-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob); link.click();
    showToast("⬇ Study notes exported");
  }

  // ─── Study Panels ─────────────────────────────────────────────────────────
  function renderStudyPanels() {
    if (!readingOverlay) return;
    const summary = readingOverlay.querySelector("#dp-study-summary");
    const highlightsList = readingOverlay.querySelector("#dp-highlights-list");
    const flashcardsList = readingOverlay.querySelector("#dp-flashcards-list");
    const bookmarksList = readingOverlay.querySelector("#dp-bookmarks-list");

    if (summary) summary.innerHTML = `
      <div class="dp-summary-item"><strong>${studyState.readingSessions}</strong><span>Reading sessions</span></div>
      <div class="dp-summary-item"><strong>${studyState.highlights.length}</strong><span>Highlights</span></div>
      <div class="dp-summary-item"><strong>${studyState.flashcards.length}</strong><span>Flashcards</span></div>
      <div class="dp-summary-item"><strong>${formatTime(studyState.focusGoalMinutes * 60 - studyState.focusRemainingSeconds)}</strong><span>Focus time</span></div>
    `;

    if (highlightsList) highlightsList.innerHTML = studyState.highlights.length
      ? studyState.highlights.slice(0, 10).map(h => `<div class="dp-note-item"><strong>${escapeHtml(h.text.slice(0, 120))}</strong><span>${new Date(h.createdAt).toLocaleString()}</span></div>`).join("")
      : `<div class="dp-empty-state">Select text → click Highlight to build your bank.</div>`;

    if (flashcardsList) flashcardsList.innerHTML = studyState.flashcards.length
      ? studyState.flashcards.slice(0, 10).map(f => `<div class="dp-note-item dp-flashcard-item"><strong>${escapeHtml(f.question)}</strong><span class="dp-card-answer" style="display:none">${escapeHtml(f.answer.slice(0, 200))}</span><button class="dp-reveal-btn" onclick="this.previousElementSibling.style.display='block';this.style.display='none'">Reveal Answer</button></div>`).join("")
      : `<div class="dp-empty-state">Select text → click Flashcard to create study cards.</div>`;

    if (bookmarksList) bookmarksList.innerHTML = studyState.bookmarks.length
      ? studyState.bookmarks.slice(0, 10).map(b => `<div class="dp-note-item"><strong>${escapeHtml(b.label)}</strong><span>${escapeHtml(b.title)}</span></div>`).join("")
      : `<div class="dp-empty-state">Select text → click Bookmark to save revision points.</div>`;
  }

  function refreshStats() {
    const s = document.getElementById("dp-strokes-count");
    const h = document.getElementById("dp-highlights-count");
    const f = document.getElementById("dp-flashcards-count");
    const b = document.getElementById("dp-bookmarks-count");
    if (s) s.textContent = String(paths.length);
    if (h) h.textContent = String(studyState.highlights.length);
    if (f) f.textContent = String(studyState.flashcards.length);
    if (b) b.textContent = String(studyState.bookmarks.length);
  }

  // ─── Tool helpers ────────────────────────────────────────────────────────
  function setTool(tool) {
    if (!ensureUiReady()) return;
    if (tool === "text" || tool === "laser") return;
    activeTool = tool;
    toolbar.querySelectorAll(".dp-tool-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tool === tool));
    laserCanvas.style.display = "none";
    updateCursor();
    setStatus(`Tool: ${titleCase(tool)}`);
    saveSettings();
  }

  function setColor(color) {
    currentColor = color;
    const cc = document.getElementById("dp-custom-color");
    if (cc) cc.value = color;
    const swatch = document.getElementById("dp-pick-color-swatch");
    if (swatch) swatch.style.background = color;
    toolbar.querySelectorAll(".dp-color-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.color === color));
    colorHistory = [color, ...colorHistory.filter(c => c !== color)].slice(0, 6);
    renderColorHistory(); saveSettings();
  }

  function renderColorHistory() {
    const row = document.getElementById("dp-color-history-row");
    if (!row) return;
    row.innerHTML = colorHistory.map(c => `<button class="dp-color-history-btn" data-color="${c}" style="background:${c}" title="${c}"></button>`).join("");
    row.querySelectorAll(".dp-color-history-btn").forEach(btn => { btn.onclick = () => setColor(btn.dataset.color); });
  }

  function updateCursor() {
    if (!canvas) return;
    const map = { pencil:"crosshair", highlighter:"crosshair", eraser:"cell", line:"crosshair", arrow:"crosshair", rect:"crosshair", ellipse:"crosshair", sticky:"copy" };
    canvas.style.cursor = map[activeTool] || "crosshair";
  }

  // ─── Toggle extension ─────────────────────────────────────────────────────
  function toggle() {
    if (!initialized && !init()) { pendingToggleAfterInit = true; return; }
    if (!ensureUiReady()) { pendingToggleAfterInit = true; return; }
    enabled = !enabled;
    if (enabled) {
      canvas.style.pointerEvents = locked ? "none" : "auto";
      toolbar.style.display = "flex";
      laserCanvas.style.display = "none";
      updateCursor(); setStatus("Draw Pencil Pro enabled.");
      showToast("Draw Pencil Pro enabled");
    } else {
      canvas.style.pointerEvents = "none";
      toolbar.style.display = "none";
      selectionBubble.style.display = "none";
      laserCanvas.style.display = "none";
      readingRuler.style.display = "none";
      if (studyState.readingMode) toggleReadingMode();
      cancelText();
    }
  }

  function openExtension() {
    if (!initialized && !init()) { pendingToggleAfterInit = true; return; }
    if (!ensureUiReady() || enabled) return;
    enabled = true;
    canvas.style.pointerEvents = locked ? "none" : "auto";
    toolbar.style.display = "flex";
    laserCanvas.style.display = "none";
    updateCursor(); setStatus("Draw Pencil Pro enabled.");
  }

  // ─── Settings ────────────────────────────────────────────────────────────
  function saveSettings() {
    try {
      chrome.runtime.sendMessage({ action: "SAVE_SETTINGS", settings: { color: currentColor, size: currentSize, opacity: currentOpacity, tool: activeTool, fillShapes, showGrid, pressureSimulation, canvasDimmed, colorHistory, paths, studyState } });
    } catch (_) {}
  }

  function loadSettings() {
    try {
      chrome.runtime.sendMessage({ action: "LOAD_SETTINGS" }, response => {
        const settings = response?.settings;
        if (!settings) { applyLoadedState(); return; }
        currentColor = settings.color || currentColor;
        currentSize = settings.size || currentSize;
        currentOpacity = settings.opacity ?? currentOpacity;
        activeTool = settings.tool || activeTool;
        fillShapes = Boolean(settings.fillShapes);
        showGrid = Boolean(settings.showGrid);
        pressureSimulation = settings.pressureSimulation !== false;
        canvasDimmed = Boolean(settings.canvasDimmed);
        colorHistory = Array.isArray(settings.colorHistory) ? settings.colorHistory : [];
        paths = Array.isArray(settings.paths) ? settings.paths : [];
        studyState = { ...DEFAULT_STUDY_STATE, ...(settings.studyState || {}) };
        if (studyState.focusRunning && studyState.focusStartedAt) {
          const elapsed = Math.floor((Date.now() - studyState.focusStartedAt) / 1000);
          studyState.focusRemainingSeconds = Math.max(0, studyState.focusRemainingSeconds - elapsed);
          studyState.focusRunning = studyState.focusRemainingSeconds > 0;
          studyState.focusStartedAt = studyState.focusRunning ? Date.now() : null;
        }
        applyLoadedState();
      });
    } catch (_) { applyLoadedState(); }
  }

  function applyLoadedState() {
    if (!ensureUiReady()) return;
    setColor(currentColor);
    setTool(activeTool);
    const sizeEl = document.getElementById("dp-size");
    if (sizeEl) { sizeEl.value = String(currentSize); document.getElementById("dp-size-val").textContent = `${currentSize}px`; }
    const opEl = document.getElementById("dp-opacity");
    if (opEl) { opEl.value = String(Math.round(currentOpacity * 100)); document.getElementById("dp-opacity-val").textContent = `${Math.round(currentOpacity * 100)}%`; }
    const fillEl = document.getElementById("dp-fill"); if (fillEl) fillEl.checked = fillShapes;
    const gridEl = document.getElementById("dp-grid"); if (gridEl) gridEl.checked = showGrid;
    const pressEl = document.getElementById("dp-pressure"); if (pressEl) pressEl.checked = pressureSimulation;
    const dimEl = document.getElementById("dp-dim"); if (dimEl) dimEl.checked = canvasDimmed;
    canvas.style.background = canvasDimmed ? "rgba(15,23,42,0.14)" : "transparent";
    const goalEl = document.getElementById("dp-focus-goal"); if (goalEl) goalEl.value = String(studyState.focusGoalMinutes);
    if (!studyState.focusRemainingSeconds || studyState.focusRemainingSeconds < 0) studyState.focusRemainingSeconds = studyState.focusGoalMinutes * 60;
    renderColorHistory();
    applyReadingSettings();
    updateReadingRuler();
    updateTimerDisplay(studyState.focusGoalMinutes * 60);
    refreshStats();
    renderStudyPanels();
    redraw();
    if (studyState.focusRunning && studyState.focusRemainingSeconds > 0) startFocusTimer();
  }

  // ─── Canvas / resize ─────────────────────────────────────────────────────
  function resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    if (canvas) { canvas.width = w; canvas.height = h; }
    if (laserCanvas) { laserCanvas.width = w; laserCanvas.height = h; }
    redraw(); updateReadingRuler();
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!enabled) return;
    if (textInput && document.activeElement === textInput) return;
    if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (document.activeElement?.isContentEditable) return;
    if (e.target?.isContentEditable) return;
    if (e.target?.closest?.(".dp-sticky-note")) return;
    const key = e.key.toLowerCase();
    if (key === "escape") {
      if (studyState.readingMode) toggleReadingMode();
      else toggle();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (key === "y") { e.preventDefault(); redo(); }
      if (key === "s") { e.preventDefault(); saveScreenshot(); }
      if (key === "e") { e.preventDefault(); exportStudyNotes(); }
      return;
    }
    const toolMap = { p:"pencil", h:"highlighter", e:"eraser", l:"line", a:"arrow", r:"rect", o:"ellipse", n:"sticky" };
    if (toolMap[key]) setTool(toolMap[key]);
    if (key === "m") toggleReadingMode();
    if (key === "u") toggleReadingRuler();
    if (key === "g") { showGrid = !showGrid; const el = document.getElementById("dp-grid"); if (el) el.checked = showGrid; redraw(); }
    if (key === "[") { currentSize = clamp(currentSize - 1, 1, 40); const el = document.getElementById("dp-size"); if (el) { el.value = String(currentSize); document.getElementById("dp-size-val").textContent = `${currentSize}px`; } }
    if (key === "]") { currentSize = clamp(currentSize + 1, 1, 40); const el = document.getElementById("dp-size"); if (el) { el.value = String(currentSize); document.getElementById("dp-size-val").textContent = `${currentSize}px`; } }
  }

  // ─── UI utilities ─────────────────────────────────────────────────────────
  function setStatus(msg) { const el = document.getElementById("dp-status"); if (el) el.textContent = msg; }

  function showToast(msg) {
    const existing = document.getElementById("dp-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "dp-toast"; toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 220); }, 2500);
  }

  function formatTime(seconds) {
    const s = Math.max(0, seconds);
    return `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  }

  function titleCase(v) { return v.charAt(0).toUpperCase() + v.slice(1); }
  function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
  function escapeHtml(v) { return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function createId() { return `dp-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36)}`; }

  // ─── Message listener ────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if (msg.action === "PING") { sendResponse("PONG"); return; }
      if (msg.action === "TOGGLE") { toggle(); sendResponse({ ok: true }); return; }
      if (msg.action === "OPEN") { openExtension(); sendResponse({ ok: true }); }
    } catch (err) {
      console.error("Draw Pencil Pro:", err);
      window.__drawPencilProLoaded = false;
      sendResponse({ ok: false, error: String(err) });
    }
  });

  // ─── Boot ────────────────────────────────────────────────────────────────
  init();
  console.log("Draw Pencil Pro v14.0 loaded ✓");
})();

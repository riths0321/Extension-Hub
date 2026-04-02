// WhatFont Popup v1.2.0 — Full Logic

// ─── Storage Keys ───────────────────────────────────────────────────────────
const KEYS = {
  active:       'whatFontActive',
  mode:         'detectionMode',
  showDownload: 'showDownload',
  showCSS:      'showCSS',
  showContrast: 'showContrast',
  highlightText:'highlightText',
  panelPosition:'panelPosition',
  bookmarks:    'bookmarkedFonts',
  darkMode:     'darkMode'
};

// ─── App State ──────────────────────────────────────────────────────────────
const state = {
  active: false,
  mode: 'hover',
  fonts: [],
  bookmarks: [],
  currentFont: null,
  fromTab: 'fonts',     // which tab opened details
  activeTab: 'detect',
  settings: {
    showDownload:  true,
    showCSS:       true,
    showContrast:  true,
    highlightText: false,
    panelPosition: 'top-right'
  }
};

// ─── DOM References ─────────────────────────────────────────────────────────
const el = {
  toggle:         () => document.getElementById('toggleHover'),
  tabInfo:        () => document.getElementById('tabInfo'),
  statusBadge:    () => document.getElementById('statusBadge'),
  modeGroup:      () => document.getElementById('modeGroup'),
  showDownload:   () => document.getElementById('showDownload'),
  showCSS:        () => document.getElementById('showCSS'),
  showContrast:   () => document.getElementById('showContrast'),
  highlightText:  () => document.getElementById('highlightText'),
  panelPosition:  () => document.getElementById('panelPosition'),
  panelPositionWrap: () => document.getElementById('panelPositionWrap'),
  panelPositionBtn: () => document.getElementById('panelPositionBtn'),
  panelPositionLabel: () => document.getElementById('panelPositionLabel'),
  panelPositionMenu: () => document.getElementById('panelPositionMenu'),
  startBtn:       () => document.getElementById('startBtn'),
  stopBtn:        () => document.getElementById('stopBtn'),
  clearBtn:       () => document.getElementById('clearBtn'),
  fontsList:      () => document.getElementById('fontsList'),
  savedList:      () => document.getElementById('savedList'),
  fontCountLabel: () => document.getElementById('fontCountLabel'),
  savedCountLabel:() => document.getElementById('savedCountLabel'),
  fontsTabCount:  () => document.getElementById('fontsTabCount'),
  savedTabCount:  () => document.getElementById('savedTabCount'),
  backBtn:        () => document.getElementById('backBtn'),
  currentPreview: () => document.getElementById('currentPreview'),
  previewText:    () => document.getElementById('previewText'),
  currentDetails: () => document.getElementById('currentDetails'),
  colorRow:       () => document.getElementById('colorRow'),
  fgChip:         () => document.getElementById('fgChip'),
  fgLabel:        () => document.getElementById('fgLabel'),
  bgChip:         () => document.getElementById('bgChip'),
  bgLabel:        () => document.getElementById('bgLabel'),
  contrastBlock:  () => document.getElementById('contrastBlock'),
  contrastValue:  () => document.getElementById('contrastValue'),
  contrastBadge:  () => document.getElementById('contrastBadge'),
  message:        () => document.getElementById('message'),
  darkModeBtn:    () => document.getElementById('darkModeBtn'),
  darkIcon:       () => document.getElementById('darkIcon'),
  lightIcon:      () => document.getElementById('lightIcon'),
  livePanel:      () => document.getElementById('livePanel'),
  liveContent:    () => document.getElementById('liveContent'),
  liveBadge:      () => document.getElementById('liveBadge'),
  exportBtn:      () => document.getElementById('exportBtn'),
  exportMenu:     () => document.getElementById('exportMenu'),
  exportJSON:     () => document.getElementById('exportJSON'),
  exportCSS:      () => document.getElementById('exportCSS'),
  clearSavedBtn:  () => document.getElementById('clearSavedBtn'),
  bookmarkBtn:    () => document.getElementById('bookmarkBtn'),
  bookmarkIconEmpty: () => document.getElementById('bookmarkIconEmpty'),
  bookmarkIconFilled:() => document.getElementById('bookmarkIconFilled'),
  copyCSS:        () => document.getElementById('copyCSS'),
  tabBar:         () => document.getElementById('tabBar'),
};

let activeTab = null;

// ─── Color Utilities ────────────────────────────────────────────────────────

function rgbToHex(rgb) {
  if (!rgb) return '';
  const m = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return rgb;
  return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(rgb) {
  if (!rgb) return '';
  const m = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return rgb;
  let r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function getWcagInfo(ratio) {
  if (ratio === null || ratio === undefined) return null;
  const r = +ratio;
  if (r >= 7)   return { label: 'AAA', cls: 'wcag-aaa' };
  if (r >= 4.5) return { label: 'AA',  cls: 'wcag-aa'  };
  if (r >= 3)   return { label: 'AA+', cls: 'wcag-aaplus' };
  return { label: 'Fail', cls: 'wcag-fail' };
}

function fontToKey(font) {
  return `${font.family}|${font.size}|${font.weight}|${font.style}|${font.color}`;
}

// ─── Message Listener (from content script) ─────────────────────────────────

chrome.runtime.onMessage.addListener((request) => {
  if (
    request.action === 'fontDetected' &&
    request.fontInfo &&
    request.tabId === activeTab?.id
  ) {
    addDetectedFont(request.fontInfo);
    updateCounts();
    renderFonts();
    renderLiveFont(request.fontInfo);
    if (state.currentFont) showFontDetails(state.currentFont, false);
  }
  if (request.action === 'detectionStateChanged' && request.tabId === activeTab?.id) {
    state.active = Boolean(request.active);
    renderStatus();
    setDetectionMessage();
  }
});

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initialize().catch((err) => setMessage(err.message || 'Init failed'));
});

async function initialize() {
  await loadTab();
  await loadStorage();
  await ensureContentReady();
  await loadTabDetectedFonts();
  applyDarkMode(state.darkMode);
  renderAll();
  await sendSettingsToTab();
}

// ─── Event Listeners ────────────────────────────────────────────────────────

function setupEventListeners() {
  // Tab switching
  el.tabBar().addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchTab(btn.dataset.tab);
  });

  // Toggle + mode
  el.toggle().addEventListener('change', onToggle);
  el.modeGroup().addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (btn) onModeChange(btn.dataset.mode);
  });

  // Start / Stop
  el.startBtn().addEventListener('click', startDetection);
  el.stopBtn().addEventListener('click', stopDetection);

  // Clear fonts
  el.clearBtn().addEventListener('click', clearFonts);

  // Clear saved
  el.clearSavedBtn().addEventListener('click', clearSaved);

  // Back from details
  el.backBtn().addEventListener('click', () => {
    hideFontDetails();
    switchTab(state.fromTab);
  });

  // Bookmark button
  el.bookmarkBtn().addEventListener('click', toggleBookmark);

  // Copy CSS
  el.copyCSS().addEventListener('click', copyCSSToClipboard);

  // Custom preview text
  el.previewText().addEventListener('input', () => {
    const val = el.previewText().value.trim();
    el.currentPreview().textContent = val || 'Aa Bb Cc 0–9';
  });

  // Settings
  [el.showDownload(), el.showCSS(), el.showContrast(), el.highlightText(), el.panelPosition()].forEach(n => {
    n.addEventListener('change', onSettingsChange);
  });
  el.panelPositionBtn().addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = el.panelPositionBtn().getAttribute('aria-expanded') === 'true';
    setPanelPositionMenuOpen(!expanded);
  });
  el.panelPositionMenu().addEventListener('click', (event) => {
    const option = event.target.closest('.overlay-option');
    if (!option) return;
    event.stopPropagation();
    el.panelPosition().value = option.dataset.value;
    syncPanelPositionControl();
    setPanelPositionMenuOpen(false);
    onSettingsChange();
  });

  // Dark mode toggle
  el.darkModeBtn().addEventListener('click', toggleDarkMode);

  // Export button
  el.exportBtn().addEventListener('click', e => {
    e.stopPropagation();
    el.exportMenu().classList.toggle('hidden');
  });

  el.exportJSON().addEventListener('click', () => {
    el.exportMenu().classList.add('hidden');
    exportFontsJSON();
  });

  el.exportCSS().addEventListener('click', () => {
    el.exportMenu().classList.add('hidden');
    exportFontsCSS();
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    el.exportMenu().classList.add('hidden');
    setPanelPositionMenuOpen(false);
  });
}

// ─── Tab Switching ──────────────────────────────────────────────────────────

function switchTab(tabId) {
  if (tabId === 'details') return; // details is shown as overlay
  state.activeTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Show/hide content
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });

  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove('hidden');

  // Hide details overlay
  document.getElementById('tab-details').classList.add('hidden');
}

// ─── Dark Mode ───────────────────────────────────────────────────────────────

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  applyDarkMode(state.darkMode);
  chrome.storage.local.set({ [KEYS.darkMode]: state.darkMode });
}

function applyDarkMode(isDark) {
  document.body.dataset.theme = isDark ? 'dark' : 'light';
  el.darkIcon().classList.toggle('hidden', isDark);
  el.lightIcon().classList.toggle('hidden', !isDark);
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

async function loadTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;

  if (!activeTab?.id) {
    el.tabInfo().textContent = 'No active tab';
    return;
  }

  // Show only the hostname for cleanliness
  try {
    const url = new URL(activeTab.url || '');
    el.tabInfo().textContent = url.hostname || activeTab.title || 'Untitled';
  } catch {
    el.tabInfo().textContent = activeTab.title || 'Untitled';
  }
}

async function loadStorage() {
  const data = await chrome.storage.local.get(Object.values(KEYS));

  state.active        = Boolean(data[KEYS.active]);
  state.mode          = data[KEYS.mode] || 'hover';
  state.bookmarks     = Array.isArray(data[KEYS.bookmarks]) ? data[KEYS.bookmarks] : [];
  state.darkMode      = Boolean(data[KEYS.darkMode]);
  state.fonts         = [];
  state.settings = {
    showDownload:  data[KEYS.showDownload]  !== false,
    showCSS:       data[KEYS.showCSS]       !== false,
    showContrast:  data[KEYS.showContrast]  !== false,
    highlightText: Boolean(data[KEYS.highlightText]),
    panelPosition: data[KEYS.panelPosition] || 'top-right'
  };
}

async function saveStorage() {
  await chrome.storage.local.set({
    [KEYS.active]:        state.active,
    [KEYS.mode]:          state.mode,
    [KEYS.showDownload]:  state.settings.showDownload,
    [KEYS.showCSS]:       state.settings.showCSS,
    [KEYS.showContrast]:  state.settings.showContrast,
    [KEYS.highlightText]: state.settings.highlightText,
    [KEYS.panelPosition]: state.settings.panelPosition,
    [KEYS.bookmarks]:     state.bookmarks
  });
}

async function loadTabDetectedFonts() {
  if (activeTab?.id === undefined || activeTab?.id === null) {
    state.fonts = [];
    return;
  }
  const response = await chrome.runtime.sendMessage({
    action: 'getDetectedFontsForTab',
    tabId: activeTab.id
  });
  state.fonts = response?.success && Array.isArray(response.fonts) ? response.fonts : [];
}

// ─── Render All ──────────────────────────────────────────────────────────────

function renderAll() {
  el.toggle().checked            = state.active;
  el.showDownload().checked      = state.settings.showDownload;
  el.showCSS().checked           = state.settings.showCSS;
  el.showContrast().checked      = state.settings.showContrast;
  el.highlightText().checked     = state.settings.highlightText;
  el.panelPosition().value       = state.settings.panelPosition;
  syncPanelPositionControl();

  setModeButtons();
  renderStatus();
  renderFonts();
  renderSaved();
  updateCounts();
  if (!state.active && !state.fonts.length) renderLivePlaceholder();
  setDetectionMessage();
}

function renderStatus() {
  const badge = el.statusBadge();
  badge.textContent = state.active ? 'Active' : 'Inactive';
  badge.classList.toggle('active', state.active);
  el.startBtn().disabled = state.active;
  el.stopBtn().disabled  = !state.active;
  el.toggle().checked    = state.active;

  // Live panel badge
  el.liveBadge().classList.toggle('hidden', !state.active);
}

function syncPanelPositionControl() {
  const value = el.panelPosition().value || 'top-right';
  const option = el.panelPositionMenu().querySelector(`[data-value="${value}"]`);
  el.panelPositionLabel().textContent = option ? option.textContent : 'Top Right';
  el.panelPositionMenu().querySelectorAll('.overlay-option').forEach((node) => {
    node.classList.toggle('active', node.dataset.value === value);
  });
}

function setPanelPositionMenuOpen(open) {
  el.panelPositionMenu().classList.toggle('hidden', !open);
  el.panelPositionBtn().setAttribute('aria-expanded', open ? 'true' : 'false');
}

function detectionInstruction() {
  if (state.mode === 'click') return 'click on text to inspect';
  if (state.mode === 'scan') return 'scan the whole page';
  return 'hover over text to inspect';
}

function setDetectionMessage() {
  if (state.active) {
    setMessage(`Detection active — ${detectionInstruction()}.`);
    return;
  }
  setMessage(`Detection off — choose a mode and start.`);
}

function setModeButtons() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
}

function updateCounts() {
  const fc = state.fonts.length;
  const sc = state.bookmarks.length;

  el.fontCountLabel().textContent = fc;
  el.savedCountLabel().textContent = sc;

  const ft = el.fontsTabCount();
  ft.textContent = fc > 99 ? '99+' : fc;
  ft.classList.toggle('hidden', fc === 0);

  const st = el.savedTabCount();
  st.textContent = sc > 99 ? '99+' : sc;
  st.classList.toggle('hidden', sc === 0);
}

// ─── Fonts List ──────────────────────────────────────────────────────────────

function renderFonts() {
  const list = el.fontsList();
  list.textContent = '';

  if (!state.fonts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No fonts detected yet.\nStart detection and hover over text.';
    list.appendChild(empty);
    return;
  }

  const recent = state.fonts.slice(-20).reverse();
  for (const font of recent) {
    list.appendChild(makeFontItem(font, false));
  }
}

function renderSaved() {
  const list = el.savedList();
  list.textContent = '';

  if (!state.bookmarks.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No saved fonts yet.\nInspect a font and click ☆ to save it.';
    list.appendChild(empty);
    return;
  }

  for (const font of [...state.bookmarks].reverse()) {
    list.appendChild(makeFontItem(font, true));
  }
}

function makeFontItem(font, isSaved) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'font-item';

  // Color swatch
  const swatch = document.createElement('span');
  swatch.className = 'font-item-swatch';
  swatch.style.background = font.color || '#333';
  swatch.style.borderColor = font.backgroundColor || '#eee';

  const body = document.createElement('div');
  body.className = 'font-item-body';

  const name = document.createElement('div');
  name.className = 'font-name';
  name.textContent = font.family;

  const meta = document.createElement('div');
  meta.className = 'font-meta';
  const hex = font.colorHex || rgbToHex(font.color) || font.color || '';
  meta.textContent = `${font.size} · ${font.weight} · ${hex}`;

  body.append(name, meta);

  // WCAG badge
  if (font.contrastRatio !== null && font.contrastRatio !== undefined) {
    const wcag = getWcagInfo(font.contrastRatio);
    if (wcag) {
      const badge = document.createElement('span');
      badge.className = `font-item-badge ${wcag.cls}`;
      badge.textContent = wcag.label;
      item.append(swatch, body, badge);
    } else {
      item.append(swatch, body);
    }
  } else {
    item.append(swatch, body);
  }

  item.addEventListener('click', () => {
    state.fromTab = isSaved ? 'saved' : 'fonts';
    showFontDetails(font, true);
  });

  return item;
}

// ─── Live Font Card ──────────────────────────────────────────────────────────

function renderLiveFont(font) {
  const liveContent = el.liveContent();
  liveContent.textContent = '';

  const card = document.createElement('div');
  card.className = 'live-font-card';

  const family = document.createElement('div');
  family.className = 'live-family';
  family.textContent = font.family;
  family.style.fontFamily = font.family;
  family.style.fontWeight = font.weight;

  const meta = document.createElement('div');
  meta.className = 'live-meta';

  const chips = [
    font.size,
    `w${font.weight}`,
    font.colorHex || rgbToHex(font.color) || font.color
  ];

  if (font.contrastRatio !== null && font.contrastRatio !== undefined) {
    const wcag = getWcagInfo(font.contrastRatio);
    if (wcag) chips.push(`${wcag.label} ${font.contrastRatio}:1`);
  }

  for (const c of chips) {
    const chip = document.createElement('span');
    chip.className = 'live-chip';
    chip.textContent = c;
    meta.appendChild(chip);
  }

  const actions = document.createElement('div');
  actions.className = 'live-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'live-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', async () => {
    const copied = await copyText(buildFontSummary(font));
    if (!copied) {
      setMessage('Copy failed — try manually');
      return;
    }
    copyBtn.textContent = 'Copied';
    setMessage(`Copied live font: ${font.family}`);
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
  });

  actions.appendChild(copyBtn);
  card.append(family, meta, actions);
  liveContent.appendChild(card);
}

function renderLivePlaceholder() {
  const text = state.mode === 'click'
    ? 'Start detection — click on text to see live results'
    : state.mode === 'scan'
      ? 'Start detection — scan the page to collect font results'
      : 'Start detection — hover over text to see live results';
  el.liveContent().innerHTML = `<p class="empty">${text}</p>`;
}

// ─── Font Details ────────────────────────────────────────────────────────────

function showFontDetails(font, switchToDetails = true) {
  state.currentFont = font;

  if (switchToDetails) {
    // Hide all tabs, show details tab
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-details').classList.remove('hidden');
  }

  // Preview
  const preview = el.currentPreview();
  preview.style.fontFamily  = font.family;
  preview.style.fontWeight  = font.weight;
  preview.style.fontStyle   = font.style;
  preview.style.color       = font.color || 'inherit';

  const customText = el.previewText().value.trim();
  preview.textContent = customText || 'Aa Bb Cc 0–9';

  // Color row
  const fgHex = font.colorHex || rgbToHex(font.color) || font.color || '';
  const bgHex = font.backgroundColorHex || rgbToHex(font.backgroundColor) || font.backgroundColor || '';

  el.fgChip().style.background = font.color || '#333';
  el.fgLabel().textContent = fgHex.toUpperCase();
  el.bgChip().style.background = font.backgroundColor || '#fff';
  el.bgLabel().textContent = bgHex.toUpperCase();

  if (state.settings.showContrast && font.contrastRatio !== null && font.contrastRatio !== undefined) {
    const wcag = getWcagInfo(font.contrastRatio);
    el.contrastValue().textContent = `${font.contrastRatio}:1`;
    if (wcag) {
      el.contrastBadge().textContent = wcag.label;
      el.contrastBadge().className = `contrast-badge ${wcag.cls}`;
    }
    el.contrastBlock().classList.remove('hidden');
  } else {
    el.contrastBlock().classList.add('hidden');
  }

  // Update bookmark icon
  updateBookmarkIcon(font);

  // Details grid
  const grid = el.currentDetails();
  grid.textContent = '';

  addDetail('Family',      font.family);
  addDetail('All Fonts',   (font.allFamilies || [font.family]).join(', '));
  addDetail('Size',        font.size);
  addDetail('Weight',      font.weight + weightLabel(font.weight));
  addDetail('Style',       font.style);
  addDetail('Line Height', font.lineHeight || 'normal');
  addDetail('Letter Spacing', font.letterSpacing || 'normal');
  addDetail('Text Transform', font.textTransform || 'none');

  if (state.settings.showCSS) {
    addCodeDetail('CSS Snippet',
`font-family: ${font.family};
font-size: ${font.size};
font-weight: ${font.weight};
font-style: ${font.style};
line-height: ${font.lineHeight || 'normal'};
color: ${font.colorHex || font.color};`
    );
  }

  if (state.settings.showDownload) {
    const query = encodeURIComponent(font.family);
    addLinkDetail('Google Fonts', `https://fonts.google.com/?query=${query}`, `Search "${font.family}"`);
  }
}

function weightLabel(weight) {
  const map = { '100':'Thin','200':'ExtraLight','300':'Light','400':'Regular','500':'Medium','600':'SemiBold','700':'Bold','800':'ExtraBold','900':'Black' };
  return map[String(weight)] ? ` (${map[String(weight)]})` : '';
}

function addDetail(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const l = document.createElement('div');
  l.className = 'detail-label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'detail-value';
  v.textContent = String(value || '—');

  row.append(l, v);
  el.currentDetails().appendChild(row);
}

function addCodeDetail(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const l = document.createElement('div');
  l.className = 'detail-label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'detail-value code';
  v.textContent = String(value);

  row.append(l, v);
  el.currentDetails().appendChild(row);
}

function addLinkDetail(label, href, text) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const l = document.createElement('div');
  l.className = 'detail-label';
  l.textContent = label;

  const link = document.createElement('a');
  link.className = 'detail-value';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;

  row.append(l, link);
  el.currentDetails().appendChild(row);
}

function hideFontDetails() {
  state.currentFont = null;
  document.getElementById('tab-details').classList.add('hidden');
}

// ─── Bookmarks ──────────────────────────────────────────────────────────────

function isBookmarked(font) {
  return state.bookmarks.some(b => fontToKey(b) === fontToKey(font));
}

function updateBookmarkIcon(font) {
  const bookmarked = isBookmarked(font);
  el.bookmarkIconEmpty().classList.toggle('hidden', bookmarked);
  el.bookmarkIconFilled().classList.toggle('hidden', !bookmarked);
  el.bookmarkBtn().classList.toggle('bookmarked', bookmarked);
  el.bookmarkBtn().title = bookmarked ? 'Remove from saved' : 'Save this font';
}

async function toggleBookmark() {
  if (!state.currentFont) return;
  const key = fontToKey(state.currentFont);
  const idx = state.bookmarks.findIndex(b => fontToKey(b) === key);

  if (idx === -1) {
    state.bookmarks.push({ ...state.currentFont });
    setMessage(`Saved: ${state.currentFont.family}`);
  } else {
    state.bookmarks.splice(idx, 1);
    setMessage(`Removed: ${state.currentFont.family}`);
  }

  updateBookmarkIcon(state.currentFont);
  updateCounts();
  renderSaved();
  await saveStorage();
}

async function clearSaved() {
  state.bookmarks = [];
  updateCounts();
  renderSaved();
  await saveStorage();
  setMessage('Cleared saved fonts');
}

// ─── Copy CSS ────────────────────────────────────────────────────────────────

async function copyCSSToClipboard() {
  if (!state.currentFont) return;
  const font = state.currentFont;
  const css = `font-family: ${font.family};\nfont-size: ${font.size};\nfont-weight: ${font.weight};\nfont-style: ${font.style};\nline-height: ${font.lineHeight || 'normal'};\ncolor: ${font.colorHex || font.color};`;
  const copied = await copyText(css);
  if (copied) {
    setMessage('✓ CSS copied to clipboard');
    el.copyCSS().style.color = 'var(--accent)';
    setTimeout(() => { el.copyCSS().style.color = ''; }, 1500);
  } else {
    setMessage('Copy failed — try manually');
  }
}

function buildFontSummary(font) {
  const color = font.colorHex || rgbToHex(font.color) || font.color || '';
  const lines = [
    `Family: ${font.family}`,
    `Size: ${font.size}`,
    `Weight: ${font.weight}`,
    `Style: ${font.style}`,
    `Line Height: ${font.lineHeight || 'normal'}`,
    `Color: ${color}`
  ];
  if (font.contrastRatio !== null && font.contrastRatio !== undefined) {
    lines.push(`Contrast: ${font.contrastRatio}:1`);
  }
  return lines.join('\n');
}

// ─── Export ──────────────────────────────────────────────────────────────────

function exportFontsJSON() {
  if (!state.fonts.length) { setMessage('No fonts to export'); return; }

  const data = state.fonts.map(f => ({
    family:       f.family,
    size:         f.size,
    weight:       f.weight,
    style:        f.style,
    lineHeight:   f.lineHeight,
    letterSpacing:f.letterSpacing,
    textTransform:f.textTransform,
    color:        f.colorHex || f.color,
    backgroundColor: f.backgroundColorHex || f.backgroundColor,
    contrastRatio:f.contrastRatio,
    wcagLevel:    f.wcagLevel
  }));

  downloadFile(
    JSON.stringify(data, null, 2),
    'whatfont-detected.json',
    'application/json'
  );
  setMessage(`Exported ${data.length} fonts as JSON`);
}

function exportFontsCSS() {
  if (!state.fonts.length) { setMessage('No fonts to export'); return; }

  // Unique families
  const families = [...new Set(state.fonts.map(f => f.family))];
  let css = '/* WhatFont — Detected Font Variables */\n:root {\n';

  families.forEach((fam, i) => {
    const safe = fam.replace(/\s+/g, '-').toLowerCase();
    css += `  --font-${i + 1}: "${fam}", sans-serif;\n`;
  });

  css += '}\n\n/* Font Usages */\n';
  state.fonts.forEach((f, i) => {
    const hex = f.colorHex || rgbToHex(f.color) || f.color;
    css += `\n/* Font ${i + 1}: ${f.family} (${f.wcagLevel || '?'} contrast) */\n`;
    css += `.font-style-${i + 1} {\n`;
    css += `  font-family: "${f.family}", sans-serif;\n`;
    css += `  font-size: ${f.size};\n`;
    css += `  font-weight: ${f.weight};\n`;
    css += `  font-style: ${f.style};\n`;
    css += `  line-height: ${f.lineHeight || 'normal'};\n`;
    css += `  color: ${hex};\n`;
    css += `}\n`;
  });

  downloadFile(css, 'whatfont-styles.css', 'text/css');
  setMessage(`Exported ${state.fonts.length} font styles as CSS`);
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Clear Fonts ─────────────────────────────────────────────────────────────

async function clearFonts() {
  state.fonts = [];
  state.currentFont = null;

  if (activeTab?.id !== undefined && activeTab?.id !== null) {
    await chrome.runtime.sendMessage({ action: 'clearDetectedFontsForTab', tabId: activeTab.id });
  }
  await sendToTab({ action: 'clearDetectedFonts' });
  renderFonts();
  hideFontDetails();
  updateCounts();
  setMessage('Cleared detected fonts');
}

// ─── Detection ───────────────────────────────────────────────────────────────

async function onToggle(event) {
  if (event.target.checked) await startDetection();
  else await stopDetection();
}

async function onModeChange(mode) {
  state.mode = mode;
  setModeButtons();
  await saveStorage();
  if (state.active) {
    const response = await sendToTab({ action: 'changeDetectionMode', mode });
    if (response?.success && response.mode) {
      state.mode = response.mode;
      setModeButtons();
      await saveStorage();
    }
  }
  if (!state.active || !state.fonts.length) renderLivePlaceholder();
  setDetectionMessage();
}

async function onSettingsChange() {
  state.settings = {
    showDownload:  el.showDownload().checked,
    showCSS:       el.showCSS().checked,
    showContrast:  el.showContrast().checked,
    highlightText: el.highlightText().checked,
    panelPosition: el.panelPosition().value
  };
  await saveStorage();
  await sendSettingsToTab();
  if (state.currentFont) showFontDetails(state.currentFont, false);
}

async function startDetection() {
  if (!isTabSupported()) {
    state.active = false;
    renderStatus();
    setMessage('Restricted page — open a normal website first.');
    return;
  }

  await ensureContentReady();

  const response = await sendToTab({ action: 'activateFontDetection', mode: state.mode });
  if (!response?.success) {
    state.active = false;
    renderStatus();
    setMessage('Could not activate — try refreshing the page.');
    return;
  }

  state.active = true;
  renderStatus();
  await saveStorage();
  await sendSettingsToTab();
  if (state.mode === 'scan') {
    await stopDetection({ silent: true, keepLivePanel: state.fonts.length > 0 });
    setMessage('Scan complete — font list updated.');
  } else {
    setDetectionMessage();
  }
}

async function stopDetection(options = {}) {
  const { silent = false, keepLivePanel = false } = options;
  await sendToTab({ action: 'deactivateFontDetection' });
  state.active = false;
  renderStatus();
  await saveStorage();
  if (!silent) setMessage('Detection stopped');

  // Clear live panel
  if (!keepLivePanel) renderLivePlaceholder();
}

async function sendSettingsToTab() {
  await sendToTab({ action: 'updateSettings', settings: { ...state.settings } });
}

function addDetectedFont(fontInfo) {
  if (!fontInfo?.family) return;
  const key = fontToKey(fontInfo);
  const exists = state.fonts.some(f => fontToKey(f) === key);
  if (!exists) {
    state.fonts.push(fontInfo);
    if (state.fonts.length > 80) state.fonts = state.fonts.slice(-80);
  }
}

// ─── Tab / Content Helpers ───────────────────────────────────────────────────

function isTabSupported() {
  const url = activeTab?.url || '';
  if (!url) return false;
  return !(url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('chrome-extension://'));
}

async function ensureContentReady() {
  if (!activeTab?.id || !isTabSupported()) return false;
  const ping = await sendToTab({ action: 'ping' });
  if (ping?.status === 'alive') return true;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: activeTab.id, allFrames: true },
      files: ['themes/themes.css']
    });
  } catch {}

  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      files: ['content.js']
    });
  } catch {
    return false;
  }

  const retryPing = await sendToTab({ action: 'ping' });
  return retryPing?.status === 'alive';
}

async function sendToTab(message) {
  if (!activeTab?.id || !isTabSupported()) return null;
  try {
    return await chrome.tabs.sendMessage(activeTab.id, message);
  } catch {
    return null;
  }
}

function setMessage(msg) {
  el.message().textContent = msg;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const KEYS = {
  active: 'whatFontActive',
  mode: 'detectionMode',
  showDownload: 'showDownload',
  showCSS: 'showCSS',
  highlightText: 'highlightText',
  panelPosition: 'panelPosition'
};

const state = {
  active: false,
  mode: 'hover',
  fonts: [],
  currentFont: null,
  settings: {
    showDownload: true,
    showCSS: true,
    highlightText: false,
    panelPosition: 'top-right'
  }
};

const el = {
  toggle: document.getElementById('toggleHover'),
  tabInfo: document.getElementById('tabInfo'),
  statusBadge: document.getElementById('statusBadge'),
  modeGroup: document.getElementById('modeGroup'),
  showDownload: document.getElementById('showDownload'),
  showCSS: document.getElementById('showCSS'),
  highlightText: document.getElementById('highlightText'),
  panelPosition: document.getElementById('panelPosition'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  clearBtn: document.getElementById('clearBtn'),
  fontsList: document.getElementById('fontsList'),
  detectedPanel: document.getElementById('detectedPanel'),
  detailsPanel: document.getElementById('detailsPanel'),
  backBtn: document.getElementById('backBtn'),
  currentPreview: document.getElementById('currentPreview'),
  currentDetails: document.getElementById('currentDetails'),
  message: document.getElementById('message')
};

let activeTab = null;

chrome.runtime.onMessage.addListener((request) => {
  if (
    request.action === 'fontDetected' &&
    request.fontInfo &&
    request.tabId !== undefined &&
    request.tabId !== null &&
    request.tabId === activeTab?.id
  ) {
    addDetectedFont(request.fontInfo);
    renderFonts();
    if (state.currentFont) {
      showFontDetails(state.currentFont);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initialize().catch((error) => {
    setMessage(error.message || 'Initialization failed');
  });
});

async function initialize() {
  await loadTab();
  await loadStorage();
  await ensureContentReady();
  await chrome.storage.local.set({ [KEYS.active]: false });
  await sendToTab({ action: 'deactivateFontDetection' });
  await loadTabDetectedFonts();
  renderAll();
  await sendSettingsToTab();
}

function setupEventListeners() {
  el.toggle.addEventListener('change', onToggle);

  el.modeGroup.addEventListener('click', (event) => {
    const button = event.target.closest('.mode-btn');
    if (!button) return;
    onModeChange(button.dataset.mode);
  });

  el.startBtn.addEventListener('click', startDetection);
  el.stopBtn.addEventListener('click', stopDetection);

  el.clearBtn.addEventListener('click', async () => {
    state.fonts = [];
    state.currentFont = null;
    if (activeTab?.id !== undefined && activeTab?.id !== null) {
      await chrome.runtime.sendMessage({ action: 'clearDetectedFontsForTab', tabId: activeTab.id });
    }
    await sendToTab({ action: 'clearDetectedFonts' });
    renderFonts();
    hideFontDetails();
    setMessage('Cleared detected fonts');
  });

  el.backBtn.addEventListener('click', hideFontDetails);

  [el.showDownload, el.showCSS, el.highlightText, el.panelPosition].forEach((node) => {
    node.addEventListener('change', onSettingsChange);
  });
}

async function loadTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;

  if (!activeTab || !activeTab.id) {
    el.tabInfo.textContent = 'No active tab';
    return;
  }

  const title = activeTab.title || activeTab.url || 'Untitled';
  el.tabInfo.textContent = title;
}

async function loadStorage() {
  const data = await chrome.storage.local.get(Object.values(KEYS));

  // Prevent auto-resume; detection must start only via Start button.
  state.active = false;
  state.mode = data[KEYS.mode] || 'hover';
  state.fonts = [];
  state.settings = {
    showDownload: data[KEYS.showDownload] !== false,
    showCSS: data[KEYS.showCSS] !== false,
    highlightText: Boolean(data[KEYS.highlightText]),
    panelPosition: data[KEYS.panelPosition] || 'top-right'
  };
}

async function saveStorage() {
  await chrome.storage.local.set({
    [KEYS.active]: state.active,
    [KEYS.mode]: state.mode,
    [KEYS.showDownload]: state.settings.showDownload,
    [KEYS.showCSS]: state.settings.showCSS,
    [KEYS.highlightText]: state.settings.highlightText,
    [KEYS.panelPosition]: state.settings.panelPosition
  });
}

function renderAll() {
  el.toggle.checked = state.active;
  setModeButtons();

  el.showDownload.checked = state.settings.showDownload;
  el.showCSS.checked = state.settings.showCSS;
  el.highlightText.checked = state.settings.highlightText;
  el.panelPosition.value = state.settings.panelPosition;

  renderStatus();
  renderFonts();
}

function renderStatus() {
  el.statusBadge.textContent = state.active ? 'Active' : 'Inactive';
  el.statusBadge.classList.toggle('active', state.active);

  el.startBtn.disabled = state.active;
  el.stopBtn.disabled = !state.active;
}

function setModeButtons() {
  const buttons = el.modeGroup.querySelectorAll('.mode-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
}

function renderFonts() {
  el.fontsList.textContent = '';

  if (!state.fonts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No fonts detected yet';
    el.fontsList.appendChild(empty);
    return;
  }

  const recent = state.fonts.slice(-12).reverse();
  for (const font of recent) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'font-item';

    const name = document.createElement('div');
    name.className = 'font-name';
    name.textContent = font.family;

    const meta = document.createElement('div');
    meta.className = 'font-meta';
    meta.textContent = `${font.size} | ${font.weight} | ${font.style}`;

    item.append(name, meta);
    item.addEventListener('click', () => showFontDetails(font));
    el.fontsList.appendChild(item);
  }
}

function showFontDetails(font) {
  state.currentFont = font;
  el.detailsPanel.classList.remove('hidden');
  el.detectedPanel.classList.add('hidden');

  el.currentPreview.textContent = 'Aa Bb Cc 123';
  el.currentPreview.style.fontFamily = font.family;
  el.currentPreview.style.fontWeight = font.weight;
  el.currentPreview.style.fontStyle = font.style;

  el.currentDetails.textContent = '';
  addDetail('Font Family', font.family);
  addDetail('Size', font.size);
  addDetail('Weight', font.weight);
  addDetail('Style', font.style);
  addDetail('Line Height', font.lineHeight || 'normal');
  addDetail('Color', font.color);

  if (state.settings.showCSS) {
    addDetail(
      'CSS',
      `font-family: ${font.family};\nfont-size: ${font.size};\nfont-weight: ${font.weight};\nfont-style: ${font.style};`
    );
  }

  if (state.settings.showDownload) {
    const query = encodeURIComponent(font.family);
    addLinkDetail('Find Font', `https://fonts.google.com/?query=${query}`, 'Search on Google Fonts');
  }
}

function addDetail(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const l = document.createElement('div');
  l.className = 'detail-label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'detail-value';
  v.textContent = String(value);

  row.append(l, v);
  el.currentDetails.appendChild(row);
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
  el.currentDetails.appendChild(row);
}

function hideFontDetails() {
  state.currentFont = null;
  el.detailsPanel.classList.add('hidden');
  el.detectedPanel.classList.remove('hidden');
}

function addDetectedFont(fontInfo) {
  if (!fontInfo || !fontInfo.family) return;

  const key = `${fontInfo.family}|${fontInfo.size}|${fontInfo.weight}|${fontInfo.style}|${fontInfo.color}`;
  const exists = state.fonts.some((f) => `${f.family}|${f.size}|${f.weight}|${f.style}|${f.color}` === key);
  if (exists) return;

  state.fonts.push(fontInfo);
  if (state.fonts.length > 80) {
    state.fonts = state.fonts.slice(-80);
  }
}

async function onToggle(event) {
  if (event.target.checked) {
    await startDetection();
  } else {
    await stopDetection();
  }
}

async function onModeChange(mode) {
  state.mode = mode;
  setModeButtons();
  await saveStorage();

  if (state.active) {
    await sendToTab({ action: 'changeDetectionMode', mode });
  }

  setMessage(`Mode: ${mode}`);
}

async function onSettingsChange() {
  state.settings = {
    showDownload: el.showDownload.checked,
    showCSS: el.showCSS.checked,
    highlightText: el.highlightText.checked,
    panelPosition: el.panelPosition.value
  };

  await saveStorage();
  await sendSettingsToTab();

  if (state.currentFont) {
    showFontDetails(state.currentFont);
  }
}

async function startDetection() {
  if (!isTabSupported()) {
    state.active = false;
    el.toggle.checked = false;
    renderStatus();
    setMessage('This page is restricted. Open a normal website tab.');
    return;
  }

  await ensureContentReady();

  const response = await sendToTab({ action: 'activateFontDetection', mode: state.mode });
  if (!response?.success) {
    state.active = false;
    el.toggle.checked = false;
    renderStatus();
    setMessage('Unable to activate on this tab. Try refreshing page.');
    return;
  }

  state.active = true;
  el.toggle.checked = true;
  renderStatus();
  await saveStorage();
  await sendSettingsToTab();
  setMessage('Font detection started');
}

async function stopDetection() {
  await sendToTab({ action: 'deactivateFontDetection' });

  state.active = false;
  el.toggle.checked = false;
  renderStatus();
  await saveStorage();
  setMessage('Font detection stopped');
}

async function sendSettingsToTab() {
  await sendToTab({
    action: 'updateSettings',
    settings: { ...state.settings }
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

  if (response?.success && Array.isArray(response.fonts)) {
    state.fonts = response.fonts;
    return;
  }
  state.fonts = [];
}

function isTabSupported() {
  const url = activeTab?.url || '';
  if (!url) return false;
  return !(
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('chrome-extension://')
  );
}

async function ensureContentReady() {
  if (!activeTab?.id || !isTabSupported()) {
    return false;
  }

  const ping = await sendToTab({ action: 'ping' });
  return ping?.status === 'alive';
}

async function sendToTab(message) {
  if (!activeTab?.id || !isTabSupported()) {
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(activeTab.id, message);
  } catch {
    return null;
  }
}

function setMessage(message) {
  el.message.textContent = message;
}

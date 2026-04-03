// WhatFont — Enhanced Content Script v1.2.0

let isActive = false;
let detectionMode = 'hover';
let currentElement = null;
let panel = null;
let detectedFonts = [];
let contextInvalidated = false;

const settings = {
  highlightText: false,
  panelPosition: 'top-right',
  showContrast: true
};

function handleRuntimeDisconnect(error) {
  const message = String(error?.message || error || '');
  if (!message.includes('Extension context invalidated')) return;
  contextInvalidated = true;
  isActive = false;
  deactivate();
}

function getRuntime() {
  if (contextInvalidated) return null;
  try {
    if (!chrome?.runtime?.id) return null;
    return chrome.runtime;
  } catch (error) {
    handleRuntimeDisconnect(error);
    return null;
  }
}

function sendRuntimeMessage(message) {
  const runtime = getRuntime();
  if (!runtime) return null;
  try {
    const pending = runtime.sendMessage(message);
    if (pending && typeof pending.catch === 'function') pending.catch(handleRuntimeDisconnect);
    return pending;
  } catch (error) {
    handleRuntimeDisconnect(error);
    return null;
  }
}

// ─── Color Utilities ───────────────────────────────────────────────────────

function parseRgb(str) {
  if (!str) return null;
  const m = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

function parseAlpha(str) {
  if (!str) return 1;
  const m = str.match(/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
  return m ? +m[1] : 1;
}

function relativeLuminance(r, g, b) {
  return [r, g, b].reduce((sum, c, i) => {
    const s = c / 255;
    const lin = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return sum + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function calcContrastRatio(fg, bg) {
  const fRgb = parseRgb(fg);
  const bRgb = parseRgb(bg);
  if (!fRgb || !bRgb) return null;
  const L1 = relativeLuminance(...fRgb);
  const L2 = relativeLuminance(...bRgb);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

function rgbToHex(rgb) {
  const m = parseRgb(rgb);
  if (!m) return rgb;
  return '#' + m.map(x => x.toString(16).padStart(2, '0')).join('');
}

function getWcagLevel(ratio) {
  if (ratio === null) return null;
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA+';
  return 'Fail';
}

// Walk up the DOM to find the first non-transparent background
function getEffectiveBackground(element) {
  let el = element;
  while (el && el !== document.documentElement) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (parseAlpha(bg) > 0 && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    el = el.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

// ─── Font Detection ────────────────────────────────────────────────────────

function getFontInfo(element) {
  const style = window.getComputedStyle(element);
  const color = style.color || 'rgb(0,0,0)';
  const bg = getEffectiveBackground(element);
  const contrast = calcContrastRatio(color, bg);

  const rawFamilies = style.fontFamily || '';
  const primaryFamily = rawFamilies.split(',')[0].replace(/["']/g, '').trim() || 'Unknown';
  const allFamilies = rawFamilies.split(',').map(f => f.replace(/["']/g, '').trim()).filter(Boolean);

  return {
    family: primaryFamily,
    allFamilies,
    size: style.fontSize || 'n/a',
    weight: style.fontWeight || 'n/a',
    style: style.fontStyle || 'normal',
    lineHeight: style.lineHeight || 'normal',
    letterSpacing: style.letterSpacing || 'normal',
    textTransform: style.textTransform || 'none',
    textDecoration: style.textDecoration || 'none',
    color,
    colorHex: rgbToHex(color),
    backgroundColor: bg,
    backgroundColorHex: rgbToHex(bg),
    contrastRatio: contrast,
    wcagLevel: getWcagLevel(contrast),
    tagName: element.tagName.toLowerCase()
  };
}

// ─── Panel ─────────────────────────────────────────────────────────────────

function initPanel() {
  if (panel) return;
  panel = document.createElement('aside');
  panel.id = 'whatfont-panel';
  document.documentElement.appendChild(panel);
}

function isEligibleElement(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.closest('#whatfont-panel')) return false;
  if (['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(node.tagName)) return false;
  if (!node.textContent || !node.textContent.trim()) return false;
  if (node.offsetWidth < 8 || node.offsetHeight < 8) return false;
  return true;
}

function setPanelPosition(anchorRect, mouseEvent) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelWidth = 300;
  const panelHeight = 200;
  let top = 24;
  let left = vw - panelWidth - 16;

  switch (settings.panelPosition) {
    case 'top-left':
      top = 24; left = 16;
      break;
    case 'bottom-right':
      top = vh - panelHeight - 16; left = vw - panelWidth - 16;
      break;
    case 'bottom-left':
      top = vh - panelHeight - 16; left = 16;
      break;
    case 'follow':
      if (mouseEvent) {
        top = Math.min(vh - panelHeight - 10, Math.max(10, mouseEvent.clientY + 22));
        left = Math.min(vw - panelWidth - 10, Math.max(10, mouseEvent.clientX + 14));
      }
      break;
    case 'top-right':
    default:
      top = 24; left = vw - panelWidth - 16;
  }

  panel.style.setProperty('--panel-top', `${top}px`);
  panel.style.setProperty('--panel-left', `${left}px`);
}

function contrastBadgeHtml(wcagLevel, ratio) {
  if (!wcagLevel || !settings.showContrast) return '';
  return `<span class="wf-contrast wf-contrast-${wcagLevel.toLowerCase()}">${wcagLevel} ${ratio}:1</span>`;
}

function renderPanel(fontInfo, modeHint) {
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'wf-header';

  const swatch = document.createElement('span');
  swatch.className = 'wf-swatch';
  swatch.style.setProperty('--swatch-bg', fontInfo.color);
  swatch.style.setProperty('--swatch-border', fontInfo.backgroundColorHex);

  const titleEl = document.createElement('span');
  titleEl.className = 'wf-title';
  titleEl.textContent = fontInfo.family;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'wf-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const copied = await copyPanelText(buildFontSummary(fontInfo));
    if (!copied) return;
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
  });

  header.append(swatch, titleEl, copyBtn);

  const grid = document.createElement('div');
  grid.className = 'wf-grid';

  addInfoCell(grid, 'Size', fontInfo.size);
  addInfoCell(grid, 'Weight', fontInfo.weight);
  addInfoCell(grid, 'Style', fontInfo.style);
  addInfoCell(grid, 'Color', fontInfo.colorHex);

  if (settings.showContrast && fontInfo.contrastRatio !== null) {
    addInfoCell(grid, 'Contrast', `${fontInfo.contrastRatio}:1`);
  }

  const footer = document.createElement('div');
  footer.className = 'wf-footer';

  const footerLeft = document.createElement('span');
  footerLeft.textContent = modeHint;

  const badge = document.createElement('span');
  badge.className = `wf-wcag wf-wcag-${(fontInfo.wcagLevel || 'fail').toLowerCase().replace('+', 'plus')}`;
  badge.textContent = fontInfo.wcagLevel || '';

  if (settings.showContrast && fontInfo.wcagLevel) {
    footer.append(footerLeft, badge);
  } else {
    footer.append(footerLeft);
  }

  panel.append(header, grid, footer);
}

function buildFontSummary(fontInfo) {
  const lines = [
    `Family: ${fontInfo.family}`,
    `Size: ${fontInfo.size}`,
    `Weight: ${fontInfo.weight}`,
    `Style: ${fontInfo.style}`,
    `Color: ${fontInfo.colorHex || fontInfo.color || ''}`
  ];
  if (fontInfo.contrastRatio !== null && fontInfo.contrastRatio !== undefined) {
    lines.push(`Contrast: ${fontInfo.contrastRatio}:1`);
  }
  return lines.join('\n');
}

async function copyPanelText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'wf-offscreen';
    document.documentElement.appendChild(ta);
    ta.focus();
    ta.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }

    ta.remove();
    return copied;
  }
}

function addInfoCell(container, label, value) {
  const item = document.createElement('div');
  item.className = 'wf-item';

  const l = document.createElement('div');
  l.className = 'wf-label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'wf-value';
  v.textContent = value;

  item.append(l, v);
  container.appendChild(item);
}

function showPanelForElement(element, mouseEvent) {
  initPanel();
  const info = getFontInfo(element);
  const modeHint =
    detectionMode === 'hover' ? 'Hover · inspect fonts' : 'Click · inspect fonts';

  renderPanel(info, modeHint);
  const rect = element.getBoundingClientRect();
  setPanelPosition(rect, mouseEvent);
  panel.classList.add('wf-visible');

  applyHighlight(element);
  addDetectedFont(info);

  sendRuntimeMessage({ action: 'fontDetected', fontInfo: info });
}

function hidePanel() {
  if (panel) panel.classList.remove('wf-visible');
  clearHighlight();
}

function isPanelNode(node) {
  return Boolean(node && panel && node.nodeType === Node.ELEMENT_NODE && node.closest('#whatfont-panel'));
}

function applyHighlight(element) {
  clearHighlight();
  if (!settings.highlightText || !element) return;
  element.classList.add('whatfont-highlight');
  currentElement = element;
}

function clearHighlight() {
  if (currentElement) {
    currentElement.classList.remove('whatfont-highlight');
    currentElement = null;
  }
}

// ─── Event Handlers ────────────────────────────────────────────────────────

function onMouseOver(event) {
  if (!isActive || detectionMode !== 'hover') return;
  const target = event.target;
  if (!isEligibleElement(target)) return;
  if (target === currentElement) return;
  showPanelForElement(target, event);
}

function onMouseOut(event) {
  if (!isActive || detectionMode !== 'hover') return;
  const to = event.relatedTarget;
  if (isPanelNode(to)) return;
  if (to && currentElement && currentElement.contains(to)) return;
  hidePanel();
}

function onClick(event) {
  if (!isActive || detectionMode !== 'click') return;
  const target = event.target;
  if (!isEligibleElement(target)) return;
  event.preventDefault();
  event.stopPropagation();
  showPanelForElement(target, event);
}

// ─── Scan Mode ─────────────────────────────────────────────────────────────

function scanAllFonts() {
  if (!isActive || detectionMode !== 'scan') return;

  const nodes = document.querySelectorAll(
    'p,h1,h2,h3,h4,h5,h6,span,div,a,li,td,th,button,label,input,textarea'
  );
  const seen = new Set();
  let count = 0;

  nodes.forEach((node) => {
    if (!isEligibleElement(node)) return;
    const info = getFontInfo(node);
    const key = `${info.family}|${info.size}|${info.weight}|${info.style}`;
    if (seen.has(key)) return;
    seen.add(key);
    count++;
    addDetectedFont(info);
    sendRuntimeMessage({ action: 'fontDetected', fontInfo: info });
  });

  initPanel();
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'wf-title';
  title.textContent = 'Scan Complete';

  const msg = document.createElement('div');
  msg.className = 'wf-footer';
  msg.textContent = `${count} unique font variants found`;

  panel.append(title, msg);
  setPanelPosition({ top: 16, right: 16 }, null);
  panel.classList.add('wf-visible');

  setTimeout(() => hidePanel(), 3500);
}

// ─── Activation ────────────────────────────────────────────────────────────

function activate() {
  removeListeners();
  if (detectionMode === 'hover') {
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
  } else if (detectionMode === 'click') {
    document.addEventListener('click', onClick, true);
  } else if (detectionMode === 'scan') {
    scanAllFonts();
  }
}

function deactivate() {
  removeListeners();
  hidePanel();
}

function removeListeners() {
  document.removeEventListener('mouseover', onMouseOver, true);
  document.removeEventListener('mouseout', onMouseOut, true);
  document.removeEventListener('click', onClick, true);
}

document.addEventListener('keydown', (event) => {
  if (!(event.altKey && (event.key === 'w' || event.key === 'W'))) return;
  sendRuntimeMessage({ action: 'toggleDetection' });
});

// ─── Font Store ────────────────────────────────────────────────────────────

function addDetectedFont(fontInfo) {
  const key = `${fontInfo.family}|${fontInfo.size}|${fontInfo.weight}|${fontInfo.style}|${fontInfo.color}`;
  const exists = detectedFonts.some(
    f => `${f.family}|${f.size}|${f.weight}|${f.style}|${f.color}` === key
  );
  if (!exists) {
    detectedFonts.push(fontInfo);
    if (detectedFonts.length > 80) detectedFonts = detectedFonts.slice(-80);
  }
}

// ─── Message Listener ──────────────────────────────────────────────────────

const runtime = getRuntime();
if (runtime?.onMessage?.addListener) {
  runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'ping':
        sendResponse({ status: 'alive' });
        break;

      case 'activateFontDetection':
        isActive = true;
        detectionMode = request.mode || detectionMode;
        activate();
        sendResponse({ success: true, mode: detectionMode });
        break;

      case 'deactivateFontDetection':
        isActive = false;
        deactivate();
        sendResponse({ success: true });
        break;

      case 'changeDetectionMode':
        detectionMode = request.mode || detectionMode;
        if (isActive) activate();
        sendResponse({ success: true, mode: detectionMode });
        break;

      case 'updateSettings':
        if (request.settings && typeof request.settings === 'object') {
          settings.highlightText = Boolean(request.settings.highlightText);
          settings.panelPosition = request.settings.panelPosition || settings.panelPosition;
          settings.showContrast = request.settings.showContrast !== false;
          if (!settings.highlightText) clearHighlight();
        }
        sendResponse({ success: true });
        break;

      case 'getDetectedFonts':
        sendResponse({ success: true, fonts: detectedFonts });
        break;

      case 'clearDetectedFonts':
        detectedFonts = [];
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return false;
  });
}

initPanel();

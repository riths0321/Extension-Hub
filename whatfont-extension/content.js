let isActive = false;
let detectionMode = 'hover';
let currentElement = null;
let panel = null;
let detectedFonts = [];

const settings = {
  highlightText: false,
  panelPosition: 'top-right'
};

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

function getFontInfo(element) {
  const style = window.getComputedStyle(element);
  return {
    family: String(style.fontFamily || '').split(',')[0].replace(/["']/g, '').trim() || 'Unknown',
    size: style.fontSize || 'n/a',
    weight: style.fontWeight || 'n/a',
    style: style.fontStyle || 'normal',
    lineHeight: style.lineHeight || 'normal',
    color: style.color || 'n/a'
  };
}

function setPanelPosition(anchorRect, mouseEvent) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelWidth = 320;
  const panelHeight = 180;

  let top = 16;
  let left = vw - panelWidth - 16;

  switch (settings.panelPosition) {
    case 'top-left':
      top = 16;
      left = 16;
      break;
    case 'bottom-right':
      top = vh - panelHeight - 16;
      left = vw - panelWidth - 16;
      break;
    case 'bottom-left':
      top = vh - panelHeight - 16;
      left = 16;
      break;
    case 'follow':
      if (mouseEvent) {
        top = Math.min(vh - panelHeight - 10, Math.max(10, mouseEvent.clientY + 12));
        left = Math.min(vw - panelWidth - 10, Math.max(10, mouseEvent.clientX + 12));
      } else {
        top = Math.min(vh - panelHeight - 10, Math.max(10, anchorRect.top));
        left = Math.min(vw - panelWidth - 10, Math.max(10, anchorRect.right + 12));
      }
      break;
    case 'top-right':
    default:
      top = 16;
      left = vw - panelWidth - 16;
      break;
  }

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

function renderPanel(fontInfo, modeHint) {
  panel.textContent = '';

  const title = document.createElement('div');
  title.className = 'wf-title';
  title.textContent = fontInfo.family;

  const grid = document.createElement('div');
  grid.className = 'wf-grid';

  addInfoCell(grid, 'Size', fontInfo.size);
  addInfoCell(grid, 'Weight', fontInfo.weight);
  addInfoCell(grid, 'Style', fontInfo.style);
  addInfoCell(grid, 'Color', fontInfo.color);

  const footer = document.createElement('div');
  footer.className = 'wf-footer';
  footer.textContent = modeHint;

  panel.append(title, grid, footer);
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
  const modeHint = detectionMode === 'hover' ? 'Hover over text to inspect fonts' : 'Click text to inspect fonts';

  renderPanel(info, modeHint);
  const rect = element.getBoundingClientRect();
  setPanelPosition(rect, mouseEvent);
  panel.style.display = 'block';

  applyHighlight(element);
  addDetectedFont(info);

  chrome.runtime.sendMessage({
    action: 'fontDetected',
    fontInfo: info
  }).catch(() => {});
}

function hidePanel() {
  if (panel) {
    panel.style.display = 'none';
  }
  clearHighlight();
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
  if (to && currentElement && currentElement.contains(to)) return;
  hidePanel();
}

function onClick(event) {
  if (!isActive || detectionMode !== 'click') return;
  const target = event.target;
  if (!isEligibleElement(target)) return;

  // Prevent page navigation/interaction while inspector click mode is active.
  event.preventDefault();
  event.stopPropagation();

  showPanelForElement(target, event);
}

function scanAllFonts() {
  if (!isActive || detectionMode !== 'scan') return;

  const nodes = document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,span,div,a,li,td,th,button,label,input,textarea');
  const seen = new Set();
  let count = 0;

  nodes.forEach((node) => {
    if (!isEligibleElement(node)) return;
    const info = getFontInfo(node);
    const key = `${info.family}|${info.size}|${info.weight}|${info.style}|${info.color}`;
    if (seen.has(key)) return;

    seen.add(key);
    count += 1;
    addDetectedFont(info);

    chrome.runtime.sendMessage({ action: 'fontDetected', fontInfo: info }).catch(() => {});
  });

  initPanel();
  panel.textContent = '';

  const title = document.createElement('div');
  title.className = 'wf-title';
  title.textContent = 'Scan Complete';

  const msg = document.createElement('div');
  msg.className = 'wf-footer';
  msg.textContent = `${count} unique fonts detected on this page`;

  panel.append(title, msg);
  setPanelPosition({ top: 16, right: 16, bottom: 16 }, null);
  panel.style.display = 'block';

  setTimeout(() => {
    hidePanel();
  }, 3000);
}

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

function addDetectedFont(fontInfo) {
  const key = `${fontInfo.family}|${fontInfo.size}|${fontInfo.weight}|${fontInfo.style}|${fontInfo.color}`;
  const exists = detectedFonts.some(
    (font) => `${font.family}|${font.size}|${font.weight}|${font.style}|${font.color}` === key
  );

  if (!exists) {
    detectedFonts.push(fontInfo);
    if (detectedFonts.length > 80) {
      detectedFonts = detectedFonts.slice(-80);
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        if (!settings.highlightText) {
          clearHighlight();
        }
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
      break;
  }

  return false;
});

initPanel();

// ── popup.js — Email Extractor Pro v2.0 ─────────────────────────
// CSP Safe · No innerHTML · No eval · Blue Theme · Advanced Features
// NEW: Search/Filter · Sort · Group-by-Domain · Select Mode ·
//      Quality Scoring · Extraction History · Copy Selected · Last Scan Time

// ── SVG icon factory ────────────────────────────────────────────
function createIcon(name) {
  const ns  = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width",   "14");
  svg.setAttribute("height",  "14");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill",    "none");

  if (name === "copy") {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x","9"); rect.setAttribute("y","9");
    rect.setAttribute("width","13"); rect.setAttribute("height","13");
    rect.setAttribute("rx","2"); rect.setAttribute("stroke","currentColor");
    rect.setAttribute("stroke-width","2");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");
    path.setAttribute("stroke","currentColor"); path.setAttribute("stroke-width","2");
    svg.append(rect, path);
  }

  if (name === "check") {
    const poly = document.createElementNS(ns, "polyline");
    poly.setAttribute("points", "20 6 9 17 4 12");
    poly.setAttribute("stroke", "currentColor"); poly.setAttribute("stroke-width","2");
    poly.setAttribute("stroke-linecap","round"); poly.setAttribute("stroke-linejoin","round");
    svg.appendChild(poly);
  }

  if (name === "checkbox-on") {
    const poly = document.createElementNS(ns, "polyline");
    poly.setAttribute("points","20 6 9 17 4 12");
    poly.setAttribute("stroke","white"); poly.setAttribute("stroke-width","2.5");
    poly.setAttribute("stroke-linecap","round"); poly.setAttribute("stroke-linejoin","round");
    svg.appendChild(poly);
  }

  return svg;
}

// ── DOM refs ─────────────────────────────────────────────────────
const DOM = {
  extractBtn:     document.getElementById('extractBtn'),
  autoDetectBtn:  document.getElementById('autoDetectBtn'),
  autoDetectLabel:document.getElementById('autoDetectLabel'),
  copyAllBtn:     document.getElementById('copyAllBtn'),
  exportBtn:      document.getElementById('exportBtn'),
  clearBtn:       document.getElementById('clearBtn'),
  historyBtn:     document.getElementById('historyBtn'),
  closeHistoryBtn:document.getElementById('closeHistoryBtn'),
  emailList:      document.getElementById('emailList'),
  emailCount:     document.getElementById('emailCount'),
  domainCount:    document.getElementById('domainCount'),
  lastScanTime:   document.getElementById('lastScanTime'),
  emailCountBadge:document.getElementById('emailCountBadge'),
  emptyState:     document.getElementById('emptyState'),
  toast:          document.getElementById('toast'),
  searchInput:    document.getElementById('searchInput'),
  sortBtn:        document.getElementById('sortBtn'),
  groupBtn:       document.getElementById('groupBtn'),
  selectBtn:      document.getElementById('selectBtn'),
  historyPanel:   document.getElementById('historyPanel'),
  historyList:    document.getElementById('historyList'),
  selectCount:    document.getElementById('selectCount'),
};

// ── State ────────────────────────────────────────────────────────
let extractedEmails = [];
let filteredEmails  = [];
let selectedEmails  = new Set();
let isProcessing    = false;
let currentTabId    = null;
let autoDetect      = false;

// Feature toggles
let sortAsc    = true;   // true = A-Z, false = Z-A
let groupMode  = false;  // group by domain
let selectMode = false;  // multi-select

const SETTINGS_KEY = 'ext_settings';
const HISTORY_KEY = 'extraction_history';
const MAX_HISTORY = 8;

function saveSettings() {
  chrome.storage.local.set({ [SETTINGS_KEY]: { autoDetect } });
}

function applyAutoDetectUI() {
  DOM.autoDetectBtn.classList.toggle('active', autoDetect);
  DOM.autoDetectLabel.textContent = autoDetect ? 'Auto Detect: ON' : 'Auto Detect: OFF';
}

// ── Init ─────────────────────────────────────────────────────────
async function initialize() {
  try {
    const settings = await new Promise(resolve => {
      chrome.storage.local.get([SETTINGS_KEY], resolve);
    });
    autoDetect = !!settings[SETTINGS_KEY]?.autoDetect;
    applyAutoDetectUI();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { displayEmails(); return; }

    currentTabId = tab.id;
    const storageKey = `emails_${tab.id}`;
    const metaKey    = `meta_${tab.id}`;

    chrome.storage.local.get([storageKey, metaKey], (result) => {
      extractedEmails = Array.isArray(result[storageKey]) ? result[storageKey] : [];
      if (result[metaKey]?.time) {
        DOM.lastScanTime.textContent = result[metaKey].time;
      }
      applyFilterAndSort();

      if (autoDetect) {
        setTimeout(() => runExtraction(tab), 250);
      }
    });
  } catch (e) {
    console.error('Init error:', e);
    displayEmails();
  }
}

initialize();

// ── Extract ──────────────────────────────────────────────────────
async function runExtraction(existingTab = null) {
  if (isProcessing) return;
  isProcessing = true;

  const originalNodes = Array.from(DOM.extractBtn.childNodes);
  DOM.extractBtn.replaceChildren();
  DOM.extractBtn.classList.add('loading');
  DOM.extractBtn.disabled = true;

  const spinner = document.createElementNS("http://www.w3.org/2000/svg","svg");
  spinner.setAttribute("width","20"); spinner.setAttribute("height","20");
  spinner.setAttribute("viewBox","0 0 24 24"); spinner.classList.add("btn-icon");
  const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
  circle.setAttribute("cx","12"); circle.setAttribute("cy","12"); circle.setAttribute("r","10");
  circle.setAttribute("stroke","currentColor"); circle.setAttribute("stroke-width","2"); circle.setAttribute("fill","none");
  spinner.appendChild(circle);
  const label = document.createElement("span");
  label.textContent = "Extracting...";
  DOM.extractBtn.append(spinner, label);

  try {
    let tab = existingTab;
    if (!tab) {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    }
    currentTabId = tab?.id ?? null;

    if (!tab?.url) { showToast('No active tab found', 'error'); return; }
    if (!/^https?:/.test(tab.url)) { showToast('Cannot extract from browser internal pages', 'error'); return; }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractEmailsFromPage,
      world: 'MAIN'
    });

    const newEmails = results?.[0]?.result || [];
    extractedEmails = [...new Set(newEmails)].sort();

    // Save scan time
    const now   = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    DOM.lastScanTime.textContent = timeStr;

    await chrome.storage.local.set({
      [`emails_${tab.id}`]: extractedEmails,
      [`meta_${tab.id}`]:   { time: timeStr, url: tab.url }
    });

    // Save to history
    await saveToHistory(tab.url, extractedEmails.length, timeStr);

    selectedEmails.clear();
    applyFilterAndSort();
    showToast(`${extractedEmails.length} email(s) found`, 'success');

  } catch (error) {
    console.error(error);
    showToast('Error extracting emails', 'error');
  } finally {
    DOM.extractBtn.replaceChildren(...originalNodes);
    DOM.extractBtn.classList.remove('loading');
    DOM.extractBtn.disabled = false;
    isProcessing = false;
  }
}

DOM.extractBtn.addEventListener('click', () => runExtraction());

DOM.autoDetectBtn.addEventListener('click', () => {
  autoDetect = !autoDetect;
  applyAutoDetectUI();
  saveSettings();

  if (autoDetect) {
    runExtraction();
  }

  showToast(
    autoDetect ? 'Auto Detect enabled' : 'Auto Detect disabled',
    'info'
  );
});

// ── Injected page function ───────────────────────────────────────
function extractEmailsFromPage() {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const pageText   = document.body.innerText  || '';
  const pageHTML   = document.body.innerHTML  || '';

  const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
    .map(a => a.getAttribute('href').replace('mailto:','').split('?')[0].trim())
    .filter(e => e && e.includes('@'));

  const textEmails = pageText.match(emailRegex) || [];
  const htmlEmails = pageHTML.match(emailRegex) || [];
  const allEmails  = [...new Set([...textEmails, ...htmlEmails, ...mailtoLinks])];

  const excludeDomains = [
    'example.com','domain.com','email.com','test.com','sample.com',
    'placeholder.com','yourdomain.com','yoursite.com','company.com',
    'mysite.com','website.com'
  ];

  return allEmails.filter(email => {
    if (!email || typeof email !== 'string') return false;
    email = email.toLowerCase().trim();
    if (email.length < 5 || email.length > 254) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (!domain.includes('.') || domain.length < 4) return false;
    return !excludeDomains.some(ex => domain === ex);
  });
}

// ── Email quality scoring ────────────────────────────────────────
function emailQuality(email) {
  const [local, domain] = email.split('@');
  let score = 100;

  // Short local parts often are generic
  if (local.length < 4) score -= 20;
  // Common generic prefixes
  const generic = ['info','contact','admin','support','no-reply','noreply','hello','mail','office','sales','team','help'];
  if (generic.includes(local)) score -= 25;
  // Well-known TLDs are more trustworthy
  const goodTLDs = ['com','org','net','edu','gov','io','co'];
  const tld = domain.split('.').pop();
  if (!goodTLDs.includes(tld)) score -= 10;
  // Long domains are suspicious
  if (domain.length > 30) score -= 10;

  if (score >= 75) return { label: 'High',   cls: 'quality-high'   };
  if (score >= 45) return { label: 'Medium', cls: 'quality-medium' };
  return               { label: 'Low',    cls: 'quality-low'    };
}

// ── Filter + Sort + Render ────────────────────────────────────────
function applyFilterAndSort() {
  const q = DOM.searchInput.value.trim().toLowerCase();

  filteredEmails = q
    ? extractedEmails.filter(e => e.toLowerCase().includes(q))
    : [...extractedEmails];

  filteredEmails.sort((a, b) => sortAsc ? a.localeCompare(b) : b.localeCompare(a));

  displayEmails();
}

function displayEmails() {
  DOM.emailList.replaceChildren();

  const total = extractedEmails.length;
  const shown = filteredEmails.length;

  DOM.emailCount.textContent      = total;
  DOM.emailCountBadge.textContent = shown < total ? `${shown}/${total}` : total;

  const domains = new Set(extractedEmails.map(e => e.split('@')[1]).filter(Boolean));
  DOM.domainCount.textContent = domains.size;

  updateSelectCount();

  if (total === 0) { updateEmptyState(true); return; }

  DOM.emptyState.style.display = 'none';
  DOM.copyAllBtn.disabled = false;
  DOM.exportBtn.disabled  = false;
  DOM.clearBtn.disabled   = false;

  if (shown === 0) {
    // No match for filter
    const noMatch = document.createElement('div');
    noMatch.className = 'empty-state';
    noMatch.style.height = '120px';
    const icon = document.createElement('div'); icon.className = 'empty-icon'; icon.style.fontSize='20px'; icon.textContent = 'No Match';
    const txt  = document.createElement('div'); txt.className  = 'empty-text'; txt.style.fontSize='14px'; txt.textContent  = 'No results match your search';
    noMatch.append(icon, txt);
    DOM.emailList.appendChild(noMatch);
    return;
  }

  if (groupMode) {
    renderGrouped();
  } else {
    filteredEmails.forEach((email, i) => DOM.emailList.appendChild(createEmailElement(email, i)));
  }

  // Apply select mode class
  if (selectMode) DOM.emailList.classList.add('select-mode');
  else            DOM.emailList.classList.remove('select-mode');
}

function renderGrouped() {
  const groups = {};
  filteredEmails.forEach(email => {
    const domain = email.split('@')[1] || 'unknown';
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(email);
  });

  Object.keys(groups).sort().forEach(domain => {
    // Domain header
    const header = document.createElement('div');
    header.className = 'domain-group-header';
    const domainText = document.createElement('span');
    domainText.textContent = domain;
    const countBadge = document.createElement('span');
    countBadge.textContent = groups[domain].length;
    header.append(domainText, ' ', countBadge);
    DOM.emailList.appendChild(header);

    // Emails in this group
    groups[domain].forEach((email, i) => DOM.emailList.appendChild(createEmailElement(email, i)));
  });
}

// ── Email element ─────────────────────────────────────────────────
function createEmailElement(email, index) {
  const item = document.createElement('div');
  item.className = 'email-item';
  item.style.animationDelay = `${index * 0.04}s`;
  if (selectedEmails.has(email)) item.classList.add('selected');

  // Checkbox
  const checkbox = document.createElement('div');
  checkbox.className = 'email-checkbox';
  if (selectedEmails.has(email)) checkbox.appendChild(createIcon('checkbox-on'));

  item.addEventListener('click', (e) => {
    if (!selectMode) return;
    e.stopPropagation();
    toggleSelect(email, item, checkbox);
  });

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'email-avatar';
  avatar.textContent = email.charAt(0).toUpperCase();

  // Content
  const content  = document.createElement('div');
  content.className = 'email-content';

  const emailText = document.createElement('div');
  emailText.className = 'email-text';
  const [localPart, domain] = email.split('@');
  emailText.textContent = localPart + '@';
  const domSpan = document.createElement('span');
  domSpan.className = 'email-domain';
  domSpan.textContent = domain;
  emailText.appendChild(domSpan);

  const meta = document.createElement('div');
  meta.className = 'email-meta';

  // Quality badge
  const q = emailQuality(email);
  const qBadge = document.createElement('span');
  qBadge.className = `quality-badge ${q.cls}`;
  qBadge.textContent = q.label;
  meta.append(domain, ' ');
  meta.appendChild(qBadge);

  content.appendChild(emailText);
  content.appendChild(meta);

  // Right side: copy btn
  const right = document.createElement('div');
  right.className = 'email-item-right';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-copy-single';
  copyBtn.appendChild(createIcon('copy'));
  copyBtn.append(' Copy');
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(email, copyBtn);
  });
  right.appendChild(copyBtn);

  item.append(checkbox, avatar, content, right);
  return item;
}

// ── Select mode ───────────────────────────────────────────────────
function toggleSelect(email, item, checkbox) {
  if (selectedEmails.has(email)) {
    selectedEmails.delete(email);
    item.classList.remove('selected');
    checkbox.replaceChildren();
  } else {
    selectedEmails.add(email);
    item.classList.add('selected');
    checkbox.replaceChildren();
    checkbox.appendChild(createIcon('checkbox-on'));
  }
  updateSelectCount();
  updateCopyAllLabel();
}

function updateSelectCount() {
  const n = selectedEmails.size;
  if (selectMode && n > 0) {
    DOM.selectCount.textContent = `${n} selected`;
    DOM.selectCount.classList.add('visible');
  } else {
    DOM.selectCount.classList.remove('visible');
  }
}

function updateCopyAllLabel() {
  if (selectMode && selectedEmails.size > 0) {
    DOM.copyAllBtn.textContent = `Copy ${selectedEmails.size} Selected`;
  } else {
    DOM.copyAllBtn.textContent = 'Copy All';
  }
}

// ── Toolbar controls ──────────────────────────────────────────────
DOM.searchInput.addEventListener('input', applyFilterAndSort);

DOM.sortBtn.addEventListener('click', () => {
  sortAsc = !sortAsc;
  DOM.sortBtn.textContent = sortAsc ? 'Sort A-Z' : 'Sort Z-A';
  DOM.sortBtn.classList.toggle('active', !sortAsc);
  applyFilterAndSort();
});

DOM.groupBtn.addEventListener('click', () => {
  groupMode = !groupMode;
  DOM.groupBtn.classList.toggle('active', groupMode);
  displayEmails();
});

DOM.selectBtn.addEventListener('click', () => {
  selectMode = !selectMode;
  DOM.selectBtn.classList.toggle('active', selectMode);

  if (!selectMode) {
    // Exit select mode: clear selection
    selectedEmails.clear();
    updateSelectCount();
    updateCopyAllLabel();
  }

  displayEmails();
  if (selectMode) showToast('Click emails to select them', 'info');
});

// ── History ───────────────────────────────────────────────────────
DOM.historyBtn.addEventListener('click', () => {
  const open = DOM.historyPanel.classList.toggle('open');
  DOM.historyBtn.classList.toggle('active', open);
  if (open) renderHistory();
});

DOM.closeHistoryBtn.addEventListener('click', () => {
  DOM.historyPanel.classList.remove('open');
  DOM.historyBtn.classList.remove('active');
});

async function saveToHistory(url, count, time) {
  return new Promise(resolve => {
    chrome.storage.local.get([HISTORY_KEY], result => {
      const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];

      // Remove existing entry for same URL
      const filtered = history.filter(h => h.url !== url);

      // Add new entry at front
      filtered.unshift({ url, count, time, date: new Date().toLocaleDateString() });

      // Keep only last MAX_HISTORY
      const trimmed = filtered.slice(0, MAX_HISTORY);

      chrome.storage.local.set({ [HISTORY_KEY]: trimmed }, resolve);
    });
  });
}

function renderHistory() {
  DOM.historyList.replaceChildren();

  chrome.storage.local.get([HISTORY_KEY], result => {
    const history = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;text-align:center;color:#9ca3af;font-size:12px;';
      empty.textContent = 'No history yet. Extract emails to start tracking.';
      DOM.historyList.appendChild(empty);
      return;
    }

    history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const urlDiv = document.createElement('div');
      urlDiv.className = 'history-item-url';
      try {
        urlDiv.textContent = new URL(item.url).hostname;
        urlDiv.title = item.url;
      } catch { urlDiv.textContent = item.url; }

      const countBadge = document.createElement('span');
      countBadge.className = 'history-item-count';
      countBadge.textContent = `${item.count} emails`;

      const timeDiv = document.createElement('div');
      timeDiv.className = 'history-item-time';
      timeDiv.textContent = item.time || item.date || '';

      row.append(urlDiv, countBadge, timeDiv);
      DOM.historyList.appendChild(row);
    });
  });
}

// ── Empty state ───────────────────────────────────────────────────
function updateEmptyState(show = true) {
  if (show) {
    DOM.emptyState.style.display = 'flex';
    DOM.copyAllBtn.disabled = true;
    DOM.exportBtn.disabled  = true;
    DOM.clearBtn.disabled   = true;
  } else {
    DOM.emptyState.style.display = 'none';
  }
}

// ── Copy ──────────────────────────────────────────────────────────
async function copyToClipboard(email, button) {
  try {
    await navigator.clipboard.writeText(email);
    const originalNodes = Array.from(button.childNodes);
    button.replaceChildren();
    button.appendChild(createIcon('check'));
    button.append(' Copied!');
    button.classList.add('copied');
    showToast(`Copied: ${email}`, 'success');
    setTimeout(() => {
      button.replaceChildren(...originalNodes);
      button.classList.remove('copied');
    }, 2000);
  } catch {
    showToast('Failed to copy to clipboard', 'error');
  }
}

// Copy All / Copy Selected
DOM.copyAllBtn.addEventListener('click', async () => {
  try {
    const list = (selectMode && selectedEmails.size > 0)
      ? [...selectedEmails]
      : filteredEmails;
    await navigator.clipboard.writeText(list.join('\n'));
    showToast(`Copied ${list.length} email${list.length > 1 ? 's' : ''} to clipboard!`, 'success');
  } catch {
    showToast('Failed to copy emails', 'error');
  }
});

// ── Export CSV ────────────────────────────────────────────────────
function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

DOM.exportBtn.addEventListener('click', () => {
  try {
    const list = (selectMode && selectedEmails.size > 0)
      ? [...selectedEmails]
      : filteredEmails;

    const headers = 'Email Address,Domain,Quality\n';
    const rows = list.map(email => {
      const domain = email.split('@')[1] || '';
      const q = emailQuality(email).label;
      return [
        escapeCsvValue(email),
        escapeCsvValue(domain),
        escapeCsvValue(q)
      ].join(',');
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emails-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${list.length} emails to CSV`, 'success');
  } catch {
    showToast('Failed to export emails', 'error');
  }
});

// ── Clear ─────────────────────────────────────────────────────────
DOM.clearBtn.addEventListener('click', () => {
  if (extractedEmails.length === 0) return;
  if (confirm('Clear all extracted emails for this page?')) {
    extractedEmails = [];
    filteredEmails  = [];
    selectedEmails.clear();
    DOM.lastScanTime.textContent = '—';
    if (currentTabId) {
      chrome.storage.local.remove([`emails_${currentTabId}`, `meta_${currentTabId}`], () => {
        applyFilterAndSort();
        showToast('All emails cleared', 'info');
      });
    } else {
      applyFilterAndSort();
      showToast('All emails cleared', 'info');
    }
  }
});

// ── Toast ─────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast        = DOM.toast;
  const toastIcon    = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');

  const icons = { success:'OK', error:'ERR', info:'INFO' };
  toastIcon.textContent    = icons[type] || 'INFO';
  toastMessage.textContent = message.trim();

  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd+E → extract
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); DOM.extractBtn.click(); }
  // Ctrl/Cmd+F → focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); DOM.searchInput.focus(); }
  // Ctrl/Cmd+A → select all (select mode)
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectMode) {
    e.preventDefault();
    filteredEmails.forEach(em => selectedEmails.add(em));
    updateSelectCount(); updateCopyAllLabel(); displayEmails();
  }
  // Escape → clear search or exit select mode
  if (e.key === 'Escape') {
    if (DOM.searchInput.value) { DOM.searchInput.value = ''; applyFilterAndSort(); }
    else if (selectMode) DOM.selectBtn.click();
    else if (extractedEmails.length > 0) DOM.clearBtn.click();
  }
});

// ── Error boundary ────────────────────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showToast('An unexpected error occurred', 'error');
});

chrome.tabs.onActivated.addListener(() => { /* popup closed on tab switch anyway */ });

// popup.js — U-Scraper v2.0

// ── State ───────────────────────────────────────────────────────────────────
let currentData = null;
let customFields = [];
let settings = {};

const DEFAULT_SETTINGS = {
  autoscroll: true,
  waitIdle: true,
  cleanData: true,
  jsonPretty: true,
  includeMeta: true,
  notifications: true
};

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.classList.contains('options-page')) {
    await initOptionsPage();
    return;
  }

  setupTabs();
  settings = await loadSettings();
  applySettings();
  initCustomSelects();
  await loadHistory();
  bindEvents();
  setupScrapeTypeChange();
  listenForProgress();
});

// ── Tab Switching ───────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'history') loadHistory();
    });
  });
}

// ── Settings ────────────────────────────────────────────────────────────────
async function loadSettings() {
  const result = await chrome.storage.local.get(['scraperSettings']);
  return { ...DEFAULT_SETTINGS, ...(result.scraperSettings || {}) };
}

function applySettings() {
  document.getElementById('setting-autoscroll').checked = settings.autoscroll;
  document.getElementById('setting-wait-idle').checked = settings.waitIdle;
  document.getElementById('setting-clean-data').checked = settings.cleanData;
  document.getElementById('setting-json-pretty').checked = settings.jsonPretty;
  document.getElementById('setting-include-meta').checked = settings.includeMeta;
  document.getElementById('setting-notifications').checked = settings.notifications;
}

async function saveSettingsFromForm() {
  settings = {
    autoscroll: document.getElementById('setting-autoscroll').checked,
    waitIdle: document.getElementById('setting-wait-idle').checked,
    cleanData: document.getElementById('setting-clean-data').checked,
    jsonPretty: document.getElementById('setting-json-pretty').checked,
    includeMeta: document.getElementById('setting-include-meta').checked,
    notifications: document.getElementById('setting-notifications').checked
  };
  await chrome.storage.local.set({ scraperSettings: settings });
  const btn = document.getElementById('btn-save-settings');
  btn.textContent = '✓ Saved';
  setTimeout(() => { btn.textContent = 'Save Settings'; }, 1500);
}

// ── Custom Fields ───────────────────────────────────────────────────────────
async function loadCustomFields() {
  const result = await chrome.storage.local.get(['customFields']);
  customFields = result.customFields || [];
  renderFields();
}

function renderFields() {
  const list = document.getElementById('fields-list');
  if (!list) return;
  list.innerHTML = '';

  if (customFields.length === 0) {
    list.innerHTML = '<div class="empty-state">No fields defined. Click "+ Add Field" or use 🎯 Pick Element.</div>';
    return;
  }

  customFields.forEach((field, idx) => {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = `
      <div class="field-item-info">
        <div class="field-item-name">${escHtml(field.name)}</div>
        <div class="field-item-sel">${escHtml(field.selector)}</div>
      </div>
      <span class="field-type-badge">${escHtml(field.type)}</span>
      <button class="field-item-del" data-idx="${idx}" title="Remove">✕</button>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.field-item-del').forEach(btn => {
    btn.addEventListener('click', () => removeField(parseInt(btn.dataset.idx)));
  });
}

async function addField(field) {
  customFields.push(field);
  await chrome.storage.local.set({ customFields });
  renderFields();
}

async function removeField(idx) {
  customFields.splice(idx, 1);
  await chrome.storage.local.set({ customFields });
  renderFields();
}

// ── Templates ───────────────────────────────────────────────────────────────
async function loadTemplates() {
  const result = await chrome.storage.local.get(['scrapeTemplates']);
  const templates = result.scrapeTemplates || {};
  const sel = document.getElementById('template-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Load template —</option>';
  Object.keys(templates).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

async function saveTemplate() {
  const name = prompt('Template name:', getTabDomain() || 'My Template');
  if (!name) return;
  const result = await chrome.storage.local.get(['scrapeTemplates']);
  const templates = result.scrapeTemplates || {};
  templates[name] = {
    fields: [...customFields],
    settings: { ...settings },
    scrapeType: document.getElementById('scrape-type').value
  };
  await chrome.storage.local.set({ scrapeTemplates: templates });
  await loadTemplates();
  document.getElementById('template-select').value = name;
}

async function loadSelectedTemplate() {
  const name = document.getElementById('template-select').value;
  if (!name) return;
  const result = await chrome.storage.local.get(['scrapeTemplates']);
  const tpl = (result.scrapeTemplates || {})[name];
  if (!tpl) return;
  customFields = tpl.fields || [];
  await chrome.storage.local.set({ customFields });
  renderFields();
  if (tpl.scrapeType) document.getElementById('scrape-type').value = tpl.scrapeType;
}

async function deleteTemplate() {
  const name = document.getElementById('template-select').value;
  if (!name || !confirm(`Delete template "${name}"?`)) return;
  const result = await chrome.storage.local.get(['scrapeTemplates']);
  const templates = result.scrapeTemplates || {};
  delete templates[name];
  await chrome.storage.local.set({ scrapeTemplates: templates });
  await loadTemplates();
}

// ── Visual Element Selector ─────────────────────────────────────────────────
async function activateSelector() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'startSelector' });
    window.close(); // Close popup while user picks elements
  } catch (e) {
    alert('Cannot inject selector on this page.');
  }
}

function listenForSelectorResults() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'selectorDone' && !msg.cancelled && msg.fields?.length > 0) {
      msg.fields.forEach(f => addField(f));
    }
  });
}

// ── Scraping ────────────────────────────────────────────────────────────────
function setupScrapeTypeChange() {
  document.getElementById('scrape-type').addEventListener('change', function () {
    document.getElementById('multi-page-opts').classList.toggle('hidden', this.value !== 'multi-page');
  });
}

function initCustomSelects() {
  document.querySelectorAll('.select-wrap select').forEach((select) => {
    if (select.dataset.enhanced === 'true') return;
    select.dataset.enhanced = 'true';

    const custom = document.createElement('div');
    custom.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.textContent = select.options[select.selectedIndex]?.textContent || '';

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';

    Array.from(select.options).forEach((option) => {
      const optionBtn = document.createElement('button');
      optionBtn.type = 'button';
      optionBtn.className = 'custom-select-option';
      optionBtn.textContent = option.textContent;
      if (option.selected) optionBtn.classList.add('active');

      optionBtn.addEventListener('click', () => {
        select.value = option.value;
        trigger.textContent = option.textContent;
        menu.querySelectorAll('.custom-select-option').forEach(btn => btn.classList.remove('active'));
        optionBtn.classList.add('active');
        custom.classList.remove('open');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      menu.appendChild(optionBtn);
    });

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach((openSelect) => {
        if (openSelect !== custom) openSelect.classList.remove('open');
      });
      custom.classList.toggle('open');
    });

    custom.appendChild(trigger);
    custom.appendChild(menu);
    select.parentElement.appendChild(custom);
  });

  document.addEventListener('click', closeCustomSelects);
}

function closeCustomSelects() {
  document.querySelectorAll('.custom-select.open').forEach((openSelect) => {
    openSelect.classList.remove('open');
  });
}

async function startScraping() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  setStatus('running', 'Scraping...', 'Injecting content script');
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-stop').disabled = false;
  document.getElementById('progress-wrap').classList.remove('hidden');
  document.getElementById('results-area').classList.add('hidden');

  const scrapeType = document.getElementById('scrape-type').value;
  const scrapeSettings = {
    autoscroll: settings.autoscroll,
    waitIdle: settings.waitIdle,
    customFields: scrapeType === 'custom-fields' ? customFields : [],
    maxPages: scrapeType === 'multi-page' ? parseInt(document.getElementById('max-pages')?.value || 5) : 1
  };

  try {
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Ping to ensure script is ready
    await ping(tab.id);

    // Send scrape message
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'startScraping',
      settings: scrapeSettings
    });

    if (response?.success && response.data) {
      currentData = response.data;
      await chrome.storage.local.set({ latestScrapeData: currentData });
      const totalItems = countItems(response.data);

      setStatus('done', 'Scraping complete!', `${totalItems} items collected`);
      document.getElementById('result-count').textContent = totalItems;
      document.getElementById('results-area').classList.remove('hidden');

      // Record analytics
      const pageData = response.data[0] || {};
      await chrome.runtime.sendMessage({
        action: 'recordAnalytics',
        data: {
          url: tab.url,
          title: tab.title,
          domain: pageData.domain || new URL(tab.url).hostname,
          itemCount: totalItems,
          duration: pageData.scrapeDuration,
          success: true
        }
      });

      // Notification
      if (settings.notifications) {
        chrome.runtime.sendMessage({
          action: 'showNotification',
          title: 'Scraping Complete',
          body: `Collected ${totalItems} items from ${pageData.domain || tab.url}`
        });
      }

    } else {
      throw new Error(response?.error || 'Unknown error');
    }
  } catch (e) {
    setStatus('error', 'Scraping failed', e.message.substring(0, 80));
    await chrome.runtime.sendMessage({
      action: 'recordAnalytics',
      data: { url: tab.url, title: tab.title, domain: '', itemCount: 0, success: false, error: e.message }
    });
  } finally {
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('progress-wrap').classList.add('hidden');
    updateProgress(0, '');
  }
}

async function stopScraping() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { action: 'stopScraping' }).catch(() => {});
  setStatus('ready', 'Stopped', 'Scraping was cancelled');
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-stop').disabled = true;
}

async function ping(tabId) {
  return new Promise((resolve) => {
    const attempt = (retries) => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (res) => {
        if (res?.status === 'alive') return resolve();
        if (retries > 0) setTimeout(() => attempt(retries - 1), 200);
        else resolve();
      });
    };
    attempt(5);
  });
}

// ── Progress Listener ───────────────────────────────────────────────────────
function listenForProgress() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'scrapingProgress') {
      updateProgress(msg.progress.current, msg.progress.step);
    }
  });
}

function updateProgress(pct, step) {
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-label').textContent = `${pct}%`;
  if (step) document.getElementById('status-details').textContent = step;
}

// ── Export Functions ─────────────────────────────────────────────────────────
function handleExport(format) {
  if (!currentData) return;

  switch (format) {
    case 'json': exportJSON(); break;
    case 'csv': exportCSV(); break;
    case 'txt': exportTXT(); break;
    case 'html': exportHTMLTable(); break;
    case 'media': downloadAllMedia(); break;
  }

  // Record format analytics
  chrome.runtime.sendMessage({ action: 'recordAnalytics', data: { format, success: true, itemCount: 0 } });
}

function exportJSON() {
  if (!currentData) return;
  const dataToExport = settings.includeMeta ? currentData : currentData.map(page => {
    const { paragraphs, headings, customFields, links } = page;
    return { paragraphs, headings, customFields, links };
  });

  const blob = new Blob([JSON.stringify(dataToExport, null, settings.jsonPretty ? 2 : 0)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url,
    filename: `uscraper-data-${Date.now()}.json`,
    saveAs: true
  }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

function exportCSV() {
  const rows = buildCsvRowsFromScrape(currentData);
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => headers.map(h => {
      const v = serializeCsvValue(row[h]).replace(/"/g, '""');
      return `"${v}"`;
    }).join(','))
  ].join('\n');
  downloadFile('scraped-data.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

function exportTXT() {
  const rows = buildCsvRowsFromScrape(currentData);
  if (!rows.length) return;
  downloadFile('scraped-data.txt', rowsToText(rows), 'text/plain;charset=utf-8');
}

function exportHTMLTable() {
  const rows = flattenForExport(currentData);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);

  const tableRows = rows.map(row =>
    '<tr>' + headers.map(h => `<td>${escHtml(String(row[h] ?? ''))}</td>`).join('') + '</tr>'
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>U-Scraper Data</title>
<style>
  body { font-family: sans-serif; padding: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #00897b; color: white; padding: 10px 14px; text-align: left; }
  td { padding: 8px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:hover td { background: #f5fafa; }
  h1 { font-size: 20px; margin-bottom: 12px; color: #1a2e2d; }
  p { color: #5a7370; font-size: 13px; margin-bottom: 16px; }
</style></head>
<body>
<h1>Scraped Data</h1>
<p>Exported by U-Scraper on ${new Date().toLocaleString()}</p>
<table>
  <thead><tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`;

  downloadFile('scraped-data.html', html, 'text/html');
}

async function downloadAllMedia() {
  const mediaItems = collectMediaItems(currentData);
  if (!mediaItems.length) {
    alert('No media files were found in this scrape.');
    return;
  }

  for (const item of mediaItems) {
    await chrome.downloads.download({
      url: item.url,
      filename: item.filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }).catch(() => {});
  }
}

// ── Export Helpers ───────────────────────────────────────────────────────────
function flattenForExport(data) {
  const flat = [];
  if (!Array.isArray(data)) return [];

  data.forEach(page => {
    // 1. Handle Custom Fields Mode
    if (page.customFields && Object.keys(page.customFields).length > 0) {
      const fields = page.customFields;
      const rowCount = Math.max(...Object.values(fields).map(v => Array.isArray(v) ? v.length : 1));

      for (let i = 0; i < rowCount; i += 1) {
        const row = {};
        if (settings.includeMeta) {
          row._source = page.url;
          row._timestamp = page.scrapedAt;
        }
        for (const [key, value] of Object.entries(fields)) {
          row[key] = Array.isArray(value) ? (value[i] ?? '') : (i === 0 ? value : '');
        }
        flat.push(row);
      }
    }
    // 2. Handle Full Page Mode (Paragraphs)
    else if (page.paragraphs && page.paragraphs.length > 0) {
      page.paragraphs.forEach(p => {
        const row = { content: p };
        if (settings.includeMeta) {
          row._source = page.url;
          row._title = page.title;
        }
        flat.push(row);
      });
    }
    // 3. Fallback (Metadata only)
    else {
      flat.push({
        title: page.title,
        url: page.url,
        scrapedAt: page.scrapedAt
      });
    }
  });
  return flat;
}

function buildCsvRowsFromScrape(data) {
  if (!Array.isArray(data)) return [];

  const customFieldRows = flattenForExport(data);
  if (customFieldRows.length > 0) {
    return customFieldRows.map(row => normalizeCsvRow(row));
  }

  return data.map((page, pageIndex) => normalizeCsvRow({
    rowNumber: pageIndex + 1,
    title: page.title,
    url: page.url,
    domain: page.domain,
    description: page.description,
    scrapedAt: page.scrapedAt,
    scrapeDuration: page.scrapeDuration,
    headings: (page.headings || []).map(item => item.text || '').filter(Boolean).join(' | '),
    paragraphs: (page.paragraphs || []).join('\n\n'),
    fullText: page.fullText || '',
    internalLinks: page.links?.internal || [],
    externalLinks: page.links?.external || [],
    socialLinks: page.links?.social || [],
    emails: page.links?.emails || [],
    phones: page.links?.phones || [],
    images: (page.images || []).map(item => item.src || ''),
    imageAltText: (page.images || []).map(item => item.alt || ''),
    videos: (page.videos || []).map(item => item.src || ''),
    audios: (page.audios || []).map(item => item.src || ''),
    tables: page.tables || [],
    forms: page.forms || [],
    nextPageUrl: page.nextPageUrl || ''
  }));
}

function normalizeCsvRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[key] = serializeCsvValue(value);
  });
  return normalized;
}

function serializeCsvValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item == null) return '';
      if (typeof item === 'object') return safeJsonStringify(item, 0);
      return String(item);
    }).filter(Boolean).join(' | ');
  }
  if (typeof value === 'object') {
    return safeJsonStringify(value, 0);
  }
  return String(value);
}

function stripMeta(page) {
  const { title, url, domain, description, keywords, author, openGraph, twitter, jsonLd, ...rest } = page;
  return rest;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: false }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

function downloadJsonFile(filename, data, indent = 2) {
  const json = safeJsonStringify(data, indent);
  downloadFile(filename, json, 'application/json;charset=utf-8');
}

function rowsToText(rows) {
  return rows.map((row, index) => {
    const lines = [`Record ${index + 1}`];
    Object.entries(row || {}).forEach(([key, value]) => {
      lines.push(`${key}: ${serializeCsvValue(value)}`);
    });
    return lines.join('\n');
  }).join('\n\n--------------------\n\n');
}

function safeJsonStringify(value, indent = 2) {
  const seen = new WeakSet();
  return JSON.stringify(normalizeForJson(value, seen), null, indent);
}

function normalizeForJson(value, seen) {
  if (value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return String(value);
  if (value === null || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => normalizeForJson(item, seen));
  }

  const result = {};
  Object.entries(value).forEach(([key, child]) => {
    result[key] = normalizeForJson(child, seen);
  });
  return result;
}

function collectMediaItems(data) {
  const items = [];
  const seen = new Set();

  (data || []).forEach((page, pageIndex) => {
    const groups = [
      { list: page.images || [], type: 'image' },
      { list: page.videos || [], type: 'video' },
      { list: page.audios || [], type: 'audio' }
    ];

    groups.forEach(({ list, type }) => {
      list.forEach((entry, itemIndex) => {
        const url = entry?.src || entry?.url || '';
        if (!url || seen.has(url)) return;
        seen.add(url);
        items.push({
          url,
          filename: buildMediaFilename(url, type, pageIndex, itemIndex)
        });
      });
    });
  });

  return items;
}

function buildMediaFilename(url, type, pageIndex, itemIndex) {
  const fallbackExt = { image: '.jpg', video: '.mp4', audio: '.mp3' }[type] || '.bin';
  let baseName = '';

  try {
    const parsed = new URL(url);
    baseName = parsed.pathname.split('/').pop() || '';
  } catch {}

  baseName = sanitizeFilename(baseName);
  if (!baseName) {
    baseName = `${type}-${pageIndex + 1}-${itemIndex + 1}${fallbackExt}`;
  } else if (!/\.[a-z0-9]{2,5}$/i.test(baseName)) {
    baseName += fallbackExt;
  }

  return `u-scraper-media/${type}s/${baseName}`;
}

function sanitizeFilename(value) {
  return String(value || '')
    .split('?')[0]
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
}

// ── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const { scrapeHistory } = await chrome.storage.local.get(['scrapeHistory']);
  renderHistory(scrapeHistory || []);
}

function renderHistory(history) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (!history.length) {
    list.innerHTML = '<div class="empty-state">No history yet. Start scraping!</div>';
    return;
  }

  history.slice(0, 20).forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const infoDiv = document.createElement('div');
    infoDiv.className = 'history-info';

    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'history-url';
    link.textContent = item.title || item.url;

    const meta = document.createElement('div');
    meta.className = 'history-meta';
    meta.textContent = `${date} • ${item.itemCount || 0} items`;

    infoDiv.appendChild(link);
    infoDiv.appendChild(meta);

    const badge = document.createElement('span');
    badge.className = `history-badge ${item.success ? 'success' : 'error'}`;
    badge.textContent = item.success ? 'OK' : 'Err';

    div.appendChild(infoDiv);
    div.appendChild(badge);
    list.appendChild(div);
  });
}

async function clearHistory() {
  if (!confirm('Clear all scraping history?')) return;
  await chrome.storage.local.set({ scrapeHistory: [] });
  loadHistory();
}

// ── Bind all events ──────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('btn-start').addEventListener('click', startScraping);
  document.getElementById('btn-stop').addEventListener('click', stopScraping);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettingsFromForm);
  document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
  document.getElementById('open-options-link').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  document.getElementById('btn-view-results').addEventListener('click', openPreview);

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => handleExport(btn.dataset.format));
  });
}

// ── Preview ──────────────────────────────────────────────────────────────────
async function openPreview() {
  if (!currentData) return;
  await chrome.storage.local.set({ previewData: currentData });
  chrome.tabs.create({ url: chrome.runtime.getURL('preview.html') });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(state, heading, details) {
  document.getElementById('status-indicator').className = `status-indicator ${state}`;
  document.getElementById('status-heading').textContent = heading;
  document.getElementById('status-details').textContent = details;
}

function countItems(data) {
  if (!data || !data.length) return 0;
  const page = data[0];

  if (page.customFields && Object.keys(page.customFields).length > 0) {
    return Math.max(...Object.values(page.customFields).map(v => Array.isArray(v) ? v.length : 1));
  }

  return (page.paragraphs?.length || 0) || (page.images?.length || 0) || 1;
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

function getTabDomain() {
  return window.location.hostname || '';
}

// ── Options Page ────────────────────────────────────────────────────────────
async function initOptionsPage() {
  setupOptionsTabs();
  await optionsLoadAnalytics();
  await optionsLoadHistory();
  await optionsLoadTemplates();
  await optionsLoadSettings();

  document.getElementById('btn-save-settings').addEventListener('click', optionsSaveSettings);
  document.getElementById('btn-clear-history').addEventListener('click', optionsClearHistory);
}

function setupOptionsTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'history') optionsLoadHistory();
      if (tab === 'analytics') optionsLoadAnalytics();
      if (tab === 'templates') optionsLoadTemplates();
    });
  });
}

async function optionsLoadAnalytics() {
  const { analytics } = await chrome.storage.local.get(['analytics']);
  const stats = analytics || {
    totalScrapes: 0, totalItems: 0, successCount: 0, errorCount: 0,
    domains: {}, formats: { json: 0, csv: 0, html: 0, media: 0 }, dailyScrapes: {}
  };

  const metricsEl = document.getElementById('analytics-metrics');
  const successRate = stats.totalScrapes > 0
    ? Math.round((stats.successCount / stats.totalScrapes) * 100)
    : 0;

  const metrics = [
    { num: stats.totalScrapes, label: 'Total Scrapes' },
    { num: stats.totalItems.toLocaleString(), label: 'Items Collected' },
    { num: stats.successCount, label: 'Successful' },
    { num: stats.errorCount, label: 'Errors' },
    { num: `${successRate}%`, label: 'Success Rate' },
    { num: Object.keys(stats.domains).length, label: 'Domains Scraped' }
  ];

  metricsEl.innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-num">${m.num}</div>
      <div class="metric-label">${m.label}</div>
    </div>
  `).join('');

  const today = new Date();
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().substring(0, 10));
  }

  const chartEl = document.getElementById('daily-chart');
  const labelsEl = document.getElementById('daily-labels');
  const maxVal = Math.max(...days.map(d => stats.dailyScrapes[d] || 0), 1);

  chartEl.innerHTML = days.map(d => {
    const val = stats.dailyScrapes[d] || 0;
    const pct = Math.round((val / maxVal) * 100);
    const label = d.substring(5);
    return `<div class="bar" style="height:${Math.max(pct, 2)}%" data-label="${label}: ${val} scrape${val !== 1 ? 's' : ''}"></div>`;
  }).join('');

  labelsEl.innerHTML = days.map((d, i) => {
    const label = i % 2 === 0 ? d.substring(8) : '';
    return `<span class="bar-label">${label}</span>`;
  }).join('');

  const topDomainsEl = document.getElementById('top-domains');
  const sortedDomains = Object.entries(stats.domains).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDomain = sortedDomains[0]?.[1] || 1;

  if (sortedDomains.length === 0) {
    topDomainsEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">No domain data yet.</p>';
  } else {
    topDomainsEl.innerHTML = sortedDomains.map(([domain, count]) => `
      <div class="domain-row">
        <span class="domain-name">${escHtml(domain)}</span>
        <div class="domain-bar-track">
          <div class="domain-bar-fill" style="width:${Math.round((count / maxDomain) * 100)}%"></div>
        </div>
        <span class="domain-count">${count}</span>
      </div>
    `).join('');
  }

  const fmtEl = document.getElementById('format-pills');
  const fmtColors = { json: 'fp-json', csv: 'fp-csv', html: 'fp-html', media: 'fp-media' };
  fmtEl.innerHTML = Object.entries(stats.formats || {}).map(([fmt, count]) => `
    <div class="format-pill ${fmtColors[fmt] || ''}">${fmt.toUpperCase()}: ${count}</div>
  `).join('');
}

async function optionsLoadHistory() {
  const { scrapeHistory } = await chrome.storage.local.get(['scrapeHistory']);
  const history = scrapeHistory || [];

  document.getElementById('history-count').textContent = `${history.length} entries`;

  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = '';

  if (history.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No history yet. Start scraping!</td>';
    tbody.appendChild(tr);
    return;
  }

  history.slice(0, 100).forEach(item => {
    const tr = document.createElement('tr');
    const date = new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const duration = item.duration ? `${(item.duration / 1000).toFixed(1)}s` : '—';

    const urlLink = document.createElement('a');
    urlLink.href = item.url;
    urlLink.target = '_blank';
    urlLink.rel = 'noopener noreferrer';
    urlLink.style.cssText = 'color:var(--primary);text-decoration:none;font-size:12px;';
    urlLink.textContent = (item.title || item.url || '').substring(0, 60);

    const tdStatus = document.createElement('td');
    const dot = document.createElement('span');
    dot.className = `status-dot ${item.success ? 'ok' : 'err'}`;
    tdStatus.appendChild(dot);

    const tdTitle = document.createElement('td');
    tdTitle.appendChild(urlLink);

    tr.appendChild(tdStatus);
    tr.appendChild(tdTitle);

    [
      item.domain || '—',
      item.itemCount ?? 0,
      duration,
      date
    ].forEach(val => {
      const td = document.createElement('td');
      td.style.cssText = 'font-size:12px;color:var(--text-secondary);';
      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function optionsClearHistory() {
  if (!confirm('Clear all scraping history and analytics?')) return;
  await chrome.storage.local.set({ scrapeHistory: [], analytics: null });
  optionsLoadHistory();
  optionsLoadAnalytics();
}

async function optionsLoadTemplates() {
  const { scrapeTemplates } = await chrome.storage.local.get(['scrapeTemplates']);
  const templates = scrapeTemplates || {};
  const grid = document.getElementById('templates-grid');
  grid.innerHTML = '';

  const keys = Object.keys(templates);
  if (keys.length === 0) {
    grid.innerHTML = '<div class="empty-state">No templates saved yet. Create templates from the popup\'s Fields tab.</div>';
    return;
  }

  keys.forEach(name => {
    const tpl = templates[name];
    const card = document.createElement('div');
    card.className = 'template-card';

    const fieldCount = tpl.fields?.length || 0;

    card.innerHTML = `
      <h4>${escHtml(name)}</h4>
      <div class="template-meta">
        ${fieldCount} field${fieldCount !== 1 ? 's' : ''} • 
        ${escHtml(tpl.scrapeType || 'full-page')} mode
      </div>
      <div class="template-actions">
        <button class="btn btn-outline compact" data-action="export" data-name="${escHtml(name)}">Export</button>
        <button class="btn btn-danger compact" data-action="delete" data-name="${escHtml(name)}">Delete</button>
      </div>
    `;

    card.querySelector('[data-action="export"]').addEventListener('click', () => optionsExportTemplate(name, tpl));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => optionsDeleteTemplate(name));
    grid.appendChild(card);
  });
}

async function optionsDeleteTemplate(name) {
  if (!confirm(`Delete template "${name}"?`)) return;
  const result = await chrome.storage.local.get(['scrapeTemplates']);
  const templates = result.scrapeTemplates || {};
  delete templates[name];
  await chrome.storage.local.set({ scrapeTemplates: templates });
  optionsLoadTemplates();
}

function optionsExportTemplate(name, tpl) {
  downloadJsonFile(`uscraper-template-${name.replace(/\s+/g, '-')}.json`, tpl, 2);
}

async function optionsLoadSettings() {
  const { scraperSettings } = await chrome.storage.local.get(['scraperSettings']);
  const s = { ...DEFAULT_SETTINGS, ...(scraperSettings || {}) };

  document.getElementById('setting-autoscroll').checked = s.autoscroll;
  document.getElementById('setting-wait-idle').checked = s.waitIdle;
  document.getElementById('setting-clean-data').checked = s.cleanData;
  document.getElementById('setting-json-pretty').checked = s.jsonPretty;
  document.getElementById('setting-include-meta').checked = s.includeMeta;
  document.getElementById('setting-notifications').checked = s.notifications;
}

async function optionsSaveSettings() {
  const s = {
    autoscroll: document.getElementById('setting-autoscroll').checked,
    waitIdle: document.getElementById('setting-wait-idle').checked,
    cleanData: document.getElementById('setting-clean-data').checked,
    jsonPretty: document.getElementById('setting-json-pretty').checked,
    includeMeta: document.getElementById('setting-include-meta').checked,
    notifications: document.getElementById('setting-notifications').checked
  };
  await chrome.storage.local.set({ scraperSettings: s });
  const btn = document.getElementById('btn-save-settings');
  btn.textContent = '✓ Saved!';
  setTimeout(() => { btn.textContent = 'Save Settings'; }, 1500);
}

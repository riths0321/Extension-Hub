// preview.js — U-Scraper Preview v2.0

let rawData = null;
let flatRows = [];
let columnOrder = [];
let columnEnabled = {};
let columnRenames = {};
let filteredRows = [];

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadData();

  document.getElementById('close-btn').addEventListener('click', () => window.close());
  document.getElementById('export-json-btn').addEventListener('click', () => exportData('json'));
  document.getElementById('export-csv-btn').addEventListener('click', () => exportData('csv'));
  document.getElementById('export-txt-btn').addEventListener('click', () => exportData('txt'));
  document.getElementById('export-html-btn').addEventListener('click', () => exportData('html'));
  document.getElementById('download-media-btn').addEventListener('click', downloadAllMedia);
  document.getElementById('copy-json-btn').addEventListener('click', copyJSON);
  document.getElementById('table-search').addEventListener('input', filterTable);
});

// ── Load Data ─────────────────────────────────────────────────────────────────
async function loadData(options = {}) {
  const { previewData, latestScrapeData } = await chrome.storage.local.get(['previewData', 'latestScrapeData']);
  const useLatest = options.preferLatest;
  const sourceData = useLatest ? (latestScrapeData || previewData) : previewData;
  if (!sourceData) { showNoData(); return; }

  rawData = Array.isArray(sourceData) ? sourceData : [sourceData];
  flatRows = buildFlatRows(rawData);
  columnOrder = [];
  columnEnabled = {};
  columnRenames = {};
  filteredRows = [];

  if (flatRows.length > 0) {
    columnOrder = Object.keys(flatRows[0]);
    columnOrder.forEach(col => { columnEnabled[col] = true; columnRenames[col] = col; });
  }

  filteredRows = [...flatRows];
  if (useLatest && latestScrapeData) {
    await chrome.storage.local.set({ previewData: latestScrapeData });
  }
  renderAll();
}

function showNoData() {
  document.getElementById('overview-content').innerHTML = '<div class="no-data-msg">No data loaded. Go back and run a scrape first.</div>';
}

// ── Build flat rows from scraped data ─────────────────────────────────────────
function buildFlatRows(pages) {
  const rows = [];
  pages.forEach(page => {
    // Custom fields mode
    if (page.customFields && Object.keys(page.customFields).length > 0) {
      const fields = page.customFields;
      const maxLen = Math.max(...Object.values(fields).map(v => Array.isArray(v) ? v.length : 1), 0);
      for (let i = 0; i < maxLen; i++) {
        const row = { _source: page.url, _title: page.title };
        for (const [k, v] of Object.entries(fields)) {
          row[k] = Array.isArray(v) ? (v[i] ?? '') : v;
        }
        rows.push(row);
      }
      return;
    }

    // Full page mode — paragraphs
    (page.paragraphs || []).forEach(p => {
      rows.push({ text: p, source: page.url, title: page.title, domain: page.domain });
    });
  });
  return rows;
}

// ── Render All ────────────────────────────────────────────────────────────────
function renderAll() {
  renderOverview();
  renderDataTable();
  renderMedia();
  renderRaw();
  renderSidebar();
}

// ── Overview ──────────────────────────────────────────────────────────────────
function renderOverview() {
  const page = rawData[0] || {};
  const container = document.getElementById('overview-content');
  container.innerHTML = '';

  // Meta card
  const metaCard = makeCard('Page Information', [
    ['Title', page.title || '—'],
    ['URL', page.url || '—'],
    ['Domain', page.domain || '—'],
    ['Description', page.description || '—'],
    ['Author', page.author || '—'],
    ['Scraped at', page.scrapedAt ? new Date(page.scrapedAt).toLocaleString() : '—'],
    ['Scrape duration', page.scrapeDuration ? `${page.scrapeDuration}ms` : '—'],
    ['Pages scraped', rawData.length]
  ]);

  // Keywords
  if (page.keywords?.length) {
    const kw = document.createElement('div');
    kw.className = 'keyword-row';
    page.keywords.forEach(k => {
      const span = document.createElement('span');
      span.className = 'keyword-badge';
      span.textContent = k;
      kw.appendChild(span);
    });
    metaCard.appendChild(kw);
  }

  container.appendChild(metaCard);

  // Content stats
  const statsCard = makeCard('Content Summary', [
    ['Paragraphs', page.paragraphs?.length || 0],
    ['Headings', page.headings?.length || 0],
    ['Internal links', page.links?.internal?.length || 0],
    ['External links', page.links?.external?.length || 0],
    ['Images', page.images?.length || 0],
    ['Tables', page.tables?.length || 0],
    ['Forms', page.forms?.length || 0],
    ['Emails found', page.links?.emails?.length || 0],
    ['Custom fields', page.customFields ? Object.keys(page.customFields).length : 0]
  ]);
  container.appendChild(statsCard);

  // OpenGraph
  if (page.openGraph && Object.keys(page.openGraph).length > 0) {
    const ogCard = makeCard('Open Graph Tags',
      Object.entries(page.openGraph).map(([k, v]) => [k, v])
    );
    container.appendChild(ogCard);
  }

  // Headings
  if (page.headings?.length) {
    const hCard = document.createElement('div');
    hCard.className = 'data-card';
    hCard.innerHTML = '<h3>Headings</h3>';
    const ul = document.createElement('ul');
    ul.style.cssText = 'list-style:none;padding:0;margin:0;';
    page.headings.slice(0, 20).forEach(h => {
      const li = document.createElement('li');
      const indent = (parseInt(h.tag[1]) - 1) * 12;
      li.style.cssText = `padding: 4px 0 4px ${indent}px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: var(--text-main);`;
      li.textContent = `${h.tag.toUpperCase()}: ${h.text}`;
      ul.appendChild(li);
    });
    hCard.appendChild(ul);
    container.appendChild(hCard);
  }
}

function makeCard(title, rows) {
  const card = document.createElement('div');
  card.className = 'data-card';
  card.innerHTML = `<h3>${escHtml(title)}</h3>`;
  rows.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'data-item';
    item.innerHTML = `<div class="data-label">${escHtml(String(label))}</div>
      <div class="data-value">${escHtml(String(value))}</div>`;
    card.appendChild(item);
  });
  return card;
}

// ── Data Table ────────────────────────────────────────────────────────────────
function renderDataTable() {
  updateTableDisplay();
  document.getElementById('table-row-count').textContent = `${filteredRows.length} rows`;
}

function updateTableDisplay() {
  const wrap = document.getElementById('data-table-wrap');
  if (!filteredRows.length) {
    wrap.innerHTML = '<div class="no-data-msg">No rows to display.</div>';
    return;
  }

  const activeCols = columnOrder.filter(c => columnEnabled[c]);
  if (!activeCols.length) { wrap.innerHTML = '<div class="no-data-msg">All columns hidden.</div>'; return; }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  activeCols.forEach(col => {
    const th = document.createElement('th');
    th.style.cssText = 'padding:10px 14px;background:#f1f8e9;text-align:left;font-size:12px;font-weight:600;white-space:nowrap;border-bottom:2px solid #e0e0e0;cursor:pointer;';
    th.textContent = columnRenames[col] || col;
    th.addEventListener('click', () => sortByColumn(col));
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  filteredRows.slice(0, 1000).forEach((row, i) => {
    const tr = document.createElement('tr');
    if (i % 2 === 1) tr.style.background = '#fafafa';
    activeCols.forEach(col => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:8px 14px;border-bottom:1px solid #eee;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const val = row[col];
      td.title = String(val ?? '');
      td.textContent = String(val ?? '');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.innerHTML = '';
  const scrollWrap = document.createElement('div');
  scrollWrap.style.cssText = 'overflow-x:auto;';
  scrollWrap.appendChild(table);
  wrap.appendChild(scrollWrap);
  document.getElementById('table-row-count').textContent = `${filteredRows.length} rows`;
}

let sortCol = null, sortDir = 1;
function sortByColumn(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  filteredRows.sort((a, b) => {
    const va = String(a[col] ?? ''), vb = String(b[col] ?? '');
    return va.localeCompare(vb) * sortDir;
  });
  updateTableDisplay();
}

function filterTable() {
  const q = document.getElementById('table-search').value.toLowerCase();
  if (!q) { filteredRows = [...flatRows]; }
  else {
    filteredRows = flatRows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }
  updateTableDisplay();
}

// ── Media ─────────────────────────────────────────────────────────────────────
function renderMedia() {
  const page = rawData[0] || {};
  const container = document.getElementById('media-data');
  container.innerHTML = '';

  const images = page.images || [];
  const videos = page.videos || [];

  if (!images.length && !videos.length) {
    container.innerHTML = '<div class="no-data-msg">No media found on this page.</div>';
    return;
  }

  if (images.length > 0) {
    const actions = document.createElement('div');
    actions.className = 'media-actions';
    const bulkBtn = document.createElement('button');
    bulkBtn.className = 'btn btn-secondary compact';
    bulkBtn.textContent = 'Download All Images';
    bulkBtn.addEventListener('click', () => downloadImages(images));
    actions.appendChild(bulkBtn);
    container.appendChild(actions);

    const h = document.createElement('h3');
    h.style.cssText = 'font-size:14px;color:var(--primary);margin-bottom:12px;';
    h.textContent = `Images (${images.length})`;
    container.appendChild(h);

    const gallery = document.createElement('div');
    gallery.className = 'image-gallery';
    images.forEach(img => {
      const item = document.createElement('div');
      item.className = 'image-item';
      const i = document.createElement('img');
      i.src = img.src;
      i.alt = img.alt || '';
      i.loading = 'lazy';
      i.onerror = function () { this.style.display = 'none'; };
      const alt = document.createElement('div');
      alt.className = 'image-alt';
      alt.textContent = img.alt || img.src.split('/').pop() || '';
      const actions = document.createElement('div');
      actions.className = 'image-actions';
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn btn-outline compact';
      downloadBtn.textContent = 'Download';
      downloadBtn.addEventListener('click', () => downloadImages([img]));
      actions.appendChild(downloadBtn);
      item.appendChild(i);
      item.appendChild(alt);
      item.appendChild(actions);
      gallery.appendChild(item);
    });
    container.appendChild(gallery);
  }

  if (videos.length > 0) {
    const h = document.createElement('h3');
    h.style.cssText = 'font-size:14px;color:var(--primary);margin:20px 0 12px;';
    h.textContent = `Videos (${videos.length})`;
    container.appendChild(h);

    videos.forEach(v => {
      const div = document.createElement('div');
      div.style.cssText = 'padding:8px 12px;background:#f5f5f5;border-radius:6px;margin-bottom:6px;font-size:12px;font-family:monospace;';
      div.textContent = v.src || 'No URL';
      container.appendChild(div);
    });
  }
}

// ── Raw JSON ──────────────────────────────────────────────────────────────────
function renderRaw() {
  const pre = document.getElementById('raw-data');
  pre.textContent = JSON.stringify(rawData, null, 2);
}

function copyJSON() {
  navigator.clipboard.writeText(JSON.stringify(rawData, null, 2))
    .then(() => {
      const btn = document.getElementById('copy-json-btn');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = 'Copy JSON'; }, 1500);
    });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const page = rawData[0] || {};

  // Stats
  const statsGrid = document.getElementById('summary-stats');
  statsGrid.innerHTML = '';
  const stats = [
    ['Pages', rawData.length],
    ['Rows', flatRows.length],
    ['Images', page.images?.length || 0],
    ['Links', (page.links?.internal?.length || 0) + (page.links?.external?.length || 0)]
  ];
  stats.forEach(([label, val]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<div class="stat-value">${val}</div><div class="stat-label">${label}</div>`;
    statsGrid.appendChild(card);
  });

  // Links
  const linksList = document.getElementById('links-list');
  linksList.innerHTML = '';
  const allLinks = [...(page.links?.internal || []), ...(page.links?.external || [])].slice(0, 8);
  if (allLinks.length === 0) {
    linksList.innerHTML = '<li style="color:var(--text-light);font-size:12px;padding:8px;">No links found</li>';
  } else {
    allLinks.forEach(href => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = href.replace(/^https?:\/\//, '').substring(0, 40);
      li.appendChild(a);
      linksList.appendChild(li);
    });
  }

  // Contacts
  const contactsDiv = document.getElementById('contacts-list');
  contactsDiv.innerHTML = '';
  const emails = page.links?.emails || [];
  const phones = page.links?.phones || [];

  if (!emails.length && !phones.length) {
    contactsDiv.innerHTML = '<p style="font-size:12px;color:var(--text-light);padding:8px 0;">No contacts found</p>';
  } else {
    [...emails, ...phones].slice(0, 6).forEach(c => {
      const div = document.createElement('div');
      div.style.cssText = 'font-size:12px;padding:4px 0;color:var(--text-secondary);border-bottom:1px solid #f0f0f0;';
      div.textContent = c;
      contactsDiv.appendChild(div);
    });
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
function exportData(format) {
  const rows = getExportRows();
  if (!rows.length) return;

  switch (format) {
    case 'json': {
      downloadJsonFile('scraped-data.json', rawData, 2);
      break;
    }
    case 'csv': download('scraped-data.csv', `\uFEFF${rowsToCSV(rows)}`, 'text/csv;charset=utf-8'); break;
    case 'txt': download('scraped-data.txt', rowsToText(rows), 'text/plain;charset=utf-8'); break;
    case 'html': download('scraped-data.html', rowsToHTML(rows), 'text/html;charset=utf-8'); break;
  }
}

function getExportRows() {
  const activeCols = columnOrder.filter(c => columnEnabled[c]);
  return filteredRows.map(row => {
    const r = {};
    activeCols.forEach(col => {
      const name = columnRenames[col] || col;
      r[name] = row[col];
    });
    return r;
  });
}

function rowsToCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

function rowsToText(rows) {
  return rows.map((row, index) => {
    const lines = [`Record ${index + 1}`];
    Object.entries(row || {}).forEach(([key, value]) => {
      lines.push(`${key}: ${String(value ?? '')}`);
    });
    return lines.join('\n');
  }).join('\n\n--------------------\n\n');
}

function rowsToHTML(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const bodyRows = rows.map(row =>
    `<tr>${headers.map(header => `<td>${escHtml(String(row[header] ?? ''))}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>U-Scraper Data Export</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #172554; background: #f8fbff; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 16px; color: #51627f; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 10px 12px; border: 1px solid #dbe7ff; text-align: left; vertical-align: top; }
    th { background: #2563eb; color: #fff; }
    tr:nth-child(even) td { background: #f8fbff; }
  </style>
</head>
<body>
  <h1>Scraped Data</h1>
  <p>Exported from U-Scraper on ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map(header => `<th>${escHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: false }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

function downloadJsonFile(filename, data, indent = 2) {
  const json = safeJsonStringify(data, indent);
  download(filename, json, 'application/json;charset=utf-8');
}

async function downloadAllMedia() {
  const mediaItems = collectMediaItems(rawData);
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

async function downloadImages(images) {
  const mediaItems = (images || [])
    .map((img, index) => ({
      url: img?.src || '',
      filename: buildMediaFilename(img?.src || '', 'image', 0, index)
    }))
    .filter(item => item.url);

  for (const item of mediaItems) {
    await chrome.downloads.download({
      url: item.url,
      filename: item.filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }).catch(() => {});
  }
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

// ── Tabs ──────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-item, .tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item, .tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;').replace(/"/g,'&quot;'); }
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
  if (Array.isArray(value)) return value.map(item => normalizeForJson(item, seen));
  const result = {};
  Object.entries(value).forEach(([key, child]) => {
    result[key] = normalizeForJson(child, seen);
  });
  return result;
}

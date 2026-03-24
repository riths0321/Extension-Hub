/* ============================================================
   CSV ⇄ JSON Converter — Popup v3 (Production Ready)
   ============================================================ */
const $ = id => document.getElementById(id);

// Safe element getter with error handling
const safeGet = (id) => {
  const el = $(id);
  if (!el) console.warn(`Element not found: ${id}`);
  return el;
};

const dropZone     = $('dropZone'),  fileInput   = $('fileInput');
const sec1         = $('sec1'),      sec2        = $('sec2'),     sec3    = $('sec3');
const fType        = $('fType'),     fName       = $('fName'),    fSize   = $('fSize');
const clearBtn     = $('clearBtn');
const modePills    = document.querySelectorAll('.mode-pill');
const advToggle    = $('advToggle'), advPanel    = $('advPanel'), advCaret= $('advCaret');
const delimSelect  = $('delimiter'), customDelim = $('customDelim');
const jsonIndent   = $('jsonIndent'), hasHeader  = $('hasHeader');
const inferTypes   = $('inferTypes'), dedupRows  = $('dedupRows');
const filterField  = $('filterField'), filterOp  = $('filterOp'), filterValue = $('filterValue');
const sortField    = $('sortField'),   sortDir    = $('sortDir');
const convertBtn   = $('convertBtn');
const progressWrap = $('progressWrap'), progressFill = $('progressFill'), progressPct = $('progressPct');
const resultBadge  = $('resultBadge'),  resultRows   = $('resultRows');
const output       = $('output'),       copyBtn      = $('copyBtn'),   downloadBtn = $('downloadBtn');
const backBtn      = $('backBtn');
const tplName      = $('tplName'),      saveTplBtn   = $('saveTplBtn'), tplList = $('tplList');
const s1=$('s1'),s2=$('s2'),s3=$('s3'),sn1=$('sn1'),sn2=$('sn2'),sn3=$('sn3');

let currentFile=null, activeMode='csv2json', convertedData='', activeWorker=null;

/* ── STEP INDICATOR ── */
function setStep(n) {
  [[s1,sn1],[s2,sn2],[s3,sn3]].forEach(([dot,num], i) => {
    dot.classList.remove('active','done');
    if (i+1 < n)       { dot.classList.add('done');   num.textContent = '✓'; }
    else if (i+1 === n){ dot.classList.add('active');  num.textContent = i+1; }
    else               {                               num.textContent = i+1; }
  });
}

/* ── DROP ZONE ── */
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') fileInput.click(); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('over');
  if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) selectFile(fileInput.files[0]); });
clearBtn.addEventListener('click', resetToUpload);

function selectFile(file) {
  currentFile = file;
  const ext = file.name.split('.').pop().toLowerCase();
  fType.textContent = ext.toUpperCase();
  fName.textContent = file.name;
  fSize.textContent = fmtBytes(file.size);
  setMode(ext === 'json' ? 'json2csv' : 'csv2json');
  sec1.classList.add('hidden'); sec3.classList.add('hidden');
  sec2.classList.remove('hidden');
  setStep(2); renderTpls();
}

function resetToUpload() {
  currentFile = null; convertedData = ''; fileInput.value = '';
  sec2.classList.add('hidden'); sec3.classList.add('hidden');
  progressWrap.classList.add('hidden');
  advPanel.classList.add('hidden'); advCaret.classList.remove('open');
  advToggle.setAttribute('aria-expanded','false');
  sec1.classList.remove('hidden'); setStep(1);
}

/* ── MODE PILLS ── */
modePills.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
function setMode(m) {
  activeMode = m;
  modePills.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
}

/* ── ADVANCED PANEL ── */
advToggle.addEventListener('click', () => {
  const open = !advPanel.classList.contains('hidden');
  advPanel.classList.toggle('hidden', open);
  advCaret.classList.toggle('open', !open);
  advToggle.setAttribute('aria-expanded', String(!open));
});
delimSelect.addEventListener('change', () => {
  customDelim.classList.toggle('hidden', delimSelect.value !== 'custom');
});

/* ── CONVERT ── */
convertBtn.addEventListener('click', () => {
  if (!currentFile) return;
  const reader = new FileReader();
  reader.onload = () => runConvert(reader.result);
  reader.readAsText(currentFile);
});

function runConvert(text) {
  if (activeWorker) activeWorker.terminate();
  activeWorker = new Worker('worker.js');
  setProgress(0, true); sec3.classList.add('hidden');
  const opts = buildOptions();
  activeWorker.postMessage({ mode: activeMode, text, options: opts });
  activeWorker.onmessage = e => {
    const { type, data, rowCount } = e.data;
    if (type === 'progress') { setProgress(data); }
    else if (type === 'done') {
      setProgress(100);
      setTimeout(() => progressWrap.classList.add('hidden'), 400);
      convertedData = data; showResult(data, rowCount);
    } else if (type === 'error') {
      progressWrap.classList.add('hidden'); convertedData = data; showResult(data, null);
    }
  };
}

function buildOptions() {
  const delim = delimSelect.value === 'custom' ? (customDelim.value || ',') : delimSelect.value;
  const opts = { delimiter: delim, hasHeader: hasHeader.checked, inferTypes: inferTypes.checked, dedup: dedupRows.checked, jsonIndent: parseInt(jsonIndent.value) };
  if (filterField.value.trim()) opts.filter = { field: filterField.value.trim(), op: filterOp.value, value: filterValue.value.trim() };
  if (sortField.value.trim())   opts.sort   = { field: sortField.value.trim(), dir: sortDir.value };
  return opts;
}

function setProgress(pct, show) {
  if (show) progressWrap.classList.remove('hidden');
  progressFill.style.width = pct + '%';
  progressPct.textContent  = pct + '%';
}

function showResult(data, rows) {
  const extMap = { csv2json:'JSON', json2csv:'CSV', csv2tsv:'TSV', json2tsv:'TSV' };
  resultBadge.textContent = extMap[activeMode] || 'OUT';
  resultRows.textContent  = rows != null ? rows + ' rows' : '';
  output.textContent = data; sec3.classList.remove('hidden'); setStep(3);
}

/* ── DOWNLOAD & COPY ── */
downloadBtn.addEventListener('click', () => {
  if (!convertedData) return;
  try {
    const ext  = { csv2json:'json', json2csv:'csv', csv2tsv:'tsv', json2tsv:'tsv' }[activeMode] || 'txt';
    const base = currentFile ? currentFile.name.replace(/\.[^.]+$/,'') : 'converted';
    const url  = URL.createObjectURL(new Blob([convertedData], { type:'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${base}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
});

copyBtn.addEventListener('click', async () => {
  if (!convertedData) return;
  try {
    await navigator.clipboard.writeText(convertedData);
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'Copied ✓';
    copyBtn.style.color = 'var(--success)';
    setTimeout(() => {
      copyBtn.textContent = orig;
      copyBtn.style.color = '';
    }, 1600);
  } catch (error) {
    console.error('Copy failed:', error);
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = convertedData;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = orig; }, 1600);
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
    }
  }
});

backBtn.addEventListener('click', () => {
  sec3.classList.add('hidden'); convertedData = '';
  sec2.classList.remove('hidden'); setStep(2);
});

/* ── TEMPLATES ── */
saveTplBtn.addEventListener('click', () => {
  const name = tplName.value.trim(); if (!name) { tplName.focus(); return; }
  const tpl = { name, savedAt: Date.now(), mode: activeMode, options: buildOptions() };
  const list = loadTpls(); const idx = list.findIndex(t => t.name === name);
  if (idx >= 0) list[idx] = tpl; else list.push(tpl);
  saveTpls(list); tplName.value = ''; renderTpls();
});

function renderTpls() {
  const list = loadTpls(); tplList.innerHTML = '';
  if (!list.length) return;
  list.forEach((t, i) => {
    const el = document.createElement('div'); el.className = 'tpl-item';
    el.innerHTML = `<span class="tpl-item-name">${escHtml(t.name)}</span><span class="tpl-item-meta">${t.mode}</span><div class="tpl-item-btns"><button class="tpl-action">Load</button><button class="tpl-action del">✕</button></div>`;
    el.querySelectorAll('.tpl-action')[0].addEventListener('click', () => applyTpl(t));
    el.querySelectorAll('.tpl-action')[1].addEventListener('click', () => {
      const arr = loadTpls(); arr.splice(i, 1); saveTpls(arr); renderTpls();
    });
    tplList.appendChild(el);
  });
}

function applyTpl(t) {
  setMode(t.mode);
  if (t.options) {
    const o = t.options;
    if (o.delimiter) { if ([',',';','|','\t'].includes(o.delimiter)) delimSelect.value = o.delimiter; else { delimSelect.value = 'custom'; customDelim.value = o.delimiter; customDelim.classList.remove('hidden'); } }
    if (o.jsonIndent !== undefined) jsonIndent.value = String(o.jsonIndent);
    hasHeader.checked  = o.hasHeader  !== false;
    inferTypes.checked = o.inferTypes !== false;
    dedupRows.checked  = !!o.dedup;
    if (o.filter) { filterField.value = o.filter.field||''; filterOp.value = o.filter.op||'contains'; filterValue.value = o.filter.value||''; }
    if (o.sort)   { sortField.value = o.sort.field||''; sortDir.value = o.sort.dir||'asc'; }
  }
  advPanel.classList.remove('hidden'); advCaret.classList.add('open');
  advToggle.setAttribute('aria-expanded', 'true');
}

function loadTpls() { try { return JSON.parse(localStorage.getItem('csvjson_tpls')||'[]'); } catch { return []; } }
function saveTpls(a) { localStorage.setItem('csvjson_tpls', JSON.stringify(a)); }
function fmtBytes(n) { if (n<1024) return n+' B'; if (n<1048576) return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
function escHtml(s)  { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

setStep(1);

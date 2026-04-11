// ============================================================
// Local PDF Toolkit — app.js  v2.0
// 18 tools | 100% client-side | CSP-compliant (no inline handlers)
// Libraries: pdf-lib (bundled), pdfjs-dist (bundled), JSZip (bundled)
// ============================================================

'use strict';

// ── State ────────────────────────────────────────────────────
const state = {
  merge: { files: [] },
  split: { file: null },
  rotate: { file: null },
  organize: { file: null, bytes: null, order: [] },
  crop: { file: null },
  insertblank: { file: null },
  img2pdf: { files: [] },
  pdf2img: { file: null },
  pdf2text: { file: null, text: '' },
  grayscale: { file: null },
  compress: { file: null },
  pn: { file: null },
  wm: { file: null },
  metadata: { file: null },
  protect: { file: null },
  unlock: { file: null },
  flatten: { file: null },
  info: { file: null },
};

// ── Navigation ───────────────────────────────────────────────
function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  const navItem = document.querySelector(`[data-panel="${name}"]`);
  if (navItem) navItem.classList.add('active');
}

// Sidebar nav — event delegation
document.getElementById('sidebar').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-panel]');
  if (item) switchPanel(item.dataset.panel);
});

// Home cards — event delegation
document.getElementById('panel-home').addEventListener('click', e => {
  const card = e.target.closest('.home-card[data-goto]');
  if (card) switchPanel(card.dataset.goto);
});

// ── Radio buttons — event delegation ─────────────────────────
document.body.addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn[data-group]');
  if (!btn) return;
  const group = btn.dataset.group;
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Conditional UI toggles
  if (group === 'split-mode') {
    document.getElementById('split-range-group').style.display =
      btn.dataset.value === 'range' ? 'flex' : 'none';
  }
  if (group === 'rotate-pages') {
    document.getElementById('rotate-pages-group').style.display =
      btn.dataset.value === 'specific' ? 'flex' : 'none';
  }
  if (group === 'crop-pages') {
    document.getElementById('crop-pages-group').style.display =
      btn.dataset.value === 'specific' ? 'flex' : 'none';
  }
  if (group === 'compress-mode') {
    document.getElementById('compress-heavy-opts').style.display =
      btn.dataset.value === 'heavy' ? 'block' : 'none';
  }
  if (group === 'gray-fmt') {
    document.getElementById('gray-quality-group').style.display =
      btn.dataset.value === 'jpeg' ? 'flex' : 'none';
  }
});

function getRadio(group) {
  return document.querySelector(`[data-group="${group}"].active`)?.dataset.value;
}

// ── Range sliders ─────────────────────────────────────────────
function bindSlider(id, labelId, suffix) {
  const el = document.getElementById(id);
  const lbl = document.getElementById(labelId);
  if (!el || !lbl) return;
  const update = () => {
    lbl.textContent = el.value + (suffix || '');
    const min = parseFloat(el.min) || 0;
    const max = parseFloat(el.max) || 100;
    const pct = ((el.value - min) / (max - min)) * 100;
    el.style.backgroundSize = pct + '% 100%';
  };
  el.addEventListener('input', update);
  
  // Find fine-tuning buttons if they exist
  const wrap = el.closest('.slider-wrap');
  if (wrap) {
    const btnMinus = wrap.querySelector('.slider-btn.minus');
    const btnPlus = wrap.querySelector('.slider-btn.plus');
    
    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        const step = parseFloat(el.step) || 1;
        el.value = Math.max(parseFloat(el.min || 0), parseFloat(el.value) - step);
        update();
        el.dispatchEvent(new Event('change'));
      });
    }
    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        const step = parseFloat(el.step) || 1;
        el.value = Math.min(parseFloat(el.max || 100), parseFloat(el.value) + step);
        update();
        el.dispatchEvent(new Event('change'));
      });
    }
  }

  update();
}
bindSlider('pdf2img-scale', 'pdf2img-scale-val', 'x');
bindSlider('wm-opacity', 'wm-opacity-val', '%');
bindSlider('gray-quality', 'gray-quality-val', '%');
bindSlider('gray-scale', 'gray-scale-val', 'x');
bindSlider('compress-quality', 'compress-quality-val', '%');
bindSlider('compress-dpi', 'compress-dpi-val', '');
bindSlider('resize-pct', 'resize-pct-val', '%');
bindSlider('resize-quality', 'resize-quality-val', '%');

// ── File helpers ──────────────────────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderFileList(containerId, files, onRemoveFn) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';
  files.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    const isPdf = f.name.toLowerCase().endsWith('.pdf');
    item.innerHTML =
      `<span class="file-icon">${isPdf ? '▪' : '▫'}</span>` +
      `<span class="file-name" title="${f.name}">${f.name}</span>` +
      `<span class="file-size">${fmtSize(f.size)}</span>` +
      `<button class="file-remove" data-index="${i}" title="Remove">✕</button>`;
    list.appendChild(item);
  });
  list.onclick = e => {
    const btn = e.target.closest('.file-remove');
    if (btn && onRemoveFn) onRemoveFn(parseInt(btn.dataset.index));
  };
}

function showResult(id, ok, msg, sub) {
  const box = document.getElementById(id);
  if (!box) return;
  box.className = 'result-box active' + (ok ? '' : ' error');
  box.innerHTML =
    `<span class="result-icon">${ok ? '✓' : '✗'}</span>` +
    `<div class="result-text">${msg}<small>${sub || ''}</small></div>`;
}

function clearResult(id) {
  const box = document.getElementById(id);
  if (box) { box.className = 'result-box'; box.innerHTML = ''; }
}

function showProgress(prefix, pct, labelText) {
  const wrap = document.getElementById(prefix + '-progress');
  const bar = document.getElementById(prefix + '-bar');
  const lbl = document.getElementById(prefix + '-label') ||
    document.getElementById(prefix + '-progress-label');
  if (wrap) wrap.classList.toggle('active', pct < 100);
  if (bar) bar.style.width = pct + '%';
  if (lbl && labelText) lbl.textContent = labelText;
}

// ── File reader ───────────────────────────────────────────────
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(new Uint8Array(e.target.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Download helpers ──────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function downloadBytes(bytes, filename) {
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

// ── Drop zone setup ───────────────────────────────────────────
function setupDrop(dropId, inputId, handler, multi) {
  const drop = document.getElementById(dropId);
  const input = document.getElementById(inputId);
  if (!drop || !input) return;

  input.addEventListener('change', e => {
    handler(multi ? [...e.target.files] : e.target.files[0]);
    e.target.value = '';
  });

  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    handler(multi ? files : files[0]);
  });
}

// ── PDF.js helper ─────────────────────────────────────────────
async function getPdfJsDoc(bytes) {
  if (typeof pdfjsLib === 'undefined') throw new Error('pdf.js not loaded');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

// ── Page range parser ─────────────────────────────────────────
function parsePageRange(str, total) {
  const indices = new Set();
  str.split(',').forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) indices.add(i - 1);
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= total) indices.add(n - 1);
    }
  });
  return [...indices].sort((a, b) => a - b);
}

// ============================================================
// 1. MERGE PDF
// ============================================================
setupDrop('merge-drop', 'merge-input', files => {
  const arr = Array.isArray(files) ? files : [files];
  state.merge.files.push(...arr.filter(f => f.name.toLowerCase().endsWith('.pdf')));
  renderFileList('merge-list', state.merge.files, i => {
    state.merge.files.splice(i, 1);
    renderFileList('merge-list', state.merge.files, arguments.callee);
    document.getElementById('merge-btn').disabled = state.merge.files.length < 2;
  });
  document.getElementById('merge-btn').disabled = state.merge.files.length < 2;
  clearResult('merge-result');
}, true);

// Re-setup with named callback for remove
setupDrop('merge-drop', 'merge-input', files => { }, false); // placeholder, handled above

function removeMergeFile(i) {
  state.merge.files.splice(i, 1);
  renderFileList('merge-list', state.merge.files, removeMergeFile);
  document.getElementById('merge-btn').disabled = state.merge.files.length < 2;
}

// Override setupDrop for merge to use named remove function
(function () {
  const drop = document.getElementById('merge-drop');
  const input = document.getElementById('merge-input');
  if (!drop || !input) return;

  const handleMerge = files => {
    const arr = Array.isArray(files) ? files : [files];
    state.merge.files.push(...arr.filter(f => f.name.toLowerCase().endsWith('.pdf')));
    renderFileList('merge-list', state.merge.files, removeMergeFile);
    document.getElementById('merge-btn').disabled = state.merge.files.length < 2;
    clearResult('merge-result');
  };

  // Remove old listeners by cloning
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  newInput.addEventListener('change', e => { handleMerge([...e.target.files]); e.target.value = ''; });

  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    handleMerge([...e.dataTransfer.files]);
  });
})();

document.getElementById('merge-btn').addEventListener('click', mergePDFs);
document.getElementById('merge-clear-btn').addEventListener('click', () => {
  state.merge.files = [];
  document.getElementById('merge-list').innerHTML = '';
  document.getElementById('merge-btn').disabled = true;
  clearResult('merge-result');
});

async function mergePDFs() {
  try {
    clearResult('merge-result');
    showProgress('merge', 5, 'Merging files...');
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();

    for (let i = 0; i < state.merge.files.length; i++) {
      const pct = Math.round(((i + 1) / state.merge.files.length) * 90);
      showProgress('merge', pct, `Merging file ${i + 1} of ${state.merge.files.length}...`);
      const bytes = await readFile(state.merge.files[i]);
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }

    showProgress('merge', 95, 'Saving...');
    const out = await merged.save();
    showProgress('merge', 100);
    downloadBytes(out, 'merged.pdf');
    showResult('merge-result', true,
      `Merged ${state.merge.files.length} files successfully`,
      `${fmtSize(out.byteLength)} · merged.pdf`);
  } catch (e) {
    showResult('merge-result', false, 'Merge failed: ' + e.message);
  }
}

// ============================================================
// 2. SPLIT PDF
// ============================================================
(function () {
  const handleSplit = file => {
    if (!file) return;
    state.split.file = file;
    renderFileList('split-list', [file], () => {
      state.split.file = null;
      document.getElementById('split-list').innerHTML = '';
      document.getElementById('split-btn').disabled = true;
    });
    document.getElementById('split-btn').disabled = false;
    clearResult('split-result');
  };
  setupDrop('split-drop', 'split-input', handleSplit, false);
})();

document.getElementById('split-btn').addEventListener('click', splitPDF);

async function splitPDF() {
  if (!state.split.file) return;
  try {
    clearResult('split-result');
    showProgress('split', 10, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.split.file);
    const src = await PDFDocument.load(bytes);
    const total = src.getPageCount();
    const mode = getRadio('split-mode');

    let pageIndices = [];
    if (mode === 'all') {
      pageIndices = src.getPageIndices();
    } else {
      const rangeStr = document.getElementById('split-range').value.trim();
      pageIndices = parsePageRange(rangeStr, total);
    }

    if (pageIndices.length === 0) {
      showResult('split-result', false, 'Invalid page range specified.');
      return;
    }

    if (mode === 'all') {
      const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
      for (let i = 0; i < pageIndices.length; i++) {
        showProgress('split', Math.round(((i + 1) / pageIndices.length) * 90),
          `Splitting page ${i + 1} of ${pageIndices.length}...`);
        const doc = await PDFDocument.create();
        const [page] = await doc.copyPages(src, [i]);
        doc.addPage(page);
        const out = await doc.save();
        if (zip) zip.file(`page_${i + 1}.pdf`, out);
        else downloadBytes(out, `page_${i + 1}.pdf`);
      }
      if (zip) {
        showProgress('split', 95, 'Creating ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'split_pages.zip');
      }
      showResult('split-result', true,
        `Split into ${pageIndices.length} individual PDFs`,
        'Downloaded as split_pages.zip');
    } else {
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, pageIndices);
      pages.forEach(p => doc.addPage(p));
      const out = await doc.save();
      downloadBytes(out, 'split_range.pdf');
      showResult('split-result', true,
        `Extracted ${pageIndices.length} pages`,
        `${fmtSize(out.byteLength)} · split_range.pdf`);
    }
    showProgress('split', 100);
  } catch (e) {
    showResult('split-result', false, 'Split failed: ' + e.message);
  }
}

// ============================================================
// 3. ROTATE PDF
// ============================================================
(function () {
  const handle = file => {
    if (!file) return;
    state.rotate.file = file;
    renderFileList('rotate-list', [file], () => {
      state.rotate.file = null;
      document.getElementById('rotate-list').innerHTML = '';
      document.getElementById('rotate-btn').disabled = true;
    });
    document.getElementById('rotate-btn').disabled = false;
    clearResult('rotate-result');
  };
  setupDrop('rotate-drop', 'rotate-input', handle, false);
})();

document.getElementById('rotate-btn').addEventListener('click', rotatePDF);

async function rotatePDF() {
  if (!state.rotate.file) return;
  try {
    clearResult('rotate-result');
    showProgress('rotate', 10, 'Loading PDF...');
    const { PDFDocument, degrees } = PDFLib;
    const bytes = await readFile(state.rotate.file);
    const doc = await PDFDocument.load(bytes);
    const angle = parseInt(getRadio('rotate-angle'));
    const mode = getRadio('rotate-pages');
    const pages = doc.getPages();

    let targets = pages.map((_, i) => i);
    if (mode === 'specific') {
      targets = parsePageRange(document.getElementById('rotate-pages-input').value, pages.length);
    }

    targets.forEach((idx, i) => {
      showProgress('rotate', Math.round(((i + 1) / targets.length) * 85));
      const page = pages[idx];
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    });

    showProgress('rotate', 95, 'Saving...');
    const out = await doc.save();
    showProgress('rotate', 100);
    downloadBytes(out, 'rotated.pdf');
    showResult('rotate-result', true,
      `Rotated ${targets.length} page(s) by ${angle}°`,
      `${fmtSize(out.byteLength)} · rotated.pdf`);
  } catch (e) {
    showResult('rotate-result', false, 'Rotate failed: ' + e.message);
  }
}

// ============================================================
// 4. ORGANIZE PAGES
// ============================================================
(function () {
  const handle = async file => {
    if (!file) return;
    clearOrganize();
    state.organize.file = file;
    const bytes = await readFile(file);
    state.organize.bytes = bytes;
    try {
      const pdfDoc = await getPdfJsDoc(bytes);
      const total = pdfDoc.numPages;
      state.organize.order = Array.from({ length: total }, (_, i) => i + 1);
      await renderOrganizeGrid(pdfDoc);
    } catch {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(bytes);
      state.organize.order = Array.from({ length: doc.getPageCount() }, (_, i) => i + 1);
      renderOrganizeGridSimple();
    }
    document.getElementById('organize-controls').style.display = 'flex';
  };
  setupDrop('organize-drop', 'organize-input', handle, false);
})();

document.getElementById('organize-download-btn').addEventListener('click', organizeDownload);
document.getElementById('organize-clear-btn').addEventListener('click', clearOrganize);

async function renderOrganizeGrid(pdfDoc) {
  const grid = document.getElementById('organize-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 0.28 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    const thumb = document.createElement('div');
    thumb.className = 'page-thumb';
    thumb.dataset.page = i;
    thumb.draggable = true;
    const delBtn = document.createElement('button');
    delBtn.className = 'page-del'; delBtn.dataset.page = i; delBtn.textContent = '✕';
    const label = document.createElement('div');
    label.className = 'page-num'; label.textContent = `Page ${i}`;
    thumb.appendChild(delBtn); thumb.appendChild(canvas); thumb.appendChild(label);
    setupThumbDrag(thumb);
    grid.appendChild(thumb);
  }
  setupGridDelete();
}

function renderOrganizeGridSimple() {
  const grid = document.getElementById('organize-grid');
  grid.innerHTML = '';
  state.organize.order.forEach(p => {
    const thumb = document.createElement('div');
    thumb.className = 'page-thumb';
    thumb.dataset.page = p;
    thumb.draggable = true;
    const delBtn = document.createElement('button');
    delBtn.className = 'page-del'; delBtn.dataset.page = p; delBtn.textContent = '✕';
    const icon = document.createElement('div');
    icon.style.cssText = 'font-size:24px;padding:12px 0';
    icon.textContent = '📄';
    const label = document.createElement('div');
    label.className = 'page-num'; label.textContent = `Page ${p}`;
    thumb.appendChild(delBtn); thumb.appendChild(icon); thumb.appendChild(label);
    setupThumbDrag(thumb);
    grid.appendChild(thumb);
  });
  setupGridDelete();
}

function setupGridDelete() {
  document.getElementById('organize-grid').addEventListener('click', e => {
    const btn = e.target.closest('.page-del');
    if (!btn) return;
    const pageNum = parseInt(btn.dataset.page);
    state.organize.order = state.organize.order.filter(p => p !== pageNum);
    const thumb = btn.closest('.page-thumb');
    if (thumb) thumb.remove();
  });
}

function setupThumbDrag(thumb) {
  thumb.addEventListener('dragstart', e => {
    thumb.classList.add('dragging');
    e.dataTransfer.setData('text/plain', thumb.dataset.page);
  });
  thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
  thumb.addEventListener('dragover', e => e.preventDefault());
  thumb.addEventListener('drop', e => {
    e.preventDefault();
    const fromPage = parseInt(e.dataTransfer.getData('text/plain'));
    const toPage = parseInt(thumb.dataset.page);
    if (fromPage === toPage) return;
    const fi = state.organize.order.indexOf(fromPage);
    const ti = state.organize.order.indexOf(toPage);
    state.organize.order.splice(fi, 1);
    state.organize.order.splice(ti, 0, fromPage);
    const thumbs = [...document.querySelectorAll('.page-thumb')];
    const newOrder = [...state.organize.order];
    thumbs.forEach((t, i) => {
      t.dataset.page = newOrder[i];
      const lbl = t.querySelector('.page-num');
      if (lbl) lbl.textContent = `Page ${newOrder[i]}`;
      const del = t.querySelector('.page-del');
      if (del) del.dataset.page = newOrder[i];
    });
  });
}

function clearOrganize() {
  state.organize.file = null;
  state.organize.bytes = null;
  state.organize.order = [];
  document.getElementById('organize-grid').innerHTML = '';
  document.getElementById('organize-controls').style.display = 'none';
  clearResult('organize-result');
}

async function organizeDownload() {
  if (!state.organize.bytes || state.organize.order.length === 0) return;
  try {
    const { PDFDocument } = PDFLib;
    const src = await PDFDocument.load(state.organize.bytes);
    const out = await PDFDocument.create();
    const indices = state.organize.order.map(p => p - 1);
    const pages = await out.copyPages(src, indices);
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save();
    downloadBytes(bytes, 'organized.pdf');
    showResult('organize-result', true,
      `Saved ${state.organize.order.length} pages`,
      `${fmtSize(bytes.byteLength)} · organized.pdf`);
  } catch (e) {
    showResult('organize-result', false, 'Failed: ' + e.message);
  }
}

// ============================================================
// 5. CROP PAGES  [NEW]
// ============================================================
(function () {
  const handle = file => {
    if (!file) return;
    state.crop.file = file;
    renderFileList('crop-list', [file], () => {
      state.crop.file = null;
      document.getElementById('crop-list').innerHTML = '';
      document.getElementById('crop-btn').disabled = true;
    });
    document.getElementById('crop-btn').disabled = false;
    clearResult('crop-result');
  };
  setupDrop('crop-drop', 'crop-input', handle, false);
})();

document.getElementById('crop-btn').addEventListener('click', cropPDF);

async function cropPDF() {
  if (!state.crop.file) return;
  try {
    clearResult('crop-result');
    showProgress('crop', 10, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.crop.file);
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    const top = parseFloat(document.getElementById('crop-top').value) || 0;
    const bottom = parseFloat(document.getElementById('crop-bottom').value) || 0;
    const left = parseFloat(document.getElementById('crop-left').value) || 0;
    const right = parseFloat(document.getElementById('crop-right').value) || 0;
    const mode = getRadio('crop-pages');

    let targets = pages.map((_, i) => i);
    if (mode === 'specific') {
      targets = parsePageRange(document.getElementById('crop-pages-input').value, pages.length);
    }

    targets.forEach((idx, i) => {
      showProgress('crop', Math.round(((i + 1) / targets.length) * 85));
      const page = pages[idx];
      const { width, height } = page.getSize();
      const x = left;
      const y = bottom;
      const w = Math.max(1, width - left - right);
      const h = Math.max(1, height - top - bottom);
      page.setCropBox(x, y, w, h);
    });

    showProgress('crop', 95, 'Saving...');
    const out = await doc.save();
    showProgress('crop', 100);
    const name = state.crop.file.name.replace('.pdf', '') + '_cropped.pdf';
    downloadBytes(out, name);
    showResult('crop-result', true,
      `Cropped ${targets.length} page(s)`,
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('crop-result', false, 'Crop failed: ' + e.message);
  }
}

// ============================================================
// 6. INSERT BLANK PAGES  [NEW]
// ============================================================
(function () {
  const handle = file => {
    if (!file) return;
    state.insertblank.file = file;
    renderFileList('insertblank-list', [file], () => {
      state.insertblank.file = null;
      document.getElementById('insertblank-list').innerHTML = '';
      document.getElementById('insertblank-btn').disabled = true;
    });
    document.getElementById('insertblank-btn').disabled = false;
    clearResult('insertblank-result');
  };
  setupDrop('insertblank-drop', 'insertblank-input', handle, false);
})();

document.getElementById('insertblank-btn').addEventListener('click', insertBlankPages);

async function insertBlankPages() {
  if (!state.insertblank.file) return;
  try {
    clearResult('insertblank-result');
    showProgress('insertblank', 20, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.insertblank.file);
    const src = await PDFDocument.load(bytes);
    const out = await PDFDocument.create();
    const srcPages = await out.copyPages(src, src.getPageIndices());
    const total = srcPages.length;
    const pos = getRadio('blank-pos');
    const pageN = Math.max(1, Math.min(total, parseInt(document.getElementById('blank-page-num').value) || 1));
    const count = Math.max(1, parseInt(document.getElementById('blank-count').value) || 1);
    const sizeOpt = document.getElementById('blank-size').value;

    // Determine blank page dimensions
    let bW = 595.28, bH = 841.89; // A4 default
    if (sizeOpt === 'same' && srcPages.length > 0) {
      const s = srcPages[0].getSize();
      bW = s.width; bH = s.height;
    } else if (sizeOpt === 'letter') {
      bW = 612; bH = 792;
    }

    const makeBlank = () => {
      const p = out.addPage([bW, bH]);
      return p;
    };

    showProgress('insertblank', 50, 'Inserting blank pages...');

    if (pos === 'start') {
      for (let i = 0; i < count; i++) out.addPage([bW, bH]);
      srcPages.forEach(p => out.addPage(p));
    } else if (pos === 'end') {
      srcPages.forEach(p => out.addPage(p));
      for (let i = 0; i < count; i++) out.addPage([bW, bH]);
    } else if (pos === 'before') {
      srcPages.forEach((p, i) => {
        if (i === pageN - 1) for (let j = 0; j < count; j++) out.addPage([bW, bH]);
        out.addPage(p);
      });
    } else { // after
      srcPages.forEach((p, i) => {
        out.addPage(p);
        if (i === pageN - 1) for (let j = 0; j < count; j++) out.addPage([bW, bH]);
      });
    }

    showProgress('insertblank', 90, 'Saving...');
    const result = await out.save();
    showProgress('insertblank', 100);
    const name = state.insertblank.file.name.replace('.pdf', '') + '_with_blanks.pdf';
    downloadBytes(result, name);
    showResult('insertblank-result', true,
      `Inserted ${count} blank page(s) ${pos} page ${pageN}`,
      `${fmtSize(result.byteLength)} · ${name}`);
  } catch (e) {
    showResult('insertblank-result', false, 'Failed: ' + e.message);
  }
}

// ============================================================
// 7. IMAGE → PDF
// ============================================================
(function () {
  const handle = files => {
    const arr = Array.isArray(files) ? files : [files];
    state.img2pdf.files.push(...arr.filter(f => f.type.startsWith('image/')));
    renderFileList('img2pdf-list', state.img2pdf.files, removeImg2pdfFile);
    document.getElementById('img2pdf-btn').disabled = state.img2pdf.files.length === 0;
    clearResult('img2pdf-result');
  };
  const drop = document.getElementById('img2pdf-drop');
  const input = document.getElementById('img2pdf-input');
  input.addEventListener('change', e => { handle([...e.target.files]); e.target.value = ''; });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragover'); handle([...e.dataTransfer.files]); });
})();

function removeImg2pdfFile(i) {
  state.img2pdf.files.splice(i, 1);
  renderFileList('img2pdf-list', state.img2pdf.files, removeImg2pdfFile);
  document.getElementById('img2pdf-btn').disabled = state.img2pdf.files.length === 0;
}

document.getElementById('img2pdf-btn').addEventListener('click', imagesToPDF);
document.getElementById('img2pdf-clear-btn').addEventListener('click', () => {
  state.img2pdf.files = [];
  document.getElementById('img2pdf-list').innerHTML = '';
  document.getElementById('img2pdf-btn').disabled = true;
});

async function imagesToPDF() {
  if (state.img2pdf.files.length === 0) return;
  try {
    clearResult('img2pdf-result');
    showProgress('img2pdf', 5, 'Creating PDF...');
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const size = getRadio('img-size');
    const A4 = [595.28, 841.89];
    const LTR = [612, 792];

    for (let i = 0; i < state.img2pdf.files.length; i++) {
      showProgress('img2pdf',
        Math.round(((i + 1) / state.img2pdf.files.length) * 90),
        `Converting image ${i + 1} of ${state.img2pdf.files.length}...`);
      const file = state.img2pdf.files[i];
      const bytes = await readFile(file);
      let img;
      if (file.type === 'image/jpeg' || file.name.match(/\.jpe?g$/i)) {
        img = await doc.embedJpg(bytes);
      } else {
        img = await doc.embedPng(bytes);
      }
      const dims = img.scale(1);
      let pageW, pageH;
      if (size === 'a4') { pageW = A4[0]; pageH = A4[1]; }
      else if (size === 'letter') { pageW = LTR[0]; pageH = LTR[1]; }
      else { pageW = dims.width; pageH = dims.height; }

      const page = doc.addPage([pageW, pageH]);
      const scale = Math.min(pageW / dims.width, pageH / dims.height, 1);
      const w = dims.width * scale;
      const h = dims.height * scale;
      page.drawImage(img, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
    }

    showProgress('img2pdf', 95, 'Saving...');
    const out = await doc.save();
    showProgress('img2pdf', 100);
    downloadBytes(out, 'images.pdf');
    showResult('img2pdf-result', true,
      `Converted ${state.img2pdf.files.length} image(s) to PDF`,
      `${fmtSize(out.byteLength)} · images.pdf`);
  } catch (e) {
    showResult('img2pdf-result', false, 'Conversion failed: ' + e.message);
  }
}

// ============================================================
// 8. PDF → IMAGE
// ============================================================
(function () {
  setupDrop('pdf2img-drop', 'pdf2img-input', file => {
    if (!file) return;
    state.pdf2img.file = file;
    renderFileList('pdf2img-list', [file], () => {
      state.pdf2img.file = null;
      document.getElementById('pdf2img-list').innerHTML = '';
      document.getElementById('pdf2img-btn').disabled = true;
      document.getElementById('pdf2img-preview').innerHTML = '';
    });
    document.getElementById('pdf2img-btn').disabled = false;
    document.getElementById('pdf2img-preview').innerHTML = '';
    clearResult('pdf2img-result');
  }, false);
})();

document.getElementById('pdf2img-btn').addEventListener('click', pdfToImages);

async function pdfToImages() {
  if (!state.pdf2img.file) return;
  try {
    clearResult('pdf2img-result');
    document.getElementById('pdf2img-preview').innerHTML = '';
    showProgress('pdf2img', 5, 'Loading PDF...');
    const bytes = await readFile(state.pdf2img.file);
    const pdfDoc = await getPdfJsDoc(bytes);
    const total = pdfDoc.numPages;
    const scale = parseFloat(document.getElementById('pdf2img-scale').value) || 2;
    const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
    const preview = document.getElementById('pdf2img-preview');

    for (let i = 1; i <= total; i++) {
      showProgress('pdf2img', Math.round((i / total) * 90), `Rendering page ${i} of ${total}...`);
      const page = await pdfDoc.getPage(i);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      // Thumbnail
      const thumb = document.createElement('canvas');
      const ts = Math.min(70 / vp.width, 70 / vp.height);
      thumb.width = Math.round(vp.width * ts);
      thumb.height = Math.round(vp.height * ts);
      thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
      preview.appendChild(thumb);

      if (zip) {
        const b64 = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`page_${i}.png`, b64, { base64: true });
      } else {
        canvas.toBlob(blob => downloadBlob(blob, `page_${i}.png`), 'image/png');
      }
    }

    if (zip) {
      showProgress('pdf2img', 95, 'Creating ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'pdf_pages.zip');
    }
    showProgress('pdf2img', 100);
    showResult('pdf2img-result', true,
      `Exported ${total} page(s) as PNG`,
      'Downloaded as pdf_pages.zip');
  } catch (e) {
    showResult('pdf2img-result', false, 'Export failed: ' + e.message);
  }
}

// ============================================================
// 9. PDF → TEXT
// ============================================================
(function () {
  setupDrop('pdf2text-drop', 'pdf2text-input', file => {
    if (!file) return;
    state.pdf2text.file = file;
    state.pdf2text.text = '';
    renderFileList('pdf2text-list', [file], () => {
      state.pdf2text.file = null;
      document.getElementById('pdf2text-list').innerHTML = '';
      document.getElementById('pdf2text-btn').disabled = true;
    });
    document.getElementById('pdf2text-btn').disabled = false;
    document.getElementById('pdf2text-output').value = '';
    document.getElementById('pdf2text-dl').disabled = true;
    document.getElementById('pdf2text-copy').disabled = true;
  }, false);
})();

document.getElementById('pdf2text-btn').addEventListener('click', pdfToText);
document.getElementById('pdf2text-dl').addEventListener('click', downloadText);
document.getElementById('pdf2text-copy').addEventListener('click', copyText);

async function pdfToText() {
  if (!state.pdf2text.file) return;
  try {
    showProgress('pdf2text', 5, 'Loading PDF...');
    const bytes = await readFile(state.pdf2text.file);
    const pdfDoc = await getPdfJsDoc(bytes);
    let fullText = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      showProgress('pdf2text', Math.round((i / pdfDoc.numPages) * 90), `Extracting page ${i} of ${pdfDoc.numPages}...`);
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    showProgress('pdf2text', 100);
    state.pdf2text.text = fullText;
    document.getElementById('pdf2text-output').value = fullText;
    document.getElementById('pdf2text-dl').disabled = false;
    document.getElementById('pdf2text-copy').disabled = false;
  } catch (e) {
    document.getElementById('pdf2text-output').value = 'Error: ' + e.message;
  }
}

function downloadText() {
  if (!state.pdf2text.text) return;
  const blob = new Blob([state.pdf2text.text], { type: 'text/plain' });
  const name = (state.pdf2text.file?.name || 'output').replace('.pdf', '') + '.txt';
  downloadBlob(blob, name);
}

function copyText() {
  if (!state.pdf2text.text) return;
  navigator.clipboard?.writeText(state.pdf2text.text).then(() => {
    const btn = document.getElementById('pdf2text-copy');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
  }).catch(() => { });
}

// ============================================================
// 10. GRAYSCALE PDF  [NEW]
// ============================================================
(function () {
  setupDrop('grayscale-drop', 'grayscale-input', file => {
    if (!file) return;
    state.grayscale.file = file;
    renderFileList('grayscale-list', [file], () => {
      state.grayscale.file = null;
      document.getElementById('grayscale-list').innerHTML = '';
      document.getElementById('grayscale-btn').disabled = true;
    });
    document.getElementById('grayscale-btn').disabled = false;
    document.getElementById('grayscale-preview').innerHTML = '';
    clearResult('grayscale-result');
  }, false);
})();

document.getElementById('grayscale-btn').addEventListener('click', convertGrayscale);

async function convertGrayscale() {
  if (!state.grayscale.file) return;
  try {
    clearResult('grayscale-result');
    document.getElementById('grayscale-preview').innerHTML = '';
    showProgress('grayscale', 5, 'Loading PDF...');
    const bytes = await readFile(state.grayscale.file);
    const pdfSrc = await getPdfJsDoc(bytes);
    const total = pdfSrc.numPages;
    const scale = parseFloat(document.getElementById('gray-scale').value) || 2;
    const fmt = getRadio('gray-fmt');
    const quality = parseInt(document.getElementById('gray-quality').value) / 100;
    const preview = document.getElementById('grayscale-preview');

    const { PDFDocument } = PDFLib;
    const outDoc = await PDFDocument.create();

    for (let i = 1; i <= total; i++) {
      showProgress('grayscale', Math.round((i / total) * 85), `Processing page ${i} of ${total}...`);
      const page = await pdfSrc.getPage(i);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // Convert to grayscale via ImageData
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        const lum = Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]);
        data[j] = data[j + 1] = data[j + 2] = lum;
      }
      ctx.putImageData(imageData, 0, 0);

      // Thumbnail
      const thumb = document.createElement('canvas');
      const ts = Math.min(70 / vp.width, 70 / vp.height);
      thumb.width = Math.round(vp.width * ts);
      thumb.height = Math.round(vp.height * ts);
      thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
      preview.appendChild(thumb);

      // Embed into pdf-lib
      const dataUrl = canvas.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
      const base64 = dataUrl.split(',')[1];
      const binStr = atob(base64);
      const imgBytes = new Uint8Array(binStr.length);
      for (let k = 0; k < binStr.length; k++) imgBytes[k] = binStr.charCodeAt(k);

      let embImg;
      if (fmt === 'jpeg') embImg = await outDoc.embedJpg(imgBytes);
      else embImg = await outDoc.embedPng(imgBytes);

      const { width: iW, height: iH } = embImg.scale(1);
      const outPage = outDoc.addPage([iW, iH]);
      outPage.drawImage(embImg, { x: 0, y: 0, width: iW, height: iH });
    }

    showProgress('grayscale', 95, 'Saving...');
    const out = await outDoc.save();
    showProgress('grayscale', 100);
    const name = state.grayscale.file.name.replace('.pdf', '') + '_grayscale.pdf';
    downloadBytes(out, name);
    showResult('grayscale-result', true,
      `Converted ${total} page(s) to grayscale`,
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('grayscale-result', false, 'Conversion failed: ' + e.message);
  }
}

// ============================================================
// 11. COMPRESS PDF  [NEW]
// ============================================================
(function () {
  setupDrop('compress-drop', 'compress-input', file => {
    if (!file) return;
    state.compress.file = file;
    renderFileList('compress-list', [file], () => {
      state.compress.file = null;
      document.getElementById('compress-list').innerHTML = '';
      document.getElementById('compress-btn').disabled = true;
      document.getElementById('compress-stats').style.display = 'none';
    });
    document.getElementById('compress-btn').disabled = false;
    document.getElementById('compress-stats').style.display = 'none';
    clearResult('compress-result');
  }, false);
})();

document.getElementById('compress-btn').addEventListener('click', compressPDF);

async function compressPDF() {
  if (!state.compress.file) return;
  const originalSize = state.compress.file.size;
  try {
    clearResult('compress-result');
    document.getElementById('compress-stats').style.display = 'none';
    const mode = getRadio('compress-mode');

    showProgress('compress', 10, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.compress.file);

    let out;

    if (mode === 'light') {
      // Re-save with object streams + strip XMP metadata overhead
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setCreator('Local PDF Toolkit');
      doc.setProducer('Local PDF Toolkit');
      showProgress('compress', 70, 'Re-saving with optimization...');
      out = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    } else {
      // Heavy: render each page as JPEG and rebuild
      const quality = parseInt(document.getElementById('compress-quality').value) / 100;
      const dpi = parseInt(document.getElementById('compress-dpi').value) || 96;
      const scale = dpi / 72;

      const pdfSrc = await getPdfJsDoc(bytes);
      const total = pdfSrc.numPages;
      const outDoc = await PDFDocument.create();

      for (let i = 1; i <= total; i++) {
        showProgress('compress', Math.round((i / total) * 85), `Rasterizing page ${i} of ${total}...`);
        const page = await pdfSrc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        const binStr = atob(base64);
        const imgBytes = new Uint8Array(binStr.length);
        for (let k = 0; k < binStr.length; k++) imgBytes[k] = binStr.charCodeAt(k);

        const embImg = await outDoc.embedJpg(imgBytes);
        const { width: iW, height: iH } = embImg.scale(1);
        const outPage = outDoc.addPage([iW, iH]);
        outPage.drawImage(embImg, { x: 0, y: 0, width: iW, height: iH });
      }

      showProgress('compress', 95, 'Saving...');
      out = await outDoc.save({ useObjectStreams: true });
    }

    showProgress('compress', 100);
    const saved = originalSize - out.byteLength;
    const savedPct = Math.round((saved / originalSize) * 100);

    document.getElementById('stat-original').textContent = fmtSize(originalSize);
    document.getElementById('stat-output').textContent = fmtSize(out.byteLength);
    document.getElementById('stat-saved').textContent = (saved > 0 ? '-' : '+') + fmtSize(Math.abs(saved)) + ' (' + Math.abs(savedPct) + '%)';
    document.getElementById('compress-stats').style.display = 'flex';

    const name = state.compress.file.name.replace('.pdf', '') + '_compressed.pdf';
    downloadBytes(out, name);
    showResult('compress-result', true,
      saved > 0 ? `Reduced by ${savedPct}%` : 'PDF re-saved (already optimized)',
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('compress-result', false, 'Compression failed: ' + e.message);
  }
}

// ============================================================
// 12. PAGE NUMBERS
// ============================================================
(function () {
  setupDrop('pn-drop', 'pn-input', file => {
    if (!file) return;
    state.pn.file = file;
    renderFileList('pn-list', [file], () => {
      state.pn.file = null;
      document.getElementById('pn-list').innerHTML = '';
      document.getElementById('pn-btn').disabled = true;
    });
    document.getElementById('pn-btn').disabled = false;
    clearResult('pn-result');
  }, false);
})();

document.getElementById('pn-btn').addEventListener('click', addPageNumbers);

async function addPageNumbers() {
  if (!state.pn.file) return;
  try {
    clearResult('pn-result');
    showProgress('pn', 10, 'Loading PDF...');
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const bytes = await readFile(state.pn.file);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const total = pages.length;
    const start = parseInt(document.getElementById('pn-start').value) || 1;
    const fmt = document.getElementById('pn-format').value;
    const pos = getRadio('pn-pos');

    pages.forEach((page, i) => {
      showProgress('pn', Math.round(((i + 1) / total) * 85));
      const { width, height } = page.getSize();
      const n = start + i;
      let label;
      if (fmt === 'n') label = String(n);
      else if (fmt === 'page-n') label = `Page ${n}`;
      else label = `${n} of ${total + start - 1}`;

      const tW = font.widthOfTextAtSize(label, 10);
      const margin = 30;
      let x, y;
      if (pos === 'top-left') { x = margin; y = height - margin; }
      else if (pos === 'top-center') { x = width / 2 - tW / 2; y = height - margin; }
      else if (pos === 'top-right') { x = width - margin - tW; y = height - margin; }
      else if (pos === 'bottom-center') { x = width / 2 - tW / 2; y = margin; }
      else { x = width - margin - tW; y = margin; }

      page.drawText(label, { x, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    });

    showProgress('pn', 95, 'Saving...');
    const out = await doc.save();
    showProgress('pn', 100);
    downloadBytes(out, 'numbered.pdf');
    showResult('pn-result', true,
      `Added page numbers to ${total} pages`,
      `${fmtSize(out.byteLength)} · numbered.pdf`);
  } catch (e) {
    showResult('pn-result', false, 'Failed: ' + e.message);
  }
}

// ============================================================
// 13. WATERMARK
// ============================================================
(function () {
  setupDrop('wm-drop', 'wm-input', file => {
    if (!file) return;
    state.wm.file = file;
    renderFileList('wm-list', [file], () => {
      state.wm.file = null;
      document.getElementById('wm-list').innerHTML = '';
      document.getElementById('wm-btn').disabled = true;
    });
    document.getElementById('wm-btn').disabled = false;
    clearResult('wm-result');
  }, false);
})();

document.getElementById('wm-btn').addEventListener('click', watermarkPDF);

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

async function watermarkPDF() {
  if (!state.wm.file) return;
  try {
    clearResult('wm-result');
    showProgress('wm', 10, 'Loading PDF...');
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
    const bytes = await readFile(state.wm.file);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const text = document.getElementById('wm-text').value || 'WATERMARK';
    const opacity = parseInt(document.getElementById('wm-opacity').value) / 100;
    const { r, g, b } = hexToRgb(document.getElementById('wm-color').value);
    const pos = getRadio('wm-pos');
    const pages = doc.getPages();

    pages.forEach((page, i) => {
      showProgress('wm', Math.round(((i + 1) / pages.length) * 85));
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) / 10;
      const tWidth = font.widthOfTextAtSize(text, fontSize);

      if (pos === 'diagonal') {
        page.drawText(text, {
          x: (width - tWidth) / 2, y: (height - fontSize) / 2,
          size: fontSize, font, color: rgb(r, g, b), opacity,
          rotate: degrees(45)
        });
      } else if (pos === 'center') {
        page.drawText(text, {
          x: (width - tWidth) / 2, y: (height - fontSize) / 2,
          size: fontSize, font, color: rgb(r, g, b), opacity
        });
      } else {
        // Tile
        const step = fontSize * 4;
        for (let x = -step; x < width + step; x += step) {
          for (let y = -step; y < height + step; y += step) {
            page.drawText(text, {
              x, y, size: fontSize * 0.4, font,
              color: rgb(r, g, b), opacity: opacity * 0.6,
              rotate: degrees(30)
            });
          }
        }
      }
    });

    showProgress('wm', 95, 'Saving...');
    const out = await doc.save();
    showProgress('wm', 100);
    const name = state.wm.file.name.replace('.pdf', '') + '_watermarked.pdf';
    downloadBytes(out, name);
    showResult('wm-result', true,
      'Watermark applied successfully',
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('wm-result', false, 'Watermark failed: ' + e.message);
  }
}

// ============================================================
// 14. EDIT METADATA  [NEW]
// ============================================================
(function () {
  setupDrop('metadata-drop', 'metadata-input', async file => {
    if (!file) return;
    state.metadata.file = file;
    renderFileList('metadata-list', [file], () => {
      state.metadata.file = null;
      document.getElementById('metadata-list').innerHTML = '';
      document.getElementById('metadata-form').style.display = 'none';
    });
    clearResult('metadata-result');

    try {
      const { PDFDocument } = PDFLib;
      const bytes = await readFile(file);
      const doc = await PDFDocument.load(bytes);
      document.getElementById('meta-title').value = doc.getTitle() || '';
      document.getElementById('meta-author').value = doc.getAuthor() || '';
      document.getElementById('meta-subject').value = doc.getSubject() || '';
      document.getElementById('meta-keywords').value = (doc.getKeywords() || []).join(', ');
      document.getElementById('meta-creator').value = doc.getCreator() || '';
      document.getElementById('meta-producer').value = doc.getProducer() || '';
      document.getElementById('metadata-form').style.display = 'block';
    } catch (e) {
      showResult('metadata-result', false, 'Could not read metadata: ' + e.message);
    }
  }, false);
})();

document.getElementById('metadata-btn').addEventListener('click', saveMetadata);
document.getElementById('metadata-clear-btn').addEventListener('click', () => {
  ['meta-title', 'meta-author', 'meta-subject', 'meta-keywords', 'meta-creator', 'meta-producer']
    .forEach(id => { document.getElementById(id).value = ''; });
});

async function saveMetadata() {
  if (!state.metadata.file) return;
  try {
    clearResult('metadata-result');
    showProgress('metadata', 20, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.metadata.file);
    const doc = await PDFDocument.load(bytes);

    const title = document.getElementById('meta-title').value.trim();
    const author = document.getElementById('meta-author').value.trim();
    const subject = document.getElementById('meta-subject').value.trim();
    const keywords = document.getElementById('meta-keywords').value.split(',').map(k => k.trim()).filter(Boolean);
    const creator = document.getElementById('meta-creator').value.trim();
    const producer = document.getElementById('meta-producer').value.trim();

    if (title) doc.setTitle(title);
    if (author) doc.setAuthor(author);
    if (subject) doc.setSubject(subject);
    if (keywords.length) doc.setKeywords(keywords);
    if (creator) doc.setCreator(creator);
    if (producer) doc.setProducer(producer);
    doc.setModificationDate(new Date());

    showProgress('metadata', 80, 'Saving...');
    const out = await doc.save();
    showProgress('metadata', 100);
    const name = state.metadata.file.name.replace('.pdf', '') + '_meta.pdf';
    downloadBytes(out, name);
    showResult('metadata-result', true,
      'Metadata updated successfully',
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('metadata-result', false, 'Failed: ' + e.message);
  }
}

// ============================================================
// 15. PROTECT PDF
// ============================================================
(function () {
  setupDrop('protect-drop', 'protect-input', file => {
    if (!file) return;
    state.protect.file = file;
    renderFileList('protect-list', [file], () => {
      state.protect.file = null;
      document.getElementById('protect-list').innerHTML = '';
      document.getElementById('protect-btn').disabled = true;
    });
    document.getElementById('protect-btn').disabled = false;
    clearResult('protect-result');
  }, false);
})();

document.getElementById('protect-btn').addEventListener('click', protectPDF);

async function protectPDF() {
  if (!state.protect.file) return;
  const userPw = document.getElementById('protect-user-pw').value;
  if (!userPw) { showResult('protect-result', false, 'Please enter a password.'); return; }
  const ownerPw = document.getElementById('protect-owner-pw').value || userPw;
  try {
    clearResult('protect-result');
    showProgress('protect', 20, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.protect.file);
    const doc = await PDFDocument.load(bytes);
    showProgress('protect', 50, 'Encrypting...');
    await doc.encrypt({ userPassword: userPw, ownerPassword: ownerPw });
    showProgress('protect', 90, 'Saving...');
    const out = await doc.save();
    showProgress('protect', 100);
    const name = state.protect.file.name.replace('.pdf', '') + '_protected.pdf';
    downloadBytes(out, name);
    showResult('protect-result', true,
      'PDF encrypted successfully',
      `${fmtSize(out.byteLength)} · ${name}`);
    document.getElementById('protect-user-pw').value = '';
    document.getElementById('protect-owner-pw').value = '';
  } catch (e) {
    showResult('protect-result', false, 'Encryption failed: ' + e.message);
  }
}

// ============================================================
// 16. UNLOCK PDF  [NEW]
// ============================================================
(function () {
  setupDrop('unlock-drop', 'unlock-input', file => {
    if (!file) return;
    state.unlock.file = file;
    renderFileList('unlock-list', [file], () => {
      state.unlock.file = null;
      document.getElementById('unlock-list').innerHTML = '';
      document.getElementById('unlock-btn').disabled = true;
    });
    document.getElementById('unlock-btn').disabled = false;
    clearResult('unlock-result');
  }, false);
})();

document.getElementById('unlock-btn').addEventListener('click', unlockPDF);

async function unlockPDF() {
  if (!state.unlock.file) return;
  const pw = document.getElementById('unlock-pw').value;
  if (!pw) { showResult('unlock-result', false, 'Please enter the current password.'); return; }
  try {
    clearResult('unlock-result');
    showProgress('unlock', 20, 'Decrypting PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.unlock.file);
    const doc = await PDFDocument.load(bytes, { password: pw });
    showProgress('unlock', 75, 'Saving unlocked PDF...');
    const out = await doc.save();
    showProgress('unlock', 100);
    const name = state.unlock.file.name.replace('.pdf', '') + '_unlocked.pdf';
    downloadBytes(out, name);
    showResult('unlock-result', true,
      'PDF unlocked successfully',
      `${fmtSize(out.byteLength)} · ${name}`);
    document.getElementById('unlock-pw').value = '';
  } catch (e) {
    showResult('unlock-result', false,
      'Unlock failed — check that the password is correct.',
      e.message);
  }
}

// ============================================================
// 17. FLATTEN PDF  [NEW]
// ============================================================
(function () {
  setupDrop('flatten-drop', 'flatten-input', file => {
    if (!file) return;
    state.flatten.file = file;
    renderFileList('flatten-list', [file], () => {
      state.flatten.file = null;
      document.getElementById('flatten-list').innerHTML = '';
      document.getElementById('flatten-btn').disabled = true;
    });
    document.getElementById('flatten-btn').disabled = false;
    clearResult('flatten-result');
  }, false);
})();

document.getElementById('flatten-btn').addEventListener('click', flattenPDF);

async function flattenPDF() {
  if (!state.flatten.file) return;
  try {
    clearResult('flatten-result');
    showProgress('flatten', 20, 'Loading PDF...');
    const { PDFDocument } = PDFLib;
    const bytes = await readFile(state.flatten.file);
    const doc = await PDFDocument.load(bytes);
    showProgress('flatten', 50, 'Flattening form fields...');
    try {
      const form = doc.getForm();
      form.flatten();
    } catch {
      // PDF has no form — still re-save cleanly
    }
    showProgress('flatten', 85, 'Saving...');
    const out = await doc.save();
    showProgress('flatten', 100);
    const name = state.flatten.file.name.replace('.pdf', '') + '_flat.pdf';
    downloadBytes(out, name);
    showResult('flatten-result', true,
      'PDF flattened successfully',
      `${fmtSize(out.byteLength)} · ${name}`);
  } catch (e) {
    showResult('flatten-result', false, 'Flatten failed: ' + e.message);
  }
}

// ============================================================
// 18. PDF INFO  [NEW]
// ============================================================
(function () {
  const handle = async file => {
    if (!file) return;
    state.info.file = file;
    const display = document.getElementById('info-display');
    const grid = document.getElementById('info-grid');
    display.style.display = 'none';
    grid.innerHTML = '';

    try {
      const { PDFDocument } = PDFLib;
      const bytes = await readFile(file);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = doc.getPages();

      const pageSizes = pages.slice(0, 5).map((p, i) => {
        const { width, height } = p.getSize();
        return `P${i + 1}: ${width.toFixed(0)}×${height.toFixed(0)} pt`;
      }).join('  ');

      const kw = doc.getKeywords();
      const created = doc.getCreationDate();
      const modified = doc.getModificationDate();

      const cards = [
        { label: 'File Name', value: file.name, full: false, mono: false },
        { label: 'File Size', value: fmtSize(file.size), full: false, mono: true },
        { label: 'Page Count', value: pages.length + ' pages', full: false, mono: true },
        { label: 'PDF Version', value: doc.context.header.toString() || '—', full: false, mono: true },
        { label: 'Title', value: doc.getTitle() || '—', full: false, mono: false },
        { label: 'Author', value: doc.getAuthor() || '—', full: false, mono: false },
        { label: 'Subject', value: doc.getSubject() || '—', full: true, mono: false },
        { label: 'Creator', value: doc.getCreator() || '—', full: false, mono: false },
        { label: 'Producer', value: doc.getProducer() || '—', full: false, mono: false },
        { label: 'Created', value: created ? created.toLocaleString() : '—', full: false, mono: true },
        { label: 'Modified', value: modified ? modified.toLocaleString() : '—', full: false, mono: true },
        { label: 'Page Sizes', value: pageSizes || '—', full: true, mono: true },
      ];

      if (kw && kw.length) {
        cards.push({ label: 'Keywords', value: kw.join(', '), full: true, mono: false });
      }

      cards.forEach(c => {
        const card = document.createElement('div');
        card.className = 'info-card' + (c.full ? ' full' : '');
        const lbl = document.createElement('div');
        lbl.className = 'info-card-label';
        lbl.textContent = c.label;
        const val = document.createElement('div');
        val.className = 'info-card-value' + (c.mono ? ' mono' : '');
        val.textContent = c.value;
        card.appendChild(lbl); card.appendChild(val);
        grid.appendChild(card);
      });

      display.style.display = 'block';
    } catch (e) {
      const errCard = document.createElement('div');
      errCard.className = 'info-card full';
      errCard.innerHTML = `<div class="info-card-label">ERROR</div><div class="info-card-value">${e.message}</div>`;
      grid.appendChild(errCard);
      display.style.display = 'block';
    }
  };
  setupDrop('info-drop', 'info-input', handle, false);
})();

// ============================================================
// 19. IMAGE RESIZER  [NEW]
// Resize JPG/PNG/WebP images to exact pixel sizes locally.
// 100% canvas-based — no network, no external libs, CSP-safe.
// ============================================================
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const rs = { files: [] };

  // ── File list ──────────────────────────────────────────────
  function removeImgFile(i) {
    rs.files.splice(i, 1);
    renderFileList('imgresize-list', rs.files, removeImgFile);
    document.getElementById('imgresize-btn').disabled = rs.files.length === 0;
    document.getElementById('imgresize-preview-wrap').classList.remove('active');
    clearResult('imgresize-result');
  }

  // ── Drop zone ──────────────────────────────────────────────
  (function () {
    const drop = document.getElementById('imgresize-drop');
    const input = document.getElementById('imgresize-input');
    if (!drop || !input) return;

    const handle = files => {
      const arr = Array.isArray(files) ? files : [files];
      const imgs = arr.filter(f => f && f.type.startsWith('image/'));
      rs.files.push(...imgs);
      renderFileList('imgresize-list', rs.files, removeImgFile);
      document.getElementById('imgresize-btn').disabled = rs.files.length === 0;
      clearResult('imgresize-result');
      // Auto-preview first image dimensions
      if (imgs.length > 0) previewDimensions(imgs[0]);
    };

    input.addEventListener('change', e => { handle([...e.target.files]); e.target.value = ''; });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('dragover');
      handle([...e.dataTransfer.files]);
    });
  })();

  // ── Preview dimensions of first image ─────────────────────
  function previewDimensions(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // If locked ratio is on, sync height based on current width
      if (document.getElementById('resize-lock-ratio') &&
        document.getElementById('resize-lock-ratio').checked) {
        const w = parseInt(document.getElementById('resize-width').value) || img.naturalWidth;
        const h = Math.round(w * img.naturalHeight / img.naturalWidth);
        document.getElementById('resize-height').value = h;
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // ── Resize mode toggle ─────────────────────────────────────
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.radio-btn[data-group="resize-mode"]');
    if (!btn) return;
    const v = btn.dataset.value;
    document.getElementById('resize-exact-opts').style.display = v === 'exact' ? 'block' : 'none';
    document.getElementById('resize-width-opts').style.display = v === 'width' ? 'block' : 'none';
    document.getElementById('resize-height-opts').style.display = v === 'height' ? 'block' : 'none';
    document.getElementById('resize-percent-opts').style.display = v === 'percent' ? 'block' : 'none';
    document.getElementById('resize-preset-opts').style.display = v === 'preset' ? 'block' : 'none';
  });

  // ── Lock ratio: sync height when width changes ─────────────
  document.getElementById('resize-width').addEventListener('input', function () {
    if (!document.getElementById('resize-lock-ratio').checked) return;
    if (rs.files.length === 0) return;
    const img = new Image();
    const url = URL.createObjectURL(rs.files[0]);
    img.onload = () => {
      const w = parseInt(this.value) || 1;
      document.getElementById('resize-height').value = Math.round(w * img.naturalHeight / img.naturalWidth);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  // Sliders are now handled by unified bindSlider at the top of app.js

  // ── Output format → show/hide quality ─────────────────────
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.radio-btn[data-group="resize-fmt"]');
    if (!btn) return;
    const v = btn.dataset.value;
    const show = (v === 'image/jpeg' || v === 'image/webp');
    document.getElementById('resize-quality-group').style.display = show ? 'block' : 'none';
  });

  // ── Clear button ───────────────────────────────────────────
  document.getElementById('imgresize-clear-btn').addEventListener('click', () => {
    rs.files = [];
    document.getElementById('imgresize-list').innerHTML = '';
    document.getElementById('imgresize-btn').disabled = true;
    document.getElementById('imgresize-preview-wrap').classList.remove('active');
    clearResult('imgresize-result');
  });

  // ── Helper: load Image from File ──────────────────────────
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image: ' + file.name)); };
      img.dataset.objectUrl = url;
      img.src = url;
    });
  }

  // ── Helper: get target dimensions ─────────────────────────
  function getTargetDims(img) {
    const mode = document.querySelector('[data-group="resize-mode"].active')?.dataset.value || 'exact';
    const sw = img.naturalWidth, sh = img.naturalHeight;

    if (mode === 'exact') {
      return {
        w: Math.max(1, parseInt(document.getElementById('resize-width').value) || sw),
        h: Math.max(1, parseInt(document.getElementById('resize-height').value) || sh),
      };
    }
    if (mode === 'width') {
      const tw = Math.max(1, parseInt(document.getElementById('resize-w-only').value) || sw);
      return { w: tw, h: Math.round(tw * sh / sw) };
    }
    if (mode === 'height') {
      const th = Math.max(1, parseInt(document.getElementById('resize-h-only').value) || sh);
      return { w: Math.round(th * sw / sh), h: th };
    }
    if (mode === 'percent') {
      const pct = parseFloat(document.getElementById('resize-pct').value) / 100;
      return { w: Math.max(1, Math.round(sw * pct)), h: Math.max(1, Math.round(sh * pct)) };
    }
    if (mode === 'preset') {
      const sel = document.getElementById('resize-preset').value;
      const [pw, ph] = sel.split('x').map(Number);
      return { w: pw, h: ph };
    }
    return { w: sw, h: sh };
  }

  // ── Helper: draw with fit mode ─────────────────────────────
  function drawFit(ctx, img, tw, th, fitMode) {
    const sw = img.naturalWidth, sh = img.naturalHeight;
    if (fitMode === 'stretch') {
      ctx.drawImage(img, 0, 0, tw, th);
      return;
    }
    const imgRatio = sw / sh;
    const tgtRatio = tw / th;
    if (fitMode === 'contain') {
      // Letterbox / pillarbox
      let dw, dh, dx, dy;
      if (imgRatio > tgtRatio) { dw = tw; dh = Math.round(tw / imgRatio); dx = 0; dy = Math.round((th - dh) / 2); }
      else { dh = th; dw = Math.round(th * imgRatio); dy = 0; dx = Math.round((tw - dw) / 2); }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }
    if (fitMode === 'cover') {
      // Crop center
      let sx, sy, sdw, sdh;
      if (imgRatio > tgtRatio) { sdh = sh; sdw = Math.round(sh * tgtRatio); sx = Math.round((sw - sdw) / 2); sy = 0; }
      else { sdw = sw; sdh = Math.round(sw / tgtRatio); sy = Math.round((sh - sdh) / 2); sx = 0; }
      ctx.drawImage(img, sx, sy, sdw, sdh, 0, 0, tw, th);
      return;
    }
    ctx.drawImage(img, 0, 0, tw, th);
  }

  // ── Helper: canvas to Blob ─────────────────────────────────
  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality / 100));
  }

  // ── Helper: output extension from mime ────────────────────
  function mimeToExt(mime) {
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '.png';
  }

  // ── Helper: get actual output mime ─────────────────────────
  function getOutputMime(file) {
    const sel = document.querySelector('[data-group="resize-fmt"].active')?.dataset.value;
    if (sel && sel !== 'original') return sel;
    const t = file.type;
    if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') return t;
    return 'image/png'; // fallback for bmp, gif etc
  }

  // ── Main resize function ───────────────────────────────────
  document.getElementById('imgresize-btn').addEventListener('click', resizeImages);

  async function resizeImages() {
    if (rs.files.length === 0) return;
    clearResult('imgresize-result');
    const previewWrap = document.getElementById('imgresize-preview-wrap');
    const canvasRow = document.getElementById('imgresize-canvas-row');
    const statsDiv = document.getElementById('imgresize-stats');
    previewWrap.classList.remove('active');
    canvasRow.innerHTML = '';
    statsDiv.innerHTML = '';

    const fitMode = document.querySelector('[data-group="resize-fit"].active')?.dataset.value || 'stretch';
    const quality = parseInt(document.getElementById('resize-quality').value) || 90;
    const multi = rs.files.length > 1;
    const zip = multi ? new JSZip() : null;

    let totalOriginal = 0, totalOut = 0;

    try {
      for (let i = 0; i < rs.files.length; i++) {
        const file = rs.files[i];
        const pct = Math.round(((i + 1) / rs.files.length) * 90);
        showProgress('imgresize', pct, `Resizing ${i + 1} of ${rs.files.length}: ${file.name}`);

        const img = await loadImage(file);
        const dims = getTargetDims(img);
        const mime = getOutputMime(file);
        const ext = mimeToExt(mime);

        const canvas = document.createElement('canvas');
        canvas.width = dims.w;
        canvas.height = dims.h;
        const ctx = canvas.getContext('2d');
        drawFit(ctx, img, dims.w, dims.h, fitMode);

        // Free object URL
        if (img.dataset.objectUrl) URL.revokeObjectURL(img.dataset.objectUrl);

        const blob = await canvasToBlob(canvas, mime, quality);
        totalOriginal += file.size;
        totalOut += blob.size;

        const baseName = file.name.replace(/\.[^.]+$/, '');
        const outName = baseName + `_${dims.w}x${dims.h}` + ext;

        if (multi) {
          const arrBuf = await blob.arrayBuffer();
          zip.file(outName, arrBuf);
        } else {
          downloadBlob(blob, outName);
          // Show preview for single image
          const preCanvas = document.createElement('canvas');
          const preMax = 160;
          const ratio = Math.min(preMax / dims.w, preMax / dims.h);
          preCanvas.width = Math.round(dims.w * ratio);
          preCanvas.height = Math.round(dims.h * ratio);
          preCanvas.getContext('2d').drawImage(canvas, 0, 0, preCanvas.width, preCanvas.height);

          const origCanvas = document.createElement('canvas');
          const origImg = await loadImage(file);
          const oRatio = Math.min(preMax / origImg.naturalWidth, preMax / origImg.naturalHeight);
          origCanvas.width = Math.round(origImg.naturalWidth * oRatio);
          origCanvas.height = Math.round(origImg.naturalHeight * oRatio);
          origCanvas.getContext('2d').drawImage(origImg, 0, 0, origCanvas.width, origCanvas.height);
          if (origImg.dataset.objectUrl) URL.revokeObjectURL(origImg.dataset.objectUrl);

          const makeCol = (canv, lbl) => {
            const col = document.createElement('div');
            col.className = 'img-resize-canvas-col';
            const lDiv = document.createElement('div');
            lDiv.className = 'img-resize-canvas-label';
            lDiv.textContent = lbl;
            col.appendChild(canv);
            col.appendChild(lDiv);
            canvasRow.appendChild(col);
          };
          makeCol(origCanvas, `Original: ${file.size > 0 ? fmtSize(file.size) : '?'} · ${origImg.naturalWidth}×${origImg.naturalHeight}`);
          makeCol(preCanvas, `Resized: ${fmtSize(blob.size)} · ${dims.w}×${dims.h}`);
          previewWrap.classList.add('active');
        }
      }

      if (multi) {
        showProgress('imgresize', 95, 'Creating ZIP archive...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `resized_images_${rs.files.length}files.zip`);
        totalOut = zipBlob.size;
      }

      showProgress('imgresize', 100);

      // Stats cards
      const saved = totalOriginal - totalOut;
      const savedPct = totalOriginal > 0 ? Math.round(saved / totalOriginal * 100) : 0;
      statsDiv.innerHTML =
        `<div class="img-resize-stat-card"><div class="img-resize-stat-val">${fmtSize(totalOriginal)}</div><div class="img-resize-stat-label">Original${multi ? ' (total)' : ''}</div></div>` +
        `<div class="img-resize-stat-card"><div class="img-resize-stat-val">${fmtSize(totalOut)}</div><div class="img-resize-stat-label">Output${multi ? ' (zip)' : ''}</div></div>` +
        `<div class="img-resize-stat-card"><div class="img-resize-stat-val ${saved > 0 ? 'green' : ''}">${saved > 0 ? '−' + savedPct + '%' : '+' + Math.abs(savedPct) + '%'}</div><div class="img-resize-stat-label">Size Change</div></div>`;
      previewWrap.classList.add('active');

      showResult('imgresize-result', true,
        `${rs.files.length} image${rs.files.length > 1 ? 's' : ''} resized successfully`,
        multi ? `Downloaded as resized_images_${rs.files.length}files.zip` : `${fmtSize(totalOut)}`);

    } catch (err) {
      showResult('imgresize-result', false, 'Resize failed: ' + err.message);
    }
  }

})(); // end Image Resizer

// ============================================================
// 20. DARK / LIGHT THEME TOGGLE  (CSP-safe — no inline script)
// ============================================================
(function () {
  const DARK_KEY = 'pdfToolkit_darkMode';
  const btn      = document.getElementById('theme-toggle');
  const moonIcon = document.getElementById('icon-moon');
  const sunIcon  = document.getElementById('icon-sun');

  if (!btn) return; // guard — element must exist

  function applyDark(dark) {
    if (dark) {
      document.body.classList.add('dark');
      if (moonIcon) moonIcon.style.display = 'none';
      if (sunIcon)  sunIcon.style.display  = 'block';
      btn.title = 'Switch to Light Mode';
    } else {
      document.body.classList.remove('dark');
      if (moonIcon) moonIcon.style.display = 'block';
      if (sunIcon)  sunIcon.style.display  = 'none';
      btn.title = 'Switch to Dark Mode';
    }
  }

  // Restore saved preference on load
  applyDark(localStorage.getItem(DARK_KEY) === 'true');

  // Toggle on click
  btn.addEventListener('click', function () {
    const isDark = !document.body.classList.contains('dark');
    applyDark(isDark);
    localStorage.setItem(DARK_KEY, isDark);
  });
})(); // end Dark Theme Toggle
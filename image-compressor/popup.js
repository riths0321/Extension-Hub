/* ───────────────────────────────────────────
   Quick Image Compressor — popup.js
   CSP-safe: no eval, no inline handlers
   All DOM manipulation via addEventListener
─────────────────────────────────────────── */

// ── Element refs ──
const fileInput    = document.getElementById('fileInput');
const dropzone     = document.getElementById('dropzone');
const dropInner    = document.getElementById('dropInner');
const previewInner = document.getElementById('previewInner');
const previewCanvas= document.getElementById('previewCanvas');
const previewName  = document.getElementById('previewName');
const previewSize  = document.getElementById('previewSize');
const qualityInput = document.getElementById('quality');
const qualityVal   = document.getElementById('qualityVal');
const compressBtn  = document.getElementById('compressBtn');
const btnText      = document.getElementById('btnText');
const resultBar    = document.getElementById('resultBar');
const origSize     = document.getElementById('origSize');
const compSize     = document.getElementById('compSize');
const savingsBadge = document.getElementById('savingsBadge');
const formatSeg    = document.getElementById('formatSeg');
const resizeSeg    = document.getElementById('resizeSeg');
const resizeVal    = document.getElementById('resizeVal');

// ── State ──
let file       = null;
let imgElement = null;
let format     = 'image/jpeg';
let maxWidth   = 0; // 0 = original

// ── Segmented controls ──
function initSegControl(container, callback) {
  container.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.value);
    });
  });
}

initSegControl(formatSeg, val => {
  format = val;
  const isPng = val === 'image/png';
  document.getElementById('qualityRow').style.opacity = isPng ? '0.4' : '1';
  document.getElementById('qualityRow').style.pointerEvents = isPng ? 'none' : '';
  if (imgElement) renderPreview(imgElement);
});

initSegControl(resizeSeg, val => {
  maxWidth = parseInt(val);
  resizeVal.textContent = maxWidth === 0 ? 'Original' : `${maxWidth}px`;
});

// ── Quality slider ──
qualityInput.addEventListener('input', () => {
  qualityVal.textContent = `${qualityInput.value}%`;
  updateSliderTrack();
});

function updateSliderTrack() {
  const pct = ((qualityInput.value - qualityInput.min) / (qualityInput.max - qualityInput.min)) * 100;
  qualityInput.style.background = `linear-gradient(to right, #4ade80 ${pct}%, #1a2234 ${pct}%)`;
}
updateSliderTrack();

// ── File handling ──
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', e => {
  if (!dropzone.contains(e.relatedTarget)) {
    dropzone.classList.remove('drag-over');
  }
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const f = e.dataTransfer?.files?.[0];
  if (f) loadFile(f);
});

function loadFile(selectedFile) {
  if (!selectedFile.type.startsWith('image/')) {
    showError('⚠️ Please select a valid image file.');
    return;
  }

  file = selectedFile;
  resultBar.classList.add('hidden');

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      imgElement = img;
      renderPreview(img);
      compressBtn.disabled = false;
      dropInner.classList.add('hidden');
      previewInner.classList.remove('hidden');
      previewName.textContent = truncate(file.name, 28);
      previewSize.textContent = formatBytes(file.size);
    };
    img.onerror = () => showError('Could not load image.');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderPreview(img) {
  const maxH = 110, maxW = 308;
  let w = img.width, h = img.height;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  previewCanvas.width  = Math.round(w * ratio);
  previewCanvas.height = Math.round(h * ratio);
  const ctx = previewCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
}

// ── Compress ──
compressBtn.addEventListener('click', startCompression);

function startCompression() {
  if (!file || !imgElement) return;

  setLoading(true);

  // Small delay so UI updates before heavy canvas work
  setTimeout(() => {
    try {
      compressImage(imgElement);
    } catch(err) {
      showError('Compression failed: ' + err.message);
      setLoading(false);
    }
  }, 30);
}

function compressImage(img) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');

  let w = img.width, h = img.height;

  // Optional resize
  if (maxWidth > 0 && w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }

  canvas.width  = w;
  canvas.height = h;

  // White background for JPEG (avoids black on transparent PNGs)
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(img, 0, 0, w, h);

  const quality = format === 'image/png' ? undefined : qualityInput.value / 100;

  canvas.toBlob(blob => {
    if (!blob) {
      showError('Compression failed — canvas returned empty blob.');
      setLoading(false);
      return;
    }

    const ext = format === 'image/jpeg' ? 'jpg'
              : format === 'image/webp' ? 'webp'
              : 'png';

    downloadBlob(blob, `compressed-${file.name.replace(/\.[^/.]+$/, '')}.${ext}`);
    showResult(file.size, blob.size);
    setLoading(false);
  }, format, quality);
}

// ── Download ──
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so browser has time to initiate download
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── UI helpers ──
function showResult(original, compressed) {
  origSize.textContent = formatBytes(original);
  compSize.textContent = formatBytes(compressed);

  const saved = Math.round((1 - compressed / original) * 100);
  if (saved > 0) {
    savingsBadge.textContent = `-${saved}%`;
    savingsBadge.style.display = 'block';
  } else {
    savingsBadge.style.display = 'none';
  }

  resultBar.classList.remove('hidden');
}

function showError(msg) {
  savingsBadge.style.display = 'none';
  origSize.textContent = msg;
  compSize.textContent = '';
  resultBar.classList.remove('hidden');
}

function setLoading(on) {
  if (on) {
    compressBtn.classList.add('loading');
    btnText.textContent = 'Compressing…';
    compressBtn.disabled = true;
    // Replace icon with spinner using SVG
    const icon = compressBtn.querySelector('svg');
    if (icon) {
      icon.innerHTML = '<path d="M21 12a9 9 0 11-4.219-7.61" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
    }
  } else {
    compressBtn.classList.remove('loading');
    btnText.textContent = 'Compress & Download';
    compressBtn.disabled = false;
    const icon = compressBtn.querySelector('svg');
    if (icon) {
      icon.innerHTML = '<path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 3H9v7l3 3 3-3V3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
  }
}

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}

function truncate(str, max) {
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

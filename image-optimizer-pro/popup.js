/**
 * Image Optimizer Pro — Popup Script
 * CSP-compliant: no inline handlers, no eval, no external scripts.
 * All image processing via Canvas API (local, private).
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const state = {
  originalFile: null,       // File object
  originalDataURL: null,    // base64 of original
  originalWidth: 0,
  originalHeight: 0,
  originalBytes: 0,
  mode: 'compress',         // 'compress' | 'resize'
  quality: 0.80,            // 0.1 – 1.0
  targetWidth: 0,
  targetHeight: 0,
  aspectRatio: 1,           // w / h
  lockAspect: true,
  outputFormat: 'jpeg',     // 'jpeg' | 'png' | 'webp'
  processedDataURL: null,
  processedBytes: 0,
  debounceTimer: null,
};

/* ============================================================
   DOM REFS
   ============================================================ */
const dom = {
  dropZone:         document.getElementById('dropZone'),
  fileInput:        document.getElementById('fileInput'),
  errorMessage:     document.getElementById('errorMessage'),
  workspace:        document.getElementById('workspace'),
  btnCompress:      document.getElementById('btnCompress'),
  btnResize:        document.getElementById('btnResize'),
  panelCompress:    document.getElementById('panelCompress'),
  panelResize:      document.getElementById('panelResize'),
  qualitySlider:    document.getElementById('qualitySlider'),
  qualityValue:     document.getElementById('qualityValue'),
  widthInput:       document.getElementById('widthInput'),
  heightInput:      document.getElementById('heightInput'),
  lockToggle:       document.getElementById('lockToggle'),
  previewOriginal:  document.getElementById('previewOriginal'),
  previewProcessed: document.getElementById('previewProcessed'),
  metaOriginal:     document.getElementById('metaOriginal'),
  metaProcessed:    document.getElementById('metaProcessed'),
  btnDownload:      document.getElementById('btnDownload'),
  presetBtns:       document.querySelectorAll('.preset-btn'),
  fmtBtns:          document.querySelectorAll('.fmt-btn'),
};

/* ============================================================
   UTILITIES
   ============================================================ */

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Estimate base64 data URL byte size.
 * @param {string} dataURL
 * @returns {number}
 */
function estimateSize(dataURL) {
  const base64 = dataURL.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

/**
 * Show an error message in the UI.
 * @param {string} msg
 */
function showError(msg) {
  dom.errorMessage.textContent = msg;
}

/**
 * Clear error message.
 */
function clearError() {
  dom.errorMessage.textContent = '';
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay
 */
function debounce(fn, delay) {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(fn, delay);
}

/* ============================================================
   FILE HANDLING
   ============================================================ */

/**
 * Validate and load a File object into state.
 * @param {File} file
 */
function loadFile(file) {
  clearError();

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showError('Unsupported format. Please upload a JPG, PNG, or WEBP image.');
    return;
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB guard
  if (file.size > MAX_BYTES) {
    showError('File is too large (max 50 MB).');
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', (e) => {
    const dataURL = e.target.result;

    const img = new Image();
    img.addEventListener('load', () => {
      // Populate state
      state.originalFile     = file;
      state.originalDataURL  = dataURL;
      state.originalWidth    = img.naturalWidth;
      state.originalHeight   = img.naturalHeight;
      state.originalBytes    = file.size;
      state.aspectRatio      = img.naturalWidth / img.naturalHeight;
      state.targetWidth      = img.naturalWidth;
      state.targetHeight     = img.naturalHeight;

      // Sync resize inputs
      dom.widthInput.value  = img.naturalWidth;
      dom.heightInput.value = img.naturalHeight;

      // Show original preview
      dom.previewOriginal.src = dataURL;
      dom.previewOriginal.classList.add('loaded');
      dom.metaOriginal.innerHTML =
        `<span class="size-highlight">${formatBytes(file.size)}</span> · ${img.naturalWidth}×${img.naturalHeight}`;

      // Show workspace
      dom.workspace.removeAttribute('aria-hidden');
      dom.workspace.classList.remove('hidden');

      // Trigger initial processing
      processImage();
    });
    img.src = dataURL;
  });
  reader.readAsDataURL(file);
}

/* ============================================================
   CANVAS PROCESSING
   ============================================================ */

/**
 * Process the current image based on active mode and settings.
 * Runs entirely client-side using Canvas API.
 */
function processImage() {
  if (!state.originalDataURL) return;

  const img = new Image();
  img.addEventListener('load', () => {
    let outW, outH;

    if (state.mode === 'compress') {
      // Compress: same dimensions, lower quality
      outW = state.originalWidth;
      outH = state.originalHeight;
    } else {
      // Resize: target dimensions
      outW = state.targetWidth  || state.originalWidth;
      outH = state.targetHeight || state.originalHeight;

      if (outW < 1 || outH < 1) {
        showError('Width and Height must be at least 1 px.');
        return;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width  = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';
    ctx.drawImage(img, 0, 0, outW, outH);

    // Determine MIME type
    const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const mime = mimeMap[state.outputFormat] || 'image/jpeg';

    // Quality only applies to lossy formats
    const quality = (state.outputFormat === 'png') ? undefined : state.quality;

    const dataURL = canvas.toDataURL(mime, quality);
    const bytes   = estimateSize(dataURL);

    state.processedDataURL = dataURL;
    state.processedBytes   = bytes;

    // Update processed preview
    dom.previewProcessed.src = dataURL;
    dom.previewProcessed.classList.add('loaded');

    const saving = state.originalBytes > 0
      ? Math.round((1 - bytes / state.originalBytes) * 100)
      : 0;

    const savingLabel = saving > 0
      ? `<span style="color:var(--green-500);font-weight:700;">↓${saving}% saved</span>`
      : saving < 0
        ? `<span style="color:var(--red-500);font-weight:700;">↑${Math.abs(saving)}% larger</span>`
        : '';

    dom.metaProcessed.innerHTML =
      `<span class="size-highlight">${formatBytes(bytes)}</span> · ${outW}×${outH} ${savingLabel}`;

    clearError();
  });
  img.src = state.originalDataURL;
}

/* ============================================================
   DRAG & DROP
   ============================================================ */

dom.dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.dropZone.classList.add('drag-over');
});

dom.dropZone.addEventListener('dragleave', () => {
  dom.dropZone.classList.remove('drag-over');
});

dom.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// Keyboard activation for drop zone
dom.dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    dom.fileInput.click();
  }
});

dom.fileInput.addEventListener('change', () => {
  const file = dom.fileInput.files[0];
  if (file) loadFile(file);
  // Reset so same file can be re-selected
  dom.fileInput.value = '';
});

/* ============================================================
   MODE TOGGLE
   ============================================================ */

function switchMode(mode) {
  state.mode = mode;

  if (mode === 'compress') {
    dom.btnCompress.classList.add('active');
    dom.btnCompress.setAttribute('aria-selected', 'true');
    dom.btnResize.classList.remove('active');
    dom.btnResize.setAttribute('aria-selected', 'false');
    dom.panelCompress.classList.remove('hidden');
    dom.panelResize.classList.add('hidden');
  } else {
    dom.btnResize.classList.add('active');
    dom.btnResize.setAttribute('aria-selected', 'true');
    dom.btnCompress.classList.remove('active');
    dom.btnCompress.setAttribute('aria-selected', 'false');
    dom.panelResize.classList.remove('hidden');
    dom.panelCompress.classList.add('hidden');
  }

  processImage();
}

dom.btnCompress.addEventListener('click', () => switchMode('compress'));
dom.btnResize.addEventListener('click',   () => switchMode('resize'));

/* ============================================================
   COMPRESSION CONTROLS
   ============================================================ */

/**
 * Update slider background gradient to reflect current value.
 */
function updateSliderFill() {
  const pct = dom.qualitySlider.value;
  dom.qualitySlider.style.background =
    `linear-gradient(to right, var(--blue-600) 0%, var(--blue-600) ${pct}%, var(--slate-300) ${pct}%)`;
}

dom.qualitySlider.addEventListener('input', () => {
  const val = parseInt(dom.qualitySlider.value, 10);
  state.quality = val / 100;
  dom.qualityValue.textContent = `${val}%`;
  updateSliderFill();
  debounce(processImage, 80);
});

// Init slider fill
updateSliderFill();

/* ============================================================
   RESIZE CONTROLS
   ============================================================ */

dom.widthInput.addEventListener('input', () => {
  const w = parseInt(dom.widthInput.value, 10);
  if (!w || w < 1) return;
  state.targetWidth = w;

  if (state.lockAspect && state.aspectRatio) {
    const h = Math.round(w / state.aspectRatio);
    state.targetHeight = h;
    dom.heightInput.value = h;
  }

  debounce(processImage, 200);
});

dom.heightInput.addEventListener('input', () => {
  const h = parseInt(dom.heightInput.value, 10);
  if (!h || h < 1) return;
  state.targetHeight = h;

  if (state.lockAspect && state.aspectRatio) {
    const w = Math.round(h * state.aspectRatio);
    state.targetWidth = w;
    dom.widthInput.value = w;
  }

  debounce(processImage, 200);
});

/* Lock/Unlock aspect ratio */
function updateLockUI() {
  if (state.lockAspect) {
    dom.lockToggle.classList.remove('unlocked');
    dom.lockToggle.setAttribute('aria-pressed', 'true');
    dom.lockToggle.setAttribute('title', 'Aspect ratio locked — click to unlock');
  } else {
    dom.lockToggle.classList.add('unlocked');
    dom.lockToggle.setAttribute('aria-pressed', 'false');
    dom.lockToggle.setAttribute('title', 'Aspect ratio unlocked — click to lock');
  }
}

dom.lockToggle.addEventListener('click', () => {
  state.lockAspect = !state.lockAspect;
  updateLockUI();
});

dom.lockToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    state.lockAspect = !state.lockAspect;
    updateLockUI();
  }
});

updateLockUI();

/* Preset buttons */
dom.presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const pw = parseInt(btn.dataset.w, 10);
    const ph = parseInt(btn.dataset.h, 10);

    state.targetWidth  = pw;
    state.targetHeight = ph;
    dom.widthInput.value  = pw;
    dom.heightInput.value = ph;

    // When preset is applied, temporarily unlock aspect to allow non-original ratio
    // Update aspect ratio to match preset so further edits stay proportional
    state.aspectRatio = pw / ph;

    debounce(processImage, 100);
  });
});

/* ============================================================
   FORMAT SELECTION
   ============================================================ */

dom.fmtBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    dom.fmtBtns.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.outputFormat = btn.dataset.fmt;
    debounce(processImage, 80);
  });
});

/* ============================================================
   DOWNLOAD
   ============================================================ */

dom.btnDownload.addEventListener('click', () => {
  if (!state.processedDataURL) {
    showError('No processed image to download. Upload an image first.');
    return;
  }

  const extMap = { jpeg: 'jpg', png: 'png', webp: 'webp' };
  const ext    = extMap[state.outputFormat] || 'jpg';
  const filename = `optimized-image.${ext}`;

  const link = document.createElement('a');
  link.href     = state.processedDataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

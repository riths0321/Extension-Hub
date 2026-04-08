/* ── PDF FORGE · popup.js · v2.0 ── */

// Initialize dropdown system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize enhanced dropdowns
  if (window.PDFDropdowns) {
    window.PDFDropdowns.init();
  }
});

/* ── PDF HELPERS ── */
const FONT_FAMILY_MAP = {
  helvetica:    "Helvetica",
  arial:        "Helvetica",
  verdana:      "Helvetica",
  tahoma:       "Helvetica",
  times:        "Times-Roman",
  georgia:      "Times-Roman",
  garamond:     "Times-Roman",
  baskerville:  "Times-Roman",
  courier:      "Courier",
  "courier-new":"Courier",
  monaco:       "Courier",
  consolas:     "Courier"
};

function normalizeFontFamily(f) { return FONT_FAMILY_MAP[f] || "Helvetica"; }
function mmToPt(mm) { return mm * 2.8346456693; }

function escapePdfText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "");
}

function sanitizeFileName(fileName) {
  const trimmed = (fileName || "document").trim();
  return trimmed.replace(/[\\/:*?"<>|]/g, "_") || "document";
}

function estimateCharWidth(fontSize, fontFamily) {
  if (fontFamily === "Courier")     return fontSize * 0.6;
  if (fontFamily === "Times-Roman") return fontSize * 0.48;
  return fontSize * 0.53;
}

function wrapParagraph(text, maxWidth, fontSize, fontFamily) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  if (!words.length) return [""];
  const charWidth = estimateCharWidth(fontSize, fontFamily);
  const maxChars = Math.max(1, Math.floor(maxWidth / charWidth));
  let currentLine = "";
  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) { currentLine = candidate; return; }
    if (currentLine) { lines.push(currentLine); currentLine = ""; }
    if (word.length <= maxChars) { currentLine = word; return; }
    let start = 0;
    while (start < word.length) { lines.push(word.slice(start, start + maxChars)); start += maxChars; }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

function paginateText(text, settings, pageWidth, pageHeight) {
  const margin        = mmToPt(settings.margin);
  const fontSize      = settings.fontSize;
  const lineHeight    = mmToPt(settings.lineHeight);
  const availableWidth  = pageWidth - margin * 2;
  const topPadding    = settings.headerText ? fontSize + 12 : 0;
  const bottomPadding = (settings.footerText || settings.pageNumbers) ? fontSize + 16 : 0;
  const availableHeight = pageHeight - margin * 2 - topPadding - bottomPadding;
  const linesPerPage  = Math.max(1, Math.floor(availableHeight / lineHeight));
  const paragraphs    = text.split("\n");
  const lines = [];
  paragraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) { lines.push(""); return; }
    lines.push(...wrapParagraph(paragraph, availableWidth, fontSize, settings.fontFamily));
    if (index < paragraphs.length - 1) lines.push("");
  });
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  return {
    pages: pages.length ? pages : [[""]],
    layout: { margin, lineHeight, topPadding, availableWidth }
  };
}

function buildPageStream(pageLines, pageNumber, totalPages, settings, pageWidth, pageHeight, layout) {
  const commands  = [];
  const margin    = layout.margin;
  const bodyFontSize = settings.fontSize;
  const bodyStartY   = pageHeight - margin - layout.topPadding;
  const grayText     = "0.4 g";

  // Watermark
  if (settings.watermark && settings.watermarkText.trim()) {
    const wt    = escapePdfText(settings.watermarkText.trim());
    const wSize = Math.min(42, Math.max(24, bodyFontSize * 2.8));
    const wX    = Math.max(margin, pageWidth / 2 - (wt.length * wSize * 0.22) / 2);
    const wY    = pageHeight / 2;
    commands.push(
      "q", "0.92 g",
      `BT /F1 ${wSize} Tf 1 0 0 1 ${wX.toFixed(2)} ${wY.toFixed(2)} Tm (${wt}) Tj ET`,
      "Q"
    );
  }

  // Header
  if (settings.headerText.trim()) {
    const ht = escapePdfText(settings.headerText.trim());
    const hX = Math.max(margin, pageWidth / 2 - settings.headerText.trim().length * 2.1);
    commands.push(
      grayText,
      `BT /F1 9 Tf 1 0 0 1 ${hX.toFixed(2)} ${(pageHeight - margin + 2).toFixed(2)} Tm (${ht}) Tj ET`
    );
  }

  // Body text
  commands.push("0 g");
  pageLines.forEach((line, index) => {
    const y = bodyStartY - index * layout.lineHeight;
    if (y <= margin) return;
    commands.push(
      `BT /F1 ${bodyFontSize} Tf 1 0 0 1 ${margin.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(line)}) Tj ET`
    );
  });

  // Footer / page numbers
  if (settings.footerText.trim() || settings.pageNumbers) {
    const parts = [];
    if (settings.footerText.trim()) parts.push(settings.footerText.trim());
    if (settings.pageNumbers) parts.push(`Page ${pageNumber} of ${totalPages}`);
    const ft = escapePdfText(parts.join("   "));
    const fX = Math.max(margin, pageWidth / 2 - parts.join("   ").length * 2.1);
    commands.push(
      grayText,
      `BT /F1 9 Tf 1 0 0 1 ${fX.toFixed(2)} ${(margin - 2).toFixed(2)} Tm (${ft}) Tj ET`
    );
  }

  return commands.join("\n");
}

function getPageDimensions(orientation, pageSize) {
  const dim = {
    a4:     { portrait: [210, 297],   landscape: [297, 210] },
    letter: { portrait: [215.9, 279.4], landscape: [279.4, 215.9] },
    legal:  { portrait: [215.9, 355.6], landscape: [355.6, 215.9] }
  };
  return dim[pageSize][orientation];
}

function buildPdfBlob(text, settings) {
  const [wMm, hMm]    = getPageDimensions(settings.orientation, settings.pageSize);
  const pageWidth     = mmToPt(wMm);
  const pageHeight    = mmToPt(hMm);
  const { pages, layout } = paginateText(text, settings, pageWidth, pageHeight);
  const fontFamily    = normalizeFontFamily(settings.fontFamily);
  const objects       = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const kids = [];

  pages.forEach((pageLines, index) => {
    const pObj = 4 + index * 2;
    const cObj = pObj + 1;
    kids.push(`${pObj} 0 R`);
    const stream = buildPageStream(
      pageLines, index + 1, pages.length,
      { ...settings, fontFamily }, pageWidth, pageHeight, layout
    );
    objects[pObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cObj} 0 R >>`;
    objects[cObj] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /${fontFamily} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob, fileName) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── DOM REFS ── */
const textInput         = document.getElementById("textInput");
const fileNameInput     = document.getElementById("fileName");
const pdfBtn            = document.getElementById("pdfBtn");
const formatToggle      = document.getElementById("formatToggle");
const watermarkToggle   = document.getElementById("watermarkToggle");
const pageNumbersToggle = document.getElementById("pageNumbersToggle");
const progressContainer = document.getElementById("progressContainer");
const progressFill      = document.getElementById("progressFill");
const alertDiv          = document.getElementById("alert");
const pageSizeSelect    = document.getElementById("pageSize");
const orientationSelect = document.getElementById("orientation");
const marginSlider      = document.getElementById("margin");
const marginValue       = document.getElementById("marginValue");
const fontSizeSlider    = document.getElementById("fontSize");
const fontSizeValue     = document.getElementById("fontSizeValue");
const fontFamilySelect  = document.getElementById("fontFamily");
const lineHeightSlider  = document.getElementById("lineHeight");
const lineHeightValue   = document.getElementById("lineHeightValue");
const saveSettingsBtn   = document.getElementById("saveSettingsBtn");
const watermarkTextInput= document.getElementById("watermarkText");
const headerTextInput   = document.getElementById("headerText");
const footerTextInput   = document.getElementById("footerText");
const autoSaveToggle    = document.getElementById("autoSaveToggle");
const quickPreset       = document.getElementById("quickPreset");
const charCountSpan     = document.getElementById("charCount");
const wordCountSpan     = document.getElementById("wordCount");
const lineCountSpan     = document.getElementById("lineCount");

/* ── TABS ── */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const pane = document.getElementById(`${target}-tab`);
    if (pane) pane.classList.add('active');
  });
});

/* ── PRESETS ── */
const presets = {
  standard: { margin: 15, fontSize: 11, lineHeight: 7,   pageSize: 'a4',     orientation: 'portrait', fontFamily: 'helvetica' },
  compact:  { margin: 10, fontSize: 9,  lineHeight: 5,   pageSize: 'a4',     orientation: 'portrait', fontFamily: 'courier'   },
  readable: { margin: 20, fontSize: 13, lineHeight: 8.5, pageSize: 'letter', orientation: 'portrait', fontFamily: 'times'     }
};

function applyPreset(name) {
  const p = presets[name];
  if (!p) return;
  if (marginSlider)     { marginSlider.value = p.margin;        if (marginValue) marginValue.textContent = `${p.margin}mm`; }
  if (fontSizeSlider)   { fontSizeSlider.value = p.fontSize;    if (fontSizeValue) fontSizeValue.textContent = `${p.fontSize}pt`; }
  if (lineHeightSlider) { lineHeightSlider.value = p.lineHeight; if (lineHeightValue) lineHeightValue.textContent = `${p.lineHeight}pt`; }
  if (pageSizeSelect)    pageSizeSelect.value    = p.pageSize;
  if (orientationSelect) orientationSelect.value = p.orientation;
  if (fontFamilySelect)  fontFamilySelect.value  = p.fontFamily;
  if (quickPreset)       quickPreset.value        = name;
  document.querySelectorAll('.preset-card').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-preset') === name);
  });
}

document.querySelectorAll('.preset-card').forEach(card => {
  card.addEventListener('click', () => {
    const name = card.getAttribute('data-preset');
    applyPreset(name);
    showAlert(`✓ ${name.charAt(0).toUpperCase() + name.slice(1)} preset applied`, 'success');
    if (autoSaveToggle && autoSaveToggle.checked) saveSettings();
  });
});

if (quickPreset) {
  quickPreset.addEventListener('change', () => {
    applyPreset(quickPreset.value);
    showAlert(`✓ ${quickPreset.value.charAt(0).toUpperCase() + quickPreset.value.slice(1)} preset applied`, 'success');
  });
}

/* ── SMART FORMAT ── */
function smartFormat(text) {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([A-Z]{5,})/g, "\n$1\n")
    .replace(/(\d+\.\s+[A-Z])/g, "\n$1")
    .split('\n').map(l => l.trim()).filter(l => l).join('\n');
}

/* ── STATS ── */
function updateStats() {
  if (!textInput) return;
  const text = textInput.value;
  if (charCountSpan) charCountSpan.textContent = text.length;
  if (wordCountSpan) wordCountSpan.textContent = text.split(/\s+/).filter(w => w).length;
  if (lineCountSpan) lineCountSpan.textContent = text.split('\n').length;
}
if (textInput) textInput.addEventListener('input', updateStats);

/* ── ALERT ── */
function showAlert(msg, type = 'success') {
  if (!alertDiv) return;
  alertDiv.textContent = msg;
  alertDiv.className   = `alert-box ${type}`;
  alertDiv.classList.add('visible'); 
  setTimeout(() => { if (alertDiv) alertDiv.classList.remove('visible'); }, 3000);  
}

/* ── PROGRESS ── */
function updateProgress(pct) {
  if (progressFill) progressFill.style.width = `${pct}%`;
  const label = document.getElementById('progressLabel');
  if (label) {
    if      (pct < 30) label.textContent = 'Preparing document…';
    else if (pct < 60) label.textContent = 'Formatting content…';
    else if (pct < 90) label.textContent = 'Building PDF…';
    else               label.textContent = 'Finalizing…';
  }
}

/* ── SETTINGS ── */
function saveSettings() {
  const s = {
    pageSize:        pageSizeSelect?.value    || 'a4',
    orientation:     orientationSelect?.value || 'portrait',
    margin:          marginSlider?.value      || 15,
    fontSize:        fontSizeSlider?.value    || 11,
    fontFamily:      fontFamilySelect?.value  || 'helvetica',
    lineHeight:      lineHeightSlider?.value  || 7,
    watermarkText:   watermarkTextInput?.value || 'CONFIDENTIAL',
    headerText:      headerTextInput?.value   || '',
    footerText:      footerTextInput?.value   || '',
    formatToggle:    formatToggle?.checked    || false,
    watermarkToggle: watermarkToggle?.checked || false,
    pageNumbersToggle: pageNumbersToggle?.checked || false,
    autoSaveToggle:  autoSaveToggle?.checked  || false
  };
  chrome.storage.local.set({ pdfSettings: s }, () => showAlert('✓ Settings saved', 'success'));
}

function loadSettings() {
  chrome.storage.local.get(['pdfSettings'], (result) => {
    if (!result.pdfSettings) return;
    const s = result.pdfSettings;
    if (pageSizeSelect)    pageSizeSelect.value    = s.pageSize    || 'a4';
    if (orientationSelect) orientationSelect.value = s.orientation || 'portrait';
    if (marginSlider)      { marginSlider.value = s.margin || 15;        if (marginValue) marginValue.textContent = `${marginSlider.value}mm`; }
    if (fontSizeSlider)    { fontSizeSlider.value = s.fontSize || 11;    if (fontSizeValue) fontSizeValue.textContent = `${fontSizeSlider.value}pt`; }
    if (fontFamilySelect)  fontFamilySelect.value  = s.fontFamily  || 'helvetica';
    if (lineHeightSlider)  { lineHeightSlider.value = s.lineHeight || 7; if (lineHeightValue) lineHeightValue.textContent = `${lineHeightSlider.value}pt`; }
    if (watermarkTextInput) watermarkTextInput.value = s.watermarkText || 'CONFIDENTIAL';
    if (headerTextInput)   headerTextInput.value   = s.headerText   || '';
    if (footerTextInput)   footerTextInput.value   = s.footerText   || '';
    if (formatToggle)      formatToggle.checked      = s.formatToggle      || false;
    if (watermarkToggle)   watermarkToggle.checked   = s.watermarkToggle   || false;
    if (pageNumbersToggle) pageNumbersToggle.checked = s.pageNumbersToggle || false;
    if (autoSaveToggle)    autoSaveToggle.checked    = s.autoSaveToggle    || false;
  });
}

/* ── SLIDER LISTENERS ── */
if (marginSlider)     marginSlider.addEventListener('input',     () => { if (marginValue) marginValue.textContent = `${marginSlider.value}mm`;         if (autoSaveToggle?.checked) saveSettings(); });
if (fontSizeSlider)   fontSizeSlider.addEventListener('input',   () => { if (fontSizeValue) fontSizeValue.textContent = `${fontSizeSlider.value}pt`;   if (autoSaveToggle?.checked) saveSettings(); });
if (lineHeightSlider) lineHeightSlider.addEventListener('input', () => { if (lineHeightValue) lineHeightValue.textContent = `${lineHeightSlider.value}pt`; if (autoSaveToggle?.checked) saveSettings(); });
if (saveSettingsBtn)  saveSettingsBtn.addEventListener('click', saveSettings);

[pageSizeSelect, orientationSelect, fontFamilySelect,
 watermarkTextInput, headerTextInput, footerTextInput,
 formatToggle, watermarkToggle, pageNumbersToggle]
  .forEach(el => el && el.addEventListener('change', () => {
    if (autoSaveToggle?.checked) saveSettings();
  }));

/* ── GENERATE PDF ── */
if (pdfBtn) {
  pdfBtn.addEventListener("click", async () => {
    let text      = textInput?.value.trim() || '';
    const fileName = `${sanitizeFileName(fileNameInput?.value || "document")}.pdf`;

    if (!text) { showAlert('Please enter some text first', 'error'); return; }

    if (progressContainer) progressContainer.style.display = 'block';
    updateProgress(10);

    if (formatToggle?.checked) text = smartFormat(text);
    updateProgress(30);

    const settings = {
      pageSize:      pageSizeSelect?.value      || 'a4',
      orientation:   orientationSelect?.value   || 'portrait',
      margin:        parseInt(marginSlider?.value || 15),
      fontSize:      parseInt(fontSizeSlider?.value || 11),
      fontFamily:    fontFamilySelect?.value    || 'helvetica',
      lineHeight:    parseFloat(lineHeightSlider?.value || 7),
      watermark:     watermarkToggle?.checked   || false,
      watermarkText: watermarkTextInput?.value  || 'CONFIDENTIAL',
      pageNumbers:   pageNumbersToggle?.checked || false,
      headerText:    headerTextInput?.value     || '',
      footerText:    footerTextInput?.value     || ''
    };

    updateProgress(55);
    const pdfBlob = buildPdfBlob(text, settings);
    updateProgress(85);

    setTimeout(() => {
      downloadBlob(pdfBlob, fileName);
      if (progressContainer) progressContainer.style.display = 'none';
      showAlert('✓ PDF generated and downloading…', 'success');
      updateProgress(0);
    }, 180);
  });
}

/* ── INIT ── */
loadSettings();
if (textInput) updateStats();
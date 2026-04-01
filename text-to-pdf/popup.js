const FONT_FAMILY_MAP = {
  helvetica: "Helvetica",
  arial: "Helvetica",
  verdana: "Helvetica",
  tahoma: "Helvetica",
  times: "Times-Roman",
  georgia: "Times-Roman",
  garamond: "Times-Roman",
  baskerville: "Times-Roman",
  courier: "Courier",
  "courier-new": "Courier",
  monaco: "Courier",
  consolas: "Courier"
};

function normalizeFontFamily(fontFamily) {
  return FONT_FAMILY_MAP[fontFamily] || "Helvetica";
}

function mmToPt(mm) {
  return mm * 2.8346456693;
}

function escapePdfText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "");
}

function sanitizeFileName(fileName) {
  const trimmed = (fileName || "document").trim();
  const safeName = trimmed.replace(/[\\/:*?"<>|]/g, "_");
  return safeName || "document";
}

function estimateCharWidth(fontSize, fontFamily) {
  if (fontFamily === "Courier") {
    return fontSize * 0.6;
  }

  if (fontFamily === "Times-Roman") {
    return fontSize * 0.48;
  }

  return fontSize * 0.53;
}

function wrapParagraph(text, maxWidth, fontSize, fontFamily) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];

  if (!words.length) {
    return [""];
  }

  const charWidth = estimateCharWidth(fontSize, fontFamily);
  const maxChars = Math.max(1, Math.floor(maxWidth / charWidth));
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxChars) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (word.length <= maxChars) {
      currentLine = word;
      return;
    }

    let start = 0;
    while (start < word.length) {
      lines.push(word.slice(start, start + maxChars));
      start += maxChars;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function paginateText(text, settings, pageWidth, pageHeight) {
  const margin = mmToPt(settings.margin);
  const fontSize = settings.fontSize;
  const lineHeight = mmToPt(settings.lineHeight);
  const availableWidth = pageWidth - (margin * 2);
  const topPadding = settings.headerText ? fontSize + 12 : 0;
  const bottomPadding = settings.footerText || settings.pageNumbers ? fontSize + 16 : 0;
  const watermarkPadding = settings.watermark ? 8 : 0;
  const availableHeight = pageHeight - (margin * 2) - topPadding - bottomPadding - watermarkPadding;
  const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));
  const paragraphs = text.split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    lines.push(...wrapParagraph(paragraph, availableWidth, fontSize, settings.fontFamily));

    if (index < paragraphs.length - 1) {
      lines.push("");
    }
  });

  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  return {
    pages: pages.length ? pages : [[""]],
    layout: {
      margin,
      lineHeight,
      topPadding,
      availableWidth
    }
  };
}

function buildPageStream(pageLines, pageNumber, totalPages, settings, pageWidth, pageHeight, layout) {
  const commands = [];
  const margin = layout.margin;
  const bodyFontSize = settings.fontSize;
  const bodyStartY = pageHeight - margin - layout.topPadding;
  const grayText = "0.4 g";

  if (settings.watermark && settings.watermarkText.trim()) {
    const watermarkText = escapePdfText(settings.watermarkText.trim());
    const watermarkSize = Math.min(42, Math.max(24, bodyFontSize * 2.8));
    const watermarkX = Math.max(margin, (pageWidth / 2) - ((watermarkText.length * watermarkSize * 0.22) / 2));
    const watermarkY = pageHeight / 2;
    commands.push("q");
    commands.push("0.92 g");
    commands.push(`BT /F1 ${watermarkSize} Tf 1 0 0 1 ${watermarkX.toFixed(2)} ${watermarkY.toFixed(2)} Tm (${watermarkText}) Tj ET`);
    commands.push("Q");
  }

  if (settings.headerText.trim()) {
    const headerText = escapePdfText(settings.headerText.trim());
    const headerX = Math.max(margin, (pageWidth / 2) - (settings.headerText.trim().length * 2.1));
    const headerY = pageHeight - margin + 2;
    commands.push(grayText);
    commands.push(`BT /F1 9 Tf 1 0 0 1 ${headerX.toFixed(2)} ${headerY.toFixed(2)} Tm (${headerText}) Tj ET`);
  }

  commands.push("0 g");
  pageLines.forEach((line, index) => {
    const y = bodyStartY - (index * layout.lineHeight);
    if (y <= margin) {
      return;
    }

    const safeLine = escapePdfText(line);
    commands.push(`BT /F1 ${bodyFontSize} Tf 1 0 0 1 ${margin.toFixed(2)} ${y.toFixed(2)} Tm (${safeLine}) Tj ET`);
  });

  if (settings.footerText.trim() || settings.pageNumbers) {
    const footerParts = [];
    if (settings.footerText.trim()) {
      footerParts.push(settings.footerText.trim());
    }
    if (settings.pageNumbers) {
      footerParts.push(`Page ${pageNumber} of ${totalPages}`);
    }

    const footerText = escapePdfText(footerParts.join("   "));
    const footerX = Math.max(margin, (pageWidth / 2) - (footerParts.join("   ").length * 2.1));
    const footerY = margin - 2;
    commands.push(grayText);
    commands.push(`BT /F1 9 Tf 1 0 0 1 ${footerX.toFixed(2)} ${footerY.toFixed(2)} Tm (${footerText}) Tj ET`);
  }

  return commands.join("\n");
}

function buildPdfBlob(text, settings) {
  const [pageWidthMm, pageHeightMm] = getPageDimensions(settings.orientation, settings.pageSize);
  const pageWidth = mmToPt(pageWidthMm);
  const pageHeight = mmToPt(pageHeightMm);
  const { pages, layout } = paginateText(text, settings, pageWidth, pageHeight);
  const fontFamily = normalizeFontFamily(settings.fontFamily);
  const objects = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const kids = [];

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 4 + (index * 2);
    const contentObjectNumber = pageObjectNumber + 1;
    kids.push(`${pageObjectNumber} 0 R`);

    const stream = buildPageStream(
      pageLines,
      index + 1,
      pages.length,
      { ...settings, fontFamily },
      pageWidth,
      pageHeight,
      layout
    );

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
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
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// DOM Elements
const textInput = document.getElementById("textInput");
const fileNameInput = document.getElementById("fileName");
const pdfBtn = document.getElementById("pdfBtn");
const formatToggle = document.getElementById("formatToggle");
const watermarkToggle = document.getElementById("watermarkToggle");
const pageNumbersToggle = document.getElementById("pageNumbersToggle");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const alertDiv = document.getElementById("alert");

// Settings Elements
const pageSizeSelect = document.getElementById("pageSize");
const orientationSelect = document.getElementById("orientation");
const marginSlider = document.getElementById("margin");
const marginValue = document.getElementById("marginValue");
const fontSizeSlider = document.getElementById("fontSize");
const fontSizeValue = document.getElementById("fontSizeValue");
const fontFamilySelect = document.getElementById("fontFamily");
const lineHeightSlider = document.getElementById("lineHeight");
const lineHeightValue = document.getElementById("lineHeightValue");
const watermarkTextInput = document.getElementById("watermarkText");
const headerTextInput = document.getElementById("headerText");
const footerTextInput = document.getElementById("footerText");
const autoSaveToggle = document.getElementById("autoSaveToggle");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// Stats Elements
const charCountSpan = document.getElementById("charCount");
const wordCountSpan = document.getElementById("wordCount");
const lineCountSpan = document.getElementById("lineCount");

// Tab switching - FIXED
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.getAttribute('data-tab');
    
    // Remove active class from all tabs and contents
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Show corresponding content
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) {
      activeContent.classList.add('active');
    }
  });
});

// Preset configurations
const presets = {
  standard: {
    margin: 15,
    fontSize: 11,
    lineHeight: 7,
    pageSize: 'a4',
    orientation: 'portrait',
    fontFamily: 'helvetica'
  },
  compact: {
    margin: 10,
    fontSize: 9,
    lineHeight: 5,
    pageSize: 'a4',
    orientation: 'portrait',
    fontFamily: 'helvetica'
  },
  readable: {
    margin: 20,
    fontSize: 13,
    lineHeight: 8.5,
    pageSize: 'letter',
    orientation: 'portrait',
    fontFamily: 'times'
  }
};

// Apply preset - FIXED
const presetBtns = document.querySelectorAll('.preset-card');
if (presetBtns) {
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.getAttribute('data-preset');
      const preset = presets[presetName];
      
      if (preset) {
        presetBtns.forEach(presetBtn => presetBtn.classList.remove('active'));
        btn.classList.add('active');

        // Apply preset values
        if (marginSlider) marginSlider.value = preset.margin;
        if (marginValue) marginValue.textContent = `${preset.margin}mm`;
        
        if (fontSizeSlider) fontSizeSlider.value = preset.fontSize;
        if (fontSizeValue) fontSizeValue.textContent = `${preset.fontSize}pt`;
        
        if (lineHeightSlider) lineHeightSlider.value = preset.lineHeight;
        if (lineHeightValue) lineHeightValue.textContent = `${preset.lineHeight}pt`;
        
        if (pageSizeSelect) pageSizeSelect.value = preset.pageSize;
        if (orientationSelect) orientationSelect.value = preset.orientation;
        if (fontFamilySelect) fontFamilySelect.value = preset.fontFamily;
        
        showAlert(`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} preset applied!`, 'success');
        
        // Auto-save if enabled
        if (autoSaveToggle && autoSaveToggle.checked) {
          saveSettings();
        }
      }
    });
  });
}

// Smart Formatting
function smartFormat(text) {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([A-Z]{5,})/g, "\n$1\n")
    .replace(/(\d+\.\s+[A-Z])/g, "\n$1")
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');
}

// Get page dimensions
function getPageDimensions(orientation, pageSize) {
  const dimensions = {
    a4: { portrait: [210, 297], landscape: [297, 210] },
    letter: { portrait: [215.9, 279.4], landscape: [279.4, 215.9] },
    legal: { portrait: [215.9, 355.6], landscape: [355.6, 215.9] }
  };
  return dimensions[pageSize][orientation];
}

// Show alert message
function showAlert(message, type = 'success') {
  if (!alertDiv) return;
  alertDiv.textContent = message;
  alertDiv.className = `alert alert-${type}`;
  alertDiv.style.display = 'block';
  setTimeout(() => {
    if (alertDiv) alertDiv.style.display = 'none';
  }, 3000);
}

// Update progress
function updateProgress(percent) {
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
}

// Update text stats
function updateStats() {
  if (!textInput) return;
  const text = textInput.value;
  if (charCountSpan) charCountSpan.textContent = text.length;
  if (wordCountSpan) wordCountSpan.textContent = text.split(/\s+/).filter(w => w.length > 0).length;
  if (lineCountSpan) lineCountSpan.textContent = text.split('\n').length;
}

if (textInput) {
  textInput.addEventListener('input', updateStats);
}

// Save settings to localStorage
function saveSettings() {
  const settings = {
    pageSize: pageSizeSelect ? pageSizeSelect.value : 'a4',
    orientation: orientationSelect ? orientationSelect.value : 'portrait',
    margin: marginSlider ? marginSlider.value : 15,
    fontSize: fontSizeSlider ? fontSizeSlider.value : 11,
    fontFamily: fontFamilySelect ? fontFamilySelect.value : 'helvetica',
    lineHeight: lineHeightSlider ? lineHeightSlider.value : 7,
    watermarkText: watermarkTextInput ? watermarkTextInput.value : 'CONFIDENTIAL',
    headerText: headerTextInput ? headerTextInput.value : '',
    footerText: footerTextInput ? footerTextInput.value : '',
    formatToggle: formatToggle ? formatToggle.checked : false,
    watermarkToggle: watermarkToggle ? watermarkToggle.checked : false,
    pageNumbersToggle: pageNumbersToggle ? pageNumbersToggle.checked : false,
    autoSaveToggle: autoSaveToggle ? autoSaveToggle.checked : false
  };
  
  chrome.storage.local.set({ pdfSettings: settings }, () => {
    showAlert('Settings saved!', 'success');
  });
}

// Load settings from localStorage
function loadSettings() {
  chrome.storage.local.get(['pdfSettings'], (result) => {
    if (result.pdfSettings) {
      const s = result.pdfSettings;
      
      if (pageSizeSelect) pageSizeSelect.value = s.pageSize || 'a4';
      if (orientationSelect) orientationSelect.value = s.orientation || 'portrait';
      
      if (marginSlider) {
        marginSlider.value = s.margin || 15;
        if (marginValue) marginValue.textContent = `${marginSlider.value}mm`;
      }
      
      if (fontSizeSlider) {
        fontSizeSlider.value = s.fontSize || 11;
        if (fontSizeValue) fontSizeValue.textContent = `${fontSizeSlider.value}pt`;
      }
      
      if (fontFamilySelect) {
        fontFamilySelect.value = s.fontFamily || 'helvetica';
      }
      
      if (lineHeightSlider) {
        lineHeightSlider.value = s.lineHeight || 7;
        if (lineHeightValue) lineHeightValue.textContent = `${lineHeightSlider.value}pt`;
      }
      
      if (watermarkTextInput) watermarkTextInput.value = s.watermarkText || 'CONFIDENTIAL';
      if (headerTextInput) headerTextInput.value = s.headerText || '';
      if (footerTextInput) footerTextInput.value = s.footerText || '';
      
      if (formatToggle) formatToggle.checked = s.formatToggle || false;
      if (watermarkToggle) watermarkToggle.checked = s.watermarkToggle || false;
      if (pageNumbersToggle) pageNumbersToggle.checked = s.pageNumbersToggle || false;
      if (autoSaveToggle) autoSaveToggle.checked = s.autoSaveToggle || false;
    }
  });
}

// Generate PDF
if (pdfBtn) {
  pdfBtn.addEventListener("click", async () => {
    let text = textInput ? textInput.value.trim() : '';
    const fileName = `${sanitizeFileName(fileNameInput ? fileNameInput.value : "document")}.pdf`;
    
    if (!text) {
      showAlert('Please enter some text!', 'error');
      return;
    }
    
    // Show progress
    if (progressContainer) progressContainer.style.display = 'block';
    updateProgress(10);
    
    // Apply smart formatting if enabled
    if (formatToggle && formatToggle.checked) {
      text = smartFormat(text);
      updateProgress(20);
    }
    
    // Get settings
    const settings = {
      pageSize: pageSizeSelect ? pageSizeSelect.value : 'a4',
      orientation: orientationSelect ? orientationSelect.value : 'portrait',
      margin: marginSlider ? parseInt(marginSlider.value) : 15,
      fontSize: fontSizeSlider ? parseInt(fontSizeSlider.value) : 11,
      fontFamily: fontFamilySelect ? fontFamilySelect.value : 'helvetica',
      lineHeight: lineHeightSlider ? parseFloat(lineHeightSlider.value) : 7,
      watermark: watermarkToggle ? watermarkToggle.checked : false,
      watermarkText: watermarkTextInput ? watermarkTextInput.value : 'CONFIDENTIAL',
      pageNumbers: pageNumbersToggle ? pageNumbersToggle.checked : false,
      headerText: headerTextInput ? headerTextInput.value : '',
      footerText: footerTextInput ? footerTextInput.value : ''
    };
    
    updateProgress(45);

    const pdfBlob = buildPdfBlob(text, settings);

    updateProgress(85);

    setTimeout(() => {
      downloadBlob(pdfBlob, fileName);
      if (progressContainer) progressContainer.style.display = 'none';
      showAlert('PDF generated successfully!', 'success');
      updateProgress(0);
    }, 150);
  });
}

// Range slider displays
if (marginSlider) {
  marginSlider.addEventListener('input', () => {
    if (marginValue) marginValue.textContent = `${marginSlider.value}mm`;
    if (autoSaveToggle && autoSaveToggle.checked) saveSettings();
  });
}

if (fontSizeSlider) {
  fontSizeSlider.addEventListener('input', () => {
    if (fontSizeValue) fontSizeValue.textContent = `${fontSizeSlider.value}pt`;
    if (autoSaveToggle && autoSaveToggle.checked) saveSettings();
  });
}

if (lineHeightSlider) {
  lineHeightSlider.addEventListener('input', () => {
    if (lineHeightValue) lineHeightValue.textContent = `${lineHeightSlider.value}pt`;
    if (autoSaveToggle && autoSaveToggle.checked) saveSettings();
  });
}

// Save settings button
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', saveSettings);
}

// Auto-save when toggles change
const autoSaveElements = [pageSizeSelect, orientationSelect, fontFamilySelect, 
  watermarkTextInput, headerTextInput, footerTextInput, formatToggle, 
  watermarkToggle, pageNumbersToggle];

autoSaveElements.forEach(el => {
  if (el) {
    el.addEventListener('change', () => {
      if (autoSaveToggle && autoSaveToggle.checked) {
        saveSettings();
      }
    });
  }
});

// Load saved settings on startup
loadSettings();
if (textInput) updateStats();

/* ============================================
   PDF Previewer Pro — popup.js
   Features: Drag & Drop, Recent Files, URL Load,
   Zoom, Theme Toggle, File Info, Fullscreen
   ============================================ */

// ===== DOM REFERENCES =====
const fileInput        = document.getElementById("fileInput");
const selectFileBtn    = document.getElementById("selectFileBtn");
const openFullBtn      = document.getElementById("openFullBtn");
const themeToggle      = document.getElementById("themeToggle");
const sunIcon          = document.getElementById("sunIcon");
const moonIcon         = document.getElementById("moonIcon");
const dropZone         = document.getElementById("dropZone");
const urlInput         = document.getElementById("urlInput");
const loadUrlBtn       = document.getElementById("loadUrlBtn");
const urlStatus        = document.getElementById("urlStatus");
const pdfViewer        = document.getElementById("pdfViewer");
const viewerContainer  = document.getElementById("viewerContainer");
const viewerPlaceholder= document.getElementById("viewerPlaceholder");
const viewerToolbar    = document.getElementById("viewerToolbar");
const fileInfoBar      = document.getElementById("fileInfoBar");
const fileNameDisplay  = document.getElementById("fileNameDisplay");
const fileSizeDisplay  = document.getElementById("fileSizeDisplay");
const clearPdfBtn      = document.getElementById("clearPdfBtn");
const zoomInBtn        = document.getElementById("zoomInBtn");
const zoomOutBtn       = document.getElementById("zoomOutBtn");
const zoomResetBtn     = document.getElementById("zoomResetBtn");
const zoomLevel        = document.getElementById("zoomLevel");
const recentList       = document.getElementById("recentList");
const clearRecentBtn   = document.getElementById("clearRecentBtn");
const loadingSpinner   = document.getElementById("loadingSpinner");

// ===== STATE =====
let currentZoom = 100;
const ZOOM_STEP = 25;
const ZOOM_MIN  = 50;
const ZOOM_MAX  = 200;
const MAX_RECENT = 6;
let activeViewerUrl = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadRecentFiles();
  setupTabs();
  setupDragDrop();
  checkStoredPDF();
});

// ===== THEME =====
function loadTheme() {
  chrome.storage.local.get("theme", ({ theme }) => {
    applyTheme(theme || "light");
  });
}

function applyTheme(theme) {
  document.body.className = theme;
  if (theme === "dark") {
    sunIcon.style.display = "block";
    moonIcon.style.display = "none";
  } else {
    sunIcon.style.display = "none";
    moonIcon.style.display = "block";
  }
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
  showToast(next === "dark" ? "Dark mode" : "Light mode");
});

// ===== TABS =====
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panelId = "tab-" + btn.dataset.tab;
      document.getElementById(panelId).classList.add("active");
      if (btn.dataset.tab === "recent") loadRecentFiles();
    });
  });
}

// ===== FILE SELECTION =====
selectFileBtn.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", (e) => {
  if (e.target !== selectFileBtn) fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) processFile(file);
});

// ===== DRAG & DROP =====
function setupDragDrop() {
  ["dragenter", "dragover"].forEach(event => {
    dropZone.addEventListener(event, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "dragend"].forEach(event => {
    dropZone.addEventListener(event, () => {
      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== "application/pdf") {
      showToast("Please drop a PDF file", "error");
      return;
    }
    processFile(file);
  });

  // Also listen on body for accidental drops
  document.body.addEventListener("dragover", (e) => e.preventDefault());
  document.body.addEventListener("drop", (e) => e.preventDefault());
}

// ===== PROCESS FILE =====
function processFile(file) {
  if (file.type !== "application/pdf") {
    showToast("Only PDF files are supported", "error");
    return;
  }

  showLoading(true);

  const fileURL = URL.createObjectURL(file);
  loadPDFViewer(fileURL, file.name, file.size);

  // Store base64 for fullscreen tab + save to recent
  const reader = new FileReader();
  reader.onload = function () {
    chrome.storage.local.set({
      fullPDF: reader.result,
      fullPDFName: file.name
    });
    saveToRecent(file.name, file.size, null);
    showToast("PDF loaded successfully");
  };
  reader.readAsDataURL(file);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read PDF data"));
    reader.readAsDataURL(blob);
  });
}

function getOriginPattern(url) {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}/*`;
}

function ensureUrlPermission(url) {
  return new Promise((resolve, reject) => {
    const originPattern = getOriginPattern(url);
    chrome.permissions.contains({ origins: [originPattern] }, (contains) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (contains) {
        resolve();
        return;
      }

      chrome.permissions.request({ origins: [originPattern] }, (granted) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!granted) {
          reject(new Error("Permission denied for this website"));
          return;
        }

        resolve();
      });
    });
  });
}

async function fetchPdfBlob(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const sourceBlob = await response.blob();
  const contentType = (response.headers.get("content-type") || sourceBlob.type || "").toLowerCase();
  const looksLikePdf = contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) {
    throw new Error("The URL did not return a PDF file");
  }

  return sourceBlob.type === "application/pdf"
    ? sourceBlob
    : new Blob([sourceBlob], { type: "application/pdf" });
}

// ===== LOAD PDF VIEWER =====
function loadPDFViewer(url, name, size) {
  // Switch to upload tab so viewer is visible
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelector('[data-tab="upload"]').classList.add("active");
  document.getElementById("tab-upload").classList.add("active");

  // Hide drop zone, show viewer
  dropZone.style.display = "none";
  viewerContainer.classList.remove("hidden");
  viewerToolbar.classList.remove("hidden");
  fileInfoBar.classList.remove("hidden");

  // Update file info
  fileNameDisplay.textContent = name || "document.pdf";
  fileSizeDisplay.textContent = formatFileSize(size || 0);

  // Load embed
  if (activeViewerUrl && activeViewerUrl.startsWith("blob:")) {
    URL.revokeObjectURL(activeViewerUrl);
  }
  activeViewerUrl = url;
  pdfViewer.style.display = "none";
  loadingSpinner.style.display = "flex";
  pdfViewer.src = url;

  pdfViewer.onload = () => {
    showLoading(false);
    pdfViewer.style.display = "block";
  };

  // Fallback: show viewer after 1.5s
  setTimeout(() => {
    showLoading(false);
    pdfViewer.style.display = "block";
  }, 1500);

  resetZoom();
}

function showLoading(show) {
  loadingSpinner.style.display = show ? "flex" : "none";
}

// ===== CLEAR PDF =====
clearPdfBtn.addEventListener("click", () => {
  if (activeViewerUrl && activeViewerUrl.startsWith("blob:")) {
    URL.revokeObjectURL(activeViewerUrl);
  }
  activeViewerUrl = null;
  pdfViewer.src = "";
  pdfViewer.style.display = "none";
  viewerContainer.classList.add("hidden");
  viewerToolbar.classList.add("hidden");
  fileInfoBar.classList.add("hidden");
  dropZone.style.display = "";
  chrome.storage.local.remove(["fullPDF", "fullPDFName", "fullPDFUrl"]);
  showToast("PDF cleared");
  fileInput.value = "";
});

// ===== CHECK STORED PDF (restore on popup open) =====
function checkStoredPDF() {
  chrome.storage.local.get(["fullPDF", "fullPDFName"], (data) => {
    if (data.fullPDF && data.fullPDFName) {
      // Rebuild blob URL from stored base64
      const base64 = data.fullPDF.split(",")[1];
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobURL = URL.createObjectURL(blob);
      const sizeApprox = Math.round(byteArray.length);
      loadPDFViewer(blobURL, data.fullPDFName, sizeApprox);
    }
  });
}

// ===== URL LOADING =====
loadUrlBtn.addEventListener("click", loadFromURL);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadFromURL();
});

function loadFromURL() {
  const url = urlInput.value.trim();
  if (!url) {
    showUrlStatus("Please enter a URL", "error");
    return;
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    showUrlStatus("Please enter a valid http/https URL", "error");
    return;
  }

  showUrlStatus("Loading PDF...", "loading-url");
  loadPdfFromRemoteUrl(url);
}

async function loadPdfFromRemoteUrl(url) {
  try {
    await ensureUrlPermission(url);
    const pdfBlob = await fetchPdfBlob(url);
    const fileName = getFileNameFromURL(url);
    const objectUrl = URL.createObjectURL(pdfBlob);
    const dataUrl = await blobToDataURL(pdfBlob);

    loadPDFViewer(objectUrl, fileName, pdfBlob.size);
    chrome.storage.local.set({
      fullPDF: dataUrl,
      fullPDFName: fileName,
      fullPDFUrl: url
    });

    saveToRecent(fileName, pdfBlob.size, url);
    urlStatus.classList.add("hidden");
    showToast("URL PDF loaded");
  } catch (error) {
    console.error("Error loading PDF from URL:", error);
    showUrlStatus(error.message || "Unable to load PDF from this URL", "error");
    showToast("Failed to load PDF");
    showLoading(false);
  }
}

function showUrlStatus(msg, type) {
  urlStatus.textContent = msg;
  urlStatus.className = `url-status ${type}`;
  urlStatus.classList.remove("hidden");
}

function getFileNameFromURL(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const last = parts[parts.length - 1];
    return last || "document.pdf";
  } catch {
    return "document.pdf";
  }
}

// ===== ZOOM CONTROLS =====
zoomInBtn.addEventListener("click", () => {
  if (currentZoom < ZOOM_MAX) {
    currentZoom += ZOOM_STEP;
    applyZoom();
  }
});

zoomOutBtn.addEventListener("click", () => {
  if (currentZoom > ZOOM_MIN) {
    currentZoom -= ZOOM_STEP;
    applyZoom();
  }
});

zoomResetBtn.addEventListener("click", resetZoom);

function applyZoom() {
  zoomLevel.textContent = currentZoom + "%";
  const scale = currentZoom / 100;
  // Zoom via CSS transform on the embed
  pdfViewer.style.transform = `scale(${scale})`;
  pdfViewer.style.transformOrigin = "top center";
  pdfViewer.style.width = `${Math.round(100 / scale)}%`;
  pdfViewer.style.height = `${Math.round(100 / scale)}%`;
}

function resetZoom() {
  currentZoom = 100;
  pdfViewer.style.transform = "";
  pdfViewer.style.width = "100%";
  pdfViewer.style.height = "100%";
  zoomLevel.textContent = "100%";
}

// ===== FULLSCREEN =====
openFullBtn.addEventListener("click", () => {
  chrome.storage.local.get(["fullPDF", "fullPDFUrl"], (data) => {
    if (data.fullPDF || data.fullPDFUrl) {
      chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
    } else {
      showToast("No PDF loaded", "error");
    }
  });
});

// ===== RECENT FILES =====
function saveToRecent(name, size, url) {
  chrome.storage.local.get("recentFiles", ({ recentFiles }) => {
    let files = recentFiles || [];
    // Remove duplicates
    files = files.filter(f => f.name !== name);
    files.unshift({
      name,
      size,
      url,
      time: Date.now()
    });
    files = files.slice(0, MAX_RECENT);
    chrome.storage.local.set({ recentFiles: files });
  });
}

function loadRecentFiles() {
  chrome.storage.local.get("recentFiles", ({ recentFiles }) => {
    const files = recentFiles || [];
    if (files.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.3">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p>No recent files yet</p>
        </div>`;
      return;
    }

    recentList.innerHTML = files.map((f, i) => `
      <div class="recent-item" data-index="${i}">
        <div class="recent-item-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="recent-item-info">
          <div class="recent-item-name">${escapeHTML(f.name)}</div>
          <div class="recent-item-meta">${f.size ? formatFileSize(f.size) + " · " : ""}${timeAgo(f.time)}</div>
        </div>
        <button class="recent-item-del" data-index="${i}" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `).join("");

    // Click to reload (URL-based only since we can't re-read local file)
    recentList.querySelectorAll(".recent-item").forEach(item => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".recent-item-del")) return;
        const idx = parseInt(item.dataset.index);
        const f = files[idx];
        if (f.url) {
          showUrlStatus("Reloading saved URL...", "loading-url");
          loadPdfFromRemoteUrl(f.url);
          // Switch to upload tab
          document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
          document.querySelector('[data-tab="upload"]').classList.add("active");
          document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
          document.getElementById("tab-upload").classList.add("active");
        } else {
          showToast("Local files must be re-selected", "warning");
        }
      });
    });

    // Delete individual
    recentList.querySelectorAll(".recent-item-del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        files.splice(idx, 1);
        chrome.storage.local.set({ recentFiles: files }, loadRecentFiles);
      });
    });
  });
}

clearRecentBtn.addEventListener("click", () => {
  chrome.storage.local.remove("recentFiles", loadRecentFiles);
  showToast("Recent files cleared");
});

// ===== UTILITIES =====
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return mins + "m ago";
  if (hrs  < 24)  return hrs  + "h ago";
  return days + "d ago";
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===== TOAST =====
let toastTimer;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

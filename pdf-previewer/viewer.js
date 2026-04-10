/* ============================================
   PDF Previewer Pro — viewer.js
   Fullscreen viewer with zoom + theme support
   ============================================ */

const fullPdfViewer = document.getElementById("fullPdfViewer");
const loadOverlay   = document.getElementById("loadOverlay");
const docTitle      = document.getElementById("docTitle");
const vzoomIn       = document.getElementById("vzoomIn");
const vzoomOut      = document.getElementById("vzoomOut");
const vzoomReset    = document.getElementById("vzoomReset");
const vzoomVal      = document.getElementById("vzoomVal");
const vThemeToggle  = document.getElementById("vThemeToggle");
const vClose        = document.getElementById("vClose");
const vSun          = document.getElementById("vSun");
const vMoon         = document.getElementById("vMoon");

let currentZoom = 100;
const ZOOM_STEP = 15;
const ZOOM_MIN  = 40;
const ZOOM_MAX  = 250;
let activeViewerUrl = null;

function blobToObjectUrl(blob) {
  return URL.createObjectURL(blob.type === "application/pdf"
    ? blob
    : new Blob([blob], { type: "application/pdf" }));
}

async function loadPdfFromStoredUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const pdfBlob = await response.blob();
    activeViewerUrl = blobToObjectUrl(pdfBlob);
    fullPdfViewer.src = activeViewerUrl;
    hideLoader();
  } catch (error) {
    console.error("Error loading remote PDF:", error);
    docTitle.textContent = "Error loading PDF";
    loadOverlay.innerHTML = `
      <div class="load-box" style="color: #f87171;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.6">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>Couldn't fetch this PDF. Reopen it from the extension popup.</p>
      </div>`;
    }
}

// ===== LOAD PDF =====
chrome.storage.local.get(["fullPDF", "fullPDFName", "fullPDFUrl", "theme"], (data) => {
  // Apply theme
  applyTheme(data.theme || "light");

  const name = data.fullPDFName || data.fullPDFUrl || "document.pdf";
  docTitle.textContent = name;
  document.title = name + " — PDF Viewer";

  if (data.fullPDFUrl && !data.fullPDF) {
    // Backward compatibility for sessions stored before remote PDFs were cached locally.
    loadPdfFromStoredUrl(data.fullPDFUrl);
    return;
  }

  if (!data.fullPDF) {
    docTitle.textContent = "No PDF found";
    loadOverlay.innerHTML = `
      <div class="load-box" style="color: #f87171;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.6">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>No PDF loaded. Open the extension and select a file.</p>
      </div>`;
    return;
  }

  // Base64 → Blob → URL
  try {
    const base64 = data.fullPDF.split(",")[1];
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: "application/pdf" });
    activeViewerUrl = blobToObjectUrl(blob);
    fullPdfViewer.src = activeViewerUrl;
    hideLoader();
  } catch (err) {
    console.error("Error loading PDF:", err);
    docTitle.textContent = "Error loading PDF";
  }
});

function hideLoader() {
  setTimeout(() => loadOverlay.classList.add("hidden"), 800);
}

// ===== ZOOM =====
vzoomIn.addEventListener("click", () => {
  if (currentZoom < ZOOM_MAX) {
    currentZoom += ZOOM_STEP;
    applyZoom();
  }
});

vzoomOut.addEventListener("click", () => {
  if (currentZoom > ZOOM_MIN) {
    currentZoom -= ZOOM_STEP;
    applyZoom();
  }
});

vzoomReset.addEventListener("click", () => {
  currentZoom = 100;
  fullPdfViewer.style.transform = "";
  fullPdfViewer.style.width = "100%";
  fullPdfViewer.style.height = `calc(100vh - 92px)`;
  vzoomVal.textContent = "100%";
});

function applyZoom() {
  vzoomVal.textContent = currentZoom + "%";
  const scale = currentZoom / 100;
  fullPdfViewer.style.transform = `scale(${scale})`;
  fullPdfViewer.style.transformOrigin = "top center";
  fullPdfViewer.style.width = `${Math.round(100 / scale)}%`;
  fullPdfViewer.style.height = `${Math.round((100 / scale) * (window.innerHeight - 92) / window.innerHeight * 100)}%`;
}

// Keyboard zoom
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "=") { e.preventDefault(); vzoomIn.click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); vzoomOut.click(); }
  if ((e.ctrlKey || e.metaKey) && e.key === "0") { e.preventDefault(); vzoomReset.click(); }
});

// ===== THEME =====
function applyTheme(theme) {
  document.body.className = theme;
  if (theme === "dark") {
    vSun.style.display = "block";
    vMoon.style.display = "none";
  } else {
    vSun.style.display = "none";
    vMoon.style.display = "block";
  }
}

vThemeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
});

// ===== CLOSE =====
vClose.addEventListener("click", () => window.close());

window.addEventListener("beforeunload", () => {
  if (activeViewerUrl && activeViewerUrl.startsWith("blob:")) {
    URL.revokeObjectURL(activeViewerUrl);
  }
});

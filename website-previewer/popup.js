/* ============================================================
   Website Preview Pro — popup.js
   CSP-safe (no innerHTML with user data), all features fixed
   ============================================================ */

const body        = document.body;
const input       = document.getElementById("urlInput");
const preview     = document.getElementById("previewContainer");
const emptyState  = document.getElementById("emptyState");
const loading     = document.getElementById("loading");
const errorText   = document.getElementById("errorText");
const copyBtn     = document.getElementById("copyBtn");
const openSite    = document.getElementById("openSite");
const historyList = document.getElementById("historyList");
const actionRow   = document.getElementById("actionRow");
const statusBadge = document.getElementById("statusBadge");
const statusDot   = document.getElementById("statusDot");
const statusText  = document.getElementById("statusText");

let deviceMode = "desktop";
let lastLoadedImg = null; // track loaded image for copy

/* -----------------------------------------------------------
   Device Toggle
----------------------------------------------------------- */
document.querySelectorAll(".device-switch button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".device-switch button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    deviceMode = btn.dataset.size;
  });
});

/* -----------------------------------------------------------
   Load Saved Settings on Open
----------------------------------------------------------- */
chrome.storage.local.get(["dark", "last", "history"], d => {
  if (d.dark) applyDark(true);
  if (d.history && d.history.length) d.history.forEach(addHistory);
  if (d.last) {
    input.value = d.last;
    generate(d.last);
  }
});

/* -----------------------------------------------------------
   Current Tab Button — fetch active tab URL
----------------------------------------------------------- */
document.getElementById("currentTabBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs && tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      // Skip chrome:// and extension pages
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
        showError("Cannot preview browser internal pages.");
        return;
      }
      input.value = url;
      generate(url);
    }
  });
});

/* -----------------------------------------------------------
   Dark Mode Toggle
----------------------------------------------------------- */
document.getElementById("darkToggle").addEventListener("click", () => {
  const isDark = body.classList.toggle("dark");
  applyDark(isDark);
  chrome.storage.local.set({ dark: isDark });
});

function applyDark(isDark) {
  if (isDark) {
    body.classList.add("dark");
    document.getElementById("moonIcon").style.display = "none";
    document.getElementById("sunIcon").style.display  = "block";
  } else {
    body.classList.remove("dark");
    document.getElementById("moonIcon").style.display = "block";
    document.getElementById("sunIcon").style.display  = "none";
  }
}

/* -----------------------------------------------------------
   Preview Button
----------------------------------------------------------- */
document.getElementById("previewBtn").addEventListener("click", () => {
  const val = input.value.trim();
  if (val) generate(val);
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const val = input.value.trim();
    if (val) generate(val);
  }
});

/* -----------------------------------------------------------
   Clear History Button
----------------------------------------------------------- */
document.getElementById("clearHistory").addEventListener("click", () => {
  chrome.storage.local.set({ history: [], last: "" });

  // Clear history list — CSP-safe
  while (historyList.firstChild) historyList.removeChild(historyList.firstChild);

  // Reset preview — CSP-safe
  resetPreview();
  input.value = "";
});

/* -----------------------------------------------------------
   Normalize URL
----------------------------------------------------------- */
function normalize(u) {
  u = u.trim();
  if (!u.includes(".")) u += ".com";
  if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://" + u;
  return u;
}

/* -----------------------------------------------------------
   MAIN PREVIEW FUNCTION
----------------------------------------------------------- */
function generate(raw) {
  const url = normalize(raw);

  const size =
    deviceMode === "mobile"
      ? "width/375/crop/667/"
      : "width/1280/crop/800/";

  const imgUrl =
    "https://image.thum.io/get/" + size + url + "?t=" + Date.now();

  // Show loading state
  setStatus("loading");
  loading.style.display = "flex";
  actionRow.classList.remove("show");
  errorText.textContent = "";
  lastLoadedImg = null;

  // Remove old image from preview — CSP-safe
  const oldImg = preview.querySelector(".preview-image");
  if (oldImg) preview.removeChild(oldImg);
  if (emptyState) emptyState.style.display = "none";

  const img = new Image();
  img.src = imgUrl;
  img.className = "preview-image";
  img.alt = "Website preview for " + url;

  img.addEventListener("load", () => {
    loading.style.display = "none";
    preview.appendChild(img);
    lastLoadedImg = img;

    // Update open-site link safely
    openSite.href = url;
    openSite.textContent = ""; // reset
    const linkIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // Just set href — text set via textContent below
    openSite.setAttribute("href", url);

    // Show action row
    actionRow.classList.add("show");
    setStatus("ready");

    chrome.storage.local.set({ last: raw });
    saveHistory(raw);
  });

  img.addEventListener("error", () => {
    loading.style.display = "none";
    showError("Preview failed. Check the URL and try again.");
    setStatus("error");
    if (emptyState) emptyState.style.display = "flex";
  });
}

/* -----------------------------------------------------------
   Copy Image to Clipboard
----------------------------------------------------------- */
copyBtn.addEventListener("click", () => {
  if (!lastLoadedImg) return;

  const canvas = document.createElement("canvas");
  canvas.width  = lastLoadedImg.naturalWidth  || lastLoadedImg.width;
  canvas.height = lastLoadedImg.naturalHeight || lastLoadedImg.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(lastLoadedImg, 0, 0);

  canvas.toBlob(blob => {
    if (!blob) { showError("Copy failed."); return; }
    navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]).then(() => {
      copyBtn.textContent = "✓ Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy Image"; }, 1800);
    }).catch(() => {
      showError("Clipboard write failed. Try again.");
    });
  }, "image/png");
});

/* -----------------------------------------------------------
   Status Badge
----------------------------------------------------------- */
function setStatus(state) {
  statusBadge.classList.remove("hidden");
  statusDot.className = "sdot sdot-" + state;
  if (state === "loading") statusText.textContent = "Loading…";
  else if (state === "ready") statusText.textContent = "Preview ready";
  else if (state === "error") statusText.textContent = "Failed";
}

/* -----------------------------------------------------------
   Error Helper
----------------------------------------------------------- */
function showError(msg) {
  errorText.textContent = msg;
}

/* -----------------------------------------------------------
   Reset Preview to Empty State
----------------------------------------------------------- */
function resetPreview() {
  const oldImg = preview.querySelector(".preview-image");
  if (oldImg) preview.removeChild(oldImg);
  if (emptyState) emptyState.style.display = "flex";
  actionRow.classList.remove("show");
  statusBadge.classList.add("hidden");
  errorText.textContent = "";
  lastLoadedImg = null;
}

/* -----------------------------------------------------------
   Save History
----------------------------------------------------------- */
function saveHistory(u) {
  chrome.storage.local.get(["history"], d => {
    let h = d.history || [];
    // Remove duplicate if exists, then add to front
    h = h.filter(item => item !== u);
    h.unshift(u);
    if (h.length > 10) h.pop();
    chrome.storage.local.set({ history: h });

    // Re-render history list — CSP-safe
    while (historyList.firstChild) historyList.removeChild(historyList.firstChild);
    h.forEach(addHistory);
  });
}

/* -----------------------------------------------------------
   Add History Item — CSP-safe DOM creation
----------------------------------------------------------- */
function addHistory(u) {
  const li = document.createElement("li");

  // Favicon
  const fav = document.createElement("img");
  fav.className = "hist-favicon";
  try {
    const host = new URL(normalize(u)).hostname;
    fav.src = "https://www.google.com/s2/favicons?domain=" + host + "&sz=16";
  } catch (_) {
    fav.src = "";
  }
  fav.alt = "";
  fav.width = 14;
  fav.height = 14;

  // Label
  const label = document.createElement("span");
  label.textContent = u;

  li.appendChild(fav);
  li.appendChild(label);
  li.addEventListener("click", () => {
    input.value = u;
    generate(u);
  });
  historyList.appendChild(li);
}
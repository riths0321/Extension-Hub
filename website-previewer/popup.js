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
  else applyDark(false);
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
const darkToggle = document.getElementById("darkToggle");
if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    const isDark = body.classList.toggle("dark");
    applyDark(isDark);
    chrome.storage.local.set({ dark: isDark });
  });
}

function applyDark(isDark) {
  const moon = document.getElementById("moonIcon");
  const sun  = document.getElementById("sunIcon");

  if (isDark) {
    body.classList.add("dark");
    if (moon) moon.style.display = "none";
    if (sun)  sun.style.display  = "block";
  } else {
    body.classList.remove("dark");
    if (moon) moon.style.display = "block";
    if (sun)  sun.style.display  = "none";
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

    /* ---------- Safe external link handling ---------- */
    try {
      const safeUrl = new URL(url);

      if (safeUrl.protocol === "http:" || safeUrl.protocol === "https:") {
        openSite.href = safeUrl.href;
        openSite.setAttribute("href", safeUrl.href);
      } else {
        openSite.removeAttribute("href");
      }

    } catch {
      openSite.removeAttribute("href");
    }

    /* ---------- Show actions ---------- */
    actionRow.classList.add("show");
    setStatus("ready");

    /* ---------- Save last + history ---------- */
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
copyBtn.addEventListener("click", async () => {
  if (!lastLoadedImg) return;

  try {
    // Must be secure context (required by Chrome policies)
    if (!window.isSecureContext) {
      showError("Clipboard not allowed in insecure context.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width  = lastLoadedImg.naturalWidth  || lastLoadedImg.width;
    canvas.height = lastLoadedImg.naturalHeight || lastLoadedImg.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showError("Canvas unsupported.");
      return;
    }

    ctx.drawImage(lastLoadedImg, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob || blob.type !== "image/png") {
        showError("Copy failed.");
        return;
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);

        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy Image";
        }, 1800);

      } catch (err) {
        console.error(err);
        showError("Clipboard write blocked by browser.");
      }

    }, "image/png");

  } catch (e) {
    console.error(e);
    showError("Unexpected error while copying.");
  }
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
  if (!u || typeof u !== "string") return;

  const li = document.createElement("li");

  /* ---------- Safe favicon placeholder ---------- */
  const fav = document.createElement("div");
  fav.className = "hist-favicon";
  fav.textContent = "🌐";

  /* ---------- Safe label ---------- */
  const label = document.createElement("span");

  // Limit length + remove control chars
  const safeText = u.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 120);
  label.textContent = safeText;

  /* ---------- Safe click handler ---------- */
  li.addEventListener("click", () => {
    try {
      const safeUrl = normalize(u);
      input.value = safeUrl;
      generate(safeUrl);
    } catch {
      showError("Invalid history URL");
    }
  });

  li.appendChild(fav);
  li.appendChild(label);
  historyList.appendChild(li);
}

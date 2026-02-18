/* ===========================
   Helpers
=========================== */

const $ = (id) => document.getElementById(id);

const searchInput    = $("search");
const resultsList    = $("results");
const statusBox      = $("status");

/* ===========================
   Status (exported for bookmarks.js & sessions.js)
=========================== */

function showStatus(message, type = "success") {
  statusBox.textContent = message;
  // Clear previous classes
  statusBox.className = "status-bar " + type;

  if (showStatus._timer) clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    statusBox.className = "status-bar hidden";
  }, 2800);
}

// Make globally accessible so bookmarks.js / sessions.js can call it
window.showStatus = showStatus;

/* ===========================
   Keyboard: Enter on focused button
=========================== */

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const el = document.activeElement;
    if (el && el.tagName === "BUTTON") el.click();
  }
});

/* ===========================
   Bookmark Search  (results shown in UI, not console)
=========================== */

let searchDebounce = null;

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  resultsList.innerHTML = "";

  if (!query) return;

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    chrome.bookmarks.search(query, (bookmarks) => {
      resultsList.innerHTML = "";

      const filtered = (bookmarks || []).filter(b => b.url);

      if (!filtered.length) {
        const li = document.createElement("li");
        li.textContent = "No results found";
        li.className = "no-results";
        resultsList.appendChild(li);
        return;
      }

      filtered.slice(0, 7).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b.title || b.url;
        li.title = b.url;
        li.setAttribute("role", "listitem");
        li.addEventListener("mousedown", (e) => {
          // mousedown fires before blur — prevents list clearing too early
          e.preventDefault();
          chrome.tabs.create({ url: b.url });
        });
        resultsList.appendChild(li);
      });
    });
  }, 180);
});

// Delay clearing so clicks register before blur fires
searchInput.addEventListener("blur", () => {
  setTimeout(() => { resultsList.innerHTML = ""; }, 200);
});

/* ===========================
   Bookmark Overlay
=========================== */

const overlay        = $("bookmarkOverlay");
const openOverlayBtn = $("openBookmarkOverlay");
const confirmBtn     = $("confirmAddBookmark");
const cancelBtn      = $("cancelOverlay");
const categoryInput  = $("category");

openOverlayBtn.addEventListener("click", () => {
  overlay.classList.remove("hidden");
  categoryInput.value = "";
  // Small delay so transition plays first
  setTimeout(() => categoryInput.focus(), 60);
});

function closeOverlay() {
  overlay.classList.add("hidden");
}

cancelBtn.addEventListener("click", closeOverlay);

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});

// Close on backdrop click
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeOverlay();
});

// Confirm triggers the hidden #addBookmark button in bookmarks.js
confirmBtn.addEventListener("click", () => {
  $("addBookmark")?.click();
  closeOverlay();
});

// Enter in category input triggers confirm
categoryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmBtn.click();
});
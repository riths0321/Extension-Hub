const searchInput = document.getElementById("search");
const resultsList = document.getElementById("results");
const statusBox = document.getElementById("status");
const overlay = document.getElementById("bookmarkOverlay");
const categoryInput = document.getElementById("category");

let searchDebounce = null;

document.addEventListener("DOMContentLoaded", () => {
  bindPopupEvents();
  refreshOverview();
});

function bindPopupEvents() {
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      resultsList.replaceChildren();
    }, 180);
  });

  document.getElementById("openBookmarkOverlay").addEventListener("click", openOverlay);
  document.getElementById("cancelOverlay").addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      closeOverlay();
      return;
    }

    if (event.key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === "BUTTON") {
        activeElement.click();
      }
    }
  });

  categoryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      document.getElementById("confirmAddBookmark").click();
    }
  });
}

function showStatus(message, type = "success") {
  statusBox.textContent = message;
  statusBox.className = `status-bar ${type}`;
  if (showStatus._timer) {
    clearTimeout(showStatus._timer);
  }
  showStatus._timer = window.setTimeout(() => {
    statusBox.className = "status-bar hidden";
  }, 2800);
}

window.showStatus = showStatus;
window.closeBookmarkOverlay = closeOverlay;
window.refreshOverview = refreshOverview;

function handleSearchInput(event) {
  const query = event.target.value.trim();
  resultsList.replaceChildren();

  if (!query) {
    return;
  }

  clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(() => {
    chrome.bookmarks.search(query, (bookmarks) => {
      if (chrome.runtime.lastError) {
        showStatus("Search failed", "error");
        return;
      }
      renderSearchResults((bookmarks || []).filter((bookmark) => bookmark.url));
    });
  }, 160);
}

function renderSearchResults(bookmarks) {
  resultsList.replaceChildren();

  if (!bookmarks.length) {
    const empty = document.createElement("li");
    empty.className = "result-empty";
    empty.textContent = "No matching bookmarks found";
    resultsList.appendChild(empty);
    return;
  }

  bookmarks.slice(0, 8).forEach((bookmark) => {
    const item = document.createElement("li");
    item.className = "result-item";
    item.setAttribute("role", "listitem");

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = bookmark.title || bookmark.url;

    const url = document.createElement("div");
    url.className = "result-url";
    url.textContent = bookmark.url;

    item.append(title, url);
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      chrome.tabs.create({ url: bookmark.url });
    });

    resultsList.appendChild(item);
  });
}

function openOverlay() {
  overlay.classList.remove("hidden");
  categoryInput.value = "";
  window.setTimeout(() => categoryInput.focus(), 60);
}

function closeOverlay() {
  overlay.classList.add("hidden");
}

function refreshOverview() {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      return;
    }
    document.getElementById("bookmarkCount").textContent = String(countBookmarks(tree));
  });

  chrome.storage.local.get(["lastSession", "lastSessionSavedAt"], (data) => {
    const lastSession = Array.isArray(data.lastSession) ? data.lastSession : [];
    document.getElementById("sessionCount").textContent = String(lastSession.length);
    document.getElementById("sessionSavedAt").textContent = data.lastSessionSavedAt
      ? new Date(data.lastSessionSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "Not saved";
  });
}

function countBookmarks(nodes) {
  let total = 0;
  nodes.forEach((node) => {
    if (node.url) {
      total += 1;
    }
    if (node.children) {
      total += countBookmarks(node.children);
    }
  });
  return total;
}

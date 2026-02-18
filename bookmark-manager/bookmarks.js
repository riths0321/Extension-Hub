/* ===========================
   Helpers
=========================== */

// Get currently active tab
function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length) callback(tabs[0]);
  });
}

// Delegates to showStatus defined in popup.js (window.showStatus)
function notify(message, type = "success") {
  if (typeof window.showStatus === "function") {
    window.showStatus(message, type);
  }
}

/* ===========================
   Add Bookmark (via overlay confirm)
   Triggered by hidden #addBookmark button
=========================== */

document.getElementById("addBookmark").addEventListener("click", () => {
  const categoryInput = document.getElementById("category");
  const category = categoryInput ? categoryInput.value.trim() || "Unsorted" : "Unsorted";

  getActiveTab((tab) => {
    if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      notify("Cannot bookmark this page", "error");
      return;
    }

    // Prevent duplicate URLs
    chrome.bookmarks.search({ url: tab.url }, (existing) => {
      if (chrome.runtime.lastError) {
        notify("Error checking bookmarks", "error");
        return;
      }
      if (existing && existing.length) {
        notify("Already bookmarked", "error");
        return;
      }

      // Find or create category folder
      chrome.bookmarks.search({ title: category }, (results) => {
        if (chrome.runtime.lastError) {
          notify("Error accessing bookmarks", "error");
          return;
        }

        // Only match actual folders (nodes without a URL)
        const folder = (results || []).find(r => !r.url);

        const createBookmark = (parentId) => {
          chrome.bookmarks.create(
            {
              parentId,
              title: tab.title || tab.url,
              url: tab.url
            },
            () => {
              if (chrome.runtime.lastError) {
                notify("Failed to save bookmark", "error");
              } else {
                notify("Bookmark saved ✓");
              }
            }
          );
        };

        if (folder) {
          createBookmark(folder.id);
        } else {
          chrome.bookmarks.create({ title: category }, (newFolder) => {
            if (chrome.runtime.lastError || !newFolder) {
              notify("Failed to create folder", "error");
              return;
            }
            createBookmark(newFolder.id);
          });
        }
      });
    });
  });
});

/* ===========================
   Remove Duplicate Bookmarks
   (URL-based dedup — title can vary, URL is the truth)
=========================== */

document.getElementById("removeDuplicates").addEventListener("click", () => {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      notify("Error reading bookmarks", "error");
      return;
    }

    const seenUrls = new Map(); // url → first-seen node id
    const toRemove = [];

    function walk(nodes) {
      nodes.forEach((node) => {
        if (node.children) walk(node.children);
        if (node.url) {
          if (seenUrls.has(node.url)) {
            toRemove.push(node.id);
          } else {
            seenUrls.set(node.url, node.id);
          }
        }
      });
    }

    walk(tree);

    if (!toRemove.length) {
      notify("No duplicates found");
      return;
    }

    // Remove one by one, count completions
    let removed = 0;
    let pending = toRemove.length;

    toRemove.forEach((id) => {
      chrome.bookmarks.remove(id, () => {
        if (!chrome.runtime.lastError) removed++;
        if (--pending === 0) {
          notify(`Removed ${removed} duplicate(s)`);
        }
      });
    });
  });
});

/* ===========================
   Delete Empty Bookmark Folders
   Post-order walk — collect IDs first, remove after
=========================== */

document.getElementById("cleanFolders").addEventListener("click", () => {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      notify("Error reading bookmarks", "error");
      return;
    }

    // Root-level nodes (id "0", "1", "2") are system roots — never remove them
    const SYSTEM_IDS = new Set(["0", "1", "2"]);
    const toDelete = [];

    function walk(nodes) {
      nodes.forEach((node) => {
        if (node.children) {
          walk(node.children); // depth-first

          // Empty folder and not a system root
          if (node.children.length === 0 && !node.url && !SYSTEM_IDS.has(node.id)) {
            toDelete.push(node.id);
          }
        }
      });
    }

    walk(tree);

    if (!toDelete.length) {
      notify("No empty folders found");
      return;
    }

    let deleted = 0;
    let pending = toDelete.length;

    toDelete.forEach((id) => {
      chrome.bookmarks.remove(id, () => {
        if (!chrome.runtime.lastError) deleted++;
        if (--pending === 0) {
          notify(`Deleted ${deleted} empty folder(s)`);
        }
      });
    });
  });
});
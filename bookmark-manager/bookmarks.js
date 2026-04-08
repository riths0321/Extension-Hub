function notify(message, type = "success") {
  if (typeof window.showStatus === "function") {
    window.showStatus(message, type);
  }
}

function isRestrictedBrowserUrl(url) {
  if (typeof window.isRestrictedBrowserUrl === "function") {
    return window.isRestrictedBrowserUrl(url);
  }

  if (!url) {
    return true;
  }

  return /^(about|brave|chrome|chrome-extension|devtools|edge|extension|file|moz-extension|opera|vivaldi|view-source):/i.test(url);
}

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length) {
      callback(tabs[0]);
    }
  });
}

document.getElementById("confirmAddBookmark").addEventListener("click", () => {
  const category = document.getElementById("category").value.trim() || "Unsorted";

  getActiveTab((tab) => {
    if (isRestrictedBrowserUrl(tab?.url)) {
      notify("Cannot bookmark this page", "error");
      return;
    }

    chrome.bookmarks.search({ url: tab.url }, (existing) => {
      if (chrome.runtime.lastError) {
        notify("Bookmark check failed", "error");
        return;
      }

      if (existing && existing.length) {
        notify("Already bookmarked", "error");
        return;
      }

      resolveFolderId(category, (folderId) => {
        if (!folderId) {
          notify("Failed to resolve folder", "error");
          return;
        }

        chrome.bookmarks.create(
          {
            parentId: folderId,
            title: tab.title || tab.url,
            url: tab.url
          },
          () => {
            if (chrome.runtime.lastError) {
              notify("Failed to save bookmark", "error");
              return;
            }
            notify("Bookmark saved", "success");
            window.closeBookmarkOverlay?.();
            window.refreshOverview?.();
          }
        );
      });
    });
  });
});

function resolveFolderId(category, callback) {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError || !tree?.length) {
      callback(null);
      return;
    }

    const bookmarkRoot = tree[0];
    const preferredRoot =
      bookmarkRoot.children?.find((node) => node.id === "2") ||
      bookmarkRoot.children?.find((node) => node.id === "1") ||
      bookmarkRoot;

    const existingFolder = findFolderByTitle(bookmarkRoot.children || [], category);
    if (existingFolder) {
      callback(existingFolder.id);
      return;
    }

    chrome.bookmarks.create(
      {
        parentId: preferredRoot.id,
        title: category
      },
      (newFolder) => {
        if (chrome.runtime.lastError || !newFolder) {
          callback(null);
          return;
        }
        callback(newFolder.id);
      }
    );
  });
}

function findFolderByTitle(nodes, title) {
  const normalizedTitle = title.trim().toLowerCase();

  for (const node of nodes) {
    if (!node.url && node.title.trim().toLowerCase() === normalizedTitle) {
      return node;
    }

    if (node.children?.length) {
      const match = findFolderByTitle(node.children, title);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

document.getElementById("removeDuplicates").addEventListener("click", () => {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      notify("Error reading bookmarks", "error");
      return;
    }

    const seenUrls = new Map();
    const toRemove = [];

    function walk(nodes) {
      nodes.forEach((node) => {
        if (node.children) {
          walk(node.children);
        }
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

    let removed = 0;
    let pending = toRemove.length;

    toRemove.forEach((id) => {
      chrome.bookmarks.remove(id, () => {
        if (!chrome.runtime.lastError) {
          removed += 1;
        }
        pending -= 1;
        if (pending === 0) {
          notify(`Removed ${removed} duplicate(s)`);
          window.refreshOverview?.();
        }
      });
    });
  });
});

document.getElementById("cleanFolders").addEventListener("click", () => {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      notify("Error reading folders", "error");
      return;
    }

    const systemIds = new Set(["0", "1", "2"]);
    const toDelete = [];

    function walk(nodes) {
      nodes.forEach((node) => {
        if (node.children) {
          walk(node.children);
          if (!node.url && node.children.length === 0 && !systemIds.has(node.id)) {
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
        if (!chrome.runtime.lastError) {
          deleted += 1;
        }
        pending -= 1;
        if (pending === 0) {
          notify(`Deleted ${deleted} empty folder(s)`);
          window.refreshOverview?.();
        }
      });
    });
  });
});

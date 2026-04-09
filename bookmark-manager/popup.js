// popup.js - Complete Bookmark Manager with all features

// ========== Browser Compatibility ==========
(function ensureExtensionApi(global) {
  if (global.chrome?.bookmarks && global.chrome?.tabs && global.chrome?.storage) {
    return;
  }

  const nativeBrowser = global.browser;
  if (!nativeBrowser) {
    return;
  }

  const runtimeState = { lastError: null };

  function clearLastError() {
    runtimeState.lastError = null;
  }

  function setLastError(error) {
    runtimeState.lastError = error || null;
  }

  function wrapPromiseMethod(context, methodName) {
    return (...args) => {
      const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      clearLastError();

      let result;
      try {
        result = context[methodName](...args);
      } catch (error) {
        setLastError(error);
        if (callback) {
          callback();
          return undefined;
        }
        throw error;
      }

      if (!callback) {
        return result;
      }

      Promise.resolve(result)
        .then((value) => {
          clearLastError();
          callback(value);
        })
        .catch((error) => {
          setLastError(error);
          callback();
        });

      return undefined;
    };
  }

  global.chrome = {
    bookmarks: {
      create: wrapPromiseMethod(nativeBrowser.bookmarks, 'create'),
      get: wrapPromiseMethod(nativeBrowser.bookmarks, 'get'),
      getChildren: wrapPromiseMethod(nativeBrowser.bookmarks, 'getChildren'),
      getTree: wrapPromiseMethod(nativeBrowser.bookmarks, 'getTree'),
      remove: wrapPromiseMethod(nativeBrowser.bookmarks, 'remove'),
      search: wrapPromiseMethod(nativeBrowser.bookmarks, 'search'),
      update: wrapPromiseMethod(nativeBrowser.bookmarks, 'update')
    },
    runtime: {
      get lastError() {
        return runtimeState.lastError;
      }
    },
    storage: {
      local: {
        get: wrapPromiseMethod(nativeBrowser.storage.local, 'get'),
        set: wrapPromiseMethod(nativeBrowser.storage.local, 'set')
      }
    },
    tabs: {
      create: wrapPromiseMethod(nativeBrowser.tabs, 'create'),
      query: wrapPromiseMethod(nativeBrowser.tabs, 'query')
    }
  };
})(globalThis);

// ========== Helper Functions ==========
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

function getBookmarkBadgeLabel(bookmark) {
  const source = getDomainFromUrl(bookmark?.url) || bookmark?.title || bookmark?.url || '';
  const match = source.trim().match(/[a-z0-9]/i);
  return match ? match[0].toUpperCase() : '?';
}

function renderBookmarkVisual(bookmark) {
  return `<span class="bookmark-favicon bookmark-favicon-placeholder" aria-hidden="true">${escapeHtml(getBookmarkBadgeLabel(bookmark))}</span>`;
}

function createBookmarkVisual(bookmark) {
  const badge = document.createElement('span');
  badge.className = 'bookmark-favicon bookmark-favicon-placeholder';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = getBookmarkBadgeLabel(bookmark);
  return badge;
}

function isRestrictedBrowserUrl(url) {
  if (!url) return true;

  return /^(about|brave|chrome|chrome-extension|devtools|edge|extension|file|moz-extension|opera|vivaldi|view-source):/i.test(url);
}

// ========== Global Variables ==========
let recentBookmarks = [];
let currentFilter = 'all';
let currentBookmarkId = null;
let searchDebounce = null;

// ========== DOM Elements ==========
const searchInput = document.getElementById("search");
const resultsList = document.getElementById("results");
const statusBox = document.getElementById("status");
const overlay = document.getElementById("bookmarkOverlay");
const detailsOverlay = document.getElementById("bookmarkDetailsOverlay");
const categoryInput = document.getElementById("category");
const tagsInput = document.getElementById("bookmarkTags");

// ========== Status Notification ==========
function showStatus(message, type = "success") {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `status-bar ${type}`;
  if (showStatus._timer) {
    clearTimeout(showStatus._timer);
  }
  showStatus._timer = window.setTimeout(() => {
    if (statusBox) statusBox.className = "status-bar hidden";
  }, 2800);
}

window.showStatus = showStatus;

// ========== Recent Bookmarks ==========
function loadRecentBookmarks() {
  chrome.storage.local.get(['recentBookmarks'], (data) => {
    recentBookmarks = data.recentBookmarks || [];
    renderRecentBookmarks();
  });
}

function addToRecent(bookmark) {
  recentBookmarks = recentBookmarks.filter(b => b.id !== bookmark.id);
  recentBookmarks.unshift({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    timestamp: Date.now()
  });
  recentBookmarks = recentBookmarks.slice(0, 10);
  
  chrome.storage.local.set({ recentBookmarks }, () => {
    renderRecentBookmarks();
  });
}

function renderBookmarkActions(bookmarkId) {
  return `
    <div class="bookmark-actions">
      <button class="bookmark-delete" type="button" data-delete-id="${bookmarkId}" aria-label="Remove bookmark" title="Remove bookmark">
        Remove
      </button>
    </div>
  `;
}

function refreshCurrentBookmarkView() {
  refreshOverview();
  renderFolderTree();
  loadRecentBookmarks();

  if (searchInput?.value.trim()) {
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (currentFilter === 'recent') {
    renderRecentBookmarksFull();
    return;
  }

  if (currentFilter === 'folders') {
    renderFolderList();
    return;
  }

  renderAllBookmarks();
}

function deleteBookmarkFromPopup(bookmarkId, { closeDetails = false } = {}) {
  if (!bookmarkId || !confirm('Remove this bookmark?')) {
    return;
  }

  chrome.storage.local.get(['bookmarkTags'], (data) => {
    const allTags = data.bookmarkTags || {};
    delete allTags[bookmarkId];

    chrome.storage.local.set({ bookmarkTags: allTags }, () => {
      chrome.bookmarks.remove(bookmarkId, () => {
        if (chrome.runtime.lastError) {
          showStatus('Failed to delete', 'error');
          return;
        }

        recentBookmarks = recentBookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
        chrome.storage.local.set({ recentBookmarks }, () => {
          if (closeDetails && detailsOverlay) {
            detailsOverlay.classList.add('hidden');
            currentBookmarkId = null;
          }

          showStatus('🗑️ Bookmark deleted', 'success');
          refreshCurrentBookmarkView();
        });
      });
    });
  });
}

function bindBookmarkItemInteractions(scopeSelector) {
  document.querySelectorAll(`${scopeSelector} .bookmark-item`).forEach((item) => {
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target.closest('.tag, .bookmark-delete')) return;

      const url = item.dataset.url;
      if (url) chrome.tabs.create({ url });
    });

    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const id = item.dataset.id;
      if (id) showBookmarkDetails(id);
    });

    item.querySelector('.bookmark-delete')?.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteBookmarkFromPopup(item.dataset.id);
    });
  });
}

function renderRecentBookmarks() {
  const container = document.getElementById('recentList');
  if (!container) return;
  
  if (!recentBookmarks.length) {
    container.innerHTML = '<li class="result-empty">✨ No recent bookmarks yet</li>';
    return;
  }
  
  container.innerHTML = recentBookmarks.map(bookmark => `
    <li class="bookmark-item" data-url="${escapeHtml(bookmark.url)}" data-id="${bookmark.id}">
      ${renderBookmarkVisual(bookmark)}
      <div class="bookmark-info">
        <div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      </div>
      ${renderBookmarkActions(bookmark.id)}
    </li>
  `).join('');

  bindBookmarkItemInteractions('#recentList');
}

// ========== Bookmark Tags System ==========
function saveTags(bookmarkId, tags) {
  chrome.storage.local.get(['bookmarkTags'], (data) => {
    const allTags = data.bookmarkTags || {};
    allTags[bookmarkId] = tags.filter(t => t.trim()).map(t => t.trim().toLowerCase());
    chrome.storage.local.set({ bookmarkTags: allTags });
  });
}

function getTags(bookmarkId, callback) {
  chrome.storage.local.get(['bookmarkTags'], (data) => {
    const allTags = data.bookmarkTags || {};
    callback(allTags[bookmarkId] || []);
  });
}

function renderTags(tags, container) {
  if (!container) return;
  if (!tags.length) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = tags.map(tag => 
    `<span class="tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`
  ).join('');
  
  container.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagName = tag.dataset.tag;
      if (tagName && searchInput) {
        searchInput.value = `#${tagName}`;
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
      }
    });
  });
}

// ========== Folder Browser ==========
function countBookmarksInFolder(folder) {
  let count = 0;
  if (folder.children) {
    folder.children.forEach(child => {
      if (child.url) count++;
      else count += countBookmarksInFolder(child);
    });
  }
  return count;
}

function buildFolderTree(nodes, level = 0) {
  let html = '';
  
  nodes.forEach(node => {
    if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') {
      const folderCount = countBookmarksInFolder(node);
      html += `
        <div class="folder-item" data-folder-id="${node.id}" data-level="${level}">
          <span class="folder-icon">📁</span>
          <span class="folder-name">${escapeHtml(node.title || 'Unsorted')}</span>
          <span class="folder-count">${folderCount}</span>
        </div>
      `;
      
      if (node.children && node.children.length) {
        html += `<div class="folder-children folder-children-hidden" data-parent="${node.id}">`;
        html += buildFolderTree(node.children, level + 1);
        html += `</div>`;
      }
    }
  });
  
  return html;
}

function renderFolderTree() {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) return;
    
    const container = document.getElementById('folderTree');
    if (!container) return;
    
    const bookmarkBar = tree[0]?.children?.find(n => n.id === '1');
    const otherBookmarks = tree[0]?.children?.find(n => n.id === '2');
    
    let html = '';
    if (bookmarkBar && bookmarkBar.children && bookmarkBar.children.length) {
      html += `<div class="folder-section"><strong>📌 Bookmark Bar</strong>${buildFolderTree([bookmarkBar])}</div>`;
    }
    if (otherBookmarks && otherBookmarks.children && otherBookmarks.children.length) {
      html += `<div class="folder-section folder-section-spaced"><strong>📂 Other Bookmarks</strong>${buildFolderTree([otherBookmarks])}</div>`;
    }
    
    if (!html) {
      html = '<div class="result-empty">📭 No folders found</div>';
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = item.dataset.folderId;
        const childrenDiv = document.querySelector(`.folder-children[data-parent="${folderId}"]`);
        if (childrenDiv) {
          childrenDiv.classList.toggle('folder-children-hidden');
        } else {
          chrome.bookmarks.getChildren(folderId, (children) => {
            if (children && children.length) {
              renderBookmarkList(children);
            }
          });
        }
      });
    });
  });
}

// ========== Export/Import ==========
function setupExportImport() {
  document.getElementById('exportBookmarks')?.addEventListener('click', () => {
    chrome.bookmarks.getTree((tree) => {
      chrome.storage.local.get(['bookmarkTags'], (tagData) => {
        const data = {
          bookmarks: tree,
          tags: tagData.bookmarkTags || {},
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showStatus('📤 Bookmarks exported successfully', 'success');
      });
    });
  });
  
  document.getElementById('importBookmarks')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.tags) {
            chrome.storage.local.set({ bookmarkTags: data.tags }, () => {
              showStatus('🏷️ Tags imported successfully', 'success');
              renderFolderTree();
              if (currentFilter === 'recent') loadRecentBookmarks();
            });
          }
          if (data.bookmarks) {
            showStatus('📥 Bookmark data imported (manual review recommended)', 'success');
          }
        } catch (err) {
          showStatus('❌ Invalid backup file', 'error');
        }
      });
      reader.readAsText(file);
    });
    input.click();
  });
}

// ========== Dark Mode ==========
function initTheme() {
  chrome.storage.local.get(['theme'], (data) => {
    const isDark = data.theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark');
      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('dark');
      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) themeToggle.textContent = '🌙';
    }
  });
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
});

// ========== Search Filters ==========
function setupSearchFilters() {
  const filterAll = document.getElementById('filterAll');
  const filterFolders = document.getElementById('filterFolders');
  const filterRecent = document.getElementById('filterRecent');
  
  filterAll?.addEventListener('click', () => {
    currentFilter = 'all';
    updateActiveFilter(filterAll, filterFolders, filterRecent);
    if (searchInput && searchInput.value) {
      const event = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(event);
    } else {
      renderAllBookmarks();
    }
  });
  
  filterFolders?.addEventListener('click', () => {
    currentFilter = 'folders';
    updateActiveFilter(filterFolders, filterAll, filterRecent);
    renderFolderList();
  });
  
  filterRecent?.addEventListener('click', () => {
    currentFilter = 'recent';
    updateActiveFilter(filterRecent, filterAll, filterFolders);
    renderRecentBookmarksFull();
  });
}

function updateActiveFilter(active, ...others) {
  active.classList.add('active');
  others.forEach(btn => btn?.classList.remove('active'));
}

function renderFolderList() {
  if (!resultsList) return;
  
  chrome.bookmarks.getTree((tree) => {
    const folders = [];
    
    function collectFolders(nodes) {
      nodes.forEach(node => {
        if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') {
          folders.push({
            id: node.id,
            title: node.title || 'Unsorted',
            count: countBookmarksInFolder(node)
          });
        }
        if (node.children) collectFolders(node.children);
      });
    }
    
    collectFolders(tree);
    
    if (!folders.length) {
      resultsList.innerHTML = '<li class="result-empty">📭 No folders found</li>';
      return;
    }
    
    resultsList.innerHTML = folders.map(folder => `
      <li class="result-item" data-folder-id="${folder.id}">
        <div class="result-title">📁 ${escapeHtml(folder.title)}</div>
        <div class="result-url">${folder.count} bookmark${folder.count !== 1 ? 's' : ''}</div>
      </li>
    `).join('');
    
    document.querySelectorAll('[data-folder-id]').forEach(item => {
      item.addEventListener('click', () => {
        const folderId = item.dataset.folderId;
        chrome.bookmarks.getChildren(folderId, (children) => {
          if (children && children.length) {
            renderBookmarkList(children);
          } else {
            resultsList.innerHTML = '<li class="result-empty">📂 Empty folder</li>';
          }
        });
      });
    });
  });
}

function renderRecentBookmarksFull() {
  if (!resultsList) return;
  
  if (!recentBookmarks.length) {
    resultsList.innerHTML = '<li class="result-empty">✨ No recent bookmarks</li>';
    return;
  }
  
  resultsList.innerHTML = recentBookmarks.map(bookmark => `
    <li class="bookmark-item" data-url="${escapeHtml(bookmark.url)}" data-id="${bookmark.id}">
      ${renderBookmarkVisual(bookmark)}
      <div class="bookmark-info">
        <div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
        <div class="bookmark-tags" data-id="${bookmark.id}"></div>
      </div>
      ${renderBookmarkActions(bookmark.id)}
    </li>
  `).join('');
  
  recentBookmarks.forEach(bookmark => {
    getTags(bookmark.id, (tags) => {
      const tagsContainer = document.querySelector(`.bookmark-tags[data-id="${bookmark.id}"]`);
      if (tagsContainer) renderTags(tags, tagsContainer);
    });
  });
  
  bindBookmarkItemInteractions('#results');
}

function collectAllBookmarks(nodes, bookmarks = []) {
  nodes.forEach((node) => {
    if (node.url) {
      bookmarks.push(node);
      return;
    }

    if (node.children?.length) {
      collectAllBookmarks(node.children, bookmarks);
    }
  });

  return bookmarks;
}

function renderAllBookmarks() {
  if (!resultsList) return;

  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) {
      showStatus("Could not load bookmarks", "error");
      return;
    }

    const allBookmarks = collectAllBookmarks(tree)
      .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));

    renderSearchResultsEnhanced(allBookmarks);
  });
}

function renderBookmarkList(bookmarks) {
  if (!resultsList) return;
  const bookmarkItems = bookmarks.filter(b => b.url);
  
  if (!bookmarkItems.length) {
    resultsList.innerHTML = '<li class="result-empty">📖 No bookmarks in this folder</li>';
    return;
  }
  
  resultsList.innerHTML = bookmarkItems.map(bookmark => `
    <li class="bookmark-item" data-url="${escapeHtml(bookmark.url)}" data-id="${bookmark.id}">
      ${renderBookmarkVisual(bookmark)}
      <div class="bookmark-info">
        <div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
        <div class="bookmark-tags" data-id="${bookmark.id}"></div>
      </div>
      ${renderBookmarkActions(bookmark.id)}
    </li>
  `).join('');
  
  bookmarkItems.forEach(bookmark => {
    getTags(bookmark.id, (tags) => {
      const tagsContainer = document.querySelector(`.bookmark-tags[data-id="${bookmark.id}"]`);
      if (tagsContainer) renderTags(tags, tagsContainer);
    });
  });
  
  bindBookmarkItemInteractions('#results');
}

// ========== Bookmark Details Overlay ==========
function showBookmarkDetails(bookmarkId) {
  chrome.bookmarks.get(bookmarkId, (result) => {
    if (!result || !result[0]) return;
    
    const bookmark = result[0];
    currentBookmarkId = bookmarkId;
    
    const titleEl = document.getElementById('detailsTitle');
    if (titleEl) titleEl.textContent = bookmark.title || 'Bookmark';
    
    getTags(bookmarkId, (tags) => {
      const contentEl = document.getElementById('detailsContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="detail-row">
            <div class="detail-label">Title</div>
            <div class="detail-value">${escapeHtml(bookmark.title || 'No title')}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">URL</div>
            <div class="detail-value"><a href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bookmark.url)}</a></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Tags</div>
            <div class="detail-value" id="detailsTags">${tags.map(t => `#${escapeHtml(t)}`).join(', ') || 'No tags'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Added</div>
            <div class="detail-value">${bookmark.dateAdded ? new Date(bookmark.dateAdded).toLocaleString() : 'Unknown'}</div>
          </div>
        `;
      }
    });
    
    if (detailsOverlay) detailsOverlay.classList.remove('hidden');
  });
}

function setupDetailsOverlay() {
  document.getElementById('editBookmark')?.addEventListener('click', () => {
    if (currentBookmarkId) {
      const newTitle = prompt('Enter new title:');
      if (newTitle && newTitle.trim()) {
        chrome.bookmarks.update(currentBookmarkId, { title: newTitle.trim() }, () => {
          if (!chrome.runtime.lastError) {
            showStatus('✏️ Bookmark updated', 'success');
            if (detailsOverlay) detailsOverlay.classList.add('hidden');
            refreshOverview();
            renderFolderTree();
            loadRecentBookmarks();
            currentBookmarkId = null;
          } else {
            showStatus('Failed to update', 'error');
          }
        });
      }
    }
  });
  
  document.getElementById('deleteBookmark')?.addEventListener('click', () => {
    if (currentBookmarkId) {
      deleteBookmarkFromPopup(currentBookmarkId, { closeDetails: true });
    }
  });
  
  document.getElementById('closeDetails')?.addEventListener('click', () => {
    if (detailsOverlay) detailsOverlay.classList.add('hidden');
    currentBookmarkId = null;
  });
}

// ========== Search Functionality ==========
function setupSearch() {
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    if (resultsList) resultsList.replaceChildren();
    
    if (!query) {
      if (currentFilter === 'folders') {
        renderFolderList();
      } else if (currentFilter === 'recent') {
        renderRecentBookmarksFull();
      } else {
        renderAllBookmarks();
      }
      return;
    }
    
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      if (query.startsWith('#')) {
        const tagQuery = query.substring(1).toLowerCase();
        chrome.bookmarks.search('', (bookmarks) => {
          chrome.storage.local.get(['bookmarkTags'], (data) => {
            const allTags = data.bookmarkTags || {};
            const filtered = bookmarks.filter(b => {
              const tags = allTags[b.id] || [];
              return b.url && tags.some(t => t.includes(tagQuery));
            });
            renderSearchResultsEnhanced(filtered.slice(0, 20));
          });
        });
      } else {
        chrome.bookmarks.search(query, (bookmarks) => {
          if (chrome.runtime.lastError) {
            showStatus("Search failed", "error");
            return;
          }
          renderSearchResultsEnhanced((bookmarks || []).filter((bookmark) => bookmark.url).slice(0, 20));
        });
      }
    }, 160);
  });
}

function renderSearchResultsEnhanced(bookmarks) {
  if (!resultsList) return;
  resultsList.replaceChildren();
  
  if (!bookmarks.length) {
    const empty = document.createElement("li");
    empty.className = "result-empty";
    empty.textContent = "🔍 No matching bookmarks found";
    resultsList.appendChild(empty);
    return;
  }
  
  bookmarks.forEach((bookmark) => {
    const item = document.createElement("li");
    item.className = "bookmark-item";
    item.dataset.url = bookmark.url;
    item.dataset.id = bookmark.id;
    
    const favicon = createBookmarkVisual(bookmark);
    
    const info = document.createElement("div");
    info.className = "bookmark-info";
    
    const title = document.createElement("div");
    title.className = "bookmark-title";
    title.textContent = bookmark.title || bookmark.url;
    
    const url = document.createElement("div");
    url.className = "bookmark-url";
    url.textContent = bookmark.url;
    
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "bookmark-tags";
    tagsContainer.dataset.id = bookmark.id;

    const actions = document.createElement("div");
    actions.className = "bookmark-actions";

    const deleteButton = document.createElement("button");
    deleteButton.className = "bookmark-delete";
    deleteButton.type = "button";
    deleteButton.dataset.deleteId = bookmark.id;
    deleteButton.setAttribute("aria-label", "Remove bookmark");
    deleteButton.title = "Remove bookmark";
    deleteButton.textContent = "Remove";
    
    info.append(title, url, tagsContainer);
    actions.append(deleteButton);
    item.append(favicon, info, actions);
    
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.closest('.tag, .bookmark-delete')) return;
      chrome.tabs.create({ url: bookmark.url });
    });
    
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showBookmarkDetails(bookmark.id);
    });

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteBookmarkFromPopup(bookmark.id);
    });
    
    resultsList.appendChild(item);
    
    getTags(bookmark.id, (tags) => {
      renderTags(tags, tagsContainer);
    });
  });
}

// ========== Bookmark Creation ==========
function setupBookmarkCreation() {
  const confirmBtn = document.getElementById("confirmAddBookmark");
  if (!confirmBtn) return;
  
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener("click", () => {
    const category = document.getElementById("category")?.value.trim() || "Unsorted";
    const tags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [];
    
    getActiveTab((tab) => {
      if (isRestrictedBrowserUrl(tab?.url)) {
        showStatus("Cannot bookmark this page", "error");
        return;
      }
      
      chrome.bookmarks.search({ url: tab.url }, (existing) => {
        if (existing && existing.length) {
          showStatus("Already bookmarked", "error");
          return;
        }
        
        resolveFolderId(category, (folderId) => {
          if (!folderId) {
            showStatus("Failed to resolve folder", "error");
            return;
          }
          
          chrome.bookmarks.create(
            {
              parentId: folderId,
              title: tab.title || tab.url,
              url: tab.url
            },
            (bookmark) => {
              if (chrome.runtime.lastError) {
                showStatus("Failed to save bookmark", "error");
                return;
              }
              
              if (tags.length) {
                saveTags(bookmark.id, tags);
              }
              
              addToRecent({
                id: bookmark.id,
                title: bookmark.title,
                url: bookmark.url
              });
              
              showStatus("✨ Bookmark saved", "success");
              closeOverlay();
              refreshOverview();
              renderFolderTree();
            }
          );
        });
      });
    });
  });
}

// ========== Core Functions ==========
function openOverlay() {
  if (overlay) {
    overlay.classList.remove("hidden");
    if (categoryInput) {
      categoryInput.value = "";
      if (tagsInput) tagsInput.value = "";
      window.setTimeout(() => categoryInput.focus(), 60);
    }
  }
}

function closeOverlay() {
  if (overlay) overlay.classList.add("hidden");
}

window.closeBookmarkOverlay = closeOverlay;

function refreshOverview() {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError) return;
    const countEl = document.getElementById("bookmarkCount");
    if (countEl) countEl.textContent = String(countBookmarks(tree));
    
    let folderCount = 0;
    function countFolders(nodes) {
      nodes.forEach(node => {
        if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') folderCount++;
        if (node.children) countFolders(node.children);
      });
    }
    countFolders(tree);
    const folderCountEl = document.getElementById("folderCount");
    if (folderCountEl) folderCountEl.textContent = String(folderCount);
  });
  
  chrome.storage.local.get(["lastSession", "lastSessionSavedAt"], (data) => {
    const lastSession = Array.isArray(data.lastSession) ? data.lastSession : [];
    const sessionCountEl = document.getElementById("sessionCount");
    const sessionSavedAtEl = document.getElementById("sessionSavedAt");
    if (sessionCountEl) sessionCountEl.textContent = String(lastSession.length);
    if (sessionSavedAtEl) {
      sessionSavedAtEl.textContent = data.lastSessionSavedAt
        ? new Date(data.lastSessionSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Not saved";
    }
  });
}

window.refreshOverview = refreshOverview;

function countBookmarks(nodes) {
  let total = 0;
  nodes.forEach((node) => {
    if (node.url) total += 1;
    if (node.children) total += countBookmarks(node.children);
  });
  return total;
}

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length) {
      callback(tabs[0]);
    } else {
      callback(null);
    }
  });
}

window.getActiveTab = getActiveTab;

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

window.resolveFolderId = resolveFolderId;

function findFolderByTitle(nodes, title) {
  const normalizedTitle = title.trim().toLowerCase();
  
  for (const node of nodes) {
    if (!node.url && node.title.trim().toLowerCase() === normalizedTitle) {
      return node;
    }
    
    if (node.children?.length) {
      const match = findFolderByTitle(node.children, title);
      if (match) return match;
    }
  }
  
  return null;
}

// ========== Event Listeners ==========
document.getElementById("clearRecent")?.addEventListener('click', () => {
  chrome.storage.local.set({ recentBookmarks: [] }, () => {
    recentBookmarks = [];
    renderRecentBookmarks();
    showStatus('✨ Recent bookmarks cleared', 'success');
  });
});

document.getElementById("openBookmarkOverlay")?.addEventListener("click", openOverlay);
document.getElementById("cancelOverlay")?.addEventListener("click", closeOverlay);

if (overlay) {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });
}

if (detailsOverlay) {
  detailsOverlay.addEventListener("click", (event) => {
    if (event.target === detailsOverlay) detailsOverlay.classList.add("hidden");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (overlay && !overlay.classList.contains("hidden")) closeOverlay();
    if (detailsOverlay && !detailsOverlay.classList.contains("hidden")) detailsOverlay.classList.add("hidden");
  }
});

if (categoryInput) {
  categoryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      document.getElementById("confirmAddBookmark")?.click();
    }
  });
}

// ========== Session Functions ==========
document.getElementById("saveSession")?.addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      showStatus("Could not read tabs", "error");
      return;
    }
    
    const session = tabs
      .filter(tab => tab.url && !isRestrictedBrowserUrl(tab.url))
      .map(tab => ({ title: tab.title || tab.url, url: tab.url }));
    
    if (!session.length) {
      showStatus("No saveable tabs found", "error");
      return;
    }
    
    chrome.storage.local.set({ lastSession: session, lastSessionSavedAt: Date.now() }, () => {
      if (chrome.runtime.lastError) {
        showStatus("Failed to save session", "error");
        return;
      }
      showStatus(`💾 Saved ${session.length} tab${session.length !== 1 ? "s" : ""}`, "success");
      refreshOverview();
    });
  });
});

document.getElementById("restoreSession")?.addEventListener("click", () => {
  chrome.storage.local.get(["lastSession"], (data) => {
    if (chrome.runtime.lastError) {
      showStatus("Could not read saved session", "error");
      return;
    }
    
    const session = Array.isArray(data.lastSession) ? data.lastSession : [];
    if (!session.length) {
      showStatus("No saved session found", "error");
      return;
    }
    
    session.forEach(tab => {
      if (tab.url) chrome.tabs.create({ url: tab.url });
    });
    
    showStatus(`🔄 Restored ${session.length} tab${session.length !== 1 ? "s" : ""}`, "success");
  });
});

// ========== Cleanup Functions ==========
function getBookmarkTree(callback) {
  chrome.bookmarks.getTree((tree) => {
    if (chrome.runtime.lastError || !Array.isArray(tree)) {
      callback(null);
      return;
    }

    callback(tree);
  });
}

function removeBookmarksByIds(ids, callback) {
  if (!ids.length) {
    callback({ removed: 0, failed: 0 });
    return;
  }

  let removed = 0;
  let failed = 0;
  let pending = ids.length;

  ids.forEach((id) => {
    chrome.bookmarks.remove(id, () => {
      if (chrome.runtime.lastError) {
        failed += 1;
      } else {
        removed += 1;
      }

      pending -= 1;
      if (pending === 0) {
        callback({ removed, failed });
      }
    });
  });
}

function normalizeBookmarkUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    parsed.hash = "";

    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }

    return parsed.toString();
  } catch (error) {
    return url.trim();
  }
}

function findDuplicateBookmarkIds(tree) {
  const seenUrls = new Map();
  const duplicates = [];

  function walk(nodes) {
    nodes.forEach((node) => {
      if (node.children?.length) {
        walk(node.children);
      }

      if (!node.url) {
        return;
      }

      const normalizedUrl = normalizeBookmarkUrl(node.url);
      if (seenUrls.has(normalizedUrl)) {
        duplicates.push(node.id);
        return;
      }

      seenUrls.set(normalizedUrl, node.id);
    });
  }

  walk(tree);
  return duplicates;
}

function findEmptyFolderIds(tree) {
  const systemIds = new Set(["0", "1", "2", "3"]);
  const emptyFolderIds = [];

  function walk(nodes) {
    nodes.forEach((node) => {
      if (!node.children) {
        return;
      }

      walk(node.children);

      if (!node.url && node.children.length === 0 && !systemIds.has(node.id)) {
        emptyFolderIds.push(node.id);
      }
    });
  }

  walk(tree);
  return emptyFolderIds;
}

function refreshAfterCleanup() {
  refreshOverview();
  renderFolderTree();

  if (currentFilter === "folders") {
    renderFolderList();
  } else if (currentFilter === "recent") {
    renderRecentBookmarksFull();
  } else {
    renderAllBookmarks();
  }
}

document.getElementById("removeDuplicates")?.addEventListener("click", () => {
  getBookmarkTree((tree) => {
    if (!tree) {
      showStatus("Error reading bookmarks", "error");
      return;
    }

    const duplicateIds = findDuplicateBookmarkIds(tree);
    if (!duplicateIds.length) {
      showStatus("No duplicates found");
      return;
    }

    removeBookmarksByIds(duplicateIds, ({ removed, failed }) => {
      if (!removed && failed) {
        showStatus("Could not remove duplicates", "error");
        return;
      }

      showStatus(
        failed
          ? `Removed ${removed} duplicate(s), ${failed} failed`
          : `🗑️ Removed ${removed} duplicate(s)`,
        failed ? "error" : "success"
      );
      refreshAfterCleanup();
    });
  });
});

function deleteEmptyFoldersRecursively(totalDeleted = 0) {
  getBookmarkTree((tree) => {
    if (!tree) {
      showStatus("Error reading folders", "error");
      return;
    }

    const emptyFolderIds = findEmptyFolderIds(tree);
    if (!emptyFolderIds.length) {
      showStatus(
        totalDeleted ? `📁 Deleted ${totalDeleted} empty folder(s)` : "No empty folders found",
        "success"
      );
      refreshAfterCleanup();
      return;
    }

    removeBookmarksByIds(emptyFolderIds, ({ removed, failed }) => {
      if (!removed && failed) {
        showStatus("Could not delete empty folders", "error");
        return;
      }

      if (failed) {
        showStatus(`Deleted ${removed} empty folder(s), ${failed} failed`, "error");
        refreshAfterCleanup();
        return;
      }

      deleteEmptyFoldersRecursively(totalDeleted + removed);
    });
  });
}

document.getElementById("cleanFolders")?.addEventListener("click", () => {
  deleteEmptyFoldersRecursively();
});

// ========== Initialization ==========
function init() {
  initTheme();
  setupSearchFilters();
  setupSearch();
  setupBookmarkCreation();
  setupDetailsOverlay();
  setupExportImport();
  loadRecentBookmarks();
  renderFolderTree();
  refreshOverview();
  renderAllBookmarks();
  
  // Add context menu to search results
  const observeResults = () => {
    if (resultsList) {
      const observer = new MutationObserver(() => {
        document.querySelectorAll('#results .bookmark-item').forEach(item => {
          if (!item.hasAttribute('data-contextmenu-set')) {
            item.setAttribute('data-contextmenu-set', 'true');
            item.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              const id = item.dataset.id;
              if (id) showBookmarkDetails(id);
            });
          }
        });
      });
      observer.observe(resultsList, { childList: true, subtree: true });
    }
  };
  observeResults();
}

// Start the app
document.addEventListener("DOMContentLoaded", init);

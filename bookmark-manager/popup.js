// popup.js - Complete Bookmark Manager with Active Tabs Feature
// Security: No eval, no innerHTML with user data without escaping, CSP compliant

(function() {
  'use strict';

  // ========== Browser Compatibility ==========
  const ensureExtensionApi = (global) => {
    if (global.chrome?.bookmarks && global.chrome?.tabs && global.chrome?.storage) {
      return;
    }

    const nativeBrowser = global.browser;
    if (!nativeBrowser) {
      return;
    }

    const runtimeState = { lastError: null };

    const clearLastError = () => { runtimeState.lastError = null; };
    const setLastError = (error) => { runtimeState.lastError = error || null; };

    const wrapPromiseMethod = (context, methodName) => {
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
    };

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
        query: wrapPromiseMethod(nativeBrowser.tabs, 'query'),
        remove: wrapPromiseMethod(nativeBrowser.tabs, 'remove')
      },
      windows: {
        create: wrapPromiseMethod(nativeBrowser.windows, 'create')
      }
    };
  };

  ensureExtensionApi(globalThis);

  // ========== Secure Helper Functions ==========
  const escapeHtml = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const getDomainFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  };

  const getFaviconUrl = (url) => {
    try {
      const domain = getDomainFromUrl(url);
      if (!domain) return '';
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      return '';
    }
  };

  const isRestrictedBrowserUrl = (url) => {
    if (!url) return true;
    const restrictedPatterns = /^(about|brave|chrome|chrome-extension|devtools|edge|extension|file|moz-extension|opera|vivaldi|view-source):/i;
    return restrictedPatterns.test(url);
  };

  const getBookmarkBadgeLabel = (bookmark) => {
    const source = getDomainFromUrl(bookmark?.url) || bookmark?.title || bookmark?.url || '';
    const match = source.trim().match(/[a-z0-9]/i);
    return match ? match[0].toUpperCase() : '?';
  };

  const getPreferredBookmarkRoot = (tree) => {
    const bookmarkRoot = tree?.[0];
    if (!bookmarkRoot) {
      return null;
    }

    const topLevelFolders = (bookmarkRoot.children || []).filter((node) => !node.url);
    if (!topLevelFolders.length) {
      return null;
    }

    return (
      topLevelFolders.find((node) => node.id === "2") ||
      topLevelFolders.find((node) => node.id === "1") ||
      topLevelFolders[0]
    );
  };

  // ========== Global Variables ==========
  let recentBookmarks = [];
  let currentFilter = 'all';
  let currentBookmarkId = null;
  let currentSessionId = null;
  let searchDebounceTimer = null;
  let activeTabs = [];

  // ========== DOM Elements ==========
  const searchInput = document.getElementById("search");
  const resultsList = document.getElementById("results");
  const statusBox = document.getElementById("status");
  const bookmarkOverlay = document.getElementById("bookmarkOverlay");
  const detailsOverlay = document.getElementById("bookmarkDetailsOverlay");
  const categoryInput = document.getElementById("category");
  const tagsInput = document.getElementById("bookmarkTags");

  // ========== Status Notification ==========
  const showStatus = (message, type = "success") => {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `status-bar ${type}`;
    if (showStatus.timer) clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => {
      if (statusBox) statusBox.className = "status-bar hidden";
    }, 2800);
  };

  window.showStatus = showStatus;

  // ========== Active Tabs Feature ==========
  const loadActiveTabs = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        showStatus("Failed to load tabs", "error");
        return;
      }
      activeTabs = tabs.filter(tab => tab.url && !isRestrictedBrowserUrl(tab.url));
      renderActiveTabs();
    });
  };

  const renderActiveTabs = () => {
    const container = document.getElementById('activeTabsList');
    if (!container) return;

    if (!activeTabs.length) {
      container.innerHTML = '<div class="result-empty">🌐 No active tabs in this window</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    activeTabs.forEach((tab, index) => {
      const tabDiv = document.createElement('div');
      tabDiv.className = `active-tab-item ${tab.active ? 'active-tab-active' : ''}`;
      tabDiv.dataset.tabId = tab.id;
      tabDiv.dataset.tabUrl = tab.url;

      // Favicon
      const faviconImg = document.createElement('img');
      const faviconUrl = getFaviconUrl(tab.url);
      if (faviconUrl) {
        faviconImg.src = faviconUrl;
        faviconImg.alt = '';
        faviconImg.className = 'active-tab-favicon';
        faviconImg.onerror = () => {
          faviconImg.style.display = 'none';
          const placeholder = document.createElement('span');
          placeholder.className = 'active-tab-favicon-placeholder';
          placeholder.textContent = getBookmarkBadgeLabel({ url: tab.url, title: tab.title });
          faviconImg.parentNode?.replaceChild(placeholder, faviconImg);
        };
        tabDiv.appendChild(faviconImg);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'active-tab-favicon-placeholder';
        placeholder.textContent = getBookmarkBadgeLabel({ url: tab.url, title: tab.title });
        tabDiv.appendChild(placeholder);
      }

      // Info
      const infoDiv = document.createElement('div');
      infoDiv.className = 'active-tab-info';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'active-tab-title';
      titleDiv.textContent = tab.title || tab.url;
      
      const urlDiv = document.createElement('div');
      urlDiv.className = 'active-tab-url';
      urlDiv.textContent = tab.url;
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(urlDiv);
      tabDiv.appendChild(infoDiv);

      // Actions
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'active-tab-actions';
      
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'active-tab-bookmark';
      bookmarkBtn.textContent = 'Bookmark';
      bookmarkBtn.type = 'button';
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        quickBookmarkTab(tab);
      });
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'active-tab-close';
      closeBtn.textContent = 'Close';
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      
      actionsDiv.appendChild(bookmarkBtn);
      actionsDiv.appendChild(closeBtn);
      tabDiv.appendChild(actionsDiv);

      // Click to activate tab
      tabDiv.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true });
      });

      fragment.appendChild(tabDiv);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  };

  const quickBookmarkTab = (tab) => {
    if (isRestrictedBrowserUrl(tab.url)) {
      showStatus("Cannot bookmark this page", "error");
      return;
    }

    chrome.bookmarks.search({ url: tab.url }, (existing) => {
      if (chrome.runtime.lastError) {
        showStatus("Bookmark check failed", "error");
        return;
      }

      if (existing && existing.length) {
        showStatus("Already bookmarked", "error");
        return;
      }

      resolveFolderId("Unsorted", (folderId) => {
        if (!folderId) {
          showStatus("Failed to resolve folder", "error");
          return;
        }

        chrome.bookmarks.create({
          parentId: folderId,
          title: tab.title || tab.url,
          url: tab.url
        }, (bookmark) => {
          if (chrome.runtime.lastError || !bookmark) {
            showStatus("Failed to bookmark", "error");
            return;
          }

          addToRecent({
            id: bookmark.id,
            title: bookmark.title,
            url: bookmark.url
          });

          showStatus("✨ Tab bookmarked", "success");
          refreshOverview();
          renderFolderTree();
        });
      });
    });
  };

  const closeTab = (tabId) => {
    chrome.tabs.remove(tabId, () => {
      if (!chrome.runtime.lastError) {
        loadActiveTabs();
        showStatus("Tab closed", "success");
      }
    });
  };

  const saveAllTabsToSession = () => {
    if (!activeTabs.length) {
      showStatus("No tabs to save", "error");
      return;
    }

    const sessionName = prompt("Enter a name for this tab folder:", `Tabs ${new Date().toLocaleString()}`);
    if (!sessionName) return;

    const session = {
      id: Date.now().toString(),
      name: sessionName,
      tabs: activeTabs.map(tab => ({
        title: tab.title || tab.url,
        url: tab.url
      })),
      savedAt: Date.now(),
      tabCount: activeTabs.length
    };

    chrome.storage.local.get(['savedSessions'], (data) => {
      const sessions = data.savedSessions || [];
      sessions.push(session);
      chrome.storage.local.set({ savedSessions: sessions }, () => {
        if (chrome.runtime.lastError) {
          showStatus("Failed to save session", "error");
          return;
        }
        showStatus(`💾 Saved ${activeTabs.length} tabs to "${sessionName}"`, "success");
        loadSessions();
        refreshOverview();
      });
    });
  };

  const bookmarkAllTabs = () => {
    if (!activeTabs.length) {
      showStatus("No tabs to bookmark", "error");
      return;
    }

    resolveFolderId("Unsorted", (folderId) => {
      if (!folderId) {
        showStatus("Failed to resolve folder", "error");
        return;
      }

      let bookmarked = 0;
      let failed = 0;
      let pending = activeTabs.length;

      const finalizeBookmarkAllTabs = () => {
        if (pending !== 0) {
          return;
        }

        showStatus(`Bookmarked ${bookmarked} tabs${failed ? `, ${failed} failed` : ''}`, failed ? "error" : "success");
        refreshOverview();
        renderFolderTree();
      };

      activeTabs.forEach((tab) => {
        if (isRestrictedBrowserUrl(tab.url)) {
          failed++;
          pending--;
          finalizeBookmarkAllTabs();
          return;
        }

        chrome.bookmarks.search({ url: tab.url }, (existing) => {
          if (chrome.runtime.lastError) {
            failed++;
            pending--;
            finalizeBookmarkAllTabs();
            return;
          }

          if (existing && existing.length) {
            pending--;
            finalizeBookmarkAllTabs();
            return;
          }

          chrome.bookmarks.create({
            parentId: folderId,
            title: tab.title || tab.url,
            url: tab.url
          }, (bookmark) => {
            if (chrome.runtime.lastError || !bookmark) {
              failed++;
            } else {
              bookmarked++;
              addToRecent({
                id: bookmark.id,
                title: bookmark.title,
                url: bookmark.url
              });
            }
            pending--;
            finalizeBookmarkAllTabs();
          });
        });
      });
    });
  };

  // ========== Recent Bookmarks ==========
  const loadRecentBookmarks = () => {
    chrome.storage.local.get(['recentBookmarks'], (data) => {
      recentBookmarks = data.recentBookmarks || [];
      renderRecentBookmarks();
    });
  };

  const addToRecent = (bookmark) => {
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
  };

  const renderBookmarkActions = (bookmarkId) => {
    const container = document.createElement('div');
    container.className = 'bookmark-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bookmark-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Remove';
    deleteBtn.dataset.deleteId = bookmarkId;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmarkFromPopup(bookmarkId);
    });
    container.appendChild(deleteBtn);
    return container;
  };

  const deleteBookmarkFromPopup = (bookmarkId, options = {}) => {
    if (!bookmarkId || !confirm('Remove this bookmark?')) return;

    chrome.storage.local.get(['bookmarkTags'], (data) => {
      const allTags = data.bookmarkTags || {};
      delete allTags[bookmarkId];

      chrome.storage.local.set({ bookmarkTags: allTags }, () => {
        chrome.bookmarks.remove(bookmarkId, () => {
          if (chrome.runtime.lastError) {
            showStatus('Failed to delete', 'error');
            return;
          }

          recentBookmarks = recentBookmarks.filter((b) => b.id !== bookmarkId);
          chrome.storage.local.set({ recentBookmarks }, () => {
            if (options.closeDetails && detailsOverlay) {
              detailsOverlay.classList.add('hidden');
              currentBookmarkId = null;
            }
            showStatus('🗑️ Bookmark deleted', 'success');
            refreshCurrentBookmarkView();
          });
        });
      });
    });
  };

  const bindBookmarkItemInteractions = (container) => {
    container.querySelectorAll('.bookmark-item').forEach((item) => {
      if (item.dataset.bound) return;
      item.dataset.bound = 'true';

      item.addEventListener('click', (e) => {
        if (e.target.closest('.tag, .bookmark-delete')) return;
        const url = item.dataset.url;
        if (url) chrome.tabs.create({ url });
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const id = item.dataset.id;
        if (id) showBookmarkDetails(id);
      });
    });
  };

  const renderRecentBookmarks = () => {
    const container = document.getElementById('recentList');
    if (!container) return;
    
    if (!recentBookmarks.length) {
      container.innerHTML = '<li class="result-empty">✨ No recent bookmarks yet</li>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    recentBookmarks.forEach(bookmark => {
      const li = document.createElement('li');
      li.className = 'bookmark-item';
      li.dataset.url = bookmark.url;
      li.dataset.id = bookmark.id;
      
      const faviconSpan = document.createElement('span');
      faviconSpan.className = 'bookmark-favicon bookmark-favicon-placeholder';
      faviconSpan.textContent = getBookmarkBadgeLabel(bookmark);
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'bookmark-info';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'bookmark-title';
      titleDiv.textContent = bookmark.title || bookmark.url;
      
      const urlDiv = document.createElement('div');
      urlDiv.className = 'bookmark-url';
      urlDiv.textContent = bookmark.url;
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(urlDiv);
      
      li.appendChild(faviconSpan);
      li.appendChild(infoDiv);
      li.appendChild(renderBookmarkActions(bookmark.id));
      
      fragment.appendChild(li);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    bindBookmarkItemInteractions(container);
  };

  // ========== Bookmark Tags System ==========
  const saveTags = (bookmarkId, tags) => {
    chrome.storage.local.get(['bookmarkTags'], (data) => {
      const allTags = data.bookmarkTags || {};
      allTags[bookmarkId] = tags.filter(t => t.trim()).map(t => t.trim().toLowerCase());
      chrome.storage.local.set({ bookmarkTags: allTags });
    });
  };

  const getTags = (bookmarkId, callback) => {
    chrome.storage.local.get(['bookmarkTags'], (data) => {
      const allTags = data.bookmarkTags || {};
      callback(allTags[bookmarkId] || []);
    });
  };

  const renderTags = (tags, container) => {
    if (!container) return;
    if (!tags.length) {
      container.innerHTML = '';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      tagSpan.textContent = `#${tag}`;
      tagSpan.dataset.tag = tag;
      tagSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = `#${tag}`;
          const event = new Event('input', { bubbles: true });
          searchInput.dispatchEvent(event);
        }
      });
      fragment.appendChild(tagSpan);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  };

  // ========== Folder Browser ==========
  const countBookmarksInFolder = (folder) => {
    let count = 0;
    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) count++;
        else count += countBookmarksInFolder(child);
      });
    }
    return count;
  };

  const buildFolderTree = (nodes, container, level = 0) => {
    nodes.forEach(node => {
      if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') {
        const folderCount = countBookmarksInFolder(node);
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';
        folderDiv.dataset.folderId = node.id;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'folder-icon';
        iconSpan.textContent = '📁';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'folder-name';
        nameSpan.textContent = node.title || 'Unsorted';
        
        const countSpan = document.createElement('span');
        countSpan.className = 'folder-count';
        countSpan.textContent = folderCount;
        
        folderDiv.appendChild(iconSpan);
        folderDiv.appendChild(nameSpan);
        folderDiv.appendChild(countSpan);
        
        folderDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.bookmarks.getChildren(node.id, (children) => {
            if (children && children.length) {
              renderBookmarkList(children);
            }
          });
        });
        
        container.appendChild(folderDiv);
        
        if (node.children && node.children.length) {
          const childrenDiv = document.createElement('div');
          childrenDiv.className = 'folder-children folder-children-hidden';
          childrenDiv.dataset.parent = node.id;
          buildFolderTree(node.children, childrenDiv, level + 1);
          container.appendChild(childrenDiv);
          
          const toggleIcon = document.createElement('span');
          toggleIcon.className = 'folder-toggle';
          toggleIcon.textContent = '▶';
          toggleIcon.style.marginRight = '8px';
          toggleIcon.style.cursor = 'pointer';
          toggleIcon.style.fontSize = '10px';
          folderDiv.insertBefore(toggleIcon, folderDiv.firstChild);
          
          toggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            childrenDiv.classList.toggle('folder-children-hidden');
            toggleIcon.textContent = childrenDiv.classList.contains('folder-children-hidden') ? '▶' : '▼';
          });
        }
      }
    });
  };

  const renderFolderTree = () => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) return;
      
      const container = document.getElementById('folderTree');
      if (!container) return;
      
      const bookmarkBar = tree[0]?.children?.find(n => n.id === '1');
      const otherBookmarks = tree[0]?.children?.find(n => n.id === '2');
      
      container.innerHTML = '';
      
      if (bookmarkBar && bookmarkBar.children && bookmarkBar.children.length) {
        const barSection = document.createElement('div');
        barSection.className = 'folder-section';
        const strong = document.createElement('strong');
        strong.textContent = '📌 Bookmark Bar';
        barSection.appendChild(strong);
        buildFolderTree([bookmarkBar], barSection);
        container.appendChild(barSection);
      }
      
      if (otherBookmarks && otherBookmarks.children && otherBookmarks.children.length) {
        const otherSection = document.createElement('div');
        otherSection.className = 'folder-section folder-section-spaced';
        const strong = document.createElement('strong');
        strong.textContent = '📂 Other Bookmarks';
        otherSection.appendChild(strong);
        buildFolderTree([otherBookmarks], otherSection);
        container.appendChild(otherSection);
      }
      
      if (!container.children.length) {
        container.innerHTML = '<div class="result-empty">📭 No folders found</div>';
      }
    });
  };

  // ========== Export/Import ==========
  const setupExportImport = () => {
    document.getElementById('exportBookmarks')?.addEventListener('click', () => {
      chrome.bookmarks.getTree((tree) => {
        chrome.storage.local.get(['bookmarkTags', 'savedSessions'], (tagData) => {
          const data = {
            bookmarks: tree,
            tags: tagData.bookmarkTags || {},
            sessions: tagData.savedSessions || [],
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
          showStatus('📤 Bookmarks and sessions exported successfully', 'success');
        });
      });
    });
    
    document.getElementById('importBookmarks')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            if (data.sessions) {
              chrome.storage.local.set({ savedSessions: data.sessions }, () => {
                showStatus('📁 Sessions imported successfully', 'success');
                loadSessions();
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
  };

  // ========== Search Filters ==========
  const setupSearchFilters = () => {
    const filterAll = document.getElementById('filterAll');
    const filterFolders = document.getElementById('filterFolders');
    const filterRecent = document.getElementById('filterRecent');
    
    const updateActiveFilter = (active, ...others) => {
      active.classList.add('active');
      others.forEach(btn => btn?.classList.remove('active'));
    };
    
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
  };

  const renderFolderList = () => {
    if (!resultsList) return;
    
    chrome.bookmarks.getTree((tree) => {
      const folders = [];
      
      const collectFolders = (nodes) => {
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
      };
      
      collectFolders(tree);
      
      if (!folders.length) {
        resultsList.innerHTML = '<li class="result-empty">📭 No folders found</li>';
        return;
      }
      
      const fragment = document.createDocumentFragment();
      folders.forEach(folder => {
        const li = document.createElement('li');
        li.className = 'result-item';
        li.dataset.folderId = folder.id;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'result-title';
        titleDiv.textContent = `📁 ${folder.title}`;
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'result-url';
        urlDiv.textContent = `${folder.count} bookmark${folder.count !== 1 ? 's' : ''}`;
        
        li.appendChild(titleDiv);
        li.appendChild(urlDiv);
        
        li.addEventListener('click', () => {
          chrome.bookmarks.getChildren(folder.id, (children) => {
            if (children && children.length) {
              renderBookmarkList(children);
            } else {
              resultsList.innerHTML = '<li class="result-empty">📂 Empty folder</li>';
            }
          });
        });
        
        fragment.appendChild(li);
      });
      
      resultsList.innerHTML = '';
      resultsList.appendChild(fragment);
    });
  };

  const renderRecentBookmarksFull = () => {
    if (!resultsList) return;
    
    if (!recentBookmarks.length) {
      resultsList.innerHTML = '<li class="result-empty">✨ No recent bookmarks</li>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    recentBookmarks.forEach(bookmark => {
      const li = document.createElement('li');
      li.className = 'bookmark-item';
      li.dataset.url = bookmark.url;
      li.dataset.id = bookmark.id;
      
      const faviconSpan = document.createElement('span');
      faviconSpan.className = 'bookmark-favicon bookmark-favicon-placeholder';
      faviconSpan.textContent = getBookmarkBadgeLabel(bookmark);
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'bookmark-info';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'bookmark-title';
      titleDiv.textContent = bookmark.title || bookmark.url;
      
      const urlDiv = document.createElement('div');
      urlDiv.className = 'bookmark-url';
      urlDiv.textContent = bookmark.url;
      
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'bookmark-tags';
      tagsDiv.dataset.id = bookmark.id;
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(urlDiv);
      infoDiv.appendChild(tagsDiv);
      
      li.appendChild(faviconSpan);
      li.appendChild(infoDiv);
      li.appendChild(renderBookmarkActions(bookmark.id));
      
      fragment.appendChild(li);
      
      getTags(bookmark.id, (tags) => {
        renderTags(tags, tagsDiv);
      });
    });
    
    resultsList.innerHTML = '';
    resultsList.appendChild(fragment);
    bindBookmarkItemInteractions(resultsList);
  };

  const collectAllBookmarks = (nodes, bookmarks = []) => {
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
  };

  const renderAllBookmarks = () => {
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
  };

  const renderBookmarkList = (bookmarks) => {
    if (!resultsList) return;
    const bookmarkItems = bookmarks.filter(b => b.url);
    
    if (!bookmarkItems.length) {
      resultsList.innerHTML = '<li class="result-empty">📖 No bookmarks in this folder</li>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    bookmarkItems.forEach(bookmark => {
      const li = document.createElement('li');
      li.className = 'bookmark-item';
      li.dataset.url = bookmark.url;
      li.dataset.id = bookmark.id;
      
      const faviconSpan = document.createElement('span');
      faviconSpan.className = 'bookmark-favicon bookmark-favicon-placeholder';
      faviconSpan.textContent = getBookmarkBadgeLabel(bookmark);
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'bookmark-info';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'bookmark-title';
      titleDiv.textContent = bookmark.title || bookmark.url;
      
      const urlDiv = document.createElement('div');
      urlDiv.className = 'bookmark-url';
      urlDiv.textContent = bookmark.url;
      
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'bookmark-tags';
      tagsDiv.dataset.id = bookmark.id;
      
      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(urlDiv);
      infoDiv.appendChild(tagsDiv);
      
      li.appendChild(faviconSpan);
      li.appendChild(infoDiv);
      li.appendChild(renderBookmarkActions(bookmark.id));
      
      fragment.appendChild(li);
      
      getTags(bookmark.id, (tags) => {
        renderTags(tags, tagsDiv);
      });
    });
    
    resultsList.innerHTML = '';
    resultsList.appendChild(fragment);
    bindBookmarkItemInteractions(resultsList);
  };

  // ========== Bookmark Details Overlay ==========
  const showBookmarkDetails = (bookmarkId) => {
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
  };

  const setupDetailsOverlay = () => {
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
  };

  // ========== Search Functionality ==========
  const setupSearch = () => {
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (event) => {
      const query = event.target.value.trim();
      if (resultsList) resultsList.innerHTML = '';
      
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
      
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
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
  };

  const renderSearchResultsEnhanced = (bookmarks) => {
    if (!resultsList) return;
    resultsList.innerHTML = '';
    
    if (!bookmarks.length) {
      const empty = document.createElement("li");
      empty.className = "result-empty";
      empty.textContent = "🔍 No matching bookmarks found";
      resultsList.appendChild(empty);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    bookmarks.forEach((bookmark) => {
      const item = document.createElement("li");
      item.className = "bookmark-item";
      item.dataset.url = bookmark.url;
      item.dataset.id = bookmark.id;
      
      const faviconSpan = document.createElement('span');
      faviconSpan.className = 'bookmark-favicon bookmark-favicon-placeholder';
      faviconSpan.textContent = getBookmarkBadgeLabel(bookmark);
      
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
      
      info.appendChild(title);
      info.appendChild(url);
      info.appendChild(tagsContainer);
      
      item.appendChild(faviconSpan);
      item.appendChild(info);
      item.appendChild(renderBookmarkActions(bookmark.id));
      
      item.addEventListener("click", (e) => {
        if (e.target.closest('.tag, .bookmark-delete')) return;
        chrome.tabs.create({ url: bookmark.url });
      });
      
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showBookmarkDetails(bookmark.id);
      });
      
      fragment.appendChild(item);
      
      getTags(bookmark.id, (tags) => {
        renderTags(tags, tagsContainer);
      });
    });
    
    resultsList.appendChild(fragment);
  };

  // ========== Bookmark Creation ==========
  const setupBookmarkCreation = () => {
    const confirmBtn = document.getElementById("confirmAddBookmark");
    if (!confirmBtn) return;
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);
    
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
  };

  // ========== Core Functions ==========
  const openOverlay = () => {
    if (bookmarkOverlay) {
      bookmarkOverlay.classList.remove("hidden");
      if (categoryInput) {
        categoryInput.value = "";
        if (tagsInput) tagsInput.value = "";
        setTimeout(() => categoryInput.focus(), 60);
      }
    }
  };

  const closeOverlay = () => {
    if (bookmarkOverlay) bookmarkOverlay.classList.add("hidden");
  };

  window.closeBookmarkOverlay = closeOverlay;

  const refreshOverview = () => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) return;
      const countEl = document.getElementById("bookmarkCount");
      if (countEl) {
        const countBookmarks = (nodes) => {
          let total = 0;
          nodes.forEach((node) => {
            if (node.url) total++;
            if (node.children) total += countBookmarks(node.children);
          });
          return total;
        };
        countEl.textContent = String(countBookmarks(tree));
      }
      
      let folderCount = 0;
      const countFolders = (nodes) => {
        nodes.forEach(node => {
          if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') folderCount++;
          if (node.children) countFolders(node.children);
        });
      };
      countFolders(tree);
      const folderCountEl = document.getElementById("folderCount");
      if (folderCountEl) folderCountEl.textContent = String(folderCount);
    });
    
    chrome.storage.local.get(["savedSessions"], (data) => {
      const savedSessions = data.savedSessions || [];
      const sessionCountEl = document.getElementById("sessionCount");
      if (sessionCountEl) sessionCountEl.textContent = String(savedSessions.length);
    });
  };

  window.refreshOverview = refreshOverview;

  const refreshCurrentBookmarkView = () => {
    refreshOverview();
    renderFolderTree();
    loadRecentBookmarks();

    if (searchInput?.value.trim()) {
      const event = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(event);
      return;
    }

    if (currentFilter === 'recent') {
      renderRecentBookmarksFull();
    } else if (currentFilter === 'folders') {
      renderFolderList();
    } else {
      renderAllBookmarks();
    }
  };

  const getActiveTab = (callback) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      callback(tabs && tabs.length ? tabs[0] : null);
    });
  };

  window.getActiveTab = getActiveTab;

  const resolveFolderId = (category, callback) => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError || !tree?.length) {
        callback(null);
        return;
      }
      
      const bookmarkRoot = tree[0];
      const preferredRoot = getPreferredBookmarkRoot(tree);
      if (!preferredRoot) {
        callback(null);
        return;
      }
      
      const findFolderByTitle = (nodes, title) => {
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
      };
      
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
  };

  window.resolveFolderId = resolveFolderId;

  // ========== Session Management ==========
  const loadSessions = () => {
    chrome.storage.local.get(['savedSessions'], (data) => {
      const sessions = data.savedSessions || [];
      renderSessionsList(sessions);
    });
  };

  const renderSessionsList = (sessions) => {
    const container = document.getElementById('sessionsList');
    if (!container) return;
    
    if (!sessions.length) {
      container.innerHTML = '<div class="session-empty">📭 No saved tab folders. Click "+ New folder" to save your current tabs as a folder.</div>';
      return;
    }
    
    const sortedSessions = [...sessions].sort((a, b) => b.savedAt - a.savedAt);
    const fragment = document.createDocumentFragment();
    
    sortedSessions.forEach(session => {
      const sessionDiv = document.createElement('div');
      sessionDiv.className = 'session-item';
      sessionDiv.dataset.sessionId = session.id;
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'session-info';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'session-name';
      nameDiv.textContent = `📁 ${session.name}`;
      
      const metaDiv = document.createElement('div');
      metaDiv.className = 'session-meta';
      
      const countSpan = document.createElement('span');
      countSpan.className = 'session-count';
      countSpan.textContent = `${session.tabs.length} tab${session.tabs.length !== 1 ? 's' : ''}`;
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'session-date';
      dateSpan.textContent = new Date(session.savedAt).toLocaleDateString();
      
      metaDiv.appendChild(countSpan);
      metaDiv.appendChild(dateSpan);
      
      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(metaDiv);
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'session-actions';
      
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'session-restore';
      restoreBtn.textContent = 'Restore';
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreSession(session.id);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'session-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this tab folder?')) {
          deleteSession(session.id);
        }
      });
      
      actionsDiv.appendChild(restoreBtn);
      actionsDiv.appendChild(deleteBtn);
      
      sessionDiv.appendChild(infoDiv);
      sessionDiv.appendChild(actionsDiv);
      
      sessionDiv.addEventListener('click', () => {
        showSessionDetails(session.id);
      });
      
      fragment.appendChild(sessionDiv);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
  };

  const showSessionDetails = (sessionId) => {
    chrome.storage.local.get(['savedSessions'], (data) => {
      const sessions = data.savedSessions || [];
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        showStatus('Session folder not found', 'error');
        return;
      }
      
      currentSessionId = sessionId;
      
      const titleEl = document.getElementById('sessionDetailsTitle');
      if (titleEl) titleEl.textContent = session.name;
      
      const contentEl = document.getElementById('sessionDetailsContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="detail-row">
            <div class="detail-label">Folder info</div>
            <div class="detail-value">Created: ${new Date(session.savedAt).toLocaleString()}</div>
            <div class="detail-value">Total tabs: ${session.tabs.length}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Tabs (${session.tabs.length})</div>
            <div class="session-tab-list" id="sessionTabList"></div>
          </div>
        `;
        
        const tabList = document.getElementById('sessionTabList');
        if (tabList) {
          session.tabs.forEach((tab, index) => {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'session-tab-item';
            tabDiv.dataset.tabUrl = tab.url;
            
            const numberSpan = document.createElement('span');
            numberSpan.textContent = `${index + 1}.`;
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'session-tab-title';
            titleSpan.textContent = tab.title || tab.url;
            
            const urlSpan = document.createElement('span');
            urlSpan.className = 'session-tab-url';
            urlSpan.textContent = tab.url;
            
            tabDiv.appendChild(numberSpan);
            tabDiv.appendChild(titleSpan);
            tabDiv.appendChild(urlSpan);
            
            tabDiv.addEventListener('click', () => {
              chrome.tabs.create({ url: tab.url });
            });
            
            tabList.appendChild(tabDiv);
          });
        }
      }
      
      const overlay = document.getElementById('sessionDetailsOverlay');
      if (overlay) overlay.classList.remove('hidden');
    });
  };

  const saveCurrentTabsAsSession = (sessionName) => {
    if (!sessionName || !sessionName.trim()) {
      showStatus('Please enter a folder name', 'error');
      return;
    }
    
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        showStatus('Could not read tabs', 'error');
        return;
      }
      
      const saveableTabs = tabs.filter(tab => 
        tab.url && !isRestrictedBrowserUrl(tab.url)
      ).map(tab => ({
        title: tab.title || tab.url,
        url: tab.url
      }));
      
      if (!saveableTabs.length) {
        showStatus('No saveable tabs found', 'error');
        return;
      }
      
      const newSession = {
        id: Date.now().toString(),
        name: sessionName.trim(),
        tabs: saveableTabs,
        savedAt: Date.now(),
        tabCount: saveableTabs.length
      };
      
      chrome.storage.local.get(['savedSessions'], (data) => {
        const sessions = data.savedSessions || [];
        sessions.push(newSession);
        
        chrome.storage.local.set({ savedSessions: sessions }, () => {
          if (chrome.runtime.lastError) {
            showStatus('Failed to save folder', 'error');
            return;
          }
          
          showStatus(`💾 Saved "${sessionName}" with ${saveableTabs.length} tabs`, 'success');
          loadSessions();
          refreshOverview();
        });
      });
    });
  };

  const restoreSession = (sessionId) => {
    chrome.storage.local.get(['savedSessions'], (data) => {
      const sessions = data.savedSessions || [];
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        showStatus('Session folder not found', 'error');
        return;
      }
      
      const action = confirm(`Restore "${session.name}"?\n\nOK: Open in new window\nCancel: Add to current window`);
      
      if (action) {
        chrome.windows.create({ url: 'about:blank' }, (newWindow) => {
          session.tabs.forEach((tab, index) => {
            if (index === 0 && newWindow && newWindow.tabs && newWindow.tabs[0]) {
              chrome.tabs.update(newWindow.tabs[0].id, { url: tab.url });
            } else {
              chrome.tabs.create({ url: tab.url, windowId: newWindow?.id });
            }
          });
        });
      } else {
        session.tabs.forEach(tab => {
          chrome.tabs.create({ url: tab.url });
        });
      }
      
      showStatus(`🔄 Restored ${session.tabs.length} tabs from "${session.name}"`, 'success');
      
      const overlay = document.getElementById('sessionDetailsOverlay');
      if (overlay) overlay.classList.add('hidden');
    });
  };

  const deleteSession = (sessionId) => {
    chrome.storage.local.get(['savedSessions'], (data) => {
      const sessions = data.savedSessions || [];
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      
      chrome.storage.local.set({ savedSessions: updatedSessions }, () => {
        if (chrome.runtime.lastError) {
          showStatus('Failed to delete folder', 'error');
          return;
        }
        
        showStatus('🗑️ Tab folder deleted', 'success');
        loadSessions();
        refreshOverview();
        
        const overlay = document.getElementById('sessionDetailsOverlay');
        if (overlay) overlay.classList.add('hidden');
      });
    });
  };

  const setupSessionsUI = () => {
    const newSessionBtn = document.getElementById('newSessionBtn');
    const confirmSaveBtn = document.getElementById('confirmSaveSession');
    const cancelBtn = document.getElementById('cancelSessionOverlay');
    const restoreBtn = document.getElementById('restoreSessionBtn');
    const deleteBtn = document.getElementById('deleteSessionBtn');
    const closeBtn = document.getElementById('closeSessionDetails');
    
    newSessionBtn?.addEventListener('click', () => {
      const overlay = document.getElementById('newSessionOverlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        const input = document.getElementById('sessionName');
        if (input) {
          input.value = '';
          setTimeout(() => input.focus(), 60);
        }
      }
    });
    
    confirmSaveBtn?.addEventListener('click', () => {
      const input = document.getElementById('sessionName');
      const sessionName = input?.value.trim();
      
      if (sessionName) {
        saveCurrentTabsAsSession(sessionName);
        const overlay = document.getElementById('newSessionOverlay');
        if (overlay) overlay.classList.add('hidden');
      } else {
        showStatus('Please enter a folder name', 'error');
      }
    });
    
    cancelBtn?.addEventListener('click', () => {
      const overlay = document.getElementById('newSessionOverlay');
      if (overlay) overlay.classList.add('hidden');
    });
    
    restoreBtn?.addEventListener('click', () => {
      if (currentSessionId) restoreSession(currentSessionId);
    });
    
    deleteBtn?.addEventListener('click', () => {
      if (currentSessionId && confirm('Delete this tab folder?')) {
        deleteSession(currentSessionId);
      }
    });
    
    closeBtn?.addEventListener('click', () => {
      const overlay = document.getElementById('sessionDetailsOverlay');
      if (overlay) overlay.classList.add('hidden');
      currentSessionId = null;
    });
    
    const newSessionOverlay = document.getElementById('newSessionOverlay');
    const sessionDetailsOverlay = document.getElementById('sessionDetailsOverlay');
    
    newSessionOverlay?.addEventListener('click', (event) => {
      if (event.target === newSessionOverlay) {
        newSessionOverlay.classList.add('hidden');
      }
    });
    
    sessionDetailsOverlay?.addEventListener('click', (event) => {
      if (event.target === sessionDetailsOverlay) {
        sessionDetailsOverlay.classList.add('hidden');
        currentSessionId = null;
      }
    });
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (newSessionOverlay && !newSessionOverlay.classList.contains('hidden')) {
          newSessionOverlay.classList.add('hidden');
        }
        if (sessionDetailsOverlay && !sessionDetailsOverlay.classList.contains('hidden')) {
          sessionDetailsOverlay.classList.add('hidden');
          currentSessionId = null;
        }
      }
    });
  };

  // ========== Quick Session Functions ==========
  const setupQuickSessions = () => {
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
  };

  // ========== Cleanup Functions ==========
  const setupCleanup = () => {
    const normalizeBookmarkUrl = (url) => {
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
    };

    const findDuplicateBookmarkIds = (tree) => {
      const seenUrls = new Map();
      const duplicates = [];

      const walk = (nodes) => {
        nodes.forEach((node) => {
          if (node.children?.length) walk(node.children);
          if (!node.url) return;
          
          const normalizedUrl = normalizeBookmarkUrl(node.url);
          if (seenUrls.has(normalizedUrl)) {
            duplicates.push(node.id);
          } else {
            seenUrls.set(normalizedUrl, node.id);
          }
        });
      };

      walk(tree);
      return duplicates;
    };

    const findEmptyFolderIds = (tree) => {
      const systemIds = new Set(["0", "1", "2", "3"]);
      const emptyFolderIds = [];

      const walk = (nodes) => {
        nodes.forEach((node) => {
          if (!node.children) return;
          walk(node.children);
          if (!node.url && node.children.length === 0 && !systemIds.has(node.id)) {
            emptyFolderIds.push(node.id);
          }
        });
      };

      walk(tree);
      return emptyFolderIds;
    };

    const removeBookmarksByIds = (ids, callback) => {
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
            failed++;
          } else {
            removed++;
          }
          pending--;
          if (pending === 0) {
            callback({ removed, failed });
          }
        });
      });
    };

    document.getElementById("removeDuplicates")?.addEventListener("click", () => {
      chrome.bookmarks.getTree((tree) => {
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
            failed ? `Removed ${removed} duplicate(s), ${failed} failed` : `🗑️ Removed ${removed} duplicate(s)`,
            failed ? "error" : "success"
          );
          refreshCurrentBookmarkView();
        });
      });
    });

    document.getElementById("cleanFolders")?.addEventListener("click", () => {
      const deleteEmptyFoldersRecursively = (totalDeleted = 0) => {
        chrome.bookmarks.getTree((tree) => {
          if (!tree) {
            showStatus("Error reading folders", "error");
            return;
          }

          const emptyFolderIds = findEmptyFolderIds(tree);
          if (!emptyFolderIds.length) {
            showStatus(totalDeleted ? `📁 Deleted ${totalDeleted} empty folder(s)` : "No empty folders found", "success");
            refreshCurrentBookmarkView();
            return;
          }

          removeBookmarksByIds(emptyFolderIds, ({ removed, failed }) => {
            if (!removed && failed) {
              showStatus("Could not delete empty folders", "error");
              return;
            }
            if (failed) {
              showStatus(`Deleted ${removed} empty folder(s), ${failed} failed`, "error");
              refreshCurrentBookmarkView();
              return;
            }
            deleteEmptyFoldersRecursively(totalDeleted + removed);
          });
        });
      };
      deleteEmptyFoldersRecursively();
    });
  };

  // ========== Event Listeners Setup ==========
  const setupEventListeners = () => {
    document.getElementById("clearRecent")?.addEventListener('click', () => {
      chrome.storage.local.set({ recentBookmarks: [] }, () => {
        recentBookmarks = [];
        renderRecentBookmarks();
        showStatus('✨ Recent bookmarks cleared', 'success');
      });
    });

    document.getElementById("openBookmarkOverlay")?.addEventListener("click", openOverlay);
    document.getElementById("cancelOverlay")?.addEventListener("click", closeOverlay);
    
    document.getElementById("refreshActiveTabs")?.addEventListener("click", loadActiveTabs);
    document.getElementById("saveAllTabsToSession")?.addEventListener("click", saveAllTabsToSession);
    document.getElementById("bookmarkAllTabs")?.addEventListener("click", bookmarkAllTabs);

    bookmarkOverlay?.addEventListener("click", (event) => {
      if (event.target === bookmarkOverlay) closeOverlay();
    });

    detailsOverlay?.addEventListener("click", (event) => {
      if (event.target === detailsOverlay) detailsOverlay.classList.add("hidden");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (bookmarkOverlay && !bookmarkOverlay.classList.contains("hidden")) closeOverlay();
        if (detailsOverlay && !detailsOverlay.classList.contains("hidden")) detailsOverlay.classList.add("hidden");
      }
    });

    categoryInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        document.getElementById("confirmAddBookmark")?.click();
      }
    });
  };

  // ========== Initialization ==========
  const init = () => {
    setupSearchFilters();
    setupSearch();
    setupBookmarkCreation();
    setupDetailsOverlay();
    setupExportImport();
    setupSessionsUI();
    setupQuickSessions();
    setupCleanup();
    setupEventListeners();
    
    loadRecentBookmarks();
    renderFolderTree();
    refreshOverview();
    renderAllBookmarks();
    loadSessions();
    loadActiveTabs();
    
    // Auto-refresh active tabs every 5 seconds
    setInterval(loadActiveTabs, 5000);
  };

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

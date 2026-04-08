/**
 * SnipVault v2 – Popup Controller
 * Orchestrates all UI, state, events. No innerHTML. CSP-safe.
 */

document.addEventListener('DOMContentLoaded', () => {
  const safeText = value => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '');

  /* ══ STATE ══════════════════════════════════════════════════════ */
  const state = {
    snippets: [],
    collections: [],
    settings: {},
    activeTab: 'snippets',
    editingId: null,
    editingCollId: null,
    pendingDeleteId: null,
    tags: [],            // tags on current edit
    filterLang: '',
    query: '',
    hasChanges: false,
    selectedColor: '#2563EB',
    PAGE_SIZE: 20,
  };

  /* ══ DOM REFS ═══════════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const dom = {
    app: $('app'),
    toast: $('toast'),
    totalBadge: $('totalBadge'),
    // tabs
    tabs: document.querySelectorAll('.tab'),
    views: { snippets: $('view-snippets'), favorites: $('view-favorites'), collections: $('view-collections'), settings: $('view-settings') },
    // snippets view
    searchInput: $('searchInput'),
    searchClear: $('searchClear'),
    langFilter: $('langFilter'),
    snippetList: $('snippetList'),
    emptyState: $('emptyState'),
    emptyTitle: $('emptyTitle'),
    emptySub: $('emptySub'),
    emptyCreateBtn: $('emptyCreateBtn'),
    // favorites
    favoritesList: $('favoritesList'),
    favEmpty: $('favEmpty'),
    // collections
    collectionsGrid: $('collectionsGrid'),
    collectionsEmpty: $('collectionsEmpty'),
    newCollectionBtn: $('newCollectionBtn'),
    // settings
    themeSelect: $('themeSelect'),
    defaultLangSelect: $('defaultLangSelect'),
    fontSizeSelect: $('fontSizeSelect'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
    // header
    newSnippetBtn: $('newSnippetBtn'),
    themeToggleBtn: $('themeToggleBtn'),
    // editor modal
    editorOverlay: $('editorOverlay'),
    editorTitle: $('editorTitle'),
    snippetTitle: $('snippetTitle'),
    snippetLang: $('snippetLang'),
    snippetCollection: $('snippetCollection'),
    tagsEditor: $('tagsEditor'),
    tagsChips: $('tagsChips'),
    tagsInput: $('tagsInput'),
    snippetCode: $('snippetCode'),
    lineNumbers: $('lineNumbers'),
    lineCount: $('lineCount'),
    detectLangBtn: $('detectLangBtn'),
    favoriteToggle: $('favoriteToggle'),
    saveSnippet: $('saveSnippet'),
    cancelEdit: $('cancelEdit'),
    closeEditor: $('closeEditor'),
    // collection modal
    collectionOverlay: $('collectionOverlay'),
    collectionName: $('collectionName'),
    colorPicker: $('colorPicker'),
    saveCollection: $('saveCollection'),
    cancelCollection: $('cancelCollection'),
    closeCollectionModal: $('closeCollectionModal'),
    // delete modal
    deleteOverlay: $('deleteOverlay'),
    confirmDelete: $('confirmDelete'),
    cancelDelete: $('cancelDelete'),
  };

  /* ══ INIT ═══════════════════════════════════════════════════════ */
  async function init() {
    const [sr, cr, settings] = await Promise.all([
      SnippetService.loadSnippets(),
      SnippetService.loadCollections(),
      SnippetService.loadSettings(),
    ]);
    state.snippets = sr.snippets || [];
    state.collections = cr || [];
    state.settings = settings;

    applySettings();
    buildColorPicker();
    bindEvents();
    renderAll();
    dom.searchInput.focus();
  }

  function applySettings() {
    const theme = state.settings.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (dom.themeSelect) dom.themeSelect.value = theme;
    updateThemeToggleVisual(theme);

    const fs = Number(state.settings.fontSize) || 13;
    document.documentElement.style.setProperty('--code-size', fs + 'px');
    if (dom.fontSizeSelect) dom.fontSizeSelect.value = String(fs);
    if (dom.defaultLangSelect) dom.defaultLangSelect.value = state.settings.defaultLanguage || 'javascript';

    syncDropdown('themeSelect');
    syncDropdown('fontSizeSelect');
    syncDropdown('defaultLangSelect');
  }

  /* ══ EVENTS ═════════════════════════════════════════════════════ */
  function bindEvents() {
    // Header
    dom.newSnippetBtn.addEventListener('click', () => openEditor());
    dom.themeToggleBtn.addEventListener('click', async () => {
      const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
      state.settings.theme = nextTheme;
      document.documentElement.setAttribute('data-theme', nextTheme);
      updateThemeToggleVisual(nextTheme);
      if (dom.themeSelect) dom.themeSelect.value = nextTheme;
      syncDropdown('themeSelect');
      await SnippetService.saveSettings(state.settings);
    });

    // Tabs
    dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Search
    dom.searchInput.addEventListener('input', Helpers.debounce(() => {
      state.query = dom.searchInput.value;
      dom.searchClear.classList.toggle('hidden', !state.query);
      renderSnippets();
    }, 120));
    dom.searchClear.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.query = '';
      dom.searchClear.classList.add('hidden');
      renderSnippets();
      dom.searchInput.focus();
    });

    // Lang filter
    dom.langFilter.addEventListener('change', () => {
      state.filterLang = dom.langFilter.value;
      renderSnippets();
    });

    // Empty state create
    dom.emptyCreateBtn.addEventListener('click', () => openEditor());

    // New collection
    dom.newCollectionBtn.addEventListener('click', () => openCollectionModal());

    // Settings
    dom.themeSelect.addEventListener('change', async () => {
      const theme = dom.themeSelect.value === 'dark' ? 'dark' : 'light';
      state.settings.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeToggleVisual(theme);
      await SnippetService.saveSettings(state.settings);
      syncDropdown('themeSelect');
    });
    dom.defaultLangSelect.addEventListener('change', async () => {
      state.settings.defaultLanguage = dom.defaultLangSelect.value;
      await SnippetService.saveSettings(state.settings);
    });
    dom.fontSizeSelect.addEventListener('change', async () => {
      state.settings.fontSize = Number(dom.fontSizeSelect.value);
      document.documentElement.style.setProperty('--code-size', state.settings.fontSize + 'px');
      await SnippetService.saveSettings(state.settings);
    });
    dom.exportBtn.addEventListener('click', onExport);
    dom.importBtn.addEventListener('click', () => dom.importFile.click());
    dom.importFile.addEventListener('change', onImport);

    // Editor modal
    dom.snippetCode.addEventListener('input', () => {
      state.hasChanges = true;
      updateLineNumbers();
    });
    dom.snippetTitle.addEventListener('input', () => { state.hasChanges = true; });
    dom.snippetLang.addEventListener('change', () => { state.hasChanges = true; });
    dom.detectLangBtn.addEventListener('click', () => {
      const lang = SnippetService.detectLanguage(dom.snippetCode.value);
      dom.snippetLang.value = lang;
      syncDropdown('snippetLang');
      toast(`Detected: ${lang}`, 'info');
    });
    dom.tagsInput.addEventListener('keydown', onTagKeydown);
    dom.tagsInput.addEventListener('blur', () => {
      const v = dom.tagsInput.value.trim();
      if (v) addTag(v);
    });
    dom.saveSnippet.addEventListener('click', onSave);
    dom.cancelEdit.addEventListener('click', onCancelEdit);
    dom.closeEditor.addEventListener('click', onCancelEdit);
    dom.editorOverlay.addEventListener('click', e => { if (e.target === dom.editorOverlay) onCancelEdit(); });

    // Collection modal
    dom.saveCollection.addEventListener('click', onSaveCollection);
    dom.cancelCollection.addEventListener('click', closeCollectionModal);
    dom.closeCollectionModal.addEventListener('click', closeCollectionModal);
    dom.collectionOverlay.addEventListener('click', e => { if (e.target === dom.collectionOverlay) closeCollectionModal(); });

    // Delete modal
    dom.confirmDelete.addEventListener('click', onConfirmDelete);
    dom.cancelDelete.addEventListener('click', closeDeleteModal);
    dom.deleteOverlay.addEventListener('click', e => { if (e.target === dom.deleteOverlay) closeDeleteModal(); });

    // Keyboard shortcuts
    document.addEventListener('keydown', onGlobalKey);
  }

  function onGlobalKey(e) {
    const inEditor = !dom.editorOverlay.classList.contains('hidden');
    const inCollection = !dom.collectionOverlay.classList.contains('hidden');
    const inDelete = !dom.deleteOverlay.classList.contains('hidden');

    if (e.key === 'Escape') {
      if (inDelete) { closeDeleteModal(); return; }
      if (inCollection) { closeCollectionModal(); return; }
      if (inEditor) { onCancelEdit(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !inEditor) {
      e.preventDefault();
      openEditor();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && inEditor) {
      e.preventDefault();
      onSave();
    }
  }

  /* ══ TAB NAVIGATION ═════════════════════════════════════════════ */
  function switchTab(tab) {
    state.activeTab = tab;
    dom.tabs.forEach(t => {
      const isActive = t.dataset.tab === tab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });
    Object.entries(dom.views).forEach(([key, el]) => {
      el.classList.toggle('active', key === tab);
      el.classList.toggle('hidden', key !== tab);
    });
    if (tab === 'favorites') renderFavorites();
    if (tab === 'collections') renderCollections();
  }

  /* ══ RENDER ═════════════════════════════════════════════════════ */
  function renderAll() {
    updateBadge();
    renderSnippets();
    populateCollectionDropdown();
    syncDropdown('langFilter');
  }

  function updateBadge() {
    dom.totalBadge.textContent = state.snippets.length;
  }

  function getFiltered() {
    return SnippetService.filterSnippets(state.snippets, {
      query: state.query,
      language: state.filterLang,
      tags: [],
      favoritesOnly: false,
      collectionId: null,
    });
  }

  function renderSnippets() {
    dom.snippetList.textContent = '';
    const list = getFiltered().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (!list.length) {
      dom.emptyState.classList.remove('hidden');
      if (state.query || state.filterLang) {
        dom.emptyTitle.textContent = 'No results found';
        dom.emptySub.textContent = 'Try changing your search or filters';
        dom.emptyCreateBtn.classList.add('hidden');
      } else {
        dom.emptyTitle.textContent = 'No snippets yet';
        dom.emptySub.textContent = 'Save your first code snippet to get started';
        dom.emptyCreateBtn.classList.remove('hidden');
      }
      return;
    }

    dom.emptyState.classList.add('hidden');
    // Render with staggered animation delay for first PAGE_SIZE items
    list.slice(0, state.PAGE_SIZE).forEach((snippet, i) => {
      const card = buildCard(snippet);
      card.style.animationDelay = `${i * 18}ms`;
      dom.snippetList.appendChild(card);
    });

    // Load more on scroll
    if (list.length > state.PAGE_SIZE) {
      const sentinel = document.createElement('div');
      sentinel.className = 'load-more-sentinel';
      sentinel.style.height = '1px';
      dom.snippetList.appendChild(sentinel);
      const io = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          list.slice(state.PAGE_SIZE).forEach(snippet => dom.snippetList.appendChild(buildCard(snippet)));
          sentinel.remove();
        }
      }, { root: dom.snippetList.closest('.view') });
      io.observe(sentinel);
    }
  }

  function renderFavorites() {
    dom.favoritesList.textContent = '';
    const favs = state.snippets.filter(s => s.favorite).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!favs.length) {
      dom.favEmpty.classList.remove('hidden');
      return;
    }
    dom.favEmpty.classList.add('hidden');
    favs.forEach(s => dom.favoritesList.appendChild(buildCard(s)));
  }

  function renderCollections() {
    dom.collectionsGrid.textContent = '';
    if (!state.collections.length) {
      dom.collectionsEmpty.classList.remove('hidden');
      return;
    }
    dom.collectionsEmpty.classList.add('hidden');
    state.collections.forEach(coll => {
      const count = state.snippets.filter(s => s.collectionId === coll.id).length;
      dom.collectionsGrid.appendChild(buildCollectionCard(coll, count));
    });
  }

  /* ══ CARD BUILDER ═══════════════════════════════════════════════ */
  function buildCard(snippet) {
    const coll = state.collections.find(c => c.id === snippet.collectionId);
    const langLabel = Helpers.langLabel(snippet.language);
    const langColor = Helpers.langColor(snippet.language);

    const card = document.createElement('article');
    card.className = 'snippet-card';
    card.setAttribute('role', 'listitem');
    card.dataset.id = snippet.id;

    // Head
    const head = document.createElement('div');
    head.className = 'card-head';

    const badge = document.createElement('div');
    badge.className = 'card-lang-badge';
    badge.textContent = langLabel;
    badge.style.background = langColor + '22';
    badge.style.color = langColor;

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = safeText(snippet.title);
    titleEl.title = safeText(snippet.title);

    const infoRow = document.createElement('div');
    infoRow.className = 'card-info';

    const dateEl = document.createElement('span');
    dateEl.className = 'card-date';
    dateEl.textContent = Helpers.formatDate(snippet.updatedAt);

    infoRow.appendChild(dateEl);

    if (coll) {
      const collTag = document.createElement('span');
      collTag.className = 'card-collection-tag';
      collTag.textContent = safeText(coll.name);
      collTag.style.background = coll.color + '22';
      collTag.style.color = coll.color;
      infoRow.appendChild(collTag);
    }

    meta.append(titleEl, infoRow);
    head.append(badge, meta);
    card.appendChild(head);

    // Tags
    if (snippet.tags?.length) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'card-tags';
      snippet.tags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = '#' + safeText(tag);
        pill.addEventListener('click', () => {
          state.query = tag;
          dom.searchInput.value = tag;
          dom.searchClear.classList.toggle('hidden', !state.query);
          switchTab('snippets');
          renderSnippets();
        });
        tagsRow.appendChild(pill);
      });
      card.appendChild(tagsRow);
    }

    // Code Preview
    const codeWrap = document.createElement('div');
    codeWrap.className = 'card-code-wrap';
    const codePre = document.createElement('pre');
    codePre.className = 'card-code';
    Highlighter.render(snippet.code.slice(0, 300), snippet.language, codePre);
    codeWrap.appendChild(codePre);
    card.appendChild(codeWrap);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const copyBtn = makeCardBtn('Copy', 'success', async () => {
      const ok = await Helpers.copyToClipboard(snippet.code);
      if (ok) {
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');
        toast('Copied to clipboard', 'success');
        // track usage
        const s = state.snippets.find(x => x.id === snippet.id);
        if (s) { s.usageCount = (s.usageCount || 0) + 1; await SnippetService.saveSnippets(state.snippets); }
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
      }
    });

    const insertBtn = makeCardBtn('Insert', '', () => insertSnippet(snippet));
    const editBtn = makeCardBtn('Edit', 'primary', () => openEditor(snippet));
    const deleteBtn = makeCardBtn('Delete', 'danger', () => openDeleteModal(snippet.id));

    const favBtn = document.createElement('button');
    favBtn.className = 'card-btn fav-btn' + (snippet.favorite ? ' active' : '');
    favBtn.title = snippet.favorite ? 'Remove from favorites' : 'Add to favorites';
    favBtn.textContent = snippet.favorite ? '★' : '☆';
    favBtn.setAttribute('aria-label', snippet.favorite ? 'Unfavorite' : 'Favorite');
    favBtn.addEventListener('click', async () => {
      const s = state.snippets.find(x => x.id === snippet.id);
      if (s) {
        s.favorite = !s.favorite;
        await SnippetService.saveSnippets(state.snippets);
        toast(s.favorite ? 'Added to favorites ★' : 'Removed from favorites', 'info');
        renderAll();
      }
    });

    actions.append(copyBtn, insertBtn, editBtn, deleteBtn, favBtn);
    card.appendChild(actions);

    return card;
  }

  function makeCardBtn(label, type, onClick) {
    const btn = document.createElement('button');
    btn.className = 'card-btn' + (type ? ` ${type}` : '');
    btn.textContent = label;
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', onClick);
    return btn;
  }

  /* ══ COLLECTION CARD ════════════════════════════════════════════ */
  function buildCollectionCard(coll, count) {
    const card = document.createElement('div');
    card.className = 'collection-card';

    const dot = document.createElement('div');
    dot.className = 'coll-dot';
    dot.style.background = coll.color || '#2563EB';

    const name = document.createElement('div');
    name.className = 'coll-name';
    name.textContent = safeText(coll.name);

    const countEl = document.createElement('div');
    countEl.className = 'coll-count';
    countEl.textContent = `${count} snippet${count !== 1 ? 's' : ''}`;

    const actions = document.createElement('div');
    actions.className = 'coll-actions';

    const viewBtn = makeCardBtn('View', 'primary', () => {
      state.activeTab = 'snippets';
      switchTab('snippets');
      // Filter by this collection
      state.query = '';
      dom.searchInput.value = '';
      // temporarily filter by collection - add collection to query display
      const filtered = state.snippets.filter(s => s.collectionId === coll.id);
      dom.snippetList.textContent = '';
      dom.emptyState.classList.add('hidden');
      if (!filtered.length) {
        dom.emptyState.classList.remove('hidden');
        dom.emptyTitle.textContent = `No snippets in "${coll.name}"`;
        dom.emptySub.textContent = 'Add snippets to this collection when creating';
        dom.emptyCreateBtn.classList.remove('hidden');
        return;
      }
      filtered.forEach(s => dom.snippetList.appendChild(buildCard(s)));
    });

    const deleteCollBtn = makeCardBtn('Delete', 'danger', async () => {
      state.collections = state.collections.filter(c => c.id !== coll.id);
      // Unassign snippets
      state.snippets.forEach(s => { if (s.collectionId === coll.id) s.collectionId = null; });
      await Promise.all([SnippetService.saveCollections(state.collections), SnippetService.saveSnippets(state.snippets)]);
      toast('Collection deleted', 'info');
      renderAll();
      renderCollections();
    });

    actions.append(viewBtn, deleteCollBtn);
    card.append(dot, name, countEl, actions);
    return card;
  }

  /* ══ EDITOR ═════════════════════════════════════════════════════ */
  function openEditor(snippet = null) {
    state.editingId = snippet?.id || null;
    state.tags = [...(snippet?.tags || [])];
    state.hasChanges = false;

    dom.editorTitle.textContent = snippet ? 'Edit Snippet' : 'New Snippet';
    dom.snippetTitle.value = snippet?.title || '';
    dom.snippetLang.value = snippet?.language || state.settings.defaultLanguage || 'javascript';
    dom.snippetCode.value = snippet?.code || '';
    dom.favoriteToggle.checked = snippet?.favorite || false;

    // Collection dropdown
    populateCollectionDropdown();
    dom.snippetCollection.value = snippet?.collectionId || '';
    syncDropdown('snippetLang');
    syncDropdown('snippetCollection');

    renderTagChips();
    updateLineNumbers();
    dom.editorOverlay.classList.remove('hidden');
    setTimeout(() => dom.snippetTitle.focus(), 80);
  }

  function populateCollectionDropdown() {
    // Clear all except first option
    while (dom.snippetCollection.options.length > 1) dom.snippetCollection.remove(1);
    state.collections.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      dom.snippetCollection.appendChild(opt);
    });
    syncDropdown('snippetCollection');
  }

  function closeEditor() {
    dom.editorOverlay.classList.add('hidden');
    state.editingId = null;
    state.tags = [];
    state.hasChanges = false;
    dom.snippetCode.value = '';
    dom.snippetTitle.value = '';
    dom.tagsChips.textContent = '';
    dom.lineNumbers.textContent = '';
  }

  function onCancelEdit() {
    if (state.hasChanges) {
      // Use native confirm since it's inside popup context
      if (!window.confirm('Discard unsaved changes?')) return;
    }
    closeEditor();
  }

  async function onSave() {
    const title = dom.snippetTitle.value.trim();
    const code = dom.snippetCode.value;
    const language = dom.snippetLang.value;
    const collectionId = dom.snippetCollection.value || null;
    const favorite = dom.favoriteToggle.checked;

    const v = SnippetService.validate({ title, code });
    if (!v.valid) { toast(v.error, 'error'); return; }

    if (state.editingId) {
      const idx = state.snippets.findIndex(s => s.id === state.editingId);
      if (idx >= 0) {
        state.snippets[idx] = SnippetService.updateSnippet(state.snippets[idx], { title, code, language, tags: state.tags, collectionId });
        state.snippets[idx].favorite = favorite;
      }
    } else {
      const newSnippet = SnippetService.createSnippet({ title, code, language, tags: state.tags, collectionId });
      newSnippet.favorite = favorite;
      state.snippets.push(newSnippet);
    }

    const result = await SnippetService.saveSnippets(state.snippets);
    if (!result.ok) { toast('Save failed: ' + result.error, 'error'); return; }
    if (result.warning) toast(result.warning, 'warning');
    else toast(state.editingId ? 'Snippet updated ✓' : 'Snippet saved ✓', 'success');

    closeEditor();
    renderAll();
  }

  /* ══ TAGS ═══════════════════════════════════════════════════════ */
  function onTagKeydown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = dom.tagsInput.value.trim().replace(/,/g, '');
      if (v) { addTag(v); dom.tagsInput.value = ''; }
    } else if (e.key === 'Backspace' && !dom.tagsInput.value && state.tags.length) {
      state.tags.pop();
      renderTagChips();
    }
  }

  function addTag(tag) {
    const t = tag.toLowerCase().trim();
    if (t && !state.tags.includes(t) && state.tags.length < 10) {
      state.tags.push(t);
      renderTagChips();
    }
    dom.tagsInput.value = '';
  }

  function renderTagChips() {
    dom.tagsChips.textContent = '';
    state.tags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      const label = document.createTextNode('#' + tag);
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'tag-chip-remove';
      rm.textContent = '×';
      rm.setAttribute('aria-label', 'Remove tag ' + tag);
      rm.addEventListener('click', () => {
        state.tags = state.tags.filter(t => t !== tag);
        renderTagChips();
      });
      chip.append(label, rm);
      dom.tagsChips.appendChild(chip);
    });
  }

  /* ══ LINE NUMBERS ═══════════════════════════════════════════════ */
  function updateLineNumbers() {
    const lines = dom.snippetCode.value.split('\n');
    const count = lines.length;
    dom.lineCount.textContent = `${count} line${count !== 1 ? 's' : ''}`;
    const nums = [];
    for (let i = 1; i <= count; i++) nums.push(i);
    dom.lineNumbers.textContent = nums.join('\n');

    // Sync scroll
    dom.lineNumbers.scrollTop = dom.snippetCode.scrollTop;
  }

  // Sync line numbers on textarea scroll
  dom.snippetCode.addEventListener('scroll', () => {
    dom.lineNumbers.scrollTop = dom.snippetCode.scrollTop;
  });

  /* ══ DELETE ═════════════════════════════════════════════════════ */
  function openDeleteModal(id) {
    state.pendingDeleteId = id;
    dom.deleteOverlay.classList.remove('hidden');
    dom.confirmDelete.focus();
  }
  function closeDeleteModal() {
    state.pendingDeleteId = null;
    dom.deleteOverlay.classList.add('hidden');
  }
  async function onConfirmDelete() {
    state.snippets = state.snippets.filter(s => s.id !== state.pendingDeleteId);
    await SnippetService.saveSnippets(state.snippets);
    toast('Snippet deleted', 'info');
    closeDeleteModal();
    renderAll();
  }

  /* ══ COLLECTIONS MODAL ══════════════════════════════════════════ */
  const COLLECTION_COLORS = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2','#BE185D','#374151'];

  function buildColorPicker() {
    dom.colorPicker.textContent = '';
    COLLECTION_COLORS.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch' + (color === state.selectedColor ? ' selected' : '');
      swatch.style.background = color;
      swatch.title = color;
      swatch.addEventListener('click', () => {
        state.selectedColor = color;
        dom.colorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      dom.colorPicker.appendChild(swatch);
    });
  }

  function openCollectionModal(coll = null) {
    state.editingCollId = coll?.id || null;
    dom.collectionName.value = coll?.name || '';
    state.selectedColor = coll?.color || '#2563EB';
    buildColorPicker();
    dom.collectionOverlay.classList.remove('hidden');
    setTimeout(() => dom.collectionName.focus(), 80);
  }

  function closeCollectionModal() {
    dom.collectionOverlay.classList.add('hidden');
    state.editingCollId = null;
    dom.collectionName.value = '';
  }

  async function onSaveCollection() {
    const name = dom.collectionName.value.trim();
    if (!name) { toast('Collection name is required', 'error'); return; }

    if (state.editingCollId) {
      const c = state.collections.find(c => c.id === state.editingCollId);
      if (c) { c.name = name; c.color = state.selectedColor; }
    } else {
      state.collections.push({ id: SnippetService.generateId(), name, color: state.selectedColor });
    }

    await SnippetService.saveCollections(state.collections);
    toast('Collection saved ✓', 'success');
    closeCollectionModal();
    renderAll();
    renderCollections();
    populateCollectionDropdown();
  }

  /* ══ INSERT TO PAGE ═════════════════════════════════════════════ */
  async function insertSnippet(snippet) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { toast('No active tab found', 'error'); return; }
      await chrome.tabs.sendMessage(tab.id, { action: 'insertCode', code: snippet.code, language: snippet.language });
      toast('Code inserted to page ✓', 'success');
      setTimeout(() => window.close(), 700);
    } catch {
      toast('Cannot insert on this page', 'error');
    }
  }

  /* ══ EXPORT / IMPORT ════════════════════════════════════════════ */
  function onExport() {
    if (!state.snippets.length) { toast('No snippets to export', 'info'); return; }
    Helpers.downloadJSON(state.snippets, `snipvault-${new Date().toISOString().slice(0, 10)}.json`);
    toast(`Exported ${state.snippets.length} snippets ✓`, 'success');
  }

  async function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) { toast('Invalid file format', 'error'); return; }
      const merged = SnippetService.mergeImport(state.snippets, parsed);
      const added = merged.length - state.snippets.length;
      state.snippets = merged;
      await SnippetService.saveSnippets(state.snippets);
      toast(`Imported ${added} new snippet${added !== 1 ? 's' : ''} ✓`, 'success');
      renderAll();
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    } finally {
      dom.importFile.value = '';
    }
  }

  /* ══ TOAST ══════════════════════════════════════════════════════ */
  function updateThemeToggleVisual(theme) {
    if (!dom.themeToggleBtn) return;
    const path = dom.themeToggleBtn.querySelector('path');
    if (!path) return;

    if (theme === 'dark') {
      // Sun icon when dark mode is active (click to switch to light)
      path.setAttribute('d', 'M8 2.2V3.4M8 12.6V13.8M3.4 8H2.2M13.8 8H12.6M4.7 4.7L3.8 3.8M12.2 12.2L11.3 11.3M12.2 3.8L11.3 4.7M4.7 11.3L3.8 12.2M8 5.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6z');
      dom.themeToggleBtn.title = 'Switch to Light Mode';
      dom.themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      // Moon icon when light mode is active (click to switch to dark)
      path.setAttribute('d', 'M10.8 2.2a5.8 5.8 0 11-8 8 6 6 0 008-8z');
      dom.themeToggleBtn.title = 'Switch to Dark Mode';
      dom.themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  function syncDropdown(id) {
    if (window.SnipDropdowns && typeof window.SnipDropdowns.sync === 'function') {
      window.SnipDropdowns.sync(id);
    }
  }

  let _toastTimer;
  function toast(msg, type = 'info') {
    clearTimeout(_toastTimer);
    dom.toast.textContent = msg;
    dom.toast.className = `toast show ${type}`;
    _toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2800);
  }

  /* ══ START ══════════════════════════════════════════════════════ */
  init().catch(err => {
    console.error('SnipVault init error:', err);
  });
});

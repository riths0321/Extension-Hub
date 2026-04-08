/**
 * popup.js — Quick Link Manager Pro
 * Bugs fixed:
 * 1. render() called unconditionally (not just inside sendMessage callback)
 *    → Fixes: links saved but "No links yet" showing (race condition)
 * 2. confirm() replaced with custom modal (confirm() blocked in extensions)
 * 3. Favorites section correctly hidden when no favorites exist
 * 4. emptyState / noResults / allLinksSection visibility logic made bulletproof
 * 5. All CSP violations removed
 */

import { StorageService } from '../services/storage.js';
import { TaggingService }  from '../services/tagging.js';
import { SearchService }   from '../services/search.js';
import {
  getDomain, getIcon, generateId, relativeTime,
  debounce, downloadFile, el, createSvg
} from '../utils/helpers.js';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
const state = {
  links:              [],
  archive:            [],
  readLater:          [],
  query:              '',
  activeTags:         new Set(),
  currentDomain:      '',
  modalTags:          [],
  editTags:           [],
  toastTimer:         null,
  sortBy:             'date',
  currentArchiveView: 'archived',
  currentEditLink:    null,
  confirmCallback:    null,  // for custom confirm modal
};

// ─────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────
function g(id) {
  const e = document.getElementById(id);
  if (!e) console.warn(`[QLM] Element #${id} not found`);
  return e;
}

const DOM = {
  searchInput:         g('searchInput'),
  btnClearSearch:      g('btnClearSearch'),
  tagFilterRow:        g('tagFilterRow'),
  favoritesSection:    g('favoritesSection'),
  favoritesList:       g('favoritesList'),
  allLinksSection:     g('allLinksSection'),
  linksList:           g('linksList'),
  sectionLabel:        g('sectionLabel'),
  sectionCount:        g('sectionCount'),
  emptyState:          g('emptyState'),
  noResults:           g('noResults'),
  btnSaveCurrent:      g('btnSaveCurrent'),
  btnOpenAll:          g('btnOpenAll'),
  btnExport:           g('btnExport'),
  btnImport:           g('btnImport'),
  btnArchive:          g('btnArchive'),
  btnReadLater:        g('btnReadLater'),
  btnHelp:             g('btnHelp'),
  importFileInput:     g('importFileInput'),
  sortByDate:          g('sortByDate'),
  sortByLastOpened:    g('sortByLastOpened'),
  // Save modal
  saveModal:           g('saveModal'),
  modalClose:          g('modalClose'),
  modalTitle:          g('modalTitle'),
  modalUrl:            g('modalUrl'),
  modalTagsContainer:  g('modalTagsContainer'),
  modalTagInput:       g('modalTagInput'),
  modalAddTag:         g('modalAddTag'),
  modalNote:           g('modalNote'),
  modalCancel:         g('modalCancel'),
  modalSave:           g('modalSave'),
  tagSuggestions:      g('tagSuggestions'),
  // Edit modal
  editModal:           g('editModal'),
  editModalClose:      g('editModalClose'),
  editTitle:           g('editTitle'),
  editUrl:             g('editUrl'),
  editTagsContainer:   g('editTagsContainer'),
  editTagInput:        g('editTagInput'),
  editAddTag:          g('editAddTag'),
  editNote:            g('editNote'),
  editModalCancel:     g('editModalCancel'),
  editModalSave:       g('editModalSave'),
  // Other modals
  readLaterModal:      g('readLaterModal'),
  readLaterModalClose: g('readLaterModalClose'),
  readLaterList:       g('readLaterList'),
  helpModal:           g('helpModal'),
  helpModalClose:      g('helpModalClose'),
  exportModal:         g('exportModal'),
  exportModalClose:    g('exportModalClose'),
  exportJSON:          g('exportJSON'),
  exportMarkdown:      g('exportMarkdown'),
  exportHTML:          g('exportHTML'),
  archiveModal:        g('archiveModal'),
  archiveModalClose:   g('archiveModalClose'),
  archiveList:         g('archiveList'),
  tabActive:           g('tabActive'),
  tabArchived:         g('tabArchived'),
  toast:               g('toast'),
  // Custom confirm modal
  confirmModal:        g('confirmModal'),
  confirmMessage:      g('confirmMessage'),
  confirmOk:           g('confirmOk'),
  confirmCancel:       g('confirmCancel'),
};

// ─────────────────────────────────────────
// SVG ICONS (CSP-safe via createSvg)
// ─────────────────────────────────────────
const Icons = {
  star:    () => createSvg('14','14','0 0 24 24',[['polygon',{points:'12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'}]]),
  copy:    () => createSvg('14','14','0 0 24 24',[['rect',{x:'9',y:'9',width:'13',height:'13',rx:'2',ry:'2'}],['path',{d:'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'}]]),
  edit:    () => createSvg('14','14','0 0 24 24',[['path',{d:'M17 3l4 4-7 7H10v-4l7-7z'}],['path',{d:'M4 20h16'}]]),
  archive: () => createSvg('14','14','0 0 24 24',[['path',{d:'M21 8v13H3V8'}],['path',{d:'M1 3h22v5H1z'}],['line',{x1:'10',y1:'12',x2:'14',y2:'12'}]]),
  clock:   () => createSvg('14','14','0 0 24 24',[['circle',{cx:'12',cy:'12',r:'10'}],['polyline',{points:'12 6 12 12 16 14'}]]),
  open:    () => createSvg('14','14','0 0 24 24',[['path',{d:'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'}],['polyline',{points:'15 3 21 3 21 9'}],['line',{x1:'10',y1:'14',x2:'21',y2:'3'}]]),
  delete:  () => createSvg('14','14','0 0 24 24',[['polyline',{points:'3 6 5 6 21 6'}],['path',{d:'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0h10'}],['line',{x1:'10',y1:'11',x2:'10',y2:'17'}],['line',{x1:'14',y1:'11',x2:'14',y2:'17'}]]),
};

// ─────────────────────────────────────────
// CUSTOM CONFIRM DIALOG  (replaces blocked confirm())
// ─────────────────────────────────────────
function showConfirm(message, onConfirm) {
  if (!DOM.confirmModal || !DOM.confirmMessage) return;
  DOM.confirmMessage.textContent = message;
  state.confirmCallback = onConfirm;
  openModal(DOM.confirmModal);
}

// ─────────────────────────────────────────
// INIT  — FIX: render() called unconditionally
// ─────────────────────────────────────────
async function init() {
  try {
    await loadData();

    // FIX: Render immediately with loaded data — don't wait for sendMessage
    render();

    // Then try to get active tab domain (non-blocking)
    try {
      chrome.runtime.sendMessage({ action: 'getActiveTab' }, (res) => {
        if (chrome.runtime.lastError) return; // service worker dormant — ignore
        if (res && res.tab && res.tab.url) {
          try {
            state.currentDomain = new URL(res.tab.url).hostname.replace('www.', '');
            render(); // re-render with domain priority
          } catch (_) {}
        }
      });
    } catch (_) {}

    bindEvents();
    bindKeyboardShortcuts();
    loadTagSuggestions();
  } catch (err) {
    console.error('[QLM] Init error:', err);
    showToast('Error loading extension');
  }
}

async function loadData() {
  try {
    state.links     = await StorageService.getLinks();
    state.archive   = await StorageService.getArchive();
    state.readLater = await StorageService.getReadLater();
    const settings  = await StorageService.getSettings();
    state.sortBy    = settings.sortBy || 'date';
    updateSortButtons();
  } catch (err) {
    console.error('[QLM] Load data error:', err);
    state.links = []; state.archive = []; state.readLater = [];
  }
}

function updateSortButtons() {
  if (DOM.sortByDate)       DOM.sortByDate.classList.toggle('active', state.sortBy === 'date');
  if (DOM.sortByLastOpened) DOM.sortByLastOpened.classList.toggle('active', state.sortBy === 'lastOpened');
}

function getSortedLinks(links) {
  const sorted = [...links];
  if (state.sortBy === 'lastOpened') {
    sorted.sort((a, b) => {
      const at = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
      const bt = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
      return bt - at;
    });
  } else {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return sorted;
}

// ─────────────────────────────────────────
// RENDER — FIX: bulletproof visibility logic
// ─────────────────────────────────────────
function render() {
  if (!DOM.linksList) return;

  const isFiltering = !!state.query || state.activeTags.size > 0;
  const favorites   = state.links.filter(l => l.favorite);
  const filtered    = getSortedLinks(
    SearchService.filter(state.links, state.query, state.activeTags, state.currentDomain)
  );

  // ── FAVORITES SECTION ──
  // Show only when: has favorites AND not filtering by search/tag
  const showFavorites = favorites.length > 0 && !isFiltering;
  if (DOM.favoritesSection) {
    DOM.favoritesSection.hidden = !showFavorites;
    if (showFavorites && DOM.favoritesList) {
      clearList(DOM.favoritesList);
      getSortedLinks(favorites).forEach(l => DOM.favoritesList.appendChild(createCard(l)));
    }
  }

  // ── TAG ROW ──
  renderTagRow();

  // ── VISIBILITY STATES (mutually exclusive) ──
  const hasLinks   = state.links.length > 0;
  const hasResults = filtered.length > 0;

  // Empty state: no links at all, not filtering
  if (DOM.emptyState)      DOM.emptyState.hidden      = hasLinks || isFiltering;

  // No results: has links but filter/search gave nothing
  if (DOM.noResults)       DOM.noResults.hidden        = !(hasLinks && isFiltering && !hasResults);

  // All links section: only when there are results
  if (DOM.allLinksSection) DOM.allLinksSection.hidden  = !hasResults;

  // ── RENDER CARDS ──
  if (hasResults && DOM.linksList) {
    if (DOM.sectionLabel) {
      DOM.sectionLabel.textContent = state.query
        ? 'Results'
        : state.activeTags.size > 0 ? 'Filtered' : 'All Links';
    }
    if (DOM.sectionCount) DOM.sectionCount.textContent = filtered.length;
    clearList(DOM.linksList);
    filtered.forEach(l => DOM.linksList.appendChild(createCard(l)));
  }

  if (DOM.btnClearSearch) DOM.btnClearSearch.hidden = !state.query;
}

// ─────────────────────────────────────────
// TAG ROW
// ─────────────────────────────────────────
function renderTagRow() {
  if (!DOM.tagFilterRow) return;
  clearList(DOM.tagFilterRow);
  const allTags = TaggingService.getAllTags(state.links);
  if (!allTags.length) return;

  const allChip = createTagChip('All', state.activeTags.size === 0);
  allChip.addEventListener('click', () => { state.activeTags.clear(); render(); });
  DOM.tagFilterRow.appendChild(allChip);

  allTags.slice(0, 10).forEach(tag => {
    const chip = createTagChip(tag, state.activeTags.has(tag));
    chip.addEventListener('click', () => {
      if (state.activeTags.has(tag)) state.activeTags.delete(tag);
      else state.activeTags.add(tag);
      render();
    });
    DOM.tagFilterRow.appendChild(chip);
  });
}

function createTagChip(tag, isActive) {
  const chip = el('button', 'tag-chip' + (isActive ? ' active' : ''));
  chip.textContent = tag;
  return chip;
}

// ─────────────────────────────────────────
// CARD BUILDER
// ─────────────────────────────────────────
function createCard(link) {
  const card = el('div', 'link-card');
  card.dataset.id = link.id;
  card.tabIndex = 0;

  // Favicon
  const favicon = el('div', 'link-favicon');
  favicon.textContent = getIcon(link.url);
  card.appendChild(favicon);

  // Body
  const body    = el('div', 'link-body');
  const titleEl = el('div', 'link-title');
  titleEl.textContent = link.title || link.url;
  body.appendChild(titleEl);

  const domainEl = el('div', 'link-domain');
  domainEl.textContent = getDomain(link.url);
  body.appendChild(domainEl);

  if (link.tags && link.tags.length) {
    const meta = el('div', 'link-meta');
    link.tags.slice(0, 4).forEach(tag => {
      const chip = el('span', 'link-tag');
      chip.textContent = tag;
      meta.appendChild(chip);
    });
    body.appendChild(meta);
  }

  if (link.note) {
    const noteEl = el('div', 'link-note');
    noteEl.textContent = '\u201c' + link.note + '\u201d';
    body.appendChild(noteEl);
  }
  card.appendChild(body);

  // Actions
  const actions = el('div', 'card-actions');

  // Star / Favorite
  const favBtn = el('button', 'card-btn fav-btn' + (link.favorite ? ' active' : ''));
  favBtn.title = link.favorite ? 'Unpin favorite' : 'Mark as favorite';
  favBtn.setAttribute('aria-label', favBtn.title);
  favBtn.appendChild(Icons.star());
  favBtn.addEventListener('click', async e => {
    e.stopPropagation();
    await StorageService.toggleFavorite(link.id);
    await loadData();
    render();
  });
  actions.appendChild(favBtn);

  // Copy
  const copyBtn = el('button', 'card-btn copy-btn');
  copyBtn.title = 'Copy URL';
  copyBtn.setAttribute('aria-label', 'Copy URL');
  copyBtn.appendChild(Icons.copy());
  copyBtn.addEventListener('click', async e => {
    e.stopPropagation();
    await navigator.clipboard.writeText(link.url);
    showToast('URL copied!');
  });
  actions.appendChild(copyBtn);

  // Edit
  const editBtn = el('button', 'card-btn edit-btn');
  editBtn.title = 'Edit link';
  editBtn.setAttribute('aria-label', 'Edit link');
  editBtn.appendChild(Icons.edit());
  editBtn.addEventListener('click', e => { e.stopPropagation(); openEditModal(link); });
  actions.appendChild(editBtn);

  // Archive
  const archBtn = el('button', 'card-btn archive-btn');
  archBtn.title = 'Archive link';
  archBtn.setAttribute('aria-label', 'Archive link');
  archBtn.appendChild(Icons.archive());
  archBtn.addEventListener('click', async e => {
    e.stopPropagation();
    await StorageService.archiveLink(link);
    await loadData(); render();
    showToast('Link archived');
  });
  actions.appendChild(archBtn);

  // Read Later
  const rlBtn = el('button', 'card-btn readlater-btn');
  rlBtn.title = 'Add to Read Later';
  rlBtn.setAttribute('aria-label', 'Add to Read Later');
  rlBtn.appendChild(Icons.clock());
  rlBtn.addEventListener('click', async e => {
    e.stopPropagation();
    const added = await StorageService.addToReadLater(link);
    showToast(added ? 'Added to Read Later' : 'Already in queue');
  });
  actions.appendChild(rlBtn);

  // Open in new tab
  const openBtn = el('button', 'card-btn open-btn');
  openBtn.title = 'Open link';
  openBtn.setAttribute('aria-label', 'Open link');
  openBtn.appendChild(Icons.open());
  openBtn.addEventListener('click', async e => {
    e.stopPropagation();
    await StorageService.recordOpen(link.id);
    chrome.tabs.create({ url: link.url, active: true });
  });
  actions.appendChild(openBtn);

  // Delete — FIX: custom confirm instead of blocked confirm()
  const delBtn = el('button', 'card-btn delete-btn');
  delBtn.title = 'Delete link';
  delBtn.setAttribute('aria-label', 'Delete link');
  delBtn.appendChild(Icons.delete());
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    showConfirm('Delete this link?', async () => {
      await StorageService.deleteLink(link.id);
      await loadData(); render();
      showToast('Link deleted');
    });
  });
  actions.appendChild(delBtn);

  card.appendChild(actions);

  // Hover preview tooltip
  let previewTimer;
  card.addEventListener('mouseenter', () => {
    previewTimer = setTimeout(() => showPreview(card, link), 500);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(previewTimer);
    const tip = document.getElementById('qlm-tooltip');
    if (tip) tip.remove();
  });

  // Click → open in background tab
  card.addEventListener('click', async () => {
    await StorageService.recordOpen(link.id);
    chrome.tabs.create({ url: link.url, active: false });
  });

  return card;
}

function showPreview(card, link) {
  // Remove any existing tooltip
  const existing = document.getElementById('qlm-tooltip');
  if (existing) existing.remove();

  const tip = el('div', 'link-preview-tooltip');
  tip.id = 'qlm-tooltip';

  const strong = el('strong');
  strong.textContent = link.title || link.url;
  tip.appendChild(strong);

  const small = el('small');
  small.textContent = getDomain(link.url);
  tip.appendChild(small);

  if (link.note) {
    const em = el('em');
    em.textContent = link.note.substring(0, 100);
    tip.appendChild(em);
  }

  // Append to body so position:fixed works outside any overflow:hidden parent
  document.body.appendChild(tip);

  // Position above the card using fixed coordinates
  const rect = card.getBoundingClientRect();
  // Place above card, or below if no room above
  const tipHeight = 72; // estimated max height
  const topAbove = rect.top - tipHeight - 8;
  const top = topAbove > 0 ? topAbove : rect.bottom + 8;
  tip.style.top  = top + 'px';
  tip.style.left = Math.max(8, rect.left) + 'px';
  tip.style.right = 'auto';

  setTimeout(() => { if (tip.parentNode) tip.remove(); }, 2800);
}

// ─────────────────────────────────────────
// SAVE MODAL
// ─────────────────────────────────────────
function openSaveModal(url, title) {
  if (!DOM.saveModal) return;
  if (DOM.modalUrl)   DOM.modalUrl.value   = url   || '';
  if (DOM.modalTitle) DOM.modalTitle.value = title || '';
  if (DOM.modalNote)  DOM.modalNote.value  = '';
  state.modalTags = url ? TaggingService.generateTags(url, title) : [];
  renderModalTags();
  openModal(DOM.saveModal);
  setTimeout(() => { if (DOM.modalTitle) DOM.modalTitle.focus(); }, 80);

  if (url) {
    StorageService.checkDuplicate(url).then(isDup => {
      if (isDup && DOM.saveModal && !DOM.saveModal.querySelector('.duplicate-warning')) {
        const warn = el('div', 'duplicate-warning');
        warn.textContent = '\u26a0\ufe0f This URL is already saved!';
        const body = DOM.saveModal.querySelector('.modal-body');
        if (body) body.prepend(warn);
      }
    });
  }
}

function closeSaveModal() {
  if (!DOM.saveModal) return;
  closeModal(DOM.saveModal);
  const w = DOM.saveModal.querySelector('.duplicate-warning');
  if (w) w.remove();
}

function renderModalTags() {
  if (!DOM.modalTagsContainer) return;
  clearList(DOM.modalTagsContainer);
  state.modalTags.forEach((tag, idx) => {
    const chip = el('span', 'editable-tag');
    chip.textContent = tag;
    const rm = el('span', 'tag-remove');
    rm.textContent = '\u00d7';
    rm.addEventListener('click', () => { state.modalTags.splice(idx, 1); renderModalTags(); });
    chip.appendChild(rm);
    DOM.modalTagsContainer.appendChild(chip);
  });
}

function addModalTag() {
  if (!DOM.modalTagInput) return;
  const raw = DOM.modalTagInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!raw || state.modalTags.includes(raw) || state.modalTags.length >= 8) return;
  state.modalTags.push(raw);
  DOM.modalTagInput.value = '';
  renderModalTags();
}

async function saveLink() {
  const url   = DOM.modalUrl   ? DOM.modalUrl.value.trim()            : '';
  const title = DOM.modalTitle ? (DOM.modalTitle.value.trim() || url) : url;
  const note  = DOM.modalNote  ? DOM.modalNote.value.trim()           : '';
  if (!url) { showToast('URL is required'); return; }

  const result = await StorageService.addLink({
    id: generateId(), url, title,
    tags:      [...state.modalTags],
    note,
    favorite:  false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (result.duplicate) {
    showToast('Link already saved!');
  } else {
    await loadData();
    closeSaveModal();
    render();
    showToast('Link saved \u2713');
  }
}

// ─────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────
function openEditModal(link) {
  if (!DOM.editModal) return;
  state.currentEditLink = link;
  state.editTags        = [...(link.tags || [])];
  if (DOM.editTitle) DOM.editTitle.value = link.title || '';
  if (DOM.editUrl)   DOM.editUrl.value   = link.url   || '';
  if (DOM.editNote)  DOM.editNote.value  = link.note  || '';
  renderEditTags();
  openModal(DOM.editModal);
}

function renderEditTags() {
  if (!DOM.editTagsContainer) return;
  clearList(DOM.editTagsContainer);
  state.editTags.forEach((tag, idx) => {
    const chip = el('span', 'editable-tag');
    chip.textContent = tag;
    const rm = el('span', 'tag-remove');
    rm.textContent = '\u00d7';
    rm.addEventListener('click', () => { state.editTags.splice(idx, 1); renderEditTags(); });
    chip.appendChild(rm);
    DOM.editTagsContainer.appendChild(chip);
  });
}

function addEditTag() {
  if (!DOM.editTagInput) return;
  const raw = DOM.editTagInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!raw || state.editTags.includes(raw) || state.editTags.length >= 8) return;
  state.editTags.push(raw);
  DOM.editTagInput.value = '';
  renderEditTags();
}

async function saveEdit() {
  if (!state.currentEditLink) return;
  await StorageService.updateLink(state.currentEditLink.id, {
    title: DOM.editTitle ? DOM.editTitle.value.trim() : '',
    url:   DOM.editUrl   ? DOM.editUrl.value.trim()   : '',
    tags:  [...state.editTags],
    note:  DOM.editNote  ? DOM.editNote.value.trim()  : '',
  });
  await loadData();
  closeModal(DOM.editModal);
  render();
  showToast('Link updated');
}

// ─────────────────────────────────────────
// READ LATER MODAL
// ─────────────────────────────────────────
async function openReadLaterModal() {
  if (!DOM.readLaterModal) return;
  state.readLater = await StorageService.getReadLater();
  renderReadLaterList();
  openModal(DOM.readLaterModal);
}

function renderReadLaterList() {
  if (!DOM.readLaterList) return;
  clearList(DOM.readLaterList);
  if (!state.readLater.length) {
    const empty = el('div', 'empty-state');
    empty.style.padding = '40px 20px';
    const p = el('p', 'empty-title');
    p.textContent = 'No links in queue';
    empty.appendChild(p);
    DOM.readLaterList.appendChild(empty);
    return;
  }
  state.readLater.forEach(link => {
    const item    = el('div', 'read-later-item');
    const info    = el('div', 'item-info');
    const titleEl = el('div', 'item-title'); titleEl.textContent = link.title || link.url;
    const domEl   = el('div', 'item-domain'); domEl.textContent  = getDomain(link.url);
    info.appendChild(titleEl); info.appendChild(domEl); item.appendChild(info);

    const acts    = el('div', 'read-later-actions');
    const markBtn = el('button', 'read-later-mark');
    markBtn.textContent = 'Mark Read';
    markBtn.addEventListener('click', async e => {
      e.stopPropagation();
      await StorageService.markAsRead(link.id);
      state.readLater = await StorageService.getReadLater();
      renderReadLaterList();
      showToast('Marked as read');
    });
    acts.appendChild(markBtn);
    item.appendChild(acts);
    item.addEventListener('click', () => chrome.tabs.create({ url: link.url, active: true }));
    DOM.readLaterList.appendChild(item);
  });
}

// ─────────────────────────────────────────
// ARCHIVE MODAL
// ─────────────────────────────────────────
async function openArchiveModal() {
  if (!DOM.archiveModal) return;
  await loadData();
  state.currentArchiveView = 'archived';
  syncArchiveTabs();
  renderArchiveList();
  openModal(DOM.archiveModal);
}

function syncArchiveTabs() {
  if (DOM.tabArchived) DOM.tabArchived.classList.toggle('active', state.currentArchiveView === 'archived');
  if (DOM.tabActive)   DOM.tabActive.classList.toggle('active',   state.currentArchiveView === 'active');
}

function renderArchiveList() {
  if (!DOM.archiveList) return;
  clearList(DOM.archiveList);
  const isArchived = state.currentArchiveView === 'archived';
  const items      = isArchived ? state.archive : state.links;

  if (!items.length) {
    const empty = el('div', 'empty-state'); empty.style.padding = '40px 20px';
    const p = el('p', 'empty-title');
    p.textContent = isArchived ? 'No archived links' : 'No active links';
    empty.appendChild(p); DOM.archiveList.appendChild(empty); return;
  }

  items.forEach(link => {
    const item    = el('div', 'archive-item');
    const info    = el('div', 'item-info');
    const titleEl = el('div', 'item-title'); titleEl.textContent = link.title || link.url;
    const domEl   = el('div', 'item-url');   domEl.textContent   = getDomain(link.url);
    info.appendChild(titleEl); info.appendChild(domEl); item.appendChild(info);

    if (isArchived) {
      const restoreBtn = el('button', 'unarchive-btn');
      restoreBtn.textContent = 'Restore';
      restoreBtn.addEventListener('click', async e => {
        e.stopPropagation();
        await StorageService.unarchiveLink(link.id);
        await loadData(); renderArchiveList(); render();
        showToast('Link restored');
      });
      item.appendChild(restoreBtn);

      // FIX: confirm() → showConfirm()
      const delBtn = el('button', 'delete-permanent-btn');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        showConfirm('Permanently delete this archived link?', async () => {
          await StorageService.deletePermanently(link.id);
          await loadData(); renderArchiveList();
          showToast('Permanently deleted');
        });
      });
      item.appendChild(delBtn);
    } else {
      const archBtn = el('button', 'unarchive-btn');
      archBtn.textContent = 'Archive';
      archBtn.style.cssText = 'color:var(--subtext);background:var(--bg-subtle);border-color:var(--border)';
      archBtn.addEventListener('click', async e => {
        e.stopPropagation();
        await StorageService.archiveLink(link);
        await loadData(); renderArchiveList(); render();
        showToast('Link archived');
      });
      item.appendChild(archBtn);
    }

    item.addEventListener('click', () => chrome.tabs.create({ url: link.url, active: true }));
    DOM.archiveList.appendChild(item);
  });
}

// ─────────────────────────────────────────
// TAG SUGGESTIONS
// ─────────────────────────────────────────
async function loadTagSuggestions() {
  const tags = await StorageService.getAllTags();
  if (!DOM.tagSuggestions) return;
  clearList(DOM.tagSuggestions);
  tags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    DOM.tagSuggestions.appendChild(opt);
  });
}

// ─────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────
function openModal(modal) {
  if (!modal) return;
  document.querySelectorAll('.modal-overlay.is-open').forEach(m => {
    if (m !== modal) m.classList.remove('is-open');
  });
  modal.classList.add('is-open');
}

function closeModal(modal) {
  if (modal) modal.classList.remove('is-open');
}

// ─────────────────────────────────────────
// EVENT BINDING
// ─────────────────────────────────────────
function bindEvents() {
  // Search
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', debounce(e => { state.query = e.target.value; render(); }, 180));
  }
  if (DOM.btnClearSearch) {
    DOM.btnClearSearch.addEventListener('click', () => {
      if (DOM.searchInput) DOM.searchInput.value = '';
      state.query = ''; render();
      if (DOM.searchInput) DOM.searchInput.focus();
    });
  }

  // Save current page
  if (DOM.btnSaveCurrent) {
    DOM.btnSaveCurrent.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'getActiveTab' }, res => {
        if (chrome.runtime.lastError) { showToast('Cannot save this page'); return; }
        const tab = res && res.tab;
        if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
          showToast('Cannot save this page'); return;
        }
        openSaveModal(tab.url, tab.title || tab.url);
      });
    });
  }

  // Open all visible
  if (DOM.btnOpenAll) {
    DOM.btnOpenAll.addEventListener('click', () => {
      const visible = getSortedLinks(SearchService.filter(state.links, state.query, state.activeTags));
      if (!visible.length) { showToast('No links to open'); return; }
      visible.forEach(l => chrome.tabs.create({ url: l.url, active: false }));
      showToast('Opened ' + visible.length + ' link' + (visible.length !== 1 ? 's' : ''));
    });
  }

  // Header icon buttons
  if (DOM.btnArchive)   DOM.btnArchive.addEventListener('click', openArchiveModal);
  if (DOM.btnReadLater) DOM.btnReadLater.addEventListener('click', openReadLaterModal);
  if (DOM.btnHelp)      DOM.btnHelp.addEventListener('click', () => openModal(DOM.helpModal));
  if (DOM.btnExport)    DOM.btnExport.addEventListener('click', () => openModal(DOM.exportModal));
  if (DOM.btnImport && DOM.importFileInput) {
    DOM.btnImport.addEventListener('click', () => DOM.importFileInput.click());
  }

  // Sort buttons
  if (DOM.sortByDate) {
    DOM.sortByDate.addEventListener('click', async () => {
      state.sortBy = 'date';
      await StorageService.saveSettings({ sortBy: 'date' });
      updateSortButtons(); render();
    });
  }
  if (DOM.sortByLastOpened) {
    DOM.sortByLastOpened.addEventListener('click', async () => {
      state.sortBy = 'lastOpened';
      await StorageService.saveSettings({ sortBy: 'lastOpened' });
      updateSortButtons(); render();
    });
  }

  // Save modal
  if (DOM.modalClose)    DOM.modalClose.addEventListener('click', closeSaveModal);
  if (DOM.modalCancel)   DOM.modalCancel.addEventListener('click', closeSaveModal);
  if (DOM.saveModal)     DOM.saveModal.addEventListener('click', e => { if (e.target === DOM.saveModal) closeSaveModal(); });
  if (DOM.modalAddTag)   DOM.modalAddTag.addEventListener('click', addModalTag);
  if (DOM.modalTagInput) DOM.modalTagInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addModalTag(); } });
  if (DOM.modalSave)     DOM.modalSave.addEventListener('click', saveLink);

  // Edit modal
  if (DOM.editModalClose)  DOM.editModalClose.addEventListener('click', () => closeModal(DOM.editModal));
  if (DOM.editModalCancel) DOM.editModalCancel.addEventListener('click', () => closeModal(DOM.editModal));
  if (DOM.editModal)       DOM.editModal.addEventListener('click', e => { if (e.target === DOM.editModal) closeModal(DOM.editModal); });
  if (DOM.editAddTag)      DOM.editAddTag.addEventListener('click', addEditTag);
  if (DOM.editTagInput)    DOM.editTagInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addEditTag(); } });
  if (DOM.editModalSave)   DOM.editModalSave.addEventListener('click', saveEdit);

  // Help modal
  if (DOM.helpModalClose) DOM.helpModalClose.addEventListener('click', () => closeModal(DOM.helpModal));
  if (DOM.helpModal)      DOM.helpModal.addEventListener('click', e => { if (e.target === DOM.helpModal) closeModal(DOM.helpModal); });

  // Read Later modal
  if (DOM.readLaterModalClose) DOM.readLaterModalClose.addEventListener('click', () => closeModal(DOM.readLaterModal));
  if (DOM.readLaterModal)      DOM.readLaterModal.addEventListener('click', e => { if (e.target === DOM.readLaterModal) closeModal(DOM.readLaterModal); });

  // Archive modal + tabs
  if (DOM.archiveModalClose) DOM.archiveModalClose.addEventListener('click', () => closeModal(DOM.archiveModal));
  if (DOM.archiveModal)      DOM.archiveModal.addEventListener('click', e => { if (e.target === DOM.archiveModal) closeModal(DOM.archiveModal); });
  if (DOM.tabArchived) {
    DOM.tabArchived.addEventListener('click', () => { state.currentArchiveView = 'archived'; syncArchiveTabs(); renderArchiveList(); });
  }
  if (DOM.tabActive) {
    DOM.tabActive.addEventListener('click', () => { state.currentArchiveView = 'active'; syncArchiveTabs(); renderArchiveList(); });
  }

  // Export modal
  if (DOM.exportModalClose) DOM.exportModalClose.addEventListener('click', () => closeModal(DOM.exportModal));
  if (DOM.exportModal)      DOM.exportModal.addEventListener('click', e => { if (e.target === DOM.exportModal) closeModal(DOM.exportModal); });
  if (DOM.exportJSON) {
    DOM.exportJSON.addEventListener('click', async () => {
      downloadFile(await StorageService.exportJSON(), 'quick-links-' + dateStr() + '.json', 'application/json');
      closeModal(DOM.exportModal); showToast('Exported as JSON');
    });
  }
  if (DOM.exportMarkdown) {
    DOM.exportMarkdown.addEventListener('click', async () => {
      downloadFile(await StorageService.exportMarkdown(), 'quick-links-' + dateStr() + '.md', 'text/markdown');
      closeModal(DOM.exportModal); showToast('Exported as Markdown');
    });
  }
  if (DOM.exportHTML) {
    DOM.exportHTML.addEventListener('click', async () => {
      downloadFile(await StorageService.exportHTML(), 'bookmarks-' + dateStr() + '.html', 'text/html');
      closeModal(DOM.exportModal); showToast('Exported as HTML');
    });
  }

  // Import
  if (DOM.importFileInput) {
    DOM.importFileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileText = await file.text();
        const { imported, skipped } = await StorageService.importJSON(fileText);
        await loadData(); render();
        showToast('Imported ' + imported + ' links (' + skipped + ' skipped)');
      } catch (_) {
        showToast('Invalid JSON file');
      }
      DOM.importFileInput.value = '';
    });
  }

  // Custom confirm modal buttons
  if (DOM.confirmOk) {
    DOM.confirmOk.addEventListener('click', () => {
      closeModal(DOM.confirmModal);
      if (typeof state.confirmCallback === 'function') {
        state.confirmCallback();
        state.confirmCallback = null;
      }
    });
  }
  if (DOM.confirmCancel) {
    DOM.confirmCancel.addEventListener('click', () => {
      closeModal(DOM.confirmModal);
      state.confirmCallback = null;
    });
  }
  if (DOM.confirmModal) {
    DOM.confirmModal.addEventListener('click', e => {
      if (e.target === DOM.confirmModal) {
        closeModal(DOM.confirmModal);
        state.confirmCallback = null;
      }
    });
  }
}

// ─────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = document.querySelectorAll('.modal-overlay.is-open');
      if (open.length) { open.forEach(m => closeModal(m)); return; }
    }
    if (e.key === '/' && document.activeElement !== DOM.searchInput) {
      e.preventDefault();
      if (DOM.searchInput) DOM.searchInput.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      navigateCards(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('link-card')) {
      const link = state.links.find(l => l.id === document.activeElement.dataset.id);
      if (link) { StorageService.recordOpen(link.id); chrome.tabs.create({ url: link.url, active: true }); }
    }
  });
}

function navigateCards(dir) {
  const cards = [...document.querySelectorAll('.link-card')];
  if (!cards.length) return;
  const idx  = cards.indexOf(document.activeElement);
  const next = dir === 1
    ? (cards[idx + 1] || cards[0])
    : (cards[idx - 1] || cards[cards.length - 1]);
  if (next) { next.setAttribute('tabindex', '0'); next.focus(); }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(msg) {
  if (!DOM.toast) return;
  clearTimeout(state.toastTimer);
  DOM.toast.textContent = msg;
  DOM.toast.hidden = false;
  state.toastTimer = setTimeout(() => { if (DOM.toast) DOM.toast.hidden = true; }, 2200);
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function clearList(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

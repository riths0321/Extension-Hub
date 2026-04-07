/**
 * popup.js — Clipboard History Manager v2
 * MV3 · CSP-safe · createElement only · no innerHTML
 */

import { getAll, setHistory, setSettings, setTags, KEYS } from '../services/storage.js';
import { togglePin, removeItem, updateItem, exportJSON, importJSON } from '../services/clipboard.js';
import { fuzzyScore, timeAgo, el, writeToClipboard, downloadTextFile, readFileAsText, clamp } from '../utils/helpers.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  history:    [],
  settings:   {},
  tags:       [],
  totalSaves: 0,
  view:       'recent',
  query:      '',
  filters:    { types: new Set(), today: false, pinned: false, tag: null },
  focusedIdx: -1,
  editItemId: null,
};

// ─── DOM References ────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const DOM = {
  statItems:    $('statItems'),
  statPinned:   $('statPinned'),
  statTotal:    $('statTotal'),
  searchInput:  $('searchInput'),
  filterToggle: $('filterToggle'),
  filterPanel:  $('filterPanel'),
  tagFilterRow: $('tagFilterRow'),
  clipList:     $('clipList'),
  emptyState:   $('emptyState'),
  toast:        $('toast'),
  // modals
  settingsModal: $('settingsModal'),
  exportModal:   $('exportModal'),
  editModal:     $('editModal'),
};

let toastTimer = null;

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  bindEvents();
  render();
});

async function loadAll() {
  const data = await getAll();
  state.history    = data.history;
  state.settings   = data.settings;
  state.tags       = data.tags;
  state.totalSaves = data.totalSaves;
  fillSettingsForm();
}

// ─── Binding ──────────────────────────────────────────────────────────────────

function bindEvents() {
  // Search
  DOM.searchInput.addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    render();
  });

  // Filter toggle
  DOM.filterToggle.addEventListener('click', () => {
    const open = !DOM.filterPanel.hidden;
    DOM.filterPanel.hidden = open;
    DOM.filterToggle.setAttribute('aria-expanded', String(!open));
  });

  // Filter checkboxes
  DOM.filterPanel.addEventListener('change', (e) => {
    const target = e.target;
    if (!target.dataset.filter) return;
    const f = target.dataset.filter;
    if (f === 'all') {
      state.filters.types.clear();
    } else if (f === 'today') {
      state.filters.today = target.checked;
    } else if (f === 'pinned') {
      state.filters.pinned = target.checked;
    } else {
      if (target.checked) state.filters.types.add(f);
      else                state.filters.types.delete(f);
      // Uncheck "All"
      const allBox = $('fAll');
      if (allBox) allBox.checked = state.filters.types.size === 0;
    }
    render();
  });

  // View tabs
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboard);

  // Settings
  $('settingsBtn').addEventListener('click',    openModal.bind(null, DOM.settingsModal));
  $('settingsClose').addEventListener('click',  closeModal.bind(null, DOM.settingsModal));
  $('settingsSave').addEventListener('click',   saveSettings);
  $('settingsReset').addEventListener('click',  resetSettings);
  DOM.settingsModal.addEventListener('click',   (e) => { if (e.target === DOM.settingsModal) closeModal(DOM.settingsModal); });

  // Export/Import
  $('exportBtn').addEventListener('click',    openModal.bind(null, DOM.exportModal));
  $('exportClose').addEventListener('click',  closeModal.bind(null, DOM.exportModal));
  $('doExport').addEventListener('click',     handleExport);
  $('importFile').addEventListener('change',  handleImport);

  // Edit modal
  $('editClose').addEventListener('click',   closeModal.bind(null, DOM.editModal));
  $('editCancel').addEventListener('click',  closeModal.bind(null, DOM.editModal));
  $('editSave').addEventListener('click',    saveEditedItem);
  DOM.editModal.addEventListener('click',   (e) => { if (e.target === DOM.editModal) closeModal(DOM.editModal); });

  // Demo
  const demoBtn = $('demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', addDemoItems);

  // Storage changes (background saves new item)
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (changes[KEYS.HISTORY] || changes[KEYS.TOTAL_SAVES]) {
      await loadAll();
      render();
    }
  });
}

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

function handleKeyboard(e) {
  // Ctrl/Cmd+F → focus search
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    DOM.searchInput.focus();
    return;
  }

  // Escape
  if (e.key === 'Escape') {
    if (!DOM.settingsModal.hidden) { closeModal(DOM.settingsModal); return; }
    if (!DOM.exportModal.hidden)   { closeModal(DOM.exportModal);   return; }
    if (!DOM.editModal.hidden)     { closeModal(DOM.editModal);     return; }
    if (document.activeElement !== DOM.searchInput) {
      DOM.searchInput.blur();
      state.focusedIdx = -1;
      render();
    }
    return;
  }

  // Arrow keys navigate list
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = DOM.clipList.querySelectorAll('.clip-item');
    if (!items.length) return;
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    state.focusedIdx = Math.max(-1, Math.min(items.length - 1, state.focusedIdx + dir));
    if (state.focusedIdx >= 0) items[state.focusedIdx].focus();
    return;
  }

  // Enter on focused item → copy
  if (e.key === 'Enter') {
    const focused = DOM.clipList.querySelector('.clip-item:focus');
    if (focused) {
      const id = focused.dataset.id;
      const item = state.history.find((i) => i.id === id);
      if (item) copyItem(item);
    }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const items = getFilteredItems();
  renderStats(items.length);
  renderTagFilters();
  renderList(items);
}

function getFilteredItems() {
  let items = [...state.history];

  // View
  if (state.view === 'pinned') {
    items = items.filter((i) => i.pinned);
  } else if (state.view === 'frequent') {
    items = items.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else {
    items = items.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Type filter
  if (state.filters.types.size > 0) {
    items = items.filter((i) => state.filters.types.has(i.type));
  }

  // Pinned filter
  if (state.filters.pinned) {
    items = items.filter((i) => i.pinned);
  }

  // Today filter
  if (state.filters.today) {
    const today = new Date().toDateString();
    items = items.filter((i) => new Date(i.timestamp).toDateString() === today);
  }

  // Tag filter
  if (state.filters.tag) {
    items = items.filter((i) => Array.isArray(i.tags) && i.tags.includes(state.filters.tag));
  }

  // Search
  if (state.query) {
    const scored = items
      .map((i) => ({ item: i, score: fuzzyScore(i.content, state.query) + fuzzyScore((i.tags || []).join(' '), state.query) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);
    items = scored.map((x) => x.item);
  }

  return items;
}

function renderStats(filteredCount) {
  DOM.statItems.textContent  = String(filteredCount);
  DOM.statPinned.textContent = String(state.history.filter((i) => i.pinned).length);
  DOM.statTotal.textContent  = String(state.totalSaves);
}

function renderTagFilters() {
  const allTags = new Set();
  state.history.forEach((i) => (i.tags || []).forEach((t) => allTags.add(t)));

  DOM.tagFilterRow.replaceChildren();
  if (allTags.size === 0) return;

  const label = el('span', { className: 'setting-label', textContent: 'Tags:' });
  DOM.tagFilterRow.appendChild(label);

  for (const tag of allTags) {
    const chip = el('button', {
      type: 'button',
      className: 'chip' + (state.filters.tag === tag ? ' active-tag' : ''),
      textContent: tag,
    });
    // FIXED: Removed inline style injection, using CSS class instead
    chip.addEventListener('click', () => {
      state.filters.tag = state.filters.tag === tag ? null : tag;
      render();
    });
    DOM.tagFilterRow.appendChild(chip);
  }
}

function renderList(items) {
  const hadFocus = state.focusedIdx;

  DOM.clipList.replaceChildren();

  if (!items.length) {
    DOM.emptyState.hidden = false;
    DOM.clipList.hidden   = true;
    return;
  }

  DOM.emptyState.hidden = true;
  DOM.clipList.hidden   = false;

  items.forEach((item, idx) => {
    const node = buildClipItem(item);
    if (idx === hadFocus) node.classList.add('is-selected');
    DOM.clipList.appendChild(node);
  });
}

// ─── Build Clip Item (createElement only) ─────────────────────────────────────

function buildClipItem(item) {
  const isUrl  = item.type === 'url';
  const isCode = item.type === 'code';

  const li = el('li', {
    className: 'clip-item' + (item.pinned ? ' is-pinned' : ''),
    tabindex:  '0',
    role:      'listitem',
    dataset:   { id: item.id },
  });

  // ── Head row
  const head = el('div', { className: 'item-head' });

  // meta: badge + pin star + tags
  const meta = el('div', { className: 'item-meta' });

  const typeInfo = getTypeMeta(item.type);
  const badge = el('span', { className: `type-badge ${typeInfo.cls}`, textContent: typeInfo.label });
  meta.appendChild(badge);

  if (item.pinned) {
    meta.appendChild(el('span', { className: 'pin-star', textContent: '⭐', title: 'Pinned' }));
  }

  if (Array.isArray(item.tags) && item.tags.length) {
    const tagsWrap = el('div', { className: 'item-tags' });
    item.tags.slice(0, 3).forEach((t) => tagsWrap.appendChild(el('span', { className: 'item-tag', textContent: t })));
    meta.appendChild(tagsWrap);
  }

  // actions
  const actions = el('div', { className: 'item-actions' });

  const copyBtn = buildActionBtn('Copy', false);
  copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copyItem(item); });
  actions.appendChild(copyBtn);

  if (isUrl) {
    const openBtn = buildActionBtn('Open', false);
    openBtn.addEventListener('click', (e) => { e.stopPropagation(); chrome.tabs.create({ url: item.content }); });
    actions.appendChild(openBtn);
  }

  const editBtn = buildActionBtn('Edit', false);
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(item); });
  actions.appendChild(editBtn);

  const pinBtn = buildActionBtn(item.pinned ? 'Unpin' : 'Pin', false);
  pinBtn.classList.add('is-pin');
  if (item.pinned) pinBtn.classList.add('is-active');
  pinBtn.addEventListener('click', async (e) => { e.stopPropagation(); await togglePin(item.id); await loadAll(); render(); });
  actions.appendChild(pinBtn);

  const delBtn = buildActionBtn('Del', true);
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteItem(item); });
  actions.appendChild(delBtn);

  head.append(meta, actions);

  // ── Content
  const content = el('div', {
    className: 'item-content' + (isUrl ? ' is-url' : '') + (isCode ? ' is-code' : ''),
    textContent: item.content.length > 200 ? item.content.slice(0, 197) + '…' : item.content,
  });

  // ── Footer
  const footer = el('div', { className: 'item-footer' });
  footer.appendChild(el('span', { className: 'item-time', textContent: timeAgo(item.timestamp) }));
  const usesSpan = el('span', { className: 'item-uses', textContent: `${item.usageCount || 0} uses` });
  footer.appendChild(usesSpan);

  li.append(head, content, footer);

  // Click the card to copy
  li.addEventListener('click', () => copyItem(item));

  return li;
}

function buildActionBtn(label, danger) {
  const btn = el('button', {
    type:      'button',
    className: 'btn-action' + (danger ? ' is-danger' : ''),
    textContent: label,
  });
  return btn;
}

function getTypeMeta(type) {
  const map = {
    url:   { label: 'URL',   cls: 'type-url'   },
    email: { label: 'Email', cls: 'type-email' },
    code:  { label: 'Code',  cls: 'type-code'  },
    text:  { label: 'Text',  cls: 'type-text'  },
  };
  return map[type] || map.text;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function copyItem(item) {
  try {
    await writeToClipboard(item.content);
    await updateItem(item.id, { usageCount: (item.usageCount || 0) + 1, lastUsed: Date.now() });
    await loadAll();
    render();
    toast('Copied!', 'is-success');
  } catch {
    toast('Copy failed', 'is-error');
  }
}

async function deleteItem(item) {
  await removeItem(item.id);
  await loadAll();
  render();
  toast('Deleted', 'is-success');
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.tab').forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  render();
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function openEditModal(item) {
  state.editItemId = item.id;
  const ta   = $('editTextarea');
  const ti   = $('editTagInput');
  ta.value   = item.content;
  ti.value   = (item.tags || []).join(', ');
  openModal(DOM.editModal);
  setTimeout(() => { ta.focus(); ta.setSelectionRange(0, 0); }, 60);
}

async function saveEditedItem() {
  if (!state.editItemId) return;
  const newContent = $('editTextarea').value.trim();
  if (!newContent) { toast('Content cannot be empty', 'is-error'); return; }
  const newTags = $('editTagInput').value
    .split(',').map((t) => t.trim()).filter(Boolean);

  await updateItem(state.editItemId, { content: newContent, tags: newTags });
  closeModal(DOM.editModal);
  await loadAll();
  render();
  toast('Saved', 'is-success');
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function fillSettingsForm() {
  const s = state.settings;
  $('setAutoSave').checked      = s.autoSave    !== false;
  $('setNotifications').checked = s.notifications !== false;
  $('setFuzzy').checked         = s.fuzzySearch  !== false;
  $('setMaxItems').value        = String(s.maxItems   || 100);
  $('setCleanDays').value       = String(s.autoCleanDays || 7);
}

async function saveSettings() {
  const settings = {
    autoSave:      $('setAutoSave').checked,
    notifications: $('setNotifications').checked,
    fuzzySearch:   $('setFuzzy').checked,
    maxItems:      clamp(Number($('setMaxItems').value), 10, 500, 100),
    autoCleanDays: clamp(Number($('setCleanDays').value), 1, 365, 7),
  };
  state.settings = settings;
  await setSettings(settings);
  closeModal(DOM.settingsModal);
  toast('Settings saved', 'is-success');
}

function resetSettings() {
  state.settings = {
    autoSave: true, notifications: true, fuzzySearch: true,
    maxItems: 100, autoCleanDays: 7,
  };
  fillSettingsForm();
  toast('Reset to defaults', 'is-success');
}

// ─── Export / Import ──────────────────────────────────────────────────────────

async function handleExport() {
  try {
    const json = await exportJSON();
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`clipboard-backup-${date}.json`, json);
    $('exportStatus').textContent = '✓ Export successful';
    toast('Exported!', 'is-success');
  } catch (e) {
    $('exportStatus').textContent = `Error: ${e.message}`;
    toast('Export failed', 'is-error');
  }
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text  = await readFileAsText(file);
    const count = await importJSON(text);
    await loadAll();
    render();
    $('exportStatus').textContent = `✓ Imported ${count} items`;
    toast(`Imported ${count} items`, 'is-success');
  } catch (err) {
    $('exportStatus').textContent = `Error: ${err.message}`;
    toast('Import failed', 'is-error');
  }
  e.target.value = ''; // reset input
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function addDemoItems() {
  const { detectType } = await import('../services/clipboard.js');
  const demos = [
    { content: 'https://github.com/anthropics/anthropic-sdk-python', tags: ['dev'] },
    { content: 'const greet = (name) => `Hello, ${name}!`;',         tags: ['code', 'js'] },
    { content: 'Design review call moved to Thursday 3 PM.',          tags: ['work'] },
    { content: 'hello@example.com',                                   tags: ['contact'] },
    { content: 'npm install @anthropic-ai/sdk',                       tags: ['code'] },
    { content: 'Remember: ship small, iterate fast.',                  tags: ['notes'] },
  ];
  const now = Date.now();
  const newItems = demos.map((d, i) => ({
    id:         `demo_${now}_${i}`,
    content:    d.content,
    type:       detectType(d.content),
    tags:       d.tags,
    pinned:     i === 0,
    timestamp:  now - i * 60_000,
    usageCount: Math.floor(Math.random() * 5),
    lastUsed:   now,
  }));
  state.history = [...newItems, ...state.history];
  await setHistory(state.history);
  render();
  toast('Demo items added', 'is-success');
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────

function openModal(modal) {
  modal.hidden = false;
  const firstFocusable = modal.querySelector('button, input, textarea, select');
  if (firstFocusable) firstFocusable.focus();
}

function closeModal(modal) {
  modal.hidden = true;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  if (toastTimer) clearTimeout(toastTimer);
  DOM.toast.textContent = msg;
  DOM.toast.className   = 'toast is-visible' + (type ? ` ${type}` : '');
  toastTimer = setTimeout(() => {
    DOM.toast.classList.remove('is-visible');
  }, 2200);
}
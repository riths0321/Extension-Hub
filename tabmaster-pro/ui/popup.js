/**
 * ui/popup.js — TabMaster Pro Popup Controller
 *
 * Unified UI layer for all four panels: Tabs, Sleep, Sessions, Settings.
 * CSP-compliant: no innerHTML on user data, no eval, no inline handlers.
 */

'use strict';

/* ─── State ────────────────────────────────────────────────────── */
const State = {
  tabs:         [],
  filteredTabs: [],
  selectedIds:  new Set(),
  tabFilter:    'all',
  tabSort:      'index',
  tabSearch:    '',
  sessions:     [],
  filteredSessions: [],
  sessionMode:  'custom',
  sessionSearch:'',
  sleepSettings: {
    enabled: true, timerMinutes: 15,
    ignorePinned: true, ignoreAudio: true, batteryMode: true,
  },
  appSettings: {
    autoSave: false, preservePinned: true,
    maxSessions: 50, confirmRestore: true, badgeEnabled: true,
  },
  stats: {},
  confirmCb: null,
  activePanel: 'tabs',
};

/* ─── DOM references ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const Dom = {
  // Header
  hdrTotal:    $('hdr-total-num'),
  hdrSleeping: $('hdr-sleeping-num'),
  hdrSleepPill:$('hdr-sleeping-pill'),

  // Tabs panel
  tabsList:     $('tabs-list'),
  tabSearch:    $('tab-search'),
  tabSort:      $('tab-sort'),
  tabFilters:   $('tab-filters'),
  actionStrip:  document.querySelector('.action-strip'),
  selBar:       $('selection-bar'),
  selAllCb:     $('select-all-cb'),
  selCountLabel:$('sel-count-label'),
  btnCloseDupes:  $('btn-close-dupes'),
  btnGroupDomain: $('btn-group-domain'),
  btnSleepSel:    $('btn-sleep-selected'),
  btnCloseSel:    $('btn-close-selected'),
  btnClearSel:    $('btn-clear-sel'),
  tabsSkeleton:   $('tabs-skeleton'),

  // Sleep panel
  sleepActiveNum:   $('sleep-active-num'),
  sleepSleepingNum: $('sleep-sleeping-num'),
  sleepMemoryNum:   $('sleep-memory-num'),
  timerPills:       document.querySelectorAll('.timer-pill'),
  sleepIgnPinned:   $('sleep-ignore-pinned'),
  sleepIgnAudio:    $('sleep-ignore-audio'),
  sleepBattery:     $('sleep-battery'),
  sleepEnabled:     $('sleep-enabled'),
  btnSleepAll:      $('btn-sleep-all'),
  btnWakeAll:       $('btn-wake-all'),
  sleepTabsList:    $('sleep-tabs-list'),

  // Sessions panel
  sessionNameInput: $('session-name-input'),
  btnSaveSession:   $('btn-save-session'),
  sessionsList:     $('sessions-list'),
  sessionsEmpty:    $('sessions-empty'),
  sessionsSearch:   $('sessions-search'),

  // Settings panel
  sAutosave:      $('s-autosave'),
  sPreservePinned:$('s-preserve-pinned'),
  sConfirmRestore:$('s-confirm-restore'),
  sMaxSessions:   $('s-max-sessions'),
  sBadge:         $('s-badge'),
  btnClearSessions:$('btn-clear-sessions'),
  btnSaveSettings: $('btn-save-settings'),

  // Toast + dialog
  toast:         $('toast'),
  confirmDialog: $('confirm-dialog'),
  confirmMsg:    $('confirm-msg'),
  confirmOk:     $('confirm-ok'),
  confirmCancel: $('confirm-cancel'),
};

/* ─── Toast ────────────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = 'info', ms = 2800) {
  clearTimeout(toastTimer);
  Dom.toast.textContent = msg;
  Dom.toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => Dom.toast.classList.remove('show'), ms);
}

/* ─── Confirm dialog ───────────────────────────────────────────── */
function confirm(msg, cb) {
  Dom.confirmMsg.textContent = msg;
  Dom.confirmDialog.hidden = false;
  State.confirmCb = cb;
}

/* ─── Tab Navigation ───────────────────────────────────────────── */
function switchPanel(name) {
  State.activePanel = name;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.panel').forEach(panel => {
    const show = panel.id === `panel-${name}`;
    panel.hidden = !show;
    if (show) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  // Lazy-load panel data
  if (name === 'tabs')     loadTabs();
  if (name === 'sleep')    loadSleepPanel();
  if (name === 'sessions') loadSessions();
  if (name === 'settings') populateSettings();
}

/* ═══════════════════════════════════════════════════════════════
   TABS PANEL
═══════════════════════════════════════════════════════════════ */

async function loadTabs() {
  try {
    const res = await Helpers.sendMessage({ action: 'getAllTabs' });
    State.tabs = res.tabs || [];
    const liveIds = new Set(State.tabs.map(tab => tab.id));
    State.selectedIds.forEach(id => {
      if (!liveIds.has(id)) State.selectedIds.delete(id);
    });
    applyTabFilters();
  } catch (err) {
    toast('Could not load tabs', 'error');
  }
}

function applyTabFilters() {
  const q      = State.tabSearch.toLowerCase();
  const filter = State.tabFilter;

  // Build duplicate URL set for filter
  const urlCount = new Map();
  State.tabs.forEach(t => {
    const key = Helpers.normalizeUrl(t.url);
    if (key) urlCount.set(key, (urlCount.get(key) || 0) + 1);
  });

  State.filteredTabs = State.tabs.filter(tab => {
    if (q) {
      const matchTitle = (tab.title || '').toLowerCase().includes(q);
      const matchUrl   = (tab.url   || '').toLowerCase().includes(q);
      if (!matchTitle && !matchUrl) return false;
    }
    switch (filter) {
      case 'pinned':    return tab.pinned;
      case 'audible':   return tab.audible;
      case 'sleeping':  return tab.discarded;
      case 'duplicate': {
        const key = Helpers.normalizeUrl(tab.url);
        return key && (urlCount.get(key) || 0) > 1;
      }
      default: return true;
    }
  });

  sortTabs();
  renderTabs();
}

function sortTabs() {
  const sort = State.tabSort;
  State.filteredTabs.sort((a, b) => {
    if (sort === 'title')  return (a.title || '').localeCompare(b.title || '');
    if (sort === 'domain') return Helpers.getHostname(a.url).localeCompare(Helpers.getHostname(b.url));
    if (sort === 'recent') return b.id - a.id;
    return a.index - b.index; // default: index
  });
}

function renderTabs() {
  const list = Dom.tabsList;

  // Remove skeleton
  if (Dom.tabsSkeleton && Dom.tabsSkeleton.parentNode === list) {
    Dom.tabsSkeleton.remove();
  }

  // Diff-render: build id->element map from existing rows
  const existing = new Map();
  list.querySelectorAll('[data-tab-id]').forEach(el => {
    existing.set(Number(el.dataset.tabId), el);
  });

  // Remove no-longer-visible rows
  const visibleIds = new Set(State.filteredTabs.map(t => t.id));
  existing.forEach((el, id) => { if (!visibleIds.has(id)) el.remove(); });

  if (State.filteredTabs.length === 0) {
    if (!list.querySelector('.empty-state')) {
      const emp = buildEmpty(State.tabSearch ? '🔍' : '📂',
        State.tabSearch ? 'No matching tabs' : 'No tabs found',
        State.tabSearch ? 'Try a different search' : '');
      list.appendChild(emp);
    }
  } else {
    list.querySelector('.empty-state')?.remove();
  }

  // Insert/update in order
  State.filteredTabs.forEach((tab, i) => {
    let row = existing.get(tab.id);
    if (!row) {
      row = buildTabRow(tab);
    } else {
      updateTabRow(row, tab);
    }
    const nthChild = list.children[i];
    if (nthChild !== row) list.insertBefore(row, nthChild || null);
  });

  updateSelectionUI();
  updateHeaderStats();
}

function buildTabRow(tab) {
  const row = document.createElement('div');
  row.className = 'tab-row';
  row.dataset.tabId = tab.id;
  row.setAttribute('role', 'listitem');
  row.tabIndex = 0;

  // Checkbox
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.setAttribute('aria-label', `Select ${tab.title || 'tab'}`);

  // Favicon
  const fav = document.createElement('img');
  fav.className = 'tab-favicon';
  fav.alt = '';
  fav.width = 16; fav.height = 16;

  // Info
  const info = document.createElement('div');
  info.className = 'tab-info';

  const titleEl = document.createElement('div');
  titleEl.className = 'tab-title';

  const meta = document.createElement('div');
  meta.className = 'tab-meta';
  const domain = document.createElement('span');
  domain.className = 'tab-domain';
  meta.appendChild(domain);

  info.appendChild(titleEl);
  info.appendChild(meta);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'tab-row-actions';

  const sleepBtn  = makeRowBtn('💤', 'Sleep tab',  () => onSleepOneTab(tab.id, tab.discarded));
  const closeBtn  = makeRowBtn('✕',  'Close tab',   () => onCloseTab(tab.id), true);
  actions.appendChild(sleepBtn);
  actions.appendChild(closeBtn);

  row.appendChild(cb);
  row.appendChild(fav);
  row.appendChild(info);
  row.appendChild(actions);

  // Events
  cb.addEventListener('change', () => {
    if (cb.checked) State.selectedIds.add(tab.id);
    else            State.selectedIds.delete(tab.id);
    row.classList.toggle('is-selected', cb.checked);
    updateSelectionUI();
  });

  row.addEventListener('click', e => {
    if (e.target === cb || e.target.closest('.tab-row-actions')) return;
    Helpers.sendMessage({ action: 'switchTab', tabId: tab.id, windowId: tab.windowId });
    window.close();
  });

  row.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      Helpers.sendMessage({ action: 'switchTab', tabId: tab.id, windowId: tab.windowId });
      window.close();
    }
  });

  updateTabRow(row, tab);
  return row;
}

function updateTabRow(row, tab) {
  const cb     = row.querySelector('input[type="checkbox"]');
  const fav    = row.querySelector('.tab-favicon');
  const title  = row.querySelector('.tab-title');
  const domain = row.querySelector('.tab-domain');
  const meta   = row.querySelector('.tab-meta');
  const sleepBtn = row.querySelector('.row-action-btn:first-child');

  if (cb) cb.checked = State.selectedIds.has(tab.id);

  if (fav) {
    fav.src = tab.favIconUrl || '../icons/fallback-tab.svg';
    fav.onerror = () => { fav.src = '../icons/fallback-tab.svg'; };
  }

  if (title) title.textContent = tab.title || '(no title)';
  if (domain) domain.textContent = Helpers.getHostname(tab.url) || tab.url;

  // Clear and re-add badges
  if (meta) {
    const existing = meta.querySelectorAll('.tab-badge');
    existing.forEach(b => b.remove());
    if (tab.pinned)   meta.appendChild(makeBadge('Pinned',   'tab-badge-pinned'));
    if (tab.audible)  meta.appendChild(makeBadge('Audio',    'tab-badge-audio'));
    if (tab.discarded)meta.appendChild(makeBadge('Sleeping', 'tab-badge-sleeping'));
  }

  row.classList.toggle('is-active',   Boolean(tab.active));
  row.classList.toggle('is-sleeping', Boolean(tab.discarded));
  row.classList.toggle('is-selected', State.selectedIds.has(tab.id));

  if (sleepBtn) {
    sleepBtn.title = tab.discarded ? 'Wake tab' : 'Sleep tab';
    sleepBtn.textContent = tab.discarded ? '☀' : '💤';
  }
}

function makeRowBtn(icon, label, onClick, isDanger = false) {
  const btn = document.createElement('button');
  btn.className = 'row-action-btn' + (isDanger ? ' danger' : '');
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.textContent = icon;
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

function makeBadge(text, cls) {
  const span = document.createElement('span');
  span.className = `tab-badge ${cls}`;
  span.textContent = text;
  return span;
}

function buildEmpty(icon, msg, sub) {
  const d = document.createElement('div');
  d.className = 'empty-state';
  const i = document.createElement('div'); i.className = 'empty-icon'; i.textContent = icon;
  const m = document.createElement('div'); m.className = 'empty-msg';  m.textContent = msg;
  const s = document.createElement('div'); s.className = 'empty-sub';  s.textContent = sub;
  d.appendChild(i); d.appendChild(m); if (sub) d.appendChild(s);
  return d;
}

/* Selection helpers */
function updateSelectionUI() {
  const count = State.selectedIds.size;
  Dom.selBar.hidden         = count === 0;
  Dom.btnSleepSel.hidden    = count === 0;
  Dom.btnCloseSel.hidden    = count === 0;
  Dom.selCountLabel.textContent = `${count} selected`;
  if (Dom.selAllCb) {
    Dom.selAllCb.checked = count > 0 && count === State.filteredTabs.length;
    Dom.selAllCb.indeterminate = count > 0 && count < State.filteredTabs.length;
  }
}

function clearSelection() {
  State.selectedIds.clear();
  Dom.tabsList.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  Dom.tabsList.querySelectorAll('.tab-row').forEach(r => r.classList.remove('is-selected'));
  updateSelectionUI();
}

/* Tab actions */
async function onCloseTab(tabId) {
  try {
    await Helpers.sendMessage({ action: 'closeTab', tabId });
    State.tabs = State.tabs.filter(t => t.id !== tabId);
    State.selectedIds.delete(tabId);
    applyTabFilters();
    toast('Tab closed', 'success');
  } catch {
    toast('Could not close tab', 'error');
  }
}

async function onSleepOneTab(tabId, isAsleep) {
  if (isAsleep) {
    await Helpers.sendMessage({ action: 'wakeTab', tabId });
    toast('Tab woken', 'success');
  } else {
    await Helpers.sendMessage({ action: 'sleepTab', tabId });
    toast('Tab sleeping', 'info');
  }
  await loadTabs();
}

async function onCloseDupes() {
  const res = await Helpers.sendMessage({ action: 'closeDuplicates' });
  toast(res.closed > 0 ? `Closed ${res.closed} duplicate${res.closed > 1 ? 's' : ''}` : 'No duplicates found',
        res.closed > 0 ? 'success' : 'warning');
  await loadTabs();
}

async function onGroupByDomain() {
  const res = await Helpers.sendMessage({ action: 'groupByDomain' });
  toast(res.groups > 0 ? `Created ${res.groups} group${res.groups > 1 ? 's' : ''}` : 'Nothing to group',
        res.groups > 0 ? 'success' : 'warning');
  await loadTabs();
}

async function onSleepSelected() {
  const ids = [...State.selectedIds];
  if (!ids.length) return;
  let slept = 0;
  for (const id of ids) {
    const res = await Helpers.sendMessage({ action: 'sleepTab', tabId: id });
    if (res.slept) slept++;
  }
  clearSelection();
  toast(`Slept ${slept} tab${slept !== 1 ? 's' : ''}`, 'info');
  await loadTabs();
}

async function onCloseSelected() {
  const ids = [...State.selectedIds];
  if (!ids.length) return;
  confirm(`Close ${ids.length} selected tab${ids.length > 1 ? 's' : ''}?`, async () => {
    const results = await Promise.allSettled(
      ids.map(id => Helpers.sendMessage({ action: 'closeTab', tabId: id }))
    );
    const closed = results.filter(r => r.status === 'fulfilled').length;
    clearSelection();
    toast(
      closed > 0 ? `Closed ${closed} tab${closed !== 1 ? 's' : ''}` : 'No tabs were closed',
      closed > 0 ? 'success' : 'warning'
    );
    await loadTabs();
  });
}

function updateHeaderStats() {
  const total    = State.tabs.length;
  const sleeping = State.tabs.filter(t => t.discarded).length;
  Dom.hdrTotal.textContent    = total;
  Dom.hdrSleeping.textContent = sleeping;
  Dom.hdrSleepPill.hidden     = sleeping === 0;
}

/* ═══════════════════════════════════════════════════════════════
   SLEEP PANEL
═══════════════════════════════════════════════════════════════ */

async function loadSleepPanel() {
  try {
    const [stats, tabsRes] = await Promise.all([
      Helpers.sendMessage({ action: 'getStats' }),
      Helpers.sendMessage({ action: 'getAllTabs' }),
    ]);
    State.tabs = tabsRes.tabs || [];
    State.stats = stats;
    Dom.sleepActiveNum.textContent   = stats.active   ?? '–';
    Dom.sleepSleepingNum.textContent = stats.sleeping ?? '–';
    Dom.sleepMemoryNum.textContent   = stats.memorySaved ?? '–';

    // Sync settings toggles
    const s = stats.sleepSettings || {};
    Dom.sleepIgnPinned.checked = s.ignorePinned !== false;
    Dom.sleepIgnAudio.checked  = s.ignoreAudio  !== false;
    Dom.sleepBattery.checked   = s.batteryMode  !== false;
    Dom.sleepEnabled.checked   = s.enabled      !== false;

    // Timer pills
    Dom.timerPills.forEach(p => {
      p.classList.toggle('active', Number(p.dataset.minutes) === (s.timerMinutes || 15));
    });

    State.sleepSettings = { ...State.sleepSettings, ...s };

    renderSleepTabList();
  } catch {}
}

function renderSleepTabList() {
  const list = Dom.sleepTabsList;
  list.textContent = '';

  const tabs = State.tabs.length ? State.tabs : [];
  const relevant = tabs.filter(t => !Helpers.isSystemUrl(t.url));

  if (!relevant.length) {
    list.appendChild(buildEmpty('🌙', 'No manageable tabs', ''));
    return;
  }

  relevant.sort((a, b) => (b.discarded ? 1 : 0) - (a.discarded ? 1 : 0));

  relevant.forEach(tab => {
    const row = document.createElement('div');
    row.className = 'sleep-row';

    const dot = document.createElement('span');
    dot.className = `sleep-status-dot ${tab.discarded ? 'sleeping' : 'awake'}`;

    const info = document.createElement('div');
    info.className = 'sleep-row-info';

    const t = document.createElement('div');
    t.className = 'sleep-row-title';
    t.textContent = tab.title || '(no title)';

    const d = document.createElement('div');
    d.className = 'sleep-row-domain';
    d.textContent = Helpers.getHostname(tab.url);

    info.appendChild(t);
    info.appendChild(d);

    const btn = document.createElement('button');
    btn.className = `sleep-row-btn ${tab.discarded ? 'wake' : 'sleep'}`;
    btn.textContent = tab.discarded ? 'Wake' : 'Sleep';
    btn.addEventListener('click', async () => {
      await onSleepOneTab(tab.id, tab.discarded);
      await loadSleepPanel();
    });

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

async function saveSleepSettings() {
  const timerPill = document.querySelector('.timer-pill.active');
  const settings = {
    enabled:       Dom.sleepEnabled.checked,
    timerMinutes:  timerPill ? Number(timerPill.dataset.minutes) : 15,
    ignorePinned:  Dom.sleepIgnPinned.checked,
    ignoreAudio:   Dom.sleepIgnAudio.checked,
    batteryMode:   Dom.sleepBattery.checked,
  };
  await Helpers.sendMessage({ action: 'updateSleepSettings', settings });
  State.sleepSettings = settings;
}

/* ═══════════════════════════════════════════════════════════════
   SESSIONS PANEL
═══════════════════════════════════════════════════════════════ */

async function loadSessions() {
  try {
    const res = await Helpers.sendMessage({ action: 'getSessions' });
    State.sessions = res.sessions || [];
    applySessionFilters();
  } catch {}
}

function applySessionFilters() {
  const q    = State.sessionSearch.toLowerCase();
  const mode = State.sessionMode;
  State.filteredSessions = State.sessions
    .filter(s => {
      const matchMode  = mode === 'custom' ? true : s.mode === mode;
      const matchQuery = !q || s.name.toLowerCase().includes(q) ||
                         s.tabs.some(t => (t.title || '').toLowerCase().includes(q));
      return matchMode && matchQuery;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
  renderSessions();
}

function renderSessions() {
  const list = Dom.sessionsList;
  // Clear old cards (keep empty state)
  list.querySelectorAll('.session-card').forEach(c => c.remove());

  if (!State.filteredSessions.length) {
    Dom.sessionsEmpty.hidden = false;
    return;
  }
  Dom.sessionsEmpty.hidden = true;

  State.filteredSessions.forEach(session => {
    list.appendChild(buildSessionCard(session));
  });
}

function buildSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';

  // Header
  const header = document.createElement('div');
  header.className = 'session-card-header';

  const nameEl = document.createElement('div');
  nameEl.className = 'session-name';
  nameEl.textContent = session.name;

  const badge = document.createElement('span');
  badge.className = 'session-mode-badge';
  badge.textContent = Helpers.capitalize(session.mode || 'custom');

  header.appendChild(nameEl);
  header.appendChild(badge);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'session-meta';
  meta.textContent = `${session.tabCount} tab${session.tabCount !== 1 ? 's' : ''} · ${Helpers.timeAgo(session.timestamp)}`;

  // Preview
  const preview = document.createElement('ul');
  preview.className = 'session-preview';
  session.tabs.slice(0, 3).forEach(tab => {
    const li = document.createElement('li');
    li.className = 'session-preview-item';
    li.textContent = tab.title || tab.url;
    preview.appendChild(li);
  });
  if (session.tabCount > 3) {
    const more = document.createElement('li');
    more.className = 'session-preview-item';
    more.textContent = `+${session.tabCount - 3} more`;
    preview.appendChild(more);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'session-card-actions';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'session-action-btn restore';
  restoreBtn.textContent = 'Restore';
  restoreBtn.addEventListener('click', () => onRestoreSession(session));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'session-action-btn delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => onDeleteSession(session.id));

  actions.appendChild(restoreBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(meta);
  card.appendChild(preview);
  card.appendChild(actions);
  return card;
}

async function onSaveSession() {
  const name = Dom.sessionNameInput.value.trim() ||
    `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const mode = State.sessionMode;

  const res = await Helpers.sendMessage({ action: 'saveSession', name, mode });
  if (!res.success) { toast(res.error || 'Save failed', 'error'); return; }
  Dom.sessionNameInput.value = '';
  toast('Session saved!', 'success');
  await loadSessions();
}

async function onRestoreSession(session) {
  const doRestore = async () => {
    const res = await Helpers.sendMessage({ action: 'restoreSession', sessionId: session.id });
    if (!res.success) { toast(res.error || 'Restore failed', 'error'); return; }
    toast(`Restored ${res.restoredTabs} tabs`, 'success');
    window.close();
  };

  if (State.appSettings.confirmRestore) {
    confirm(`Restore "${session.name}"? Current tabs will be replaced.`, doRestore);
  } else {
    await doRestore();
  }
}

async function onDeleteSession(sessionId) {
  confirm('Delete this session? This cannot be undone.', async () => {
    const res = await Helpers.sendMessage({ action: 'deleteSession', sessionId });
    if (!res.success) { toast('Delete failed', 'error'); return; }
    toast('Session deleted', 'success');
    await loadSessions();
  });
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS PANEL
═══════════════════════════════════════════════════════════════ */

async function populateSettings() {
  try {
    const stats = await Helpers.sendMessage({ action: 'getStats' });
    const s = stats.appSettings || {};
    Dom.sAutosave.checked       = s.autoSave       !== false;
    Dom.sPreservePinned.checked = s.preservePinned !== false;
    Dom.sConfirmRestore.checked = s.confirmRestore !== false;
    Dom.sMaxSessions.value      = s.maxSessions    ?? 50;
    Dom.sBadge.checked          = s.badgeEnabled   !== false;
    State.appSettings = { ...State.appSettings, ...s };
  } catch {}
}

async function onSaveSettings() {
  const settings = {
    autoSave:       Dom.sAutosave.checked,
    preservePinned: Dom.sPreservePinned.checked,
    confirmRestore: Dom.sConfirmRestore.checked,
    maxSessions:    Helpers.clamp(Number(Dom.sMaxSessions.value), 1, 200, 50),
    badgeEnabled:   Dom.sBadge.checked,
  };
  const res = await Helpers.sendMessage({ action: 'updateAppSettings', settings });
  if (res.success) {
    State.appSettings = settings;
    toast('Settings saved', 'success');
  } else {
    toast('Save failed', 'error');
  }
}

async function onClearAllSessions() {
  confirm('Delete ALL saved sessions? This cannot be undone.', async () => {
    const res = await Helpers.sendMessage({ action: 'deleteAllSessions' });
    if (!res.success) {
      toast('Could not clear sessions', 'error');
      return;
    }
    toast('All sessions cleared', 'success');
    State.sessions = [];
    State.filteredSessions = [];
    if (State.activePanel === 'sessions') renderSessions();
  });
}

/* ═══════════════════════════════════════════════════════════════
   EVENT BINDING
═══════════════════════════════════════════════════════════════ */

function bindEvents() {

  // Tab nav — only respond to buttons with data-tab
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.tab));
  });

  // Tabs panel
  Dom.tabSearch.addEventListener('input', Helpers.debounce(e => {
    State.tabSearch = e.target.value;
    applyTabFilters();
  }, 150));

  Dom.tabSort.addEventListener('change', e => {
    State.tabSort = e.target.value;
    sortTabs(); renderTabs();
  });

  Dom.tabFilters.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    Dom.tabFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    State.tabFilter = chip.dataset.filter;
    applyTabFilters();
  });

  Dom.btnCloseDupes.addEventListener('click',  onCloseDupes);
  Dom.btnGroupDomain.addEventListener('click', onGroupByDomain);
  Dom.btnSleepSel.addEventListener('click',    onSleepSelected);
  Dom.btnCloseSel.addEventListener('click',    onCloseSelected);
  Dom.btnClearSel.addEventListener('click',    clearSelection);

  Dom.selAllCb.addEventListener('change', e => {
    if (e.target.checked) {
      State.filteredTabs.forEach(t => State.selectedIds.add(t.id));
    } else {
      State.filteredTabs.forEach(t => State.selectedIds.delete(t.id));
    }
    renderTabs();
  });

  // Sleep panel
  Dom.timerPills.forEach(pill => {
    pill.addEventListener('click', async () => {
      Dom.timerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      await saveSleepSettings();
    });
  });

  [Dom.sleepIgnPinned, Dom.sleepIgnAudio, Dom.sleepBattery, Dom.sleepEnabled].forEach(tog => {
    tog.addEventListener('change', saveSleepSettings);
  });

  Dom.btnSleepAll.addEventListener('click', async () => {
    Dom.btnSleepAll.disabled = true;
    const res = await Helpers.sendMessage({ action: 'sleepAll' });
    Dom.btnSleepAll.disabled = false;
    toast(res.slept > 0 ? `Put ${res.slept} tab${res.slept > 1 ? 's' : ''} to sleep` : 'No eligible tabs', res.slept > 0 ? 'info' : 'warning');
    await loadSleepPanel();
    if (State.activePanel === 'tabs') await loadTabs();
  });

  Dom.btnWakeAll.addEventListener('click', async () => {
    Dom.btnWakeAll.disabled = true;
    const res = await Helpers.sendMessage({ action: 'wakeAll' });
    Dom.btnWakeAll.disabled = false;
    toast(res.woken > 0 ? `Woke ${res.woken} tab${res.woken > 1 ? 's' : ''}` : 'No sleeping tabs', res.woken > 0 ? 'success' : 'warning');
    await loadSleepPanel();
  });

  // Sessions panel
  Dom.btnSaveSession.addEventListener('click', onSaveSession);
  Dom.sessionNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') onSaveSession(); });

  document.querySelectorAll('#panel-sessions .chip[data-mode]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#panel-sessions .chip[data-mode]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      State.sessionMode = chip.dataset.mode;
      applySessionFilters();
    });
  });

  Dom.sessionsSearch.addEventListener('input', Helpers.debounce(e => {
    State.sessionSearch = e.target.value;
    applySessionFilters();
  }, 150));

  // Settings panel
  Dom.btnSaveSettings.addEventListener('click',    onSaveSettings);
  Dom.btnClearSessions.addEventListener('click',   onClearAllSessions);

  // Confirm dialog
  Dom.confirmOk.addEventListener('click', () => {
    Dom.confirmDialog.hidden = true;
    if (typeof State.confirmCb === 'function') { State.confirmCb(); State.confirmCb = null; }
  });
  Dom.confirmCancel.addEventListener('click', () => {
    Dom.confirmDialog.hidden = true;
    State.confirmCb = null;
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!Dom.confirmDialog.hidden) { Dom.confirmDialog.hidden = true; State.confirmCb = null; return; }
      window.close();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (State.activePanel === 'tabs') Dom.tabSearch.focus();
      else if (State.activePanel === 'sessions') Dom.sessionsSearch.focus();
    }
  });

  // Live tab change: reload when popup is open
  chrome.tabs.onCreated.addListener(() => { if (State.activePanel === 'tabs') loadTabs(); });
  chrome.tabs.onRemoved.addListener(() => { if (State.activePanel === 'tabs') loadTabs(); });
  chrome.tabs.onUpdated.addListener((_id, change) => {
    if (change.status === 'complete' && State.activePanel === 'tabs') loadTabs();
  });
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  switchPanel('tabs');
});

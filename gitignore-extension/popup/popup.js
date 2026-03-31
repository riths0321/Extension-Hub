/**
 * GitIgnore Pro — popup.js
 *
 * Scope: ONLY popup.html (380×≤580px control panel)
 * What it does:
 *   • Theme toggle (persisted)
 *   • Stack selection + live preview (compact)
 *   • Auto-detect (background → result in banner)
 *   • Copy / Download current file
 *   • Reset to defaults
 *   • Open Full Workspace (chrome.tabs.create)
 *
 * What it does NOT do:
 *   • No category panel, no preset grid, no config toggles,
 *     no scan input UI, no template saving — all in fullpage.html
 */

import {
  ALL_CATEGORY_IDS,
  DEFAULT_STATE,
  FILE_META,
  STACK_DEFINITIONS
} from './state.js';

import { buildArtifacts } from './generator.js';
import { detectStacksFromActiveTab }     from './detector.js';
import { loadPersistedState, persistState } from './storage.js';

/* ─── State ─────────────────────────────────────────────────── */
const state = {
  ...structuredClone(DEFAULT_STATE),
  stackSearch: '',
  files: {},
  categoryStats: [],
  suggestions: [],
  warnings: []
};

/* ─── DOM cache (only elements that exist in popup.html) ─────── */
const el = {};
const IDS = [
  'themeToggle', 'statusBanner', 'statusText',
  'stackSearch', 'stackSelection', 'selectionSummary',
  'fileTabs', 'editorHighlight', 'codeEditor', 'lineCount',
  'autoDetectBtn', 'resetBtn', 'copyBtn', 'downloadBtn',
  'openFullPageBtn', 'toast'
];

let persistTimer = null;
let toastTimer   = null;

/* ─── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Cache elements
  IDS.forEach(id => { el[id] = document.getElementById(id); });
  el.themeSun  = document.querySelector('.theme-icon-sun');
  el.themeMoon = document.querySelector('.theme-icon-moon');

  // Load persisted state FIRST, then render — no flash
  const persisted = await loadPersistedState();
  hydrateState(persisted);

  bindEvents();
  rebuildAndRender('Ready to generate');
}, { once: true });

/* ─── Hydrate ────────────────────────────────────────────────── */
function hydrateState(persisted) {
  if (!persisted) { applyTheme(); return; }

  // Safely merge
  state.theme             = persisted.theme ?? 'light';
  state.settings          = { ...DEFAULT_STATE.settings, ...persisted.settings };
  state.selectedStacks    = Array.isArray(persisted.selectedStacks)    ? persisted.selectedStacks    : [];
  state.selectedCategories = Array.isArray(persisted.selectedCategories)
    ? persisted.selectedCategories : [...ALL_CATEGORY_IDS];
  state.enabledConfigs    = { ...DEFAULT_STATE.enabledConfigs, ...persisted.enabledConfigs };
  state.customRules       = persisted.customRules ?? '';
  state.scanInput         = persisted.scanInput   ?? '';
  state.savedTemplates    = Array.isArray(persisted.savedTemplates) ? persisted.savedTemplates : [];
  state.detectedFromText  = Array.isArray(persisted.detectedFromText) ? persisted.detectedFromText : [];
  state.activeFile        = persisted.activeFile  ?? 'gitignore';

  applyTheme();
}

/* ─── Events ─────────────────────────────────────────────────── */
function bindEvents() {
  el.themeToggle.addEventListener('click', toggleTheme);

  el.stackSearch.addEventListener('input', e => {
    state.stackSearch = e.target.value.trim().toLowerCase();
    renderStackGrid();
  });

  el.autoDetectBtn.addEventListener('click', handleAutoDetect);
  el.resetBtn.addEventListener('click', handleReset);
  el.copyBtn.addEventListener('click', handleCopy);
  el.downloadBtn.addEventListener('click', handleDownload);
  el.openFullPageBtn.addEventListener('click', openFullPage);

  el.codeEditor.addEventListener('input', e => {
    state.files[state.activeFile] = e.target.value;
    el.editorHighlight.textContent = e.target.value;
    updateLineCount(e.target.value);
    queuePersist();
  });

  el.codeEditor.addEventListener('scroll', () => {
    el.editorHighlight.scrollTop  = el.codeEditor.scrollTop;
    el.editorHighlight.scrollLeft = el.codeEditor.scrollLeft;
  });
}

/* ─── Theme ──────────────────────────────────────────────────── */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  el.themeSun.hidden  = state.theme !== 'light';
  el.themeMoon.hidden = state.theme !== 'dark';
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  queuePersist();
}

/* ─── Stack grid ─────────────────────────────────────────────── */
function renderStackGrid() {
  const q = state.stackSearch;
  const entries = Object.entries(STACK_DEFINITIONS).filter(([, s]) => {
    if (!q) return true;
    return `${s.label} ${s.type} ${s.description ?? ''}`.toLowerCase().includes(q);
  });

  const frag = document.createDocumentFragment();
  entries.forEach(([id, stack]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `stack-chip${state.selectedStacks.includes(id) ? ' active' : ''}`;
    btn.dataset.stackId = id;

    const left = document.createElement('div');
    left.style.minWidth = '0';

    const title = document.createElement('strong');
    title.textContent = stack.label;

    const sub = document.createElement('span');
    sub.textContent = stack.type ?? '';

    left.appendChild(title);
    left.appendChild(sub);

    const badge = document.createElement('span');
    badge.className = 'mini-badge';
    badge.textContent = countRules(id);

    btn.appendChild(left);
    btn.appendChild(badge);
    btn.addEventListener('click', () => toggleStack(id));
    frag.appendChild(btn);
  });

  el.stackSelection.replaceChildren(frag);
  updateSelectionSummary();
}

function toggleStack(id) {
  state.selectedStacks = state.selectedStacks.includes(id)
    ? state.selectedStacks.filter(s => s !== id)
    : [...state.selectedStacks, id];

  renderStackGrid();

  if (state.settings.autoRefresh) {
    rebuildAndRender('Updated stacks');
  } else {
    updateSelectionSummary();
    queuePersist();
  }
}

function updateSelectionSummary() {
  const n = state.selectedStacks.length;
  el.selectionSummary.textContent = n ? `${n} selected` : '0 selected';
}

/* ─── Build + render ─────────────────────────────────────────── */
function rebuildAndRender(statusMsg) {
  const result = buildArtifacts({
    selectedStacks:    state.selectedStacks,
    selectedCategories: state.selectedCategories,
    enabledConfigs:    state.enabledConfigs,
    customRules:       state.customRules,
    scanInput:         state.scanInput
  });

  state.files        = result.files        ?? {};
  state.suggestions  = result.suggestions  ?? [];
  state.warnings     = result.warnings     ?? [];
  state.categoryStats = result.categoryStats ?? [];
  state.activeFile   = 'gitignore';

  renderStackGrid();
  renderFileTabs();
  renderEditor();

  if (statusMsg) showStatus(statusMsg);
  queuePersist();
}

/* ─── File tabs ──────────────────────────────────────────────── */
function renderFileTabs() {
  const frag = document.createDocumentFragment();
  // Only show enabled config tabs
  Object.entries(state.enabledConfigs).forEach(([id, enabled]) => {
    if (!enabled || !FILE_META[id]) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `file-tab${state.activeFile === id ? ' active' : ''}`;
    btn.textContent = FILE_META[id].label;
    btn.addEventListener('click', () => {
      state.activeFile = id;
      renderFileTabs();
      renderEditor();
      queuePersist();
    });
    frag.appendChild(btn);
  });
  el.fileTabs.replaceChildren(frag);
}

/* ─── Editor ─────────────────────────────────────────────────── */
function renderEditor() {
  const content = state.files[state.activeFile] ?? '';
  el.codeEditor.value = content;
  el.editorHighlight.textContent = content;
  updateLineCount(content);
}

function updateLineCount(content) {
  const n = content ? content.split('\n').length : 0;
  el.lineCount.textContent = `${n} line${n === 1 ? '' : 's'}`;
}

/* ─── Status banner ──────────────────────────────────────────── */
function showStatus(msg) {
  el.statusText.textContent = msg;
  el.statusBanner.hidden = false;
  // Auto-hide after 4s
  clearTimeout(el._statusTimer);
  el._statusTimer = setTimeout(() => { el.statusBanner.hidden = true; }, 4000);
}

/* ─── Auto-detect ────────────────────────────────────────────── */
async function handleAutoDetect() {
  el.autoDetectBtn.disabled = true;
  el.autoDetectBtn.textContent = 'Detecting…';
  try {
    const detected = await detectStacksFromActiveTab();

    if (!detected.length) {
      showToast('No stack detected on this tab', 'warning');
      return;
    }

    // Merge into current selection
    state.selectedStacks = [...new Set([...state.selectedStacks, ...detected])];
    state.detectedFromText = detected;

    rebuildAndRender(`Detected ${detected.length} stack${detected.length === 1 ? '' : 's'}`);
    showToast(`Added ${detected.length} stack${detected.length === 1 ? '' : 's'} from tab`, 'success');
  } catch (err) {
    showToast(err.message || 'Auto-detect failed', 'error');
  } finally {
    el.autoDetectBtn.disabled = false;
    el.autoDetectBtn.textContent = 'Auto-detect';
  }
}

/* ─── Reset ──────────────────────────────────────────────────── */
function handleReset() {
  const saved = state.savedTemplates; // preserve user templates
  Object.assign(state, structuredClone(DEFAULT_STATE), {
    stackSearch: '',
    files: {},
    suggestions: [],
    warnings: [],
    categoryStats: [],
    savedTemplates: saved
  });
  el.stackSearch.value = '';
  applyTheme();
  rebuildAndRender('Reset to defaults');
  showToast('Reset to defaults', 'success');
}

/* ─── Copy ───────────────────────────────────────────────────── */
async function handleCopy() {
  const content = state.files[state.activeFile] ?? '';
  if (!content.trim()) { showToast('Nothing to copy yet', 'warning'); return; }
  try {
    await navigator.clipboard.writeText(content);
    showToast(`Copied ${FILE_META[state.activeFile]?.filename ?? state.activeFile}`, 'success');
  } catch {
    showToast('Clipboard access denied', 'error');
  }
}

/* ─── Download ───────────────────────────────────────────────── */
function handleDownload() {
  const content = state.files[state.activeFile] ?? '';
  if (!content.trim()) { showToast('Nothing to download yet', 'warning'); return; }

  const filename = FILE_META[state.activeFile]?.filename ?? '.gitignore';
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`, 'success');
}

/* ─── Open full page ─────────────────────────────────────────── */
function openFullPage() {
  // Save current state first so fullpage.html inherits it
  persistCurrentState();
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/fullpage.html') });
}

/* ─── Persist ────────────────────────────────────────────────── */
function queuePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistCurrentState, 150);
}

function persistCurrentState() {
  return persistState({
    theme:              state.theme,
    settings:           state.settings,
    selectedStacks:     state.selectedStacks,
    selectedCategories: state.selectedCategories,
    enabledConfigs:     state.enabledConfigs,
    customRules:        state.customRules,
    scanInput:          state.scanInput,
    detectedFromText:   state.detectedFromText,
    activeFile:         state.activeFile,
    savedTemplates:     state.savedTemplates,
    files:              state.files
  });
}

/* ─── Toast ──────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  el.toast.className = `toast ${type} visible`;
  el.toast.textContent = msg;
  toastTimer = setTimeout(() => { el.toast.className = 'toast'; }, 2600);
}

/* ─── Helpers ────────────────────────────────────────────────── */
function countRules(id) {
  const stack = STACK_DEFINITIONS[id];
  if (!stack?.rules) return 0;
  return Object.values(stack.rules).reduce((n, arr) => n + arr.length, 0);
}

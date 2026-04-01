import {
  ALL_CATEGORY_IDS,
  CATEGORY_DEFINITIONS,
  CONFIG_DEFINITIONS,
  DEFAULT_STATE,
  FILE_META,
  PRESET_LIBRARY,
  STACK_DEFINITIONS
} from './state.js';

import { analyzeProjectInput, buildArtifacts, highlightCode } from './generator.js';
import { detectStacksFromActiveTab }                          from './detector.js';
import { loadPersistedState, persistState, saveCustomTemplate, deleteCustomTemplate } from './storage.js';

/* ─── State ─────────────────────────────────────────────────── */
const state = {
  ...structuredClone(DEFAULT_STATE),
  categorySearch: '',
  stackSearch: '',
  files: {},
  suggestions: [],
  warnings: [],
  categoryStats: []
};

/* ─── DOM cache ──────────────────────────────────────────────── */
const els = {};
const IDS = [
  'themeToggle', 'settingsToggle', 'settingsPanel', 'settingsClose',
  'settingExplanations', 'settingAutoRefresh', 'settingCompactPreview',
  'autoDetectBtn', 'applyScanBtn',
  'stackSearch', 'stackSelection',
  'scanInput', 'scanSummary', 'detectedStackChips',
  'ruleSearch', 'categoryPanel',
  'presetGrid', 'templateCount', 'customTemplateName', 'saveTemplateBtn',
  'configToggles', 'configSummary',
  'customRules',
  'suggestionList', 'warningList', 'warningCount',
  'fileTabs', 'editorHighlight', 'codeEditor', 'lineCount',
  'statusText', 'selectionSummary',
  'resetBtn', 'regenerateBtn', 'copyBtn', 'downloadBtn',
  'toast'
];

let persistTimer = null;
let toastTimer   = null;

/* ─── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  IDS.forEach(id => { els[id] = document.getElementById(id); });
  els.themeSun  = document.querySelector('.theme-icon-sun');
  els.themeMoon = document.querySelector('.theme-icon-moon');

  hydrateState(await loadPersistedState());
  bindEvents();
  renderAll();
}, { once: true });

/* ─── Hydrate ────────────────────────────────────────────────── */
function hydrateState(persisted) {
  if (!persisted) { applyTheme(); syncSettings(); return; }

  state.theme              = persisted.theme ?? 'light';
  state.settings           = { ...DEFAULT_STATE.settings, ...persisted.settings };
  state.selectedStacks     = Array.isArray(persisted.selectedStacks)     ? persisted.selectedStacks     : [];
  state.selectedCategories = Array.isArray(persisted.selectedCategories) ? persisted.selectedCategories : [...ALL_CATEGORY_IDS];
  state.enabledConfigs     = { ...DEFAULT_STATE.enabledConfigs, ...persisted.enabledConfigs };
  state.customRules        = persisted.customRules ?? '';
  state.scanInput          = persisted.scanInput   ?? '';
  state.savedTemplates     = Array.isArray(persisted.savedTemplates)    ? persisted.savedTemplates    : [];
  state.detectedFromText   = Array.isArray(persisted.detectedFromText)  ? persisted.detectedFromText  : [];
  state.activeFile         = persisted.activeFile ?? 'gitignore';

  applyTheme();
  syncSettings();
}

function syncSettings() {
  if (els.settingExplanations) els.settingExplanations.checked = state.settings.showExplanations;
  if (els.settingAutoRefresh)  els.settingAutoRefresh.checked  = state.settings.autoRefresh;
  if (els.settingCompactPreview) els.settingCompactPreview.checked = state.settings.compactPreview;
  if (els.scanInput)   els.scanInput.value   = state.scanInput;
  if (els.customRules) els.customRules.value = state.customRules;
  syncEditorDensity();
}

/* ─── Theme ──────────────────────────────────────────────────── */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  if (els.themeSun)  els.themeSun.hidden  = state.theme !== 'light';
  if (els.themeMoon) els.themeMoon.hidden = state.theme !== 'dark';
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  queuePersist();
}

/* ─── Settings ───────────────────────────────────────────────── */
function toggleSettings(open) {
  const shouldOpen = typeof open === 'boolean' ? open : els.settingsPanel.hidden;
  els.settingsPanel.hidden = !shouldOpen;
}

/* ─── Events ─────────────────────────────────────────────────── */
function bindEvents() {
  els.themeToggle.addEventListener('click', toggleTheme);
  els.settingsToggle.addEventListener('click', () => toggleSettings(true));
  els.settingsClose.addEventListener('click', () => toggleSettings(false));

  els.settingExplanations.addEventListener('change', e => {
    state.settings.showExplanations = e.target.checked;
    rerenderAndSave();
  });
  els.settingAutoRefresh.addEventListener('change', e => {
    state.settings.autoRefresh = e.target.checked;
    queuePersist();
  });
  els.settingCompactPreview.addEventListener('change', e => {
    state.settings.compactPreview = e.target.checked;
    syncEditorDensity();
    queuePersist();
  });

  els.stackSearch.addEventListener('input', e => {
    state.stackSearch = e.target.value.trim().toLowerCase();
    renderStackSelection();
  });

  if (els.scanInput) {
    els.scanInput.addEventListener('input', e => {
      state.scanInput = e.target.value;
      const analysis = analyzeProjectInput(state.scanInput);
      state.detectedFromText = analysis.detectedStacks;
      renderDetectedStackChips();
      updateScanSummary(analysis);
      if (state.settings.autoRefresh) rebuildArtifacts('Updated scan input');
      else queuePersist();
    });
  }

  if (els.applyScanBtn) els.applyScanBtn.addEventListener('click', applyScanSuggestions);
  if (els.autoDetectBtn) els.autoDetectBtn.addEventListener('click', handleAutoDetect);

  els.ruleSearch.addEventListener('input', e => {
    state.categorySearch = e.target.value.trim().toLowerCase();
    renderCategoryPanel();
  });

  els.customRules.addEventListener('input', e => {
    state.customRules = e.target.value;
    if (state.settings.autoRefresh) rebuildArtifacts('Updated custom rules');
    else queuePersist();
  });

  els.saveTemplateBtn.addEventListener('click', handleSaveTemplate);
  els.resetBtn.addEventListener('click', resetState);
  els.regenerateBtn.addEventListener('click', () => rebuildArtifacts('Regenerated files'));
  els.copyBtn.addEventListener('click', copyCurrentFile);
  els.downloadBtn.addEventListener('click', downloadCurrentFile);

  els.codeEditor.addEventListener('input', handleEditorInput);
  els.codeEditor.addEventListener('scroll', () => {
    els.editorHighlight.scrollTop  = els.codeEditor.scrollTop;
    els.editorHighlight.scrollLeft = els.codeEditor.scrollLeft;
  });
}

/* ─── renderAll ──────────────────────────────────────────────── */
function renderAll() {
  state.activeFile = 'gitignore';
  renderStackSelection();
  renderPresetGrid();
  renderConfigToggles();
  renderDetectedStackChips();
  updateScanSummary({ detectedStacks: state.detectedFromText });
  rebuildArtifacts('Ready to generate');
}

/* ─── Stack selection ────────────────────────────────────────── */
function renderStackSelection() {
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

    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = stack.label;
    const sub = document.createElement('span');
    sub.textContent = stack.type ?? '';
    copy.appendChild(title);
    copy.appendChild(sub);

    const badge = document.createElement('span');
    badge.className = 'mini-badge';
    badge.textContent = countStackRules(id);

    btn.appendChild(copy);
    btn.appendChild(badge);
    btn.addEventListener('click', () => toggleStack(id));
    frag.appendChild(btn);
  });

  els.stackSelection.replaceChildren(frag);
}

function toggleStack(id) {
  state.selectedStacks = state.selectedStacks.includes(id)
    ? state.selectedStacks.filter(s => s !== id)
    : [...state.selectedStacks, id];

  renderStackSelection();
  if (state.settings.autoRefresh) rebuildArtifacts('Updated stack selection');
  else { updateFooterMeta(); queuePersist(); }
}

/* ─── Detected chips ─────────────────────────────────────────── */
function renderDetectedStackChips() {
  if (!els.detectedStackChips) return;
  els.detectedStackChips.replaceChildren();
  state.detectedFromText.forEach(id => {
    const chip = document.createElement('span');
    chip.className = 'detected-chip';
    chip.textContent = STACK_DEFINITIONS[id]?.label ?? id;
    els.detectedStackChips.appendChild(chip);
  });
}

/* ─── Preset grid ────────────────────────────────────────────── */
function renderPresetGrid() {
  els.presetGrid.replaceChildren();
  const presets = [...PRESET_LIBRARY, ...state.savedTemplates];
  els.templateCount.textContent = `${presets.length} preset${presets.length === 1 ? '' : 's'}`;

  presets.forEach(preset => {
    const card = document.createElement('article');
    card.className = 'preset-card';

    const title = document.createElement('h3');
    title.textContent = preset.name;
    const desc = document.createElement('p');
    desc.textContent = preset.description;

    const tags = document.createElement('div');
    tags.className = 'preset-tags';
    preset.stacks.forEach(sid => {
      const tag = document.createElement('span');
      tag.className = 'preset-tag';
      tag.textContent = STACK_DEFINITIONS[sid]?.label ?? sid;
      tags.appendChild(tag);
    });

    const actions = document.createElement('div');
    actions.className = 'hero-actions';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'secondary-button';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => applyPreset(preset));
    actions.appendChild(applyBtn);

    if (preset.userDefined) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ghost-button';
      del.textContent = 'Remove';
      del.addEventListener('click', () => removeTemplate(preset.id));
      actions.appendChild(del);
    }

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(tags);
    card.appendChild(actions);
    els.presetGrid.appendChild(card);
  });
}

/* ─── Config toggles ─────────────────────────────────────────── */
function renderConfigToggles() {
  const frag = document.createDocumentFragment();
  const count = Object.values(state.enabledConfigs).filter(Boolean).length;
  els.configSummary.textContent = `${count} file${count === 1 ? '' : 's'} enabled`;

  Object.entries(CONFIG_DEFINITIONS).forEach(([id, config]) => {
    const lbl = document.createElement('label');
    lbl.className = 'config-toggle';

    const txt = document.createElement('span');
    txt.textContent = config.label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(state.enabledConfigs[id]);
    input.disabled = id === 'gitignore';
    input.addEventListener('change', e => {
      state.enabledConfigs[id] = e.target.checked;
      if (!state.enabledConfigs[state.activeFile]) state.activeFile = 'gitignore';
      rerenderAndSave();
    });

    lbl.appendChild(txt);
    lbl.appendChild(input);
    frag.appendChild(lbl);
  });

  els.configToggles.replaceChildren(frag);
}

/* ─── Category panel ─────────────────────────────────────────── */
function renderCategoryPanel() {
  const q = state.categorySearch;
  const frag = document.createDocumentFragment();

  state.categoryStats
    .filter(item => {
      if (!q) return true;
      const haystack = `${item.label} ${item.description} ${item.rules.map(r => `${r.pattern} ${r.reason}`).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    })
    .forEach(item => {
      const card = document.createElement('article');
      card.className = 'category-card';

      const head = document.createElement('div');
      head.className = 'category-head';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'category-toggle';
      toggle.checked = state.selectedCategories.includes(item.id);
      toggle.addEventListener('change', e => {
        state.selectedCategories = e.target.checked
          ? [...new Set([...state.selectedCategories, item.id])]
          : state.selectedCategories.filter(c => c !== item.id);
        rerenderAndSave();
      });

      const copy = document.createElement('div');
      copy.className = 'category-copy';
      const h3 = document.createElement('h3');
      h3.textContent = item.label;
      const p = document.createElement('p');
      p.textContent = item.description;
      copy.appendChild(h3);
      copy.appendChild(p);

      const meta = document.createElement('div');
      meta.className = 'category-meta mini-badge';
      meta.textContent = `${item.count} rules`;

      head.appendChild(toggle);
      head.appendChild(copy);
      head.appendChild(meta);
      card.appendChild(head);

      if (state.settings.showExplanations && item.rules.length) {
        const details = document.createElement('details');
        details.className = 'category-detail';
        const summary = document.createElement('summary');
        summary.textContent = 'View included rules';
        const list = document.createElement('div');
        list.className = 'rule-list';

        item.rules.slice(0, 8).forEach(rule => {
          const row = document.createElement('div');
          row.className = 'rule-item';
          const code = document.createElement('code');
          code.textContent = rule.pattern;
          const desc = document.createElement('p');
          desc.textContent = rule.reason;
          row.appendChild(code);
          row.appendChild(desc);
          list.appendChild(row);
        });

        details.appendChild(summary);
        details.appendChild(list);
        card.appendChild(details);
      }

      frag.appendChild(card);
    });

  els.categoryPanel.replaceChildren(frag);
}

/* ─── Suggestions / warnings ─────────────────────────────────── */
function renderSuggestions() {
  fillList(els.suggestionList, state.suggestions, false);
  fillList(els.warningList,    state.warnings,    true);
  els.warningCount.textContent = `${state.warnings.length} warning${state.warnings.length === 1 ? '' : 's'}`;
}

function fillList(container, items, isWarn) {
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'list-item';
    empty.textContent = isWarn ? 'No warnings.' : 'No extra suggestions.';
    container.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `list-item${isWarn ? ' warn' : ''}`;
    const strong = document.createElement('strong');
    strong.textContent = item.title;
    const body = document.createElement('div');
    body.textContent = item.body;
    row.appendChild(strong);
    row.appendChild(body);
    container.appendChild(row);
  });
}

/* ─── File tabs ──────────────────────────────────────────────── */
function renderFileTabs() {
  const frag = document.createDocumentFragment();
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
  els.fileTabs.replaceChildren(frag);
}

/* ─── Editor ─────────────────────────────────────────────────── */
function renderEditor() {
  const content = state.files[state.activeFile] ?? '';
  els.codeEditor.value = content;
  els.editorHighlight.textContent = highlightCode(content);
  updateLineCount(content);
  syncEditorDensity();
  updateFooterMeta();
}

function syncEditorDensity() {
  const compact = state.settings.compactPreview;
  els.codeEditor.classList.toggle('compact', compact);
  els.editorHighlight.classList.toggle('compact', compact);
}

function handleEditorInput(e) {
  state.files[state.activeFile] = e.target.value;
  els.editorHighlight.textContent = highlightCode(e.target.value);
  updateLineCount(e.target.value);
  els.statusText.textContent = `Editing ${FILE_META[state.activeFile]?.filename ?? state.activeFile}`;
  queuePersist();
}

function updateLineCount(content) {
  const n = content ? content.split('\n').length : 0;
  els.lineCount.textContent = `${n} line${n === 1 ? '' : 's'}`;
}

function updateFooterMeta() {
  const n = state.selectedStacks.length;
  els.selectionSummary.textContent = n ? `${n} stack${n === 1 ? '' : 's'} selected` : '0 stacks selected';
  els.downloadBtn.textContent = `Download ${FILE_META[state.activeFile]?.filename ?? '.gitignore'}`;
}

/* ─── Rebuild artifacts ──────────────────────────────────────── */
function rebuildArtifacts(statusText) {
  const result = buildArtifacts({
    selectedStacks:     state.selectedStacks,
    selectedCategories: state.selectedCategories,
    enabledConfigs:     state.enabledConfigs,
    customRules:        state.customRules,
    scanInput:          state.scanInput
  });

  state.files         = result.files         ?? {};
  state.suggestions   = result.suggestions   ?? [];
  state.warnings      = result.warnings      ?? [];
  state.categoryStats = result.categoryStats ?? [];
  state.activeFile    = 'gitignore';

  renderCategoryPanel();
  renderSuggestions();
  renderConfigToggles();
  renderFileTabs();
  renderEditor();
  els.statusText.textContent = statusText;
  queuePersist();
}

function rerenderAndSave() { rebuildArtifacts('Updated settings'); }

/* ─── Persist ────────────────────────────────────────────────── */
function queuePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistState({
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
  }, 150);
}

/* ─── Auto-detect ────────────────────────────────────────────── */
async function handleAutoDetect() {
  if (!els.autoDetectBtn) return;
  els.autoDetectBtn.disabled = true;
  const orig = els.autoDetectBtn.textContent;
  els.autoDetectBtn.textContent = 'Detecting…';
  try {
    const detected = await detectStacksFromActiveTab();
    if (!detected.length) { showToast('No stack detected on this tab', 'warning'); return; }
    state.selectedStacks  = [...new Set([...state.selectedStacks, ...detected])];
    state.detectedFromText = detected;
    renderStackSelection();
    renderDetectedStackChips();
    rebuildArtifacts(`Detected ${detected.length} stack${detected.length === 1 ? '' : 's'}`);
    showToast(`Added ${detected.length} stack${detected.length === 1 ? '' : 's'}`, 'success');
  } catch (err) {
    showToast(err.message || 'Auto-detect failed', 'error');
  } finally {
    els.autoDetectBtn.disabled = false;
    els.autoDetectBtn.textContent = orig;
  }
}

/* ─── Scan suggestions ───────────────────────────────────────── */
function applyScanSuggestions() {
  if (!els.scanInput || !els.scanSummary) return;
  const analysis = analyzeProjectInput(state.scanInput);
  if (!analysis.detectedStacks.length) { showToast('No stack clues found', 'warning'); return; }
  state.selectedStacks   = [...new Set([...state.selectedStacks, ...analysis.detectedStacks])];
  state.detectedFromText = analysis.detectedStacks;
  renderStackSelection();
  renderDetectedStackChips();
  rebuildArtifacts('Applied scan suggestions');
  showToast(`Added ${analysis.detectedStacks.length} detected stack${analysis.detectedStacks.length === 1 ? '' : 's'}`, 'success');
}

function updateScanSummary(analysis) {
  if (!els.scanSummary) return;
  els.scanSummary.textContent = analysis.detectedStacks.length
    ? `${analysis.detectedStacks.length} stack${analysis.detectedStacks.length === 1 ? '' : 's'} hinted`
    : 'No manifests scanned';
}

/* ─── Preset apply / remove ──────────────────────────────────── */
function applyPreset(preset) {
  state.selectedStacks     = [...preset.stacks];
  state.selectedCategories = preset.categories ? [...preset.categories] : [...ALL_CATEGORY_IDS];
  state.enabledConfigs     = { ...DEFAULT_STATE.enabledConfigs, ...preset.enabledConfigs };
  state.customRules        = preset.customRules ?? '';
  els.customRules.value    = state.customRules;
  state.detectedFromText   = [];
  renderStackSelection();
  renderDetectedStackChips();
  rebuildArtifacts(`Applied ${preset.name}`);
  showToast(`Applied ${preset.name}`, 'success');
}

function removeTemplate(id) {
  state.savedTemplates = deleteCustomTemplate(state.savedTemplates, id);
  renderPresetGrid();
  queuePersist();
  showToast('Template removed', 'success');
}

async function handleSaveTemplate() {
  const name = els.customTemplateName.value.trim();
  if (!name) { showToast('Enter a template name first', 'warning'); return; }
  const result = saveCustomTemplate(state.savedTemplates, {
    name,
    description: 'Saved from current configuration.',
    stacks:       state.selectedStacks,
    categories:   state.selectedCategories,
    enabledConfigs: state.enabledConfigs,
    customRules:  state.customRules
  });
  state.savedTemplates = result.collection;
  els.customTemplateName.value = '';
  renderPresetGrid();
  queuePersist();
  showToast(`Saved: ${result.created.name}`, 'success');
}

/* ─── Reset ──────────────────────────────────────────────────── */
function resetState() {
  const saved = state.savedTemplates;
  Object.assign(state, structuredClone(DEFAULT_STATE), {
    categorySearch: '', stackSearch: '',
    files: {}, suggestions: [], warnings: [], categoryStats: [],
    savedTemplates: saved
  });
  state.activeFile = 'gitignore';
  els.stackSearch.value        = '';
  els.ruleSearch.value         = '';
  els.customTemplateName.value = '';
  if (els.scanInput) els.scanInput.value = '';
  els.customRules.value        = '';
  toggleSettings(false);
  applyTheme();
  syncSettings();
  renderAll();
  showToast('Reset to defaults', 'success');
}

/* ─── Copy / Download ────────────────────────────────────────── */
async function copyCurrentFile() {
  const content = state.files[state.activeFile] ?? '';
  if (!content.trim()) { showToast('Nothing to copy', 'warning'); return; }
  try {
    await navigator.clipboard.writeText(content);
    showToast(`Copied ${FILE_META[state.activeFile]?.filename}`, 'success');
  } catch {
    showToast('Clipboard access denied', 'error');
  }
}

function downloadCurrentFile() {
  const content  = state.files[state.activeFile] ?? '';
  if (!content.trim()) { showToast('Nothing to download', 'warning'); return; }
  const filename = FILE_META[state.activeFile]?.filename ?? '.gitignore';
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`, 'success');
}

/* ─── Toast ──────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  els.toast.className = `toast ${type} visible`;
  els.toast.textContent = msg;
  toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, 2600);
}

/* ─── Helpers ────────────────────────────────────────────────── */
function countStackRules(id) {
  const stack = STACK_DEFINITIONS[id];
  if (!stack?.rules) return 0;
  return Object.values(stack.rules).reduce((n, arr) => n + arr.length, 0);
}

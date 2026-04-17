/**
 * popup.js — CSS Specificity Calculator v2
 * Main UI controller. All DOM ops are CSP-safe (no innerHTML).
 */

import { calculate, compare } from '../services/specificityService.js';
import { el, append, clear, setVisible, debounce } from '../utils/domHelpers.js';
import { getTheme, setTheme, getHistory, addToHistory } from '../services/storageService.js';

// ── DOM References ────────────────────────────────────────────
const $ = id => document.getElementById(id);

const sel1     = $('selector1');
const sel2     = $('selector2');
const badge1   = $('badge1');
const badge2   = $('badge2');
const error1   = $('error1');
const error2   = $('error2');
const wrap1    = $('inputWrap1');
const wrap2    = $('inputWrap2');
const calcBtn  = $('calculateBtn');
const clearBtn = $('clearBtn');
const exampBtn = $('exampleBtn');
const copyBtn  = $('copyResultsBtn');
const results  = $('resultsSection');

// Result els
const r1Sel    = $('result1Selector');
const r1Tuple  = $('result1Tuple');
const hints1   = $('hints1');
const bar1     = $('bar1');
const vals1    = $('values1');
const det1     = $('details1');

const compBlock = $('comparisonBlock');
const r2Sel     = $('result2Selector');
const r2Tuple   = $('result2Tuple');
const hints2    = $('hints2');
const bar2      = $('bar2');
const vals2     = $('values2');
const det2      = $('details2');

const winnerBanner = $('winnerBanner');
const winnerLabel  = $('winnerLabel');
const winnerDetail = $('winnerDetail');
const whyToggle    = $('whyToggle');
const whyBody      = $('whyBody');

const guideBtn  = $('toggleGuideBtn');
const guideBody = $('guideBody');

const themeBtn  = $('themeToggleBtn');
const infoBtn   = $('infoBtn');
const closeInfo = $('closeInfoBtn');
const infoModal = $('infoModal');

const historyDrop = $('historyDropdown');
const statusDot  = $('statusDot');
const statusText = $('statusText');

// ── State ─────────────────────────────────────────────────────
let currentResults = null;
let whyOpen = false;
let guideOpen = false;
let activeInput = null;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  const theme = await getTheme();
  applyTheme(theme);
  setStatus('ready', 'Ready — enter a CSS selector');

  themeBtn.addEventListener('click', toggleTheme);
  infoBtn.addEventListener('click', () => setVisible(infoModal, true, 'flex'));
  closeInfo.addEventListener('click', () => setVisible(infoModal, false));
  infoModal.addEventListener('click', e => { if (e.target === infoModal) setVisible(infoModal, false); });

  calcBtn.addEventListener('click', runCalculate);
  clearBtn.addEventListener('click', clearAll);
  exampBtn.addEventListener('click', loadExample);
  copyBtn.addEventListener('click', copyResults);

  guideBtn.addEventListener('click', toggleGuide);
  whyToggle.addEventListener('click', toggleWhy);

  // Live calculation with debounce
  const debouncedCalc = debounce(runCalculate, 320);
  sel1.addEventListener('input', () => { updateLiveBadge(sel1, badge1, error1, wrap1); debouncedCalc(); });
  sel2.addEventListener('input', () => { updateLiveBadge(sel2, badge2, error2, wrap2); debouncedCalc(); });

  sel1.addEventListener('keydown', e => { if (e.key === 'Enter') runCalculate(); });
  sel2.addEventListener('keydown', e => { if (e.key === 'Enter') runCalculate(); });

  // History dropdowns
  sel1.addEventListener('focus', () => showHistory(sel1));
  sel2.addEventListener('focus', () => showHistory(sel2));
  document.addEventListener('click', e => {
    if (!historyDrop.contains(e.target) && e.target !== sel1 && e.target !== sel2) {
      setVisible(historyDrop, false);
    }
  });
}

// ── Theme ─────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  await setTheme(next);
}

// ── History ───────────────────────────────────────────────────
async function showHistory(inputEl) {
  activeInput = inputEl;
  const history = await getHistory();
  if (!history.length) { setVisible(historyDrop, false); return; }

  clear(historyDrop);
  history.forEach(selector => {
    const item = el('div', { cls: 'history-item', text: selector });
    item.setAttribute('role', 'option');
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      inputEl.value = selector;
      updateLiveBadge(inputEl, inputEl === sel1 ? badge1 : badge2, inputEl === sel1 ? error1 : error2, inputEl === sel1 ? wrap1 : wrap2);
      setVisible(historyDrop, false);
      runCalculate();
    });
    historyDrop.appendChild(item);
  });

  // Position below the focused input
  const rect = inputEl.getBoundingClientRect();
  const appRect = document.getElementById('app').getBoundingClientRect();
  historyDrop.style.top = (rect.bottom - appRect.top + 4) + 'px';
  historyDrop.style.left = '14px';
  historyDrop.style.right = '14px';
  historyDrop.style.position = 'absolute';
  document.getElementById('inputSection').style.position = 'relative';
  setVisible(historyDrop, true);
}

// ── Live badge ────────────────────────────────────────────────
function updateLiveBadge(inputEl, badgeEl, errorEl, wrapEl) {
  const val = inputEl.value.trim();
  errorEl.textContent = '';
  wrapEl.querySelector('.selector-input').classList.remove('is-error');
  badgeEl.classList.remove('visible');

  if (!val) return;

  try {
    const result = calculate(val);
    const [a, b, c, d] = result.specificity;
    badgeEl.textContent = `(${a},${b},${c},${d})`;
    badgeEl.classList.add('visible');
  } catch (e) {
    inputEl.classList.add('is-error');
    errorEl.textContent = e.message;
  }
}

// ── Calculate ─────────────────────────────────────────────────
function runCalculate() {
  const s1 = sel1.value.trim();
  const s2 = sel2.value.trim();

  if (!s1) {
    if (s2) {
      setStatus('error', 'Please fill Selector 1 first');
    }
    setVisible(results, false);
    return;
  }

  let spec1, spec2;
  let hasError = false;

  // Validate + calculate selector 1
  try {
    spec1 = calculate(s1);
    error1.textContent = '';
    sel1.classList.remove('is-error');
  } catch (e) {
    sel1.classList.add('is-error');
    error1.textContent = e.message;
    setVisible(results, false);
    setStatus('error', e.message);
    hasError = true;
  }

  // Validate + calculate selector 2
  if (s2) {
    try {
      spec2 = calculate(s2);
      error2.textContent = '';
      sel2.classList.remove('is-error');
    } catch (e) {
      sel2.classList.add('is-error');
      error2.textContent = e.message;
      setStatus('error', e.message);
      hasError = true;
    }
  }

  if (hasError) return;

  currentResults = { spec1, spec2: spec2 || null };

  // Save to history
  if (s1) addToHistory(s1);
  if (s2) addToHistory(s2);

  displayResults(spec1, spec2 || null);
  setStatus('success', spec2 ? 'Comparison complete' : 'Specificity calculated');
}

// ── Display ───────────────────────────────────────────────────
function displayResults(spec1, spec2) {
  setVisible(results, true);

  renderResultCard(spec1, {
    selEl: r1Sel, tupleEl: r1Tuple, hintsEl: hints1,
    barEl: bar1, valsEl: vals1, detEl: det1
  });

  if (spec2) {
    setVisible(compBlock, true);
    renderResultCard(spec2, {
      selEl: r2Sel, tupleEl: r2Tuple, hintsEl: hints2,
      barEl: bar2, valsEl: vals2, detEl: det2
    });

    const cmp = compare(spec1, spec2);
    renderWinner(cmp, spec1, spec2);

    // Mark winner/loser cards
    const card1 = $('result1');
    const card2 = $('result2');
    card1.classList.remove('is-winner', 'is-loser', 'is-draw');
    card2.classList.remove('is-winner', 'is-loser', 'is-draw');
    if (cmp.winner === 1) { card1.classList.add('is-winner'); card2.classList.add('is-loser'); }
    else if (cmp.winner === 2) { card2.classList.add('is-winner'); card1.classList.add('is-loser'); }
    else { card1.classList.add('is-draw'); card2.classList.add('is-draw'); }

  } else {
    setVisible(compBlock, false);
    $('result1').classList.remove('is-winner', 'is-loser', 'is-draw');
  }

  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderResultCard(spec, { selEl, tupleEl, hintsEl, barEl, valsEl, detEl }) {
  const [a, b, c, d] = spec.specificity;

  selEl.textContent = spec.selector;
  tupleEl.textContent = `(${a},${b},${c},${d})`;

  // Hints
  clear(hintsEl);
  spec.hints.forEach(hint => {
    const chip = el('span', { cls: ['hint-chip', hint.type], text: hint.label });
    chip.setAttribute('title', hint.detail);
    hintsEl.appendChild(chip);
  });

  renderSpecBar(barEl, spec.specificity);
  renderSpecValues(valsEl, spec.specificity);
  renderBreakdown(detEl, spec);
}

function renderSpecBar(container, [a, b, c, d]) {
  clear(container);
  const total = a + b + c + d;
  if (total === 0) return;

  const segments = [
    { val: a, color: 'var(--color-inline)', label: 'I' },
    { val: b, color: 'var(--color-id)',     label: 'ID' },
    { val: c, color: 'var(--color-class)',  label: 'C' },
    { val: d, color: 'var(--color-element)',label: 'E' },
  ];

  segments.forEach(({ val, color, label }) => {
    if (val <= 0) return;
    const width = Math.max((val / total) * 100, 8);
    const seg = el('div', {
      cls: 'spec-segment',
      text: label,
      style: { background: color, width: `${width}%` }
    });
    container.appendChild(seg);
  });
}

function renderSpecValues(container, [a, b, c, d]) {
  clear(container);
  const COLORS = ['var(--color-inline)', 'var(--color-id)', 'var(--color-class)', 'var(--color-element)'];
  const LABELS = ['Inline', 'IDs', 'Classes', 'Elements'];
  [a, b, c, d].forEach((val, i) => {
    const box = el('div', { cls: 'spec-val-box' });
    const num = el('span', { cls: 'spec-val-num', text: String(val), style: { color: COLORS[i] } });
    const lbl = el('span', { cls: 'spec-val-lbl', text: LABELS[i] });
    append(box, num, lbl);
    container.appendChild(box);
  });
}

function renderBreakdown(container, spec) {
  clear(container);
  const { breakdown, specificity } = spec;
  const [a, b, c, d] = specificity;

  const rows = [];
  if (a > 0) rows.push({ label: 'Inline Styles', val: a, detail: 'style=""' });
  if (b > 0) rows.push({ label: 'ID Selectors', val: b, detail: breakdown.ids.slice(0, 3).join(', ') });
  if (c > 0) {
    const parts = [];
    if (breakdown.classes.length)      parts.push(`${breakdown.classes.length} class${breakdown.classes.length > 1 ? 'es' : ''}`);
    if (breakdown.attributes.length)   parts.push(`${breakdown.attributes.length} attr`);
    if (breakdown.pseudoClasses.length) parts.push(`${breakdown.pseudoClasses.length} pseudo`);
    rows.push({ label: 'Classes / Attr / Pseudo', val: c, detail: parts.join(', ') });
  }
  if (d > 0) {
    const parts = [];
    if (breakdown.elements.length)     parts.push(breakdown.elements.slice(0, 3).join(', '));
    if (breakdown.pseudoElements.length) parts.push(breakdown.pseudoElements.slice(0, 2).join(', '));
    rows.push({ label: 'Elements', val: d, detail: parts.join(', ') });
  }

  rows.push({ label: 'Numeric Score', val: spec.score, detail: 'For comparison (base-100)' });

  rows.forEach(row => {
    const item = el('div', { cls: 'bd-item' });
    const lbl  = el('div', { cls: 'bd-label', text: row.label });
    const val  = el('div', { cls: 'bd-val', text: String(row.val) });
    const det  = el('div', { cls: 'bd-detail', text: row.detail });
    append(item, lbl, val, det);
    container.appendChild(item);
  });
}

function renderWinner(cmp, spec1, spec2) {
  winnerLabel.textContent = cmp.label;
  winnerDetail.textContent = cmp.detail;
  whyBody.textContent = cmp.why;
  setVisible(whyBody, whyOpen);
}

// ── Why toggle ────────────────────────────────────────────────
function toggleWhy() {
  whyOpen = !whyOpen;
  setVisible(whyBody, whyOpen);
  whyToggle.textContent = '';
  // Rebuild with icon via DOM
  const icon = el('svg', { attrs: { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5' } });
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '12'); line.setAttribute('y1', '17'); line.setAttribute('x2', '12.01'); line.setAttribute('y2', '17');
  icon.appendChild(circle); icon.appendChild(path); icon.appendChild(line);
  whyToggle.appendChild(icon);
  whyToggle.appendChild(document.createTextNode(whyOpen ? 'Hide explanation' : 'Why does this selector win?'));
}

// ── Guide ─────────────────────────────────────────────────────
function toggleGuide() {
  guideOpen = !guideOpen;
  setVisible(guideBody, guideOpen);
  guideBtn.setAttribute('aria-expanded', String(guideOpen));
}

// ── Utilities ─────────────────────────────────────────────────
function clearAll() {
  sel1.value = ''; sel2.value = '';
  badge1.textContent = ''; badge1.classList.remove('visible');
  badge2.textContent = ''; badge2.classList.remove('visible');
  error1.textContent = ''; error2.textContent = '';
  sel1.classList.remove('is-error'); sel2.classList.remove('is-error');
  setVisible(results, false);
  currentResults = null;
  setStatus('ready', 'Ready — enter a CSS selector');
}

function loadExample() {
  const examples = [
    ['#header nav ul li a', 'body .container .nav a'],
    ['.btn-primary:hover', 'button[type="submit"]'],
    ['div.content > p:first-child', 'section p:first-of-type'],
    ['#app .card.active::before', '.card.active::before'],
    ['*', 'html body div'],
  ];
  const pair = examples[Math.floor(Math.random() * examples.length)];
  sel1.value = pair[0];
  sel2.value = pair[1];
  updateLiveBadge(sel1, badge1, error1, wrap1);
  updateLiveBadge(sel2, badge2, error2, wrap2);
  runCalculate();
}

async function copyResults() {
  if (!currentResults) { setStatus('error', 'Nothing to copy'); return; }

  const { spec1, spec2 } = currentResults;
  const lines = [
    'CSS Specificity Results',
    '=======================',
    '',
    `Selector 1: ${spec1.selector}`,
    `Specificity: (${spec1.specificity.join(',')})`,
    `Score: ${spec1.score}`,
  ];

  if (spec2) {
    lines.push('');
    lines.push(`Selector 2: ${spec2.selector}`);
    lines.push(`Specificity: (${spec2.specificity.join(',')})`);
    lines.push(`Score: ${spec2.score}`);
    lines.push('');
    const cmp = compare(spec1, spec2);
    lines.push(`Result: ${cmp.label}`);
    lines.push(`Reason: ${cmp.detail}`);
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copyBtn.textContent = 'Copied!';
    setStatus('success', 'Copied to clipboard');
    setTimeout(() => {
      copyBtn.textContent = '';
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      // Rebuild copy icon
      copyBtn.textContent = 'Copy';
      setStatus('ready', 'Ready');
    }, 1500);
  } catch {
    setStatus('error', 'Copy failed — try manually');
  }
}

function setStatus(type, message) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = message;
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

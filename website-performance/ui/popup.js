// ui/popup.js — PerfPro v3.1
// CSP-safe: zero innerHTML / eval; all DOM via helper el()
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let currentAnalysis = null;
let activeTab       = 'overview';
let isAnalyzing     = false;

// ─────────────────────────────────────────────────────────────────────────────
// DOM refs — resolved after DOMContentLoaded
// ─────────────────────────────────────────────────────────────────────────────
let analyzeBtn, resultEl, statusDot, statusText,
    exportJsonBtn, copyReportBtn, tabBtns,
    themeToggle, welcomeOverlay, welcomeGotIt;

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  analyzeBtn     = document.getElementById('analyzeBtn');
  resultEl       = document.getElementById('result');
  statusDot      = document.getElementById('statusDot');
  statusText     = document.getElementById('statusText');
  exportJsonBtn  = document.getElementById('exportJsonBtn');
  copyReportBtn  = document.getElementById('copyReportBtn');
  tabBtns        = document.querySelectorAll('.tab-btn');
  themeToggle    = document.getElementById('themeToggle');
  welcomeOverlay = document.getElementById('welcomeOverlay');
  welcomeGotIt   = document.getElementById('welcomeGotIt');

  // Restore saved theme
  const savedTheme = await StorageService.getTheme();
  setTheme(savedTheme || 'light');

  // Welcome overlay — first-run only
  const welcomed = await StorageService.getWelcomeShown();
  if (!welcomed) {
    welcomeOverlay.classList.remove('hidden');
    welcomeGotIt.addEventListener('click', async () => {
      welcomeOverlay.classList.add('fade-out');
      await StorageService.setWelcomeShown(true);
      setTimeout(() => welcomeOverlay.classList.add('hidden'), 300);
    });
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tab;
      if (t === activeTab) return;
      activeTab = t;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === t));
      if (currentAnalysis) renderTab(currentAnalysis, t);
    });
  });

  // Action buttons
  analyzeBtn.addEventListener('click', runAnalysis);
  exportJsonBtn.addEventListener('click', exportJSON);
  copyReportBtn.addEventListener('click', copyReport);
  themeToggle.addEventListener('click', toggleTheme);

  // Restore last analysis if the URL still matches
  const last = await StorageService.getLastAnalysis();
  if (last) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url === last.url) {
        currentAnalysis = last;
        renderTab(last, activeTab);
        setStatus('done', `Last scan: ${relativeTime(last.timestamp)}`);
      }
    } catch (_) { /* ignore — tab access may fail on internal pages */ }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  await StorageService.setTheme(next);
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────────────────────
async function runAnalysis() {
  if (isAnalyzing) return;
  isAnalyzing = true;

  try {
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('loading');
    setStatus('running', 'Analyzing page…');
    renderSkeleton();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found.');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   collectComprehensiveData          // function ref, not string — CSP-safe
    });

    if (!results?.[0]?.result) throw new Error('Page returned no data. Try refreshing the page first.');

    const data = results[0].result;
    if (data.error) throw new Error(data.error);

    data.recommendations = generateRecommendations(data);
    currentAnalysis = data;

    await StorageService.setLastAnalysis(data);

    // Always switch back to overview after a fresh scan
    activeTab = 'overview';
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === 'overview'));

    renderTab(data, 'overview');
    setStatus('done', 'Analysis complete');

  } catch (err) {
    const msg = err.message || 'Failed to analyze page';
    setStatus('error', msg);
    renderError(msg);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove('loading');
    isAnalyzing = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Render router
// ─────────────────────────────────────────────────────────────────────────────
function renderTab(data, tab) {
  if (!resultEl) return;
  clearNode(resultEl);
  const renderers = {
    overview:        () => renderOverview(data),
    resources:       () => renderResources(data),
    issues:          () => renderIssues(data),
    recommendations: () => renderRecommendations(data)
  };
  if (renderers[tab]) renderers[tab]();
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────
function renderOverview(data) {
  const frag = document.createDocumentFragment();
  const m    = data.metrics;

  frag.appendChild(buildScoreRing(data.score));

  const grid = el('div', { className: 'metrics-grid' });
  const kpis = [
    { label: 'Load Time',    value: fmtMs(m.loadTime),  cls: ratingClass(m.loadTime, [1000, 3000]) },
    { label: 'FCP',          value: fmtMs(m.fcp),        cls: ratingClass(m.fcp, [1800, 3000]) },
    { label: 'LCP',          value: fmtMs(m.lcp),        cls: ratingClass(m.lcp, [2500, 4000]) },
    { label: 'TTFB',         value: fmtMs(m.ttfb),       cls: ratingClass(m.ttfb, [200, 600]) },
    { label: 'CLS',          value: m.cls != null ? m.cls.toFixed(4) : 'N/A', cls: ratingClass(m.cls, [0.1, 0.25]) },
    { label: 'DOM Elements', value: m.domCount.toLocaleString(), cls: ratingClass(m.domCount, [800, 1500]) },
    { label: 'Requests',     value: m.requests.toLocaleString(), cls: ratingClass(m.requests, [50, 100]) },
    { label: 'Page Size',    value: fmtKB(m.transferKB), cls: ratingClass(m.transferKB, [1000, 3000]) }
  ];
  kpis.forEach(kpi => grid.appendChild(buildKpiCard(kpi)));
  frag.appendChild(grid);

  if (data.issues && data.issues.length) {
    const badge = el('div', { className: 'issues-badge' });
    badge.appendChild(el('span', { className: 'issues-badge-icon' }, '⚠'));
    badge.appendChild(el('span', {}, `${data.issues.length} issue${data.issues.length !== 1 ? 's' : ''} found — check Issues tab`));
    frag.appendChild(badge);
  }

  resultEl.appendChild(frag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resources tab
// ─────────────────────────────────────────────────────────────────────────────
function renderResources(data) {
  const frag  = document.createDocumentFragment();
  const bd    = data.breakdown;
  const total = data.metrics.transferKB;

  const rows = [
    { icon: '📜', label: 'JavaScript', ...bd.script },
    { icon: '🎨', label: 'CSS',        ...bd.stylesheet },
    { icon: '🖼', label: 'Images',     ...bd.image },
    { icon: '🔤', label: 'Fonts',      ...bd.font },
    { icon: '🌐', label: 'Fetch / XHR',...bd.fetch },
    { icon: '📦', label: 'Other',      ...bd.other }
  ];

  frag.appendChild(el('div', { className: 'section-label' }, 'Resource Breakdown'));

  rows.forEach(r => {
    const sizeKB = Math.round(r.size / 1024);
    const pct    = total ? Math.round((sizeKB / total) * 100) : 0;
    const row    = el('div', { className: 'resource-row' });

    const labelWrap = el('div', { className: 'resource-label' });
    labelWrap.appendChild(el('span', {}, r.icon + ' ' + r.label));
    labelWrap.appendChild(el('span', { className: 'resource-meta' },
      `${r.count} file${r.count !== 1 ? 's' : ''} · ${fmtKB(sizeKB)}`));
    row.appendChild(labelWrap);

    const barWrap = el('div', { className: 'resource-bar-wrap' });
    const bar     = el('div', { className: 'resource-bar' });
    bar.style.setProperty('--pct', pct + '%');
    barWrap.appendChild(bar);
    row.appendChild(barWrap);

    frag.appendChild(row);
  });

  if (data.heavyScripts && data.heavyScripts.length) {
    frag.appendChild(el('div', { className: 'section-label mt' }, '🔴 Heavy Scripts'));
    data.heavyScripts.forEach(s => {
      const item = el('div', { className: 'heavy-item' });
      item.appendChild(el('span', { className: 'heavy-name' }, s.url));
      item.appendChild(el('span', { className: 'heavy-size' }, s.size + ' KB'));
      frag.appendChild(item);
    });
  }

  if (data.heavyImages && data.heavyImages.length) {
    frag.appendChild(el('div', { className: 'section-label mt' }, '🟡 Heavy Images'));
    data.heavyImages.forEach(s => {
      const item = el('div', { className: 'heavy-item' });
      item.appendChild(el('span', { className: 'heavy-name' }, s.url));
      item.appendChild(el('span', { className: 'heavy-size' }, s.size + ' KB'));
      frag.appendChild(item);
    });
  }

  resultEl.appendChild(frag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Issues tab
// ─────────────────────────────────────────────────────────────────────────────
function renderIssues(data) {
  const frag = document.createDocumentFragment();

  if (!data.issues || data.issues.length === 0) {
    frag.appendChild(buildEmptyState('✅', 'No issues detected', 'Great work — this page is well optimised!'));
    resultEl.appendChild(frag);
    return;
  }

  data.issues.forEach(issue => {
    const row   = el('div', { className: `issue-row ${issue.severity}` });
    const dot   = el('span', { className: 'issue-dot' });
    const txt   = el('span', { className: 'issue-text' }, issue.text);
    const badge = el('span', { className: 'issue-badge' }, issue.severity);
    row.appendChild(dot);
    row.appendChild(txt);
    row.appendChild(badge);
    frag.appendChild(row);
  });

  // SEO audit section
  frag.appendChild(el('div', { className: 'section-label mt' }, 'SEO Audit'));

  const seoRows = [
    { label: 'Meta Description', val: data.seo.metaDescription
        ? `✅ ${data.seo.metaDescriptionLength} chars`
        : '❌ Missing' },
    { label: 'Viewport',  val: data.seo.metaViewport ? '✅ Present' : '❌ Missing' },
    { label: 'Canonical', val: data.seo.canonical    ? '✅ Present' : '⚠ Missing' },
    { label: 'H1 heading', val: data.seo.headings.h1 === 1
        ? '✅ Present'
        : data.seo.headings.h1 === 0 ? '❌ Missing' : `⚠ ${data.seo.headings.h1} found` },
    { label: 'Images alt', val: data.seo.imagesWithoutAlt === 0
        ? `✅ All ${data.metrics.images} have alt`
        : `⚠ ${data.seo.imagesWithoutAlt} missing` }
  ];

  seoRows.forEach(r => {
    const row = el('div', { className: 'seo-row' });
    row.appendChild(el('span', { className: 'seo-label' }, r.label));
    row.appendChild(el('span', { className: 'seo-val' }, r.val));
    frag.appendChild(row);
  });

  resultEl.appendChild(frag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations tab
// ─────────────────────────────────────────────────────────────────────────────
function renderRecommendations(data) {
  const frag = document.createDocumentFragment();
  const recs = data.recommendations || [];

  if (recs.length === 0) {
    frag.appendChild(buildEmptyState('🎉', 'No recommendations', 'This page is already well optimised!'));
    resultEl.appendChild(frag);
    return;
  }

  frag.appendChild(el('div', { className: 'rec-summary' },
    `${recs.length} recommendation${recs.length !== 1 ? 's' : ''} found`));

  recs.forEach(rec => {
    const card   = el('div', { className: `rec-card ${rec.severity}` });
    const header = el('div', { className: 'rec-header' });
    header.appendChild(el('span', { className: `rec-dot ${rec.severity}` }));
    header.appendChild(el('span', { className: 'rec-issue' }, rec.issue));
    header.appendChild(el('span', { className: 'rec-area' }, rec.area));
    card.appendChild(header);
    card.appendChild(el('div', { className: 'rec-fix' }, rec.fix));
    frag.appendChild(card);
  });

  resultEl.appendChild(frag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
function renderSkeleton() {
  clearNode(resultEl);
  const frag = document.createDocumentFragment();
  frag.appendChild(el('div', { className: 'skeleton-ring' }));
  const grid = el('div', { className: 'metrics-grid' });
  for (let i = 0; i < 8; i++) grid.appendChild(el('div', { className: 'skeleton-kpi' }));
  frag.appendChild(grid);
  resultEl.appendChild(frag);
}

function renderError(msg) {
  clearNode(resultEl);
  const wrap = el('div', { className: 'error-state' });
  wrap.appendChild(el('div', { className: 'error-icon' }, '✕'));
  wrap.appendChild(el('div', { className: 'error-msg' }, sanitize(msg || 'An error occurred')));
  wrap.appendChild(el('div', { className: 'error-hint' },
    'Make sure you\'re on a regular webpage, not a chrome:// or browser-internal page.'));
  resultEl.appendChild(wrap);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component builders
// ─────────────────────────────────────────────────────────────────────────────
function buildScoreRing(score) {
  const cls  = scoreClass(score);
  const C    = 163.4;                         // circumference for r=26
  const offset = C - (score / 100) * C;
  const NS   = 'http://www.w3.org/2000/svg';

  const wrap = el('div', { className: `score-block ${cls}` });

  // SVG ring — built via DOM API (CSP-safe)
  const svg  = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 58 58');
  svg.classList.add('score-svg');

  const bg   = document.createElementNS(NS, 'circle');
  bg.setAttribute('cx', '29'); bg.setAttribute('cy', '29'); bg.setAttribute('r', '26');
  bg.classList.add('ring-bg');

  const fill = document.createElementNS(NS, 'circle');
  fill.setAttribute('cx', '29'); fill.setAttribute('cy', '29'); fill.setAttribute('r', '26');
  fill.classList.add('ring-fill', cls);
  fill.setAttribute('stroke-dasharray', String(C));
  fill.setAttribute('stroke-dashoffset', offset.toFixed(1));

  svg.appendChild(bg);
  svg.appendChild(fill);

  const ringWrap = el('div', { className: 'score-ring' });
  ringWrap.appendChild(svg);

  const numWrap = el('div', { className: 'score-num-wrap' });
  numWrap.appendChild(el('span', { className: 'score-num' }, String(score)));
  ringWrap.appendChild(numWrap);
  wrap.appendChild(ringWrap);

  const meta  = el('div', { className: 'score-meta' });
  meta.appendChild(el('div', { className: 'score-title' }, 'Performance Score'));

  const gradeMap = { good: '✦ EXCELLENT', avg: '▲ NEEDS WORK', poor: '✕ POOR' };
  meta.appendChild(el('span', { className: `score-grade ${cls}` }, gradeMap[cls]));
  wrap.appendChild(meta);

  return wrap;
}

function buildKpiCard({ label, value, cls }) {
  const card = el('div', { className: `kpi-card ${cls || ''}` });
  card.appendChild(el('div', { className: 'kpi-value' }, value || 'N/A'));
  card.appendChild(el('div', { className: 'kpi-label' }, label));
  return card;
}

function buildEmptyState(icon, title, sub) {
  const wrap = el('div', { className: 'empty-state' });
  wrap.appendChild(el('div', { className: 'empty-icon' }, icon));
  wrap.appendChild(el('div', { className: 'empty-title' }, title));
  wrap.appendChild(el('div', { className: 'empty-sub' }, sub));
  return wrap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────────────────────
function setStatus(state, text) {
  if (statusDot)  statusDot.className   = `status-dot ${state}`;
  if (statusText) statusText.textContent = text || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Export / Copy
// ─────────────────────────────────────────────────────────────────────────────
function exportJSON() {
  if (!currentAnalysis) { setStatus('error', 'No data to export'); return; }
  try {
    const json = JSON.stringify(currentAnalysis, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = el('a');
    a.href     = url;
    a.download = `perfpro-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('done', 'Report exported');
  } catch (_) {
    setStatus('error', 'Export failed');
  }
}

function copyReport() {
  if (!currentAnalysis) { setStatus('error', 'No data to copy'); return; }
  const d = currentAnalysis;
  const m = d.metrics;

  const lines = [
    '══════════ PERFPRO ANALYSIS REPORT ══════════',
    `URL    : ${d.url}`,
    `Title  : ${d.title}`,
    `Score  : ${d.score}/100`,
    `Date   : ${new Date(d.timestamp).toLocaleString()}`,
    '',
    '── Core Metrics ──',
    `Load Time : ${fmtMs(m.loadTime)}`,
    `FCP       : ${fmtMs(m.fcp)}`,
    `LCP       : ${fmtMs(m.lcp)}`,
    `TTFB      : ${fmtMs(m.ttfb)}`,
    `CLS       : ${m.cls != null ? m.cls.toFixed(4) : 'N/A'}`,
    `DOM       : ${m.domCount.toLocaleString()} elements`,
    `Requests  : ${m.requests}`,
    `Page Size : ${fmtKB(m.transferKB)}`,
    ''
  ];

  if (d.recommendations && d.recommendations.length) {
    lines.push('── Recommendations ──');
    d.recommendations.forEach((r, i) => {
      lines.push(`${i + 1}. [${r.severity.toUpperCase()}] ${r.issue}`);
      lines.push(`   Fix: ${r.fix}`);
    });
  } else {
    lines.push('✅ No recommendations — page is well optimised!');
  }

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => setStatus('done', 'Report copied to clipboard'))
    .catch(() => setStatus('error', 'Clipboard access denied'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)   return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
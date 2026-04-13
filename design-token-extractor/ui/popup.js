/* =====================================================
   Design Token Extractor Pro v2.1 — popup.js
   CSP-clean: createElement / textContent only
   ===================================================== */
'use strict';

const CACHE_TTL_MS = 2 * 60 * 1000;
const LOADING_MESSAGES = [
  'Scanning stylesheets...',
  'Extracting colors...',
  'Analyzing typography...',
  'Computing WCAG...',
  'Building score...'
];

// ── DOM helpers ───────────────────────────────────────────────────────────────
function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v);
    }
  }
  if (children) {
    const arr = Array.isArray(children) ? children : [children];
    for (const c of arr) {
      if (c == null) continue;
      if (typeof c === 'string' || typeof c === 'number') {
        e.appendChild(document.createTextNode(String(c)));
      } else {
        e.appendChild(c);
      }
    }
  }
  return e;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 1900);
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1400);
    }
    showToast('Copied to clipboard');
  } catch (_) { showToast('Copy failed'); }
}

// ── Name helpers ──────────────────────────────────────────────────────────────
function spacingName(i) {
  return ['xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl'][i] || ('s' + (i + 1));
}

function scoreClass(n) {
  return n >= 80 ? 'good' : n >= 55 ? 'mid' : 'bad';
}

function ratioClass(level) {
  if (level === 'AAA') return 'aaa';
  if (level && level.includes('AA')) return 'aa';
  return 'fail';
}

// ── How It Works — token feature grid (CSP-safe, built in JS) ─────────────────
function buildTokenFeatureGrid() {
  const grid = document.getElementById('tokenFeatureGrid');
  if (!grid) return;

  const features = [
    {
      label: 'Colors',
      desc: 'Hex, usage, groups',
      color: '#2563EB',
      bg: '#EFF6FF',
      svgPath: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2a4 4 0 0 1 4 4H4a4 4 0 0 1 4-4z'
    },
    {
      label: 'Typography',
      desc: 'Family, size, weight',
      color: '#7C3AED',
      bg: '#F5F3FF',
      svgPath: 'M4 4h8M8 4v8M5 12h6'
    },
    {
      label: 'Spacing',
      desc: 'px + rem scale',
      color: '#059669',
      bg: '#ECFDF5',
      svgPath: 'M3 8h10M3 5v6M13 5v6'
    },
    {
      label: 'Shadows',
      desc: 'Elevation levels',
      color: '#D97706',
      bg: '#FFFBEB',
      svgPath: 'M4 10h8M4 13h6M4 7h10'
    },
    {
      label: 'WCAG',
      desc: 'AA / AAA contrast',
      color: '#DC2626',
      bg: '#FEF2F2',
      svgPath: 'M8 2l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 11l-3.7 2.5 1.4-4.3L2 6.5h4.5z'
    },
    {
      label: 'CSS Vars',
      desc: ':root custom props',
      color: '#0EA5E9',
      bg: '#F0F9FF',
      svgPath: 'M5 4l-3 4 3 4M11 4l3 4-3 4M8 3l-1 10'
    },
    {
      label: 'Components',
      desc: 'Buttons, cards, inputs',
      color: '#9333EA',
      bg: '#FAF5FF',
      svgPath: 'M3 6h10v6H3zM2 4h12'
    },
    {
      label: 'Responsive',
      desc: 'Media breakpoints',
      color: '#0F766E',
      bg: '#F0FDFA',
      svgPath: 'M2 10V6h12v4M6 14v-4M10 14v-4'
    }
  ];

  for (const f of features) {
    const card = el('div', { class: 'token-preview-card' });

    const icon = el('div', {
      class: 'token-preview-icon',
      style: `background:${f.bg};color:${f.color}`
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', f.color);
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.cssText = 'width:13px;height:13px;display:block';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', f.svgPath);
    svg.appendChild(path);
    icon.appendChild(svg);

    const text = el('div', { class: 'token-preview-text' });
    text.appendChild(el('strong', {}, f.label));
    text.appendChild(el('span', {}, f.desc));

    card.appendChild(icon);
    card.appendChild(text);
    grid.appendChild(card);
  }
}

// ── Export Engine ─────────────────────────────────────────────────────────────
function generateExport(tokens, format) {
  switch (format) {
    case 'css':      return exportCSS(tokens);
    case 'tailwind': return exportTailwind(tokens);
    case 'scss':     return exportSCSS(tokens);
    case 'figma':    return exportFigma(tokens);
    default:         return exportJSON(tokens);
  }
}

function exportCSS(t) {
  const L = [`/* Design Tokens — ${new Date().toLocaleDateString()} */`, '', ':root {'];
  if (t.colors?.length) {
    L.push('', '  /* Colors */');
    t.colors.forEach((c, i) => L.push(`  --color-${c.group || 'token'}-${i + 1}: ${c.hex};`));
  }
  if (t.spacing?.length) {
    L.push('', '  /* Spacing */');
    t.spacing.forEach((s, i) => L.push(`  --spacing-${spacingName(i)}: ${s.value};`));
  }
  if (t.typography?.length) {
    L.push('', '  /* Typography */');
    const fams = [...new Set(t.typography.map(x => x.family))];
    fams.forEach((f, i) => L.push(`  --font-family-${i + 1}: "${f}";`));
    t.typography.slice(0, 8).forEach((x, i) => L.push(`  --font-size-${i + 1}: ${x.size};`));
  }
  if (t.shadows?.length) {
    L.push('', '  /* Shadows */');
    t.shadows.forEach(s => L.push(`  --shadow-${s.label}: ${s.value};`));
  }
  L.push('}');
  return L.join('\n');
}

function exportTailwind(t) {
  const colors = {};
  const grouped = {};
  (t.colors || []).forEach(c => {
    const g = c.group || 'color';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  });
  Object.entries(grouped).forEach(([g, cols]) => {
    if (cols.length === 1) { colors[g] = cols[0].hex; }
    else { const s = {}; cols.forEach((c, i) => { s[(i + 1) * 100] = c.hex; }); colors[g] = s; }
  });
  const spacing = {};
  (t.spacing || []).forEach((s, i) => { spacing[spacingName(i)] = s.value; });
  const fontSize = {};
  (t.typography || []).slice(0, 8).forEach((x, i) => {
    fontSize['text-' + (i + 1)] = [x.size, { lineHeight: x.lineHeight }];
  });
  const fontFamily = {};
  [...new Set((t.typography || []).map(x => x.family))].forEach(f => {
    const k = f.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'sans';
    fontFamily[k] = [f, 'system-ui', 'sans-serif'];
  });
  const boxShadow = {};
  (t.shadows || []).forEach(s => { boxShadow[s.label] = s.value; });

  return [
    '/** @type {import(\'tailwindcss\').Config} */',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: ' + JSON.stringify(colors, null, 6).split('"').join("'") + ',',
    '      spacing: ' + JSON.stringify(spacing, null, 6).split('"').join("'") + ',',
    '      fontSize: ' + JSON.stringify(fontSize, null, 6).split('"').join("'") + ',',
    '      fontFamily: ' + JSON.stringify(fontFamily, null, 6).split('"').join("'") + ',',
    '      boxShadow: ' + JSON.stringify(boxShadow, null, 6).split('"').join("'") + ',',
    '    }',
    '  }',
    '}'
  ].join('\n');
}

function exportSCSS(t) {
  const L = ['// Design Tokens SCSS', '// Generated: ' + new Date().toLocaleDateString(), ''];
  if (t.colors?.length) {
    L.push('// Colors');
    t.colors.forEach((c, i) => L.push(`$color-${c.group || 'token'}-${i + 1}: ${c.hex};`));
    L.push('');
  }
  if (t.spacing?.length) {
    L.push('// Spacing');
    t.spacing.forEach((s, i) => L.push(`$spacing-${spacingName(i)}: ${s.value};`));
    L.push('');
  }
  if (t.typography?.length) {
    L.push('// Typography');
    t.typography.slice(0, 8).forEach((x, i) => {
      L.push(`$font-size-${i + 1}: ${x.size};`);
      L.push(`$font-weight-${i + 1}: ${x.weight};`);
    });
  }
  if (t.shadows?.length) {
    L.push('', '// Shadows');
    t.shadows.forEach(s => L.push(`$shadow-${s.label}: ${s.value};`));
  }
  return L.join('\n');
}

function exportFigma(t) {
  const global = {};
  if (t.colors?.length) {
    global.color = {};
    t.colors.forEach((c, i) => {
      global.color[`${c.group || 'color'}-${i + 1}`] = { type: 'color', value: c.hex };
    });
  }
  if (t.spacing?.length) {
    global.spacing = {};
    t.spacing.forEach((s, i) => {
      global.spacing[spacingName(i)] = { type: 'spacing', value: s.value };
    });
  }
  return JSON.stringify({ version: '1.0', tokenSets: { global } }, null, 2);
}

function exportJSON(t) {
  return JSON.stringify({
    name: 'Extracted Design System',
    version: '1.0.0',
    extractedAt: new Date().toISOString(),
    url: t._url || '',
    tokens: {
      colors: t.colors,
      typography: t.typography,
      spacing: t.spacing,
      shadows: t.shadows,
      cssVars: t.cssVars,
      gradients: t.gradients,
      components: t.components,
      responsive: t.responsive,
      designScore: t.designScore
    }
  }, null, 2);
}

// ── UI Renderers ──────────────────────────────────────────────────────────────

function emptyState(title, desc) {
  const d = el('div', { class: 'empty-state' });
  d.appendChild(el('b', {}, title));
  d.appendChild(document.createTextNode(desc));
  return d;
}

function sectionHeader(title, count) {
  const h = el('div', { class: 'section-header' });
  h.appendChild(el('span', { class: 'section-title' }, title));
  if (count !== undefined) h.appendChild(el('span', { class: 'section-count' }, String(count)));
  return h;
}

function scoreCardEl(val, label, cls) {
  const c = el('div', { class: 'score-card' });
  c.appendChild(el('div', { class: `score-num ${cls}` }, String(val)));
  c.appendChild(el('div', { class: 'score-label' }, label));
  return c;
}

// Colors
function renderColors(colors) {
  const wrap = document.getElementById('colorsContent');
  wrap.textContent = '';
  if (!colors?.length) { wrap.appendChild(emptyState('No colors found', 'Try a page with visible CSS styles.')); return; }

  const GROUP_COLORS = {
    primary: '#3B82F6', secondary: '#8B5CF6', success: '#10B981',
    warning: '#F59E0B', danger: '#EF4444', neutral: '#6B7280', other: '#9CA3AF'
  };
  const ORDER = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral', 'other'];
  const groups = {};
  colors.forEach(c => { const g = c.group || 'other'; if (!groups[g]) groups[g] = []; groups[g].push(c); });

  for (const gKey of ORDER) {
    if (!groups[gKey]?.length) continue;
    const section = el('div', { class: 'group-section' });
    const header = el('div', { class: 'group-label' });
    const dot = el('span', { class: 'group-dot', style: `background:${GROUP_COLORS[gKey] || '#9CA3AF'}` });
    header.appendChild(dot);
    header.appendChild(document.createTextNode(gKey.charAt(0).toUpperCase() + gKey.slice(1) + ` (${groups[gKey].length})`));
    section.appendChild(header);
    const grid = el('div', { class: 'colors-grid' });
    for (const c of groups[gKey]) {
      const card = el('div', { class: 'color-card', title: c.hex });
      const swatch = el('div', { class: 'color-swatch', style: `background:${c.hex}` });
      const info = el('div', { class: 'color-info' });
      info.appendChild(el('span', { class: 'color-hex' }, c.hex));
      info.appendChild(el('span', { class: `color-badge ${c.usage}` }, c.usage));
      card.appendChild(swatch);
      card.appendChild(info);
      card.addEventListener('click', () => copyText(c.hex));
      grid.appendChild(card);
    }
    section.appendChild(grid);
    wrap.appendChild(section);
  }
}

// Typography
function renderTypography(typo) {
  const wrap = document.getElementById('typographyContent');
  wrap.textContent = '';
  if (!typo?.length) { wrap.appendChild(emptyState('No typography found', 'No styled text elements detected.')); return; }
  wrap.appendChild(sectionHeader('Type Styles', typo.length));
  const list = el('div', { class: 'typo-list' });
  for (const t of typo) {
    const card = el('div', { class: 'typo-card' });
    const preview = el('div', { class: 'typo-preview-text', style: `font-family:${t.family}` }, 'Aa');
    const meta = el('div', { class: 'typo-meta' });
    meta.appendChild(el('div', { class: 'typo-family' }, t.family));
    const details = el('div', { class: 'typo-details' });
    details.appendChild(el('span', { class: 'typo-tag' }, t.size));
    details.appendChild(el('span', { class: 'typo-tag' }, 'w' + t.weight));
    details.appendChild(el('span', { class: 'typo-tag' }, 'lh ' + t.lineHeight));
    details.appendChild(el('span', { class: 'typo-tag' }, t.element));
    meta.appendChild(details);
    const cssVal = `font-family: "${t.family}"; font-size: ${t.size}; font-weight: ${t.weight}; line-height: ${t.lineHeight};`;
    const btn = el('button', { class: 'copy-btn', type: 'button' }, 'Copy CSS');
    btn.addEventListener('click', e => { e.stopPropagation(); copyText(cssVal, btn); });
    card.appendChild(preview);
    card.appendChild(meta);
    card.appendChild(btn);
    card.addEventListener('click', () => copyText(cssVal));
    list.appendChild(card);
  }
  wrap.appendChild(list);
}

// Spacing
function renderSpacing(spacing) {
  const wrap = document.getElementById('spacingContent');
  wrap.textContent = '';
  if (!spacing?.length) { wrap.appendChild(emptyState('No spacing found', 'No margin/padding/gap detected.')); return; }
  wrap.appendChild(sectionHeader('Spacing Scale', spacing.length));
  const list = el('div', { class: 'spacing-list' });
  spacing.forEach((s, i) => {
    const card = el('div', { class: 'spacing-card' });
    const visualW = Math.min(Math.max(parseFloat(s.value) * 0.75, 3), 78);
    const vWrap = el('div', { class: 'spacing-visual-wrap' });
    vWrap.appendChild(el('div', { class: 'spacing-visual', style: `width:${visualW}px` }));
    const vals = el('div', { class: 'spacing-values' });
    vals.appendChild(el('span', { class: 'spacing-px' }, s.value));
    vals.appendChild(el('span', { class: 'spacing-rem' }, s.rem));
    const cssVar = `--spacing-${spacingName(i)}: ${s.value};`;
    const btn = el('button', { class: 'copy-btn', type: 'button' }, 'Copy');
    btn.addEventListener('click', e => { e.stopPropagation(); copyText(cssVar, btn); });
    card.appendChild(vWrap);
    card.appendChild(vals);
    card.appendChild(btn);
    card.addEventListener('click', () => copyText(s.value));
    list.appendChild(card);
  });
  wrap.appendChild(list);
}

// Shadows
function renderShadows(shadows) {
  const wrap = document.getElementById('shadowsContent');
  wrap.textContent = '';
  if (!shadows?.length) { wrap.appendChild(emptyState('No shadows found', 'No box-shadow detected on this page.')); return; }
  wrap.appendChild(sectionHeader('Box Shadows', shadows.length));
  const list = el('div', { class: 'shadows-list' });
  for (const s of shadows) {
    const card = el('div', { class: 'shadow-card' });
    const preview = el('div', { class: 'shadow-preview', style: `box-shadow:${s.value}` });
    const info = el('div', { class: 'shadow-info' });
    const left = el('div', { class: 'shadow-info-left' });
    left.appendChild(el('span', { class: 'shadow-label' }, `Elevation ${s.elevation} — ${s.label}`));
    left.appendChild(el('span', { class: 'shadow-value' }, s.value));
    const cssVar = `--shadow-${s.label}: ${s.value};`;
    const btn = el('button', { class: 'copy-btn', type: 'button' }, 'Copy');
    btn.addEventListener('click', e => { e.stopPropagation(); copyText(cssVar, btn); });
    info.appendChild(left);
    info.appendChild(btn);
    card.appendChild(preview);
    card.appendChild(info);
    card.addEventListener('click', () => copyText(s.value));
    list.appendChild(card);
  }
  wrap.appendChild(list);
}

// WCAG
function renderWCAG(wcag) {
  const wrap = document.getElementById('wcagContent');
  wrap.textContent = '';
  if (!wcag?.length) { wrap.appendChild(emptyState('No WCAG data', 'No detectable text color pairs found.')); return; }

  const failing = wcag.filter(w => w.level === 'FAIL').length;
  const panel = el('div', { class: 'score-panel mb-12' });
  panel.appendChild(scoreCardEl(wcag.length - failing, 'Passing', scoreClass(Math.round((wcag.length - failing) / wcag.length * 100))));
  panel.appendChild(scoreCardEl(failing, 'Failing', failing > 0 ? 'bad' : 'good'));
  panel.appendChild(scoreCardEl(wcag.length, 'Total', 'good'));
  wrap.appendChild(panel);
  wrap.appendChild(sectionHeader('Contrast Pairs', wcag.length));

  const list = el('div', { class: 'wcag-list' });
  for (const w of wcag) {
    const sc = w.level === 'FAIL' ? 'fail' : w.level.includes('AA') ? 'pass' : 'warn';
    const card = el('div', { class: `wcag-card ${sc}` });
    const swatches = el('div', { class: 'wcag-swatches' });
    swatches.appendChild(el('div', { class: 'wcag-swatch', style: `background:${w.bg}` }));
    swatches.appendChild(el('div', { class: 'wcag-swatch', style: `background:${w.fg}` }));
    const meta = el('div', { class: 'wcag-meta' });
    meta.appendChild(el('div', { class: 'wcag-pair' }, `${w.fg} on ${w.bg}`));
    meta.appendChild(el('div', { class: 'wcag-sample' }, `${w.element} — ${w.sample || 'text'}`));
    const right = el('div', { class: 'wcag-right' });
    right.appendChild(el('span', { class: 'wcag-ratio' }, `${w.ratio}:1`));
    right.appendChild(el('span', { class: `wcag-badge ${ratioClass(w.level)}` }, w.level));
    card.appendChild(swatches);
    card.appendChild(meta);
    card.appendChild(right);
    list.appendChild(card);
  }
  wrap.appendChild(list);
}

// Components
function renderComponents(comps) {
  const wrap = document.getElementById('componentsContent');
  wrap.textContent = '';
  if (!comps?.length) { wrap.appendChild(emptyState('No components found', 'No buttons, cards, or inputs detected.')); return; }
  wrap.appendChild(sectionHeader('Detected Components', comps.length));
  const list = el('div', { class: 'component-list' });
  for (const c of comps) {
    const card = el('div', { class: 'component-card' });
    const header = el('div', { class: 'component-header' });
    header.appendChild(el('span', { class: 'component-type' }, c.type));
    header.appendChild(el('span', { class: 'component-label' }, c.label || ''));
    const props = el('div', { class: 'component-props' });
    if (c.padding && c.padding !== '0px') props.appendChild(el('span', { class: 'prop-tag' }, `pad: ${c.padding}`));
    if (c.borderRadius && c.borderRadius !== '0px') props.appendChild(el('span', { class: 'prop-tag' }, `r: ${c.borderRadius}`));
    if (c.fontSize) props.appendChild(el('span', { class: 'prop-tag' }, `fs: ${c.fontSize}`));
    if (c.fontWeight) props.appendChild(el('span', { class: 'prop-tag' }, `fw: ${c.fontWeight}`));
    if (c.bg) props.appendChild(el('span', { class: 'prop-tag' }, `bg: ${c.bg}`));
    card.appendChild(header);
    card.appendChild(props);
    list.appendChild(card);
  }
  wrap.appendChild(list);
}

// CSS Vars
function renderCSSVars(vars) {
  const wrap = document.getElementById('cssVarsContent');
  wrap.textContent = '';
  if (!vars?.length) { wrap.appendChild(emptyState('No CSS variables', 'No :root custom properties found.')); return; }
  wrap.appendChild(sectionHeader('CSS Custom Properties', vars.length));
  const list = el('div', { class: 'vars-list' });
  for (const v of vars) {
    const row = el('div', { class: 'var-row' });
    const isColor = /^#[0-9a-f]{3,8}$/i.test(v.value.trim()) || v.value.trim().startsWith('rgb');
    const dot = el('span', { class: 'var-color-dot' });
    if (isColor) dot.style.background = v.value.trim();
    row.appendChild(dot);
    row.appendChild(el('span', { class: 'var-name' }, v.name));
    row.appendChild(el('span', { class: 'var-value' }, v.value));
    row.addEventListener('click', () => copyText(`${v.name}: ${v.value};`));
    list.appendChild(row);
  }
  wrap.appendChild(list);
}

// Score
function renderScore(score, tokens) {
  const wrap = document.getElementById('scoreContent');
  wrap.textContent = '';
  if (!score) { wrap.appendChild(emptyState('No score yet', 'Scan a page to compute the design score.')); return; }

  const panel = el('div', { class: 'score-panel' });
  panel.appendChild(scoreCardEl(score.overall, 'Overall', scoreClass(score.overall)));
  panel.appendChild(scoreCardEl(score.consistency, 'Consistency', scoreClass(score.consistency)));
  panel.appendChild(scoreCardEl(score.accessibility, 'Accessibility', scoreClass(score.accessibility)));
  wrap.appendChild(panel);

  wrap.appendChild(el('div', { class: 'section-title mb-8' }, 'Breakdown'));

  const rows = [
    ['Colors', tokens?.colors?.length || 0, tokens?.colors?.length <= 20 ? 'Good palette size' : 'Consider reducing'],
    ['Font Styles', tokens?.typography?.length || 0, tokens?.typography?.length <= 8 ? 'Tight type scale' : 'Too many sizes'],
    ['Spacing Tokens', tokens?.spacing?.length || 0, 'Detected values'],
    ['CSS Variables', tokens?.cssVars?.length || 0, tokens?.cssVars?.length > 0 ? 'Token system in use' : 'No vars found'],
    ['Shadows', tokens?.shadows?.length || 0, 'Elevation levels'],
    ['WCAG Pairs', tokens?.wcag?.length || 0, 'Contrast checks']
  ];

  for (const [label, val, note] of rows) {
    const row = el('div', { class: 'breakdown-row' });
    row.appendChild(el('span', { class: 'breakdown-label' }, label));
    const valEl = el('span', { class: 'breakdown-val' }, String(val));
    valEl.style.color = val === 0 ? 'var(--muted)' : val > 20 ? 'var(--warning)' : 'var(--success)';
    row.appendChild(valEl);
    row.appendChild(el('span', { class: 'breakdown-note' }, note));
    wrap.appendChild(row);
  }
}

// ── Theme (Light/Dark) ────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (sun) sun.classList.toggle('hidden', dark);
  if (moon) moon.classList.toggle('hidden', !dark);
}

function loadTheme() {
  try {
    chrome.storage.local.get('dte_theme', r => {
      applyTheme(r.dte_theme === 'dark');
    });
  } catch (_) { applyTheme(false); }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(!isDark);
  try { chrome.storage.local.set({ dte_theme: next }); } catch (_) { }
  showToast((next === 'dark' ? 'Dark' : 'Light') + ' mode enabled');
}

// ── Export Selector Helper (CSP-safe) ─────────────────────────────────────────
function initExportSelector() {
  const trigger = document.getElementById('formatSelectTrigger');
  const menu = document.getElementById('formatSelectMenu');
  const valueSpan = document.getElementById('formatSelectValue');
  const hiddenSelect = document.getElementById('exportFormat');
  const selector = document.getElementById('exportFormatSelector');
  
  if (!trigger || !menu || !valueSpan || !hiddenSelect || !selector) return;
  
  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!selector.contains(e.target)) {
      selector.classList.remove('open');
      document.removeEventListener('click', closeMenu);
    }
  };
  
  // Toggle menu on trigger click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = selector.classList.contains('open');
    selector.classList.toggle('open', !isOpen);
    
    if (!isOpen) {
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    }
  });
  
  // Handle option selection
  const options = menu.querySelectorAll('.format-option');
  options.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = opt.dataset.format;
      const label = opt.textContent;
      
      // Update the hidden select
      hiddenSelect.value = format;
      
      // Update the trigger display
      valueSpan.textContent = label;
      
      // Update selected class on options
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Close the menu
      selector.classList.remove('open');
      document.removeEventListener('click', closeMenu);
      
      // Trigger change event on hidden select
      const changeEvent = new Event('change', { bubbles: true });
      hiddenSelect.dispatchEvent(changeEvent);
    });
  });
  
  // Set initial selected option
  const initialFormat = hiddenSelect.value;
  const initialOption = Array.from(options).find(opt => opt.dataset.format === initialFormat);
  if (initialOption) {
    initialOption.classList.add('selected');
    valueSpan.textContent = initialOption.textContent;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
class App {
  constructor() {
    this._tokens     = null;
    this._inspect    = false;
    this._activeTab  = 'colors';
    this._version = chrome?.runtime?.getManifest?.().version || '0.0.0';

    this.howtoScreen   = document.getElementById('howtoScreen');
    this.loadingScreen = document.getElementById('loadingScreen');
    this.resultsScreen = document.getElementById('resultsScreen');
    this.loadingText   = document.getElementById('loadingText');
    this.headerSub     = document.getElementById('headerSub');

    this.scanBtn           = document.getElementById('scanBtn');
    this.rescanBtn         = document.getElementById('rescanBtn');
    this.inspectBtn        = document.getElementById('inspectBtn');
    this.inspectBadge      = document.getElementById('inspectBadge');
    this.themeBtn          = document.getElementById('themeBtn');
    this.exportFormat      = document.getElementById('exportFormat');
    this.copyExportBtn     = document.getElementById('copyExportBtn');
    this.downloadExportBtn = document.getElementById('downloadExportBtn');

    this._setHeaderSub();
    loadTheme();
    buildTokenFeatureGrid();
    initExportSelector();  // Initialize the custom export selector
    this._bind();
    this._tryCache();
  }

  _setHeaderSub(host, cached = false) {
    if (!this.headerSub) return;
    const suffix = `v${this._version}`;
    if (!host) {
      this.headerSub.textContent = `Pro - ${suffix}`;
      return;
    }
    this.headerSub.textContent = cached ? `${host} (cached) - ${suffix}` : `${host} - ${suffix}`;
  }

  _bind() {
    this.scanBtn.addEventListener('click', () => this._scan());
    this.rescanBtn.addEventListener('click', () => this._scan());
    this.inspectBtn.addEventListener('click', () => this._toggleInspect());
    this.themeBtn.addEventListener('click', () => toggleTheme());
    this.copyExportBtn.addEventListener('click', () => this._copyExport());
    this.downloadExportBtn.addEventListener('click', () => this._downloadExport());
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
  }

  async _tryCache() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const r = await chrome.storage.local.get(`dte_tokens_${tab.id}`);
      const cached = r[`dte_tokens_${tab.id}`];
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        this._tokens = cached.data;
        this._renderResults(cached.data);
        this._setHeaderSub(new URL(cached.data._url || 'https://cached').hostname, true);
      }
    } catch (_) { }
  }

  _showScreen(name) {
    this.howtoScreen.classList.toggle('hidden', name !== 'howto');
    this.loadingScreen.classList.toggle('hidden', name !== 'loading');
    this.resultsScreen.classList.toggle('hidden', name !== 'results');
    this.rescanBtn.classList.toggle('hidden', name !== 'results');
  }

  async _scan() {
    this._showScreen('loading');
    this.loadingText.textContent = 'Connecting...';

    let mi = 0;
    const timer = setInterval(() => {
      mi = (mi + 1) % LOADING_MESSAGES.length;
      this.loadingText.textContent = LOADING_MESSAGES[mi];
    }, 600);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^https?:/i.test(tab.url || '')) {
        throw new Error('Open a normal http/https page first.');
      }

      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'extractTokens' });
      } catch (_) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        response = await chrome.tabs.sendMessage(tab.id, { action: 'extractTokens' });
      }

      clearInterval(timer);
      if (!response?.success) throw new Error(response?.error || 'Extraction failed.');

      const tokens = response.tokens;
      tokens._url = tab.url;
      this._tokens = tokens;

      try {
        const key = `dte_tokens_${tab.id}`;
        await chrome.storage.local.set({ [key]: { data: tokens, ts: Date.now() } });
      } catch (_) { }

      this._setHeaderSub(new URL(tab.url).hostname);
      this._renderResults(tokens);
    } catch (err) {
      clearInterval(timer);
      this._showScreen('howto');
      showToast('Error: ' + err.message);
    }
  }

  _renderResults(tokens) {
    document.getElementById('statColors').textContent  = tokens.colors?.length  || 0;
    document.getElementById('statSpacing').textContent = tokens.spacing?.length || 0;
    document.getElementById('statFonts').textContent   = tokens.typography?.length || 0;
    document.getElementById('statShadows').textContent = tokens.shadows?.length || 0;
    document.getElementById('statScore').textContent   = tokens.designScore?.overall ?? '—';

    renderColors(tokens.colors);
    renderTypography(tokens.typography);
    renderSpacing(tokens.spacing);
    renderShadows(tokens.shadows);
    renderWCAG(tokens.wcag);
    renderComponents(tokens.components);
    renderCSSVars(tokens.cssVars);
    renderScore(tokens.designScore, tokens);

    this._showScreen('results');
    this._switchTab(this._activeTab);
  }

  _switchTab(name) {
    this._activeTab = name;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const active = btn.dataset.tab === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${name}`);
    });
  }

  async _toggleInspect() {
    this._inspect = !this._inspect;
    this.inspectBtn.classList.toggle('active', this._inspect);
    this.inspectBadge.classList.toggle('visible', this._inspect);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No tab');
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspect', enabled: this._inspect });
      } catch (_) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspect', enabled: this._inspect });
      }
      showToast(this._inspect ? 'Inspect ON — hover elements' : 'Inspect OFF');
    } catch (_) {
      this._inspect = false;
      this.inspectBtn.classList.remove('active');
      this.inspectBadge.classList.remove('visible');
      showToast('Cannot inspect this page');
    }
  }

  _copyExport() {
    if (!this._tokens) { showToast('Scan a page first'); return; }
    const content = generateExport(this._tokens, this.exportFormat.value);
    copyText(content, this.copyExportBtn);
  }

  _downloadExport() {
    if (!this._tokens) { showToast('Scan a page first'); return; }
    const fmt = this.exportFormat.value;
    const ext = fmt === 'tailwind' ? 'js' : fmt === 'json' || fmt === 'figma' ? 'json' : fmt;
    const content = generateExport(this._tokens, fmt);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-tokens.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded design-tokens.${ext}`);
  }
}

document.addEventListener('DOMContentLoaded', () => { new App(); });
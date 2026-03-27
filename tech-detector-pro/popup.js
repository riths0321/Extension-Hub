// Tech Detector Pro v2.0 — Popup Script
'use strict';

let currentTechData = null;
let scanHistory = [];
let currentTheme = 'light';
let activeCategory = 'all';
let searchQuery = '';

// ─── Category config ───
const CAT_META = {
  frontend:   { label: 'Frontend',   icon: '🎨', dot: 'cat-dot-frontend' },
  backend:    { label: 'Backend',    icon: '⚙️',  dot: 'cat-dot-backend' },
  cms:        { label: 'CMS',        icon: '📝',  dot: 'cat-dot-cms' },
  analytics:  { label: 'Analytics',  icon: '📊',  dot: 'cat-dot-analytics' },
  hosting:    { label: 'Hosting',    icon: '☁️',  dot: 'cat-dot-hosting' },
  libraries:  { label: 'Libraries',  icon: '📚',  dot: 'cat-dot-libraries' },
  payment:    { label: 'Payment',    icon: '💳',  dot: 'cat-dot-payment' },
  build_tools:{ label: 'Build Tools',icon: '📦',  dot: 'cat-dot-build_tools' },
  other:      { label: 'Other',      icon: '🔧',  dot: 'cat-dot-other' },
};

// ─── Tech doc links map ───
const TECH_LINKS = {
  // Frontend frameworks
  react:        'https://react.dev',
  vue:          'https://vuejs.org',
  angular:      'https://angular.io',
  svelte:       'https://svelte.dev',
  nextjs:       'https://nextjs.org',
  'next.js':    'https://nextjs.org',
  nuxt:         'https://nuxt.com',
  gatsby:       'https://www.gatsbyjs.com',
  remix:        'https://remix.run',
  astro:        'https://astro.build',
  solid:        'https://www.solidjs.com',
  ember:        'https://emberjs.com',
  backbone:     'https://backbonejs.org',
  alpine:       'https://alpinejs.dev',
  htmx:         'https://htmx.org',
  // CSS / UI
  bootstrap:    'https://getbootstrap.com',
  tailwind:     'https://tailwindcss.com',
  bulma:        'https://bulma.io',
  foundation:   'https://get.foundation',
  materialui:   'https://mui.com',
  chakra:       'https://chakra-ui.com',
  shadcn:       'https://ui.shadcn.com',
  // Libraries
  jquery:       'https://jquery.com',
  lodash:       'https://lodash.com',
  axios:        'https://axios-http.com',
  moment:       'https://momentjs.com',
  dayjs:        'https://day.js.org',
  d3:           'https://d3js.org',
  three:        'https://threejs.org',
  gsap:         'https://greensock.com/gsap',
  // Backend
  nodejs:       'https://nodejs.org',
  'node.js':    'https://nodejs.org',
  express:      'https://expressjs.com',
  fastify:      'https://fastify.dev',
  django:       'https://www.djangoproject.com',
  flask:        'https://flask.palletsprojects.com',
  rails:        'https://rubyonrails.org',
  laravel:      'https://laravel.com',
  symfony:      'https://symfony.com',
  spring:       'https://spring.io',
  fastapi:      'https://fastapi.tiangolo.com',
  // CMS
  wordpress:    'https://wordpress.org',
  shopify:      'https://shopify.com',
  drupal:       'https://drupal.org',
  joomla:       'https://joomla.org',
  magento:      'https://magento.com',
  ghost:        'https://ghost.org',
  contentful:   'https://www.contentful.com',
  strapi:       'https://strapi.io',
  sanity:       'https://www.sanity.io',
  wix:          'https://www.wix.com',
  webflow:      'https://webflow.com',
  squarespace:  'https://squarespace.com',
  // Hosting/Infra
  nginx:        'https://nginx.org',
  apache:       'https://httpd.apache.org',
  cloudflare:   'https://cloudflare.com',
  vercel:       'https://vercel.com',
  netlify:      'https://netlify.com',
  aws:          'https://aws.amazon.com',
  azure:        'https://azure.microsoft.com',
  gcp:          'https://cloud.google.com',
  heroku:       'https://heroku.com',
  // Analytics
  ga4:          'https://analytics.google.com',
  'google analytics': 'https://analytics.google.com',
  gtm:          'https://tagmanager.google.com',
  'google tag': 'https://tagmanager.google.com',
  mixpanel:     'https://mixpanel.com',
  amplitude:    'https://amplitude.com',
  hotjar:       'https://hotjar.com',
  segment:      'https://segment.com',
  plausible:    'https://plausible.io',
  heap:         'https://heap.io',
  // Payment
  stripe:       'https://stripe.com',
  paypal:       'https://paypal.com',
  braintree:    'https://braintreepayments.com',
  // Build
  webpack:      'https://webpack.js.org',
  vite:         'https://vitejs.dev',
  rollup:       'https://rollupjs.org',
  parcel:       'https://parceljs.org',
  esbuild:      'https://esbuild.github.io',
  turbo:        'https://turbo.build',
  // Lang
  typescript:   'https://typescriptlang.org',
  graphql:      'https://graphql.org',
};

function getTechLink(tech) {
  const id   = (tech.id   || '').toLowerCase().replace(/[_\-]/g, '');
  const name = (tech.name || '').toLowerCase();
  // Exact name match first
  if (TECH_LINKS[name]) return TECH_LINKS[name];
  // Partial key match
  for (const [key, url] of Object.entries(TECH_LINKS)) {
    const k = key.toLowerCase();
    if (id.includes(k.replace(/[.\-\s]/g,'')) || name.includes(k)) return url;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(tech.name + ' documentation')}`;
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  initialize();
});

async function initialize() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) { setUrl('No URL'); return; }
    setUrl(tab.url);
    loadFavicon(tab.url);
  } catch (e) { setUrl('Error: ' + e.message); }

  try {
    const { scanHistory: h } = await chrome.storage.local.get(['scanHistory']);
    if (h) { scanHistory = h; renderHistory(); }
  } catch (e) { /* ignore */ }

  setupListeners();

  try {
    const { autoScan } = await chrome.storage.sync.get(['autoScan']);
    if (autoScan) startScan();
  } catch (e) { /* ignore */ }
}

function setUrl(url) {
  const el = document.getElementById('currentUrl');
  try {
    const u = new URL(url);
    el.textContent = u.hostname || url;
  } catch { el.textContent = url; }
}

function loadFavicon(url) {
  try {
    const { origin } = new URL(url);
    const img = document.createElement('img');
    img.onload = () => {
      const wrap = document.getElementById('siteFavicon');
      wrap.replaceChildren(img);
    };
    img.onerror = () => {}; // keep SVG fallback
    img.src = `${origin}/favicon.ico`;
    img.width = 20; img.height = 20;
  } catch {}
}

// ─── Theme ───
function loadTheme() {
  try {
    chrome.storage.local.get(['theme'], ({ theme }) => {
      applyTheme(theme || 'light');
    });
  } catch { applyTheme('light'); }
}

function applyTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.body.setAttribute('data-theme', t);
  const sun  = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (sun && moon) {
    sun.hidden = t !== 'light';
    moon.hidden = t !== 'dark';
  }
}

function toggleTheme() {
  const next = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { chrome.storage.local.set({ theme: next }); } catch {}
}

// ─── Event listeners ───
function setupListeners() {
  document.getElementById('scanBtn').addEventListener('click', startScan);
  document.getElementById('rescanBtn').addEventListener('click', startScan);
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  document.getElementById('copyBtn').addEventListener('click', copyReport);
  document.getElementById('downloadBtn').addEventListener('click', downloadReport);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderTechList();
    });
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.hidden = !searchQuery;
    renderTechList();
  });

  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      input.value = '';
      searchQuery = '';
      clearBtn.hidden = true;
      input.focus();
      renderTechList();
    });
  }
}

// ─── Scan ───
async function startScan() {
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnLabel = document.getElementById('scanBtnLabel');
  scanBtn.classList.add('scanning');
  if (scanBtnLabel) scanBtnLabel.textContent = 'Scanning...';
  showLoading(true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found');
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))
      throw new Error('Cannot scan Chrome internal pages');

    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch {}

    await waitForContentScript(tab.id);

    animateLoader();

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_TECHNOLOGIES' });

    if (response?.success && response?.data) {
      currentTechData = response.data;
      displayResults(response.data);
      saveToHistory(tab.url, response.data);
    } else {
      throw new Error(response?.message || 'Detection failed');
    }
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    showLoading(false);
    scanBtn.classList.remove('scanning');
    if (scanBtnLabel) scanBtnLabel.textContent = 'Scan Technologies';
  }
}

async function waitForContentScript(tabId, attempts = 8, delayMs = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error('Content script not responding. Please refresh the page.');
}

function animateLoader() {
  const bar = document.getElementById('loaderBar');
  if (!bar) return;
  let w = 0;
  const t = setInterval(() => {
    w = Math.min(w + Math.random() * 18, 85);
    bar.style.width = w + '%';
    if (w >= 85) clearInterval(t);
  }, 150);
  // store ref to finish on complete
  bar._timer = t;
}

function finishLoader() {
  const bar = document.getElementById('loaderBar');
  if (!bar) return;
  clearInterval(bar._timer);
  bar.style.width = '100%';
  setTimeout(() => { if (bar) bar.style.width = '0%'; }, 400);
}

// ─── Display ───
function displayResults(data) {
  finishLoader();
  document.getElementById('results').hidden = false;

  if (!data?.technologies) { document.getElementById('techCount').textContent = '0'; return; }

  const total = Object.values(data.technologies)
    .filter(Array.isArray).reduce((s, a) => s + a.length, 0);
  document.getElementById('techCount').textContent = total;

  const subtitle = document.getElementById('resultsSubtitle');
  if (subtitle) {
    try {
      const hostname = new URL(data.url).hostname;
      subtitle.textContent = `Found ${total} ${total === 1 ? 'technology' : 'technologies'} powering ${hostname}`;
    } catch {
      subtitle.textContent = `Found ${total} ${total === 1 ? 'technology' : 'technologies'}`;
    }
  }

  renderTechList();
}

function flattenTechs(technologies) {
  const all = [];
  Object.entries(technologies).forEach(([cat, arr]) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(t => {
      const tech = typeof t === 'string'
        ? { id: t, name: t, category: cat, version: null, confidence: 'high' }
        : { ...t, category: cat };
      all.push(tech);
    });
  });
  return all;
}

function renderTechList() {
  const techList = document.getElementById('techList');
  techList.replaceChildren();

  if (!currentTechData?.technologies) {
    techList.appendChild(emptyState('No scan results yet. Click Scan Technologies.'));
    return;
  }

  const all = flattenTechs(currentTechData.technologies);

  // Filter
  let filtered = all.filter(t => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery) ||
      (t.category || '').toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    techList.appendChild(emptyState('No technologies match your filter.'));
    return;
  }

  if (activeCategory === 'all') {
    // Group by category
    const groups = {};
    filtered.forEach(t => {
      const c = t.category || 'other';
      if (!groups[c]) groups[c] = [];
      groups[c].push(t);
    });

    Object.entries(groups).forEach(([cat, techs], i) => {
      // Group header
      const header = buildGroupHeader(cat, techs.length);
      techList.appendChild(header);
      techs.forEach(tech => {
        const el = buildTechItem(tech);
        techList.appendChild(el);
      });
    });
  } else {
    filtered.forEach(tech => {
      const el = buildTechItem(tech);
      techList.appendChild(el);
    });
  }
}

function buildGroupHeader(cat, count) {
  const meta = CAT_META[cat] || { label: cap(cat), icon: '🔧', dot: 'cat-dot-other' };
  const div = document.createElement('div');
  div.className = 'cat-group-header';

  const dot = document.createElement('div');
  dot.className = 'cat-group-dot ' + meta.dot;

  const name = document.createElement('span');
  name.className = 'cat-group-name';
  name.textContent = meta.label;

  const cnt = document.createElement('span');
  cnt.className = 'cat-group-count';
  cnt.textContent = count;

  div.appendChild(dot); div.appendChild(name); div.appendChild(cnt);
  return div;
}

function buildTechItem(tech) {
  const meta = CAT_META[tech.category] || { icon: '🔧' };
  const docUrl = getTechLink(tech);

  const item = document.createElement('div');
  item.className = 'tech-item';
  item.dataset.category = tech.category;
  item.title = `Open ${tech.name} documentation`;

  // Icon
  const iconWrap = document.createElement('div');
  iconWrap.className = 'tech-icon-wrap';
  iconWrap.textContent = meta.icon || '🔧';

  // Main
  const main = document.createElement('div');
  main.className = 'tech-main';

  // Name row
  const nameDiv = document.createElement('div');
  nameDiv.className = 'tech-name';

  const nameLink = document.createElement('a');
  nameLink.className = 'tech-name-link';
  nameLink.textContent = tech.name;
  nameLink.href = docUrl;
  nameLink.target = '_blank';
  nameLink.rel = 'noopener noreferrer';
  nameLink.addEventListener('click', e => e.stopPropagation());
  nameDiv.appendChild(nameLink);

  // Meta row
  const metaDiv = document.createElement('div');
  metaDiv.className = 'tech-meta';

  const catTag = document.createElement('span');
  catTag.className = 'tech-cat-tag';
  catTag.textContent = cap(tech.category || 'other');
  metaDiv.appendChild(catTag);

  if (tech.version) {
    const sep = document.createElement('span');
    sep.className = 'tech-separator';
    sep.textContent = '·';
    metaDiv.appendChild(sep);
    const ver = document.createElement('span');
    ver.className = 'tech-version';
    ver.textContent = 'v' + tech.version;
    metaDiv.appendChild(ver);
  }

  if (tech.confidence) {
    const confClass = {high:'tech-conf-high', medium:'tech-conf-medium', low:'tech-conf-low'}[tech.confidence] || 'tech-conf-high';
    const conf = document.createElement('span');
    conf.className = 'tech-conf ' + confClass;
    const pct = tech.confidence === 'high' ? '95%' : tech.confidence === 'medium' ? '70%' : '40%';
    conf.textContent = pct;
    conf.title = 'Confidence: ' + tech.confidence;
    metaDiv.appendChild(conf);
  }

  main.appendChild(nameDiv);
  main.appendChild(metaDiv);

  // Ext link icon (built via DOM — no innerHTML for CSP compliance)
  const extIcon = document.createElement('div');
  extIcon.className = 'tech-link-icon';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  const p1 = document.createElementNS(svgNS, 'path');
  p1.setAttribute('d', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6');
  const pl = document.createElementNS(svgNS, 'polyline');
  pl.setAttribute('points', '15 3 21 3 21 9');
  const ln = document.createElementNS(svgNS, 'line');
  ln.setAttribute('x1','10'); ln.setAttribute('y1','14'); ln.setAttribute('x2','21'); ln.setAttribute('y2','3');
  svg.appendChild(p1); svg.appendChild(pl); svg.appendChild(ln);
  extIcon.appendChild(svg);

  item.appendChild(iconWrap);
  item.appendChild(main);
  item.appendChild(extIcon);

  item.addEventListener('click', () => {
    chrome.tabs.create({ url: docUrl });
  });

  return item;
}

function emptyState(text, hint) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  const icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.textContent = '🔍';
  const t = document.createElement('div');
  t.className = 'empty-text';
  t.textContent = text;
  div.appendChild(icon); div.appendChild(t);
  if (hint) {
    const h = document.createElement('div');
    h.className = 'empty-hint'; h.textContent = hint;
    div.appendChild(h);
  }
  return div;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : s; }

// ─── Loading ───
function showLoading(show) {
  const loading = document.getElementById('loading');
  const scanBtn = document.getElementById('scanBtn');
  const results = document.getElementById('results');

  if (show) {
    loading.hidden = false;
    scanBtn.disabled = true;
    results.hidden = true;
    // Reset loader bar
    const bar = document.getElementById('loaderBar');
    if (bar) { clearInterval(bar._timer); bar.style.width = '0%'; }
  } else {
    loading.hidden = true;
    scanBtn.disabled = false;
  }
}

// ─── History ───
async function saveToHistory(url, data) {
  try {
    const techs = data.technologies || {};
    const entry = {
      url,
      hostname: (() => { try { return new URL(url).hostname; } catch { return url; } })(),
      timestamp: new Date().toISOString(),
      techCount: Object.values(techs).filter(Array.isArray).reduce((s,a) => s+a.length, 0),
      categories: Object.keys(techs).filter(k => techs[k]?.length > 0)
    };
    scanHistory.unshift(entry);
    if (scanHistory.length > 5) scanHistory = scanHistory.slice(0, 5);
    await chrome.storage.local.set({ scanHistory });
    renderHistory();
  } catch {}
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.replaceChildren();

  if (!scanHistory.length) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    const icon = document.createElement('div'); icon.className = 'empty-icon'; icon.textContent = '🕐';
    const text = document.createElement('div'); text.className = 'empty-text'; text.textContent = 'No scan history yet';
    div.appendChild(icon); div.appendChild(text); list.appendChild(div);
    return;
  }

  scanHistory.slice(0, 5).forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const fav = document.createElement('div');
    fav.className = 'history-favicon';
    const img = document.createElement('img');
    img.width = 14; img.height = 14;
    img.onerror = () => { fav.textContent = '🌐'; };
    try { img.src = new URL(entry.url).origin + '/favicon.ico'; } catch { fav.textContent = '🌐'; }
    fav.appendChild(img);

    const main = document.createElement('div');
    main.className = 'history-main';

    const urlDiv = document.createElement('div');
    urlDiv.className = 'history-url';
    urlDiv.textContent = entry.hostname || entry.url;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'history-meta';
    metaDiv.textContent = timeAgo(new Date(entry.timestamp));

    main.appendChild(urlDiv); main.appendChild(metaDiv);

    const cnt = document.createElement('div');
    cnt.className = 'history-count';
    cnt.textContent = entry.techCount + ' techs';

    item.appendChild(fav); item.appendChild(main); item.appendChild(cnt);
    item.addEventListener('click', () => loadHistoryDetail(entry));
    list.appendChild(item);
  });
}

function loadHistoryDetail(entry) {
  const cats = (entry.categories || []).map(c => (CAT_META[c]?.label || c)).join(', ');
  showToast(`${entry.hostname} — ${entry.techCount} techs (${cats || 'none'})`, 'success');
}

async function clearHistory() {
  scanHistory = [];
  try { await chrome.storage.local.set({ scanHistory: [] }); } catch {}
  renderHistory();
  showToast('History cleared', 'success');
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// ─── Export ───
async function copyReport() {
  if (!currentTechData) { showToast('No scan results to copy', 'error'); return; }
  const text = buildReportText(currentTechData);
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Report copied to clipboard!', 'success');
  } catch { showToast('Failed to copy report', 'error'); }
}

async function downloadReport() {
  if (!currentTechData) { showToast('No scan results to download', 'error'); return; }
  const data = { ...currentTechData, exportedAt: new Date().toISOString(), tool: 'Tech Detector Pro v2.0' };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `tech-report-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 JSON report downloaded!', 'success');
}

function buildReportText(data) {
  let t = `TECH DETECTOR PRO v2.0 REPORT\n${'='.repeat(40)}\n`;
  t += `URL: ${data.url}\nScanned: ${new Date().toLocaleString()}\n\n`;
  const techs = data.technologies || {};
  const total = Object.values(techs).filter(Array.isArray).reduce((s,a)=>s+a.length,0);
  t += `Total Technologies: ${total}\n\n`;
  Object.entries(techs).forEach(([cat, arr]) => {
    if (!Array.isArray(arr) || !arr.length) return;
    t += `${cat.toUpperCase()} (${arr.length}):\n`;
    arr.forEach(tech => {
      const name = typeof tech === 'string' ? tech : tech.name;
      const ver  = typeof tech === 'string' ? null : tech.version;
      const conf = typeof tech === 'string' ? null : tech.confidence;
      t += `  • ${name}${ver ? ' v'+ver : ''}${conf ? ' ['+conf+']' : ''}\n`;
    });
    t += '\n';
  });
  t += `${'='.repeat(40)}\nGenerated by Tech Detector Pro v2.0`;
  return t;
}

// ─── Toast ───
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

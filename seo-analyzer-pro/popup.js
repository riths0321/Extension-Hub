'use strict';

let currentReport = null;
const sectionState = {
  summaryHeader: '',
  summary: '',
  headers: '',
  images: '',
  links: '',
  social: '',
  tools: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    initTabs();
    initButtons();
    await initTheme();
  } catch (err) {
    console.error('Popup init failed:', err);
  }
});

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.remove('hidden');
    });
  });
}

function initButtons() {
  bindClick('analyzeBtn', analyzePage);
  bindClick('exportJsonBtn', exportJson);
  bindClick('exportTxtBtn', exportTxt);
  bindClick('historyBtn', openHistory);
  bindClick('closeHistory', closeHistory);
  bindClick('clearHistoryBtn', clearHistory);

  const themeToggle = $('themeToggle');
  if (!themeToggle) return;
  themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(theme);
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ seoAnalyzerTheme: theme });
    }
  });
}

async function initTheme() {
  if (!chrome?.storage?.local) {
    applyTheme('light');
    return;
  }
  const theme = await new Promise(resolve => {
    chrome.storage.local.get(['seoAnalyzerTheme'], res => {
      resolve(res?.seoAnalyzerTheme || 'light');
    });
  });
  applyTheme(theme);
  const toggle = $('themeToggle');
  if (toggle) toggle.checked = theme === 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}

async function analyzePage() {
  setProgress(5);
  setLoading(true, 'Checking tab...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found.');
    if (!tab.url || /^(chrome|chrome-extension|about|edge):\/\//.test(tab.url)) {
      throw new Error('Navigate to a regular http/https page first.');
    }

    setProgress(20);
    setLoading(true, 'Injecting analyzer...');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });

    setProgress(45);
    setLoading(true, 'Collecting SEO data...');
    const report = await sendMsg(tab.id, { type: 'GET_FULL_SEO' });
    if (!report || report.error) throw new Error(report?.error || 'Content script returned nothing.');

    setProgress(80);
    setLoading(true, 'Rendering...');

    currentReport = report;
    renderAll(report);

    chrome.runtime.sendMessage({
      type: 'SAVE_HISTORY',
      entry: {
        url: report.url,
        title: report.title || '(no title)',
        ts: new Date().toISOString()
      }
    });

    setProgress(100);
    setTimeout(() => setProgress(0), 700);
  } catch (err) {
    toast('Error: ' + err.message, true);
  } finally {
    setLoading(false);
  }
}

function sendMsg(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function renderAll(r) {
  show('reportView');
  hide('emptyState');

  resetToSummaryTab();

  renderIfChanged('summaryHeader', {
    path: r.urlPath || '',
    anchor: r.urlHash || '',
    anchorText: r.anchorText || '',
    headingCounts: getHeadingCounts(r),
    images: r.images?.total || 0,
    links: r.links?.totalCount || 0
  }, renderHeaderSummary);

  renderIfChanged('summary', {
    title: r.title,
    metaDescription: r.metaDescription,
    keywords: r.keywords,
    canonical: r.canonical,
    robots: r.robots,
    author: r.author,
    publisher: r.publisher,
    lang: r.indexability?.lang || '',
    url: r.url,
    headings: r.headings,
    images: r.images?.total || 0,
    links: r.links?.totalCount || 0,
    robotsTxtUrl: r.robotsTxtUrl,
    sitemapXmlUrl: r.sitemapXmlUrl
  }, renderSummary);

  renderIfChanged('headers', r.headings || {}, renderHeaders);
  renderIfChanged('images', r.images || {}, renderImages);
  renderIfChanged('links', r.links || {}, renderLinks);
  renderIfChanged('social', { og: r.og || {}, twitter: r.twitter || {} }, renderSocial);
  renderIfChanged('tools', {
    indexability: r.indexability || {},
    schema: r.schema || [],
    canonical: r.canonical || '',
    robots: r.robots || '',
    viewport: r.viewport || '',
    charset: r.charset || '',
    wordCount: r.wordCount || 0,
    hreflangCount: r.hreflang?.length || 0,
    performance: r.performance || {},
    url: r.url || '',
    robotsTxtUrl: r.robotsTxtUrl || '',
    sitemapXmlUrl: r.sitemapXmlUrl || ''
  }, renderTools);
}

function renderIfChanged(key, payload, renderer) {
  const snapshot = JSON.stringify(payload);
  if (sectionState[key] === snapshot) return;
  sectionState[key] = snapshot;
  renderer(currentReport);
}

function resetToSummaryTab() {
  const buttons = document.querySelectorAll('.tab-btn[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');

  buttons.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  panels.forEach(p => p.classList.add('hidden'));

  const summaryBtn = document.querySelector('.tab-btn[data-tab="summary"]');
  if (summaryBtn) {
    summaryBtn.classList.add('active');
    summaryBtn.setAttribute('aria-selected', 'true');
  }
  show('tab-summary');
}

function renderHeaderSummary(r) {
  const target = $('headerSummary');
  clear(target);

  const headingCounts = getHeadingCounts(r);
  const cards = [
    { label: 'URL Path / Anchor', value: (r.urlPath || '/') + (r.urlHash || '') },
    { label: 'Anchor Text', value: r.anchorText || 'N/A' },
    { label: 'H1', value: String(headingCounts.H1) },
    { label: 'H2', value: String(headingCounts.H2) },
    { label: 'H3', value: String(headingCounts.H3) },
    { label: 'H4', value: String(headingCounts.H4) },
    { label: 'H5', value: String(headingCounts.H5) },
    { label: 'H6', value: String(headingCounts.H6) },
    { label: 'Images', value: String(r.images?.total || 0) },
    { label: 'Links', value: String(r.links?.totalCount || 0) }
  ];

  cards.forEach(card => {
    const el = mk('div');
    el.className = 'summary-card';

    const label = mk('div');
    label.className = 'summary-card-label';
    label.textContent = card.label;

    const value = mk('div');
    value.className = 'summary-card-value';
    value.textContent = card.value;

    el.appendChild(label);
    el.appendChild(value);
    target.appendChild(el);
  });
}

function getHeadingCounts(r) {
  return {
    H1: (r.headings?.h1 || []).length,
    H2: (r.headings?.h2 || []).length,
    H3: (r.headings?.h3 || []).length,
    H4: (r.headings?.h4 || []).length,
    H5: (r.headings?.h5 || []).length,
    H6: (r.headings?.h6 || []).length
  };
}

function renderSummary(r) {
  const table = $('sumTable');
  const headingRow = $('sumHeadingRow');
  const footer = $('sumFooter');

  clear(table);
  clear(headingRow);
  clear(footer);

  const titleLength = (r.title || '').length;
  const descLength = (r.metaDescription || '').length;

  addSummaryRow(table, 'Title', () => {
    const wrap = mk('div');
    if (r.title) {
      const title = mk('div');
      title.textContent = r.title;
      const count = mk('span');
      count.className = 'sum-char-count ' + (titleLength > 60 ? 'bad' : titleLength >= 50 ? 'good' : 'warn');
      count.textContent = titleLength + ' characters';
      wrap.appendChild(title);
      wrap.appendChild(count);
    } else {
      const missing = mk('span');
      missing.className = 'sum-missing';
      missing.textContent = 'Title tag is missing.';
      wrap.appendChild(missing);
    }
    return wrap;
  });

  addSummaryRow(table, 'Description', () => {
    const wrap = mk('div');
    if (r.metaDescription) {
      const desc = mk('div');
      desc.textContent = r.metaDescription;
      const count = mk('span');
      let cls = 'warn';
      if (descLength >= 120 && descLength <= 160) cls = 'good';
      if (descLength > 160) cls = 'bad';
      count.className = 'sum-char-count ' + cls;
      count.textContent = descLength + ' characters';
      wrap.appendChild(desc);
      wrap.appendChild(count);
    } else {
      const missing = mk('span');
      missing.className = 'sum-missing';
      missing.textContent = 'Meta description is missing.';
      wrap.appendChild(missing);
    }
    return wrap;
  });

  addSummaryRow(table, 'Keywords', () => {
    const el = mk('span');
    if (r.keywords) {
      el.textContent = r.keywords;
    } else {
      el.className = 'sum-absent';
      el.textContent = 'Keywords are missing.';
    }
    return el;
  });

  addSummaryRow(table, 'URL', () => {
    const link = mk('a');
    link.href = r.url || '#';
    link.target = '_blank';
    link.textContent = r.url || 'N/A';
    return link;
  });

  addSummaryRow(table, 'Canonical', () => {
    if (r.canonical) {
      const link = mk('a');
      link.href = r.canonical;
      link.target = '_blank';
      link.textContent = r.canonical;
      return link;
    }
    const missing = mk('span');
    missing.className = 'sum-absent';
    missing.textContent = 'Canonical tag is missing.';
    return missing;
  });

  addSummaryRow(table, 'Robots', () => {
    const el = mk('span');
    if (r.robots) {
      el.textContent = r.robots;
    } else {
      el.className = 'sum-absent';
      el.textContent = 'Robots meta not found.';
    }
    return el;
  });

  addSummaryRow(table, 'Author', () => {
    const el = mk('span');
    if (r.author) {
      el.textContent = r.author;
    } else {
      el.className = 'sum-absent';
      el.textContent = 'Author is missing.';
    }
    return el;
  });

  addSummaryRow(table, 'Publisher', () => {
    const el = mk('span');
    if (r.publisher) {
      el.textContent = r.publisher;
    } else {
      el.className = 'sum-absent';
      el.textContent = 'Publisher is missing.';
    }
    return el;
  });

  addSummaryRow(table, 'Language', () => {
    const el = mk('span');
    if (r.indexability?.lang) {
      el.textContent = r.indexability.lang;
    } else {
      el.className = 'sum-absent';
      el.textContent = 'Language not set.';
    }
    return el;
  });

  const headingCounts = getHeadingCounts(r);
  const statOrder = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
  statOrder.forEach(tag => {
    const group = mk('div');
    group.className = 'hc-group';

    const label = mk('div');
    label.className = 'hc-label';
    label.textContent = tag;

    const value = mk('div');
    value.className = 'hc-val' + (tag === 'H1' && headingCounts[tag] !== 1 ? ' bad' : '');
    value.textContent = String(headingCounts[tag]);

    group.appendChild(label);
    group.appendChild(value);
    headingRow.appendChild(group);
  });

  [
    { label: 'Images', value: r.images?.total || 0 },
    { label: 'Links', value: r.links?.totalCount || 0 }
  ].forEach(entry => {
    const group = mk('div');
    group.className = 'hc-group';

    const label = mk('div');
    label.className = 'hc-label';
    label.textContent = entry.label;

    const value = mk('div');
    value.className = 'hc-val';
    value.textContent = String(entry.value);

    group.appendChild(label);
    group.appendChild(value);
    headingRow.appendChild(group);
  });

  if (r.robotsTxtUrl) {
    const robotsLink = mk('a');
    robotsLink.href = r.robotsTxtUrl;
    robotsLink.target = '_blank';
    robotsLink.textContent = 'Robots.txt';
    footer.appendChild(robotsLink);
  }

  if (r.robotsTxtUrl && r.sitemapXmlUrl) {
    const sep = mk('span');
    sep.textContent = '|';
    footer.appendChild(sep);
  }

  if (r.sitemapXmlUrl) {
    const sitemapLink = mk('a');
    sitemapLink.href = r.sitemapXmlUrl;
    sitemapLink.target = '_blank';
    sitemapLink.textContent = 'Sitemap.xml';
    footer.appendChild(sitemapLink);
  }

  if (!r.robotsTxtUrl && !r.sitemapXmlUrl) {
    const none = mk('span');
    none.textContent = 'No robots.txt or sitemap.xml detected.';
    footer.appendChild(none);
  }
}

function addSummaryRow(parent, labelText, contentFactory) {
  const row = mk('div');
  row.className = 'sum-row';

  const label = mk('div');
  label.className = 'sum-label';
  label.textContent = labelText;

  const value = mk('div');
  value.className = 'sum-value';
  value.appendChild(contentFactory());

  row.appendChild(label);
  row.appendChild(value);
  parent.appendChild(row);
}

function renderHeaders(r) {
  const tree = $('headersTree');
  clear(tree);

  const all = [];
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    (r.headings?.[tag] || []).forEach(text => all.push({ tag, text }));
  });

  if (!all.length) {
    const empty = mk('div');
    empty.className = 'social-empty';
    empty.textContent = 'No heading tags found on this page.';
    tree.appendChild(empty);
    return;
  }

  all.forEach(item => {
    const level = Number(item.tag.slice(1));
    const row = mk('div');
    row.className = 'h-item h-indent-' + Math.max(0, level - 1);

    const tag = mk('span');
    tag.className = 'h-tag';
    tag.textContent = '<' + item.tag.toUpperCase() + '>';

    const text = mk('span');
    text.className = 'h-text';
    text.textContent = item.text;

    row.appendChild(tag);
    row.appendChild(text);
    tree.appendChild(row);
  });
}

function renderImages(r) {
  const stats = $('imgBigStats');
  const list = $('imgList');

  clear(stats);
  clear(list);

  const images = r.images || {};
  const total = images.total || 0;
  const missingAlt = (images.missingAlt?.length || 0) + (images.emptyAlt?.length || 0);
  const missingTitle = images.withoutTitle || 0;

  addBigStat(stats, 'Images', total, '');
  addBigStat(stats, 'Missing Alt', missingAlt, missingAlt > 0 ? 'bad' : 'good');
  addBigStat(stats, 'Missing Title', missingTitle, missingTitle > 0 ? 'bad' : 'good');

  const all = images.list || [];
  if (!all.length) {
    const empty = mk('div');
    empty.className = 'social-empty';
    empty.textContent = 'No images found on this page.';
    list.appendChild(empty);
    return;
  }

  all.forEach(img => {
    const item = mk('div');
    item.className = 'img-item';

    const row = mk('div');
    row.className = 'img-row';

    const thumb = mk('img');
    thumb.className = 'img-thumb';
    thumb.src = img.src || '';
    thumb.alt = img.alt === null ? '' : (img.alt || '');
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.referrerPolicy = 'no-referrer';
    thumb.title = 'URL: ' + (img.src || 'N/A') + '\nALT: ' + (img.alt === null ? '(missing)' : (img.alt || '(empty)'));

    const info = mk('div');
    info.className = 'img-info';

    const alt = mk('div');
    alt.className = 'img-alt';
    const altStrong = mk('strong');
    altStrong.textContent = 'ALT: ';
    alt.appendChild(altStrong);
    alt.appendChild(document.createTextNode(img.alt === null ? '(missing)' : (img.alt || '(empty)')));

    const url = mk('div');
    url.className = 'img-url';
    url.title = 'URL: ' + (img.src || 'N/A') + '\nALT: ' + (img.alt === null ? '(missing)' : (img.alt || '(empty)'));
    const urlStrong = mk('strong');
    urlStrong.textContent = 'URL: ';
    const truncated = mk('span');
    truncated.className = 'img-url-truncated';
    truncated.textContent = truncateText(img.src || '', 90);
    url.appendChild(urlStrong);
    url.appendChild(truncated);

    info.appendChild(alt);
    info.appendChild(url);

    row.appendChild(thumb);
    row.appendChild(info);
    item.appendChild(row);
    list.appendChild(item);
  });
}

function addBigStat(parent, labelText, valueText, toneClass) {
  const cell = mk('div');
  cell.className = 'big-stat-cell';

  const label = mk('div');
  label.className = 'big-stat-label';
  label.textContent = labelText;

  const value = mk('div');
  value.className = 'big-stat-val' + (toneClass ? ' ' + toneClass : '');
  value.textContent = String(valueText);

  cell.appendChild(label);
  cell.appendChild(value);
  parent.appendChild(cell);
}

function renderLinks(r) {
  const stats = $('linkStats');
  const list = $('linkList');

  clear(stats);
  clear(list);

  const links = r.links || {};
  const internalCount = links.internal?.length || 0;
  const externalCount = links.external?.length || 0;
  const uniqueCount = links.uniqueCount || 0;

  addLinkStat(stats, 'Internal Links', internalCount);
  addLinkStat(stats, 'External Links', externalCount);
  addLinkStat(stats, 'Unique Links', uniqueCount);

  const all = links.allLinks || [];
  if (!all.length) {
    const empty = mk('div');
    empty.className = 'social-empty';
    empty.textContent = 'No links found on this page.';
    list.appendChild(empty);
    return;
  }

  all.slice(0, 100).forEach(link => {
    const item = mk('div');
    item.className = 'link-item';

    const href = mk('a');
    href.className = 'link-href';
    href.href = link.href;
    href.target = '_blank';
    href.textContent = link.href;

    const meta = mk('div');
    meta.className = 'link-meta';

    const type = link.isInternal ? 'Internal' : 'External';
    const anchorText = link.anchor || 'N/A';
    meta.textContent = type + ' | Anchor: ' + truncateText(anchorText, 80);
    meta.title = 'Sample: ' + link.href;

    item.appendChild(href);
    item.appendChild(meta);
    list.appendChild(item);
  });
}

function addLinkStat(parent, labelText, valueText) {
  const cell = mk('div');
  cell.className = 'link-stat-cell';

  const label = mk('div');
  label.className = 'link-stat-label';
  label.textContent = labelText;

  const value = mk('div');
  value.className = 'link-stat-val';
  value.textContent = String(valueText);

  cell.appendChild(label);
  cell.appendChild(value);
  parent.appendChild(cell);
}

function renderSocial(r) {
  renderSocialSection('ogSection', 'Open Graph', 'og', r.og || {});
  renderSocialSection('twitterSection', 'Twitter Cards', 'twitter', r.twitter || {});
}

function renderSocialSection(containerId, title, keyPrefix, payload) {
  const container = $(containerId);
  clear(container);

  const header = mk('div');
  header.className = 'social-header';
  header.textContent = title;
  container.appendChild(header);

  const keys = Object.keys(payload).filter(key => !key.startsWith('_'));
  if (!keys.length) {
    const empty = mk('div');
    empty.className = 'social-empty';
    empty.textContent = 'No ' + title.toLowerCase() + ' tags found on this page.';
    container.appendChild(empty);
    return;
  }

  keys.forEach(key => {
    const row = mk('div');
    row.className = 'social-row';

    const keyEl = mk('div');
    keyEl.className = 'social-key';
    keyEl.textContent = keyPrefix + ':' + key;

    const valEl = mk('div');
    valEl.className = 'social-val';
    valEl.textContent = String(payload[key]);

    row.appendChild(keyEl);
    row.appendChild(valEl);
    container.appendChild(row);
  });
}

function renderTools(r) {
  const el = $('toolsSection');
  clear(el);

  appendSectionTitle(el, 'Technical SEO');

  const idx = r.indexability || {};
  appendKVRows(el, [
    { key: 'HTTPS', value: idx.isHttps ? 'Enabled' : 'Not secure', cls: idx.isHttps ? 'good' : 'bad' },
    { key: 'Canonical URL', value: r.canonical || 'Missing', cls: r.canonical ? 'good' : 'warn' },
    { key: 'Robots Meta', value: r.robots || 'Not set', cls: r.robots && !idx.noindex ? 'good' : idx.noindex ? 'bad' : 'warn' },
    { key: 'Noindex', value: idx.noindex ? 'Yes' : 'No', cls: idx.noindex ? 'bad' : 'good' },
    { key: 'Viewport', value: r.viewport || 'Missing', cls: idx.hasViewport ? 'good' : 'warn' },
    { key: 'Charset', value: r.charset || 'Missing', cls: idx.hasCharset ? 'good' : 'warn' },
    { key: 'Language', value: idx.lang || 'Not set', cls: idx.lang ? 'good' : 'warn' },
    { key: 'Schema Markup', value: (r.schema || []).length ? r.schema.join(', ') : 'None', cls: (r.schema || []).length ? 'good' : 'warn' },
    { key: 'Word Count', value: String(r.wordCount || 0), cls: (r.wordCount || 0) >= 300 ? 'good' : 'warn' }
  ]);

  appendSectionTitle(el, 'Performance Signals');
  const p = r.performance || {};
  appendKVRows(el, [
    { key: 'DOM Nodes', value: String(p.domNodes ?? '-'), cls: (p.domNodes || 0) < 1000 ? 'good' : 'warn' },
    { key: 'Scripts', value: String(p.scripts ?? '-'), cls: (p.scripts || 0) < 25 ? 'good' : 'warn' },
    { key: 'Stylesheets', value: String(p.stylesheets ?? '-'), cls: 'info' },
    { key: 'Iframes', value: String(p.iframes ?? '-'), cls: (p.iframes || 0) === 0 ? 'good' : 'warn' },
    { key: 'Lazy Images', value: String(p.lazyImages ?? '-'), cls: (p.lazyImages || 0) > 0 ? 'good' : 'info' },
    { key: 'Estimated Weight', value: p.estimatedWeight != null ? p.estimatedWeight + ' KB' : '-', cls: p.estimatedWeight != null && p.estimatedWeight < 1200 ? 'good' : 'warn' }
  ]);

  appendSectionTitle(el, 'Quick Links');
  const list = mk('div');
  list.className = 'tools-list';

  const links = [
    { key: 'R', name: 'Robots.txt', desc: 'Check crawl directives', url: r.robotsTxtUrl },
    { key: 'S', name: 'Sitemap.xml', desc: 'View XML sitemap', url: r.sitemapXmlUrl },
    { key: 'GSC', name: 'Google Search Console', desc: 'Monitor search performance', url: 'https://search.google.com/search-console' },
    { key: 'PS', name: 'PageSpeed Insights', desc: 'Test Core Web Vitals', url: r.url ? 'https://pagespeed.web.dev/report?url=' + encodeURIComponent(r.url) : 'https://pagespeed.web.dev' }
  ];

  links.forEach(entry => {
    if (!entry.url) return;

    const a = mk('a');
    a.className = 'tool-item';
    a.href = entry.url;
    a.target = '_blank';

    const icon = mk('div');
    icon.className = 'tool-icon';
    icon.textContent = entry.key;

    const info = mk('div');
    info.className = 'tool-info';

    const name = mk('div');
    name.className = 'tool-name';
    name.textContent = entry.name;

    const desc = mk('div');
    desc.className = 'tool-desc';
    desc.textContent = entry.desc;

    const arrow = mk('span');
    arrow.className = 'tool-arrow';
    arrow.textContent = '>'; 

    info.appendChild(name);
    info.appendChild(desc);
    a.appendChild(icon);
    a.appendChild(info);
    a.appendChild(arrow);
    list.appendChild(a);
  });

  el.appendChild(list);
}

function appendSectionTitle(parent, text) {
  const title = mk('div');
  title.className = 'kv-section-title';
  title.textContent = text;
  parent.appendChild(title);
}

function appendKVRows(parent, rows) {
  const list = mk('div');
  list.className = 'kv-list';

  rows.forEach(row => {
    const item = mk('div');
    item.className = 'kv-row';

    const key = mk('span');
    key.className = 'kv-key';
    key.textContent = row.key;

    const val = mk('span');
    val.className = 'kv-val';
    val.textContent = row.value;

    const dot = mk('span');
    dot.className = 'kv-dot ' + row.cls;

    item.appendChild(key);
    item.appendChild(val);
    item.appendChild(dot);
    list.appendChild(item);
  });

  parent.appendChild(list);
}

function openHistory() {
  chrome.storage.local.get(['analysisHistory'], res => {
    renderHistoryList(res?.analysisHistory || []);
    show('historyPanel');
  });
}

function closeHistory() {
  hide('historyPanel');
}

function clearHistory() {
  chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
    renderHistoryList([]);
    toast('History cleared');
  });
}

function renderHistoryList(items) {
  const list = $('historyList');
  clear(list);

  if (!items?.length) {
    const empty = mk('div');
    empty.className = 'history-empty';
    empty.textContent = 'No history yet. Analyze a few pages first.';
    list.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const row = mk('div');
    row.className = 'history-item';

    const url = mk('div');
    url.className = 'history-url';
    url.textContent = (item.url || '').replace(/^https?:\/\//, '');

    const title = mk('div');
    title.className = 'history-title-el';
    title.textContent = item.title || '(no title)';

    const time = mk('div');
    time.className = 'history-time';
    try {
      time.textContent = new Date(item.ts).toLocaleString();
    } catch (_e) {
      time.textContent = item.ts || '';
    }

    row.appendChild(url);
    row.appendChild(title);
    row.appendChild(time);
    list.appendChild(row);
  });
}

function exportJson() {
  if (!currentReport) {
    toast('Analyze a page first.');
    return;
  }

  const blob = new Blob([
    JSON.stringify({ report: currentReport, generatedAt: new Date().toISOString() }, null, 2)
  ], { type: 'application/json' });

  download(blob, 'seo-report-' + dateStamp() + '.json');
  toast('JSON exported');
}

function exportTxt() {
  if (!currentReport) {
    toast('Analyze a page first.');
    return;
  }

  const r = currentReport;
  const lines = [
    'SEO ANALYZER PRO - PAGE REPORT',
    'Generated: ' + new Date().toLocaleString(),
    'URL: ' + (r.url || ''),
    '',
    'Title (' + (r.title || '').length + ' chars): ' + (r.title || 'Missing'),
    'Description (' + (r.metaDescription || '').length + ' chars): ' + (r.metaDescription || 'Missing'),
    'Canonical: ' + (r.canonical || 'Missing'),
    'Robots: ' + (r.robots || 'Not set'),
    '',
    'Headings:',
    'H1: ' + (r.headings?.h1 || []).length,
    'H2: ' + (r.headings?.h2 || []).length,
    'H3: ' + (r.headings?.h3 || []).length,
    'H4: ' + (r.headings?.h4 || []).length,
    'H5: ' + (r.headings?.h5 || []).length,
    'H6: ' + (r.headings?.h6 || []).length,
    '',
    'Images: ' + (r.images?.total || 0),
    'Links: ' + (r.links?.totalCount || 0),
    'Internal Links: ' + (r.links?.internal?.length || 0),
    'External Links: ' + (r.links?.external?.length || 0),
    'Unique Links: ' + (r.links?.uniqueCount || 0)
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  download(blob, 'seo-report-' + dateStamp() + '.txt');
  toast('TXT exported');
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = mk('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function setLoading(active, message) {
  const loading = $('loadingState');
  const button = $('analyzeBtn');

  if (active) {
    loading.classList.remove('hidden');
    button.disabled = true;
    $('loadingText').textContent = message || 'Analyzing...';
    show('emptyState');
    hide('reportView');
    return;
  }

  loading.classList.add('hidden');
  button.disabled = false;
}

function setProgress(percent) {
  const bar = $('progressBar');
  bar.classList.remove('w-0', 'w-5', 'w-20', 'w-45', 'w-80', 'w-100');
  const key = [0, 5, 20, 45, 80, 100].includes(percent) ? percent : 0;
  bar.classList.add('w-' + key);
}

function show(id) {
  $(id).classList.remove('hidden');
}

function hide(id) {
  $(id).classList.add('hidden');
}

function $(id) {
  return document.getElementById(id);
}

function bindClick(id, handler) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('click', handler);
}

function mk(tag) {
  return document.createElement(tag);
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function truncateText(value, max) {
  if (!value || value.length <= max) return value || '';
  return value.slice(0, max - 1) + '...';
}

let toastTimer = null;
function toast(message, isError) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = mk('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.classList.toggle('error', !!isError);
  el.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.classList.remove('error');
  }, 2400);
}

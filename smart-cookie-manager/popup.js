
// ─── TRACKER DATABASE ────────────────────────────────────────────────────────

const TRACKER_DB = {
  exact: {
    '_ga': 'Google Analytics', '_gid': 'Google Analytics', '_gat': 'Google Analytics',
    '__utma': 'Google Analytics', '__utmb': 'Google Analytics', '__utmc': 'Google Analytics',
    '__utmz': 'Google Analytics', '__utmt': 'Google Analytics', '__utmv': 'Google Analytics',
    '_gcl_au': 'Google Ads', '_gads': 'Google Ads', '_gac': 'Google Ads',
    '_fbp': 'Meta/Facebook', '_fbc': 'Meta/Facebook', 'fr': 'Meta/Facebook',
    'datr': 'Meta/Facebook', 'sb': 'Meta/Facebook', 'xs': 'Meta/Facebook',
    'c_user': 'Meta/Facebook', '_js_datr': 'Meta/Facebook',
    'IDE': 'Google DoubleClick', 'DSID': 'Google DoubleClick', 'test_cookie': 'Google DoubleClick',
    'AnalyticsSyncHistory': 'LinkedIn', 'li_gc': 'LinkedIn', 'UserMatchHistory': 'LinkedIn',
    'bcookie': 'LinkedIn', 'lidc': 'LinkedIn', 'li_at': 'LinkedIn',
    'personalization_id': 'Twitter/X', 'guest_id': 'Twitter/X', 'ct0': 'Twitter/X',
    '_ttp': 'TikTok', '_tt_enable_cookie': 'TikTok', 'ttwid': 'TikTok',
    'mbox': 'Adobe Target', 's_cc': 'Adobe Analytics', 's_sq': 'Adobe Analytics',
    '_hjid': 'Hotjar', '_hjSessionUser': 'Hotjar', '_hjSession': 'Hotjar',
    'ajs_user_id': 'Segment', 'ajs_anonymous_id': 'Segment',
    '_pin_unauth': 'Pinterest', '_pinterest_sess': 'Pinterest',
    'MUID': 'Microsoft/Bing', '_uetsid': 'Microsoft Ads', '_uetvid': 'Microsoft Ads',
    '_clck': 'Microsoft Clarity', '_clsk': 'Microsoft Clarity',
    '__cf_bm': 'Cloudflare Bot',
    'OptanonConsent': 'OneTrust', 'OptanonAlertBoxClosed': 'OneTrust',
    'CookieConsent': 'Cookiebot',
    '__hstc': 'HubSpot', '__hssc': 'HubSpot', '__hssrc': 'HubSpot', 'hubspotutk': 'HubSpot',
    '_vwo_uuid': 'VWO', '_vis_opt_test_cookie': 'VWO',
    'amplitude_id': 'Amplitude',
    'mp_mixpanel': 'Mixpanel',
    'intercom-id': 'Intercom', 'intercom-session': 'Intercom',
    'crisp-client': 'Crisp Chat',
    'NID': 'Google', 'CONSENT': 'Google Consent', 'SEARCH_SAMESITE': 'Google',
    'GPS': 'YouTube', 'YSC': 'YouTube', 'VISITOR_INFO1_LIVE': 'YouTube',
  },
  prefixes: [
    ['_hj', 'Hotjar'], ['_ga', 'Google Analytics'], ['__utm', 'Google Analytics'],
    ['__gads', 'Google Ads'], ['mp_', 'Mixpanel'], ['amplitude_', 'Amplitude'],
    ['_li_', 'LinkedIn'], ['intercom-', 'Intercom'], ['crisp-', 'Crisp Chat'],
    ['__hstc', 'HubSpot'], ['hubspot', 'HubSpot'], ['_vwo_', 'VWO'],
    ['heap_', 'Heap Analytics'], ['_fbp', 'Meta/Facebook'], ['_tt_', 'TikTok'],
    ['_gcl_', 'Google Ads'], ['_gac_', 'Google Ads'], ['_gat_', 'Google Analytics'],
  ]
};

function getTrackerInfo(name) {
  const n = name || '';
  if (TRACKER_DB.exact[n]) return { isTracker: true, trackerName: TRACKER_DB.exact[n] };
  const lower = n.toLowerCase();
  for (const [prefix, tracker] of TRACKER_DB.prefixes) {
    if (lower.startsWith(prefix.toLowerCase())) return { isTracker: true, trackerName: tracker };
  }
  return { isTracker: false, trackerName: null };
}

// ─── STATE ────────────────────────────────────────────────────────────────────

let allCookies = [];
let settings = null;
let stats = null;
let currentTab = 'monitor';
let monitorFilter = 'all';
let countdownTimer = null;
let isRefreshing = false;
let sortOrder = 'status';
let groupByDomain = false;
let collapsedGroups = new Set();
let activeCookie = null; // cookie shown in detail modal
let whitelistSearchTerm = '';

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  setupTabs();
  setupMonitorPanel();
  setupCleanerPanel();
  setupWhitelistPanel();
  setupAnalyticsPanel();
  setupModal();
  setupSuggestions();
  applyTheme();
  startCountdownTimer();
});

window.addEventListener('beforeunload', () => {
  if (countdownTimer) clearInterval(countdownTimer);
});

// ─── DATA LOADING ─────────────────────────────────────────────────────────────

async function loadAll() {
  try {
    const [cookiesRes, storedData, statsRes] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getCookies' }),
      chrome.storage.sync.get(['settings']),
      chrome.runtime.sendMessage({ action: 'getStats' })
    ]);

    // Enrich with tracker info client-side
    allCookies = (cookiesRes || []).map(c => {
      const tracker = getTrackerInfo(c.name);
      return { ...c, ...tracker };
    });

    settings = storedData.settings;
    stats = statsRes || { cleaned: 0, lastCleanedAt: null };

    updateStatsBar();
    renderCookieList();
    renderWhitelistItems();
    updateCleanerInfo();
    updateLastCleanInfo();
    if (currentTab === 'analytics') renderAnalytics();
    checkSuggestions();
  } catch (err) {
    console.error('[SCM Popup] Load error:', err);
  }
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────

function updateStatsBar() {
  const total = allCookies.length;
  const critical = allCookies.filter(c => c.expiryStatus === 'critical').length;
  const expiring = allCookies.filter(c => c.expiryStatus === 'warning' || c.expiryStatus === 'soon').length;
  const protected_ = allCookies.filter(c => c.isProtected).length;

  setText('statTotal', total);
  setText('statCritical', critical);
  setText('statExpiring', expiring);
  setText('statProtected', protected_);
  setText('statCleaned', stats?.cleaned ?? 0);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(name) {
  if (!name) return;

  currentTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'analytics') renderAnalytics();
}

// ─── MONITOR PANEL ────────────────────────────────────────────────────────────

function setupMonitorPanel() {
  const searchInput = document.getElementById('monitorSearch');
  const clearBtn = document.getElementById('searchClear');
  const sortDropdownBtn = document.getElementById('sortSelectBtn');
  const sortDropdownMenu = document.getElementById('sortDropdownMenu');

  searchInput.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', !searchInput.value);
    renderCookieList();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    renderCookieList();
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    document.getElementById('refreshBtn').classList.add('spinning');
    await loadAll();
    document.getElementById('refreshBtn').classList.remove('spinning');
    isRefreshing = false;
  });

  document.querySelectorAll('#monitorFilters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#monitorFilters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      monitorFilter = chip.dataset.filter;
      renderCookieList();
    });
  });

  // Sort
  sortDropdownBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isHidden = sortDropdownMenu.classList.contains('hidden');
    sortDropdownMenu.classList.toggle('hidden', !isHidden);
    sortDropdownBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });
  document.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', e => {
      e.stopPropagation();
      sortOrder = option.dataset.value;
      document.getElementById('sortSelectLabel').textContent = option.textContent;
      document.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('active', opt === option);
      });
      sortDropdownMenu.classList.add('hidden');
      sortDropdownBtn.setAttribute('aria-expanded', 'false');
      renderCookieList();
    });
  });

  // Group by domain toggle
  document.getElementById('groupToggle').addEventListener('click', () => {
    groupByDomain = !groupByDomain;
    document.getElementById('groupToggle').classList.toggle('active', groupByDomain);
    renderCookieList();
  });

  // Export dropdown toggle
  const exportDropdownBtn = document.getElementById('exportDropdownBtn');
  const exportDropdown = document.getElementById('exportDropdown');
  exportDropdownBtn.addEventListener('click', e => {
    e.stopPropagation();
    exportDropdown.classList.toggle('hidden');
    sortDropdownMenu.classList.add('hidden');
    sortDropdownBtn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', () => {
    exportDropdown.classList.add('hidden');
    sortDropdownMenu.classList.add('hidden');
    sortDropdownBtn.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    exportCookies('json');
    exportDropdown.classList.add('hidden');
  });
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    exportCookies('csv');
    exportDropdown.classList.add('hidden');
  });
}

function getSortedCookies(cookies) {
  return [...cookies].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortOrder === 'domain') {
      return (a.cleanDomain || a.domain).localeCompare(b.cleanDomain || b.domain);
    }
    if (sortOrder === 'expiry') {
      const aT = a.timeUntilExpiry ?? Infinity;
      const bT = b.timeUntilExpiry ?? Infinity;
      return aT - bT;
    }
    // Default: status order
    const order = { critical: 0, warning: 1, soon: 2, safe: 3, session: 4, expired: 5 };
    const oa = order[a.expiryStatus] ?? 3;
    const ob = order[b.expiryStatus] ?? 3;
    if (oa !== ob) return oa - ob;
    if (a.timeUntilExpiry && b.timeUntilExpiry) return a.timeUntilExpiry - b.timeUntilExpiry;
    return 0;
  });
}

function getFilteredCookies() {
  const searchTerm = document.getElementById('monitorSearch').value.toLowerCase().trim();
  return allCookies.filter(c => {
    const matchSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm) ||
      c.domain.toLowerCase().includes(searchTerm);
    if (!matchSearch) return false;
    if (monitorFilter === 'all') return true;
    if (monitorFilter === 'protected') return c.isProtected;
    if (monitorFilter === 'tracker') return c.isTracker;
    return c.expiryStatus === monitorFilter;
  });
}

function renderCookieList() {
  const list = document.getElementById('cookieList');
  const filtered = getSortedCookies(getFilteredCookies());

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><span>No cookies match your filters.</span></div>`;
    return;
  }

  if (groupByDomain) {
    renderCookieListGrouped(list, filtered);
  } else {
    list.innerHTML = filtered.map(c => cookieCardHTML(c)).join('');
    attachCardHandlers(list);
  }
}

function renderCookieListGrouped(list, cookies) {
  // Group by cleanDomain
  const groups = new Map();
  for (const c of cookies) {
    const d = c.cleanDomain || c.domain;
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(c);
  }

  // Sort groups: by count desc
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  list.innerHTML = sorted.map(([domain, domainCookies]) => {
    const collapsed = collapsedGroups.has(domain) ? 'collapsed' : '';
    const trackerCount = domainCookies.filter(c => c.isTracker).length;
    const trackerBadge = trackerCount > 0
      ? `<span class="cookie-tracker-badge cookie-tracker-badge-compact">${trackerCount} tracker${trackerCount > 1 ? 's' : ''}</span>`
      : '';
    return `
      <div class="domain-group ${collapsed}" data-domain="${esc(domain)}">
        <div class="domain-group-header">
          <div class="domain-group-name">
            🌐 ${esc(domain)}
            <span class="domain-group-count">${domainCookies.length}</span>
            ${trackerBadge}
          </div>
          <div class="domain-group-header-right">
            <button class="domain-group-del-btn" data-domain="${esc(domain)}">Delete All</button>
            <svg class="domain-group-chevron" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.646 4.646a.5.5 0 01.708 0L8 10.293l5.646-5.647a.5.5 0 01.708.708l-6 6a.5.5 0 01-.708 0l-6-6a.5.5 0 010-.708z"/>
            </svg>
          </div>
        </div>
        <div class="domain-group-body">
          ${domainCookies.map(c => cookieCardHTML(c)).join('')}
        </div>
      </div>`;
  }).join('');

  // Group collapse toggle
  list.querySelectorAll('.domain-group-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.domain-group-del-btn')) return;
      const group = header.closest('.domain-group');
      const domain = group.dataset.domain;
      if (collapsedGroups.has(domain)) {
        collapsedGroups.delete(domain);
        group.classList.remove('collapsed');
      } else {
        collapsedGroups.add(domain);
        group.classList.add('collapsed');
      }
    });
  });

  // Group delete all
  list.querySelectorAll('.domain-group-del-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const domain = btn.dataset.domain;
      const targets = allCookies.filter(c => (c.cleanDomain || c.domain) === domain);
      const whitelist = settings?.whitelist || [];
      if (whitelist.some(w => domain.includes(w) || w.includes(domain))) {
        return;
      }
      for (const c of targets) {
        try {
          await chrome.cookies.remove({
            url: `http${c.secure ? 's' : ''}://${c.cleanDomain || c.domain}${c.path || '/'}`,
            name: c.name
          });
        } catch {}
      }
      await loadAll();
    });
  });

  attachCardHandlers(list);
}

function attachCardHandlers(container) {
  // Delete single cookie
  container.querySelectorAll('.cookie-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const cookie = allCookies[idx];
      if (cookie) await deleteSingleCookie(cookie);
    });
  });

  // Click card → detail modal
  container.querySelectorAll('.cookie-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.cookie-delete-btn')) return;
      const idx = parseInt(card.dataset.idx);
      const cookie = allCookies[idx];
      if (cookie) showCookieDetail(cookie);
    });
  });
}

function cookieCardHTML(c) {
  const idx = allCookies.indexOf(c);
  const statusLabels = {
    critical: '🚨 Critical', warning: '⚠️ Warning', soon: '📅 Soon',
    safe: '✅ Safe', session: '🔄 Session', expired: '❌ Expired'
  };
  const label = statusLabels[c.expiryStatus] || c.expiryStatus;
  const countdown = c.timeUntilExpiry != null
    ? (c.timeUntilExpiry > 0 ? formatCountdown(c.timeUntilExpiry) : 'Expired')
    : (c.expiryStatus === 'session' ? 'Session' : '');
  const metaBits = [
    c.secure ? 'Secure' : 'Standard',
    c.httpOnly ? 'HttpOnly' : '',
    c.sameSite && c.sameSite !== 'unspecified' ? `SameSite ${c.sameSite}` : ''
  ].filter(Boolean).join(' • ');

  const flags = [
    c.secure ? `<span class="cookie-flag">Secure</span>` : '',
    c.httpOnly ? `<span class="cookie-flag">HttpOnly</span>` : '',
    c.isProtected ? `<span class="cookie-protected"><svg class="cookie-protected-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a2 2 0 012 2v4H6V3a2 2 0 012-2zm3 6V3a3 3 0 00-6 0v4a2 2 0 00-2 2v5a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2z"/></svg>Protected</span>` : '',
    c.isTracker ? `<span class="cookie-tracker-badge">🕵️ ${esc(c.trackerName)}</span>` : ''
  ].filter(Boolean).join('');

  return `
    <div class="cookie-card ${c.expiryStatus}${c.isTracker ? ' tracker-card' : ''}" data-idx="${idx}" title="Click for details">
      <button class="cookie-delete-btn" data-idx="${idx}" title="Delete this cookie">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
      </button>
      <div class="cookie-card-top">
        <div class="cookie-title-block">
          <div class="cookie-name" title="${esc(c.name)}">${esc(c.name)}</div>
          <div class="cookie-meta">${esc(metaBits || 'Session scope')}</div>
        </div>
        <div class="cookie-badge-status">${label}</div>
      </div>
      <div class="cookie-domain-row">
        <div class="cookie-domain" title="${esc(c.cleanDomain || c.domain)}">
          <span class="cookie-domain-icon">Domain</span>
          <span class="cookie-domain-text">${esc(c.cleanDomain || c.domain)}</span>
        </div>
        <span class="cookie-countdown">${countdown}</span>
      </div>
      <div class="cookie-footer">
        <div class="cookie-flags">${flags}</div>
        <span class="cookie-open-hint">Click for details</span>
      </div>
    </div>`;
}

async function deleteSingleCookie(cookie) {
  try {
    await chrome.cookies.remove({
      url: `http${cookie.secure ? 's' : ''}://${cookie.cleanDomain || cookie.domain}${cookie.path || '/'}`,
      name: cookie.name
    });
    await logToHistory('deleted', cookie.domain, cookie.name);
    await loadAll();
  } catch (err) {
    console.warn('[SCM] Delete single cookie error:', err);
  }
}

function startCountdownTimer() {
  countdownTimer = setInterval(() => {
    const now = Date.now();
    allCookies = allCookies.map(c => {
      if (!c.expirationDate) return c;
      c.timeUntilExpiry = c.expirationDate * 1000 - now;
      if (c.timeUntilExpiry <= 0) c.expiryStatus = 'expired';
      else if (c.timeUntilExpiry < 5 * 60_000) c.expiryStatus = 'critical';
      else if (c.timeUntilExpiry < 60 * 60_000) c.expiryStatus = 'warning';
      else if (c.timeUntilExpiry < 24 * 60 * 60_000) c.expiryStatus = 'soon';
      else c.expiryStatus = 'safe';
      return c;
    });
    if (currentTab === 'monitor') renderCookieList();
    updateStatsBar();
  }, 1000);
}

// ─── COOKIE DETAIL MODAL ──────────────────────────────────────────────────────

function setupModal() {
  document.getElementById('modalClose').addEventListener('click', closeCookieDetail);
  document.getElementById('cookieModal').addEventListener('click', e => {
    if (e.target === document.getElementById('cookieModal')) closeCookieDetail();
  });

  document.getElementById('modalProtectBtn').addEventListener('click', async () => {
    if (!activeCookie) return;
    const domain = activeCookie.cleanDomain || activeCookie.domain;
    const action = activeCookie.isProtected ? 'removeFromWhitelist' : 'addToWhitelist';
    await chrome.runtime.sendMessage({ action, domain });
    await loadAll();
    // Update modal state
    const updated = allCookies.find(c => c.name === activeCookie.name && c.domain === activeCookie.domain);
    if (updated) showCookieDetail(updated);
  });

  document.getElementById('modalDeleteBtn').addEventListener('click', async () => {
    if (!activeCookie) return;
    closeCookieDetail();
    await deleteSingleCookie(activeCookie);
  });
}

function setupSuggestions() {
  const toast = document.getElementById('suggestionToast');
  document.getElementById('suggestionAction').addEventListener('click', async () => {
    const domain = toast.dataset.domain;
    if (!domain) return;
    await chrome.runtime.sendMessage({ action: 'addToWhitelist', domain });
    toast.classList.add('hidden');
    toast.dataset.domain = '';
    await loadAll();
  });
  document.getElementById('suggestionDismiss').addEventListener('click', () => {
    toast.classList.add('hidden');
    toast.dataset.domain = '';
  });
}

function showCookieDetail(cookie) {
  activeCookie = cookie;

  const statusLabels = {
    critical: '🚨 Critical', warning: '⚠️ Warning', soon: '📅 Soon',
    safe: '✅ Safe', session: '🔄 Session', expired: '❌ Expired'
  };

  setText('modalName', cookie.name);
  setText('modalDomain', `🌐 ${cookie.cleanDomain || cookie.domain}`);

  const statusBadge = document.getElementById('modalStatus');
  statusBadge.textContent = statusLabels[cookie.expiryStatus] || cookie.expiryStatus;
  statusBadge.className = `cookie-badge-status modal-status-badge ${cookie.expiryStatus}`;

  // Path
  setText('modalPath', cookie.path || '/');

  // Expiry
  if (cookie.expirationDate) {
    const d = new Date(cookie.expirationDate * 1000);
    setText('modalExpiry', d.toLocaleString());
    setText('modalTimeLeft', cookie.timeUntilExpiry > 0 ? formatCountdown(cookie.timeUntilExpiry) : 'Expired');
  } else {
    setText('modalExpiry', 'Session only');
    setText('modalTimeLeft', '—');
  }

  // SameSite
  setText('modalSameSite', cookie.sameSite || 'unspecified');

  // Flag chips
  setFlagChip('modalFlagSecure', cookie.secure);
  setFlagChip('modalFlagHttpOnly', cookie.httpOnly);
  setFlagChip('modalFlagProtected', cookie.isProtected);

  const trackerChip = document.getElementById('modalFlagTracker');
  if (cookie.isTracker) {
    trackerChip.classList.remove('inactive');
    document.getElementById('modalTrackerRow').classList.remove('hidden');
    setText('modalTrackerName', cookie.trackerName);
  } else {
    trackerChip.classList.add('inactive');
    document.getElementById('modalTrackerRow').classList.add('hidden');
  }

  // Protect button label
  const protectBtn = document.getElementById('modalProtectBtn');
  const protectLabel = protectBtn.querySelector('.modal-btn-label');
  protectBtn.classList.toggle('is-active', cookie.isProtected);
  if (protectLabel) {
    protectLabel.textContent = cookie.isProtected ? 'Unprotect' : 'Protect';
  }

  document.getElementById('cookieModal').classList.remove('hidden');
}

function closeCookieDetail() {
  document.getElementById('cookieModal').classList.add('hidden');
  activeCookie = null;
}

function setFlagChip(id, active) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('active', !!active);
  el.classList.toggle('inactive', !active);
}

// ─── CLEANER PANEL ────────────────────────────────────────────────────────────

function setupCleanerPanel() {
  document.getElementById('cleanNowBtn').addEventListener('click', cleanNow);
  document.getElementById('protectCurrentBtn').addEventListener('click', protectCurrent);
  document.getElementById('bulkByDomainBtn').addEventListener('click', bulkByDomain);
  document.getElementById('bulkExpiredBtn').addEventListener('click', cleanExpired);
  document.getElementById('bulkTrackersBtn').addEventListener('click', cleanTrackers);

  getCurrentDomain().then(domain => {
    if (domain) document.getElementById('currentDomainLabel').textContent = domain;
  });
}

async function cleanNow() {
  const cleanable = allCookies.filter(c => !c.isProtected).length;
  if (cleanable === 0) {
    return showCleanStatus('✅ Nothing to clean — all protected!', 'success');
  }
  if (!confirm(`Clean ${cleanable} non-protected cookies now?`)) return;
  showCleanStatus('🔍 Scanning cookies…', 'info');
  try {
    const res = await chrome.runtime.sendMessage({ action: 'cleanCookies' });
    if (res?.success) {
      stats.cleaned = (stats.cleaned || 0) + res.deleted;
      if (res.deleted > 0) {
        await logToHistory('cleaned', 'System', `${res.deleted} cookies`);
      }
      showCleanStatus(res.deleted > 0
        ? `🧹 Cleaned ${res.deleted} cookies!`
        : '✅ Nothing to clean — all protected!', 'success');
      await loadAll();
    }
  } catch {
    showCleanStatus('❌ Error cleaning cookies', 'error');
  }
}

async function protectCurrent() {
  const domain = await getCurrentDomain();
  if (!domain) return showCleanStatus('❌ Cannot detect domain', 'error');
  await chrome.runtime.sendMessage({ action: 'addToWhitelist', domain });
  await logToHistory('protected', domain);
  showCleanStatus(`🛡️ Protected: ${domain}`, 'success');
  await loadAll();
}

async function bulkByDomain() {
  const domain = prompt('Delete all cookies from domain:\n(enter domain, e.g. example.com)');
  if (!domain?.trim()) return;
  const clean = domain.trim().toLowerCase().replace(/^www\./, '');
  const whitelist = settings?.whitelist || [];
  if (whitelist.some(w => clean.includes(w) || w.includes(clean))) {
    return showCleanStatus(`⚠️ ${clean} is protected — remove from whitelist first`, 'error');
  }
  const targets = allCookies.filter(c => c.cleanDomain?.includes(clean) || clean.includes(c.cleanDomain));
  if (targets.length === 0) {
    return showCleanStatus(`No cookies found for ${clean}`, 'info');
  }
  if (!confirm(`Delete ${targets.length} cookies from ${clean}?`)) return;
  let count = 0;
  for (const c of targets) {
    try {
      await chrome.cookies.remove({
        url: `http${c.secure ? 's' : ''}://${c.cleanDomain}${c.path || '/'}`,
        name: c.name
      });
      count++;
    } catch {}
  }
  if (count > 0) await logToHistory('deleted', clean, `${count} cookies`);
  showCleanStatus(`🗑️ Removed ${count} cookies from ${clean}`, 'success');
  await loadAll();
}

async function cleanExpired() {
  const expired = allCookies.filter(c => c.expiryStatus === 'expired');
  if (expired.length === 0) {
    return showCleanStatus('✅ No expired cookies found', 'success');
  }
  if (!confirm(`Delete ${expired.length} expired cookies?`)) return;
  let count = 0;
  for (const c of expired) {
    try {
      await chrome.cookies.remove({
        url: `http${c.secure ? 's' : ''}://${c.cleanDomain}${c.path || '/'}`,
        name: c.name
      });
      count++;
    } catch {}
  }
  if (count > 0) await logToHistory('deleted', 'Expired', `${count} expired cookies`);
  showCleanStatus(count > 0 ? `🗑️ Removed ${count} expired cookies` : '✅ No expired cookies found', 'success');
  await loadAll();
}

async function cleanTrackers() {
  const trackers = allCookies.filter(c => c.isTracker && !c.isProtected);
  if (trackers.length === 0) return showCleanStatus('✅ No tracker cookies found!', 'success');
  if (!confirm(`Delete ${trackers.length} tracker cookie${trackers.length !== 1 ? 's' : ''}?`)) return;
  let count = 0;
  for (const c of trackers) {
    try {
      await chrome.cookies.remove({
        url: `http${c.secure ? 's' : ''}://${c.cleanDomain}${c.path || '/'}`,
        name: c.name
      });
      count++;
    } catch {}
  }
  if (count > 0) await logToHistory('deleted', 'Trackers', `${count} tracker cookies`);
  showCleanStatus(`🕵️ Removed ${count} tracker cookie${count !== 1 ? 's' : ''}`, 'success');
  await loadAll();
}

function updateCleanerInfo() {
  const cleanable = allCookies.filter(c => !c.isProtected).length;
  const trackerCount = allCookies.filter(c => c.isTracker && !c.isProtected).length;
  const expiredCount = allCookies.filter(c => c.expiryStatus === 'expired' && !c.isProtected).length;
  const protectedCount = allCookies.filter(c => c.isProtected).length;
  document.getElementById('cleanableCount').textContent = cleanable;
  setText('cleanerTrackerCount', trackerCount);
  setText('cleanerExpiredCount', expiredCount);
  setText('cleanerProtectedCount', protectedCount);
}

function updateLastCleanInfo() {
  const el = document.getElementById('lastCleanInfo').querySelector('span');
  if (stats?.lastCleanedAt) {
    const d = new Date(stats.lastCleanedAt);
    el.textContent = `Last cleaned ${d.toLocaleString()} · ${stats.cleaned} total removed`;
  } else {
    el.textContent = 'Never cleaned yet';
  }
}

function showCleanStatus(msg, type) {
  const el = document.getElementById('cleanStatus');
  el.textContent = msg;
  el.className = `status-toast ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─── WHITELIST PANEL ─────────────────────────────────────────────────────────

function setupWhitelistPanel() {
  document.getElementById('addDomainBtn').addEventListener('click', addDomainFromInput);
  document.getElementById('domainInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addDomainFromInput();
  });
  document.getElementById('protectCurrentWlBtn').addEventListener('click', protectCurrentFromWhitelistPanel);
  document.getElementById('exportWlBtn').addEventListener('click', exportWhitelist);
  document.getElementById('importFile').addEventListener('change', importWhitelist);
  const searchInput = document.getElementById('whitelistSearch');
  const clearBtn = document.getElementById('whitelistSearchClear');
  searchInput.addEventListener('input', () => {
    whitelistSearchTerm = searchInput.value.trim().toLowerCase();
    clearBtn.classList.toggle('hidden', !searchInput.value);
    renderWhitelistItems();
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    whitelistSearchTerm = '';
    clearBtn.classList.add('hidden');
    renderWhitelistItems();
  });
}

async function protectCurrentFromWhitelistPanel() {
  const domain = await getCurrentDomain();
  if (!domain) return showCleanStatus('❌ Cannot detect current site', 'error');
  await chrome.runtime.sendMessage({ action: 'addToWhitelist', domain });
  await logToHistory('protected', domain);
  showCleanStatus(`🛡️ Protected: ${domain}`, 'success');
  await loadAll();
}

async function addDomainFromInput() {
  const input = document.getElementById('domainInput');
  const raw = input.value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  if (!raw || !raw.includes('.')) return flashInput(input);
  await chrome.runtime.sendMessage({ action: 'addToWhitelist', domain: raw });
  input.value = '';
  await loadAll();
}

function flashInput(input) {
  input.classList.add('input-error');
  setTimeout(() => input.classList.remove('input-error'), 800);
}

function renderWhitelistItems() {
  const container = document.getElementById('whitelistItems');
  const whitelist = settings?.whitelist || [];
  const filtered = whitelist.filter(domain => domain.toLowerCase().includes(whitelistSearchTerm));
  setText('wlCount', `${filtered.length} of ${whitelist.length} site${whitelist.length !== 1 ? 's' : ''}`);

  if (whitelist.length === 0) {
    container.innerHTML = `<div class="empty-state">No protected sites yet.<br>Add domains above or click "Protect Current" in Cleaner.</div>`;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No protected sites match your search.</div>`;
    return;
  }

  container.innerHTML = filtered.map(domain => `
    <div class="wl-item">
      <span class="wl-domain">
        <svg class="wl-shield" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        ${esc(domain)}
      </span>
      <button class="wl-remove" data-domain="${esc(domain)}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.wl-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ action: 'removeFromWhitelist', domain: btn.dataset.domain });
      await loadAll();
    });
  });
}

async function exportWhitelist() {
  const res = await chrome.runtime.sendMessage({ action: 'exportWhitelist' });
  downloadFile(JSON.stringify({ whitelist: res.whitelist }, null, 2), 'scm-whitelist.json', 'application/json');
}

async function importWhitelist(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let domains = [];
  try {
    const parsed = JSON.parse(text);
    domains = Array.isArray(parsed) ? parsed : (parsed.whitelist || []);
  } catch {
    domains = text.split('\n').map(l => l.trim()).filter(l => l.includes('.'));
  }
  if (domains.length > 0) {
    const res = await chrome.runtime.sendMessage({ action: 'importWhitelist', domains });
    await loadAll();
    alert(`Imported ${res.count} domains to whitelist.`);
  }
  e.target.value = '';
}

// ─── ANALYTICS PANEL ──────────────────────────────────────────────────────────

function setupAnalyticsPanel() {
  document.getElementById('aExportJsonBtn').addEventListener('click', () => exportCookies('json'));
  document.getElementById('aExportCsvBtn').addEventListener('click', () => exportCookies('csv'));
}

function renderAnalytics() {
  if (!allCookies.length) return;

  // Status counts
  const counts = { critical: 0, warning: 0, soon: 0, safe: 0, session: 0, expired: 0 };
  for (const c of allCookies) counts[c.expiryStatus] = (counts[c.expiryStatus] || 0) + 1;

  const trackerCount = allCookies.filter(c => c.isTracker).length;
  const sessionCount = allCookies.filter(c => c.expiryStatus === 'session').length;
  const secureCount = allCookies.filter(c => c.secure).length;
  const httpOnlyCount = allCookies.filter(c => c.httpOnly).length;

  setText('aStatTrackers', trackerCount);
  setText('aStatSession', sessionCount);
  setText('aStatSecure', secureCount);
  setText('aStatHttpOnly', httpOnlyCount);

  // Privacy score
  const score = calculatePrivacyScore(trackerCount, counts);
  renderPrivacyScore(score, trackerCount, counts);

  // Status donut chart
  renderStatusChart(counts);

  // Top domains bar chart
  renderDomainsChart();
}

function calculatePrivacyScore(trackerCount, counts) {
  let score = 100;
  // Penalty for trackers
  score -= Math.min(40, trackerCount * 2);
  // Penalty for critical/warning
  score -= Math.min(20, counts.critical * 3);
  score -= Math.min(10, counts.warning * 1);
  // Penalty if no whitelist
  const wlLen = settings?.whitelist?.length || 0;
  if (wlLen === 0) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function renderPrivacyScore(score, trackerCount, counts) {
  const canvas = document.getElementById('scoreCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2, r = W / 2 - 7;
  const scoreColor = score >= 80 ? '#4af497' : score >= 60 ? '#f4c44a' : score >= 40 ? '#f4a44a' : '#f45b5b';
  const scoreTone = score >= 80 ? 'tone-safe' : score >= 60 ? 'tone-warning' : score >= 40 ? 'tone-caution' : 'tone-danger';

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 9;
  ctx.stroke();

  // Score arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score text
  const scoreEl = document.getElementById('scoreNum');
  const gradeEl = document.getElementById('scoreGrade');
  scoreEl.textContent = score;
  scoreEl.className = `score-num ${scoreTone}`;

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const gradeLabels = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor', F: 'At Risk' };
  gradeEl.textContent = grade;
  gradeEl.className = `score-grade ${scoreTone}`;

  // Score factors
  const factors = document.getElementById('scoreFactors');
  const wlLen = settings?.whitelist?.length || 0;
  factors.innerHTML = [
    trackerCount > 0
      ? `<div class="score-factor"><div class="score-factor-dot tone-danger-bg"></div>${trackerCount} tracker cookie${trackerCount !== 1 ? 's' : ''} detected</div>`
      : `<div class="score-factor"><div class="score-factor-dot tone-safe-bg"></div>No tracker cookies found</div>`,
    counts.critical > 0
      ? `<div class="score-factor"><div class="score-factor-dot tone-danger-bg"></div>${counts.critical} critical expiry soon</div>`
      : '',
    counts.warning > 0
      ? `<div class="score-factor"><div class="score-factor-dot tone-warning-bg"></div>${counts.warning} cookies expiring in 1h</div>`
      : '',
    wlLen > 0
      ? `<div class="score-factor"><div class="score-factor-dot tone-safe-bg"></div>${wlLen} site${wlLen !== 1 ? 's' : ''} in whitelist</div>`
      : `<div class="score-factor"><div class="score-factor-dot tone-caution-bg"></div>No sites whitelisted</div>`,
    `<div class="score-factor"><div class="score-factor-dot tone-session-bg"></div>${gradeLabels[grade]} privacy posture</div>`
  ].filter(Boolean).join('');
}

function renderStatusChart(counts) {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const segments = [
    { key: 'critical', color: '#f45b5b', label: 'Critical' },
    { key: 'warning',  color: '#f4c44a', label: 'Warning' },
    { key: 'soon',     color: '#4a9ff4', label: 'Soon' },
    { key: 'safe',     color: '#4af497', label: 'Safe' },
    { key: 'session',  color: '#9b8af4', label: 'Session' },
    { key: 'expired',  color: '#555a73', label: 'Expired' },
  ].map(s => ({ ...s, value: counts[s.key] || 0 })).filter(s => s.value > 0);

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 14;
    ctx.stroke();
  } else {
    let startAngle = -Math.PI / 2;
    const cx = W / 2, cy = H / 2;
    const outerR = W / 2 - 6, innerR = outerR * 0.6;
    const gap = 0.04; // radians gap between segments

    for (const seg of segments) {
      const sweep = (seg.value / total) * Math.PI * 2 - (segments.length > 1 ? gap : 0);
      ctx.beginPath();
      ctx.moveTo(cx + outerR * Math.cos(startAngle + gap / 2), cy + outerR * Math.sin(startAngle + gap / 2));
      ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + sweep + gap / 2);
      ctx.arc(cx, cy, innerR, startAngle + sweep + gap / 2, startAngle + gap / 2, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sweep + gap;
    }
  }

  // Legend
  const allSegments = [
    { key: 'critical', color: '#f45b5b', label: 'Critical' },
    { key: 'warning',  color: '#f4c44a', label: 'Warning' },
    { key: 'soon',     color: '#4a9ff4', label: 'Soon' },
    { key: 'safe',     color: '#4af497', label: 'Safe' },
    { key: 'session',  color: '#9b8af4', label: 'Session' },
    { key: 'expired',  color: '#555a73', label: 'Expired' },
  ];

  document.getElementById('statusLegend').innerHTML = allSegments
    .map(s => `
      <div class="legend-item${(counts[s.key] || 0) > 0 ? '' : ' is-muted'}">
        <div class="legend-dot status-${s.key}"></div>
        <span class="legend-label">${s.label}</span>
        <span class="legend-val">${counts[s.key] || 0}</span>
      </div>`)
    .join('');
}

function renderDomainsChart() {
  const domainMap = new Map();
  const trackerDomains = new Set();

  for (const c of allCookies) {
    const d = c.cleanDomain || c.domain;
    domainMap.set(d, (domainMap.get(d) || 0) + 1);
    if (c.isTracker) trackerDomains.add(d);
  }

  const sorted = [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxVal = sorted[0]?.[1] || 1;

  document.getElementById('domainsChart').innerHTML = sorted.map(([domain, count]) => {
    const isTracker = trackerDomains.has(domain);
    return `
      <div class="bar-row">
        <span class="bar-label" title="${esc(domain)}">${esc(domain)}</span>
        <meter class="bar-meter ${isTracker ? 'tracker-bar' : ''}" min="0" max="${maxVal}" value="${count}"></meter>
        <span class="bar-val">${count}</span>
      </div>`;
  }).join('');
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

function exportCookies(format) {
  const cookies = allCookies;

  if (format === 'json') {
    const data = cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expiryStatus: c.expiryStatus,
      expirationDate: c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : null,
      timeUntilExpiryMs: c.timeUntilExpiry,
      isProtected: c.isProtected,
      isTracker: c.isTracker,
      trackerName: c.trackerName || null
    }));
    downloadFile(JSON.stringify(data, null, 2), `scm-cookies-${dateStamp()}.json`, 'application/json');
  } else {
    const headers = ['name', 'domain', 'path', 'secure', 'httpOnly', 'sameSite',
      'expiryStatus', 'expiresAt', 'isProtected', 'isTracker', 'trackerName'];
    const rows = cookies.map(c => [
      csvCell(c.name), csvCell(c.domain), csvCell(c.path),
      c.secure, c.httpOnly, csvCell(c.sameSite),
      csvCell(c.expiryStatus),
      c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : '',
      c.isProtected, c.isTracker, csvCell(c.trackerName || '')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `scm-cookies-${dateStamp()}.csv`, 'text/csv');
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(val) {
  if (val == null) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

// ─── SETTINGS DRAWER ─────────────────────────────────────────────────────────

// ─── THEME ────────────────────────────────────────────────────────────────────

function applyTheme() {
  document.getElementById('app').classList.add('light');
}

// ─── SUGGESTIONS ─────────────────────────────────────────────────────────────

async function checkSuggestions() {
  const toast = document.getElementById('suggestionToast');
  const expiringSoon = allCookies.filter(c =>
    !c.isProtected && (c.expiryStatus === 'critical' || c.expiryStatus === 'warning')
  );
  if (expiringSoon.length === 0) {
    toast.classList.add('hidden');
    toast.dataset.domain = '';
    return;
  }

  const domains = [...new Set(expiringSoon.map(c => c.cleanDomain))];
  const domain = domains[0];

  toast.dataset.domain = domain;
  document.getElementById('suggestionText').textContent =
    `"${domain}" has cookies expiring soon. Protect it?`;
  toast.classList.remove('hidden');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getCurrentDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith('http')) return null;
    return new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ─── HISTORY LOGGING ──────────────────────────────────────────────────────────

async function logToHistory(action, domain, name = null) {
  try {
    const data = await chrome.storage.sync.get('operationHistory');
    const history = data.operationHistory || [];
    
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: action, // 'cleaned', 'protected', 'deleted'
      domain: domain || 'unknown',
      name: name,
      timestamp: Date.now(),
      visitCount: 1,
    };
    
    history.unshift(entry);
    // Keep only last 1000 entries
    const limited = history.slice(0, 1000);
    await chrome.storage.sync.set({ operationHistory: limited });
  } catch (err) {
    console.warn('[SCM] History logging failed:', err);
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

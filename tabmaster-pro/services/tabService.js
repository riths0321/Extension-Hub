/**
 * services/tabService.js
 * Handles all tab querying, grouping, deduplication, and mutations.
 */

const TabService = (() => {

  // ── Queries ───────────────────────────────────────────────────

  /** Return all open tabs across all windows */
  async function getAllTabs() {
    return chrome.tabs.query({});
  }

  /** Return all tabs in the current window */
  async function getCurrentWindowTabs() {
    return chrome.tabs.query({ currentWindow: true });
  }

  /** Return the currently active tab in the focused window */
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  }

  /** Switch to a tab and focus its window */
  async function switchToTab(tabId, windowId) {
    await chrome.tabs.update(tabId, { active: true });
    if (windowId) await chrome.windows.update(windowId, { focused: true });
  }

  // ── Filtering & Sorting ───────────────────────────────────────

  /**
   * Filter tabs by text query and type filter.
   * @param {chrome.tabs.Tab[]} tabs
   * @param {{ query?: string, filter?: 'all'|'pinned'|'audio'|'sleeping'|'duplicate' }} opts
   */
  function filterTabs(tabs, { query = '', filter = 'all' } = {}) {
    const q = query.toLowerCase().trim();

    // Pre-compute duplicate hostnames for the 'duplicate' filter
    let duplicateHostnames = null;
    if (filter === 'duplicate') {
      const counts = {};
      tabs.forEach(t => {
        const h = Helpers.getDomain(t.url);
        if (h) counts[h] = (counts[h] ?? 0) + 1;
      });
      duplicateHostnames = new Set(
        Object.entries(counts).filter(([, c]) => c > 1).map(([h]) => h)
      );
    }

    return tabs.filter(tab => {
      const matchesQuery = !q ||
        (tab.title ?? '').toLowerCase().includes(q) ||
        (tab.url   ?? '').toLowerCase().includes(q);

      let matchesFilter = true;
      switch (filter) {
        case 'pinned':    matchesFilter = tab.pinned;    break;
        case 'audio':     matchesFilter = tab.audible;   break;
        case 'sleeping':  matchesFilter = tab.discarded; break;
        case 'duplicate':
          matchesFilter = duplicateHostnames.has(Helpers.getDomain(tab.url));
          break;
        default: matchesFilter = true;
      }

      return matchesQuery && matchesFilter;
    });
  }

  /**
   * Sort tabs by a given key.
   * @param {chrome.tabs.Tab[]} tabs
   * @param {'title'|'domain'|'recent'|'oldest'} sortKey
   */
  function sortTabs(tabs, sortKey = 'title') {
    return [...tabs].sort((a, b) => {
      switch (sortKey) {
        case 'title':   return (a.title ?? '').localeCompare(b.title ?? '');
        case 'domain':  return Helpers.getDomain(a.url).localeCompare(Helpers.getDomain(b.url));
        case 'recent':  return b.id - a.id;
        case 'oldest':  return a.id - b.id;
        default:        return 0;
      }
    });
  }

  // ── Bulk operations ───────────────────────────────────────────

  /** Close a set of tabs by ID */
  async function closeTabs(tabIds) {
    if (!tabIds.length) return { closed: 0 };
    await chrome.tabs.remove(tabIds);
    return { closed: tabIds.length };
  }

  /** Close all tabs except the active one (optionally in current window only) */
  async function closeAllExceptActive(currentWindowOnly = true) {
    const active = await getActiveTab();
    const all    = currentWindowOnly ? await getCurrentWindowTabs() : await getAllTabs();
    const toClose = all.filter(t => t.id !== active?.id).map(t => t.id);
    return closeTabs(toClose);
  }

  /**
   * Find and close duplicate tabs (keep the first occurrence of each normalized URL).
   * @returns {{ closed: number, kept: number }}
   */
  async function closeDuplicates(tabs) {
    const seen = new Map();
    const toClose = [];
    for (const tab of tabs) {
      const key = normalizeUrl(tab.url);
      if (seen.has(key)) {
        toClose.push(tab.id);
      } else {
        seen.set(key, tab.id);
      }
    }
    if (toClose.length) await chrome.tabs.remove(toClose);
    return { closed: toClose.length, kept: seen.size };
  }

  /** Group a set of tabs by their domain into Chrome tab groups */
  async function groupByDomain(tabs) {
    const byDomain = Helpers.groupBy(
      tabs.filter(t => !Helpers.isInternalUrl(t.url)),
      t => Helpers.getDomain(t.url)
    );
    let groupsCreated = 0;
    const colors = ['blue','red','yellow','green','pink','purple','cyan','grey'];
    let colorIdx = 0;

    for (const [domain, domainTabs] of Object.entries(byDomain)) {
      if (domainTabs.length < 2) continue;
      try {
        const groupId = await chrome.tabs.group({ tabIds: domainTabs.map(t => t.id) });
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: colors[colorIdx % colors.length]
        });
        colorIdx++;
        groupsCreated++;
      } catch { /* skip if grouping fails for this domain */ }
    }
    return { groupsCreated };
  }

  /** Group a specific array of tab IDs */
  async function groupTabs(tabIds, title = '', color = 'blue') {
    if (tabIds.length < 2) return null;
    try {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title, color });
      return groupId;
    } catch { return null; }
  }

  /** Toggle pin state on a set of tabs */
  async function togglePin(tabIds, pinned) {
    await Promise.all(tabIds.map(id => chrome.tabs.update(id, { pinned })));
    return { updated: tabIds.length };
  }

  /** Toggle mute state on a set of tabs */
  async function toggleMute(tabIds, muted) {
    await Promise.all(tabIds.map(id => chrome.tabs.update(id, { muted })));
    return { updated: tabIds.length };
  }

  /** Mute all tabs that are playing audio */
  async function muteAllAudio(tabs) {
    const audible = tabs.filter(t => t.audible);
    const allMuted = audible.every(t => t.mutedInfo?.muted);
    await Promise.all(audible.map(t => chrome.tabs.update(t.id, { muted: !allMuted })));
    return { muted: !allMuted, count: audible.length };
  }

  // ── Serialization (for session saving) ───────────────────────

  /** Serialize tabs to a storable format */
  function serializeTabs(tabs) {
    return tabs
      .filter(t => t.url && !Helpers.isInternalUrl(t.url))
      .map(t => ({
        url:        t.url,
        title:      t.title || t.url,
        favIconUrl: t.favIconUrl || '',
        pinned:     Boolean(t.pinned),
      }));
  }

  // ── Stats ─────────────────────────────────────────────────────

  function computeStats(tabs) {
    const total     = tabs.length;
    const sleeping  = tabs.filter(t => t.discarded).length;
    const active    = total - sleeping;
    const pinned    = tabs.filter(t => t.pinned).length;
    const audible   = tabs.filter(t => t.audible).length;
    const windows   = new Set(tabs.map(t => t.windowId)).size;

    // Rough duplicate count
    const urlCounts = {};
    tabs.forEach(t => { const k = normalizeUrl(t.url); urlCounts[k] = (urlCounts[k] ?? 0) + 1; });
    const duplicates = Object.values(urlCounts).filter(c => c > 1).reduce((s, c) => s + c - 1, 0);

    return {
      total, sleeping, active, pinned, audible,
      windows, duplicates,
      estimatedMemoryMB: Helpers.estimateMemoryMB(active),
      memorySavedMB:     Helpers.estimateMemoryMB(sleeping),
    };
  }

  // ── Internal ──────────────────────────────────────────────────

  function normalizeUrl(url) {
    const parsed = Helpers.parseUrl(url);
    return parsed ? parsed.hostname + parsed.pathname : url;
  }

  return {
    getAllTabs, getCurrentWindowTabs, getActiveTab, switchToTab,
    filterTabs, sortTabs,
    closeTabs, closeAllExceptActive, closeDuplicates,
    groupByDomain, groupTabs, togglePin, toggleMute, muteAllAudio,
    serializeTabs, computeStats,
  };
})();

if (typeof globalThis !== 'undefined') globalThis.TabService = TabService;

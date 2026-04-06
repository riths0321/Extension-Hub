/**
 * background.js — Manifest V3 service worker.
 * Handles: install, context menus, keyboard commands, messaging.
 */

// ──────────────────────────────────────────────
// INSTALL
// ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['qlm_links'], (result) => {
    if (!result.qlm_links) {
      chrome.storage.local.set({ qlm_links: [] });
    }
  });

  // Context menu — right-click on any page or link
  chrome.contextMenus.create({
    id: 'qlm-save-page',
    title: 'Save Page to Quick Links',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'qlm-save-link',
    title: 'Save Link to Quick Links',
    contexts: ['link'],
  });
});

// ──────────────────────────────────────────────
// CONTEXT MENU
// ──────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl;
  if (!url || url.startsWith('chrome://') || url.startsWith('edge://')) return;

  const title = info.menuItemId === 'qlm-save-link'
    ? (info.linkUrl || url)
    : (tab?.title || 'Saved Link');

  _autoSaveLink(url, title);
});

// ──────────────────────────────────────────────
// KEYBOARD SHORTCUT
// ──────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-current-link') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) return;
      _autoSaveLink(tab.url, tab.title || tab.url, true);
    });
  }
});

// ──────────────────────────────────────────────
// MESSAGES from popup
// ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] || null });
    });
    return true;
  }

  if (message.action === 'saveLink') {
    _autoSaveLink(message.url, message.title, false, message.tags, message.note).then((res) => {
      sendResponse(res);
    });
    return true;
  }
});

// ──────────────────────────────────────────────
// SHARED HELPER
// ──────────────────────────────────────────────
async function _autoSaveLink(url, title, showBadge = false, tags = null, note = '') {
  const [{ TaggingService }, { generateId }] = await Promise.all([
    // Inline auto-tag logic (can't import ES modules from SW directly — inline a minimal version)
    Promise.resolve({ TaggingService: { generateTags: _generateTagsInline } }),
    Promise.resolve({ generateId: () => crypto.randomUUID() }),
  ]);

  const autoTags = tags || _generateTagsInline(url, title);

  const newLink = {
    id: crypto.randomUUID(),
    url,
    title: title || url,
    tags: autoTags,
    note: note || '',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    chrome.storage.local.get(['qlm_links'], (result) => {
      const links = result.qlm_links || [];
      if (links.some((l) => l.url === url)) {
        resolve({ success: false, duplicate: true });
        return;
      }
      links.unshift(newLink);
      chrome.storage.local.set({ qlm_links: links }, () => {
        if (showBadge) {
          chrome.action.setBadgeText({ text: '✓' });
          chrome.action.setBadgeBackgroundColor({ color: '#2563EB' });
          setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
        }
        resolve({ success: true, link: newLink });
      });
    });
  });
}

// Minimal inline tag generator (mirrors services/tagging.js logic)
function _generateTagsInline(url, title) {
  const tags = new Set();
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainMap = {
      'github.com': ['dev'], 'stackoverflow.com': ['dev'],
      'notion.so': ['work', 'notes'], 'docs.google.com': ['work', 'docs'],
      'gmail.com': ['work', 'email'], 'mail.google.com': ['work', 'email'],
      'slack.com': ['work', 'chat'], 'linkedin.com': ['social', 'work'],
      'twitter.com': ['social'], 'x.com': ['social'],
      'instagram.com': ['social'], 'facebook.com': ['social'],
      'youtube.com': ['video'], 'netflix.com': ['video'],
      'spotify.com': ['music'], 'amazon.com': ['shopping'],
      'amazon.in': ['shopping'], 'flipkart.com': ['shopping'],
      'figma.com': ['design'], 'medium.com': ['reading'],
    };
    (domainMap[hostname] || []).forEach((t) => tags.add(t));
  } catch (_) { /* ignore */ }

  const t = (title || '').toLowerCase();
  if (t.includes('github') || t.includes('code') || t.includes('repo')) tags.add('dev');
  if (t.includes('design') || t.includes('figma')) tags.add('design');
  if (t.includes('docs') || t.includes('guide')) tags.add('docs');
  if (t.includes('video') || t.includes('watch')) tags.add('video');

  return [...tags].slice(0, 5);
}

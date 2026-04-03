/**
 * utils/helpers.js — Pure utility functions shared across TabMaster Pro.
 */
'use strict';

const Helpers = (() => {
  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + u.pathname.replace(/\/$/, '');
    } catch { return url || ''; }
  }

  function getHostname(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : (fallback !== undefined ? fallback : min);
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function uid() {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, response => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response && response.error) { reject(new Error(response.error)); return; }
        resolve(response);
      });
    });
  }

  function modeToGroupColor(mode) {
    const map = { work: 'blue', study: 'purple', personal: 'green', research: 'orange', custom: 'grey' };
    return map[mode] || 'grey';
  }

  function isSystemUrl(url) {
    if (!url) return true;
    return url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
           url.startsWith('edge://') || url.startsWith('about:') ||
           url === 'about:blank' || url === 'about:newtab';
  }

  return { normalizeUrl, getHostname, timeAgo, clamp, capitalize, uid, debounce, sendMessage, modeToGroupColor, isSystemUrl };
})();

if (typeof globalThis !== 'undefined') globalThis.Helpers = Helpers;

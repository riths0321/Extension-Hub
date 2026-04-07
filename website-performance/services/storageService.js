// services/storageService.js — PerfPro v3.1
// CSP-safe IIFE module wrapping chrome.storage.local
'use strict';

const StorageService = (() => {
  const KEY_THEME   = 'perfpro_theme';
  const KEY_LAST    = 'perfpro_last_analysis';
  const KEY_WELCOME = 'perfpro_welcome_shown';

  /**
   * @param {string} key
   * @returns {Promise<any>}
   */
  function get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get([key], result => resolve(result[key] ?? null));
    });
  }

  /**
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  function set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  return {
    getTheme:        ()    => get(KEY_THEME),
    setTheme:        (val) => set(KEY_THEME, val),
    getLastAnalysis: ()    => get(KEY_LAST),
    setLastAnalysis: (d)   => set(KEY_LAST, d),
    getWelcomeShown: ()    => get(KEY_WELCOME),
    setWelcomeShown: (val) => set(KEY_WELCOME, val)
  };
})();
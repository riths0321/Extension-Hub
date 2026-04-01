/**
 * storage.js — Secure vault storage layer
 * Manages encrypted account data in chrome.storage.local.
 * Never writes plaintext secrets to storage.
 */

const SecureStorage = (() => {
  const VAULT_KEY    = 'totpVault';
  const HASH_KEY     = 'masterHash';
  const SETTINGS_KEY = 'vaultSettings';

  // ── Low-level storage ──────────────────────────────────────────
  function get(keys) {
    return new Promise((res, rej) =>
      chrome.storage.local.get(keys, d =>
        chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(d)
      )
    );
  }
  function set(obj) {
    return new Promise((res, rej) =>
      chrome.storage.local.set(obj, () =>
        chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()
      )
    );
  }
  function remove(keys) {
    return new Promise((res, rej) =>
      chrome.storage.local.remove(keys, () =>
        chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()
      )
    );
  }

  // ── Vault operations ───────────────────────────────────────────

  /** Returns true if master password has been set */
  async function isInitialized() {
    const d = await get(HASH_KEY);
    return !!d[HASH_KEY];
  }

  /** Set master password for the first time */
  async function initVault(password) {
    const hash = await CryptoLayer.hashPassword(password);
    const emptyVault = await CryptoLayer.encrypt(JSON.stringify([]), password);
    await set({ [HASH_KEY]: hash, [VAULT_KEY]: emptyVault });
  }

  /** Verify master password, return bool */
  async function unlock(password) {
    const d = await get(HASH_KEY);
    if (!d[HASH_KEY]) return false;
    return CryptoLayer.verifyPassword(password, d[HASH_KEY]);
  }

  /** Load and decrypt accounts array */
  async function loadAccounts(password) {
    const d = await get(VAULT_KEY);
    if (!d[VAULT_KEY]) return [];
    const json = await CryptoLayer.decrypt(d[VAULT_KEY], password);
    return JSON.parse(json);
  }

  /** Encrypt and save accounts array */
  async function saveAccounts(accounts, password) {
    const encrypted = await CryptoLayer.encrypt(JSON.stringify(accounts), password);
    await set({ [VAULT_KEY]: encrypted });
  }

  /** Export full encrypted backup blob (JSON string) */
  async function exportBackup(password) {
    const d = await get([VAULT_KEY, HASH_KEY, SETTINGS_KEY]);
    const blob = {
      version: 2,
      exportedAt: Date.now(),
      vault: d[VAULT_KEY],
      hash: d[HASH_KEY],
      settings: d[SETTINGS_KEY] || {}
    };
    // Double-wrap the blob with export password
    return CryptoLayer.encrypt(JSON.stringify(blob), password);
  }

  /** Import encrypted backup blob */
  async function importBackup(encryptedBlob, password) {
    const json = await CryptoLayer.decrypt(encryptedBlob, password);
    const blob = JSON.parse(json);
    if (!blob.vault || !blob.hash) throw new Error('Invalid backup format');
    await set({
      [VAULT_KEY]: blob.vault,
      [HASH_KEY]: blob.hash,
      [SETTINGS_KEY]: blob.settings || {}
    });
    return true;
  }

  /** Save settings (auto-lock timeout, etc.) */
  async function saveSettings(settings) {
    return set({ [SETTINGS_KEY]: settings });
  }
  async function loadSettings() {
    const d = await get(SETTINGS_KEY);
    return d[SETTINGS_KEY] || { autoLockMinutes: 5, autoCopy: true };
  }

  /** Wipe entire vault */
  async function wipeVault() {
    return remove([VAULT_KEY, HASH_KEY, SETTINGS_KEY]);
  }

  return {
    isInitialized, initVault, unlock,
    loadAccounts, saveAccounts,
    exportBackup, importBackup,
    saveSettings, loadSettings,
    wipeVault
  };
})();

if (typeof module !== 'undefined') module.exports = SecureStorage;

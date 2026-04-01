/**
 * crypto.js — AES-GCM encryption layer
 * All TOTP secrets are encrypted with AES-256-GCM before storage.
 * Master password → PBKDF2 → AES-GCM key → encrypt/decrypt secrets.
 */

const CryptoLayer = (() => {
  const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 recommendation
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  // ── Key Derivation ──────────────────────────────────────────────
  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const raw = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ── Utility ─────────────────────────────────────────────────────
  function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function b64ToBuf(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Encrypt plaintext with password. Returns a compact storable string:
   * base64(salt):base64(iv):base64(ciphertext)
   */
  async function encrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key  = await deriveKey(password, salt);
    const enc  = new TextEncoder();
    const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    return [bufToB64(salt), bufToB64(iv), bufToB64(ct)].join(':');
  }

  /**
   * Decrypt a token produced by encrypt(). Throws on wrong password.
   */
  async function decrypt(token, password) {
    const [saltB64, ivB64, ctB64] = token.split(':');
    const salt = b64ToBuf(saltB64);
    const iv   = b64ToBuf(ivB64);
    const ct   = b64ToBuf(ctB64);
    const key  = await deriveKey(password, salt);
    const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  }

  /**
   * Hash the master password for quick vault-unlock verification.
   * Stores: base64(salt):base64(hash)
   */
  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key  = await deriveKey(password, salt);
    // Export a derivative to use as verifier (not the key itself)
    const verify = await crypto.subtle.exportKey('raw',
      await crypto.subtle.importKey('raw',
        await crypto.subtle.exportKey('raw', key).catch(() => new Uint8Array(32)),
        'PBKDF2', false, ['deriveKey']
      ).catch(() => key)
    ).catch(() => new Uint8Array(32));
    // Simpler: just encrypt a known sentinel
    const sentinel = await encrypt('TOTP_PRO_SENTINEL', password);
    return sentinel; // reuse encrypt for verification
  }

  /**
   * Verify a password against a stored hash (sentinel).
   */
  async function verifyPassword(password, stored) {
    try {
      const result = await decrypt(stored, password);
      return result === 'TOTP_PRO_SENTINEL';
    } catch {
      return false;
    }
  }

  return { encrypt, decrypt, hashPassword, verifyPassword };
})();

if (typeof module !== 'undefined') module.exports = CryptoLayer;

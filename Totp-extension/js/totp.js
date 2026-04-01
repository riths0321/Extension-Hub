/**
 * totp.js — RFC 6238 / RFC 4226 compliant TOTP engine
 * Supports SHA-1 (default), SHA-256, SHA-512, and 6/8 digit codes.
 */

class TOTP {
  constructor() {
    this.DIGITS_POWER = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000];
  }

  base32ToBytes(base32) {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
    let bits = '';
    for (let i = 0; i < base32.length; i++) {
      const val = CHARS.indexOf(base32[i]);
      if (val === -1) throw new Error(`Invalid base32 char: ${base32[i]}`);
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  }

  counterToBuffer(counter) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setBigUint64(0, BigInt(counter));
    return buf;
  }

  async generateTOTP(secret, { timeStep = 30, digits = 6, algorithm = 'SHA-1' } = {}) {
    try {
      const keyBytes = this.base32ToBytes(secret);
      const counter  = Math.floor(Date.now() / 1000 / timeStep);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'HMAC', hash: algorithm }, false, ['sign']
      );
      const hmacBuf = await crypto.subtle.sign('HMAC', cryptoKey, this.counterToBuffer(counter));
      const hmac = new Uint8Array(hmacBuf);
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary = ((hmac[offset] & 0x7f) << 24) |
                     (hmac[offset + 1] << 16) |
                     (hmac[offset + 2] << 8) |
                      hmac[offset + 3];
      const otp = binary % this.DIGITS_POWER[digits];
      return otp.toString().padStart(digits, '0');
    } catch (err) {
      console.error('TOTP generation failed:', err);
      return null;
    }
  }

  getTimeRemaining(timeStep = 30) {
    return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
  }

  getProgress(timeStep = 30) {
    return (this.getTimeRemaining(timeStep) / timeStep) * 100;
  }

  /** Parse otpauth:// URI — returns { name, secret, issuer, digits, timeStep, algorithm } */
  parseOtpAuth(uri) {
    if (!uri.startsWith('otpauth://totp/')) throw new Error('Not a valid otpauth URI');
    const url = new URL(uri);
    const label   = decodeURIComponent(url.pathname.slice(7)); // strip /totp/
    const params  = url.searchParams;
    const secret  = params.get('secret');
    if (!secret) throw new Error('Missing secret in URI');
    const issuer  = params.get('issuer') || '';
    const digits  = parseInt(params.get('digits') || '6', 10);
    const period  = parseInt(params.get('period') || '30', 10);
    const algo    = (params.get('algorithm') || 'SHA1').replace('SHA', 'SHA-');
    // label may be "issuer:account" or just "account"
    const colonIdx = label.indexOf(':');
    const name    = colonIdx >= 0 ? label.slice(colonIdx + 1) : label;
    const labelIssuer = colonIdx >= 0 ? label.slice(0, colonIdx) : '';
    return {
      name:      name.trim(),
      secret:    secret.replace(/\s/g, '').toUpperCase(),
      issuer:    issuer || labelIssuer,
      digits,
      timeStep:  period,
      algorithm: algo
    };
  }
}

if (typeof module !== 'undefined') module.exports = TOTP;

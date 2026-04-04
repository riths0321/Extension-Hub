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
    
    // Clean up the input
    base32 = base32.trim().toUpperCase();
    
    // Remove common formatting characters: spaces, hyphens, dots, underscores, padding
    base32 = base32.replace(/[\s\-\.=_]/g, '');
    
    // Remove padding characters (=)
    base32 = base32.replace(/=+$/, '');
    
    // Validate length (base32 should be multiple of 8 after removing padding)
    if (base32.length === 0) {
      throw new Error('Empty secret key');
    }
    
    // Validate each character
    for (let i = 0; i < base32.length; i++) {
      if (CHARS.indexOf(base32[i]) === -1) {
        throw new Error(`Invalid character '${base32[i]}' at position ${i + 1}. Only A-Z and 2-7 are allowed.`);
      }
    }
    
    // Convert base32 to bits
    let bits = '';
    for (let i = 0; i < base32.length; i++) {
      const val = CHARS.indexOf(base32[i]);
      bits += val.toString(2).padStart(5, '0');
    }
    
    // Convert bits to bytes
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    
    if (bytes.length === 0) {
      throw new Error('Secret key too short');
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
      // Validate and decode secret
      const keyBytes = this.base32ToBytes(secret);
      
      // Check minimum key length (at least 10 bytes for security)
      if (keyBytes.length < 10) {
        console.error('Secret key too short:', keyBytes.length, 'bytes');
        return null;
      }
      
      const counter  = Math.floor(Date.now() / 1000 / timeStep);
      
      // Import the key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'HMAC', hash: algorithm }, false, ['sign']
      );
      
      // Generate HMAC
      const hmacBuf = await crypto.subtle.sign('HMAC', cryptoKey, this.counterToBuffer(counter));
      const hmac = new Uint8Array(hmacBuf);
      
      // Dynamic truncation (RFC 4226)
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary = ((hmac[offset] & 0x7f) << 24) |
                     (hmac[offset + 1] << 16) |
                     (hmac[offset + 2] << 8) |
                      hmac[offset + 3];
      
      const otp = binary % this.DIGITS_POWER[digits];
      return otp.toString().padStart(digits, '0');
    } catch (err) {
      console.error('TOTP generation failed:', err.message, err);
      return null;
    }
  }

  getTimeRemaining(timeStep = 30) {
    return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
  }

  getProgress(timeStep = 30) {
    return (this.getTimeRemaining(timeStep) / timeStep) * 100;
  }

  /** Validate base32 secret without generating code */
  validateSecret(secret) {
    try {
      const bytes = this.base32ToBytes(secret);
      if (bytes.length < 10) {
        return { valid: false, error: 'Secret key is too short (minimum 16 characters)' };
      }
      return { valid: true, length: bytes.length };
    } catch (err) {
      return { valid: false, error: err.message };
    }
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

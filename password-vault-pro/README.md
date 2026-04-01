# Password Vault Pro

A local‑first password manager Chrome extension with AES‑256 encryption, master password protection, generator, breach checks, and a health dashboard. Built for MV3 with strict CSP and no remote fonts.

## Features
- AES‑256‑GCM encrypted vault (local only)
- PBKDF2 master password hashing
- Password generator (random + passphrase)
- Breach check via HIBP API
- Health dashboard (weak/reused/old/breached)
- Auto‑fill into active tab
- Import/Export JSON backups
- Forgot master password reset flow

## Tech & Security
- MV3 compliant (service worker background)
- CSP‑safe UI (no inline scripts, no eval)
- Local fonts (`fonts/Manrope-*.ttf`)
- No cloud sync; storage is local only

## Install (Dev)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `password-vault-pro` folder

## How to Use
1. Open the extension popup
2. Set a master password (min 8 chars)
3. Add passwords from the Vault tab
4. Use Generator/Health tabs as needed

## Reset (Forgot Master Password)
If the master password is forgotten, you can reset the vault:
- Lock screen → **Forgot master password? Reset vault**
- Type `RESET` + confirm checkbox → Reset Vault

> Reset deletes all stored passwords on this device.

## CSP Notes
Current CSP (extension pages):
- `default-src 'self'`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'` (inline styles used in HTML)
- `font-src 'self'`
- `img-src 'self' data:`
- `connect-src https://api.pwnedpasswords.com`

If you want to remove `'unsafe-inline'`, we can move remaining inline styles into CSS.

## Files
- `popup.html`, `popup.css`, `popup.js` — UI
- `dropdowns.js` — custom dropdowns
- `background.js` — clipboard clear scheduler
- `content.js` — autofill helper
- `manifest.json` — MV3 manifest

## License
Internal / project use. Add a license if you plan to distribute publicly.

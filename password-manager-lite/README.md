# 🔐 Password Manager Lite

A secure, local password manager browser extension that stores your passwords encrypted on your device. No cloud storage, no subscriptions — just simple, hardened password management.

## ✨ Features

### 🔒 Security First
- **AES-256-GCM Encryption** — Military-grade authenticated encryption for all vault data
- **PBKDF2 Master Password Hashing** — 100,000 iterations with random salt (not SHA-256)
- **Constant-Time Verification** — Prevents timing-based side-channel attacks
- **Local Storage Only** — Your data never leaves your device
- **Memory Auto-Clear** — Plaintext passwords cleared from memory on lock or popup close
- **No Window Exposure** — Manager not attached to `window` object; inaccessible to other scripts

### 💾 Password Management
- **Save Passwords** — Store website, username, password, and notes
- **One-Click Copy** — Copy username or password to clipboard instantly
- **Search & Filter** — Find any password in real time
- **Edit & Delete** — Full control over your entries
- **Import / Export** — Backup and restore your vault as JSON (with confirm dialog before export)

### 🎨 User Experience
- **Dark Glassmorphism Theme** — Navy + gold luxury aesthetic
- **Password Strength Indicator** — Visual feedback: Weak / Medium / Strong
- **Letter Avatar** — Deterministic color + initial rendered locally (no Google favicons, no remote requests)
- **Toast Notifications** — Feedback for every action
- **Auto-detect Website** — Fills hostname from your active tab when adding a password
- **Details View** — Reveal/copy password inline without editing
- **Export Confirmation** — Warns you the backup is plain-text before downloading

## 🚀 Installation

### Load Unpacked (Developer Mode)
1. Download or clone this repository
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `password-manager` folder
6. Pin the extension to your toolbar

### Keyboard Shortcut
`Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) opens the vault directly.

## 📖 How to Use

### First Time Setup
1. Click the Password Manager icon in your toolbar
2. Enter a strong master password (minimum 8 characters — 12+ recommended)
3. Press **Unlock Vault** — this sets and saves your master password
4. Remember it — it cannot be recovered

### Adding Passwords
1. Click **Add Password**
2. Website is auto-filled from your active tab — edit if needed
3. Enter your username/email and password
4. Optionally add notes
5. Click **Save Password**

### Using Saved Passwords
1. Use the search bar to filter by site or username
2. **Click a card** to open the Details view
3. Use the action buttons (🔑 Copy pw / 👤 Copy user / ✏️ Edit / 🗑️ Delete) on hover
4. Paste where needed

### Backup & Restore
- **Export** — Downloads a plain-text JSON backup (confirmation required)
- **Import** — Merges a JSON backup into your vault (no duplicate IDs)

## 🔧 Technical Details

### Browser Compatibility
- ✅ Chrome 114+
- ✅ Edge 114+
- ✅ Brave 1.50+
- ✅ Opera 100+

### File Structure
```
password-manager/
├── manifest.json     # MV3 config with strict CSP
├── popup.html        # Main interface
├── popup.css         # Styles (glassmorphism, animations)
├── popup.js          # Core logic — crypto, storage, UI
├── background.js     # Service worker
├── content.js        # Auto-fill helper
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Security Implementation

| Layer | Method | Detail |
|---|---|---|
| Vault encryption | AES-256-GCM | Authenticated, unique IV per save |
| Key derivation | PBKDF2 | 100,000 iterations, SHA-256, 16-byte salt |
| Master pw storage | PBKDF2 hash | Salted, NOT raw SHA-256 |
| Verification | Constant-time compare | Bitwise XOR over all bytes |
| Memory | Cleared on lock/close | `passwords` array zeroed, master pw nulled |
| Script exposure | None | `new PasswordManager()` — not on `window` |
| Favicons | Canvas letter avatars | No remote requests, no CSP violations |
| CSP | Strict `script-src 'self'` | No inline JS, no unsafe-eval |

## 🛡️ Privacy & Security

### What We Do NOT Collect
- ❌ No personal information
- ❌ No browsing history
- ❌ No usage analytics
- ❌ No cloud synchronization
- ❌ No third-party requests (not even favicons)

### What We Do
- ✅ All encryption happens locally in the browser
- ✅ Master password never stored in plaintext
- ✅ Vault data encrypted before hitting storage
- ✅ No internet connection required
- ✅ Memory cleared when popup closes

### Security Best Practices
1. Use a **strong master password** (12+ characters, mixed types)
2. **Export a backup** right after setup and store it securely
3. **Lock the vault** when not in use
4. Keep your browser updated
5. Only use on trusted devices

## 🔄 Import / Export Format

```json
[
  {
    "id": "unique-id",
    "website": "example.com",
    "username": "user@example.com",
    "password": "your-password",
    "notes": "Optional notes",
    "createdAt": "2024-01-29T10:30:00.000Z",
    "updatedAt": "2024-01-29T10:30:00.000Z"
  }
]
```

> ⚠️ Export files contain **decrypted** passwords. Store them safely and never share them.

## 📝 Changelog

### v2.0.0 (Current)
- 🔐 Replaced SHA-256 master password hash with salted PBKDF2
- 🔐 Added constant-time comparison to prevent timing attacks
- 🔐 Memory cleared on popup close and vault lock
- 🔐 Removed `window.pm` exposure
- 🔐 Removed Google favicon API (privacy + CSP fix)
- 🔐 Removed all inline `onerror` handlers (CSP fix)
- 🔐 Added export confirmation dialog
- ✨ Canvas letter avatars replace remote favicons
- ✨ Full DOM-based card rendering (no `innerHTML` with user data)
- ✨ New Details modal with inline reveal / copy
- ✨ Custom delete confirmation modal (no browser `confirm()`)
- ✨ Luxury dark glassmorphism UI

### v1.0.0
- Initial release with AES-256-GCM encryption
- Master password protection
- Import/export, search, dark theme

## ⚠️ Important Notes

### Before Using
1. **Set a strong master password** — cannot be recovered if forgotten
2. **Export a backup immediately** after setup
3. **Test with a dummy entry** before migrating real passwords
4. **Export regularly** to keep your backup current

### If You Forget Your Master Password
1. Your encrypted data cannot be decrypted without it
2. Clear extension storage: `chrome://extensions` → Details → Clear storage
3. Import from your last backup file
4. Set a new master password

## ❓ FAQ

**Q: Is my data safe?**  
All encryption and decryption runs locally. Nothing is sent to any server.

**Q: What if I forget my master password?**  
It cannot be recovered. Keep a backup export and your master password in a safe place.

**Q: Can I use this on multiple computers?**  
Yes — export from one device, import on another.

**Q: Why no favicons from Google?**  
Fetching favicons from `https://www.google.com/s2/favicons` leaks which sites you have saved and violates a strict CSP. We use locally-rendered letter avatars instead.

**Q: Why was the master password hashing changed in v2?**  
v1 used raw SHA-256 which is very fast — an attacker who accesses your storage could brute-force it quickly. v2 uses PBKDF2 with 100,000 iterations and a random salt, making offline attacks vastly harder.

## 📄 License

MIT License

---

*Built for the privacy-conscious user. Your passwords stay yours.*
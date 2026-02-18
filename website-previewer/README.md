# 🚀 Website Preview Pro

Website Preview Pro is a modern, production-ready **Chrome Extension** (Manifest V3) that lets you instantly preview any website as a live screenshot — with support for **mobile & desktop views**, **dark/light mode**, **current tab detection**, **history tracking**, and **clipboard copy**.

---

## ✨ Features

### 🔍 Instant Website Preview
- Generate a live screenshot preview of any website
- Automatically normalizes URLs (adds `https://` and `.com` where needed)
- Press **Enter** or click **Preview** to generate

### 👁 Current Tab Preview
- Click **Current Tab** to instantly load and preview the site you're already on
- Automatically skips browser-internal pages (`chrome://`)

### 📱 Responsive Device Modes
- **Desktop Preview** (1280 × 800)
- **Mobile Preview** (375 × 667)
- One-click toggle between 💻 Desktop and 📱 Mobile modes

### 🌙 Dark / Light Mode
- Built-in theme toggle with sun/moon icon switch
- Theme preference saved automatically across sessions

### 📜 History Tracking
- Saves last 10 previewed websites with favicons
- Click any history item to instantly reload its preview
- Duplicate URLs are moved to the top instead of duplicated
- **Clear All** button fully resets history and preview

### 🖼 Copy Screenshot
- Copy the preview image directly to clipboard
- Uses `canvas` + `navigator.clipboard.write()` — fully MV3 compatible

### ⚡ Cache-Busted Fresh Previews
- Always loads a fresh screenshot using timestamp-based cache busting
- No stale previews

### 🎨 Premium UI
- Glassmorphism design with animated background blobs
- Dark-first theme with full light mode support
- `DM Sans` + `JetBrains Mono` typography
- Animated status badge (Loading / Ready / Failed)
- Hover-to-expand preview image

---

## 📦 Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `website-preview-pro` folder
6. The extension icon will appear in your toolbar — pin it for quick access

---

## 🚀 Quick Start

1. Click the extension icon in your Chrome toolbar
2. **Option A:** Type any URL or domain (e.g. `github.com`) and press **Preview**
3. **Option B:** Click **Current Tab** to instantly preview the page you're on
4. Toggle between 💻 Desktop and 📱 Mobile preview modes
5. Use **Copy Image** to save the screenshot to clipboard
6. Click **Open Site** to open the URL in a new tab
7. Click any item in **Recent** history to re-preview it

---

## 🛠 Technical Details

### Permissions Used
| Permission | Why |
|---|---|
| `tabs` | Read the active tab's URL for Current Tab feature |
| `storage` | Save dark mode preference and history |
| `clipboardWrite` | Copy screenshot image to clipboard |
| `clipboardRead` | Required alongside clipboardWrite in MV3 |

### APIs Used
- `chrome.tabs.query` — get active tab URL
- `chrome.storage.local` — persist settings and history
- `navigator.clipboard.write()` — MV3-safe clipboard copy
- [thum.io](https://thum.io) — website screenshot service

### CSP Compliance
- Zero `innerHTML` with dynamic content — all DOM manipulation uses safe APIs (`createElement`, `textContent`, `appendChild`)
- Strict `script-src 'self'` enforced in `manifest.json`

### Browser Compatibility
- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

---

## 📁 Project Structure

```
website-preview-pro/
├── manifest.json       # MV3 extension config + permissions + CSP
├── popup.html          # Main UI — device toggle, input, preview, history
├── popup.js            # All logic — CSP-safe, current tab, copy, history
├── style.css           # Premium glassmorphism dark/light theme
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔄 Changelog

### v2.3 (Latest)
- ✅ Fixed all Chrome CSP violations — zero `innerHTML` with HTML strings
- ✅ Added **Current Tab** button — auto-fetches active tab URL
- ✅ Fixed device toggle (Mobile/Desktop) — was wired to missing HTML elements
- ✅ Fixed Copy Image button — had no click handler in previous version
- ✅ Fixed `openSite` and `copyBtn` never becoming visible after preview loaded
- ✅ Fixed dark mode icon not switching between sun/moon
- ✅ Added `tabs` permission to manifest (was missing, breaking Current Tab)
- ✅ Added history favicons via Google Favicon API
- ✅ Added animated status badge (Loading / Ready / Failed)
- ✅ Added Enter key support on URL input
- ✅ Duplicate history URLs now move to top instead of duplicating
- ✅ Premium UI redesign — glassmorphism, animated blobs, DM Sans + JetBrains Mono

### v2.2
- Responsive device mode toggle (Mobile / Desktop)
- Dark mode with local storage persistence
- History tracking (last 10 URLs)
- Clear history button
- thum.io screenshot API with timestamp cache-busting

---

## 🔒 Privacy

- No data is sent to external servers except screenshot requests to [thum.io](https://thum.io)
- All history and preferences are stored **locally** in your browser via `chrome.storage.local`
- No analytics, no tracking, no accounts required

---

## 📄 License

MIT License — free to use, modify, and distribute.
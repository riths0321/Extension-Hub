# 📘 README.md Generator — Chrome Extension

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)
![Privacy](https://img.shields.io/badge/tracking-none-success.svg)

> A fast, modern, privacy-focused Chrome Extension that generates professional `README.md` files instantly from project descriptions. Runs **100% locally** — no servers, no data collection, no API keys.

---

## ✨ Features

- **⚡ Instant README Generation** — Paste your description, hit Generate, get a fully formatted README in seconds
- **🧩 3 Templates** — Standard, Minimal, and Full Pro (with ToC, badges, Contributing section, code blocks)
- **🏷️ License Picker** — MIT, Apache 2.0, GPL 3.0, ISC, or None — reflected in every generated README
- **📋 Smart Extraction** — Automatically pulls title and feature bullet points from your description
- **📥 Copy & Download** — Copy to clipboard or download as `README.md` in one click
- **💾 Persistent Prefs** — Template and license choices saved via `chrome.storage.sync`
- **🔒 Zero Tracking** — Everything runs in-browser; nothing is ever transmitted

---

## 📂 Project Structure

```
README-Generator/
├── manifest.json       # MV3 manifest with CSP
├── popup.html          # Extension popup UI
├── popup.css           # Dark navy theme, Sora + JetBrains Mono fonts
├── popup.js            # Core logic (CSP-compliant, no eval/inline handlers)
├── privacy.html        # Privacy policy page
├── options.html        # Options page (theme/template/reset)
├── options.css
├── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🧠 How It Works

**1. Enter Project Description**
Paste your project details into the textarea (minimum 30 characters). A live counter shows your progress.

**2. Choose Template & License**
Pick from Standard, Minimal, or Full Pro templates. Select your preferred license from the dropdown.

**3. Generate**
Click **GENERATE README →** to instantly produce a formatted Markdown README in the preview panel.

**4. Export**
- **Copy** — copies the Markdown text to your clipboard
- **Download** — saves `README.md` directly to your machine

---

## 📜 Templates

| Template | Description |
|----------|-------------|
| **Standard** | Title, description, features, installation, usage, license |
| **Minimal** | Title, description, features, license — clean and lean |
| **Full Pro** | All of Standard + ToC, badges, overview callout, contributing guide, code blocks |

---

## 🚀 Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the project folder

---

## 🔐 Content Security Policy

This extension is fully MV3 CSP-compliant:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
}
```

- No `eval()` or `new Function()`
- No inline event handlers (`onclick`, etc.)
- No external scripts
- Google Fonts whitelisted for UI typography only

---

## 🛠 Technologies

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, transitions, scrollbar styling
- **JavaScript (ES6+)** — DOM API, Blob, clipboard, chrome.storage
- **Chrome Storage API** — Sync preferences across devices
- **Manifest V3** — Modern extension architecture

---

## 🌟 Future Enhancements

- [ ] AI-powered description improvement suggestions
- [ ] More README templates (library, CLI tool, API, mobile app)
- [ ] GitHub badge auto-generator
- [ ] Local template library (save your own templates)
- [ ] Dark/Light theme toggle

---

## 📄 License

MIT — open-source and free to modify. See `LICENSE` for details.
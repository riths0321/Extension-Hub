# 🎨 Icon Finder Pro (Chrome Extension)

Extract **SVG and image icons** from any website with a single click.  
Icon Finder Pro helps developers and designers quickly discover, preview, copy, and download icons used on web pages.

---

## 🚀 Features

- 🔍 **Scan Any Website**
  - Detects SVG icons, `<img>` icons, background images, and masked icons
  - Supports Shadow DOM and pseudo-elements (`::before`, `::after`)

- 🧩 **Multiple Icon Sources**
  - Inline SVGs
  - SVG sprites (`<use>` references)
  - PNG / WebP / GIF / ICO images
  - CSS background & mask images

- 👁️ **Live Preview Grid**
  - Clean card-based preview
  - Transparent background checkerboard
  - Dark & light mode support (auto)

- 📋 **One-Click Actions**
  - Copy SVG code or image URL
  - Download individual icons
  - Download all found media in bulk

- 🎯 **Filters**
  - Toggle SVG icons
  - Toggle image icons (PNG/WebP/etc.)

---

## 🛠️ Tech Stack

- **JavaScript (Vanilla)** – Core logic
- **HTML5 / CSS3** – Popup UI
- **Chrome Extension (Manifest V3)**
---

## 📂 Folder Structure

icon-finder-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
├── icon16.png
├── icon48.png
└── icon128.png


---

## ⚙️ Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked**
5. Select the project folder

The extension icon will appear in your toolbar 🎉

---

## 🧠 How It Works

1. Click **Scan Page**
2. The content script traverses:
   - DOM elements
   - Shadow DOM
   - SVG sprites
   - CSS background & mask images
3. Valid icons are collected, de-duplicated, and displayed
4. Icons can be:
   - Previewed
   - Copied
   - Downloaded individually
   - Downloaded together in bulk

---

## 🔐 Permissions Explained

| Permission | Why it’s needed |
|----------|-----------------|
| `activeTab` | Scan the currently open website |
| `downloads` | Save icons and exported files |
| `storage` | Remember popup preferences over time |
| `<all_urls>` | Allow scanning on any website |

All processing happens **locally** in your browser.

---

## 🔒 Privacy Policy

- ✅ No tracking
- ✅ No analytics
- ✅ No external servers
- ✅ No data uploads

Everything stays on your machine.

---

## 🧪 Limitations

- Cannot scan `chrome://`, `edge://`, or system pages
- Very large images (>512px) are skipped intentionally
- Login-protected or iframe-restricted content may be inaccessible

---

## 📸 Screenshots

*(Add screenshots here for Chrome Web Store or GitHub preview)*

---

## 📄 License

MIT License  
You are free to use, modify, and distribute this project.

---

## 👨‍💻 Author

**Icon Finder Pro**  
Built for developers & designers who value speed and clarity.

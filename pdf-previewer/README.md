# 📄 PDF Previewer Pro — Chrome Extension v2.0

A premium, feature-rich Chrome Extension for previewing PDF files instantly — locally and offline. Completely redesigned with a sleek dark glass-noir UI and advanced new capabilities.

---

## ✨ New Features in v2.0

### 📥 Drag & Drop
Drag any PDF file directly onto the popup — no need to click browse.

### 🌐 URL Loading
Paste any public PDF URL and load it directly into the viewer. Supports any publicly accessible PDF link.

### 🕐 Recent Files
Automatically tracks your last 6 opened PDFs. Click any recent item to reload URL-based PDFs instantly. Clear history with one click.

### 🔍 Zoom Controls
- Zoom In / Zoom Out (25% steps in popup, 15% steps in fullscreen)
- Reset to 100% with one click
- Keyboard shortcuts in fullscreen: `Ctrl +`, `Ctrl -`, `Ctrl 0`

### 🌙 Dark / Light Theme
Toggle between a sleek dark glass-noir theme and a clean light theme. Theme preference is saved across sessions.

### 📂 File Info Bar
Displays the loaded file's name and size whenever a PDF is active.

### 🗑️ Clear PDF
Remove the current PDF and return to the upload screen with one click.

### 🖥️ Enhanced Fullscreen Viewer
Dedicated full-page viewer with:
- Its own toolbar (zoom, theme, close)
- Document title display
- Loading animation
- Full keyboard zoom shortcuts

### 💾 Session Persistence
When you reopen the popup, your last loaded local PDF is automatically restored.

---

## 🎨 UI Design

The extension uses a **glass-noir aesthetic**:
- Deep charcoal/navy backgrounds with frosted glass panels
- Amber/gold accent color system
- `Syne` display typeface + `DM Mono` for file metadata
- Smooth transitions, hover animations, and toast notifications

---

## 📂 Project Structure

```
PDF-Previewer/
├── manifest.json       ← MV3 config with storage, tabs, downloads
├── background.js       ← Service worker
├── popup.html          ← Main popup UI
├── popup.css           ← Glass-noir design system
├── popup.js            ← All popup features & logic
├── viewer.html         ← Fullscreen viewer page
├── viewer.css          ← Viewer styles
├── viewer.js           ← Viewer logic (zoom, theme, load)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load Unpacked**
4. Select the `PDF-Previewer` folder
5. The extension appears in your Chrome toolbar ✅

---

## 🧠 How It Works

| Feature | Method |
|---|---|
| Local file preview | `URL.createObjectURL()` → `<embed>` |
| Fullscreen transfer | Base64 via `chrome.storage.local` |
| URL loading | `fetch()` PDF bytes → Blob/Data URL → `<embed src>` |
| Zoom | CSS `transform: scale()` |
| Recent files | `chrome.storage.local` JSON array |
| Theme | `chrome.storage.local` + CSS class on `<body>` |
| Session restore | Base64 stored → Blob URL rebuilt on popup open |

---

## 🔧 Technologies

- HTML5, CSS3, Vanilla JavaScript
- Chrome Extension Manifest V3
- Chrome Storage API
- Chrome Tabs API
- Chrome Native PDF Viewer (`<embed>`)
- CSS Custom Properties (design tokens)
- Google Fonts (Syne, DM Mono)

---

## 📄 License

MIT — free to use and modify.

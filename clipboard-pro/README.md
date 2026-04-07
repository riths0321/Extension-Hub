# 📋 Clipboard History Manager

> A smart, fast, and privacy-first clipboard workspace — built as a Chrome Extension (Manifest V3).

![Version](https://img.shields.io/badge/version-2.0.0-2563EB?style=flat-square)
![MV3](https://img.shields.io/badge/Manifest-V3-22c55e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-6B7280?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Smart Detection** | Auto-detects type: URL, Email, Code, or Text |
| 📌 **Pin / Favorites** | Pin important items so they never get lost |
| 🏷️ **Tagging** | Add tags to items, filter by tag |
| 🔍 **Fuzzy Search** | Fast fuzzy search across content and tags |
| ⚡ **Quick Actions** | Copy, Edit, Open (URLs), Pin, Delete — on hover |
| ⌨️ **Keyboard Nav** | Arrow keys, Enter to copy, Ctrl+F to search |
| 🧹 **Auto Cleanup** | Configurable auto-delete after N days |
| 📤 **Export / Import** | JSON backup and restore |
| 🖱️ **Right-Click Menu** | Select any text → right-click → Save to Clipboard History |

---

## 🚀 Installation (Developer Mode)

1. **Download** and unzip `clipboard-pro.zip`
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `clipboard-pro` folder
6. Done! The 📋 icon appears in your toolbar

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + V` | Open the popup |
| `Ctrl + Shift + C` | Save selected text from any page |
| `Ctrl + F` | Focus search inside popup |
| `↑` / `↓` | Navigate the clipboard list |
| `Enter` | Copy the focused item |
| `Esc` | Close modal / blur search |

> On macOS, replace `Ctrl` with `Cmd`.

---

## 🖱️ Right-Click Menu

Select any text on any webpage → right-click → **"📋 Save to Clipboard History"**

The selected text is instantly saved to your history.

---

## 🗂️ Project Structure

```
clipboard-pro/
├── manifest.json              ← MV3 config, permissions, shortcuts
├── background.js              ← Service worker: context menu, message router, alarms
├── content.js                 ← Captures copy/cut events on every page
│
├── services/
│   ├── storage.js             ← All chrome.storage I/O (single source of truth)
│   └── clipboard.js           ← Type detection, history mutations, export/import
│
├── utils/
│   └── helpers.js             ← Fuzzy search, timeAgo, DOM helpers (createElement only)
│
├── ui/
│   ├── popup.html             ← Semantic HTML, 3 modals (Settings, Export, Edit)
│   ├── popup.css              ← Full design system with local Manrope font
│   └── popup.js               ← Popup controller — imports services + utils
│
├── fonts/
│   ├── Manrope-Regular.ttf
│   ├── Manrope-Medium.ttf
│   ├── Manrope-SemiBold.ttf
│   └── Manrope-Bold.ttf
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary | `#2563EB` |
| Background | `#FFFFFF` |
| Heading | `#111111` |
| Subtext | `#6B7280` |
| Border | `#E5E7EB` |
| Font | Manrope → Inter → Segoe UI → system-ui |

---

## ⚙️ Tech Stack

- **Manifest V3** — latest Chrome extension standard
- **ES Modules** — `type: "module"` service worker, clean imports
- **No innerHTML** — all DOM built with `createElement` (XSS-safe)
- **CSP Compliant** — no eval, no inline scripts
- **Local fonts** — Manrope loaded from bundled TTF files, no external requests

---

## 🔒 Privacy

- **100% local** — all data stored in `chrome.storage.local` on your device
- **No servers** — no data is ever sent anywhere
- **No analytics** — zero tracking or telemetry
- **No external requests** — fonts are bundled locally

---

## 📤 Export & Import

1. Click the **⬆︎** button in the top-right of the popup
2. **Export JSON** — downloads a full backup of your history + settings
3. **Import JSON** — restores from a backup, merges without duplicates

---

## 🛠️ Settings

| Setting | Default | Description |
|---|---|---|
| Auto-save on copy | ✅ On | Automatically saves everything you copy |
| Show notifications | ✅ On | Shows a notification when an item is saved |
| Fuzzy search | ✅ On | Enables fuzzy matching in search |
| Max history items | 100 | Maximum items to keep (10–500) |
| Auto-delete after | 7 days | Auto-cleanup old items (pinned are exempt) |

---

## 📝 License

MIT — free to use, modify, and distribute.

---

<p align="center">Built with ❤️ — fast, local, and yours.</p>

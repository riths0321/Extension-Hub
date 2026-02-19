# 🔍 Quick Search — v2.0

A premium Chrome Extension that lets you search selected text on 10+ platforms instantly.

---

## 📂 Folder Structure

```
quick-search/
│
├── icons/
│   ├── icon16.png      ← Your icons here
│   ├── icon48.png
│   └── icon128.png
│
├── manifest.json       ← Extension config (MV3)
├── background.js       ← Service Worker: context menu + history
├── content.js          ← Floating popup injected into pages
├── content.css         ← Styles for floating popup (injected via manifest)
├── popup.html          ← Extension popup UI
├── popup.js            ← Popup logic (tabs, history, custom engines)
├── style.css           ← Popup styles (premium dark theme)
└── README.md
```

---

## ✨ Features

- **Auto popup** — select any text (2–200 chars) → popup appears below selection
- **Context menu** — right-click selected text → Quick Search → choose engine
- **Keyboard shortcut** — `Ctrl+Shift+S` / `Cmd+Shift+S`
- **10 built-in engines** — Google, YouTube, Wikipedia, Amazon, GitHub, StackOverflow, Twitter, Reddit, Translate, Images
- **Search history** — last 20 searches with re-search button
- **Custom engines** — add any site with `%s` URL placeholder
- **100% CSP compliant** — no innerHTML, no eval, no inline scripts/styles, no external resources

---

## ⚙️ Installation

1. Download / unzip the folder
2. Open `chrome://extensions`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select `quick-search/` folder
5. Pin from Extensions menu

---

## 🔐 Permissions

| Permission | Why |
|---|---|
| `contextMenus` | Right-click menu |
| `storage` | Save history & custom engines |
| `tabs` | Open search results in new tab |
| `activeTab` | Send message to current page |

---

## 📄 License

MIT License
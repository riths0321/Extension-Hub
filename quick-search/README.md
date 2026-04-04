# ⚡ Quick Search v3

> **A premium Chrome Extension** — Select any text, search everywhere. Smart detection, multi-engine, command shortcuts, and a clean light UI.

![Version](https://img.shields.io/badge/version-3.0-2563EB?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-059669?style=flat-square)
![CSP Score](https://img.shields.io/badge/CSP-10/10-7C3AED?style=flat-square)
![Security](https://img.shields.io/badge/security-A%2B-DC2626?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-D97706?style=flat-square)

---

## 📸 What it does

Select **any text** on any webpage → a floating smart popup appears → click an engine or press `1–9` → done.

Works with **Google, YouTube, GitHub, Reddit, Stack Overflow, Wikipedia, Amazon, Twitter/X, Translate, Google Images** + your own custom engines.

---

## 🚀 Install

1. Download and unzip `quick-search-v3.zip`
2. Go to `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the `quick-search-v3/` folder
5. Done — the icon appears in your toolbar ✓

---

## ✨ Features

### 🔍 Smart Search System
Automatically detects what kind of text you selected:

| Type | Example | Action |
|------|---------|--------|
| URL | `https://github.com` | Opens directly |
| Email | `user@gmail.com` | Routes to Gmail |
| Code | `const x = () => {}` | Highlights GitHub + Stack Overflow |
| Question | `how does DNS work` | Highlights Google + Reddit + Wikipedia |

---

### 🎛 Multi-Search
- **Ctrl+Click** multiple engine cards to select them
- A slide-in bar shows your selection count
- **Open All** → opens each as a separate tab
- **Tab Group** → groups all results in a named Chrome Tab Group

---

### 📌 Pinned Engines
- **Right-click** any engine card → Pin it
- Pinned engines appear as quick-chip shortcuts
- Right-click again to unpin
- Saved permanently in storage

---

### ⌨ Command Shortcuts

Type a prefix in the popup search bar:

| Prefix | Engine | Example |
|--------|--------|---------|
| `g:` | Google | `g:best js frameworks` |
| `yt:` | YouTube | `yt:react hooks tutorial` |
| `gh:` | GitHub | `gh:nextjs starter` |
| `r:` | Reddit | `r:mechanical keyboards` |
| `so:` | Stack Overflow | `so:center div css` |
| `wiki:` | Wikipedia | `wiki:quantum computing` |
| `am:` | Amazon | `am:noise cancelling headphones` |
| `tw:` | Twitter/X | `tw:#openai` |
| `tr:` | Translate | `tr:bonjour le monde` |
| `img:` | Google Images | `img:minimalist desk setup` |

Live autocomplete dropdown shows as you type.

---

### 🕐 Advanced History
- Filter history **by engine**
- **Favorite ⭐** individual items
- **Delete ×** single entries
- Configurable history limit (25 / 50 / 100 / 200)

---

### 🎮 Keyboard UX

| Key | Action |
|-----|--------|
| `Ctrl+Shift+S` | Open popup anywhere |
| `1` – `9` | Quick-pick engine by number |
| `Ctrl+Click` | Add engine to multi-select |
| `Enter` | Search with default engine |
| `Ctrl+Enter` | Search across all selected engines |
| `↑` / `↓` | Navigate command autocomplete |
| `Escape` | Close floating popup |
| `Right-click` engine | Pin / unpin |

---

### ⚙️ Settings Panel
- Toggle **auto-show popup** on text selection
- Toggle **smart detection** (URL/email/code/question)
- Toggle **command shortcuts**
- Set **default engine** (used when you press Enter)
- Set **history limit**

---

## 📁 File Structure

```
quick-search-v3/
├── manifest.json       ← MV3 manifest, permissions, strict CSP
├── popup.html          ← Extension popup UI (4 tabs, zero inline styles)
├── popup.js            ← Popup logic, search, commands, settings (CSP-compliant)
├── style.css           ← Premium light theme + utility classes (.hidden, .m-0, etc.)
├── content.js          ← Injected into all pages (floating popup, class-based visibility)
├── content.css         ← Floating popup styles with CSS custom properties
├── dropdowns.js        ← Custom select dropdowns (setProperty for positioning)
├── background.js       ← Service worker, tabs, history, context menu
├── fonts/              ← Local Manrope font files (4 weights)
│   ├── Manrope-Regular.ttf
│   ├── Manrope-Medium.ttf
│   ├── Manrope-SemiBold.ttf
│   └── Manrope-Bold.ttf
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

**CSP Compliance Notes:**
- All HTML files: Zero `style="..."` attributes
- All JS files: Zero `element.style.property = value` assignments
- Dynamic positioning: Uses `setProperty('--css-variable', value)`
- Visibility control: Uses `.classList.add/remove('visible')`
- Spacing utilities: Predefined CSS classes (`.m-0`, `.mt-sm`, `.mt-md`)

---

## 🔐 Permissions

| Permission | Why |
|------------|-----|
| `contextMenus` | Right-click → Quick Search submenu |
| `storage` | Save history, settings, pinned engines |
| `activeTab` | Read selected text from current tab |
| `tabs` | Open search results in new tabs |
| `tabGroups` | Group multi-search results into Tab Groups |

---

## 🛡 Security & CSP Compliance

Quick Search v3 achieves **10/10 CSP compliance** with zero inline styles or unsafe practices:

- ✅ **Zero `innerHTML`** — all DOM built with `createElement` + `textContent`
- ✅ **Zero `eval()`** — no dynamic code execution
- ✅ **Zero inline styles** — no `style="..."` attributes in HTML
- ✅ **Zero direct style manipulation** — no `element.style.property = value`
- ✅ **Strict CSP** — `script-src 'self'; object-src 'self';`
- ✅ **CSS custom properties** — dynamic positioning via `setProperty('--variable', value)`
- ✅ **Class-based visibility** — all show/hide via `.classList.add/remove('visible')`
- ✅ **Utility CSS classes** — margin/padding via predefined classes (`.m-0`, `.mt-sm`, etc.)
- ✅ **Sender validation** — only extension's own scripts can send messages
- ✅ **URL validation** — only `http:` and `https:` URLs are ever opened

### CSP Best Practices Implemented

```javascript
// ✅ CORRECT: CSS custom properties for dynamic positioning
menu.style.setProperty('--menu-left', rect.left + 'px');
menu.style.setProperty('--menu-top', rect.top + 'px');

// ✅ CORRECT: Class-based visibility control
popup.classList.add('visible');
popup.classList.remove('hidden');

// ❌ AVOIDED: Direct inline styles
// element.style.display = 'none';  // Not used
// element.style.left = '100px';     // Not used
```

All styling is controlled through CSS classes and custom properties, ensuring full compatibility with strict Content Security Policies required by enterprise environments and Chrome Web Store security audits.

---

## 🎨 Design System

Built with a premium **light theme** inspired by Notion / Linear / Stripe:

```css
--primary:   #2563EB   /* buttons, focus rings, active states */
--heading:   #111111   /* all headings */
--subtext:   #6B7280   /* secondary text */
--bg:        #FFFFFF   /* backgrounds */
--border:    #E5E7EB   /* inputs, cards */
```

Font: **Manrope** (700 headings · 600 labels · 500 body)

---

## 📝 License

MIT — free to use, fork, and build on.

---

<p align="center">Made with ❤️ — Quick Search v3.0</p>
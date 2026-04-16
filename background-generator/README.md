# 🎨 Background Generator Pro

## 👨‍💻 Original by Saurabh Tiwari — upgraded to v3.0

---

### 🚀 What's New in v3.0

**4 Tabs, Tons of Power:**

| Tab | Features |
|---|---|
| 🎨 **Gradient** | Linear/Radial/Conic • Angle slider • 2–5 color stops • 8 Presets • Randomize |
| 🎯 **Solid** | Large color picker • HEX/RGB/HSL toggle • 9 Shades row • Color Harmony (Complementary, Analogous, Triadic) • Auto color naming |
| ◼ **Pattern** | 6 patterns: Dots, Grid, Lines, Diagonal, Checker, Zigzag • Foreground/background colors • Size slider |
| ⭐ **Saved** | Save up to 12 favorites • Click to reload • Delete individual items |

**Shared Features:**
- 🖥️ **Apply to Page** — inject your background into the active browser tab
- 📋 **Copy CSS or Tailwind** — toggle between `background: ...` and Tailwind JIT classes
- 🕐 **History strip** — last 8 used backgrounds as clickable swatches
- 🔔 Toast notifications for all actions

---

### 🛠️ Tech Stack
- HTML5 · CSS3 · Vanilla JavaScript
- Chrome Extension Manifest V3
- Google Fonts (Manrope)
- `chrome.storage.local` for persistence
- `chrome.scripting` for Apply to Page

---

### 📂 Folder Structure
```
bg-generator/
├── manifest.json   # MV3 config (permissions: storage, activeTab, scripting)
├── popup.html      # 4-tab UI
├── popup.js        # All logic (~350 lines)
├── styles.css      # Design system (Manrope · #2563EB · white)
└── icon128.png     # Extension icon (add your own)
```

---

### ⚙️ Installation
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this folder
4. Pin the extension for quick access

---

### 🎨 Design Tokens
| Token | Value | Usage |
|---|---|---|
| Primary | `#2563EB` | Buttons, active states, header |
| Heading | `#111111` | Primary text |
| Sub-text | `#6B7280` | Labels, secondary text |
| Background | `#FFFFFF` | Main background |
| Font | Manrope | All UI text |

---

### 🔐 Permissions
| Permission | Why |
|---|---|
| `storage` | Save favorites & history across sessions |
| `activeTab` | Identify the current tab for Apply to Page |
| `scripting` | Inject background CSS into the active tab |

---

### 📄 License
MIT — free to use, modify, and distribute.

# 📖 Quick Search v3 — Technical Documentation

> Developer reference for architecture, new features, design system, security, and storage schema.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [New Features in v3](#2-new-features-in-v3)
   - [2.1 Smart Search System](#21-smart-search-system)
   - [2.2 Multi-Search + Tab Groups](#22-multi-search--tab-groups)
   - [2.3 Pinned Engines](#23-pinned-engines)
   - [2.4 Command System + Autocomplete](#24-command-system--autocomplete)
   - [2.5 Advanced History](#25-advanced-history)
   - [2.6 Keyboard UX](#26-keyboard-ux)
   - [2.7 Settings Panel](#27-settings-panel)
3. [Design System](#3-design-system)
4. [Security Architecture](#4-security-architecture)
5. [Storage Schema](#5-storage-schema)
6. [v2 → v3 Changelog](#6-v2--v3-changelog)

---

## 1. Architecture Overview

Quick Search v3 runs on **Chrome Manifest V3 (MV3)** with a strict Content Security Policy that forbids `eval()` and `innerHTML`. All DOM manipulation uses only `createElement`, `textContent`, and `setAttribute`.

### Component Map

| File | Role | Responsibilities |
|------|------|-----------------|
| `background.js` | Service Worker | Message hub, tab management, history persistence, context menus, tab groups |
| `content.js` | Content Script | Floating popup injection, selection detection, smart type detection, keyboard shortcuts |
| `popup.js` | Extension Popup | All 4 tabs (Home / History / Custom / Settings), command autocomplete, multi-search UI |
| `style.css` | Popup Styles | Full design token system, Manrope font, light theme, all components |
| `content.css` | Injected Styles | Floating popup light card, multi-bar, engine grid, footer hints |

### Message Flow

```
content.js  ──► background.js ──► chrome.tabs.create()
popup.js    ──►                ──► chrome.tabs.group()
                               ──► chrome.storage.local
```

All messages are validated via `isTrustedSender()` before processing.

---

## 2. New Features in v3

---

### 2.1 Smart Search System

Automatically analyses selected text and detects its type, then highlights the most relevant engines.

#### Detection Logic — `detectTextType(text)`

Tests text against priority-ordered regex patterns:

```js
function detectTextType(text) {
  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))             return "email";
  if (/[{};()=><]|function\s|const\s|let\s|var\s|def\s|import\s|class\s/.test(text)) return "code";
  if (/^(what|who|why|how|when|where|is|are|can|does|do|did)\b/i.test(text)) return "question";
  return "general";
}
```

#### Type → Recommended Engines

| Detected Type | Recommended Engines |
|---------------|-------------------|
| `url` | Opens the URL directly (no search wrapping) |
| `email` | Google |
| `code` | GitHub, Stack Overflow |
| `question` | Google, Reddit, Wikipedia |
| `general` | Google (default) |

#### Visual Feedback

- A coloured badge appears in the content popup header and popup search bar
- Engine cards matching the detected type get a gold `★` indicator
- Badge classes: `.type-url` (green) · `.type-email` (amber) · `.type-code` (blue) · `.type-question` (grey)

**Files:** `content.js` → `detectTextType()`, `getRecommended()` · `content.css` `.type-*` · `popup.js` → `detectAndBadge()`

---

### 2.2 Multi-Search + Tab Groups

Run a query across multiple engines simultaneously from a single selection.

#### Interaction Flow

1. `Ctrl+Click` (or `Cmd+Click`) any engine card — card highlights with a `✓` checkmark
2. A slide-in action bar appears below the grid showing the count
3. **Open All** → sends each engine as an individual background tab
4. **Tab Group** → creates a named Chrome Tab Group with all tabs

#### Tab Group Implementation (`background.js`)

```js
// Message received:
{ type: "openTabGroup", searches: [{url, label}], groupName: "query text" }

// Creates tabs then groups them:
safeSearches.forEach((search, i) => {
  chrome.tabs.create({ url: search.url, active: i === 0 }, (tab) => {
    tabIds.push(tab.id);
    if (tabIds.length === safeSearches.length) {
      chrome.tabs.group({ tabIds }, (groupId) => {
        chrome.tabGroups.update(groupId, { title: groupName.slice(0, 25), color: "blue" });
      });
    }
  });
});
```

Requires `tabs` + `tabGroups` permissions in `manifest.json`.

**Files:** `popup.js` → `openMultiSearch()`, `openMultiGroup()` · `content.js` → `openMultiSearch()`, `openMultiGroup()` · `background.js` → `openTabGroup` handler

---

### 2.3 Pinned Engines

Users can pin favourite engines for faster access. Pinned engines appear as pill-shaped chip shortcuts.

#### Interaction

- **Right-click** any engine card → toggles pin state
- Pinned engines render as chips in a dedicated **Pinned** section
- Chips support: click-to-search, right-click-to-unpin

#### Storage

```js
// Storage key: "pinnedEngines"
// Value: Array of engine ID strings
// Example: ["google", "github", "reddit"]

function togglePin(engineId) {
  chrome.storage.local.get(["pinnedEngines"], (data) => {
    let pinned = data.pinnedEngines || [];
    const idx = pinned.indexOf(engineId);
    if (idx >= 0) pinned.splice(idx, 1);   // unpin
    else pinned.push(engineId);             // pin
    chrome.storage.local.set({ pinnedEngines: pinned }, buildHomeGrid);
  });
}
```

**Files:** `popup.js` → `togglePin()`, `buildPinnedSection()` · `style.css` `.pinned-chip`

---

### 2.4 Command System + Autocomplete

Power users can route searches via typed prefixes without clicking engine cards.

#### All Command Prefixes

| Prefix | Engine | Example |
|--------|--------|---------|
| `g:` | Google | `g:best js frameworks 2025` |
| `yt:` | YouTube | `yt:learn rust programming` |
| `gh:` | GitHub | `gh:react ui component library` |
| `r:` | Reddit | `r:budget gaming laptops` |
| `so:` | Stack Overflow | `so:async await vs promise` |
| `wiki:` | Wikipedia | `wiki:large language models` |
| `am:` | Amazon | `am:mechanical keyboard tenkeyless` |
| `tw:` | Twitter/X | `tw:#openai announcement` |
| `tr:` | Google Translate | `tr:wie geht es dir` |
| `img:` | Google Images | `img:minimalist desk setup` |

#### Autocomplete Implementation

```js
// Fires on every keystroke in the search bar:
function handleSearchInput() {
  const cmdMatch = val.match(/^([a-z]+):/i);
  if (cmdMatch) {
    showCommandSuggestions(cmdMatch[1].toLowerCase(), query);
  }
}

// Filters ENGINES by prefix match → renders .cmd-item elements
// Arrow Up/Down updates activeCmdIndex
// Enter or click → searchWithEngine(engine.id, query)
```

**Files:** `popup.js` → `handleSearchInput()`, `showCommandSuggestions()`, `updateCmdActive()` · `style.css` `.cmd-suggestions`, `.cmd-item`

---

### 2.5 Advanced History

Significantly upgraded from v2 — now supports filtering, favoriting, per-item deletion, and configurable limits.

#### History Item Schema

```js
{
  text:      string,   // The searched text
  engine:    string,   // Engine label (e.g. "Google")
  timestamp: number,   // Unix ms timestamp
  id:        string    // Same as timestamp.toString()
}
```

#### New Capabilities

| Feature | Implementation |
|---------|---------------|
| **Engine filter pills** | Extracts unique engine names from history, renders filter buttons |
| **Favorites ⭐** | Stores favorited IDs in `favoriteHistory` array; `⭐ Favorites` pill filters by it |
| **Per-item delete ×** | Sends `deleteHistoryItem` message; background filters by `timestamp`; row fades out |
| **Configurable limit** | `historyLimit` key in storage; enforced in `saveHistory()` in background.js |

```js
// Delete a single item:
{ type: "deleteHistoryItem", id: item.timestamp }

// Background handler:
const history = (data.searchHistory || []).filter(h => h.timestamp !== msg.id);
chrome.storage.local.set({ searchHistory: history });
```

**Files:** `popup.js` → `loadHistory()` · `background.js` → `deleteHistoryItem`, `saveHistory()` · `style.css` `.history-*`, `.filter-pill`

---

### 2.6 Keyboard UX

Full keyboard support in both the popup and the content script floating popup.

#### Popup (`popup.js`)

| Key | Action |
|-----|--------|
| `Enter` | Search with default engine (configurable in Settings) |
| `Ctrl+Enter` | Open search in all selected engines |
| `↓` / `↑` | Navigate command autocomplete dropdown |
| `1–9` (when bar empty) | Directly triggers that engine by grid index |

#### Content Popup (`content.js`)

| Key | Action |
|-----|--------|
| `Escape` | Closes the popup |
| `1–9` | Picks engine by index when popup is visible |
| `Ctrl+Click` | Selects engine into multi-search mode |

**Files:** `popup.js` → `handleSearchKeyDown()` · `content.js` → `keydown` listener

---

### 2.7 Settings Panel

All core behaviours are configurable and persisted via `chrome.storage.local`.

#### Settings Object

```js
settings = {
  autoShow:      boolean,  // Show popup on text selection (default: true)
  smartDetect:   boolean,  // Type detection + badge (default: true)
  commands:      boolean,  // g:, yt:, gh: prefixes (default: true)
  defaultEngine: string,   // Engine ID for Enter key (default: "google")
  historyLimit:  number    // Max history items: 25/50/100/200 (default: 50)
}
```

#### Settings are saved on every `change` event:

```js
["settingAutoShow", "settingSmartDetect", "settingCommands",
 "settingDefaultEngine", "settingHistoryLimit"]
  .forEach(id => {
    document.getElementById(id).addEventListener("change", saveSettings);
  });
```

**Files:** `popup.js` → `loadSettings()`, `saveSettings()` · `popup.html` `#panel-settings` · `style.css` `.toggle`, `.settings-select`

---

## 3. Design System

v3 replaces the dark theme entirely with a clean, premium light theme.

### 3.1 CSS Custom Properties

```css
:root {
  /* Colors */
  --primary:       #2563EB;
  --primary-hover: #1D4ED8;
  --primary-light: rgba(37, 99, 235, 0.08);
  --primary-glow:  rgba(37, 99, 235, 0.18);

  --heading:   #111111;
  --body:      #374151;
  --subtext:   #6B7280;
  --muted:     #9CA3AF;

  --bg:        #FFFFFF;
  --surface:   #F9FAFB;
  --surface-2: #F3F4F6;
  --border:    #E5E7EB;
  --border-hi: #D1D5DB;

  --green:  #059669;
  --red:    #DC2626;
  --amber:  #D97706;

  /* Typography */
  --font: 'Manrope', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Consolas, monospace;

  /* Border radius */
  --r-sm:   8px;
  --r-md:   12px;
  --r-lg:   16px;
  --r-xl:   20px;
  --r-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.05);

  /* Motion */
  --ease:        cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 3.2 Typography Scale

| Element | Weight | Size | Notes |
|---------|--------|------|-------|
| Brand / Page title | 800 | 15–16px | Letter-spacing -0.3px |
| Section headings | 700 | 11px | Uppercase, 0.10em tracking |
| Engine card label | 700 | 10.5px | Truncated with ellipsis |
| Body text | 500 | 14px | Line-height 1.5 |
| Meta / captions | 500 | 11–11.5px | color: --muted |
| Monospace (keys, code) | 700 | 10–11px | Courier New / ui-monospace |

### 3.3 Dimensions

| Element | Width |
|---------|-------|
| Extension popup | 420px |
| Content floating popup | 340px |
| Engine grid | 5 columns |

---

## 4. Security Architecture

### 4.1 CSP Compliance

Manifest CSP: `script-src 'self'; object-src 'self';`

- ✅ No `innerHTML` anywhere in the codebase
- ✅ No `eval()`, `new Function()`, or dynamic `<script>` injection
- ✅ All DOM built with `createElement` + `textContent` + `setAttribute`
- ✅ Styles applied only via CSS classes — no `element.style` assignments

### 4.2 Sender Validation

Every `chrome.runtime.onMessage` handler validates the sender before processing:

```js
function isTrustedSender(sender) {
  return sender.id === chrome.runtime.id;
}
```

This ensures only the extension's own `popup.js`, `content.js`, and `background.js` can trigger actions.

### 4.3 URL Validation

Before any `chrome.tabs.create()` call, URLs are validated:

```js
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
```

Prevents `javascript:`, `data:`, `vbscript:`, and other protocol-injection attacks.

---

## 5. Storage Schema

All data stored in `chrome.storage.local`. **No data is ever sent to any server.**

| Key | Type | Description |
|-----|------|-------------|
| `searchHistory` | `Array<{text, engine, timestamp, id}>` | Full search history |
| `favoriteHistory` | `Array<string>` | IDs (timestamp strings) of starred items |
| `pinnedEngines` | `Array<string>` | Engine IDs that are pinned, e.g. `["google", "github"]` |
| `customEngines` | `Array<{id, name, url, icon}>` | User-added custom search engines |
| `settings` | `Object` | `{autoShow, smartDetect, commands, defaultEngine, historyLimit}` |
| `historyLimit` | `number` | Max history entries — 25 / 50 / 100 / 200. Default: 50 |

---

## 6. v2 → v3 Changelog

| Area | v2 | v3 ✨ |
|------|----|-------|
| **Theme** | Dark (`#0c0e14`) | Premium light (`#FFFFFF` + Manrope) |
| **Font** | System UI | Manrope (Google Fonts) |
| **Popup width** | 400px | 420px |
| **Search input** | None in popup | Full search bar with commands + autocomplete |
| **Smart detection** | ✗ | ✅ URL / email / code / question + coloured badge |
| **Multi-search** | ✗ | ✅ Ctrl+click + Open All + Tab Group |
| **Pinned engines** | ✗ | ✅ Right-click to pin, chip row, persisted |
| **Command shortcuts** | ✗ | ✅ 10 prefixes (g:, yt:, gh:...) + live autocomplete |
| **History — filter** | ✗ | ✅ Per-engine filter pills |
| **History — favorites** | ✗ | ✅ ⭐ star toggle, favorites filter |
| **History — delete** | Clear all only | ✅ Per-item delete with fade animation |
| **History — limit** | Hardcoded 50 | ✅ Configurable: 25 / 50 / 100 / 200 |
| **Keyboard: 1–9** | ✗ | ✅ Quick-pick engine by number |
| **Keyboard: Ctrl+Enter** | ✗ | ✅ Multi-search all selected engines |
| **Keyboard: arrows** | ✗ | ✅ Navigate command autocomplete |
| **Settings panel** | ✗ | ✅ 5 toggles / selects, all persisted |
| **Custom engine icon** | ✗ | ✅ Emoji icon field added |
| **Permissions** | contextMenus, storage, activeTab | + `tabs`, `tabGroups` |
| **Content popup** | Dark card | ✅ White floating card, light theme |
| **Content popup: multi-bar** | ✗ | ✅ Slide-in multi-select action bar |
| **Content popup: footer** | ✗ | ✅ Keyboard hint row (Esc, 1–9, Ctrl+click) |
| **Type badge (content)** | ✗ | ✅ Coloured badge shows detected text type |
| **Recommended engines** | ✗ | ✅ Smart ★ highlight based on text type |

---

<p align="center">Quick Search v3.0 — Technical Documentation</p>
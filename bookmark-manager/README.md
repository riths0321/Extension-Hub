# 📚 Bookmark Manager — Chrome Extension

A powerful and intuitive Chrome extension for managing bookmarks, tab sessions, and performing cleanup tasks with a **premium glassmorphism UI**.

![Chrome](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest](https://img.shields.io/badge/Manifest-v3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

### 🔖 Bookmark Management
- **Category-based Bookmarking** — Save bookmarks to custom folders/categories
- **Automatic Folder Creation** — Creates folders on-the-fly for new categories
- **Duplicate Detection** — Detects and removes duplicate bookmarks by URL
- **Folder Cleanup** — Automatically deletes empty bookmark folders (system roots protected)
- **Chrome Page Guard** — Prevents bookmarking internal `chrome://` pages gracefully

### 🗂️ Tab Session Management
- **Save Current Session** — Saves all open, restorable tabs in the current window
- **Restore Last Session** — Reopens all tabs from your last saved session
- **Persistent Storage** — Sessions saved locally using Chrome's Storage API
- **Smart Filtering** — Skips `chrome://` and extension pages that can't be restored

### 🔍 Search Functionality
- **Real-time Search** — Live results as you type, displayed directly in the popup UI
- **Click to Open** — Click any search result to open it in a new tab
- **Debounced Input** — Smooth, API-friendly search with 180ms debounce

### 🧹 Cleanup Tools
- **Remove Duplicates** — URL-based dedup across all bookmark folders
- **Clean Empty Folders** — Removes empty folders while protecting browser system roots
- **Async-safe Operations** — All removals are properly async with accurate result counts
- **Visual Feedback** — Every action reports success or failure via the status bar

---

## 📁 Project Structure

```
bookmark-manager/
├── manifest.json      # Extension manifest (Manifest v3) with explicit CSP
├── popup.html         # Main extension popup UI (CSP-compliant, no inline scripts)
├── popup.css          # Premium glassmorphism UI with animated background
├── popup.js           # Core logic — search, overlay, status, keyboard support
├── bookmarks.js       # Bookmark add, duplicate removal, folder cleanup
├── sessions.js        # Tab session save & restore
├── icons/             # Extension icons (16px, 48px, 128px)
└── README.md          # This file
```

---

## 🚀 Installation

### Method 1: Load Unpacked (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the folder containing the extension files
6. The extension icon will appear in your Chrome toolbar

### Method 2: Pack Extension (Distribution)
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Pack extension**
4. Select the extension folder
5. Use the generated `.crx` file for distribution

---

## 🎯 How to Use

### Accessing the Extension
Click the extension icon in your Chrome toolbar to open the popup.

### Adding Bookmarks
1. Navigate to any webpage you want to bookmark
2. Click the extension icon
3. Click **"Bookmark current page"**
4. Enter a category name in the overlay (or leave blank for *"Unsorted"*)
5. Click **Save bookmark** or press `Enter`

### Managing Sessions
- **Save tabs** — Click "Save tabs" to save all open tabs in the current window
- **Restore** — Click "Restore" to reopen all tabs from your last saved session

### Searching Bookmarks
Type in the search box — results appear instantly in the popup UI. Click any result to open it in a new tab.

### Cleanup Tools
- **Duplicates** — Removes all duplicate bookmarks (matched by URL) across all folders
- **Empty folders** — Cleans up any bookmark folders with no items inside

---

## 🔧 Technical Details

### Permissions Used
| Permission | Purpose |
|---|---|
| `tabs` | Tab access for session management |
| `bookmarks` | Create, read, and manage bookmarks |
| `storage` | Persist session data locally |
| `windows` | Create and restore browser windows for saved sessions |

### CSP (Content Security Policy)
The extension ships with an explicit MV3-compliant CSP in `manifest.json`:
- `script-src 'self'` — No inline scripts, no remote scripts
- `style-src 'self'` — External stylesheet only; no inline styles
- `font-src 'self'` — Local extension fonts only
- `img-src 'self' https://www.google.com https://*.gstatic.com` — Local images plus Google favicon assets

### APIs Used
- **Chrome Bookmarks API** — All bookmark CRUD operations
- **Chrome Tabs API** — Tab querying and session handling
- **Chrome Storage API** — Persisting session data locally
- **Chrome Runtime API** — Error handling via `chrome.runtime.lastError`

---

## 🎨 UI / UX

- **Glassmorphism Design** — Frosted glass panel with `backdrop-filter: blur`
- **Animated Background** — Multi-stop mesh gradient with floating ambient blobs
- **Premium Typography** — Playfair Display (headings) + DM Sans (body)
- **Micro-animations** — Panel entry, overlay spring, status bar slide-in
- **Keyboard Navigation** — `Enter` to confirm, `Escape` to close overlays
- **Visual Feedback** — Color-coded status bar for every action (success/error)
- **Accessible Markup** — `aria-live`, `role="dialog"`, `aria-modal` throughout

---

## ⚠️ Limitations & Considerations

- **Single session** — Only one session is stored at a time (last write wins)
- **No sync** — Data is stored locally, not synced across Chrome profiles
- **No undo** — Cleanup operations (duplicate removal, folder deletion) are permanent
- **Local fonts** — Google Fonts loaded via `<link>` (requires internet on first load)

---

## 🔮 Future Enhancements

- Multiple named sessions with timestamps
- Bookmark import / export (JSON, HTML)
- Cloud sync across devices
- Batch bookmark operations
- Custom keyboard shortcuts
- Dark / light mode toggle
- Bookmark usage statistics

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.

# 🕶️ Open Incognito Tab

<div align="center">
  <img src="icons/icon128.png" alt="Open Incognito Tab Logo" width="128" height="128">
  <h3>Lightweight · Fast · Privacy-Focused</h3>
  <p>Open current tab in Incognito mode instantly with smart privacy controls</p>
</div>

---

## 📋 Description

Open Incognito Tab is a sleek Chrome extension that lets you instantly open the current tab in Incognito mode — with extra privacy controls like clearing history, fullscreen mode, and auto-closing the original tab.

### ✨ What you can do:
- 🔓 Open current tab in Incognito window with one click
- 🧹 Automatically remove URL from browsing history
- 🖥️ Launch Incognito in fullscreen mode
- ❌ Close original tab automatically after opening
- 🎯 Trigger via popup, right-click menu, or keyboard shortcut

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🕶️ **One-Click Incognito** | Open current tab instantly in Incognito mode |
| 🧹 **Clear History** | Automatically delete URL from Chrome history |
| 🖥️ **Fullscreen Mode** | Open Incognito window in fullscreen |
| ❌ **Close Original Tab** | Close normal tab after opening Incognito |
| 🖱️ **Right-Click Support** | Context menu: "Open this tab in incognito" |
| ⌨️ **Keyboard Shortcut** | `Alt + I` (Win/Linux) · `Option + I` (Mac) |
| ⚙️ **Settings Page** | Simple controls to customize behavior |
| 🎨 **Light/Dark Theme** | Clean, modern interface that adapts to your system |

---

## 🛠️ Tech Stack

- **HTML5** – Popup & options UI
- **CSS3** – Clean minimal styling with light/dark theme
- **JavaScript (Vanilla)** – Core logic
- **Chrome Extension API** – Manifest V3
- **Chrome Storage** – Settings persistence

---

## 📁 Folder Structure
open-incognito-tab/
├── 📄 manifest.json # Extension configuration
├── 📄 background.js # Service worker logic
├── 📄 popup.html # Popup interface
├── 📄 popup.js # Popup functionality
├── 📄 popup.css # Popup styles
├── 📄 options.html # Settings page
└── 📁 icons/
├── icon16.png
├── icon48.png
└── icon128.png

text

---

## ⚙️ Installation (Developer Mode)

1. **Clone** or download this repository
   ```bash
   git clone https://github.com/yourusername/open-incognito-tab.git
Open Chrome and navigate to chrome://extensions

Enable Developer mode (toggle in top-right corner)

Click Load unpacked

Select the project folder

The extension icon 🕶️ will appear in your toolbar

🧠 How It Works











User triggers the extension (popup, shortcut, or right-click)

Reads settings from chrome.storage.local

Opens new Incognito window with current tab URL

Applies optional actions based on settings:

Remove URL from history

Launch in fullscreen mode

Close original tab

All logic runs locally using Chrome APIs — no data leaves your browser

🔐 Permissions Explained
Permission	Reason
tabs	Get current active tab URL
history	Remove URL from history (optional)
contextMenus	Add right-click menu support
storage	Save user preferences locally
No page content access. No tracking. No data collection.

🔒 Privacy Policy
✅ No data collection
✅ No analytics
✅ No network requests
✅ No external servers
✅ Everything runs locally

Your browsing activity never leaves your browser.

⚠️ Important Notes
🚫 Incognito windows still follow Chrome's Incognito limitations

🧹 History removal only affects the opened URL, not entire browsing history

🔒 Does not bypass Chrome's built-in privacy features or website tracking

📱 Internal pages (chrome://, edge://, about:) cannot be opened in Incognito

📄 License
MIT License — Free to use, modify, and distribute.

text
Copyright (c) 2024 Open Incognito Tab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check the issues page.

👨‍💻 Author
Open Incognito Tab
Built for users who want speed + privacy without complexity.

<div align="center"> <sub>Made with ❤️ for a more private web</sub> </div> ```

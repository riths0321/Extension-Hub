# 📧 Email Extractor Pro - Chrome Extension

<div align="center">
  <img src="icons/icon128.png" alt="Email Extractor Pro Logo" width="128" height="128">
  <h3>Extract emails from any webpage with style and precision</h3>
  <p>Premium UI · Per-Tab Storage · Instant Copy</p>
</div>

---

## ✨ Key Features

### 🎨 **Premium Modern Interface**
- Stunning purple gradient design with glassmorphism
- Smooth animations and micro-interactions
- Clean, intuitive layout with premium card design
- Professional UI/UX with haptic feedback

### 📋 **Individual Copy Buttons**
- Copy button for **EACH** extracted email
- Visual feedback with "Copied!" animation
- One-click copying with success indicators
- Avatar icons with first letter for each email

### 📊 **Live Statistics Dashboard**
- Real-time email count with animated counters
- Unique domain counter with categorization
- Beautiful stats cards with 3D hover effects
- Domain metadata under each email

### 🔄 **Per-Tab Smart Storage** (NEW)
- **Automatic refresh** when switching tabs
- Each tab maintains its **OWN** email collection
- No mixing emails from different pages
- Clean state for every new webpage
- Persistent storage per tab across sessions

### ⚡ **Powerful Extraction Engine**
- Scans entire webpage (visible & hidden content)
- Extracts from text, HTML, and mailto links
- Smart duplicate removal with sorting
- Advanced placeholder email filtering
- Support for dynamic content

### 🎯 **Additional Premium Features**
- Copy all emails at once with one click
- Export to CSV with domain breakdown
- Clear all with confirmation dialog
- Premium toast notifications with animations
- Keyboard shortcuts (Ctrl/Cmd+E to extract)
- Protected against browser internal pages
- Escape key to clear emails

---

## 🚀 Installation Guide

### Method 1: Load as Unpacked Extension (Recommended for Testing)

1. **Extract the ZIP File**
   ```bash
   unzip email-extractor-pro.zip -d email-extractor-pro
Open Chrome Extensions

Navigate to chrome://extensions/

Or: Menu (⋮) → More tools → Extensions

Enable Developer Mode

Toggle the switch in the top-right corner

Load the Extension

Click "Load unpacked"

Select the email-extractor-pro folder

Click "Select Folder"

Start Using!

Extension icon appears in toolbar

Click to open and start extracting

Method 2: Chrome Web Store (Coming Soon)
📖 How to Use
Basic Usage Flow
Navigate to any webpage with email addresses

Click the extension icon in Chrome toolbar

Press "Extract Emails from Page" button

Watch as emails appear in beautiful cards

Per-Tab Workflow
text
Page A (example.com)    → Extract → Shows emails from example.com
Switch to Page B (test.com) → Popup auto-refreshes → Empty state
Page B (test.com)       → Extract → Shows emails from test.com only
Back to Page A          → Popup shows emails from example.com again
Copy Single Email
Click the "Copy" button next to any email

Button transforms to "Copied!" with checkmark

Email instantly in your clipboard

Copy All Emails
Click "Copy All" button at bottom

All emails copied as list (one per line)

Perfect for pasting into spreadsheets

Export to CSV
Click "Export CSV" button

Downloads CSV with emails and domains

Filename includes timestamp: emails-2024-01-15.csv

Clear Current Page
Click "Clear All" button

Confirmation dialog prevents accidents

Only clears emails for current tab

🎨 UI Components Preview
text
┌─────────────────────────────────┐
│  📧 Email Extractor Pro    v2.0 │
├─────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐│
│  │ 📧 42       │ │ 🌐 12       ││
│  │ Emails Found│ │ Unique Doms ││
│  └─────────────┘ └─────────────┘│
├─────────────────────────────────┤
│  [ 🔄 Extract Emails from Page ] │
├─────────────────────────────────┤
│  📋 Extracted Emails     (42)   │
│  ┌─────────────────────────────┐│
│  │ J john@company.com    [Copy]││
│  │ S support@site.com    [Copy]││
│  │ I info@business.com   [Copy]││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  [ Copy All ]    [ Export CSV ] │
└─────────────────────────────────┘
🔧 Technical Details
Built With
Technology	Purpose
Manifest V3	Latest Chrome extension standard
Vanilla JavaScript	No external dependencies, pure performance
Modern CSS3	Gradients, animations, grid, flexbox
Chrome Storage API	Per-tab persistent storage
Scripting API	Safe page content extraction
Permissions Explained
Permission	Reason	Required
activeTab	Access current webpage content	✅ Yes
storage	Save emails per tab locally	✅ Yes
scripting	Inject extraction script safely	✅ Yes
host_permissions	Run on all URLs	✅ Yes
Browser Compatibility
✅ Google Chrome (Primary - v88+)

✅ Microsoft Edge (Chromium)

✅ Brave Browser

✅ Opera

✅ Vivaldi

✅ Any Chromium-based browser

📁 File Structure
text
email-extractor-pro/
├── 📄 manifest.json          # Extension configuration (MV3)
├── 📄 popup.html            # Premium UI interface
├── 📄 popup.css             # Styling with animations
├── 📄 popup.js              # Core logic with per-tab storage
├── 📁 icons/                # Extension icons
│   ├── icon16.png          # Toolbar icon
│   ├── icon48.png          # Extensions page
│   └── icon128.png         # Chrome Web Store
└── 📄 README.md             # You are here
🎯 What Makes This Special?
Compared to Other Email Extractors:
Feature	Email Extractor Pro	Others
Individual Copy Buttons	✅ Yes, per email	❌ Copy all only
Per-Tab Storage	✅ Auto-refresh on tab switch	❌ Mixes all emails
Premium UI/UX	✅ Glassmorphism + animations	❌ Basic interface
Live Statistics	✅ Real-time counts	❌ Static display
Smart Filtering	✅ Advanced placeholder removal	❌ Basic regex
Keyboard Shortcuts	✅ Ctrl/Cmd+E, Escape	❌ Mouse only
CSV Export	✅ With domain breakdown	✅ Basic only
Toast Notifications	✅ Premium animations	❌ None
🐛 Troubleshooting
Common Issues & Solutions
"Cannot extract from this page" error:

🔹 This appears on browser internal pages

🔹 Navigate to a regular website (http:// or https://)

🔹 Examples of unsupported: chrome://, edge://, about:

No emails found:

🔹 Ensure page has fully loaded

🔹 Try scrolling to load dynamic content

🔹 Check if emails are in images (can't extract)

🔹 Some sites obfuscate emails to prevent scraping

Extension not appearing:

🔹 Make sure Developer Mode is enabled

🔹 Check all files are in the correct folder

🔹 Reload extension from chrome://extensions/

🔹 Check console for errors (F12)

Copy button not working:

🔹 Ensure clipboard permissions are granted

🔹 Try using "Copy All" as fallback

🔹 Check if page has focus

🔹 Some secure contexts restrict clipboard

Emails showing from old page:

🔹 This was fixed in v2.0 with per-tab storage

🔹 Update to latest version

🔹 Clear storage and re-extract

💡 Tips & Best Practices
Per-Page Organization

Each tab maintains its own email list

Perfect for comparing different sites

No cross-contamination of data

Export Regularly

Save CSV backups of important lists

Filenames include date for tracking

Great for lead generation

Use Keyboard Shortcuts

Ctrl/Cmd + E → Extract emails

Escape → Clear current page

Faster than mouse navigation

Check Domain Stats

Unique domain count shows variety

Helps identify primary domains

Useful for competitor analysis

Clear When Done

Start fresh for new projects

Prevents accidental mixing

Better performance

📝 Version History
v2.0.0 (Current) - Premium UI + Per-Tab Storage
✨ Completely redesigned premium interface

🔄 Per-tab storage with auto-refresh on tab switch

📋 Individual copy buttons for each email

📊 Live statistics with animated counters

🎨 Glassmorphism design with 3D effects

⌨️ Keyboard shortcuts (Ctrl/Cmd+E, Escape)

🔒 Better security with CSP compliance

💾 Optimized storage per tab

🚫 Enhanced filtering of placeholder emails

⚡ Faster extraction with deduplication

v1.0.0 - Initial Release
Basic email extraction functionality

Copy all emails feature

Simple CSV export

Basic UI with minimal styling

🔒 Privacy & Security
Privacy First Approach
✅ 100% Local - All data stays on your device
✅ No External Servers - Zero data transmission
✅ No Tracking - No analytics or telemetry
✅ No Data Collection - Your emails are yours
✅ No Logging - We don't track usage

Security Features
✅ CSP Compliant - Content Security Policy enforced
✅ Minimal Permissions - Only what's absolutely needed
✅ Protected Pages - Won't run on chrome:// URLs
✅ Safe Scripting - Isolated execution context
✅ Open Source - Fully auditable code

Data Storage
Emails stored locally in Chrome storage

Per-tab isolation prevents mixing

Auto-cleaned when tab is closed

Never synced to cloud

No third-party access

🚀 Future Roadmap
Coming in v3.0
🌓 Dark/Light theme toggle

🔍 Search/filter emails by domain

✅ Email validation (MX record check)

📧 Email verification (active/inactive)

🏷️ Tag and categorize emails

📱 Mobile browser support

🌐 Multi-tab batch extraction

📝 Custom export formats (JSON, TXT, XML)

📊 Analytics dashboard with charts

🔔 Smart notifications for new emails

🤝 Contributing
Contributions are welcome! Here's how you can help:

Fork the repository

Create a feature branch

Commit your changes

Push to the branch

Open a Pull Request

Development Setup
bash
git clone https://github.com/yourusername/email-extractor-pro.git
cd email-extractor-pro
# Load as unpacked extension in Chrome
# Start coding!
📄 License
MIT License - Free for personal and commercial use

text
Copyright (c) 2024 Email Extractor Pro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
💖 Support & Feedback
🐛 Report Issues: GitHub Issues

💡 Suggest Features: Discussions

⭐ Star the Project: Show your support

📧 Contact: email@example.com

👨‍💻 Author
Email Extractor Pro is crafted with ❤️ by developers who care about:

Privacy - Your data stays yours

Performance - Lightning fast extraction

Design - Beautiful, intuitive interfaces

Innovation - Always improving

<div align="center"> <sub>Made with 💜 for the open-source community</sub> <br> <sub>© 2024 Email Extractor Pro. All rights reserved.</sub> <br> <sub>⭐ Star us on GitHub if you find this useful! ⭐</sub> </div> ```
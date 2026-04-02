# 🍪 Smart Cookie Manager

A powerful, unified Chrome extension combining **cookie cleaning** and **expiry monitoring** into one premium tool.

## ✨ Features

### 🔍 Real-Time Cookie Monitor
- Live countdown timers per cookie
- Status classification: Critical / Warning / Soon / Safe / Session
- Search + filter by domain or name
- Color-coded cards with status badges

### 🧹 Smart Cookie Cleaner
- One-click clean non-whitelisted cookies
- Whitelisted sites always keep their logins
- Bulk delete by domain
- Remove expired-only cookies
- Cleaning stats tracking

### 🛡️ Whitelist Protection
- Add/remove domains manually or via "Protect Current"
- Auto-protect visited sites (optional)
- Export/import whitelist as JSON

### 🔔 Expiry Alerts
- Notifications at 24h, 1h, 15m, 5m before expiry
- Configurable alert thresholds
- Smart suggestions when unprotected sites have expiring cookies

### ⚙️ Automation
- Auto-clean on browser startup
- Scheduled cleaning (daily / weekly)
- Auto-clean when cookie count exceeds a threshold

### 🎨 UI
- Dark / light mode toggle
- Premium glassmorphism design
- Tabbed interface: Monitor | Cleaner | Protect | Settings

## 🚀 Installation

1. Download or clone this folder
2. Open `chrome://extensions/`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked**
5. Select the `smart-cookie-manager` folder
6. Pin the 🍪 icon in your toolbar

## 📁 File Structure

```
smart-cookie-manager/
├── manifest.json     # Manifest V3 config
├── background.js     # Service worker (cleaning + monitoring + alerts)
├── popup.html        # Unified UI shell
├── popup.css         # Premium dark/light theme
├── popup.js          # Full UI controller
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 Permissions

- `cookies` — Read, monitor, and delete cookies
- `storage` — Save settings and stats
- `notifications` — Expiry alerts
- `alarms` — Scheduled tasks
- `tabs` — Get current tab domain
- `<all_urls>` — Access cookies across all sites

**Privacy**: Everything stays on your device. No data is sent externally.

## Version: 2.0.0

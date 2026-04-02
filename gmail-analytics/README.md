# Gmail Analytics Pro

Gmail Analytics Pro is a Chrome extension that gives a quick view of your Gmail inbox from the toolbar popup. It shows unread activity, recent messages, simple priority signals, spam-like message detection, and lets you mark messages as read without opening Gmail first.

## Features

- Unread count badge on the extension icon
- Popup dashboard with unread, received-today, priority, and productivity stats
- Recent email list with sender, subject, snippet, and relative time
- Quick filters for unread, priority, today, week, month, work, personal, and spam
- Mark one email or multiple emails as read
- CSV and JSON export from the popup
- Smart scan, digest, and local backup actions
- Light and dark theme toggle
- Desktop notification when new unread mail arrives

## How It Works

The extension reads the Gmail Atom feed to fetch unread inbox data. The XML feed is parsed inside an offscreen document, then the popup reads the stored data from `chrome.storage.local`.

For actions that change Gmail state, such as marking messages as read or calculating today's received count, the extension uses the Gmail API through `chrome.identity.getAuthToken`.

## Project Files

```text
gmail-analytics/
├── manifest.json
├── background.js
├── offscreen.html
├── offscreen.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `alarms`: runs periodic inbox polling
- `storage`: saves fetched email data, timestamps, and theme
- `notifications`: shows new mail alerts
- `offscreen`: parses the Gmail Atom XML feed
- `identity`: gets OAuth access tokens for Gmail API calls

## OAuth Scopes

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

## Setup

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `gmail-analytics` folder
5. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in `manifest.json` with your real OAuth client ID

## Notes

- The extension works only with Gmail
- Gmail must be signed in for feed access and API actions
- Export and backup are local browser-side actions

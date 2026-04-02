# Gmail Analytics Pro Documentation

## Overview

Gmail Analytics Pro is a Manifest V3 Chrome extension focused on lightweight inbox monitoring. It combines Gmail Atom feed polling for unread message previews with Gmail API calls for inbox stats and mark-as-read actions.

The extension is made of three main parts:

- `background.js`: polling, notifications, icon badge updates, Gmail API actions
- `offscreen.js`: XML parsing for the Gmail Atom feed
- `popup.js`: dashboard rendering, filtering, exporting, and user actions

## Runtime Flow

### 1. Background polling

The background service worker creates an alarm named `poll` and refreshes inbox data every 1 minute.

Main jobs:

- fetch `https://mail.google.com/mail/feed/atom`
- parse the feed through the offscreen document
- store unread count, entry list, login state, and timestamp in `chrome.storage.local`
- update the action badge
- show notifications when unread count increases

### 2. Offscreen parsing

Because the extension runs on Manifest V3, XML parsing is delegated to an offscreen document.

`offscreen.js` listens for `PARSE_XML` messages and returns:

- `count`: unread message count from `fullcount`
- `entries`: parsed feed entries with id, title, summary, issued date, link, and author name

### 3. Popup dashboard

The popup reads cached data from storage and builds a small analytics layer on top of it.

Derived popup features:

- priority score based on keywords
- spam-like classification based on keywords and text patterns
- category grouping into Work, Personal, Other, or Spam
- productivity score based on recent non-spam message volume
- quick filters and list rendering

## Supported Actions

### Refresh

The popup sends a `REFRESH` message to the background service worker, which re-fetches the Atom feed and updates storage.

### Mark one email as read

The popup sends `MARK_READ` with the selected Gmail feed entry id. The background extracts the Gmail thread id and calls:

- `POST /gmail/v1/users/me/threads/{threadId}/modify`

with `removeLabelIds: ["UNREAD"]`.

### Mark all visible non-spam emails as read

The popup sends `MARK_ALL_READ` with a list of ids. The background loops through them and applies the same Gmail API modify call.

### Export and backup

Popup exports are generated in-browser:

- CSV export for email rows
- JSON export for email rows
- backup export for current local extension storage

## Data Model

The popup works with entries shaped like:

```json
{
  "id": "message-id",
  "title": "Email subject",
  "summary": "Preview text",
  "issued": "2026-04-02T12:34:56Z",
  "link": "https://mail.google.com/...",
  "authorName": "Sender Name"
}
```

Derived UI fields:

- `priorityScore`
- `category`
- `isRead`

## Storage Keys

The extension currently stores these values in `chrome.storage.local`:

- `unreadCount`
- `entries`
- `lastUpdated`
- `loggedIn`
- `todayReceivedCount`
- `theme`

## Manifest Notes

Current permissions:

- `alarms`
- `storage`
- `notifications`
- `offscreen`
- `identity`

Host permissions:

- `https://mail.google.com/*`
- `https://www.googleapis.com/*`

OAuth scopes:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

## File Map

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

## Limitations

- Gmail-only extension
- depends on active Gmail sign-in
- unread feed is based on Gmail Atom feed availability
- spam and priority detection are heuristic, not Gmail-native classifications
- popup analytics are lightweight and not persisted as separate reports

## Maintenance Guidance

- Keep `manifest.json` aligned with actual permissions and scopes
- Avoid documenting removed features unless they exist in code
- If locale support is restored later, add `_locales/en/messages.json` and reintroduce `default_locale`
- Keep `background.js` notification and action icon paths aligned with `manifest.json`

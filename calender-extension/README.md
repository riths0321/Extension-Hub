# Calendar & World Clock

Chrome extension popup that combines a multi-view calendar with a live world clock dashboard.

## Current Features
- Month, week, agenda, and search views
- Event creation, edit, duplicate, delete, and undo
- Multi-day, all-day, recurring, and category-based events
- Holiday filter with a custom popup-safe dropdown
- Day popup for quick date details and event creation
- World clock with live digital and analog cards
- Drag-to-reorder world clocks
- ICS export and Google Calendar handoff

## Security & CSP
- Manifest V3 extension with local-only assets
- No inline scripts or inline styles in popup HTML
- Strict extension page CSP:
  - `script-src 'self'`
  - `style-src 'self'`
  - `object-src 'none'`
  - `connect-src 'self'`
- Event, search, agenda, and popup rendering now use DOM APIs instead of `innerHTML`

## Project Files
```text
calender-extension/
├── manifest.json
├── index.html
├── script.js
├── dropdown.js
├── popup.js
├── style.css
├── popup.css
├── README.md
└── DOCUMENTATION.md
```

## Load Unpacked
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Choose Load unpacked
4. Select `calender-extension`

## Notes
- Data is stored locally through `chrome.storage`
- No remote APIs are required for core features
- Reload the unpacked extension after any file changes

# Tech Detector Pro

Tech Detector Pro is a Manifest V3 Chrome extension that scans the active tab and surfaces the likely technologies used by a website. It keeps the experience local-first, readable, and fast with category grouping, search, history, export actions, and tuned light/dark themes.

## Features

- One-click scan of the current tab
- Grouped results for frontend, backend, CMS, analytics, hosting, libraries, payment, and build tools
- Search and category filters inside the popup
- Documentation links for detected technologies
- Recent local scan history
- Copy report and export JSON actions
- Local Manrope fonts with improved light/dark contrast
- CSP-safe popup setup with local assets only

## Project Structure

```text
tech-detector-pro/
├── background.js
├── content.js
├── DOCUMENTATION.md
├── icons/
├── manifest.json
├── popup.css
├── popup.html
├── popup.js
├── README.md
├── technologies.json
└── theme-variables.css
```

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `tech-detector-pro` folder

## How It Works

1. The popup reads the active tab, stored theme, and recent history.
2. Clicking `Scan Technologies` injects `content.js` into the current page.
3. The page is analyzed against signatures from `technologies.json`.
4. Results are rendered in the popup and can be filtered or exported.
5. Theme preference and scan history are stored locally in Chrome storage.

## Permissions

- `activeTab`: access the current tab for scanning
- `scripting`: inject the content script on demand
- `storage`: save theme preference and scan history
- `tabs`: read tab metadata such as the current URL

## Security

- Manifest V3 architecture
- `script-src 'self'`
- `style-src 'self'`
- `font-src 'self'`
- `object-src 'none'`
- No remote UI dependencies
- No inline scripts
- Popup visibility states use `hidden` instead of inline `display` styles

## Privacy

All scanning happens locally in the browser. The extension does not send scan results or browsing data to external servers.

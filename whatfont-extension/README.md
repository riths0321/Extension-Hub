# WhatFont - Font Identifier

WhatFont is a Chrome extension for inspecting typography on real web pages without opening DevTools. It supports hover inspection, click inspection, full-page scanning, live results in the popup, saved fonts, CSS copying, contrast checks, and a themed on-page overlay.

## Features

- Hover mode to inspect fonts by moving over text
- Click mode to inspect and hold font details on a selected element
- Scan All mode to collect font variants across the current page
- Live Detection card in the popup with quick copy support
- On-page overlay popup with copy button
- Font details view with CSS snippet copy
- WCAG contrast ratio display
- Saved fonts / bookmarks tab
- Light and dark popup theme
- Adjustable overlay position, including Follow Mouse
- Keyboard toggle with `Alt + W`

## Current UI

- Popup tabs: Detect, Fonts, Saved, Settings
- Detect tab: on/off toggle, mode switcher, start/stop controls, live detection card
- Fonts tab: detected font list with export and clear actions
- Saved tab: bookmarked fonts
- Settings tab: display options and overlay position control
- On-page overlay: themed card with font family, size, weight, style, color, contrast, and copy action

## Project Structure

```text
whatfont-extension/
├── background.js
├── content.js
├── manifest.json
├── popup.css
├── popup.html
├── popup.js
├── themes/
│   └── themes.css
└── images/
```

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this project folder
5. Pin the extension and open any normal `http` or `https` page

## How To Use

1. Open the extension popup
2. Choose `Hover`, `Click`, or `Scan All`
3. Start detection
4. Inspect text on the page
5. Copy details from the live popup card or the on-page overlay if needed

Shortcut:

- `Alt + W` toggles detection on the current page

## Permissions

- `activeTab`: interact with the current tab
- `storage`: save theme, mode, bookmarks, and settings
- `scripting`: inject content script and styles when needed
- `tabs`: track the active tab and tab state
- `clipboardWrite`: support copy actions
- `host_permissions: <all_urls>`: allow font inspection across websites

## Notes

- Chrome protected pages such as `chrome://` pages and some browser-controlled pages cannot be inspected
- If you reload the extension during development, refresh any already open webpage tabs before testing again

## License

MIT

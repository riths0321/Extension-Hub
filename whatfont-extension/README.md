# WhatFont - Font Identifier Pro

WhatFont is a modern Chrome extension for inspecting typography on real web pages without opening DevTools. It features hover inspection, click inspection, full-page scanning, live results in the popup, saved fonts, CSS copying, WCAG contrast checking, and a professional on-page overlay. Powered by Manrope typography with an enhanced color scheme.

## Features

- **Hover Mode** — Point at any text to inspect fonts in real-time
- **Click Mode** — Click to lock font details on a specific element
- **Scan All Mode** — Collect all font variants used across the current page
- **Live Detection Card** — Real-time font preview with instant copy support
- **On-Page Overlay** — Beautiful themed card showing font details directly on the page
- **Font Details View** — Comprehensive info including family, size, weight, style, color, and CSS
- **WCAG Contrast Ratio** — Automatic contrast checking (AAA/AA/AA+/Fail)
- **Saved Fonts / Bookmarks** — Keep and manage your favorite fonts
- **Professional UI** — Light theme with Manrope typography and strong color contrast (#0052CC primary)
- **Adjustable Overlay Position** — Top Right, Top Left, Bottom Right, Bottom Left, or Follow Mouse
- **Keyboard Shortcut** — `Alt + W` to toggle detection on any page

## Current UI

- **Detect Tab** — Toggle detection, select mode (Hover/Click/Scan), start/stop controls, live card
- **Fonts Tab** — List of detected fonts with export (JSON/CSS) and clear actions
- **Saved Tab** — Bookmarked fonts with quick access
- **Settings Tab** — Display preferences (download links, CSS snippets, contrast display, text highlighting) and overlay positioning
- **On-Page Overlay** — Card with font family, size, weight, style, computed color, WCAG ratio, and copy button

## Typography

- **Font Family:** Manrope (4 weights: Regular, Medium, SemiBold, Bold)
- **Light Theme:** Clean white panels (#ffffff) with strong text contrast (#2d3748)
- **Color Palette:**
  - Primary: #0052CC (vibrant blue)
  - Text: #2d3748 (dark gray)
  - Accent: #10B981 (emerald)
  - Danger: #E63946 (red)
  - Warn: #F59E0B (amber)

## Project Structure

```text
whatfont-extension/
├── background.js          (Service Worker - font storage, messaging)
├── content.js             (Content script - font detection, overlay injection)
├── manifest.json          (MV3 manifest with CSP policy)
├── popup.html             (Popup UI structure)
├── popup.js               (Popup logic, event handling, state management)
├── popup.css              (Manrope fonts, color variables, component styling)
├── fonts/
│   ├── Manrope-Regular.ttf
│   ├── Manrope-Medium.ttf
│   ├── Manrope-SemiBold.ttf
│   └── Manrope-Bold.ttf
├── images/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg
├── themes/
│   └── themes.css         (Content script overlay styles with system color preference)
└── README.md
```

## Installation

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `whatfont-extension` folder
5. Pin the extension to your toolbar
6. Open any website and start inspecting fonts!

## How to Use

### Basic Detection

1. Open the extension popup (click the icon)
2. Select a detection mode:
   - **Hover** — Move mouse over text (real-time)
   - **Click** — Click on text to lock details
   - **Scan All** — Automatically collect all fonts on the page
3. Click **Start Detection**
4. View live results in the popup or on-page overlay
5. Bookmark fonts you want to save

### Keyboard Shortcut

Press `Alt + W` to toggle detection on/off on the current page

### Export Fonts

1. Go to **Fonts** tab
2. Click **Export** menu
3. Choose:
   - **Export as JSON** — For backup or processing
   - **Export as CSS** — Ready-to-use @font-family rules

### Settings

Configure in the **Settings** tab:
- Show/hide Google Fonts search links
- Show/hide CSS snippets in details
- Show/hide WCAG contrast ratios
- Highlight inspected text option
- Adjust on-page overlay position (5 options including Follow Mouse)

## Technical Details

### Security & Compliance

- **CSP Policy:** `script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self';`
- **MV3 Manifest:** Modern Chrome extension architecture
- **No Inline Styles:** All styling in CSS files (CSP compliant)
- **Font Sources:** Local TTF files loaded via @font-face
- **Content Security:** No eval, no unsafe inline scripts

### Permissions

- **activeTab** — Interact with the current tab
- **storage** — Save detection state, bookmarks, settings, and UI preferences
- **scripting** — Inject content script and CSS for font detection and overlay
- **tabs** — Track active tab for font detection state
- **clipboardWrite** — Support copy-to-clipboard actions
- **host_permissions: \<all_urls\>** — Inspect fonts across all websites

### Browser Support

- Chrome 88+ (MV3 support required)
- Chromium-based browsers (Edge, Brave, Vivaldi, etc.)

## Limitations

- Chrome protected pages (chrome://, about://, extensions://) cannot be inspected
- Some third-party embedded content may be restricted
- Font detection works best on web pages with accessible DOM
- Always refresh webpage tabs after reloading the extension during development

## Shortcuts & Tips

- Use **Click Mode** for accurate inspection of styled text
- **Scan All** is useful for auditing typography across a whole page
- Bookmark fonts frequently used in your projects
- Export fonts as CSS for quick .woff2 integration
- Check WCAG contrast ratios for accessibility compliance

## Version History

### v2.0.0 (Current)
- ✨ Manrope typography for entire UI
- 🎨 Enhanced color scheme with primary #0052CC
- 🔒 CSP compliance improvements (no inline styles)
- 🗑️ Cleaned dead code (removed unused dark mode)
- ✅ Enterprise-grade security posture
- 📦 Optimized bundle size

### v1.2.0
- Initial light theme
- Font detection and overlay
- WCAG contrast checking
- Export functionality
- Bookmarks support

## Development

### Running Locally

1. Clone or download this folder
2. Open `chrome://extensions/`
3. Enable Developer mode
4. Click `Load unpacked` and select this folder
5. Open any website and test font detection

### Making Changes

1. Edit source files (JS, CSS, HTML)
2. After changes to manifest or background script: reload the extension (chrome://extensions/)
3. After changes to content or popup: refresh the webpage or extension popup to see updates
4. Check Chrome DevTools console for any errors

## Performance

- **Popup Size:** ~390px wide × responsive height
- **Memory Usage:** Minimal (content script loads only when active)
- **Font Files:** ~120KB combined (lazy-loaded, cached by browser)
- **Content Script:** Lightweight DOM tree walking with efficient event delegation

## License

MIT

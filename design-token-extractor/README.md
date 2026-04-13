# Design Token Extractor Pro

Design Token Extractor Pro scans the active webpage and exports design tokens in developer-friendly formats.

## Features
- Extracts colors, typography, spacing, shadows, border radius, and breakpoints.
- Export formats: CSS variables, Tailwind config, JSON, SCSS, and Figma token JSON.
- Category toggles to control what gets exported.
- Copy and download output directly from popup.
- All processing runs locally in the browser.

## Tech
- Chrome Extension Manifest V3
- Vanilla JavaScript
- HTML/CSS popup UI

## File Structure
- `manifest.json`
- `popup.html`
- `ui/dropdowns.js`
- `ui/popup.js`
- `content.js`
- `styles/popup.css`
- `styles/content.css`
- `icons/`

## Install
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select `design-token-extractor`

# Tech Detector Pro Documentation

## Overview

Tech Detector Pro is a Chrome Manifest V3 extension that inspects the active tab and presents the likely technologies powering the current site. The implementation is built around a local signature database, DOM-safe popup rendering, local history, and export utilities.

## Architecture

### Core files

- `manifest.json`: extension metadata, permissions, icons, and CSP
- `popup.html`: popup structure and accessible UI shell
- `popup.js`: popup behavior, scan flow, filters, export, history, and theme handling
- `popup.css`: popup layout, states, components, and visibility rules
- `theme-variables.css`: local font loading and theme tokens
- `background.js`: service worker bootstrap
- `content.js`: in-page detection logic
- `technologies.json`: local technology signature dataset

### Runtime flow

1. The popup loads the active tab, theme preference, and scan history.
2. On scan, `content.js` is injected into the active page using `chrome.scripting`.
3. The content script collects page signals and compares them against `technologies.json`.
4. Results return to the popup and are grouped by category.
5. The popup stores a short local history and supports copy/export actions.

## Current User-Facing Features

- Active-site card with hostname and favicon
- Scan and rescan actions
- Search box for filtering detected technologies
- Category pills for focused browsing
- Technology rows with category and confidence metadata
- External documentation links per detected technology
- Copy report to clipboard
- Export report as JSON
- Recent scan history with quick status feedback
- Light and dark theme support

## Theme System

The UI uses shared theme tokens in `theme-variables.css` and now loads Manrope locally through `@font-face`.

### Recent visibility improvements

- stronger light-theme body and supporting text
- brighter dark-theme text and more readable borders
- clearer section subtitles and labels
- bolder technology names and headings
- visible keyboard focus states on interactive controls

## CSP and Security

The popup now uses a tighter CSP:

- `script-src 'self'`
- `style-src 'self'`
- `font-src 'self'`
- `object-src 'none'`

### Security notes

- no remote Google Fonts dependency
- no inline scripts
- popup visibility toggles use `hidden`
- export/report generation happens locally
- scan history and theme state are stored locally in Chrome storage

## Permissions

- `activeTab`
- `scripting`
- `storage`
- `tabs`

These permissions are used for active-tab scanning, content-script injection, and local persistence.

## Known Constraints

- Detection accuracy depends on the quality and freshness of `technologies.json`
- Some backend and infrastructure detections remain heuristic
- Sites that heavily obfuscate assets may expose fewer signals
- JSON export still uses a local blob download created at runtime, which is acceptable because it is not driven by CSP-unsafe script execution

## Maintenance Guidance

- Keep new popup rendering DOM-safe and avoid user-controlled HTML injection
- Prefer classes or `hidden` for UI state instead of inline styles
- Keep fonts and UI assets local unless the CSP is intentionally revisited
- Re-check both themes whenever new cards, filters, or badges are added

## Testing Checklist

- Load the unpacked extension in Chrome
- Scan several different websites
- Verify results render and filters work
- Test search and clear search behavior
- Toggle between light and dark themes
- Confirm copy report and JSON export actions
- Confirm scan history stores and clears correctly
- Reload the extension and verify fonts, icons, and popup rendering remain stable

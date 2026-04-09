# README Generator Documentation

## Overview

README Generator is a Chrome Extension popup that turns a short project description into a formatted `README.md` draft. It is designed for local use, avoids external services, and keeps the UI lightweight enough for extension deployment.

## Verified Functionality

- Minimum 30-character input requirement before generation
- Three output templates: Standard, Minimal, and Detailed
- License selection: MIT, Apache 2.0, GPL 3.0, ISC, or None
- Generated Markdown preview inside the popup
- Copy action with a clipboard fallback
- Download action that saves `README.md`
- Stored user preferences with `chrome.storage.sync`
- Custom inline dropdowns that open upward to avoid overlapping lower content
- No external network dependency for the popup UI

## Security and Packaging Notes

- Manifest version: 3
- Permissions: `storage` only
- Minimum Chrome version: `88`
- Explicit CSP for extension pages
- No remote code
- No remote fonts
- No inline JavaScript

## Known Constraints

- Output quality still depends on the user description because generation is template-based.
- The popup preview shows raw Markdown, not rendered HTML.
- The copy fallback uses `document.execCommand("copy")` only when the modern clipboard API is unavailable or fails.

## Recommended Store Assets

- A short store summary emphasizing local-only generation
- Screenshots of the popup in empty and generated states
- A public privacy policy page using the same content as `privacy.html`

## Suggested Next Improvements

- Add keyboard navigation support for the custom dropdown menus
- Add rendered Markdown preview mode
- Add template-specific section toggles
- Add automated packaging validation before release

# Todo Tab — Smart Productivity

A privacy-first Chrome new-tab extension built with plain JavaScript (MV3, no frameworks).

It replaces the browser new tab with a fast task dashboard featuring:
- task management with categories, priority, due date, notes
- local analytics and completion insights
- light/dark theme toggle
- custom searchable dropdowns
- import/export backup

All data is stored locally on-device.

## Highlights

- `Manifest V3` extension using `chrome_url_overrides` for New Tab
- `CSP-safe` architecture (no `eval`, no `innerHTML`, no inline JS handlers)
- Strong visual contrast for both light and dark themes
- Drag-and-drop task reordering
- Category + priority filters
- Weekly and category analytics views
- JSON export/import with schema normalization and sanitization

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `todo-tab-extension`.
5. Open a new tab to use the extension.

## How To Use

### Tasks
- Add a task from the top search/add row.
- Set category, priority, due date, and notes in the add modal.
- Use filter pills (`All`, `Active`, `Done`, `Today`, `High`).
- Use category/priority dropdown filters for focused views.
- Mark complete with checkbox, delete with trash icon, reorder via drag handle.

### Import / Export
- Export from footer actions or Settings.
- Import a previous JSON backup from the import modal.
- Invalid/partial imports are sanitized and normalized before saving.

### Settings
- Switch Light/Dark theme.
- Set default category for new tasks.
- Clear all local data (tasks + settings reset).

### Analytics
- Completion rate and done-today summary cards
- 7-day added vs completed chart
- category-wise task breakdown

## Privacy & Security

- Data storage: `localStorage` only (no cloud sync).
- Network access: disabled by CSP (`connect-src 'none'`).
- No remote scripts/styles.
- Extension CSP in `manifest.json`:
  - `script-src 'self'`
  - `object-src 'none'`
  - `base-uri 'self'`
  - `frame-ancestors 'none'`
  - `img-src 'self' data:`
  - `style-src 'self' 'unsafe-inline'` (required for dynamic inline style updates)
  - `connect-src 'none'`
  - `form-action 'none'`

## Tech Stack

- HTML + CSS + Vanilla JavaScript
- Chrome Extension Manifest V3
- Modular JS files:
  - `app.js` — app shell, UI rendering, interactions
  - `todoService.js` — task business logic, filtering, import validation
  - `storageService.js` — local storage wrapper + safe settings defaults
  - `domHelpers.js` — safe DOM/SVG helper utilities
  - `dropdowns.js` — custom dropdown system

## Project Structure

```text
todo-tab-extension/
├── app.js
├── domHelpers.js
├── dropdowns.js
├── storageService.js
├── todoService.js
├── style.css
├── index.html
├── manifest.json
├── icons/
└── fonts/
```

## Version

- Current version: `2.0.0`

## Notes For Contributors

- Keep CSP-safe coding practices.
- Avoid introducing `innerHTML`, inline handlers, or dynamic code execution.
- Preserve local-only privacy model.
- When changing data schema, keep import normalization backward-compatible.

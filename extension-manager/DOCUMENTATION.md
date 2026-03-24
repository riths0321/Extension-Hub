# Extension Manager Pro Documentation

## 1. Overview

`Extension Manager Pro` is a Manifest V3 Chrome extension for quick extension management from a popup interface.

It is designed around a simple use case:

- view installed extensions
- search and filter them quickly
- enable or disable them
- inspect essential details
- remove or open settings when needed

The current product intentionally favors a compact popup workflow over a heavy dashboard.

---

## 2. Architecture

### Core Files

- `manifest.json`
  Chrome extension configuration

- `popup.html`
  Popup structure and layout

- `popup.css`
  Theme, layout, and component styling

- `popup.js`
  Main extension list logic, rendering, search, filters, actions, import/export

- `details-modal.js`
  Extension detail modal renderer and interactions

- `storage.js`
  Wrapper around `chrome.storage.local` for favorites, tags, and local metadata

- `background.js`
  Lightweight service worker for command support

---

## 3. Implemented Features

### Extension Listing

- uses `chrome.management.getAll()`
- excludes the current extension
- shows installed extensions in card layout
- displays:
  - icon
  - name
  - version
  - description
  - status

### Search and Filtering

- real-time search
- search fields:
  - name
  - description
  - developer label
- filters:
  - all
  - enabled
  - disabled
  - favorites

### Sorting

- name
- install date surrogate (`first seen`)
- enabled status
- developer

### Actions

- enable extension
- disable extension
- batch enable selected
- batch disable selected
- open details modal
- open settings/options page
- uninstall extension when removable

### Details Modal

- extension name
- version
- developer
- install type
- homepage URL
- description
- permissions
- security warnings
- tags
- favorite toggle

### Storage-backed Features

Stored with `chrome.storage.local`:

- favorites
- tags
- first seen timestamps
- backup/import metadata

### Backup and Restore

- export JSON backup
- import JSON backup
- restore extension enabled states where Chrome allows it

### UI States

- loading state
- empty state
- toast feedback
- statistics summary

---

## 4. UI Structure

Current popup layout:

1. Header
2. Statistics summary
3. Search and filter controls
4. Batch action area
5. Extension list

This matches the project’s current lightweight UX direction.

---

## 5. Theme System

The current visual system is documented separately in:

- `THEME_DESIGN.md`

Approved design baseline:

- font: `Manrope`
- white background
- primary blue actions
- black heading text
- grey secondary text
- rounded rectangle controls
- light blue borders and soft cards

Primary color references:

- `#FFFFFF`
- `#2563EB`
- `#111111`
- `#6B7280`

---

## 6. CSP and Security Notes

The current codebase is aligned with MV3 popup CSP expectations:

- no inline event handlers
- no inline script blocks
- no remote script loading
- no `eval`
- no `new Function`

Additionally:

- previous `innerHTML` usage in popup rendering was removed
- popup and modal UI are now rendered with DOM APIs for stronger XSS hygiene

Security-related UI support:

- risky permission highlighting
- broad host permission warning
- warning count per extension

---

## 7. Technical Notes

### Developer Label

Developer info is inferred from:

- `homepageUrl` hostname when available
- fallback to `installType`

### Install Date Sorting

Chrome Management API does not expose a true install timestamp.

Current workaround:

- a local `first seen` timestamp is stored in `chrome.storage.local`
- this value is used as the install-date-like sort key

### Settings Button

The settings action:

- opens `optionsUrl` when present
- otherwise opens `chrome://extensions/?id=<extension-id>`

---

## 8. Current Product Decisions

The extension previously explored broader feature ideas, but the current direction is intentionally more focused.

Removed from active popup UX:

- profile management controls
- performance monitoring section

Reason:

- they added clutter to the popup
- they were not essential to the core extension-management workflow

---

## 9. Known Limitations

- Chrome may block changes for protected or policy-managed extensions
- uninstall is not available for every extension
- true install date is not available from the API
- some extension icons may fall back to the default icon
- favorites and tags are local to the browser profile using `chrome.storage.local`

---

## 10. Recommended Future Direction

Keep the extension focused on quick management.

Good future improvements:

- small accessibility pass
- improved keyboard navigation
- local bundled Manrope font files for exact typography consistency
- optional settings page for non-core preferences

Avoid:

- heavy multi-section dashboards
- adding unrelated productivity tools
- overloading the popup with rarely used controls


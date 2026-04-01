# Extension Manager Pro Documentation

## 1. Overview

Extension Manager Pro is a Manifest V3 Chrome extension for fast extension management from a single popup.

Primary goals:
- View installed extensions
- Search and filter quickly
- Enable/disable
- Inspect details
- Remove or open settings

---

## 2. Architecture

### Core Files
- manifest.json
  - MV3 config and CSP

- popup.html
  - Popup layout and templates

- popup.css
  - Theme, layout, and component styles

- popup.js
  - Main logic: rendering, filtering, actions, backup

- details-modal.js
  - Details modal UI and events

- settings-modal.js
  - Settings modal (profiles, backup, display)

- dropdowns.js
  - Custom dropdown system (CSP-safe)

- storage.js
  - chrome.storage.local wrapper

- background.js
  - Lightweight service worker (keyboard shortcut handler)

---

## 3. Implemented Features

### Extension Listing
- Uses chrome.management.getAll()
- Excludes self
- Shows icon, name, version, description, status

### Search and Filtering
- Search by name, description, developer
- Filters: all, enabled, disabled, favorites

### Actions
- Enable/disable toggle
- Remove (when allowed)
- Open settings/options page
- Batch enable/disable

### Details Modal
- Name, version, developer label
- Permissions and risky warnings
- Favorites toggle
- Tags

### Settings Modal
- Profile management
- Backup export/import
- Display toggles

### Backup and Restore
- Export JSON
- Import JSON
- Restore extension enabled states (if Chrome allows)

### UI States
- Loading
- Empty
- Toast feedback
- Compact stats section

---

## 4. UI Structure

Popup layout:
1. Header with actions
2. Compact stats grid
3. Search and filter
4. Batch controls
5. Extension list

Settings and details use modal overlays.

---

## 5. Theme System

Baseline:
- Font: Manrope (local files)
- White panels
- Primary blue actions
- Rounded UI controls

Local font files:
- fonts/Manrope-Regular.ttf
- fonts/Manrope-Medium.ttf
- fonts/Manrope-SemiBold.ttf
- fonts/Manrope-Bold.ttf

---

## 6. CSP and Security Notes

Current CSP (extension pages):
- default-src 'self'
- script-src 'self'
- style-src 'self'
- img-src 'self' data: chrome://extension-icon/
- font-src 'self'
- connect-src 'none'
- object-src 'none'
- base-uri 'none'

Security practices:
- No eval
- No inline scripts
- DOM APIs for rendering
- No alert/confirm/prompt (custom modal UI used)
- Custom dropdowns without innerHTML SVG injection

---

## 7. Technical Notes

### Developer Label
Derived from:
- homepageUrl hostname when present
- otherwise installType

### Install Date
Chrome does not expose install date. We store a local first-seen timestamp in storage.

---

## 8. Known Limitations

- Some extensions cannot be disabled/removed (policy or Chrome protected)
- True install date not available
- Some icons may fall back to default

---

## 9. Recommended Next Steps

- Accessibility pass (keyboard focus, ARIA)
- Optional settings page for advanced preferences
- Inline SVG icon set (for more consistent UI)


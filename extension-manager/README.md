# Extension Manager Pro

Extension Manager Pro is a lightweight Chrome extension that helps users manage installed extensions from a single popup.

Built with:
- Manifest V3
- Pure HTML, CSS, and JavaScript
- Chrome management API
- Chrome storage API

## Current Product Scope

Focused on fast extension management (not a multi-page dashboard):

1. Open popup
2. Search or filter installed extensions
3. Enable or disable quickly
4. Inspect details, open settings, or remove when needed

## Current Features

### Extension Management
- List installed Chrome extensions via chrome.management.getAll()
- Exclude the manager extension itself
- Show icon, name, version, status, and summary
- Enable/disable extensions with toggle
- Uninstall extensions when allowed
- Open extension settings/options page

### Search, Filter, Sort
- Search by name, description, developer
- Filter: all, enabled, disabled, favorites
- Sort by name

### Details and Organization
- Details modal
- Permission list with risky highlight
- Favorites
- Custom tags stored in chrome.storage.local

### Batch and Backup
- Multi-select extensions
- Batch enable/disable
- Export backup JSON
- Import backup JSON (restore allowed states)

### UI and UX
- Compact stats section
- Clean, user-friendly layout
- Loading and empty states
- Toast feedback
- Manrope-first typography (local fonts)
- Custom dropdowns (CSP-safe)
- Custom confirmation dialogs (no alert/confirm/prompt)

## Theme

Baseline:
- Background: #FFFFFF
- Primary blue: #2563EB
- Primary text: #111111
- Secondary text: #6B7280
- Font: Manrope

## Permissions
- management
- storage

## File Structure

```
extension-manager/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── dropdowns.js
├── details-modal.js
├── settings-modal.js
├── storage.js
├── background.js
├── README.md
├── DOCUMENTATION.md
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── fonts/
    ├── Manrope-Regular.ttf
    ├── Manrope-Medium.ttf
    ├── Manrope-SemiBold.ttf
    └── Manrope-Bold.ttf
```

## Installation

1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select the extension-manager folder

## Notes
- Some extensions cannot be disabled or removed due to Chrome or policy restrictions
- Install date is not exposed; we use a local first-seen timestamp
- Extension icons may fall back to the default icon

## Documentation

See DOCUMENTATION.md for deeper implementation notes.

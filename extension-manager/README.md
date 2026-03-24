# Extension Manager Pro

`Extension Manager Pro` is a lightweight Chrome extension that helps users manage installed extensions from a single popup.

It is built with:

- Manifest V3
- pure HTML, CSS, and JavaScript
- Chrome `management` API
- Chrome `storage` API

## Current Product Scope

The extension is focused on quick extension management, not a full multi-page dashboard.

Core workflow:

1. Open popup
2. Search or filter installed extensions
3. Enable or disable quickly
4. Open settings, inspect details, or remove when needed

## Current Features

### Extension Management

- list installed Chrome extensions using `chrome.management.getAll()`
- exclude the manager extension itself
- show extension icon, name, version, status, and summary details
- enable or disable extensions with a toggle
- uninstall extensions with a simple remove action
- open extension settings/options page when available

### Search, Filter, and Sort

- search extensions by name, description, and developer
- filter by:
  - all
  - enabled
  - disabled
  - favorites
- sort by:
  - name
  - install date surrogate (`first seen`)
  - enabled status
  - developer

### Details and Organization

- extension details modal
- permission list display
- risky permission highlighting
- favorite extensions
- custom tags stored in `chrome.storage.local`

### Batch and Backup

- multi-select extensions
- batch enable
- batch disable
- export extension state and saved metadata as JSON
- import saved JSON and restore supported states

### UI and UX

- clean popup layout
- loading state
- empty state
- extension statistics
- responsive popup design
- blue/white product-aligned theme
- Manrope-first typography

## Theme

The extension follows the shared design system documented in:

- [THEME_DESIGN.md](./THEME_DESIGN.md)

Theme baseline:

- background: `#FFFFFF`
- primary blue: `#2563EB`
- primary text: `#111111`
- secondary text: `#6B7280`
- font family: `Manrope`

## Permissions

The extension currently uses:

- `management`
- `storage`

## File Structure

```text
extension-manager/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── details-modal.js
├── storage.js
├── background.js
├── THEME_DESIGN.md
├── DOCUMENTATION.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension-manager` folder

## Notes

- some extensions cannot be disabled or removed if Chrome or policy restrictions apply
- true install date is not exposed by the Chrome Management API, so sorting uses a local `first seen` value
- settings button opens the extension options page when available, otherwise falls back to the Chrome extensions page

## Documentation

For deeper implementation notes, see:

- [DOCUMENTATION.md](./DOCUMENTATION.md)


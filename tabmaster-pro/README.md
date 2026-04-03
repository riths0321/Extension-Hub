# TabMaster Pro

TabMaster Pro is a Manifest V3 Chrome extension for managing tabs, putting inactive tabs to sleep, and saving/restoring browser sessions from one popup.

## What It Does

- View all open tabs across windows
- Search, sort, and filter tabs
- Close duplicate tabs
- Group tabs by domain
- Sleep individual tabs or all eligible inactive tabs
- Wake sleeping tabs
- Save named browsing sessions
- Restore or delete saved sessions
- Configure sleep and session behavior from the Settings panel

## Verified Fixes

The current build includes fixes for a few problems that were affecting reliability:

- Fixed selected-tab close flow so tabs are not closed twice
- Fixed sleep panel refresh so tab sleep state always reloads from live browser data
- Added bulk session clearing support in the service worker
- Persisted tab activity and default settings more reliably in background storage
- Hardened extension CSP by removing inline popup styles and using explicit local-only `style-src` / `font-src`
- Expanded `img-src` so favicons from both `http:` and `https:` pages can render without CSP violations

## CSP Notes

This extension now follows a stricter Manifest V3 extension-page CSP:

```json
"extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data: http: https:; font-src 'self';"
```

That means:

- No inline scripts
- No inline event handlers
- No inline styles in popup markup
- Local CSS and fonts only
- Favicons are limited to `self`, `data:`, `http:`, and `https:`

## Project Structure

```text
tabmaster-pro/
├── manifest.json
├── services/background.js
├── ui/popup.html
├── ui/popup.js
├── ui/popup.css
├── utils/helpers.js
└── icons/
```

## Permissions

The extension uses these Chrome permissions:

- `tabs` for listing, switching, discarding, reloading, and closing tabs
- `tabGroups` for grouping tabs and restored sessions
- `storage` for sessions and settings
- `alarms` for periodic sleep checks
- `idle` for battery saver style sleep timing behavior
- `host_permissions: ["<all_urls>"]` so tab metadata and favicons can be handled consistently

## How To Load

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select the `tabmaster-pro` folder

## Main Flows

### Tabs

- Search tabs by title or URL
- Filter by pinned, audio, sleeping, or duplicates
- Close duplicate tabs
- Group matching tabs by domain
- Select multiple tabs and close or sleep them

### Sleep

- Set a sleep timer
- Ignore pinned tabs
- Ignore tabs playing audio
- Enable battery mode
- Sleep all inactive tabs
- Wake all sleeping tabs

### Sessions

- Save a named session
- Tag the session implicitly by mode selected in the UI
- Restore a session into the current window
- Auto-save current state before restore if enabled
- Clear all saved sessions from Settings

## Files You Should Edit Most Often

- `ui/popup.js` for popup behavior
- `ui/popup.css` for styling
- `services/background.js` for service-worker logic
- `manifest.json` for permissions and CSP

## Testing Checklist

Use this quick manual checklist after loading the extension:

1. Open popup and confirm tabs list loads
2. Search and filter tabs
3. Close duplicate tabs
4. Group tabs by domain
5. Sleep one tab and wake it again
6. Sleep all inactive tabs
7. Save a session and restore it
8. Clear all sessions from Settings
9. Confirm popup opens without CSP errors in the extension console

## Known Limitations

- Chrome internal pages like `chrome://` and `about:` cannot be managed the same way as normal web pages
- Some tabs may refuse discard/reload depending on browser restrictions
- Favicon availability depends on the source page and Chrome security rules

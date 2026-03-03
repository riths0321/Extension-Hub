# Cover Letter Studio (Chrome Extension)

A Chrome MV3 extension to generate structured cover letters from form inputs, with local auto-save and quick export.

## Highlights
- Distinct premium popup UI with readable contrast.
- Local draft autosave (`chrome.storage.local`) for both fields and latest generated letter.
- Required-field validation (`Full Name`, `Job Title`, `Company`).
- Copy to clipboard and `.txt` download.
- Fully CSP-safe popup architecture (no inline scripts, no `eval`, no remote assets).

## Files
- `manifest.json`
- `popup.html`
- `style.css`
- `popup.js`
- `icons/`

## Install
1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select the `cover-letter` folder.

## Notes
- Data stays local to the browser profile.
- No external API calls are used.

# Email Extractor Pro

Email Extractor Pro is a Chrome extension for extracting email addresses from the current page, reviewing them in a clean popup, and exporting results quickly.

## Features

- Extract emails from visible text, page HTML, and `mailto:` links
- Save results per tab with Chrome local storage
- Auto-detect mode when the popup opens
- Search, sort, group, and multi-select extracted results
- Copy individual emails or the current filtered list
- Export filtered or selected results to CSV
- View recent extraction history

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this project folder

## Usage

1. Open any normal `http` or `https` page
2. Click the extension icon
3. Press `Extract Emails from Page`
4. Use search, sorting, grouping, selection, copy, export, or history tools as needed
5. Turn on `Auto Detect` if you want the popup to scan automatically on open

## Permissions

- `activeTab`: accesses the current tab after the user opens the extension
- `storage`: saves extracted emails, settings, and history locally
- `scripting`: runs the extraction logic in the active tab

## Notes

- Browser internal pages like `chrome://` and `edge://` cannot be scanned
- Some sites hide or obfuscate emails, so not every address can be detected
- Copy and export use the current filtered list unless selection mode is active

## Files

- `manifest.json`: extension manifest
- `popup.html`: popup markup
- `popup.css`: popup styles
- `popup.js`: popup logic and extraction code
- `icons/`: extension icons

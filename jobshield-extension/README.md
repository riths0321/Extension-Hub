# JobShield: Job Scam Detector

JobShield is a Chrome MV3 extension that scans job-related pages and highlights scam risk indicators.

## What it does
- Scans current page content for scam-like hiring patterns.
- Calculates a risk score (`0-100`) and status (`safe`, `suspicious`, `danger`).
- Shows detected signals in popup with local scan history.
- Optional on-page floating badge for quick risk visibility.

## Privacy
- Analysis runs locally in the browser.
- No remote API calls.
- Scan history is stored only in `chrome.storage.local`.

## Project files
- `manifest.json`
- `popup.html`, `styles.css`, `popup.js`
- `content.js`
- `background.js`
- `icons/`

## Install
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `jobshield-extension`

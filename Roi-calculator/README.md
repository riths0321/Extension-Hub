# Feature ROI Pro


Feature ROI Pro is a Manifest V3 Chrome extension for evaluating product and business initiatives with ROI, risk, portfolio insights, scenario analysis, and export tools.

## Highlights

- Calculate ROI, cost, net profit, profit margin, payback, NPV, IRR, CAGR, ROAS, and 3-year profit
- Track projects with category, status, notes, tags, confidence, risk level, and time horizon
- Compare saved features side-by-side
- Run best-case, worst-case, realistic, and custom scenarios
- Save and reuse templates
- View portfolio summaries, category breakdowns, trend charts, and smart recommendations
- Export data as CSV, JSON, Excel, and printable PDF report
- Toggle light and dark mode
- Store history locally with `chrome.storage.local`

## Accessibility and UI

- Improved contrast for labels, helper text, badges, and status colors
- Restored extension icons in the manifest for toolbar and extension management visibility
- Strict CSP-compatible popup implementation with no inline event handlers or inline styles

## Installation

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `Roi-calculator` folder

## Project Structure

```text
Roi-calculator/
├── manifest.json
├── popup.html
├── popup.js
├── style.css
├── report.html
├── report.css
├── report.js
├── README.md
├── DOCUMENTATION.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

- `storage`: used to persist project history, templates, theme choice, and report handoff data locally in the browser

No external APIs, analytics, or remote code are required.

## Notes

- Built for Chrome Manifest V3
- Minimum Chrome version: `114`
- Current version: `2.0.0`

## License

MIT

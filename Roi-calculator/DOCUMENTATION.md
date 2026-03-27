# Feature ROI Pro Documentation

## 1. Overview

Feature ROI Pro is a Chrome Manifest V3 extension for evaluating product, growth, support, infrastructure, and business initiatives. It combines ROI calculation with portfolio tracking, scenario modeling, templates, exports, and lightweight business health metrics.

## 2. Current Version

- Name: `Feature ROI Pro`
- Version: `2.0.0`
- Popup entry: `popup.html`
- Minimum Chrome version: `114`
- Storage: `chrome.storage.local`

## 3. Implemented Features

### Core ROI Analysis

- Feature name, category, status, notes, and tags
- Annual gain, development hours, hourly rate, and time horizon
- Risk level and confidence scoring
- Calculated outputs:
  - ROI
  - Total cost
  - Net profit
  - Profit margin
  - Payback period
  - NPV
  - IRR
  - CAGR
  - ROAS
  - Multi-year profit
  - Risk-adjusted ROI
  - Risk score

### Scenario Modeling

- Best case
- Realistic case
- Worst case
- Custom multiplier scenario
- Apply a scenario result back into the main calculator

### Project History and Portfolio

- Saved project history in local browser storage
- Favorites support
- Search and filtering
- Sorting by date, ROI, profit, and cost
- Best ROI summary
- Average ROI summary
- Total profit summary
- Category distribution
- ROI trend visualization

### Insights

- Priority matrix
- Smart recommendations
- ROI distribution view

### Templates

- Save current calculator settings as a reusable template
- Load or delete saved templates

### Business Metrics

- LTV
- CAC
- Churn
- Active customers
- MRR
- Growth rate
- Derived business health metrics and summary messaging

### Export Options

- CSV
- JSON
- Excel-compatible export
- Printable PDF report via extension-owned report page

## 4. CSP and Security Notes

The extension now follows a strict extension page CSP:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self';"
}
```

To stay compatible with this policy:

- inline event handlers were removed
- inline style attributes were removed from popup-rendered content
- the printable report was moved to dedicated files:
  - `report.html`
  - `report.css`
  - `report.js`

## 5. Icons and Manifest

The manifest declares both toolbar and extension icons:

- `action.default_icon`
- top-level `icons`

These map to:

- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

## 6. Visual and Usability Updates

Recent UI maintenance improved visibility by strengthening:

- secondary text contrast
- muted helper text contrast
- semantic status colors such as green, red, and orange
- dark mode readability

This was done primarily through shared design tokens in `style.css` so readability improvements apply consistently across the popup.

## 7. File Reference Summary

- `manifest.json`: extension metadata, icons, permissions, CSP
- `popup.html`: popup structure and modal layout
- `popup.js`: calculator logic, storage, scenarios, history, insights, export flow
- `style.css`: popup styling, themes, visibility improvements
- `report.html`: printable report shell
- `report.css`: printable report styles
- `report.js`: report data rendering and print trigger

## 8. Local Testing Checklist

1. Reload the unpacked extension in Chrome
2. Confirm toolbar icon appears correctly
3. Open popup and verify light mode readability
4. Toggle dark mode and verify readability
5. Run a calculation and inspect history save behavior
6. Open scenario modal and apply a scenario
7. Save and load a template
8. Export CSV, JSON, Excel, and PDF report
9. Confirm there are no CSP errors in the extension console

## 9. Known Constraints

- Data is local-only and not synced across devices
- PDF export uses a browser print flow rather than a bundled PDF library
- Storage is limited by Chrome local storage capacity

## 10. Maintenance Guidance

When updating the popup in the future:

- avoid inline handlers like `onclick`
- avoid inline `style=""` attributes for dynamic UI
- keep report rendering in dedicated files if print/export UI grows
- maintain icon declarations in the manifest
- preserve strong contrast for helper text and state colors

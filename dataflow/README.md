# DataFlow Converter

A powerful browser extension for converting CSV, JSON, and TSV files with advanced filtering, sorting, and formatting capabilities — all offline and privacy-focused.

## Overview

DataFlow Converter is a Chrome extension that provides a clean, intuitive interface for converting between CSV, JSON, and TSV formats. Built as a Manifest V3 extension, it processes all data locally on your machine with no external API calls, ensuring your data stays private and secure.

## Features

### Core Conversion
- **CSV → JSON** — Convert comma-separated values to structured JSON
- **JSON → CSV** — Transform JSON arrays to tabular CSV format
- **CSV → TSV** — Convert CSV to tab-separated values
- **JSON → TSV** — Convert JSON to tab-separated format

### Advanced Options
- **Delimiter Support** — Choose from comma, semicolon, pipe, tab, or custom delimiters
- **JSON Formatting** — Control indentation (2 spaces, 4 spaces, or minified)
- **Header Detection** — First row as header or auto-generate column names
- **Type Inference** — Automatically detect and convert numbers, booleans, and null values
- **Deduplication** — Remove duplicate rows from your data
- **Row Filtering** — Filter by column values with operators:
  - Contains
  - Equals
  - Starts with
  - Greater than
  - Less than
- **Column Sorting** — Sort data ascending or descending by any column

### Templates System
Save your conversion configurations as templates for repeated use. Templates store:
- Conversion mode
- All advanced option settings
- Filter and sort criteria

### User Experience
- **Drag & Drop** — Simply drag files onto the drop zone
- **Step-by-Step Workflow** — Clear progression from upload → configure → result
- **Progress Indicator** — Visual feedback during file processing
- **Copy to Clipboard** — One-click copy of converted results
- **Direct Download** — Save converted files instantly

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked** and select the extension directory
5. The DataFlow Converter icon will appear in your extensions toolbar

## File Structure

```
dataflow-converter/
├── popup.html          # Main extension popup interface
├── popup.css           # Styling with premium design system
├── popup.js            # UI logic and event handlers
├── worker.js           # Web Worker for data processing
├── dropdowns.js        # Custom dropdown component
├── manifest.json       # Extension manifest (MV3)
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Usage Guide

### Step 1: Upload
- Click the drop zone or drag a CSV/JSON/TSV file onto it
- Supported formats: `.csv`, `.json`, `.tsv`, `.txt`

### Step 2: Configure
1. **Select Conversion Mode** — Choose your target format
2. **Configure Advanced Options** (optional):
   - Set delimiter for CSV/TSV output
   - Adjust JSON indentation
   - Enable/disable header detection
   - Toggle type inference
   - Add filter conditions
   - Set sort preferences
3. **Save as Template** — Name and save your configuration for future use

### Step 3: Result
- View the converted output in the preview panel
- **Copy** to clipboard or **Download** the file
- Click **"Convert another file"** to start over

## Technical Details

### Architecture
- **Manifest V3** — Compliant with Chrome's latest extension standards
- **Web Worker** — Background processing prevents UI freezing on large files
- **CSP-Safe** — No eval, no dynamic styles, fully CSP compliant
- **Local Storage** — Templates stored securely in browser storage

### Data Processing
- **Robust CSV Parser** — Handles quoted fields, escaped quotes, and multi-line values
- **Type Inference** — Automatically detects numbers, booleans, and nulls
- **Streaming Progress** — Real-time progress updates during processing
- **Memory Efficient** — Processes data incrementally for large files

### Supported File Sizes
Handles files up to several hundred MB (limited by browser's memory and file reader capabilities).

## Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | 88+ (MV3 support) |
| Edge    | 88+ |
| Opera   | 75+ |
| Brave   | Latest |

## Privacy & Security

- **100% Offline** — No data ever leaves your computer
- **No External APIs** — All processing happens locally
- **Minimal Permissions** — Only `storage` permission for templates
- **CSP Compliant** — Strict content security policy enforcement

## Development

### Prerequisites
- Node.js (for testing, optional)
- Chrome/Chromium browser

### Local Development
1. Clone the repository
2. Make changes to source files
3. Reload the extension in `chrome://extensions/` to test

### Building for Distribution
1. Ensure all icons are present (16px, 48px, 128px)
2. Update version in `manifest.json`
3. Package as ZIP for Chrome Web Store submission

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File not loading | Check file format and size. Ensure it's not corrupted. |
| JSON parsing error | Verify your JSON is valid (arrays of objects). |
| CSV columns mismatched | Check delimiter setting matches your file. |
| Filter not working | Column names are case-sensitive. Verify spelling. |
| Extension not loading | Enable developer mode and check console for errors. |

## Credits

Developed as a premium conversion tool with focus on:
- Clean, modern UI with brand blue (#2563EB) accent
- Smooth animations and transitions
- Accessible components with ARIA labels
- Responsive design within popup constraints (380px width)

## License

This project is proprietary software. All rights reserved.

## Version History

**v2.0.0**
- Complete redesign with premium UI
- Added templates system
- Added advanced filtering and sorting
- Added progress indicators
- Improved CSV parser with quoted field support
- Added type inference
- Implemented deduplication feature

**v1.0.0** *(Legacy)*
- Basic CSV ↔ JSON conversion
- Simple UI

---

*DataFlow Converter — Convert smarter, not harder.*
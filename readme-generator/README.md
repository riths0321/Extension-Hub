# README.md Generator

A Chrome Extension that generates clean, professional `README.md` drafts from a project description. The extension runs locally in the popup, supports multiple templates, and lets users copy or download the generated Markdown immediately.

## Highlights

- Manifest V3 extension
- Local-only generation with no external API calls
- Standard, Minimal, and Detailed templates
- License selector for common open-source licenses
- Copy and download actions for generated Markdown
- Strict CSP for extension pages
- Minimal permission surface using only `storage`

## Project Structure

```text
readme-generator/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── privacy.html
├── privacy.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

1. Enter a project description with at least 30 characters.
2. Choose a template and a license.
3. Generate a README draft in the preview panel.
4. Copy the Markdown or download it as `README.md`.

## Templates

| Template | Purpose |
| --- | --- |
| Standard | Balanced README with the most common sections |
| Minimal | Short output for smaller or simpler projects |
| Detailed | More structured output with installation, usage, and contributing sections |

## Security

This extension is packaged for Chrome Manifest V3 and uses a strict extension-page Content Security Policy:

```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; connect-src 'none';"
}
```

Security notes:

- No remote scripts
- No inline scripts or inline event handlers
- No remote fonts
- No network requests from extension pages
- No external data processing

## Permissions

The extension requests:

- `storage`: saves the last input, selected template, and selected license

## Local Development

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select this project folder

## Chrome Web Store Readiness

Before publishing, make sure to:

1. Review the extension name, summary, and screenshots in the store listing.
2. Host the privacy policy from [privacy.html](/Users/aplle/Desktop/readme-generator/privacy.html) or copy its contents to your public policy page.
3. Confirm the final icons and screenshots match the shipped UI.
4. Load the unpacked extension once and check for console warnings in the popup.

## License

MIT

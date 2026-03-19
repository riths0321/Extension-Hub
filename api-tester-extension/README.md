# API Tester Pro

`API Tester Pro` is a CSP-safe Chrome extension with a lightweight popup and a dedicated premium workspace for API development workflows.

## What it includes

- Full REST testing with multiple HTTP methods
- Advanced request builder with query params, headers, body types, and auth helpers
- Authentication helpers for Bearer, API key, Basic auth, and OAuth client credentials
- Environment variables and reusable request templates
- Collections with folder grouping and search
- Batch execution and request chaining with response extractors
- Response viewer for JSON, XML/HTML-like payloads, raw output, headers, and diffs
- Assertion checks for status, text matching, and JSON key validation
- Metrics for status, response time, payload size, and format
- History with search, favorites, export, and reload
- GraphQL, WebSocket, and webhook-oriented request modes
- Snippet generation for cURL, Python, and JavaScript
- API documentation, CI/CD snippet, and mock config generation
- Scheduled request execution through an MV3 background worker

## Architecture

- `popup.html`
  Fast launcher with recent requests
- `workspace/workspace.html`
  Full testing workspace
- `settings.html`
  Theme and request defaults
- `background.js`
  Alarm-based schedule runner
- `modules/storage.js`
  Local persistence for settings, collections, environments, history, and schedules

## CSP notes

- No remote scripts
- No inline scripts
- Local module scripts only
- Local bundled Manrope fonts

## Load locally

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select `/Users/apple/Desktop/Extension-Hub/api-tester-extension`

# API Tester Pro Documentation

## Overview

API Tester Pro is now structured as a two-level experience:

- A lightweight popup for fast launch and recent requests
- A full workspace page for advanced API testing

This keeps the popup responsive while still supporting a premium, developer-focused feature set.

## Implemented feature areas

### Request building
- REST methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Query parameter editor
- Header editor
- Multiple body modes: JSON, text, form-url-encoded, GraphQL
- Auth helpers:
  - Bearer token
  - API key (header or query)
  - Basic auth
  - OAuth client-credentials helper

### Reusability
- Environment variables with `{{variable}}` replacement
- Starter templates
- Saved collections grouped by folder
- Search across saved requests

### Testing workflow
- Batch queue execution
- Response chaining through extractors
- Assertions:
  - Expected status
  - Body contains text
  - Required JSON keys

### Response tooling
- Pretty response output
- Raw response output
- Response headers view
- Diff against previous response
- Metrics: time, size, status, detected format

### Productivity
- History with search and favorites
- Export/import workspace JSON
- Snippet generation:
  - cURL
  - Python
  - JavaScript
- API docs generation
- CI/CD export snippet
- Mock config generation

### Additional protocols
- GraphQL mode
- WebSocket mode
- Webhook-oriented POST mode

### Scheduling
- MV3 background worker with `chrome.alarms`
- Saved schedules run in the background
- Notifications on success/failure

## CSP compliance

The extension was updated to stay compatible with strict extension CSP:

- All JavaScript is loaded from local files
- All pages use module scripts from the extension package
- No external CDNs
- No inline script blocks
- Fonts are bundled locally

## Main files

- `manifest.json`
- `popup.html`
- `popup.js`
- `themes.css`
- `workspace/workspace.html`
- `workspace/workspace.css`
- `workspace/workspace.js`
- `settings.html`
- `settings.css`
- `settings.js`
- `background.js`
- `modules/storage.js`
- `modules/utils.js`

## Current limitations

- OAuth support is client-credentials helper based, not a full browser OAuth dance
- Mock support generates reusable config payloads, not a local HTTP server
- Team collaboration is handled through import/export payloads, not live multi-user sync
- WebSocket mode focuses on connect/send/receive logs, not long-lived inspector tooling

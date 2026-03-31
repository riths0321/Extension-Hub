# GitIgnore Generator Pro

GitIgnore Generator Pro is a Chrome extension for generating `.gitignore` files quickly with smart project detection, reusable templates, and a polished popup UI.

## Core MVP Features

- Intelligent `.gitignore` generator with automatic project detection
- Support for multiple languages, frameworks, and development environments
- Rule-based system with selectable ignore patterns and categories
- Preview editor showing generated `.gitignore` content before export
- Export options including copy to clipboard and downloadable `.gitignore` file
- Template library with reusable presets for different project types
- Responsive UI with theme customization and settings persistence

## Phase 2 Features

- Inline explanations and documentation for each rule
- Custom rule creation and template saving capabilities
- Automatic scanning of project dependency files for optimized ignore rules
- Generation of related configuration files such as `.gitattributes`, `.editorconfig`, and `.dockerignore`
- Best practice recommendations for repository structure

## Current Product Direction

The extension should stay focused on being a fast and dependable `.gitignore` builder. Features that turn it into a full Git platform, team-governance, or security-scanning suite should stay out of the MVP scope.

## Installation

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `gitignore-extension` folder

## Current UI Flow

1. Select one or more technologies
2. Choose a deployment platform if needed
3. Optionally auto-detect from the current page
4. Generate the `.gitignore`
5. Review the output in the preview area
6. Copy or download the generated file

## Architecture

```text
gitignore-extension/
├── background.js
├── DOCUMENTATION.md
├── icons/
├── manifest.json
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
└── README.md
```

## Security

- Manifest V3 extension
- Local popup logic only
- No remote UI dependencies
- CSP defined in `manifest.json`
- Theme and settings persisted locally with Chrome storage

## Privacy

All generation and page analysis happen locally in the browser. No generated content is sent to external servers.

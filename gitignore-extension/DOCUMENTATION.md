# GitIgnore Generator Pro Documentation

## Overview

GitIgnore Generator Pro is a Chrome Manifest V3 extension for building `.gitignore` files from a guided popup workflow. The product direction should remain centered on speed, clarity, and local-first generation instead of trying to become a full repository-management platform.

## Recommended Feature Scope

### Core MVP

- Intelligent `.gitignore` generator with automatic project detection
- Support for multiple languages, frameworks, and development environments
- Rule-based system with selectable ignore patterns and categories
- Preview editor showing generated `.gitignore` content before export
- Export options including copy to clipboard and downloadable `.gitignore` file
- Template library with reusable presets for different project types
- Responsive UI with theme customization and settings persistence

### Phase 2

- Inline explanations and documentation for each rule
- Custom rule creation and template saving capabilities
- Automatic scanning of project dependency files for optimized ignore rules
- Generation of related configuration files such as `.gitattributes`, `.editorconfig`, and `.dockerignore`
- Best practice recommendations for repository structure

### Not for Current MVP

- Team governance workflows
- Organization policy enforcement
- GitHub, GitLab, or Bitbucket integration flows
- Secret scanning or full security-audit tooling
- Collaboration layers such as comments, sharing, ratings, or approvals

## Current Codebase Reality

The current extension already aligns best with a streamlined generator experience:

- technology checkboxes
- platform presets
- automatic page-based detection
- generated output preview
- copy and download actions
- theme persistence

This means the product should build depth around template quality and guided selection, not around enterprise workflow complexity.

## Architecture

### Main files

- `manifest.json`: extension metadata, permissions, and CSP
- `background.js`: lightweight background setup
- `popup/popup.html`: popup interface structure
- `popup/popup.css`: theme system, typography, and layout
- `popup/popup.js`: generation logic, detection, theme handling, and export actions

## UX Direction

The UI should communicate:

- fast generation
- clear selection flow
- easy output review
- low-friction copy/download actions
- consistent, readable typography

Typography should be applied consistently across headings, buttons, controls, and the output editor so the popup feels like one polished system rather than mixed browser defaults.

## Implementation Priorities

### First priority

- strengthen template quality
- improve technology detection accuracy
- introduce clearer rule grouping and categories
- keep preview and export flow frictionless

### Second priority

- rule descriptions
- saved custom presets
- dependency-file-aware recommendations
- related file generation

## Security and CSP

The extension should remain:

- Manifest V3 based
- local-first
- free from remote script or style dependencies
- aligned with strict popup CSP rules

Any new feature should preserve CSP-safe DOM updates and avoid unnecessary complexity in the popup layer.

## Testing Focus

- verify technology selection and badge counts
- verify auto-detect behavior on supported pages
- verify generated output quality for mixed stacks
- verify copy and download flows
- verify theme persistence and typography consistency
- verify popup behavior still complies with manifest CSP

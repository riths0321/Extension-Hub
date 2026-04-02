# Design Token Generator

## Overview

A Chrome extension that scans the active tab's computed styles and extracts real design tokens (colors, typography, spacing, shadows, border radius, breakpoints). Users select which token types to extract, choose an export format, and download or copy the generated token file.

## Existing Features (Verified from Code)

* **Token Scope checkboxes** — user selects which categories to extract (all checked by default):
  * Colors
  * Typography
  * Spacing
  * Shadows
  * Border Radius
  * Breakpoints
* **Export Format selector** — choose from 5 output formats:
  * CSS Variables (`:root { --token: value; }`)
  * Tailwind Config (`module.exports = { theme: { ... } }`)
  * Design System JSON
  * SCSS Variables (`$token: value;`)
  * Figma Tokens (JSON format compatible with Figma Tokens plugin)
* **"Scan Active Tab" button** — injects content script to extract computed styles from the live page
* **Loading indicator** — "Scanning page styles..." shown during extraction
* **Results section:**
  * Readonly textarea with the generated token output
  * "Copy" button — copies the output to clipboard
  * "Download" button — downloads as a file (.css, .js, .json, or .scss based on format)
  * "Clear" button — resets output
  * Stats text — shows token counts extracted (e.g., "24 colors, 8 spacing values")
* `content.js` handles DOM inspection and computed style extraction
* `templates/template-generator.js` handles token formatting per selected format

## New Features to Add (Proposed Upgrades)

* **AI Brand Palette Suggester** → User inputs brand adjectives (e.g., "trustworthy, modern, minimal") → AI suggests a primary color hex with rationale.
* **Automatic Dark Mode Variants** → For every extracted color token, compute a dark mode counterpart in HSL space and export as a `[data-theme="dark"]` CSS block.
* **Live Component Preview** → Render sample UI components (button, card, input) using the extracted tokens to instantly show how they look applied.
* **Token Deduplication** → Identify and merge near-identical token values (e.g., `#fff` and `#ffffff`) into a single canonical token.
* **WCAG Contrast Audit** → Check foreground/background token combinations for WCAG AA/AAA compliance and flag failures.

## Feature Workflow

1. User opens the extension on any webpage.
2. Checks/unchecks the token categories they want to extract.
3. Selects the desired export format.
4. Clicks "Scan Active Tab" — content script runs and extracts computed styles.
5. "Scanning page styles..." appears during extraction.
6. Generated tokens appear in the readonly textarea.
7. Stats line shows how many tokens were extracted per category.
8. User copies or downloads the token file in the selected format.

## Productivity Impact

* Extracting tokens from a live page instantly reverse-engineers the design system of any website — useful for design audits, style guide creation, and competitive analysis.
* Five export formats cover all major design-to-code workflows: CSS, Tailwind, SCSS, JSON, and Figma.
* Selective extraction via checkboxes focuses the output — extract only colors if that's all you need.
* Download produces a ready-to-use file — no reformatting required.

## Edge Cases & Limitations

* Tokens are extracted from computed styles — values may be browser-resolved (e.g., shorthand expanded) rather than the original CSS variable names.
* Breakpoint detection relies on `@media` rule extraction — dynamically injected responsive styles may be missed.
* Very large pages with many unique computed style values may generate extremely long token files.
* Figma Tokens format follows the Style Dictionary convention — may require mapping for Figma Tokens Pro plugin compatibility.
* The extension scans one page at a time — cross-page token consolidation requires multiple scans and manual merging.

## Future Scope

* Design token versioning — generate v1/v2/v3 token sets and compare differences.
* Token annotation — add human-readable names and descriptions to extracted tokens before export.
* Storybook integration export — generate a Storybook-compatible design token story from extracted values.

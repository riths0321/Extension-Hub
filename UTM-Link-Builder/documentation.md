# UTM Link Builder

## Overview

A Chrome extension for building clean UTM-tagged campaign URLs directly inside the browser. Users fill in UTM parameters, see the generated URL in a live preview textarea, copy it to clipboard, and clear all fields — with keyboard shortcut support.

## Existing Features (Verified from Code)

* Input fields for all 5 UTM parameters:
  * Base URL (required)
  * Source (required)
  * Medium (required)
  * Campaign (required)
  * Term (optional)
  * Content (optional)
* **Live URL generation** — generated UTM URL appears in readonly textarea as user types (real-time)
* **Character count display** — shows length of the generated URL
* **Status pill** — shows "Waiting", "Ready", or validation state
* **"Copy URL" button** — copies generated URL to clipboard
* **"Clear Fields" button** — resets all inputs
* **Keyboard shortcuts**: `Ctrl+U` (generate), `Ctrl+C` (copy), `Esc` (clear)
* **Toast/message notification** for copy confirmation and validation errors
* Internationalization support via `_locales` folder
* All processing is local — no external requests

## New Features to Add (Proposed Upgrades)

* **Campaign Presets** → Save commonly used source/medium/campaign combinations as named presets for one-click fill.
* **AI Campaign Name Suggester** → Enter a product brief → AI suggests 3 UTM campaign names in proper convention (lowercase, hyphenated).
* **Bulk URL Generator** → Paste multiple base URLs, apply the same UTM parameters to all, download as CSV.
* **Campaign History Log** → Auto-save every generated URL with timestamp and campaign name, searchable from the popup.
* **URL Shortener Integration** → Shorten the generated UTM URL via TinyURL API directly in the popup.

## Feature Workflow

1. User opens popup.
2. Fills in Base URL, Source, Medium, Campaign (required fields).
3. Optionally adds Term and Content.
4. Generated UTM URL appears live in the preview textarea — character count updates.
5. Status pill changes from "Waiting" to "Ready".
6. User clicks "Copy URL" or uses `Ctrl+C` — confirmation toast appears.
7. Clicks "Clear Fields" or presses `Esc` to reset for the next URL.

## Productivity Impact

* Live URL preview eliminates the need to click "Generate" — result is always visible as you type.
* Keyboard shortcuts allow full keyboard-only workflow — no mouse needed.
* Clear separation of required vs. optional fields reduces input errors.
* Character count display prevents link-shortener surprises on very long URLs.

## Edge Cases & Limitations

* Base URL is not validated for reachability — malformed or dead URLs will still be tagged.
* No persistence of filled values — refreshing the popup clears all fields.
* No campaign history or preset system in the current version.
* URL shortener integration is not present in the current codebase.
* Keyboard shortcut `Ctrl+C` may conflict with the browser's native copy shortcut in some input contexts.

## Future Scope

* QR code generation for the UTM URL — shareable in print or slide formats.
* Team workspace mode — shared campaign history via a pastebin-style token.
* Google Analytics naming convention validator — flag UTMs that don't match GA4 naming rules.

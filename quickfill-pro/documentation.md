# Quick Fill Pro

## Overview

A Chrome extension for form autofilling using named profiles. Users create profiles with keyword-mapped fields, select a profile from the popup, and fill any web form in one click. Keyboard shortcut support and a theme system with multiple presets are included.

## Existing Features (Verified from Code)

* **Profile selector dropdown** — choose from saved profiles before filling
* **"Fill Form" button** — injects field values into matching form inputs on the active page (`content.js`)
* **Keyboard shortcut** — `Ctrl+Shift+F` to quick-fill without opening popup
* **Profiles count stat** — shows total profiles saved
* **Forms Filled count stat** — running counter of successful fill operations
* **"Manage Profiles" button** — opens the `options.html` page
* **Options page (options.html):**
  * Create, edit, delete profiles
  * Profile name field
  * Dynamic field builder: each field has a keyword list (comma-separated) + value
  * Set a default profile checkbox
  * Add/remove fields within a profile
  * Sidebar profile list with click-to-select
* **Theme system** — multiple visual themes via `theme-variables.css` (violet-glow default, others available in `themes.json`)
* **Theme manager** (`theme-manager.js`) applies theme on load
* Data stored in `chrome.storage.sync`

## New Features to Add (Proposed Upgrades)

* **AI Field Inference** → When form field names don't match stored keywords, AI reads surrounding label text to infer the correct match and fill accurately.
* **Fill Preview Panel** → Before executing the fill, show a read-only preview of which value will go into which detected field.
* **Form Fingerprinting** → Remember which profile was used on each website and auto-select it on next visit.
* **Sensitive Field Masking** → Mask password, CVV, SSN fields in the options editor by default — reveal only on toggle.
* **One-Time Fill Token** → Generate a disposable fill set that auto-deletes from profile after one use.

## Feature Workflow

1. User opens options page → creates a profile with name + keyword-value field pairs.
2. User visits a website with a form.
3. Opens popup → selects the appropriate profile from the dropdown.
4. Clicks "Fill Form" (or uses `Ctrl+Shift+F` shortcut).
5. `content.js` scans all form inputs, matches them by keyword, and injects the corresponding values.
6. "Forms Filled" counter increments on success.
7. Status message shows fill result in the popup.

## Productivity Impact

* Keyword-based matching covers both standard field names and non-standard patterns (e.g., "firstname", "first-name", "your_name" all match one keyword set).
* Multiple profiles allow instant switching between personal, work, and client identities.
* One-click fill + keyboard shortcut reduces form-filling to a single action.
* Theme system makes the tool visually consistent with the user's browser aesthetic.

## Edge Cases & Limitations

* Field matching is keyword-based — if a form uses highly unusual input names not covered by the keyword list, the field will not be filled.
* `chrome.storage.sync` quota applies — profiles with many fields or very long values may hit storage limits.
* Dynamic AJAX-loaded forms (fields injected after page load) may not be detected immediately — user may need to trigger fill a second time.
* "Forms Filled" counter does not distinguish between partial and full fills.
* No support for file input, checkbox-group, or multi-select elements in the current version.

## Future Scope

* Encrypted profile sync with a user-supplied passphrase for cross-device portability.
* Form submission confirmation log — timestamp and domain of each fill operation.
* Browser-based profile import/export as JSON for backup and team sharing.

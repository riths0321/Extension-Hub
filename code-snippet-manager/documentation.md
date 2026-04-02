# Code Snippet Manager

## Overview

A developer-focused Chrome extension for storing, organizing, and reusing code snippets. Supports multiple programming languages, title-based search, language filtering, JSON export/import, and an "Insert to Page" button for injecting snippets into compatible web-based code editors.

## Existing Features (Verified from Code)

* Create new snippets with a title, language selection, and code content
* Supported languages: JavaScript, Python, HTML, CSS, Java, C++, PHP, SQL, Plain Text
* Search snippets by title or code content
* Filter snippets by language via dropdown
* Save, edit, and delete individual snippets
* "Insert to Page" button — injects the snippet into the active page's focused code editor (via content script)
* Export all snippets as a JSON file
* Import snippets from a JSON file (file picker)
* Empty state with a "Create First Snippet" prompt
* Notification system (toast-style feedback for save, copy, error)
* Data managed via `storage-manager.js` (chrome.storage.local)

## New Features to Add (Proposed Upgrades)

* **AI Auto-Tagging** → On save, AI detects the code's semantic pattern (e.g., "async", "DOM manipulation", "regex") and adds contextual tags automatically.
* **Semantic Search** → Search for "loop over array" and surface snippets using `.forEach`, `.map`, `for...of` — not just title match.
* **Duplicate Detection** → Before saving, hash the snippet content and warn if a near-identical snippet already exists.
* **Usage Counter** → Track how many times each snippet is copied or injected. Show a "Most Used" sort option.
* **Snippet Version History** → Track edits to a snippet over time with a diff view for rollback.

## Feature Workflow

1. User opens extension popup.
2. Existing snippets appear in a list — user searches or filters by language.
3. Clicks "New" — editor panel slides open with title, language selector, and code textarea.
4. User enters the snippet and clicks "Save" — snippet appears in the list.
5. To reuse: clicks a snippet row → clicks "Insert to Page" to inject into the active editor, or copies manually.
6. Exports all snippets as JSON for backup; imports from a previous export.
7. Edits or deletes snippets as needed from the list view.

## Productivity Impact

* Language filter instantly narrows the library to relevant snippets without extra search.
* "Insert to Page" eliminates the copy-tab-paste workflow on supported coding platforms.
* JSON export/import provides a portable backup and enables sharing snippet libraries between browsers or team members.
* Search across both title and code content means snippets are findable even without a memorable title.

## Edge Cases & Limitations

* "Insert to Page" depends on `content.js` detecting a focused, compatible code editor element — it may not work on all editors or dynamically loaded editors.
* JSON import does not validate snippet structure — malformed JSON may produce silent failures.
* No duplicate detection in the current version — identical snippets can be saved multiple times.
* Snippets stored in chrome.storage.local — total storage is limited (~10MB) for very large libraries.
* Language filter and search are independent but not combined in the current UI — AND-filtering requires using both simultaneously.

## Future Scope

* Team snippet sharing via a sync token — share a library across a dev team.
* Integration with VS Code extension API for desktop IDE parity.
* Snippet categories/folders for organizational grouping beyond language type.

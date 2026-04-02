# Markdown Previewer

## Overview

A Chrome extension that provides a split-panel Markdown editor and live HTML preview. Named "Markdown Converter" internally, it uses a custom JavaScript Markdown parser to render output in real time as the user types, with copy and clear actions.

## Existing Features (Verified from Code)

* **Split-panel layout** — left panel: Markdown input textarea; right panel: rendered HTML preview
* **Live preview rendering** — as user types in the textarea, the preview updates in real time using `parser.js`
* **Custom Markdown parser** (`parser.js`) — handles standard Markdown syntax: headings (#), bold (**), italic (*), unordered lists (-), and likely links and code blocks
* **"Copy Output" button** — copies the rendered HTML content to clipboard
* **"Clear" button** — clears both the input textarea and the preview
* **Active divider** — visual separator between input and preview panels
* **Labels** — "Markdown Input" and "Preview" clearly label both panels
* **Placeholder text** — shows Markdown syntax examples in the textarea (# Hello World, **Bold**, etc.)

## New Features to Add (Proposed Upgrades)

* **AI Formatting Suggester** → As user types, detect structural issues (long paragraphs, unlabeled lists) and suggest formatting improvements as dismissible toasts.
* **Table of Contents Auto-Generator** → Scan headings in the document and insert a linked TOC at cursor position — updates as headings change.
* **Multi-Format Export** → Export as `.md` file, rendered `.html`, or plain `.txt` — currently only clipboard copy is available.
* **Paste URL → Markdown Link Converter** → Pasted URLs are auto-converted to `[Page Title](URL)` format by fetching the page title.
* **Focus Writing Mode** → Hide the preview panel, dim all UI chrome, and enter full-screen writing mode with word count overlay.

## Feature Workflow

1. User opens the extension (as a new tab or popup — depends on manifest configuration).
2. Types or pastes Markdown text in the left input panel.
3. Preview panel renders the HTML output live as typing occurs.
4. User reviews formatted output in the right panel.
5. Clicks "Copy Output" to copy the rendered HTML to clipboard.
6. Clicks "Clear" to reset both panels for the next document.

## Productivity Impact

* Live rendering eliminates the write-then-switch-to-preview cycle — output is always visible.
* Custom `parser.js` means no external library dependency — fast load and full local processing.
* Split-panel layout mirrors the workflow of professional Markdown editors in a lightweight browser popup.
* Clear button enables rapid successive use for converting multiple short Markdown snippets.

## Edge Cases & Limitations

* The custom `parser.js` handles basic Markdown — complex GFM features (tables, task lists, footnotes, strikethrough) may not be supported.
* "Copy Output" copies the rendered HTML, not the raw Markdown — user must manually select-all-copy in the textarea to preserve Markdown source.
* No file save or download functionality in the current version — output is lost when the popup/tab is closed.
* No syntax highlighting, line numbers, or undo history in the textarea — it is a plain HTML `<textarea>`.
* Very long documents may produce scroll-sync issues between input and preview panels.

## Future Scope

* GitHub Gist integration — publish the current Markdown file to a Gist with one click.
* Markdown linter panel — run an opinionated lint pass and surface all violations.
* Version history — snapshot the document every 5 minutes while editing; restore to any previous version.

# PDF Previewer

## Overview

A lightweight Chrome extension that lets users select a local PDF file and preview it inline within the popup, with an option to open it in a full-screen browser tab. Built using native browser PDF rendering via `<embed>` — no external libraries required.

## Existing Features (Verified from Code)

* Select a local PDF file via file picker (`<input type="file" accept="application/pdf">`)
* Preview the selected PDF inline inside the extension popup using `<embed>`
* "Open Full Screen" button opens the PDF in a dedicated full-screen tab (`viewer.html`)
* Full-screen viewer renders the PDF at 95% viewport width/height with dark themed background
* "Open Full Screen" button is disabled until a PDF is selected

## New Features to Add (Proposed Upgrades)

* **AI Document Summarizer** → On load, scan the first and last few pages and generate a bullet-point summary — useful for quickly evaluating long PDFs.
* **In-PDF Text Search** → Full-text search across all pages with previous/next match navigation and automatic scroll to match.
* **Text Highlight & Annotation** → Highlight text in yellow/blue/pink, add note pins. Annotations stored per-file (by filename hash) and restored on reopen.
* **Page Extraction & Download** → Select a page range (e.g., pages 3–8) and download just those pages as a new PDF.
* **Reading Progress Tracker** → A progress bar showing how far through the document the user has scrolled; auto-resumes at last position on reopen.

## Feature Workflow

1. User clicks the extension icon.
2. Popup opens with a "Select PDF File" button.
3. User selects a local PDF — it embeds and renders inside the popup instantly.
4. "Open Full Screen" button activates — user clicks to view the PDF in a dedicated full-page tab.
5. Full-screen viewer shows the PDF rendered at large size with a dark background.

## Productivity Impact

* Eliminates the need to open a separate PDF viewer application for quick reviews.
* Full-screen view provides a clean, distraction-free reading environment directly in the browser.
* File picker integration is straightforward — no drag-and-drop complexity.

## Edge Cases & Limitations

* Only supports locally selected PDF files — cannot load PDFs from URLs in the current version.
* PDF rendering quality and feature support (text selection, zoom) depends entirely on the browser's built-in PDF engine.
* Very large PDFs (100+ pages) may load slowly in the embed viewer.
* No annotation, search, or page navigation controls exist in the current codebase.
* Full-screen viewer and popup viewer share the same file via `sessionStorage` — closing all extension views loses the file reference.

## Future Scope

* URL-based PDF loading — paste any PDF URL and preview it without downloading.
* Side-by-side comparison mode — view two PDFs simultaneously with synchronized scrolling.
* Shared PDF annotation sessions via a token-based sync link.

# Keyword Extractor

## Overview

A Chrome extension that extracts the most frequent keywords from either the current page's text or user-pasted text. Displays results ranked by frequency with configurable top-N output, and a source indicator showing whether data came from the page or custom input.

## Existing Features (Verified from Code)

* **Text input textarea** — user can paste custom text; if left empty, the extension reads from the current page
* **"Read Current Page" button** — pulls visible text content from the active tab via content script
* **"Extract Keywords" button** — runs keyword frequency analysis on the input text
* **Top keyword count selector** — choose 10, 15 (default), 20, or 30 top keywords to display
* **Results section** — displays extracted keywords with frequency counts, revealed after extraction
* **Source tag indicator** — shows whether results came from "Page" or "Custom text"
* **Status text** — shows "Ready", "Extracting...", or error messages
* All processing is local — no external API calls

## New Features to Add (Proposed Upgrades)

* **Topic Cluster Detection** → Group related keywords into semantic clusters (e.g., "machine learning", "ML model", "neural network" → cluster: "AI/ML") displayed as collapsible groups.
* **Search Intent Classification** → Classify each keyword as Informational, Navigational, Transactional, or Commercial — shown as a color-coded badge.
* **Keyword Density Heatmap** → Overlay a visual panel on the live page showing which sections are keyword-dense.
* **Custom Stop Word List** → User-defined words excluded from extraction — persists across sessions.
* **Export with Metadata** → Download extracted keywords with frequency and rank as CSV or JSON.

## Feature Workflow

1. User opens extension popup on any webpage.
2. Either leaves textarea empty (to analyze the current page) or pastes custom text.
3. Optionally clicks "Read Current Page" to pull live page text into the textarea for review before extraction.
4. Selects desired top keyword count (10/15/20/30).
5. Clicks "Extract Keywords" — results appear ranked by frequency.
6. Source tag shows whether the result came from page content or pasted text.

## Productivity Impact

* Dual-source input (page or custom text) makes the tool useful both for SEO analysis and document research.
* Top-N selector adapts the output to the user's needs — quick 10-keyword scan vs. a 30-keyword deep dive.
* Instant local processing means no waiting for API calls.
* Source indicator prevents confusion when results don't match expectations.

## Edge Cases & Limitations

* "Read Current Page" captures only visible text — content inside iframes, hidden elements, or shadow DOM is not included.
* Keyword extraction is frequency-based — it does not filter for semantic importance; navigation text and UI labels may appear.
* No stop word list is built into the current version — common words like "the", "and", "is" may appear unless the implementation handles them.
* Results are not exportable in the current version — only visible in the popup.
* Dynamic pages (JavaScript-rendered content) may produce incomplete results if page text isn't fully loaded when "Read Current Page" is triggered.

## Future Scope

* Competitor keyword comparison — extract from two pages and show keyword overlap and gaps.
* SERP simulation — show what Google surfaces for the top 5 extracted keywords.
* Content gap highlighter — identify which topic clusters the current page is missing.

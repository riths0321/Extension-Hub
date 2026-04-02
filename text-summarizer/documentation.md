# Text Summarizer

## Overview

A Chrome extension for condensing long text into concise summaries using an extractive or abstractive compression algorithm. Users paste text, adjust the summary density via a slider, and generate a brief — with word count tracking and copy functionality.

## Existing Features (Verified from Code)

* **Text input textarea** — paste any article, report, or long-form text
* **Word count tracking** — "Source" word count and sentence count update live as user types
* **Summary Density slider** — range from 10% to 60% in 5% steps (default 30%) — controls how much of the original text is retained in the summary
* **Ratio label** — displays the current density percentage next to the slider
* **Compression stat** — shows the compression ratio in a ledger-style header card
* **"Generate Brief" button** — runs the summarization algorithm
* **Summary output panel** — displays the generated brief with a "Summary Brief" label
* **Output word count** — shows word count of the generated summary
* **Status text** — shows "Ready", "Summarizing...", or error states
* **"Copy" button** — copies the summary to clipboard
* **"Reset" button** — clears both input and output
* All processing is local — no external API calls

## New Features to Add (Proposed Upgrades)

* **Multiple Summary Formats** → Choose output format: Bullet Points, Executive Summary, ELI5 (simplified language), or Key Takeaways — beyond the current single format.
* **Reading Level Adjuster** → Slider to set vocabulary complexity from Elementary to Professional.
* **Named Entity Highlighter** → Highlight detected people, organizations, and dates in the summary output.
* **Inline Page Summary** → Right-click option: "Summarize Article" — injects a folded summary card at the top of the current page without switching to the popup.
* **Summary History** → Store the last 20 summaries with source URL and timestamp, searchable from a History tab.

## Feature Workflow

1. User opens extension popup.
2. Pastes text into the input textarea — word count and sentence count update instantly.
3. Adjusts the Summary Density slider to control compression level.
4. Clicks "Generate Brief" — summarized output appears in the summary panel.
5. Output word count and compression ratio display update.
6. User clicks "Copy" to copy the summary to clipboard.
7. Clicks "Reset" to clear both panels for the next summarization.

## Productivity Impact

* Density slider gives explicit control over summary length — a 10% brief for quick skimming vs. a 60% brief for more complete coverage.
* Live word count tracking helps users understand the compression impact before and after.
* Local processing ensures speed and privacy — no text leaves the browser.
* Reset button enables rapid successive summarizations without manual clearing.

## Edge Cases & Limitations

* Extractive summarization works by selecting key sentences — poorly structured or heavily list-based text may produce summaries that feel fragmented.
* Very short inputs (under 50 words) may produce summaries nearly identical to the original.
* Non-English text may produce degraded results depending on the summarization algorithm's language support.
* No format options (bullet points, executive summary) in the current version — output is always a continuous paragraph.
* There is no history or session persistence — summaries are lost when the popup is closed.

## Future Scope

* YouTube/podcast transcript summarization — paste a transcript URL or text block.
* Side-by-side compare mode — summarize two articles and display summaries in parallel columns.
* Team sharing — generate a shareable summary link with a 24-hour expiry.

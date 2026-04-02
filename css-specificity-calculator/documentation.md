# CSS Specificity Calculator

## Overview

A developer-focused Chrome extension for calculating, visualizing, and comparing CSS selector specificity. Supports single selector analysis with a detailed breakdown bar, two-selector side-by-side comparison with a visual VS view, a built-in specificity hierarchy guide, and a quick reference panel with common selector examples.

## Existing Features (Verified from Code)

* **Selector 1 input** — enter any CSS selector for specificity calculation
* **Selector 2 input** (optional) — enter a second selector for side-by-side comparison
* **"Calculate Specificity" button** — computes specificity for entered selectors
* **Results section (shown after calculation):**
  * Selector text display
  * Specificity score in (Inline, IDs, Classes, Elements) format
  * Visual specificity bar — shows breakdown proportionally
  * Specificity values text display
  * Details grid — component-level breakdown
* **Comparison section** (appears when Selector 2 is provided):
  * Selector 1 vs Selector 2 label display
  * "VS" divider
  * Two comparison bars rendered side by side
  * Comparison result — which selector wins
* **"Copy Results" button** — copies specificity results to clipboard
* **Clear button** — clears all inputs and results
* **"Load Examples" button** — populates sample selectors for demonstration
* **Specificity Hierarchy Guide section:**
  * Visual hierarchy list: Inline Styles → ID Selectors → Class/Attribute/Pseudo-class → Element/Pseudo-element
  * "Show Details" toggle — expands the (a,b,c,d) notation explanation with a worked example
* **Quick Reference panel** — 6 common selector examples with pre-calculated scores (e.g., `#header` = (0,1,0,0))
* **Info modal** — opens "How CSS Specificity Works" explanatory content with calculation and comparison rules
* **Settings button** in footer
* **Status text** — shows "Enter a CSS selector to begin", "Calculating...", results message

## New Features to Add (Proposed Upgrades)

* **Live Page Conflict Detector** → Inspect a selected DOM element and identify all conflicting CSS declarations — show which selector wins and why.
* **AI Selector Simplifier** → Input an overly specific selector → AI suggests a simpler, more maintainable equivalent that targets the same element.
* **Cascade Order Tracker** → For a selected element, display all CSS rules in cascade order (specificity, source order, `!important` flags) in a clean, copy-friendly format.
* **Bulk Stylesheet Audit** → Paste a full CSS block → extension extracts all selectors, calculates specificity for each, and flags those above a configurable threshold.
* **VS Code Extension Companion** → Inline specificity annotation in the editor gutter.

## Feature Workflow

1. User opens popup.
2. Types a CSS selector in Selector 1 input (e.g., `#nav .item.active`).
3. Optionally types a second selector for comparison.
4. Clicks "Calculate Specificity" — results section appears.
5. Reviews the specificity score, visual bar, and details breakdown.
6. If two selectors entered: comparison section appears with VS view and winner declaration.
7. Toggles "Show Details" in the Hierarchy Guide for the notation explanation.
8. Views Quick Reference for common selector scores.
9. Clicks "Load Examples" to populate sample selectors for experimentation.
10. Copies results with the copy button.

## Productivity Impact

* Visual specificity bar makes the abstract (a,b,c,d) notation immediately intuitive.
* Side-by-side comparison eliminates manual mental calculation when debugging CSS override conflicts.
* Quick Reference panel serves as an always-visible cheat sheet for common selectors.
* "Load Examples" button makes the tool self-teaching — new users can explore immediately.

## Edge Cases & Limitations

* Specificity calculation is for input selectors only — not matched against any live page styles.
* No `!important` detection in the current version — it overrides specificity but is not flagged.
* Universal selector (`*`) and combinators (` `, `>`, `~`, `+`) contribute 0 to specificity — this is correctly calculated but may surprise users.
* Very complex selectors with many components may produce truncated display in the specificity bar at small popup widths.
* The settings button is present but its functionality depends on the `popup.js` implementation.

## Future Scope

* Specificity regression detector — compare two stylesheet versions and flag selectors that changed specificity.
* Team style guide enforcement — define a max allowed specificity and use bulk audit to enforce it.
* Browser DevTools parity — mirror Chrome DevTools' style cascade display in a cleaner popup format.

# Quick Link Manager

## Overview

A Chrome extension for saving and organizing links from the current tab with category-based filtering, search, and one-click access. Links are grouped into predefined categories (Work, Social, Shopping, Entertainment) using URL pattern detection.

## Existing Features (Verified from Code)

* "Add Current Page" — saves the active tab's title, URL, and auto-detected category
* Auto-category detection based on URL patterns (mail/docs/calendar → Work, facebook/instagram → Social, amazon/flipkart → Shopping, youtube/netflix → Entertainment)
* Category filter tabs (All, Work, Social, Shopping, Entertainment)
* Search bar — filters links by title or URL (case-insensitive substring match)
* Clear search button
* "Open All" button — opens all links in the current filter as background tabs
* Delete button per link
* Click any link row to open it in a new background tab
* Domain-specific emoji icons (e.g., 📧 for Gmail, 💻 for GitHub)
* Total links count and unique categories count displayed
* Links stored via `chrome.storage.sync`

## New Features to Add (Proposed Upgrades)

* **AI Auto-Tagging** → AI reads page title and meta description to suggest contextual tags (e.g., "design", "productivity") beyond the 4 fixed categories.
* **Smart Collections** → Auto-group links when 5+ share the same tag into a named collection.
* **Link Health Monitor** → Weekly background check — flag broken or redirected links with a colored badge.
* **Fuzzy Search** → Search by partial words — surfaces results even when the user remembers only a fragment of the title.
* **Keyboard Shortcut Save** → `Ctrl+Shift+S` to save the current page without opening the popup.

## Feature Workflow

1. User visits any webpage.
2. Opens the extension popup — existing saved links appear, filtered if a category or search is active.
3. Clicks "Add Current Page" — current tab's URL and title are saved; category auto-detected from URL pattern.
4. Uses category tabs to filter or the search bar to find a specific link.
5. Clicks a link row to open it, or uses "Open All" to open all filtered links.
6. Deletes unwanted links with the trash icon.

## Productivity Impact

* URL-based auto-category means zero setup effort — links are organized immediately on save.
* "Open All" in a category lets users resume a research or shopping session in one click.
* Search across title and URL covers both cases where the user remembers either.

## Edge Cases & Limitations

* Auto-category is URL-pattern based only — niche or internal tools may default to "general" even if they are work-related.
* `chrome.storage.sync` has a per-item and overall quota — saving hundreds of links may hit storage limits.
* "Open All" on a large link list may overwhelm the browser with tabs — no warning shown.
* Links saved with very long titles may truncate in the UI card view.
* No support for custom categories — only the 4 predefined ones exist.

## Future Scope

* Custom category creation — allow users to define and name their own categories.
* Export all links as a JSON or Markdown file for backup.
* Link notes — add a short annotation to any saved link before saving.

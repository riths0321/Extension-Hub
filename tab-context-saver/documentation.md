# Tab Context Saver

## Overview

A Chrome extension for saving and restoring complete browser window sessions as named "context capsules". Supports session type tagging (Work, Study, Fun, Custom), session search, configurable restore settings, and pinned tab preservation.

## Existing Features (Verified from Code)

* "Save Current Window" — saves all open tabs in the current window as a named session
* Session naming modal with text input
* Session type tagging per save: Work, Study, Fun, or Custom
* "Restore Latest" — reopens the most recently saved session's tabs
* Session summary card: Open tab count, Saved sessions count, Latest save label
* Saved sessions list with search bar (filters by session name)
* Per-session restore button visible in the sessions list
* Settings modal with configurable options:
  * Auto-save current context before restore (checkbox)
  * Preserve pinned tabs on restore (checkbox)
  * Confirm before restoring a session (checkbox)
  * Maximum sessions limit (number input, 10–200)
* Toast notification system for in-app feedback
* Sessions stored in `chrome.storage.local`

## New Features to Add (Proposed Upgrades)

* **AI Session Summarizer** → Reads tab titles on save and generates a 1–2 sentence plain-language session summary (e.g., "Research on React performance — 8 tabs across MDN, GitHub, Stack Overflow").
* **Auto-Capture on Idle** → If browser idle for 20+ minutes with 5+ tabs open, auto-save a timestamped snapshot.
* **Session Merge** → Select two saved sessions and merge them into one deduplicated session.
* **Markdown Export** → Export any session as a `.md` file with tab titles, URLs, and session name.
* **Fuzzy Search** → Semantic search across session names and tab titles within sessions.

## Feature Workflow

1. User opens extension popup — sees open tab count and saved session count.
2. Clicks "Save Current Window" — naming modal appears.
3. User names the session and selects a type (Work/Study/Fun/Custom), then confirms.
4. Session saved and appears in the sessions list with a restore button.
5. User searches saved sessions by name using the search bar.
6. User clicks restore on any session — tabs reopen (with confirmation if that setting is enabled).
7. Settings panel allows configuring auto-save-before-restore, pinned tab behavior, and max session count.

## Productivity Impact

* Session type tagging instantly segments Work, Study, and personal browsing contexts.
* Save-before-restore setting prevents accidental loss of current working tabs.
* Configurable max session limit keeps the list manageable without manual cleanup.
* Search across saved sessions makes retrieval fast when many sessions accumulate.

## Edge Cases & Limitations

* Restoring a large session (20+ tabs) may trigger Chrome's tab-loading throttle.
* Sessions store URLs only — scroll position, form states, and cookies are not preserved.
* "Restore Latest" always targets the single most recent session — there is no session picker in the quick-restore flow.
* If the max session limit is reached, the oldest session is not auto-deleted — user must manually manage.
* Sessions that include tabs on restricted URLs (chrome://, extension pages) may fail to restore those specific tabs.

## Future Scope

* Session sharing via short URL — send a session's tab list to a collaborator.
* Tag-based session organization with color-coded labels.
* Session diff view — compare two sessions to see what tabs were added or removed.

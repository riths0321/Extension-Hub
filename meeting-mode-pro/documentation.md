# Meeting Mode Pro

## Overview

A Chrome extension for professional screen-sharing and meeting management. Activates a "Meeting Mode" that hides personal tabs, cleans URLs, and blocks notifications — keeping the browser presentation-safe. Includes a meeting timer, agenda editor, and smart tab detection.

## Existing Features (Verified from Code)

* **Meeting Mode Toggle** — master switch (Ctrl+Shift+M / Cmd+Shift+M) that activates/deactivates meeting mode
* **Hide Personal Tabs** — hides tabs detected as personal (social, entertainment, etc.) with one click
* **Clean URL** — removes tracking parameters and cleans the current tab's URL for screen sharing
* **Meeting Timer** — set hours/minutes; Start/Pause/Reset controls; displays countdown in HH:MM:SS
* **Meeting Agenda Editor** — textarea for agenda items (one per line), item count display, "Insert Template" button, agenda preview panel
* **Smart Tab Detection** — classifies all open tabs into Work vs. Personal and counts them with notification count
* **Status indicator** — Active/Inactive badge in the header
* **Tab count & "Time Saved" stats** in the quick toggle section
* **4 configurable settings** (all toggles with checkboxes):
  * Auto-hide notifications
  * Clean URLs automatically
  * Meeting timer sound
  * Action item extraction

## New Features to Add (Proposed Upgrades)

* **Auto Meeting Detection** → Detect Google Meet, Zoom, or Teams tab and auto-activate meeting mode without manual toggle.
* **AI Action Item Extractor** → Scan agenda/notes text for action verbs (e.g., "send", "follow up", "schedule") and extract a structured action item list.
* **Post-Meeting Summary Card** → On deactivating meeting mode, show a summary: duration, agenda items covered, and extracted action items.
* **Focus Score** → Track how many times the user switched away from the meeting tab during the session — display as a percentage after meeting ends.
* **Agenda Timer Alerts** → Track each agenda item's time allocation and play a bell alert when the item's allotted time expires.

## Feature Workflow

1. User is about to share their screen for a meeting.
2. Opens the extension popup — clicks the Meeting Mode toggle (or uses keyboard shortcut).
3. Smart Detection counts work vs. personal tabs and notifications.
4. User clicks "Hide Personal Tabs" to hide non-work tabs from the screen share view.
5. Clicks "Clean URL" to strip tracking parameters from the current address bar.
6. Opens the Meeting Timer → sets duration → starts countdown.
7. Opens Agenda editor → types agenda items → saves.
8. "Time Saved" stat updates as meeting progresses.
9. On meeting end, user deactivates Meeting Mode — hidden tabs are restored.

## Productivity Impact

* Meeting Mode toggle in one action creates a professional screen-sharing environment.
* Smart tab detection eliminates embarrassing personal tab exposure during screen shares.
* Agenda editor keeps the meeting focused — participants can see the structure visually.
* URL cleaner removes noise from presentation URLs before they're shown to attendees.

## Edge Cases & Limitations

* "Hide Personal Tabs" uses URL pattern heuristics — well-disguised personal tools may not be detected.
* Meeting timer is browser-local — if the popup is closed mid-meeting, timer state may reset.
* Agenda editor does not persist agenda items across sessions unless saved to chrome.storage.
* Keyboard shortcut (Ctrl+Shift+M) may conflict with other extensions or OS shortcuts.
* "Action item extraction" is listed as a setting toggle but the extraction logic is not yet fully implemented in the current codebase.

## Future Scope

* Google Calendar integration to auto-pull agenda from meeting invites.
* One-click share of post-meeting summary to a Slack channel.
* Meeting history dashboard showing average duration and action item completion rate.

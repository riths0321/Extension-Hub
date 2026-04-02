# Todo Tab Extension

## Overview

A new-tab replacement extension with a glass-morphism UI that lets users manage color-coded tasks by category. Features task filtering, dark/light theme toggle, export/import, and real-time task statistics — all stored locally in the browser.

## Existing Features (Verified from Code)

* Replaces new tab page with a full-screen task manager
* Add tasks with a text input — tasks persist via localStorage
* 6 color-coded category labels: Work (green), Personal (blue), Urgent (orange), Ideas (purple), Important (red), General (gray)
* Task filter pills: All, Pending, Done, Today
* Per-task stats: Total, Pending, Today, Done — displayed as glass cards
* "Clear Done" button — removes all completed tasks
* Export tasks as JSON file
* Import tasks from JSON via modal dialog
* Dark/light theme toggle (moon icon in header)
* "Privacy First" pill in header — reinforces local-only storage
* Animated background with floating orb effects
* Toast notification system for in-app feedback

## New Features to Add (Proposed Upgrades)

* **AI Priority Scoring** → Keyword-based scoring (e.g., "deadline", "urgent", "today") automatically tags each task as High/Medium/Low priority on save.
* **Recurring Task Automation** → Mark a task as recurring (Daily/Weekly/Monthly) — it auto-resets at the configured interval.
* **Focus Timer per Task** → Built-in Pomodoro timer (25/5 split) activated per task with focus time logging.
* **Daily Summary Banner** → On first new tab of the day, show yesterday's task completion rate as a 5-second dismissible banner.
* **Due Date Reminder** → Set a date on any task — show a badge on the extension icon when tasks are due today.

## Feature Workflow

1. User opens a new tab.
2. Full-screen task manager renders with animated background.
3. User types a task, selects a color category, and clicks "Add Task".
4. Tasks appear in the list — user filters by All/Pending/Done/Today.
5. Completed tasks are checked off — Done counter updates.
6. User exports tasks as JSON for backup, or imports from a previous export.
7. Toggles between dark and light theme as needed.

## Productivity Impact

* Color-coded categories provide instant visual task classification — no reading required.
* Filter pills isolate today's tasks or pending items without scrolling.
* JSON export/import enables task list backup and cross-session recovery.
* Animated visual design makes task management feel less transactional.

## Edge Cases & Limitations

* "Today" filter relies on the task creation date — tasks added on a previous day won't appear under "Today" even if still relevant.
* No due date or reminder system exists in the current codebase.
* Import modal requires valid JSON — malformed or incompatible JSON produces a silent failure.
* localStorage capacity limits apply — very large task lists (thousands of entries) may hit browser storage limits.
* No task ordering or drag-to-reorder functionality currently.

## Future Scope

* Subtask support — nest child tasks under a parent task.
* Calendar view — visualize tasks by creation or due date.
* Cross-device sync — optional account-based sync for task lists.

# Code Previewer

## Overview

A lightweight browser-based HTML/CSS code editor with a live preview iframe. Users switch between HTML and CSS editor tabs, write or paste code, run it in an embedded iframe, export the combined output, and clear the editor.

## Existing Features (Verified from Code)

* **Two code tabs** — HTML and CSS
* **Single shared `<textarea id="editor">`** — content switches based on active tab
* **`<iframe id="preview">`** — renders the combined HTML+CSS output
* **"▶ Run" button** — compiles both panels into a single document and renders it in the iframe
* **"⬇ Export" button** — downloads the combined output as an HTML file
* **"Clear" button** — resets the active editor panel
* **Active tab indicator** — "active" class applied to the selected tab button
* All rendering is local — the iframe is sandboxed within the extension

## New Features to Add (Proposed Upgrades)

* **Device Frame Preview** → Toggle the iframe between Desktop (full width), Tablet (768px), and Mobile (375px) viewport sizes.
* **Code Formatter on Save** → Auto-format indentation and brackets when user presses `Ctrl+S` inside any editor panel.
* **Shareable Preview Link** → Encode current HTML/CSS into a base64 URL so a recipient can open the same code + preview.
* **CDN Library Picker** → A dropdown to select popular CSS libraries and auto-inject the `<link>` tag into the HTML panel.

## Feature Workflow

1. User opens extension popup.
2. Clicks "HTML" tab — types or pastes HTML structure.
3. Switches to "CSS" tab — adds styling.
4. Clicks "▶ Run" — both panels are merged and rendered in the iframe preview.
5. User iterates on code → clicks Run again to refresh preview.
6. Clicks "⬇ Export" to download the full combined page as an `.html` file.
7. Clicks "Clear" to reset the currently active panel.

## Productivity Impact

* Two-tab panel keeps HTML and CSS organized without separate files or windows.
* Run-on-demand preview (not live) means the user controls when to refresh — avoids distraction from mid-typing renders.
* Export as HTML file makes the prototype immediately usable or shareable without external tools.
* Popup-based editor means no new tab or window needed for quick prototyping.

## Edge Cases & Limitations

* Only one textarea is used for both panels — switching tabs replaces the visible content. Each panel's content is stored in memory but users must use the tabs to access each.
* The iframe is sandboxed within the extension — features requiring backend, camera, filesystem, or cross-origin requests will not work.
* No syntax highlighting, line numbers, or code completion in the textarea — it is a plain `<textarea>`.
* "Clear" only clears the currently active tab's content — not both panels simultaneously.
* No live-reload — user must manually click "▶ Run" after each change to update the preview.

## Future Scope

* Syntax highlighting via a lightweight library (e.g., Prism.js).
* Multiple file support — add additional CSS files and link them in the HTML panel.
* Diff mode — compare two code versions side by side with highlighted changes.

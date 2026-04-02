# README Generator

## Overview

A Chrome extension for generating professional `README.md` files from a project description. Supports three template types (Minimal, Standard, Full Pro), license selection, and produces formatted Markdown output with copy and download options — all processed locally.

## Existing Features (Verified from Code)

* **Project description textarea** — user describes their project (minimum 30 characters required)
* **Character counter** — shows current character count vs. the 30-character minimum threshold
* **Template selector** — three README formats:
  * ⭐ Standard — balanced sections (default)
  * ✦ Minimal — stripped-down, essentials only
  * 🚀 Full Pro — comprehensive with all standard sections
* **License selector** — choose from MIT, Apache 2.0, GPL 3.0, ISC, or None
* **"Generate README" button** — disabled until 30-character minimum is met; generates README on click
* **Preview area** — shows generated Markdown in a `<pre>` block
* **"Copy" button** — copies generated README to clipboard (disabled until generated)
* **"Download" button** — downloads as `README.md` file (disabled until generated)
* **"Clear All" button** — resets all fields and output
* **Character count gating** — Generate button stays disabled until input is sufficient
* All generation is local — no external API calls

## New Features to Add (Proposed Upgrades)

* **AI Feature Description Writer** → User inputs feature names as bullet points → AI expands each into a user-benefit-focused 1–2 sentence description.
* **Badge Auto-Generator** → Select from a tech stack dropdown → shields.io badges auto-appended to the README.
* **Section Reorder & Toggle** → Drag handles to reorder README sections and toggle individual sections off before export.
* **Split Markdown/Preview Panel** → Live rendered preview alongside raw Markdown — changes sync in real time.
* **GitHub Repo Integration** → Paste a GitHub URL → auto-fill name, description, and language from the repo's API.

## Feature Workflow

1. User opens popup.
2. Types or pastes a project description in the textarea (minimum 30 characters).
3. Selects a template type (Standard / Minimal / Full Pro) and a license.
4. Generate button becomes active — user clicks it.
5. Generated README appears in the preview area.
6. User copies it to clipboard or downloads as `README.md`.
7. Clicks "Clear All" to start over for another project.

## Productivity Impact

* Three template types cover all common use cases — personal projects (Minimal), open source (Standard), and professional documentation (Full Pro).
* License selection prevents the overlooked but important step of choosing a project license.
* Character count gate prevents generating poor-quality READMEs from vague 2-word descriptions.
* One-click download as `.md` file eliminates manual file creation.

## Edge Cases & Limitations

* Generation is template-based, not AI-generated — output quality depends on the template structure, not the description's specifics. The description is used to populate placeholder sections.
* The 30-character minimum is the only quality gate — a 31-character nonsense input still generates a README.
* No markdown preview in the current version — output is shown as raw Markdown text in a `<pre>` block.
* Generated README does not automatically include the project name — user must manually add it or the template may use a generic placeholder.
* No persistence — generated output is lost when the popup is closed.

## Future Scope

* CHANGELOG.md companion generator alongside README.
* Multi-language README — generate in English + one selected language simultaneously.
* GitHub Gist integration — publish the generated README to a new Gist with one click.

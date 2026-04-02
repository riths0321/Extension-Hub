# Cover Letter Generator

## Overview

A Chrome extension called "Cover Letter Studio" that generates professional cover letters in two modes: Upload Workflow (upload a resume file + paste a job description) and Manual Workflow (fill in name, phone, email, role, company, experience, and skills). Outputs a formatted cover letter with copy and download options.

## Existing Features (Verified from Code)

* **Two generation modes:**
  * **Upload Workflow** — upload resume file (PDF, DOC, DOCX, TXT, MD, JSON) + paste job description
  * **Manual Workflow** — fill in name, phone, email, job title, company, hiring manager, address, subject, experience, and skills (with optional JD field)
* Mode switcher tabs (Upload Resume + JD / Manual Form Fill)
* "Analyze Inputs" button — validates and pre-processes the input before generation
* "Generate Letter" button — produces the cover letter from inputs
* Output panel with character count pill
* "Copy" button to copy the generated letter to clipboard
* "Download .txt" button to download as plain text file
* "Reset" button to clear all fields
* Status notification area for real-time feedback
* File upload shows filename confirmation ("resumeMeta" display)

## New Features to Add (Proposed Upgrades)

* **Tone Selector** → Choose tone (Formal, Confident, Conversational, Creative) before generation — adjusts vocabulary and sentence structure in the output.
* **Structure Format Selector** → Three formats: Classic (intro → experience → close), Problem-Solution, Story-Driven. User selects before generation.
* **Paragraph-Level Regeneration** → After output is generated, click "Regenerate" on any individual paragraph to get a fresh version of just that section.
* **AI JD Keyword Alignment** → Automatically surface the top 3–4 requirements from the pasted JD and structure the letter body to address each directly.
* **Company Research Prompt Injector** → Text fields that let users fill in specific company context — injected into the letter for authentic personalization.

## Feature Workflow

1. User opens the extension popup.
2. Selects a mode: Upload (paste JD + upload resume file) or Manual (fill all fields individually).
3. Clicks "Analyze Inputs" — validates that required fields are filled.
4. Clicks "Generate Letter" — cover letter appears in the output panel with a character count.
5. Reviews the letter — copies to clipboard or downloads as `.txt`.
6. Optionally resets and retries with different inputs.

## Productivity Impact

* Two-mode approach means both quick form-fill users and file-upload users are supported in one tool.
* Character count indicator helps users stay within expected cover letter length without manual counting.
* Download as `.txt` makes the output immediately usable across all word processors or email clients.
* Analyze step catches missing required fields before generation — reduces incomplete output.

## Edge Cases & Limitations

* PDF resume upload cannot be parsed as text in the current version — plain text paste is the reliable input path.
* Generated letter quality depends on the completeness of manual form fields — sparse input produces generic output.
* No tone or format options exist in the current version — output style is fixed.
* Character count is approximate — actual word processor formatting may differ.
* No history of previously generated letters is stored.

## Future Scope

* Export as DOCX with standard letter formatting.
* LinkedIn profile URL import — auto-fill experience and skills fields from a public profile.
* Job application tracker integration — link each generated cover letter to a job entry.

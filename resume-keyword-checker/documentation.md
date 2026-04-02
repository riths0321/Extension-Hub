# Resume Keyword Checker

## Overview

A Chrome extension for analyzing how well a resume matches a job description. Compares keyword presence between the two texts, calculates an ATS compatibility score, and categorizes keywords as Found or Missing — with a suggestions section and a "Extract from Page" feature.

## Existing Features (Verified from Code)

* **Job Description textarea** — paste the full job description
* **Resume Text textarea** — paste resume plain text
* **"Analyze Match" button** — runs the keyword comparison analysis
* **"Clear" button** — resets both textareas and hides results
* **"Extract from Page" button** — scrapes visible text from the current tab and populates the JD textarea (useful when viewing a job posting)
* **ATS Compatibility Score** — displayed as a percentage in a circular score badge
* **Results section (3 categories):**
  * ✅ Found Keywords — keywords from JD that exist in the resume
  * ❌ Missing Keywords — keywords from JD not found in the resume
  * 💡 Suggestions — improvement recommendations based on gaps
* **Summary section** — plain-text overall match summary
* **5 visual themes** with a theme picker dropdown (Ocean Blue, Mint Teal, Indigo Night, Sky Gradient, Violet Glow) — persists via `themes.css`
* Results section is hidden until analysis is run

## New Features to Add (Proposed Upgrades)

* **ATS Formatting Checker** → Detect ATS-unfriendly signals (e.g., table-based layout text, non-standard section headers) beyond keyword analysis.
* **Skill Gap Classifier** → Add a "Partially Present" middle category for synonyms and related terms — not just Found/Missing binary.
* **Priority Keyword Ranking** → Rank missing keywords by how frequently they appear in the JD — user knows which gaps to fix first.
* **Suggested Bullet Point Phrases** → For each critical missing keyword, generate 1–2 sample resume bullet points showing natural incorporation.
* **Multi-JD Comparison** → Paste 3 job descriptions and get a consolidated missing keyword set across all three.

## Feature Workflow

1. User opens a job posting in their browser.
2. Opens the extension → either pastes the JD text manually or clicks "Extract from Page" to auto-fill it from the current tab.
3. Pastes their resume text in the Resume Text area.
4. Clicks "Analyze Match" — results section appears.
5. Reviews ATS Compatibility Score, Found/Missing keyword lists, and Suggestions.
6. Reads the Summary for a holistic assessment.
7. Optionally switches visual theme using the 🎨 theme picker.
8. Clicks "Clear" to reset for a different job.

## Productivity Impact

* "Extract from Page" eliminates the manual copy-paste of the job description when directly on the job posting page.
* Binary keyword classification (Found / Missing) gives a quick, scannable gap analysis.
* Suggestions panel provides directional guidance without requiring the user to interpret raw data.
* ATS score makes abstract compatibility tangible — a number is easier to act on than a list alone.

## Edge Cases & Limitations

* Keyword matching is text-based — semantically similar but lexically different terms (e.g., "ML" vs. "Machine Learning") may not be detected as matches.
* "Extract from Page" scrapes all visible text including navigation and ads — JD field may contain noise that affects analysis accuracy.
* Analysis is case-insensitive but does not stem words — "managing" and "management" may be treated as different keywords.
* No support for PDF or DOCX resume upload — only plain text paste is supported.
* Theme selection persists locally; it is not synced across browsers or devices.

## Future Scope

* Interview question predictor — surface likely interview questions based on JD keywords.
* Resume version tracker — save multiple resume versions and compare ATS scores per job.
* Synonym dictionary for tech roles — map "ML" → "Machine Learning", "ReactJS" → "React" as equivalent terms.

# All-in-One Modular Productivity Extension Suite

## Consolidation Strategy & Merged Extensions

---

### Merge 1: Image Toolkit

**Merges:** Image Cropper + Image to PDF Converter

**Why Merge:**
Both tools operate on the same input type (images), share in-browser Canvas processing, and are frequently used in sequence — crop first, then convert to PDF. Combining them eliminates redundant image upload steps and provides a unified image manipulation environment.

**Combined Feature Set:**
* Upload single or batch images with drag-and-drop
* AI Smart Crop with subject detection
* Multi-aspect ratio presets (1:1, 16:9, 4:5, 3:2, custom)
* Non-destructive annotation overlay (text, arrows, highlights)
* Image reorder via drag-and-drop before PDF conversion
* Page layout control (full page, fit, grid, side-by-side)
* OCR text layer injection for searchable PDFs
* Compression level selector with file size preview
* PDF password protection (client-side)
* Output format selection: PNG, JPEG, WebP, PDF
* Batch crop-then-convert pipeline in a single flow

**Module Name:** `Image Toolkit`
**Activation:** Single extension with two primary modes — "Crop" and "Convert to PDF" — switchable via tab.

---

### Merge 2: Career Toolkit (DONE)

**Merges:** Resume Keyword Checker + Cover Letter Generator

**Why Merge:**
Both tools consume the same two inputs — a resume and a job description. Users always run keyword analysis first, then write their cover letter. Keeping them separate forces double data entry and breaks the natural workflow. Combined, the job description and resume are entered once, and both outputs are generated from the same session.

**Combined Feature Set:**
* Single paste zone for resume + job description
* ATS Score with per-factor breakdown
* Skill Gap Classifier: Present / Partial / Missing keywords
* Priority keyword ranking by JD frequency
* Suggested bullet point phrases for missing keywords
* Role Fit Summary paragraph
* JD-driven personalized cover letter generation
* Tone selector (Formal, Confident, Conversational, Creative)
* Structure selector (Classic, Problem-Solution, Story-Driven)
* Paragraph-level regeneration without full reset
* Company research prompt injector
* One-click export of both resume analysis report + cover letter

**Module Name:** `Career Toolkit`
**Activation:** Two-panel layout: "Analyze Resume" tab + "Generate Cover Letter" tab — shared data between both.

---



### Merge 4: Content Intelligence Suite

**Merges:** Keyword Extractor + SEO Generator + Text Summarizer

**Why Merge:**
Content researchers and SEO professionals use all three tools in the same workflow: read an article → summarize it → extract keywords → generate optimized SEO tags. Combining them creates an end-to-end content intelligence layer that activates on any webpage.

**Combined Feature Set:**
* One-click full-page content analysis
* AI text summarizer with format selector (bullet, executive, ELI5, takeaways)
* Reading level adjuster
* Named entity highlighter in summaries
* Keyword extraction with topic cluster detection
* Search intent classification per keyword (Informational / Transactional / Navigational / Commercial)
* Keyword density heatmap overlay on the live page
* Custom stop word list
* AI meta title variant generator (3 variants)
* SERP preview card with character count warnings
* Schema markup suggester (JSON-LD)
* Canonical and Open Graph tag checker
* Real-time SEO Score (0–100) with per-factor breakdown
* Batch export: keywords + SEO tags + summary as structured JSON or CSV

**Module Name:** `Content Intelligence Suite`
**Activation:** Side panel with three tabs: "Summarize", "Keywords", "SEO Tags".

---

### Merge 5: Media Toolkit

**Merges:** Audio Recorder Extension + PDF Previewer

**Why Merge:**
Both tools are used in documentation and review contexts — recording meeting audio while reading a shared PDF briefing, or recording verbal notes on a document. Combining them creates a unified media consumption and capture experience.

**Combined Feature Set:**
* Inline PDF rendering with zoom, navigation, and search
* Reading progress tracker with auto-resume
* AI document summary (first + last pages)
* Text highlights and note pin annotations (persisted per file)
* Page extraction and download
* Audio recorder with waveform display
* Segment markers during recording (M key)
* Noise suppression toggle
* AI transcription with real-time Web Speech API
* Post-recording waveform trim editor
* Multi-format audio export (WAV, MP3, OGG)
* Transcript export as TXT or SRT
* Linked mode: drop a recording marker when annotating a specific PDF page — connects audio timestamps to document page references

**Module Name:** `Media Toolkit`
**Activation:** Dual-panel layout: "Document Viewer" (left) + "Audio Recorder" (right). Linked mode button syncs markers across both panels.

---

### Merge 6: Session & Link Manager

**Merges:** Quick Link Manager + Tab Context Saver

**Why Merge:**
Both tools manage browser navigation artifacts — one saves individual links, the other saves collections of open tabs. Together they form a complete session and resource management layer: save a link from today's research, or save the entire session for tomorrow.

**Combined Feature Set:**
* Save individual links with AI auto-tagging
* Smart link collections from tag clusters
* Link health monitor (7-day background checks)
* Fuzzy search across saved links
* Keyboard shortcut save (`Ctrl+Shift+S`)
* Save full tab sessions with AI-generated session summary
* Attach notes to sessions
* Auto-capture sessions on idle (20+ min, 5+ tabs)
* Session merge (deduplicate URLs across two sessions)
* Markdown export for sessions and individual link collections
* Unified search across both saved links and saved sessions

**Module Name:** `Session & Link Manager`
**Activation:** Single popup with two tabs: "Links" and "Sessions". Unified search bar covers both.

---

## Master Suite Architecture

**Extension Name:** `ProFlow — Modular Productivity Suite`

**Architecture:** A single Chrome extension with a modular panel system. Each module (listed below) is independently activatable from the ProFlow sidebar. Users can enable or disable individual modules to reduce memory footprint.

| Module | Source Extensions | Primary User |
|---|---|---|
| Image Toolkit | Image Cropper + Image to PDF | Content creators, designers |
| Career Toolkit | Resume Keyword Checker + Cover Letter Generator | Job seekers, recruiters |
| Dev Toolkit | Code Snippet Manager + Code Previewer + CSS Specificity Calculator | Developers |
| Content Intelligence Suite | Keyword Extractor + SEO Generator + Text Summarizer | SEO teams, writers, researchers |
| Media Toolkit | Audio Recorder + PDF Previewer | Researchers, meeting participants |
| Session & Link Manager | Quick Link Manager + Tab Context Saver | Knowledge workers, researchers |
| Standalone: Meeting Mode Pro | Meeting Mode Pro | Team leads, remote workers |
| Standalone: Quick Fill Pro | Quick Fill Pro | Power users, marketers |
| Standalone: Budget Planner | Budget Planner | Individuals, freelancers |
| Standalone: UTM Link Builder | UTM Link Builder | Growth marketers |
| Standalone: README Generator | README Generator | Open source developers |
| Standalone: Markdown Previewer | Markdown Previewer | Technical writers, developers |
| Standalone: Design Token Generator | Design Token Generator | Design engineers |
| Standalone: Instant Dictionary | Instant Dictionary Extension | Readers, researchers |
| Standalone: Todo Tab Extension | Todo Tab Extension | All users |

**Cross-Module Shared Features:**
* Universal dark mode across all modules
* Export manager — unified download history for all files generated across any module
* Keyboard shortcut system — each module has a unique shortcut for activation
* Global search — searches across links, sessions, snippets, and summaries from one input
* Settings panel — enable/disable individual modules, clear per-module data, adjust thresholds

---

## Final Goal: What ProFlow Achieves

ProFlow eliminates the tool-switching overhead in a knowledge worker's browser session. Every category of productivity work — organizing links, writing content, reviewing PDFs, debugging CSS, building forms, recording meetings, managing finances, generating SEO copy — is handled within a single, modular extension.

Key outcomes:
* **Zero redundant inputs** — shared data between tools in the same module (e.g., resume + JD entered once in Career Toolkit)
* **Zero tab switching** — all tools accessible from a persistent sidebar or popup
* **AI augmentation at every step** — not as a gimmick, but as a time-saving layer in each specific workflow
* **Local-first processing** — no data leaves the browser by default; all AI is browser-native or opt-in
* **Scalable modularity** — new tools plug into the ProFlow sidebar without restructuring the extension

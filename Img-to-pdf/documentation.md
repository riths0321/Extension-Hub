# Image to PDF Converter

## Overview

A minimal Chrome extension for converting one or more local image files into a PDF document. Users upload multiple images, the extension merges them into a single PDF (one image per page) entirely in-browser, and downloads the result.

## Existing Features (Verified from Code)

* **Multi-image file picker** — `<input type="file" multiple accept="image/*">` — accepts any image format, multiple selection supported
* **File count display** — shows "No files selected" initially; updates to show count of selected files (e.g., "3 files selected")
* **"Convert to PDF" button** — triggers the in-browser image-to-PDF conversion
* **Status message** — `#statusMsg` shows conversion progress or result (e.g., "Converting...", "Done", error messages)
* **Label-based upload UI** — styled upload label for improved visual affordance
* All conversion is local — no external API or uploads; uses browser-side JavaScript (`popup.js`) likely with a canvas-based or jsPDF approach

## New Features to Add (Proposed Upgrades)

* **Image Reorder Before Export** — drag-and-drop thumbnail list to reorder images before conversion; currently images convert in the order files are selected.
* **Page Layout Control** — choose how each image fills the page: Full Page, Fit-to-Page with margins, Side-by-Side (2 per page), or Grid (4 per page).
* **OCR Text Layer Injection** — run in-browser OCR (Tesseract.js) after conversion to embed an invisible searchable text layer in the PDF.
* **Compression Level Selector** — preset quality options: High Quality, Balanced, Small File — with file size estimate before download.
* **PDF Password Protection** — set an open password on the generated PDF before downloading (client-side encryption).

## Feature Workflow

1. User opens the extension popup.
2. Clicks the "Upload Images" label — file picker opens.
3. Selects one or multiple image files — file count updates (e.g., "3 files selected").
4. Clicks "Convert to PDF" — conversion begins in-browser.
5. Status message updates during conversion ("Converting...", "Processing image 2 of 3...", etc.).
6. On completion, the browser auto-downloads the generated PDF file.
7. Status message shows "Done" or any error if conversion fails.

## Productivity Impact

* Multi-image selection in a single pick operation means no repeated file additions.
* Fully local conversion protects user privacy — image content never leaves the browser.
* One-click download delivers the final PDF without intermediate steps.
* No account, subscription, or internet connection required for basic conversion.

## Edge Cases & Limitations

* Image order in the PDF follows the browser's file picker selection order — not alphabetical or user-defined. Users cannot reorder images in the current version.
* Very large images (10MB+ each) may cause slow conversion or browser memory issues within popup constraints.
* PDF output is one image per page — no layout customization (grid, two-up, margins) in the current version.
* Supported input formats are whatever the browser's `image/*` accept handles — typically JPEG, PNG, WebP, GIF; HEIC/AVIF support varies.
* There is no file size indicator before or after conversion — users cannot predict output PDF size.

## Future Scope

* PDF merge companion — combine the generated image PDF with existing PDF uploads.
* Image-to-PDF template system — invoice, certificate, and document templates placing images in designated zones.
* Batch folder conversion — upload a folder and convert all to a single or per-image PDF in one operation.

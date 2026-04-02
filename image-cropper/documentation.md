# Image Cropper

## Overview

A Chrome extension for cropping images directly in the browser popup. Users upload an image, choose from free crop or fixed aspect ratio presets, interact with a visual crop region via the Cropper.js library, and download the cropped result.

## Existing Features (Verified from Code)

* **File upload input** — accepts any image format (`image/*`)
* **Aspect ratio selector** — dropdown with 4 options:
  * Free Crop (no ratio constraint)
  * 1:1 (square)
  * 16:9 (widescreen)
  * 4:3 (standard)
* **Image preview with crop UI** — powered by **Cropper.js** (`cropper.min.js` + `cropper.min.css`) — provides an interactive crop region with drag, resize, and rotate handles
* **"Download Cropped Image" button** — exports the cropped area as an image file
* **Preview box** — displays the uploaded image with the Cropper.js overlay
* All processing is local — no uploads to external servers

## New Features to Add (Proposed Upgrades)

* **AI Smart Crop** → AI detects the primary subject (face, product, text block) and pre-positions the crop region on the most relevant area — user approves or adjusts.
* **Additional Aspect Ratio Presets** → Add 4:5 (Instagram portrait), 2:3 (Pinterest), 3:2 (photography), and 9:16 (vertical video) options.
* **Output Format & Quality Selector** → Choose output as PNG, JPEG, or WebP with quality level — show estimated file size before download.
* **Batch Crop Mode** → Upload multiple images, define one crop setting, apply to all, and download as a ZIP.
* **Non-Destructive Annotation Overlay** → Add text overlays, arrows, or highlight boxes before exporting the crop.

## Feature Workflow

1. User opens extension popup.
2. Clicks the file input and selects a local image.
3. Image appears in the preview box with Cropper.js crop handles visible.
4. User selects an aspect ratio from the dropdown — the crop region snaps to that ratio.
5. User drags, resizes, and positions the crop region over the desired area.
6. Clicks "Download Cropped Image" — the cropped region is exported and downloaded.
7. Original image file is never modified — all operations are non-destructive in-browser.

## Productivity Impact

* Cropper.js provides professional-grade crop interaction (drag, resize, rotate) without any server—all local.
* Aspect ratio presets eliminate manual calculation for social media formats and design standards.
* In-browser download means no file upload or account required — instant result.
* Popup-based tool is faster than opening a desktop editor for quick social or thumbnail crops.

## Edge Cases & Limitations

* Only 4 aspect ratio presets available — other common ratios (9:16, 3:2, 2:3) must be done as free crop with manual positioning.
* Output format is whatever Cropper.js defaults to (typically PNG) — no format selector in the current version.
* Large images may slow down the popup's rendering due to Cropper.js initializing in a constrained popup window size.
* The crop UI works on one image at a time — no batch mode.
* Very small images may produce unusable crops when the popup canvas is constrained.

## Future Scope

* Background removal companion — remove background from the cropped image entirely in-browser.
* Crop history — store the last 5 crops per session for quick retrieval.
* Social media export pack — one-click export in all standard platform sizes simultaneously.

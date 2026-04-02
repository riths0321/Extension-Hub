# Audio Recorder Extension

## Overview

A browser extension that captures audio from any active tab (e.g., music, video, calls) without muting playback. Records tab audio using Chrome's `tabCapture` API via an offscreen document, saves recordings with metadata, and maintains a session history.

## Existing Features (Verified from Code)

* Record active tab audio without muting playback
* Live audio level meter (real-time bar indicator)
* HH:MM:SS recording timer
* Shows current tab name being recorded
* Recent recordings history list (filename, file size, timestamp)
* Clear history button
* Start / Stop recording buttons
* Background service worker (`background.js`) handles capture via `offscreen.js`
* Notification toasts for recording events (started, saved, error)

## New Features to Add (Proposed Upgrades)

* **Microphone Input Mode** → Currently only records tab audio. Add a toggle to switch to microphone input (`getUserMedia`) so users can record voice memos or narrations.
* **AI Transcription** → After recording ends, send audio to the Web Speech API or browser-native model for auto-transcription. Display transcript as scrollable text alongside the playback.
* **Segment Markers** → Press `M` during recording to drop a named timestamp marker. Timeline shows all markers post-recording — click to jump to that point.
* **Waveform Trim Editor** → Canvas-based waveform visualizer after recording. Drag-select a region to trim, then export just that segment.
* **Multi-Format Export** → Currently saves as WebM. Add MP3 and WAV export options with file size estimates per format.

## Feature Workflow

1. User opens extension popup.
2. Current tab name is displayed — user confirms which tab to record.
3. Clicks "Start Recording" — tab audio capture begins.
4. Live audio level meter and timer update in real time.
5. User clicks "Stop Recording" — file is saved automatically.
6. Saved recording appears in the "Recent Recordings" list with filename, size, and timestamp.
7. History can be cleared with one click.

## Productivity Impact

* Tab audio recording without muting means no workflow interruption during capture.
* History list makes it easy to track multiple recording sessions without external file tracking.
* Background service worker ensures recording continues even if the popup is closed.

## Edge Cases & Limitations

* Only records the audio from one active tab per session — cannot mix multiple tab audio sources.
* If the tab is reloaded or navigated away during recording, capture stops.
* File format is browser-determined (typically WebM/Opus) — no user-selectable codec in current version.
* Recording history is stored in extension's local storage — does not persist across browser profile wipes.
* Extension requires `tabCapture` permission — users must grant this explicitly on first use.

## Future Scope

* Speaker diarization — label transcript segments by detected speaker.
* Cloud backup toggle — auto-upload to Google Drive or Dropbox on recording end.
* Scheduled recording — set a start/stop time to record a tab automatically.

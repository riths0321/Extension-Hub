# Temp Mail Extension

`Temp Mail Extension` is a privacy-focused Chrome extension that generates a disposable email inbox for users. Its main purpose is to receive OTPs, verification emails, one-time signups, trial accounts, and temporary website registrations without exposing a personal email address.

---

## Overview

Many websites on the internet require an email address for signup or verification. Using a personal email everywhere can increase spam, promotional emails, and privacy risks.

This extension creates a temporary inbox where incoming emails can be received, refreshed, previewed, and accessed in a copy-friendly OTP format.

---

## Key Features

- Instant temporary inbox generation  
- Receive OTP and verification emails  
- Inbox refresh to fetch the latest messages  
- Safe message preview directly inside the popup  
- One-click email address copy  
- OTP code detection with quick copy buttons  
- Burn inbox option to discard the current address and generate a new one  
- Local state persistence using `chrome.storage.local`  
- Chrome MV3 compatible and CSP-safe popup architecture  

---

## Use Cases

- Website signup without exposing personal email  
- Receiving OTPs for temporary verification  
- Creating demo or testing accounts  
- Maintaining privacy on spam-heavy websites  
- One-time trial registrations  

---

## How It Works

1. Open the extension popup.
2. Click **Generate Inbox**.
3. The extension creates a temporary email address.
4. Use this address for website signup or OTP forms.
5. Click **Refresh** to fetch new emails.
6. Click any message in the inbox list to preview it.
7. If an email contains an OTP, the extension will show a quick-copy chip.
8. Use **Burn Inbox** to remove the current inbox and generate a fresh one.

---

## UI Highlights

- Premium popup layout with private inbox dashboard feel  
- Clear address section with copy functionality  
- Dedicated inbox feed for received messages  
- Built-in message preview panel  
- OTP chips for quick verification workflows  
- Status badge for clear action feedback  

---

## Project Structure
temp-mail-extension/
├── icons/
│ ├── icon16.png
│ ├── icon48.png
│ └── icon128.png
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
└── README.md

---

## Permissions

### storage

Used to store inbox state, generated email address, token, selected message ID, and cached message list in local browser storage.

### Host Permission
https://api.mail.tm/

Used to create temporary inboxes, obtain authentication tokens, and fetch inbox messages.

---

## Manifest / CSP Notes

This extension uses **Chrome Manifest V3**.

Configured CSP:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
This means:

No inline scripts are used

Popup scripts are loaded from external files

eval or unsafe dynamic script execution is not used

Functionality Notes

Inbox generation is handled through a remote disposable mail API

Address copying uses the Clipboard API

OTP detection scans the email subject and body for 4 to 8 digit numeric codes

The last selected message can be reopened in the preview panel

Refresh is manually triggered; auto-refresh is not enabled by default

Installation

Open chrome://extensions in Chrome.

Enable Developer Mode.

Click Load Unpacked.

Select the temp-mail-extension folder.

Open the extension popup from the Chrome toolbar.

Usage Flow
Generate Inbox

Click Generate Inbox

A temporary email address will be created

The generated inbox will appear in the address card

Copy Address

Use the Copy button to copy the address to the clipboard

Paste the address into signup or OTP forms

Read Emails

Click Refresh

Received messages will appear in the inbox feed

Click a message to view its preview

Copy OTP

If a numeric verification code is detected in the email, OTP chips will appear

Clicking a chip copies the code to the clipboard

Reset Inbox

Burn Inbox discards the current inbox

New Inbox generates a fresh temporary address

Privacy Notes

The extension stores generated inbox state in the local browser storage

No personal account login is required

The extension communicates only with the temporary mail provider API

It does not access personal Gmail or Outlook mailboxes

Limitations

Disposable inbox lifespan depends on the external provider policy

Some websites may block temporary email domains

HTML-heavy emails may appear in simplified text preview format

Real-time push inbox is not supported; manual refresh required

Recommended Improvements

Auto-refresh interval

Unread email highlighting

Search and filter inside inbox

Custom alias before inbox creation

Attachment handling

Tech Stack

HTML

CSS

Vanilla JavaScript

Chrome Extension Manifest V3

mail.tm API

Version

1.0.0

Summary

Temp Mail Extension is a clean, fast, and privacy-first disposable email tool designed to help users avoid spam, receive OTPs, and perform temporary signups. The UI is popup-driven, the workflow is simple, and the architecture follows Chrome CSP security rules.
# Multi-Country Clock

`Multi-Country Clock` ek premium Chrome extension hai jo multiple countries aur cities ka live time ek hi popup me dikhata hai. Ye extension offline kaam karta hai aur global teams, remote meetings, travel planning, aur cross-country coordination ke liye useful hai.

## Overview

Agar aap different countries ke clients, teammates, ya family members ke saath kaam karte ho, to har region ka local time quickly compare karna important hota hai. Ye extension ek clean world-time dashboard provide karta hai jisme analog clock, digital time, local date context, aur timezone comparison ek saath milta hai.

## Key Features

- Multiple world clocks in one popup
- Live analog and digital time display
- Searchable timezone picker
- Drag-to-reorder saved clocks
- 12-hour and 24-hour format toggle
- Light and dark atlas-inspired themes
- Persistent saved clocks and settings
- Offline functionality using browser time APIs

## Premium UI Highlights

- Atlas and travel-desk inspired visual theme
- Local time spotlight section
- Premium analog clock cards with digital comparison
- Clear section hierarchy and readable typography
- Search-first country picker for faster usage

## Supported Regions

Extension major world regions cover karta hai, including:

- India
- USA
- UK
- France
- Germany
- Italy
- Russia
- UAE
- Saudi Arabia
- China
- Japan
- South Korea
- Singapore
- Australia
- New Zealand
- Brazil
- Canada
- Mexico
- South Africa
- Egypt

## How It Works

1. Popup open karte hi local time spotlight dikhai deta hai.
2. Search box me country, city, ya timezone search karo.
3. Matching timezone select karo.
4. `Add Clock` se saved clock list me add karo.
5. Saved cards ko drag karke preferred order me arrange karo.
6. `12h / 24h` format toggle use karo.
7. Theme button se premium light or dark atlas mode switch karo.

## Usage Guide

### Add a Clock

- search box me destination type karo
- list me matching timezone select karo
- `Add Clock` click karo

### Quick Add

- timezone list item par double-click karke direct add kar sakte ho

### Reorder Clocks

- saved clock cards ko drag and drop karke reorder karo
- new order automatically save ho jata hai

### Remove a Clock

- clock card ke right side `Remove` button use karo

### Toggle Format

- top action button se `12h` aur `24h` mode switch hota hai

### Toggle Theme

- atlas light aur dark mode ke beech switch kar sakte ho

## Default Experience

First launch par extension starter clocks ke sath open hota hai:

- India - Kolkata
- UK - London
- USA - New York

Isse popup empty nahi lagta aur user ko immediately comparison view mil jata hai.

## Project Structure

```text
Multi-Country-Clock/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
└── README.md
```

## Permissions

### `storage`

Used for saving:

- selected clocks
- theme preference
- 12h / 24h preference
- reordered clock list

No remote host permissions required.

## CSP and Chrome Compatibility

Ye extension Manifest V3 use karta hai aur Chrome CSP policy ke according structured hai.

Configured CSP:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

Is implementation me:

- koi inline JavaScript use nahi hui
- popup rendering DOM-safe elements se hoti hai
- `eval` ya unsafe execution patterns nahi use kiye gaye

## Technical Notes

- `Intl.DateTimeFormat` se timezone-specific time calculate hota hai
- analog clock hands live second-level updates ke sath render hoti hain
- extension internet ke bina bhi kaam karti hai
- timezone search local static list par based hai

## Installation

1. `chrome://extensions` open karo
2. `Developer mode` enable karo
3. `Load unpacked` par click karo
4. `Multi-Country-Clock` folder select karo

## Best Use Cases

- remote team coordination
- international meetings
- client call planning
- travel schedule alignment
- family and friends in different countries

## Limitations

- timezone list curated static list hai, full IANA database picker nahi hai
- popup-based experience hai, background reminders included nahi hain
- DST changes browser timezone APIs par depend karte hain

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Chrome Extension Manifest V3
- Chrome Storage API
- `Intl.DateTimeFormat`

## Version

- `1.2.0`

## Summary

`Multi-Country Clock` ek polished, offline, and productivity-focused world time extension hai jo premium UI ke saath live global time comparison provide karta hai. Searchable timezone picker, drag-to-reorder clocks, analog + digital display, aur CSP-safe MV3 structure is extension ko practical aur production-ready banate hain.

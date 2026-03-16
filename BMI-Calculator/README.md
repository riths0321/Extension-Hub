⚖️ BMI Calculator

## Description
BMI Calculator is a clean, premium Chrome extension that computes Body Mass Index (BMI) with a clear health category, ideal weight range, daily calorie estimate, and category-based health insights. It is designed to be fast, minimal, and easy to understand within seconds.

## Features
- Instant BMI calculation with category badge
- Metric and Imperial unit system toggle (cm/kg or ft/in/lbs)
- Automatic unit conversion
- Ideal weight range calculation
- Daily calories estimation (BMR-based)
- Health insights per category (Underweight, Normal, Overweight, Obese)
- Gradient BMI scale visualization with animated fill
- Light and dark mode toggle (saved in localStorage)
- “How to use” quick guide
- Rate button that opens the Chrome Web Store reviews page
- Smart validation for realistic input ranges

## Tech Stack
- HTML5
- CSS3
- JavaScript (Vanilla)
- Chrome Extension (Manifest V3)

## Folder Structure
BMI-Calculator/
├── manifest.json       # Extension config + CSP
├── popup.html          # UI
├── popup.js            # Logic
└── popup.css           # Styling

## Installation (Developer Mode)
1. Clone the repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select the `BMI-Calculator` folder.

## How It Works
1. Choose Metric or Imperial.
2. Enter height, weight, and age.
3. Click **Calculate** to see BMI, category, insights, ideal range, and calories.

Formula:
`BMI = Weight / (Height × Height)`  
(height converted to meters internally)

## Permissions
None. The extension does not require extra permissions.

## CSP
A strict `content_security_policy` is set in `manifest.json` and allows only self-hosted scripts/styles plus Google Fonts.

## Privacy
- Zero data collection
- No tracking
- All calculations run locally

## License
This project is licensed under the MIT License.

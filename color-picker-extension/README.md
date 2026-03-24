# 🎨 Pixel Perfect Color Picker

### 🧩 Description
**Pixel Perfect Color Picker** helps designers and developers grab exact colors from any visible pixel on a webpage and work with them instantly (formats, palettes, contrast).

### 🚀 Features
- **Webpage Color Picking**: Uses native `EyeDropper` API with a screenshot-based fallback picker.
- **Accurate Pixel Detection**: Reads exact RGB values from the selected visible pixel.
- **Formats**: HEX, RGB, and HSL display + real-time conversion (editable fields).
- **Clipboard Copy**: One-click copy for any format.
- **Preview Swatch**: Instant visual reference of the picked color.
- **History**: Persistent recent colors stored locally, with built-in search.
- **Palettes**: Auto/Complementary/Analogous/Monochromatic generation + export (ASE/GPL/JSON).
- **Accessibility**: Built-in WCAG contrast ratio checker (AA/AAA badges).
- **Theme**: Manrope typography + light/dark theme toggle + rate button.
- **Color Panel**: Hue + saturation/brightness picker (HSV-style) for manual selection.

### 🛠️ Tech Stack
- **HTML5**: Interface.
- **CSS3**: Styling.
- **JavaScript**: EyeDropper API integration.
- **Chrome Extension (Manifest V3)**: Extension platform.

### 📂 Folder Structure
```
color-picker-extension/
├── icons/             # App icons
├── fonts/             # Manrope fonts (local)
├── popup.html         # Main UI
├── popup.js           # Picking logic
├── content.js         # Fallback picker overlay (page)
├── background.js       # Fallback sampler + storage
└── manifest.json      # Config
```

### ⚙️ Installation (Developer Mode)
1.  Clone this repository.
2.  Navigate to `chrome://extensions`.
3.  Enable **Developer mode**.
4.  Select **Load unpacked**.
5.  Choose `color-picker-extension`.

### 🧠 How It Works
1.  **Primary Picker**: Uses the modern `EyeDropper` API in Chromium browsers.
2.  **Fallback Picker**: If unavailable, a page overlay captures click coordinates and the extension samples the pixel from a screenshot of the visible tab.
3.  **Formats & Tools**: Converts to HEX/RGB/HSL, generates palettes, and checks WCAG contrast.

### 🔐 Permissions Explained
- **`storage`**: Save recent color history locally.
- **`activeTab` / `tabs`**: Used for the fallback visible-tab capture (`captureVisibleTab`) on the current tab.
- **Host permissions (`<all_urls>`)**: Enables the fallback overlay picker on normal webpages (not `chrome://` pages).

### 🔒 CSP
`manifest.json` uses a strict `content_security_policy` for extension pages (no remote scripts). Fonts are bundled locally under `fonts/`.

### 🔒 Privacy Policy
- **No Tracking**: We do not track what colors you pick or sites you visit.
- **Local History**: Color history is stored locally.

### 📄 License
This project is licensed under the **MIT License**.

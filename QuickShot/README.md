# QuickShot – Screen Capture Tool

QuickShot is a lightweight Chrome extension for **Capture → Annotate → Export** with a clean, premium UI (Manrope typography, subtle surfaces, fast popup).

## Features
- Capture: Visible screen + selected area (drag overlay)
- Capture: Full page (scroll + stitch)
- Annotate: Pen, Arrow, Rectangle, Circle, Text
- Edit: Brush size, opacity, color picker, crop, undo/redo, clear/reset
- Export: Copy to clipboard or download (PNG/JPG) with auto filename
- History: Recent screenshots (limit 20) stored in `chrome.storage.local`
- Options: Format, auto-copy toggle, filename toggles, theme toggle (Light/Dark)

## Pages
- `popup.html`: fast capture + editor UI
- `editor.html`: full-page editor (uses the same engine as the popup)
- `captured.html`: FireShot-style results page (preview + actions)
- `history.html`: recent screenshots grid
- `options.html`: settings

## Keyboard shortcuts
- Visible capture: `Alt+Shift+1`
- Area capture: `Alt+Shift+3`

### ⚙️ Installation
#### Developer Mode (Local)
1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right)
4. **Click "Load unpacked"**
5. **Select the project folder**

#### From Chrome Web Store (Coming Soon)
1. Visit Chrome Web Store
2. Search for "QuickShot"
3. Click "Add to Chrome"

### 🧠 How it works
1. Capture from the popup (or shortcuts)
2. Annotate on the canvas (popup/editor)
3. Copy or download; exports are saved to History

### 🔐 Privacy & Security
- **100% Local Processing**: All images stay on your device
- **No Data Collection**: We don't track or store your screenshots
- **No Internet Required**: Works offline

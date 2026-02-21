# Sticky Notes for Browser - Chrome Extension

A powerful Chrome extension that lets you place real, interactive sticky notes directly on any webpage. Unlike traditional note-taking extensions, these notes appear as actual DOM elements on the page itself, allowing for seamless interaction and persistence.

## 🌟 Features

### ✨ Core Features
- **Real Sticky Notes**: Notes appear directly on webpages as DOM elements, not in iframes or overlays
- **Per-Page Persistence**: Notes automatically save and reload when you revisit a page
- **Smart Categorization**: Notes are organized by webpage URL
- **Rich Text Formatting**: Bold, italic, underline, and font size controls
- **Multiple Colors**: 8 vibrant note colors (yellow, blue, green, pink, orange, purple, teal, gray)
- **Interactive Controls**: Pin, hide, minimize, lock, and resize notes
- **CSP-Compatible**: Works on sites with strict Content Security Policies (GitHub, Google, etc.)

### 🎨 Design Features
- **Modern UI**: Clean, gradient-based design with subtle animations
- **Responsive Notes**: Adjustable size with intuitive resize handles
- **Visual Feedback**: Interactive hover states and button feedback
- **Font Awesome Icons**: Beautiful, consistent iconography
- **Custom Scrollbars**: Styled scrollbars that match the theme
- **Custom Confirm Dialog**: Native-looking in-DOM modal — no blocked `window.confirm()` calls

### 🔧 Technical Features
- **Drag & Drop**: Move notes anywhere on the page
- **Resizable**: Adjust note size with corner handles
- **Minimize/Maximize**: Double-click header to toggle size
- **Auto-Save**: Changes are automatically saved to Chrome storage
- **Context Menu Integration**: Add notes via right-click menu
- **Per-Page Organization**: Notes are stored and loaded per URL

## 📁 Project Structure

```
sticky-notes-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js         # Background service worker
├── content.js           # Content script (runs on all pages)
├── content.css          # Styles for sticky notes
├── popup.html           # Extension popup UI
├── popup.css            # Popup styles
├── popup.js             # Popup functionality
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 Installation

### For Development:
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the project folder containing all files

### From Chrome Web Store:
*(Coming soon)*

## 🛠️ Usage

### Creating Notes:
1. **Via Popup**: Click extension icon → "New Note"
2. **Via Context Menu**: Right-click anywhere on page → "Sticky Notes" → "Add Note Here"
3. **With Selected Text**: Select text → Right-click → "Add Note with Selection"

### Managing Notes:
- **Move**: Drag the note header
- **Resize**: Drag the bottom-right corner handle
- **Minimize**: Double-click header or click minimize button
- **Pin**: Click thumbtack icon to pin note (stays on top)
- **Hide**: Click eye icon to hide/show note
- **Lock**: Click lock icon to prevent editing
- **Change Color**: Click palette icon to change note color
- **Close**: Click X icon to remove note (confirmed via in-page dialog)

### Popup Controls:
- **New Note**: Creates a new sticky note at default position
- **Show All**: Makes all hidden notes visible
- **Hide All**: Hides all notes (toggle visibility)
- **Settings**: 
  - Auto-save: Automatically save changes
  - Reopen notes: Restore notes on browser startup

## 🔧 Technical Details

### Architecture:
- **Manifest V3**: Uses service workers instead of background pages
- **Direct DOM Manipulation**: Notes are real HTML elements, not iframes
- **Event-Driven**: Mouse events for dragging and resizing
- **Chrome Storage API**: Persistent storage using `chrome.storage.local`

### Storage Schema:
```javascript
{
  "stickyNotes": {
    "example.com/page1": {
      "note_123456789": {
        "id": "note_123456789",
        "content": "Note text here",
        "color": "yellow",
        "left": 100,
        "top": 100,
        "width": 320,
        "height": 380,
        "pinned": false,
        "minimized": false,
        "hidden": false,
        "locked": false,
        "fontSize": "16",
        "createdAt": "2024-01-20T10:30:00Z",
        "updatedAt": "2024-01-20T10:35:00Z"
      }
    }
  },
  "settings": {
    "autoSave": true,
    "startOnBoot": false
  }
}
```

### Performance:
- **Lazy Loading**: Notes only load when page is ready
- **Efficient Storage**: Only stores note data, not entire DOM
- **Event Delegation**: Uses event delegation for better performance
- **Debounced Saving**: Prevents excessive storage writes

## 🔒 Content Security Policy (CSP) Compatibility

Many modern websites (GitHub, Google, Notion, etc.) enforce strict Content Security Policies that block common browser APIs and inline styles. This extension is fully CSP-hardened:

### What was fixed and why

| Issue | Root Cause | Fix Applied |
|---|---|---|
| `window.confirm()` blocked | Many CSPs disallow synchronous dialog APIs | Replaced with a fully in-DOM async modal (`showConfirmDialog()`) with keyboard support (Escape / Enter) |
| Inline `background` styles blocked | Strict `style-src` policies disallow JS-written inline styles | Note colours are now driven by `data-color` attribute selectors in CSS — no inline background values written by JS |
| `cursor` style written by JS during drag | Minor `style-src` exposure | Replaced with a `.dragging` CSS class toggled via `classList` |
| `backdrop-filter` on note elements | Blocked by some strict `style-src` CSPs; not critical to UX | Removed entirely |
| `contentEditable` set as JS property | Could be affected by strict DOM policies on some hosts | Changed to `element.setAttribute('contenteditable', ...)` |

### Custom Confirm Dialog

Instead of `window.confirm()` (which is silently suppressed on CSP-strict pages), the extension renders its own lightweight modal:

- Appended directly to `document.body` — no iframes, no `eval`, no external resources
- Keyboard accessible: **Enter** to confirm, **Escape** to cancel, click-outside to dismiss
- Animated with pure CSS (`@keyframes`) — no JS animation libraries
- Automatically cleaned up from the DOM after use

### manifest.json CSP recommendation

To ensure the extension itself does not trigger CSP violations, keep your `content_security_policy` in `manifest.json` as restrictive as possible:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

The content script injects no inline `<script>` tags, uses no `eval()` or `new Function()`, and loads no external resources — making it compatible with the strictest host-page CSPs.

## 🎨 Customization

### Note Colors:
- Yellow (default): `#FFF9C4`
- Blue: `#E3F2FD`
- Green: `#E8F5E9`
- Pink: `#FCE4EC`
- Orange: `#FFF3E0`
- Purple: `#F3E5F5`
- Teal: `#E0F2F1`
- Gray: `#F5F5F5`

Colors are applied via `[data-color]` attribute selectors in `content.css` — changing a note's color never writes an inline style.

### Font Sizes:
- Small: 14px
- Normal: 16px
- Large: 18px
- X-Large: 20px

## 📝 Development Notes

### Browser Compatibility:
- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Opera 74+ (Chromium-based)
- Brave 1.3+ (Chromium-based)

### Dependencies:
- **Font Awesome 6.4.0**: For icons (loaded via extension resource, not external CDN in content)
- **Chrome APIs**: `storage`, `tabs`, `contextMenus`, `activeTab`

### Code Architecture:
- **StickyNoteManager Class**: Main controller for note management
- **Event-Driven Design**: Uses Chrome message passing
- **Modular CSS**: Separate styles for content and popup
- **Attribute-Driven Theming**: Visual state (color, drag, lock, pin) controlled by CSS classes and `data-*` attributes rather than JS inline styles

### Security Considerations:
- **Content Security Policy**: No `eval()`, no `new Function()`, no inline scripts, no external resource fetches from content scripts. All dynamic visual state is driven by CSS classes and `data-*` attributes.
- **No `window.confirm()`**: Replaced with a sandboxed in-DOM modal to avoid CSP dialog restrictions.
- **Sandboxed Execution**: Content script runs in Chrome's isolated world — it cannot access page JS variables and page scripts cannot access extension APIs.
- **No Data Collection**: All data stored locally via `chrome.storage.local`.
- **Permission Minimalism**: Only requests necessary permissions.

## 🔍 Future Enhancements

### Planned Features:
- [ ] Note templates
- [ ] Export/import notes
- [ ] Cloud sync
- [ ] Note sharing
- [ ] Rich text editor with more formatting
- [ ] Keyboard shortcuts
- [ ] Note categories/tags
- [ ] Search functionality
- [ ] Note version history
- [ ] Dark mode

### Technical Improvements:
- [ ] Performance optimization for many notes
- [ ] Better conflict resolution for overlapping notes
- [ ] Undo/redo functionality
- [ ] Localization support
- [ ] Accessibility improvements (ARIA roles on custom dialog)
- [ ] Unit tests
- [ ] CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly on CSP-strict sites (GitHub, Google Docs, Notion)
5. Submit a pull request

### Development Setup:
```bash
# Clone the repository
git clone https://github.com/yourusername/sticky-notes-extension.git

# No build process required — load unpacked directly
```

### Testing:
- Test on multiple websites, including CSP-strict ones (GitHub, Google, Notion)
- Verify note persistence across page reloads
- Check browser console for any CSP violation errors (`Refused to...`)
- Test on different screen sizes
- Verify the custom confirm dialog appears correctly on close

## 🐛 Troubleshooting

### Common Issues:

**Notes not appearing**
Check the browser console for CSP errors (`Refused to apply inline style...`). If present, ensure you're using the latest version of `content.js` and `content.css` which replace all inline style writes with CSS class toggling.

**"Close note" dialog not showing**
This means `window.confirm()` was blocked by the page's CSP. Update to the latest version — the custom in-DOM dialog requires no browser dialog permissions.

**Notes not saving**
Verify `storage` permission is present in `manifest.json`.

**Context menu missing**
The extension may need reloading at `chrome://extensions/`.

**Performance issues**
Too many notes on one page. Consider using the Hide All feature to reduce DOM overhead.

### Checking for CSP Violations:
Open DevTools → Console and look for messages starting with `Refused to`. Common ones and their fixes:

```
Refused to apply inline style...       → Fixed: colours now use data-color CSS selectors
Refused to execute inline script...    → Fixed: no inline scripts injected
Refused to load the script...          → Fixed: no external scripts fetched by content
```

### Debugging:
```javascript
// Check storage contents
chrome.storage.local.get(null, console.log)

// Manually trigger note load
window.stickyNoteManager.loadExistingNotes()

// List active notes
window.stickyNoteManager.notes
```

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgements

- **Font Awesome** for beautiful icons
- **Chrome Extension API** documentation
- **Contributors** and testers

## 🔗 Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Made with ❤️ for developers, students, researchers, and anyone who needs to take notes while browsing**
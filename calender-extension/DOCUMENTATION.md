# Calendar & World Clock Documentation

## Overview

This extension provides two tools inside one popup:
- A calendar planner with month, week, agenda, and search views
- A world clock panel with reorderable live timezone cards

The codebase is built for Manifest V3 and now follows a stricter CSP-safe rendering approach.

## Current Architecture

### UI
- [index.html](/Users/apple/Desktop/Extension-Hub/calender-extension/index.html)
  - Main popup shell
  - Calendar panel
  - World clock panel
  - Event modal
  - Day popup

### Calendar Logic
- [script.js](/Users/apple/Desktop/Extension-Hub/calender-extension/script.js)
  - Calendar rendering
  - Event CRUD
  - Search
  - Agenda and week views
  - Holiday filtering
  - Day popup placement
  - ICS export

### Dropdown System
- [dropdown.js](/Users/apple/Desktop/Extension-Hub/calender-extension/dropdown.js)
  - Converts native `select` elements into custom popup-safe dropdowns
  - Opens only on button click
  - Closes on outside click or second click
  - Uses smooth open/close transitions

### Styling
- [style.css](/Users/apple/Desktop/Extension-Hub/calender-extension/style.css)
  - Calendar styles
  - Modal styles
  - Day popup
  - Custom dropdown classes
- [popup.css](/Users/apple/Desktop/Extension-Hub/calender-extension/popup.css)
  - World clock layout and scoped styles

## Security Status

### CSP
The current manifest CSP is:

```text
script-src 'self'; style-src 'self'; object-src 'none'; connect-src 'self';
```

This is tighter than the earlier setup because `blob:` has been removed from `connect-src`.

### Rendering Safety
The extension previously had several HTML-string based render paths. Those have now been hardened:
- Search results use DOM creation
- Month picker uses DOM creation
- Month cells and event chips use DOM creation
- Week view uses DOM creation
- Agenda view uses DOM creation
- Day popup uses DOM creation

This reduces future XSS risk if event titles, notes, filters, or search input expand further.

### Future Guardrails
If new features are added, keep these rules:
- Do not render user input through `innerHTML`
- Prefer `createElement`, `textContent`, and explicit attribute assignment
- Avoid inline event handlers and inline styles
- Keep popup assets local only

## Day Popup Behavior

The day popup now:
- Measures itself before final placement
- Prefers opening above the clicked date
- Falls back below the cell if the header would cover it
- Clamps within the popup viewport

This fixes the earlier issue where the popup could slide under the sticky header area.

## Functional Areas

### Calendar
- Month navigation
- Today jump
- Month picker
- Search
- Week and agenda views
- Holiday filter
- Event add, edit, duplicate, delete, undo
- Recurring events
- Multi-day events
- Category and color tags
- Google Calendar handoff
- ICS export

### World Clock
- Local time spotlight
- Multiple saved clocks
- 12h/24h toggle
- Searchable timezone picker
- Drag-to-reorder clock cards

## Storage

### Calendar
- Events are stored locally via the extension storage wrapper

### World Clock
- Saved clocks and 12h/24h preference are stored in `chrome.storage.local`

## Testing Checklist

- Reload unpacked extension after edits
- Open and close each dropdown from button click
- Change holiday filter and confirm rerender
- Click dates near the top row and confirm day popup stays visible
- Click dates in middle and lower rows and confirm popup placement stays aligned
- Add, edit, duplicate, and delete events
- Run search and agenda view checks
- Add and reorder world clocks
- Export ICS and confirm file download starts

## Known Notes

- ICS export still uses `URL.createObjectURL` for local file download, which is acceptable here
- Custom dropdown menus are rendered by local JS and CSS only
- The extension is designed for popup-only usage; manual Chrome reload remains necessary after local changes

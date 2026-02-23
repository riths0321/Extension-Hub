// content.js - Creates REAL sticky notes directly on webpage (NO IFRAMES)
if (!location.protocol.startsWith("http")) return;

class StickyNoteManager {
    constructor() {
        this.notes = new Map(); // noteId -> {element, data}
        this.currentZIndex = 1000;
        this.dragState = {
            isDragging: false,
            noteId: null,
            offsetX: 0,
            offsetY: 0
        };
        
        this.init();
    }

    init() {
        console.log('Sticky Notes Manager initialized');
        
        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            return this.handleMessage(message, sendResponse);
        });
        
        // Load existing notes for this page
        this.loadExistingNotes();
    }

    // ===== CSP-SAFE CUSTOM CONFIRM DIALOG =====

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            // Remove any existing dialog
            const existing = document.getElementById('sticky-note-confirm-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'sticky-note-confirm-overlay';
            overlay.className = 'sticky-confirm-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'sticky-confirm-dialog';

            const msg = document.createElement('p');
            msg.className = 'sticky-confirm-message';
            msg.textContent = message;

            const btnRow = document.createElement('div');
            btnRow.className = 'sticky-confirm-buttons';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'sticky-confirm-btn sticky-confirm-cancel';
            cancelBtn.textContent = 'Cancel';

            const okBtn = document.createElement('button');
            okBtn.className = 'sticky-confirm-btn sticky-confirm-ok';
            okBtn.textContent = 'Close Note';

            const cleanup = (result) => {
                overlay.remove();
                resolve(result);
            };

            cancelBtn.addEventListener('click', () => cleanup(false));
            okBtn.addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(okBtn);
            dialog.appendChild(msg);
            dialog.appendChild(btnRow);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Focus OK button for keyboard accessibility
            okBtn.focus();

            // Escape key to cancel
            const onKeydown = (e) => {
                if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', onKeydown); }
                if (e.key === 'Enter')  { cleanup(true);  document.removeEventListener('keydown', onKeydown); }
            };
            document.addEventListener('keydown', onKeydown);
        });
    }

    // ===== MESSAGE HANDLER =====
    
    handleMessage(message, sendResponse) {
        switch (message.action) {
            case 'createNote':
                const noteId = this.createNote(message.noteData);
                sendResponse({ success: true, noteId: noteId });
                break;
                
            case 'removeNote':
                this.removeNote(message.noteId);
                sendResponse({ success: true });
                break;
                
            case 'focusNote':
                this.bringToFront(message.noteId);
                sendResponse({ success: true });
                break;
                
            case 'editNote':
                this.focusNoteContent(message.noteId);
                sendResponse({ success: true });
                break;
                
            case 'showAllNotes':
                this.showAllNotes();
                sendResponse({ success: true });
                break;
                
            case 'hideAllNotes':
                this.hideAllNotes();
                sendResponse({ success: true });
                break;
                
            case 'getAllNotes':
                const noteIds = Array.from(this.notes.keys());
                sendResponse({ notes: noteIds });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
        return true; // Keep message channel open for async response
    }

    // ===== NOTE CREATION =====
    
    createNote(noteData) {
        const noteId = noteData.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Create note element
        const noteElement = this.createNoteElement(noteId, noteData);
        
        // Add to page
        document.body.appendChild(noteElement);
        
        // Store reference
        this.notes.set(noteId, {
            element: noteElement,
            data: {
                ...noteData,
                id: noteId,
                left: noteData.left || 100,
                top: noteData.top || 100,
                width: noteData.width || 320,
                height: noteData.height || 380,
                color: noteData.color || 'yellow',
                pinned: noteData.pinned || false,
                minimized: noteData.minimized || false,
                hidden: noteData.hidden || false,
                locked: noteData.locked || false,
                fontSize: noteData.fontSize || '16',
                content: noteData.content || '',
                createdAt: noteData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        });
        
        // Setup event listeners
        this.setupNoteEvents(noteId, noteElement);
        
        // Bring to front
        this.bringToFront(noteId);
        
        // Save to storage
        this.saveNoteToStorage(noteId);
        
        console.log(`Sticky note created: ${noteId}`);
        return noteId;
    }

    createNoteElement(noteId, noteData) {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.id = `sticky-note-${noteId}`;
        note.dataset.noteId = noteId;

        // ── Position/size via CSS custom properties (avoids repeated inline style writes)
        note.style.setProperty('--sn-left',   `${noteData.left   || 100}px`);
        note.style.setProperty('--sn-top',    `${noteData.top    || 100}px`);
        note.style.setProperty('--sn-width',  `${noteData.width  || 320}px`);
        note.style.setProperty('--sn-height', `${noteData.height || 380}px`);
        note.style.left   = `var(--sn-left)`;
        note.style.top    = `var(--sn-top)`;
        note.style.width  = `var(--sn-width)`;
        note.style.height = `var(--sn-height)`;
        note.style.zIndex = this.currentZIndex++;

        // Apply color via data attribute — colour rules live in CSS
        note.dataset.color = noteData.color || 'yellow';

        const header = document.createElement('div');
        header.className = 'note-header';
        header.textContent = `Note #${noteId.slice(-4)}`;

        const content = document.createElement('div');
        content.className = 'note-content';
        content.contentEditable = 'true';
        content.textContent = noteData.content || '';

        const footer = document.createElement('div');
        footer.className = 'note-footer';
        footer.textContent = '0 chars';

        note.appendChild(header);
        note.appendChild(content);
        note.appendChild(footer);
        
        return note;
    }

    // ===== EVENT SETUP =====
    
    setupNoteEvents(noteId, noteElement) {
        const noteData = this.notes.get(noteId);
        
        // Header dragging
        const header = noteElement.querySelector('.note-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.header-btn')) return;
            this.startDragging(noteId, e);
        });
        
        // Content events
        const content = noteElement.querySelector('.note-content');
        content.addEventListener('input', () => {
            this.updateNoteContent(noteId, content.textContent);
            this.updateCounters(noteElement);
        });
        
        // Double click header to minimize
        header.addEventListener('dblclick', () => {
            this.toggleMinimize(noteId);
        });
        
        // Click on note to bring to front
        noteElement.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.header-btn') && !e.target.closest('.footer-btn')) {
                this.bringToFront(noteId);
            }
        });
        
        // Resize handle
        const resizeHandle = noteElement.querySelector('.resize-handle');
        if (resizeHandle) {
            this.setupResizeEvents(noteId, resizeHandle, noteElement);
        }
        
        // Initial counter update
        this.updateCounters(noteElement);
        
        // Set font size
        const fontSizeSelect = noteElement.querySelector('.font-size');
        if (fontSizeSelect) {
            fontSizeSelect.value = noteData.data.fontSize || '16';
            content.style.fontSize = `${noteData.data.fontSize || 16}px`;
        }
    }

    setupButtonEvents(noteId, noteElement) {
        // PIN button
        const pinBtn = noteElement.querySelector('.pin-btn');
        if (pinBtn) pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePin(noteId);
        });
        
        // HIDE button
        const hideBtn = noteElement.querySelector('.hide-btn');
        if (hideBtn) hideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHide(noteId);
        });
        
        // MINIMIZE button
        const minimizeBtn = noteElement.querySelector('.minimize-btn');
        if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize(noteId);
        });
        
        // CLOSE button — uses CSP-safe async dialog
        const closeBtn = noteElement.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeNote(noteId);
        });
        
        // COLOR button
        const colorBtn    = noteElement.querySelector('.color-btn');
        const colorPicker = noteElement.querySelector('.color-picker');
        if (colorBtn && colorPicker) {
            colorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = colorPicker.style.display !== 'none';
                colorPicker.style.display = isVisible ? 'none' : 'flex';
                const formatToolbar = noteElement.querySelector('.format-toolbar');
                if (formatToolbar) formatToolbar.style.display = 'none';
            });
        }
        
        // Color options
        noteElement.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = e.target.dataset.color;
                this.changeNoteColor(noteId, color);
                if (colorPicker) colorPicker.style.display = 'none';
            });
        });
        
        // FORMAT button
        const formatBtn     = noteElement.querySelector('.format-btn');
        const formatToolbar = noteElement.querySelector('.format-toolbar');
        if (formatBtn && formatToolbar) {
            formatBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = formatToolbar.style.display !== 'none';
                formatToolbar.style.display = isVisible ? 'none' : 'flex';
                if (colorPicker) colorPicker.style.display = 'none';
            });
        }
        
        // Format buttons with data-command
        noteElement.querySelectorAll('.format-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const command = e.target.closest('.format-btn').dataset.command;
                this.formatNoteText(noteId, command);
            });
        });
        
        // Font size change
        const fontSizeEl = noteElement.querySelector('.font-size');
        if (fontSizeEl) fontSizeEl.addEventListener('change', (e) => {
            this.changeNoteFontSize(noteId, e.target.value);
        });
        
        // SAVE button
        const saveBtn = noteElement.querySelector('.save-btn');
        if (saveBtn) saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveNoteToStorage(noteId);
            this.showSaveFeedback(saveBtn);
        });
        
        // TIME button
        const timeBtn = noteElement.querySelector('.time-btn');
        if (timeBtn) timeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.insertTime(noteId);
        });
        
        // DATE button
        const dateBtn = noteElement.querySelector('.date-btn');
        if (dateBtn) dateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.insertDate(noteId);
        });
        
        // LOCK button
        const lockBtn = noteElement.querySelector('.lock-btn');
        if (lockBtn) lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLock(noteId);
        });
    }

    setupResizeEvents(noteId, resizeHandle, noteElement) {
        let isResizing = false;
        let startWidth, startHeight, startX, startY;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startWidth  = noteElement.offsetWidth;
            startHeight = noteElement.offsetHeight;
            startX = e.clientX;
            startY = e.clientY;
            
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const newWidth  = Math.max(250, startWidth  + (e.clientX - startX));
            const newHeight = Math.max(180, startHeight + (e.clientY - startY));
            
            noteElement.style.width  = `${newWidth}px`;
            noteElement.style.height = `${newHeight}px`;
            
            this.notes.get(noteId).data.width  = newWidth;
            this.notes.get(noteId).data.height = newHeight;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.userSelect = '';
                this.saveNoteToStorage(noteId);
            }
        });
    }

    // ===== DRAGGING =====
    
    startDragging(noteId, e) {
        const noteElement = document.getElementById(`sticky-note-${noteId}`);
        if (!noteElement) return;
        
        const noteData = this.notes.get(noteId);
        if (noteData.data.locked) return;
        
        this.dragState = {
            isDragging: true,
            noteId: noteId,
            offsetX: e.clientX - noteElement.offsetLeft,
            offsetY: e.clientY - noteElement.offsetTop
        };
        
        noteElement.classList.add('dragging');
        document.body.style.userSelect = 'none';
        
        this.bringToFront(noteId);
    }

    handleDocumentMouseMove(e) {
        if (!this.dragState.isDragging || !this.dragState.noteId) return;
        
        const noteElement = document.getElementById(`sticky-note-${this.dragState.noteId}`);
        if (!noteElement) return;
        
        const newX = e.clientX - this.dragState.offsetX;
        const newY = e.clientY - this.dragState.offsetY;
        
        noteElement.style.left = `${newX}px`;
        noteElement.style.top  = `${newY}px`;
        
        // Update note data
        const noteData = this.notes.get(this.dragState.noteId);
        if (noteData) {
            noteData.data.left = newX;
            noteData.data.top  = newY;
        }
    }

    handleDocumentMouseUp() {
        if (this.dragState.isDragging && this.dragState.noteId) {
            const noteElement = document.getElementById(`sticky-note-${this.dragState.noteId}`);
            if (noteElement) {
                noteElement.classList.remove('dragging');
            }
            
            // Save position
            this.saveNoteToStorage(this.dragState.noteId);
        }
        
        this.dragState = {
            isDragging: false,
            noteId: null,
            offsetX: 0,
            offsetY: 0
        };
        
        document.body.style.userSelect = '';
    }

    // ===== NOTE FEATURES =====
    
    togglePin(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.pinned = !noteData.data.pinned;
        noteData.element.classList.toggle('pinned', noteData.data.pinned);
        
        const pinBtn = noteData.element.querySelector('.pin-btn');
        if (pinBtn) pinBtn.classList.toggle('active', noteData.data.pinned);
        
        this.saveNoteToStorage(noteId);
    }

    toggleHide(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.hidden = !noteData.data.hidden;
        noteData.element.classList.toggle('hidden', noteData.data.hidden);
        
        const hideBtn  = noteData.element.querySelector('.hide-btn');
        if (hideBtn) {
            const hideIcon = hideBtn.querySelector('i');
            if (hideIcon) hideIcon.className = noteData.data.hidden ? 'fas fa-eye' : 'fas fa-eye-slash';
            hideBtn.classList.toggle('active', noteData.data.hidden);
        }
        
        this.saveNoteToStorage(noteId);
    }

    toggleMinimize(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.minimized = !noteData.data.minimized;
        noteData.element.classList.toggle('minimized', noteData.data.minimized);
        
        const minimizeBtn = noteData.element.querySelector('.minimize-btn');
        if (minimizeBtn) minimizeBtn.classList.toggle('active', noteData.data.minimized);
        
        // Height is handled by CSS .minimized rule; restore saved height when un-minimizing
        if (!noteData.data.minimized) {
            noteData.element.style.height = `${noteData.data.height}px`;
        }
        
        this.saveNoteToStorage(noteId);
    }

    toggleLock(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.locked = !noteData.data.locked;
        noteData.element.classList.toggle('locked', noteData.data.locked);
        
        const lockBtn = noteData.element.querySelector('.lock-btn');
        const content = noteData.element.querySelector('.note-content');
        
        if (lockBtn) {
            const lockIcon = lockBtn.querySelector('i');
            if (lockIcon) lockIcon.className = noteData.data.locked ? 'fas fa-lock' : 'fas fa-lock-open';
            lockBtn.classList.toggle('active', noteData.data.locked);
        }

        if (content) {
            // Use attribute rather than property so CSP doesn't block the string value
            content.setAttribute('contenteditable', noteData.data.locked ? 'false' : 'true');
        }
        
        this.saveNoteToStorage(noteId);
    }

    changeNoteColor(noteId, color) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.color = color;

        // Drive colour via data attribute — no inline background needed
        noteData.element.dataset.color = color;
        
        // Update active color in picker
        noteData.element.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.color === color);
        });
        
        this.saveNoteToStorage(noteId);
    }

    // Keep applyNoteColor as a fallback for code paths that call it directly
    applyNoteColor(noteElement, color) {
        noteElement.dataset.color = color;
    }

    changeNoteFontSize(noteId, size) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.data.fontSize = size;
        const content = noteData.element.querySelector('.note-content');
        if (content) content.style.fontSize = `${size}px`;
        
        this.saveNoteToStorage(noteId);
    }

    formatNoteText(noteId, command) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;

        const content = noteData.element.querySelector('.note-content');
        if (content) content.focus();
    }

    insertTime(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        const time = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        const content = noteData.element.querySelector('.note-content');
        if (!content) return;
        content.focus();
        content.textContent += ` \u{1F552} ${time} `;
        this.updateNoteContent(noteId, content.textContent);
    }

    insertDate(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const content = noteData.element.querySelector('.note-content');
        if (!content) return;
        content.focus();
        content.textContent += ` \u{1F4C5} ${date} `;
        this.updateNoteContent(noteId, content.textContent);
    }

    // ===== UTILITY FUNCTIONS =====
    
    bringToFront(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        noteData.element.style.zIndex = ++this.currentZIndex;
    }

    focusNoteContent(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        this.bringToFront(noteId);
        const content = noteData.element.querySelector('.note-content');
        if (content) content.focus();
        
        const toolbar = noteData.element.querySelector('.format-toolbar');
        if (toolbar) toolbar.style.display = 'flex';
    }

    showAllNotes() {
        this.notes.forEach((noteData) => {
            noteData.element.classList.remove('hidden');
            
            const hideBtn  = noteData.element.querySelector('.hide-btn');
            if (hideBtn) {
                const hideIcon = hideBtn.querySelector('i');
                if (hideIcon) hideIcon.className = 'fas fa-eye-slash';
                hideBtn.classList.remove('active');
            }
            
            noteData.data.hidden = false;
        });
    }

    hideAllNotes() {
        this.notes.forEach((noteData) => {
            noteData.element.classList.add('hidden');
            
            const hideBtn  = noteData.element.querySelector('.hide-btn');
            if (hideBtn) {
                const hideIcon = hideBtn.querySelector('i');
                if (hideIcon) hideIcon.className = 'fas fa-eye';
                hideBtn.classList.add('active');
            }
            
            noteData.data.hidden = true;
        });
    }

    updateNoteContent(noteId, content) {
        const noteData = this.notes.get(noteId);
        if (noteData) {
            noteData.data.content   = content;
            noteData.data.updatedAt = new Date().toISOString();
        }
    }

    updateCounters(noteElement) {
        const content   = noteElement.querySelector('.note-content');
        const text      = (content && content.innerText) || '';
        const charCount = text.length;

        const footer = noteElement.querySelector('.note-footer');
        if (footer) footer.textContent = `${charCount} chars`;
    }

    showSaveFeedback(saveBtn) {
        const originalHTML = saveBtn.innerHTML;
        saveBtn.textContent = "✓";
        saveBtn.classList.add('active');
        
        setTimeout(() => {
            saveBtn.innerHTML = originalHTML;
            saveBtn.classList.remove('active');
        }, 1000);
    }

    // ── CSP-safe async version (no window.confirm)
    async closeNote(noteId) {
        const confirmed = await this.showConfirmDialog('Close this sticky note?');
        if (!confirmed) return;
        
        const noteData = this.notes.get(noteId);
        if (noteData) {
            this.saveNoteToStorage(noteId);
            noteData.element.remove();
            this.removeNoteFromStorage(noteId);
            this.notes.delete(noteId);
        }
    }

    removeNote(noteId) {
        const noteData = this.notes.get(noteId);
        if (noteData) {
            noteData.element.remove();
            this.notes.delete(noteId);
        }
    }

    // ===== STORAGE FUNCTIONS =====
    
    saveNoteToStorage(noteId) {
        const noteData = this.notes.get(noteId);
        if (!noteData) return;
        
        const urlKey = this.getUrlKey(window.location.href);
        chrome.storage.local.get(['stickyNotes'], (result) => {
            const allNotes = result.stickyNotes || {};
            if (!allNotes[urlKey]) allNotes[urlKey] = {};
            allNotes[urlKey][noteId] = noteData.data;
            chrome.storage.local.set({ stickyNotes: allNotes });
        });
    }

    removeNoteFromStorage(noteId) {
        const urlKey = this.getUrlKey(window.location.href);
        chrome.storage.local.get(['stickyNotes'], (result) => {
            const allNotes = result.stickyNotes || {};
            if (allNotes[urlKey] && allNotes[urlKey][noteId]) {
                delete allNotes[urlKey][noteId];
                if (Object.keys(allNotes[urlKey]).length === 0) {
                    delete allNotes[urlKey];
                }
                chrome.storage.local.set({ stickyNotes: allNotes });
            }
        });
    }

    loadExistingNotes() {
        const urlKey = this.getUrlKey(window.location.href);
        chrome.storage.local.get(['stickyNotes'], (result) => {
            const allNotes  = result.stickyNotes || {};
            const pageNotes = allNotes[urlKey]   || {};
            
            Object.entries(pageNotes).forEach(([noteId, noteData]) => {
                this.createNote({ ...noteData, id: noteId });
            });
        });
    }

    getUrlKey(url) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname;
        } catch {
            return url;
        }
    }
}

// ===== GLOBAL EVENT LISTENERS =====

document.addEventListener('mousemove', (e) => {
    if (window.stickyNoteManager) {
        window.stickyNoteManager.handleDocumentMouseMove(e);
    }
});

document.addEventListener('mouseup', () => {
    if (window.stickyNoteManager) {
        window.stickyNoteManager.handleDocumentMouseUp();
    }
});

// ===== INITIALIZATION =====

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.stickyNoteManager = new StickyNoteManager();
    });
} else {
    window.stickyNoteManager = new StickyNoteManager();
}
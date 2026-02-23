// Super Simple Highlighter - Content Script
class SimpleHighlighter {
  constructor() {
    this.highlights = [];
    this.isHighlightMode = false;
    this.currentColor = 'yellow';
    this.showTooltip = true;
    this._boundMouseUp = this.handleTextSelection.bind(this);
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadHighlights();
    this.setupEventListeners();
    // No injectStyles() — all styles live in highlights.css (injected by manifest)

    chrome.storage.sync.get(['autoRestore'], (data) => {
      if (data.autoRestore !== false) {
        this.restoreHighlights();
      }
    });

    this.checkPendingColor();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['highlightColor', 'showTooltip'], (data) => {
        this.currentColor = data.highlightColor || 'yellow';
        this.showTooltip  = data.showTooltip !== false;
        resolve();
      });
    });
  }

  async loadHighlights() {
    return new Promise((resolve) => {
      const url = window.location.href;
      chrome.storage.local.get(['highlights'], (data) => {
        const allHighlights = data.highlights || {};
        this.highlights = allHighlights[url] || [];
        resolve();
      });
    });
  }

  // ── REMOVED injectStyles() ──────────────────────────────────────────────
  // Was injecting <style> tags with data: URI cursors — blocked by strict
  // style-src CSPs. All highlight + tooltip styles now live in highlights.css
  // which is declared in manifest.json and loaded as a web-accessible resource.
  // Cursor is set via a CSS class in highlights.css (no data: URI needed).

  setupEventListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'setHighlightMode':
          this.setHighlightMode(request.enabled);
          break;
        case 'setHighlightColor':
          this.setHighlightColor(request.color, request.immediate);
          break;
        case 'setShowTooltip':
          this.showTooltip = request.enabled;
          break;
        case 'refreshHighlights':
          this.restoreHighlights();
          break;
        case 'clearHighlights':
          this.clearAllHighlights();
          break;
        case 'scrollToHighlight':
          this.scrollToHighlight(request.index);
          break;
      }
      sendResponse({ success: true });
      return true;
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.setHighlightMode(!this.isHighlightMode);
      }
    });
  }

  checkPendingColor() {
    chrome.storage.session.get(['pendingColor'], (data) => {
      if (data.pendingColor) {
        this.currentColor = data.pendingColor;
        chrome.storage.session.remove(['pendingColor']);
      }
    });
  }

  setHighlightColor(color, immediate = false) {
    this.currentColor = color;

    // Update the data-color attribute on <body> so the CSS cursor rule
    // picks up the correct colour without any JS style writes.
    if (this.isHighlightMode) {
      document.body.dataset.highlighterColor = color;
    }

    if (immediate) {
      this.showNotification(`Color changed to ${color}`);
    }
  }

  // ── REMOVED updateCursorColor() ─────────────────────────────────────────
  // Was writing data:image/svg+xml URIs into element.style.cursor and
  // injecting dynamic <style> tags — both blocked by strict CSPs.
  // Cursor is now a simple CSS crosshair defined in highlights.css.

  setHighlightMode(enabled) {
    this.isHighlightMode = enabled;

    if (enabled) {
      document.body.classList.add('simple-highlighter-active');
      document.body.dataset.highlighterColor = this.currentColor;
      // Store bound reference so removeEventListener works correctly
      document.addEventListener('mouseup', this._boundMouseUp);
      this.showNotification(`Highlight mode ON (${this.currentColor}). Select text to highlight.`);
    } else {
      document.body.classList.remove('simple-highlighter-active');
      delete document.body.dataset.highlighterColor;
      document.removeEventListener('mouseup', this._boundMouseUp);
      this.showNotification('Highlight mode disabled');
    }
  }

  handleTextSelection() {
    if (!this.isHighlightMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text  = selection.toString().trim();

    if (text.length < 1) return;

    if (this.isSelectionInsideHighlight(range)) {
      this.showNotification('Text is already highlighted');
      selection.removeAllRanges();
      return;
    }

    if (this.selectionCrossesHighlights(range)) {
      this.showNotification('Cannot highlight across existing highlights');
      selection.removeAllRanges();
      return;
    }

    this.createHighlight(range, text);
    selection.removeAllRanges();
  }

  isSelectionInsideHighlight(range) {
    return (
      this.isInsideHighlight(range.startContainer) ||
      this.isInsideHighlight(range.endContainer)
    );
  }

  selectionCrossesHighlights(range) {
    const ancestor = range.commonAncestorContainer;
    const highlights = Array.from(
      ancestor.querySelectorAll?.('.simple-highlight') || []
    );
    if (highlights.length === 0) return false;

    const startIn = this.getContainingHighlight(range.startContainer);
    const endIn   = this.getContainingHighlight(range.endContainer);
    return startIn && endIn && startIn !== endIn;
  }

  getContainingHighlight(node) {
    let parent = node.parentNode;
    while (parent && parent !== document.body) {
      if (parent.classList?.contains('simple-highlight')) return parent;
      parent = parent.parentNode;
    }
    return null;
  }

  createHighlight(range, text) {
    if (!range || !text || text.length < 1) return;

    const highlightId = 'highlight-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    try {
      const clonedRange = range.cloneRange(); // keep original for xpath

      // ── Build span using only classes + data attributes ─────────────────
      // No inline style writes — all visual rules live in highlights.css.
      const span = this.buildHighlightSpan(highlightId, this.currentColor, text);

      if (!range.collapsed && range.toString().trim().length > 0) {
        try {
          const fragment = range.extractContents();

          const walker = document.createTreeWalker(
            fragment,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          const textNodes = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent.trim().length > 0) textNodes.push(node);
          }

          if (textNodes.length === 0) {
            span.appendChild(fragment);
            range.insertNode(span);
          } else {
            textNodes.forEach((textNode, index) => {
              if (textNode.textContent.trim().length > 0) {
                const textSpan = this.buildHighlightSpan(
                  highlightId + '-' + index,
                  this.currentColor,
                  textNode.textContent
                );
                textSpan.textContent = textNode.textContent;
                textNode.parentNode.replaceChild(textSpan, textNode);
              }
            });
            range.insertNode(fragment);
          }

          window.getSelection().removeAllRanges();

        } catch (innerError) {
          console.error('Error wrapping text:', innerError);
          const spanClone = this.buildHighlightSpan(highlightId, this.currentColor, text);
          spanClone.textContent = text;
          range.deleteContents();
          range.insertNode(spanClone);
        }
      }

      this.saveHighlight({
        id:        highlightId,
        text:      text,
        color:     this.currentColor,
        timestamp: Date.now(),
        html:      span.outerHTML,
        xpath:     this.getXPath(clonedRange.startContainer),
        offset:    clonedRange.startOffset
      });

      this.showNotification(
        `"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" highlighted`
      );

    } catch (error) {
      console.error('Error creating highlight:', error);
      this.showNotification('Error creating highlight. Try selecting different text.');
    }
  }

  // ── Build a highlight <span> with NO inline styles ──────────────────────
  // All colours/layout rules come from highlights.css via [data-color] selectors.
  buildHighlightSpan(id, color, text) {
    const span = document.createElement('span');
    span.className           = 'simple-highlight';
    span.dataset.highlightId = id;
    span.dataset.color       = color;

    if (this.showTooltip) {
      span.title = `Highlighted (${color}) — Click to remove`;
      span.addEventListener('mouseenter', (e) => this.showTooltipFn(e.currentTarget, text));
      span.addEventListener('mouseleave', ()  => this.hideTooltipFn());
    }

    span.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.removeHighlight(id);
    });

    return span;
  }

  getColorValue(colorName) {
    const colors = {
      yellow: 'rgba(255, 235, 59, 0.45)',
      green:  'rgba(76, 175, 80, 0.45)',
      blue:   'rgba(33, 150, 243, 0.45)',
      pink:   'rgba(233, 30, 99, 0.45)',
      red:    'rgba(244, 67, 54, 0.45)'
    };
    return colors[colorName] || colors.yellow;
  }

  showTooltipFn(element, text) {
    if (!this.showTooltip) return;

    const tooltip = document.createElement('div');
    tooltip.className   = 'simple-highlight-tooltip';
    tooltip.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;

    // Position via CSS classes — tooltip.css rules use position:fixed
    // so we don't need to set left/top via JS inline styles.
    // We only set the transform-origin anchor via CSS custom properties
    // which are allowed even under strict style-src, because they come
    // from the extension's own stylesheet context.
    const rect = element.getBoundingClientRect();
    tooltip.style.setProperty('--tip-left', `${rect.left + window.scrollX}px`);
    tooltip.style.setProperty('--tip-top',  `${rect.top  + window.scrollY - 10}px`);

    tooltip.id = 'current-tooltip';
    document.body.appendChild(tooltip);
  }

  hideTooltipFn() {
    document.getElementById('current-tooltip')?.remove();
  }

  getXPath(node) {
    if (node.id) return `//*[@id="${node.id}"]`;

    const parts = [];
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      let index   = 0;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) index++;
        sibling = sibling.previousSibling;
      }
      const tagName = node.nodeName.toLowerCase();
      parts.unshift(index ? `${tagName}[${index + 1}]` : tagName);
      node = node.parentNode;
    }
    return parts.length ? `/${parts.join('/')}` : null;
  }

  async saveHighlight(highlight) {
    const url = window.location.href;
    chrome.storage.local.get(['highlights'], (data) => {
      const allHighlights = data.highlights || {};
      if (!allHighlights[url]) allHighlights[url] = [];
      allHighlights[url].push(highlight);
      this.highlights = allHighlights[url];
      chrome.storage.local.set({ highlights: allHighlights });
    });
  }

  async restoreHighlights() {
    document.querySelectorAll('.simple-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    for (const highlight of this.highlights) {
      await this.restoreSingleHighlight(highlight);
    }
  }

  async restoreSingleHighlight(highlight) {
    try {
      if (!highlight.text || highlight.text.trim().length < 1) return;

      // Build span with no inline styles
      const span = this.buildHighlightSpan(highlight.id, highlight.color, highlight.text);
      span.textContent = highlight.text;

      const bodyText = document.body.textContent || document.body.innerText;
      if (bodyText.indexOf(highlight.text) === -1) return;

      const result = this.findTextPosition(highlight.text);
      if (result) {
        const { node, offset } = result;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + highlight.text.length);
        range.deleteContents();
        range.insertNode(span);
        if (span.parentNode) span.parentNode.normalize();
      }
    } catch (error) {
      console.log('Could not restore highlight:', error, highlight);
    }
  }

  findTextPosition(searchText) {
    if (!searchText || searchText.length < 3) return null;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const index = node.textContent.indexOf(searchText);
      if (index !== -1 && !this.isInsideHighlight(node)) {
        return { node, offset: index };
      }
    }
    return null;
  }

  isInsideHighlight(node) {
    let parent = node.parentNode;
    while (parent && parent !== document.body) {
      if (parent.classList?.contains('simple-highlight')) return true;
      parent = parent.parentNode;
    }
    return false;
  }

  removeHighlight(highlightId) {
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (element) {
      const parent = element.parentNode;
      parent.replaceChild(document.createTextNode(element.textContent), element);
      parent.normalize();
    }

    const url = window.location.href;
    chrome.storage.local.get(['highlights'], (data) => {
      const allHighlights = data.highlights || {};
      if (allHighlights[url]) {
        allHighlights[url]  = allHighlights[url].filter(h => h.id !== highlightId);
        this.highlights     = allHighlights[url];
        chrome.storage.local.set({ highlights: allHighlights });
      }
    });

    this.showNotification('Highlight removed');
  }

  clearAllHighlights() {
    document.querySelectorAll('.simple-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    this.highlights = [];
    this.showNotification('All highlights cleared from page');
  }

  scrollToHighlight(index) {
    if (!this.highlights[index]) return;

    const element = document.querySelector(`[data-highlight-id="${this.highlights[index].id}"]`);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Flash via class toggle instead of inline backgroundColor writes
    element.classList.add('simple-highlight-flash');
    setTimeout(() => element.classList.remove('simple-highlight-flash'), 1000);
  }

  showNotification(message) {
    document.getElementById('simple-highlighter-notification')?.remove();

    const notification = document.createElement('div');
    notification.id          = 'simple-highlighter-notification';
    notification.className   = 'simple-highlighter-notification'; // styled via highlights.css
    notification.textContent = message;

    // ── REMOVED notification.style.cssText and dynamic <style> injection ──
    // Both violated strict style-src CSPs. Notification appearance is now
    // fully controlled by the .simple-highlighter-notification rule in
    // highlights.css, which is loaded as an extension resource.

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  // ===== DEBUG (dev only — safe, no eval) =====
  debugColors() {
    console.log('=== HIGHLIGHTER DEBUG ===');
    console.log('Current color:', this.currentColor);
    console.log('Highlight mode:', this.isHighlightMode);
    console.log('Show tooltip:', this.showTooltip);

    document.querySelectorAll('.simple-highlight').forEach((h, i) => {
      console.log(`Highlight ${i}:`, {
        'Data Color': h.dataset.color || 'none',
        'Text':       h.textContent.substring(0, 50)
      });
    });

    chrome.storage.local.get(['highlights'], (data) => {
      const allHighlights  = data.highlights || {};
      const pageHighlights = allHighlights[window.location.href] || [];
      console.log(`Stored highlights: ${pageHighlights.length}`);
      pageHighlights.forEach((h, i) =>
        console.log(`  ${i}: ${h.color} — ${h.text.substring(0, 30)}`)
      );
    });

    console.log('=== END DEBUG ===');
  }
}

// Initialize
const highlighter = new SimpleHighlighter();

// Expose for debugging only — no security risk, just helpers
window.debugHighlighter = () => highlighter.debugColors();
window.highlighter      = highlighter;

console.log('🎨 Simple Highlighter loaded');
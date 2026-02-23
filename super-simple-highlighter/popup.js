document.addEventListener('DOMContentLoaded', function () {
  const highlightToggle = document.getElementById('highlightToggle');
  const colorButtons    = document.querySelectorAll('.color-btn');
  const clearPageBtn    = document.getElementById('clearPageBtn');
  const exportBtn       = document.getElementById('exportBtn');
  const statusText      = document.getElementById('statusText');
  const statusIndicator = document.getElementById('statusIndicator');
  const highlightsList  = document.getElementById('highlightsList');
  const autoRestore     = document.getElementById('autoRestore');
  const showTooltip     = document.getElementById('showTooltip');

  let currentColor  = 'yellow';
  let currentTabId  = null;

  // ── Status-dot colours via CSS data attribute ────────────────────────────
  // Previously used statusIndicator.style.background = <hex> on every action.
  // Instead we set a data attribute and let popup.css handle the colour.
  function setIndicatorColor(colorName) {
    statusIndicator.dataset.highlightColor = colorName;
  }

  function setIndicatorActive(active) {
    statusIndicator.dataset.active = active ? 'true' : 'false';
  }

  // ── CSP-safe confirm dialog ──────────────────────────────────────────────
  // window.confirm() is blocked on many sites' CSPs when the popup is open
  // in the context of an extension page with a strict policy.
  function showConfirm(message) {
    return new Promise((resolve) => {
      const existing = document.getElementById('sh-confirm-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id        = 'sh-confirm-overlay';
      overlay.className = 'sh-confirm-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'sh-confirm-dialog';

      const msg = document.createElement('p');
      msg.className   = 'sh-confirm-msg';
      msg.textContent = message;

      const row = document.createElement('div');
      row.className = 'sh-confirm-row';

      const cancelBtn = document.createElement('button');
      cancelBtn.className   = 'sh-btn sh-cancel';
      cancelBtn.textContent = 'Cancel';

      const okBtn = document.createElement('button');
      okBtn.className   = 'sh-btn sh-ok';
      okBtn.textContent = 'Clear';

      const done = (result) => { overlay.remove(); resolve(result); };

      cancelBtn.addEventListener('click', () => done(false));
      okBtn.addEventListener('click',     () => done(true));
      overlay.addEventListener('click',   (e) => { if (e.target === overlay) done(false); });

      const onKey = (e) => {
        if (e.key === 'Escape') { done(false); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Enter')  { done(true);  document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);

      row.appendChild(cancelBtn);
      row.appendChild(okBtn);
      dialog.appendChild(msg);
      dialog.appendChild(row);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      okBtn.focus();
    });
  }

  // ── Safe DOM helpers (replace innerHTML) ────────────────────────────────
  // popup.js was building highlight list items with innerHTML using user
  // data, which is an XSS vector if highlight text contains HTML characters.
  function buildHighlightItem(highlight, index) {
    const div = document.createElement('div');
    div.className = 'highlight-item';
    div.dataset.color = highlight.color; // drives border-left colour via CSS

    const textDiv = document.createElement('div');
    textDiv.className   = 'highlight-text';
    textDiv.title       = highlight.text;              // safe, sets attribute
    textDiv.textContent = highlight.text.substring(0, 50) +
                          (highlight.text.length > 50 ? '...' : ''); // safe

    const dot = document.createElement('span');
    dot.className       = 'highlight-color-dot';
    dot.dataset.color   = highlight.color;
    textDiv.appendChild(dot);

    const actions = document.createElement('div');
    actions.className = 'highlight-actions';

    const viewBtn   = document.createElement('button');
    viewBtn.dataset.index = index;
    viewBtn.title         = 'Scroll to highlight';
    viewBtn.textContent   = '👁️';
    viewBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scrollToHighlight', index });
      });
    });

    const removeBtn = document.createElement('button');
    removeBtn.dataset.index = index;
    removeBtn.title         = 'Remove highlight';
    removeBtn.textContent   = '🗑️';
    removeBtn.addEventListener('click', () => removeHighlight(index));

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);
    div.appendChild(textDiv);
    div.appendChild(actions);
    return div;
  }

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabId = tabs[0].id;
    updatePopup();
  });

  // Load settings
  chrome.storage.sync.get(['highlightColor', 'autoRestore', 'showTooltip'], (data) => {
    currentColor     = data.highlightColor || 'yellow';
    autoRestore.checked = data.autoRestore  !== false;
    showTooltip.checked = data.showTooltip  !== false;

    statusText.textContent = `Color: ${currentColor}`;
    setIndicatorColor(currentColor);

    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === currentColor);
    });
  });

  // ── Popup state refresh ──────────────────────────────────────────────────
  function updatePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get(['highlights'], (data) => {
        const highlights     = data.highlights || {};
        const pageHighlights = highlights[url]  || [];
        updateStatus(pageHighlights.length);
        updateHighlightsList(pageHighlights);
      });
    });
  }

  function updateStatus(count) {
    if (count > 0) {
      statusText.textContent = `${count} highlight${count === 1 ? '' : 's'} on page`;
      setIndicatorActive(true);
    } else {
      statusText.textContent = `Color: ${currentColor}`;
      setIndicatorColor(currentColor);
      setIndicatorActive(false);
    }
  }

  function updateHighlightsList(highlights) {
    // ── Use safe DOM construction, not innerHTML ──
    highlightsList.textContent = ''; // clears all children safely

    if (highlights.length === 0) {
      const p = document.createElement('p');
      p.className   = 'empty-state';
      p.textContent = 'No highlights yet on this page';
      highlightsList.appendChild(p);
      return;
    }

    highlights.forEach((highlight, index) => {
      highlightsList.appendChild(buildHighlightItem(highlight, index));
    });
  }

  function removeHighlight(index) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get(['highlights'], (data) => {
        const highlights = data.highlights || {};
        if (highlights[url]) {
          highlights[url].splice(index, 1);
          chrome.storage.local.set({ highlights }, () => {
            updatePopup();
            chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshHighlights' });
          });
        }
      });
    });
  }

  // ── Toggle highlight mode ────────────────────────────────────────────────
  highlightToggle.addEventListener('change', function () {
    const enabled = this.checked;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'setHighlightMode', enabled }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Please refresh the page for highlight mode');
        }
      });
    });
  });

  // ── Color selection ──────────────────────────────────────────────────────
  colorButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      colorButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentColor = this.dataset.color;

      chrome.storage.sync.set({ highlightColor: currentColor });

      statusText.textContent = `Color: ${currentColor}`;
      setIndicatorColor(currentColor);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'setHighlightColor', color: currentColor, immediate: true },
          (response) => {
            if (chrome.runtime.lastError) {
              chrome.storage.session.set({ pendingColor: currentColor });
            }
          }
        );
      });
    });
  });

  // ── Clear page highlights (CSP-safe async confirm) ───────────────────────
  clearPageBtn.addEventListener('click', async function () {
    const confirmed = await showConfirm('Clear all highlights on this page?');
    if (!confirmed) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get(['highlights'], (data) => {
        const highlights = data.highlights || {};
        delete highlights[url];
        chrome.storage.local.set({ highlights }, () => {
          updatePopup();
          chrome.tabs.sendMessage(tabs[0].id, { action: 'clearHighlights' });
        });
      });
    });
  });

  // ── Export highlights ────────────────────────────────────────────────────
  // Uses a Blob object URL on a programmatic <a> click.
  // Extension popup pages (chrome-extension://) are NOT subject to the same
  // strict CSP as injected content scripts, so blob: URLs are allowed here.
  // This avoids the need for the "downloads" permission entirely.
  exportBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get(['highlights'], (data) => {
        const highlights     = data.highlights || {};
        const pageHighlights = highlights[url]  || [];

        const exportData = {
          url:        url,
          exportedAt: new Date().toISOString(),
          highlights: pageHighlights
        };

        const blob     = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const blobUrl  = URL.createObjectURL(blob);
        const filename = `highlights_${new Date().toISOString().slice(0, 10)}.json`;

        // Programmatic anchor click — safe inside extension popup pages
        const a = document.createElement('a');
        a.href     = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Release the object URL after the browser has queued the download
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      });
    });
  });

  // ── Settings ─────────────────────────────────────────────────────────────
  autoRestore.addEventListener('change', function () {
    chrome.storage.sync.set({ autoRestore: this.checked });
  });

  showTooltip.addEventListener('change', function () {
    const enabled = this.checked;
    chrome.storage.sync.set({ showTooltip: enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'setShowTooltip', enabled });
    });
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  updatePopup();

  chrome.storage.session.get(['pendingColor'], (data) => {
    if (!data.pendingColor) return;
    currentColor = data.pendingColor;
    chrome.storage.session.remove(['pendingColor']);

    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === currentColor);
    });
    statusText.textContent = `Color: ${currentColor}`;
    setIndicatorColor(currentColor);
  });
});
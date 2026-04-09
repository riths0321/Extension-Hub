/**
 * SnipVault – Content Script
 * Handles snippet insertion into active web pages.
 * CSP-safe: NO innerHTML, NO eval.
 */

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === 'insertCode') {
      insertCode(request.code, request.language);
      sendResponse({ success: true });
    }
  } catch (err) {
    console.error('[SnipVault] Content script error:', err);
    sendResponse({ success: false, error: err.message });
  }
});

/* ── Insert Code ───────────────────────────────────────────────── */
function insertCode(code, language) {
  const active = document.activeElement;

  if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'))) {
    const start = active.selectionStart;
    const end = active.selectionEnd;
    const val = active.value;
    active.value = val.slice(0, start) + code + val.slice(end);
    active.selectionStart = active.selectionEnd = start + code.length;
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.dispatchEvent(new Event('change', { bubbles: true }));
    active.focus();
    return;
  }

  if (active?.isContentEditable) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(code);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      active.focus();
      return;
    }
  }

  // Fallback: show draggable floating window
  showFloatingWindow(code, language);
}

/* ── Floating Window ───────────────────────────────────────────── */
function showFloatingWindow(code, language) {
  const existing = document.getElementById('snipvault-float');
  if (existing) existing.remove();

  const win = document.createElement('div');
  win.id = 'snipvault-float';
  win.className = 'snipvault-float';
  win.style.top = '48px';
  win.style.right = '20px';

  // Header
  const header = document.createElement('div');
  header.className = 'snipvault-float-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'snipvault-float-header-left';
  const titleEl = document.createElement('strong');
  titleEl.className = 'snipvault-float-title';
  titleEl.textContent = 'SnipVault';
  const langEl = document.createElement('span');
  langEl.className = 'snipvault-float-lang';
  langEl.textContent = language || 'plaintext';
  headerLeft.append(titleEl, langEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'snipvault-float-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => win.remove());

  header.append(headerLeft, closeBtn);

  // Code area
  const pre = document.createElement('pre');
  pre.className = 'snipvault-float-pre';

  const codeEl = document.createElement('code');
  codeEl.textContent = code;  // safe, textContent only
  pre.appendChild(codeEl);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'snipvault-float-footer';

  const copyBtn = makeBtn('Copy', 'primary');
  const insertBtn = makeBtn('Insert at Cursor', 'success');

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = '✓ Copied!';
      copyBtn.classList.add('is-success');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('is-success');
      }, 2000);
    } catch {
      copyBtn.textContent = 'Copy failed';
      copyBtn.classList.add('is-danger');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('is-danger');
      }, 1600);
    }
  });

  insertBtn.addEventListener('click', () => {
    win.remove();
    insertCode(code, language);
  });

  footer.append(copyBtn, insertBtn);
  win.append(header, pre, footer);
  document.body.appendChild(win);
  makeDraggable(win, header);
}

function makeBtn(label, bg) {
  const btn = document.createElement('button');
  btn.className = `snipvault-float-btn ${bg === 'success' ? 'is-success-default' : 'is-primary-default'}`;
  btn.textContent = label;
  return btn;
}

function makeDraggable(el, handle) {
  let dragging = false, ox = 0, oy = 0;

  handle.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    const r = el.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    el.style.transition = 'none';
    el.style.opacity = '0.92';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    e.preventDefault();
    let left = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - el.offsetWidth));
    let top = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - el.offsetHeight));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    el.style.opacity = '1';
  });
}

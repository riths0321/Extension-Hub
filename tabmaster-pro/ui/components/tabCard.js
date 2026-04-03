/**
 * ui/components/tabCard.js
 * Builds a single tab row element with zero innerHTML on user data.
 * Used by panel-tabs and panel-sleep tab lists.
 */

const TabCard = (() => {

  /**
   * Build a tab list item element.
   * @param {chrome.tabs.Tab} tab
   * @param {{ selected: boolean, onSelect, onSwitch, onClose, onPin, onMute, onSleep, onWake }} opts
   */
  function build(tab, opts = {}) {
    const {
      selected  = false,
      onSelect  = () => {},
      onSwitch  = () => {},
      onClose   = () => {},
      onPin     = () => {},
      onMute    = () => {},
      onSleep   = null,
      onWake    = null,
    } = opts;

    const item = document.createElement('div');
    item.className  = 'tab-item';
    item.dataset.id = tab.id;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', tab.title || 'Tab');
    if (selected) item.classList.add('selected');
    if (tab.pinned)   item.classList.add('is-pinned');
    if (tab.audible)  item.classList.add('is-audio');
    if (tab.discarded) item.classList.add('is-sleeping');

    // ── Checkbox ─────────────────────────────────────────────
    const cbWrap = document.createElement('label');
    cbWrap.className = 'tab-check';
    cbWrap.setAttribute('aria-label', 'Select tab');
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = selected;
    cb.addEventListener('change', () => {
      item.classList.toggle('selected', cb.checked);
      onSelect(tab.id, cb.checked);
    });
    cbWrap.appendChild(cb);

    // ── Favicon ───────────────────────────────────────────────
    const favicon = document.createElement('img');
    favicon.className   = 'tab-favicon';
    favicon.width       = 16;
    favicon.height      = 16;
    favicon.alt         = '';
    favicon.src         = tab.favIconUrl || defaultFavicon();
    favicon.onerror     = () => { favicon.src = defaultFavicon(); };

    // ── Info ──────────────────────────────────────────────────
    const info = document.createElement('div');
    info.className = 'tab-info';

    const titleEl = document.createElement('div');
    titleEl.className   = 'tab-title';
    titleEl.textContent = tab.title || 'Untitled';

    const domain = Helpers.getDomain(tab.url);
    const urlEl  = document.createElement('div');
    urlEl.className   = 'tab-domain';
    urlEl.textContent = domain || tab.url || '';

    info.appendChild(titleEl);
    info.appendChild(urlEl);

    // Badges
    const badges = document.createElement('div');
    badges.className = 'tab-badges';
    if (tab.pinned)   badges.appendChild(makeBadge('Pinned',   'badge-blue'));
    if (tab.audible)  badges.appendChild(makeBadge('Audio',    'badge-green'));
    if (tab.discarded) badges.appendChild(makeBadge('Sleeping','badge-gray'));
    if (badges.children.length) info.appendChild(badges);

    // ── Actions ───────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'tab-actions';

    if (onWake && tab.discarded) {
      actions.appendChild(makeIconBtn('Wake', wakeIcon(), () => onWake(tab.id)));
    } else if (onSleep && !tab.discarded && !tab.active) {
      actions.appendChild(makeIconBtn('Sleep', sleepIcon(), () => onSleep(tab.id)));
    }

    actions.appendChild(makeIconBtn(
      tab.mutedInfo?.muted ? 'Unmute' : 'Mute',
      tab.mutedInfo?.muted ? unmuteIcon() : muteIcon(),
      () => onMute(tab.id, !tab.mutedInfo?.muted)
    ));
    actions.appendChild(makeIconBtn(
      tab.pinned ? 'Unpin' : 'Pin',
      pinIcon(),
      () => onPin(tab.id, !tab.pinned)
    ));
    actions.appendChild(makeIconBtn('Close', closeIcon(), () => onClose(tab.id)));

    // ── Assembly ──────────────────────────────────────────────
    item.appendChild(cbWrap);
    item.appendChild(favicon);
    item.appendChild(info);
    item.appendChild(actions);

    // Click info area → switch to tab
    info.addEventListener('click', () => onSwitch(tab.id, tab.windowId));
    info.style.cursor = 'pointer';

    return item;
  }

  // ── Helpers ───────────────────────────────────────────────────

  function makeBadge(text, cls) {
    const b = document.createElement('span');
    b.className   = `badge ${cls}`;
    b.textContent = text;
    return b;
  }

  function makeIconBtn(label, svgEl, onClick) {
    const btn = document.createElement('button');
    btn.className = 'tab-action-btn';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.appendChild(svgEl);
    btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return btn;
  }

  function defaultFavicon() {
    return '../icons/fallback-badge.svg';
  }

  // ── SVG icons ──────────────────────────────────────────────────
  function makeIcon(path, extra = '') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    if (extra) {
      const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', extra);
      svg.appendChild(p2);
    }
    return svg;
  }

  const closeIcon  = () => makeIcon('M18 6L6 18M6 6l12 12');
  const pinIcon    = () => makeIcon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
  const muteIcon   = () => makeIcon('M11 5L6 9H2v6h4l5 4V5z', 'M23 9l-6 6M17 9l6 6');
  const unmuteIcon = () => makeIcon('M11 5L6 9H2v6h4l5 4V5z', 'M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07');
  const sleepIcon  = () => makeIcon('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
  const wakeIcon   = () => makeIcon('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41');

  return { build };
})();

if (typeof globalThis !== 'undefined') globalThis.TabCard = TabCard;

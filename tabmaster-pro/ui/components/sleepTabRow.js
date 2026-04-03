/**
 * ui/components/sleepTabRow.js
 * Compact tab row for the Sleep panel — shows sleep status + individual controls.
 */

const SleepTabRow = (() => {

  function build(tab, { onSleep = () => {}, onWake = () => {} } = {}) {
    const row = document.createElement('div');
    row.className  = `sleep-row ${tab.discarded ? 'sleep-row-sleeping' : ''}`;
    row.dataset.id = tab.id;
    row.setAttribute('role', 'listitem');

    // Favicon
    const fav = document.createElement('img');
    fav.className = 'sleep-favicon';
    fav.width     = 14; fav.height = 14; fav.alt = '';
    fav.src       = tab.favIconUrl || defaultFavicon();
    fav.onerror   = () => { fav.src = defaultFavicon(); };

    // Info
    const info = document.createElement('div');
    info.className = 'sleep-info';

    const title = document.createElement('div');
    title.className   = 'sleep-title';
    title.textContent = tab.title || Helpers.getDomain(tab.url) || 'Tab';

    const status = document.createElement('div');
    status.className   = 'sleep-status';
    status.textContent = tab.discarded ? '😴 Sleeping' : tab.active ? '● Active' : '◌ Idle';

    info.appendChild(title);
    info.appendChild(status);

    // Action button
    const btn = document.createElement('button');
    if (tab.discarded) {
      btn.className   = 'sleep-action-btn wake-btn';
      btn.textContent = 'Wake';
      btn.setAttribute('aria-label', `Wake ${tab.title}`);
      btn.addEventListener('click', () => onWake(tab.id));
    } else if (!tab.active) {
      btn.className   = 'sleep-action-btn sleep-btn';
      btn.textContent = 'Sleep';
      btn.setAttribute('aria-label', `Sleep ${tab.title}`);
      btn.addEventListener('click', () => onSleep(tab.id));
    } else {
      btn.className   = 'sleep-action-btn active-badge';
      btn.textContent = 'Active';
      btn.disabled    = true;
    }

    row.appendChild(fav);
    row.appendChild(info);
    row.appendChild(btn);

    return row;
  }

  function defaultFavicon() {
    return '../icons/fallback-badge.svg';
  }

  return { build };
})();

if (typeof globalThis !== 'undefined') globalThis.SleepTabRow = SleepTabRow;

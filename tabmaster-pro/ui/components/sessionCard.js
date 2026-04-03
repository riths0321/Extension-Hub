/**
 * ui/components/sessionCard.js
 * Builds a session card DOM element — zero innerHTML on user data.
 */

const SessionCard = (() => {

  /**
   * @param {object} session
   * @param {{ onRestore, onDelete }} opts
   */
  function build(session, { onRestore = () => {}, onDelete = () => {} } = {}) {
    const card = document.createElement('article');
    card.className  = 'session-card';
    card.dataset.id = session.id;
    card.setAttribute('role', 'listitem');

    // ── Header ────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'session-header';

    const nameEl = document.createElement('div');
    nameEl.className   = 'session-name';
    nameEl.textContent = session.name;

    const metaEl = document.createElement('div');
    metaEl.className   = 'session-meta';
    const count = session.tabs?.length ?? session.tabCount ?? 0;
    metaEl.textContent = `${count} tab${count !== 1 ? 's' : ''} · ${Helpers.timeAgo(session.timestamp)}`;

    // Tags
    if (session.tags?.length) {
      const tags = document.createElement('div');
      tags.className = 'session-tags';
      session.tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className   = 'session-tag';
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      header.appendChild(nameEl);
      header.appendChild(tags);
      header.appendChild(metaEl);
    } else {
      header.appendChild(nameEl);
      header.appendChild(metaEl);
    }

    // ── Preview list ──────────────────────────────────────────
    const preview = document.createElement('ul');
    preview.className = 'session-preview';
    const tabs = session.tabs ?? [];
    tabs.slice(0, 3).forEach(tab => {
      const li = document.createElement('li');
      li.className = 'session-preview-item';

      const fav = document.createElement('img');
      fav.className = 'session-favicon';
      fav.width  = 12;
      fav.height = 12;
      fav.alt    = '';
      fav.src    = tab.favIconUrl || defaultFavicon();
      fav.onerror = () => { fav.src = defaultFavicon(); };

      const label = document.createElement('span');
      label.textContent = tab.title || tab.url;

      li.appendChild(fav);
      li.appendChild(label);
      preview.appendChild(li);
    });

    if (tabs.length > 3) {
      const more = document.createElement('li');
      more.className   = 'session-preview-more';
      more.textContent = `+${tabs.length - 3} more`;
      preview.appendChild(more);
    }

    // ── Actions ───────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'session-actions';

    const restoreBtn = document.createElement('button');
    restoreBtn.className   = 'btn btn-sm btn-primary';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', () => onRestore(session.id, session.name));

    const deleteBtn = document.createElement('button');
    deleteBtn.className   = 'btn btn-sm btn-ghost btn-danger-text';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => onDelete(session.id, session.name));

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);

    // ── Assembly ──────────────────────────────────────────────
    card.appendChild(header);
    card.appendChild(preview);
    card.appendChild(actions);

    return card;
  }

  function defaultFavicon() {
    return '../icons/fallback-badge.svg';
  }

  return { build };
})();

if (typeof globalThis !== 'undefined') globalThis.SessionCard = SessionCard;

/**
 * popup.js — TOTP Authenticator Pro
 * Modular, secure, CSP-compliant popup controller.
 * No innerHTML on user data. No eval. AES-GCM encrypted vault.
 */

(async function () {
  'use strict';

  // ── Singletons ────────────────────────────────────────────────
  const totp = new TOTP();

  // ── State ─────────────────────────────────────────────────────
  let masterPassword  = null;   // in-memory only, cleared on lock
  let accounts        = [];
  let settings        = { autoLockMinutes: 5, autoCopy: true };
  let tickInterval    = null;
  let inactivityTimer = null;
  let currentView     = 'lock'; // lock | vault | setup
  let searchQuery     = '';
  let selectedIdx     = -1;
  let accountToDelete = null;
  let editingId       = null;

  // ── DOM refs ──────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const views      = { lock: $('view-lock'), vault: $('view-vault'), setup: $('view-setup') };
  const accountsList = $('accounts-list');
  const searchInput  = $('search-input');
  const overviewCount = $('overview-count');

  // ── Boot ──────────────────────────────────────────────────────
  async function init() {
    const initialized = await SecureStorage.isInitialized();
    const lockData    = await new Promise(r => chrome.storage.local.get('sessionLocked', r));
    settings          = await SecureStorage.loadSettings();

    if (!initialized) {
      showView('setup');
    } else {
      showView('lock');
    }

    bindGlobalEvents();
    resetInactivityTimer();
  }

  // ── View management ───────────────────────────────────────────
  function showView(name) {
    currentView = name;
    Object.entries(views).forEach(([k, el]) => {
      el.hidden = k !== name;
    });
    if (name === 'lock') $('lock-password').focus();
    if (name === 'setup') $('setup-password').focus();
    if (name === 'vault') {
      renderAccounts();
      startTick();
      searchInput.focus();
    }
  }

  // ── Inactivity / auto-lock ────────────────────────────────────
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    const ms = (settings.autoLockMinutes || 5) * 60 * 1000;
    inactivityTimer = setTimeout(lock, ms);

    // Also schedule background alarm
    chrome.alarms.create('autoLock', { delayInMinutes: settings.autoLockMinutes || 5 });
  }

  function lock() {
    masterPassword = null;
    accounts       = [];
    stopTick();
    chrome.storage.local.set({ sessionLocked: true });
    showView('lock');
    toast('Vault locked', 'info');
  }

  // ── Authentication ────────────────────────────────────────────
  async function handleUnlock(e) {
    e.preventDefault();
    const pw    = $('lock-password').value;
    const btn   = $('lock-submit');
    if (!pw) return;

    setLoading(btn, true);
    try {
      const ok = await SecureStorage.unlock(pw);
      if (!ok) {
        shakeElement($('lock-card'));
        toast('Incorrect password', 'error');
        $('lock-password').value = '';
        $('lock-password').focus();
        return;
      }
      masterPassword = pw;
      accounts       = await SecureStorage.loadAccounts(pw);
      chrome.storage.local.set({ sessionLocked: false });
      chrome.alarms.clear('autoLock');
      showView('vault');
      resetInactivityTimer();
    } catch (err) {
      toast('Failed to unlock vault', 'error');
    } finally {
      setLoading(btn, false);
      $('lock-password').value = '';
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    const pw1 = $('setup-password').value;
    const pw2 = $('setup-confirm').value;
    const btn  = $('setup-submit');

    if (pw1.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    if (pw1 !== pw2)    { toast('Passwords do not match', 'error'); shakeElement($('setup-card')); return; }

    setLoading(btn, true);
    try {
      await SecureStorage.initVault(pw1);
      masterPassword = pw1;
      accounts       = [];
      toast('Vault created!', 'success');
      showView('vault');
    } catch (err) {
      toast('Failed to create vault', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  // ── Account rendering (DOM-only, no innerHTML on user data) ───
  function renderAccounts() {
    updateOverview();
    const filter  = searchQuery.toLowerCase();
    const visible = accounts.filter(a =>
      a.name.toLowerCase().includes(filter) ||
      (a.issuer || '').toLowerCase().includes(filter) ||
      (a.tags || []).some(t => t.toLowerCase().includes(filter))
    );

    // Keep scroll position
    const scrollTop = accountsList.scrollTop;

    // Diff rendering — reuse existing cards where possible
    const existing = [...accountsList.querySelectorAll('.account-card')];
    const existMap  = new Map(existing.map(el => [el.dataset.id, el]));
    const newIds    = new Set(visible.map(a => a.id));

    // Remove stale cards
    existing.forEach(el => { if (!newIds.has(el.dataset.id)) el.remove(); });

    // Show empty state
    const emptyEl = accountsList.querySelector('.empty-state');
    if (visible.length === 0) {
      if (!emptyEl) accountsList.appendChild(buildEmptyState(filter));
      return;
    }
    if (emptyEl) emptyEl.remove();

    // Insert/update cards in order
    visible.forEach((account, i) => {
      let card = existMap.get(account.id);
      if (!card) {
        card = buildCard(account);
        accountsList.appendChild(card);
      } else {
        updateCardCode(card, account);
      }
      // Ensure DOM order matches visible order
      const nthChild = accountsList.children[i];
      if (nthChild !== card) accountsList.insertBefore(card, nthChild || null);
    });

    accountsList.scrollTop = scrollTop;
  }

  function updateOverview() {
    if (overviewCount) overviewCount.textContent = String(accounts.length);
  }

  function buildCard(account) {
    const card = document.createElement('div');
    card.className    = 'account-card';
    card.dataset.id   = account.id;
    card.tabIndex     = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${account.name} — tap to copy`);

    // Avatar / initial
    const avatar = document.createElement('div');
    avatar.className = 'card-avatar';
    avatar.className = 'card-avatar ' + avatarColorClass(account.name);
    avatar.textContent = account.name.charAt(0).toUpperCase();

    // Info column
    const info = document.createElement('div');
    info.className = 'card-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = account.name;

    const issuerEl = document.createElement('div');
    issuerEl.className = 'card-issuer';
    issuerEl.textContent = account.issuer || '';

    // Tags
    const tagsEl = document.createElement('div');
    tagsEl.className = 'card-tags';
    (account.tags || []).forEach(tag => {
      const chip = document.createElement('span');
      chip.className   = 'tag-chip';
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });

    info.appendChild(nameEl);
    if (account.issuer) info.appendChild(issuerEl);
    if (account.tags?.length) info.appendChild(tagsEl);

    // Code + timer
    const right = document.createElement('div');
    right.className = 'card-right';

    const codeEl = document.createElement('div');
    codeEl.className = 'card-code';
    codeEl.dataset.role = 'code';

    const timerEl = document.createElement('div');
    timerEl.className = 'card-timer';
    timerEl.dataset.role = 'timer';

    const ringEl = buildRing();
    ringEl.dataset.role = 'ring';

    right.appendChild(ringEl);
    right.appendChild(codeEl);
    right.appendChild(timerEl);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const copyBtn   = makeActionBtn('copy-btn',   copyIcon(),   'Copy code',     () => copyCode(account.id));
    const editBtn   = makeActionBtn('edit-btn',   editIcon(),   'Edit account',  () => openEditModal(account.id));
    const deleteBtn = makeActionBtn('delete-btn', trashIcon(),  'Delete account',() => confirmDelete(account.id));

    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(right);
    card.appendChild(actions);

    // Click card = copy
    card.addEventListener('click', e => {
      if (e.target.closest('.card-actions')) return;
      copyCode(account.id);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') copyCode(account.id);
    });

    updateCardCode(card, account);
    return card;
  }

  function buildRing() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('class', 'timer-ring');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', '18'); bg.setAttribute('cy', '18'); bg.setAttribute('r', '15');
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#E5E7EB');
    bg.setAttribute('stroke-width', '2.5');
    const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fg.setAttribute('cx', '18'); fg.setAttribute('cy', '18'); fg.setAttribute('r', '15');
    fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', '#2563EB');
    fg.setAttribute('stroke-width', '2.5');
    fg.setAttribute('stroke-linecap', 'round');
    const circ = 2 * Math.PI * 15;
    fg.setAttribute('stroke-dasharray', circ);
    fg.setAttribute('transform', 'rotate(-90 18 18)');
    fg.dataset.role = 'ring-fg';
    svg.appendChild(bg);
    svg.appendChild(fg);
    return svg;
  }

  function updateCardCode(card, account) {
    const codeEl  = card.querySelector('[data-role="code"]');
    const timerEl = card.querySelector('[data-role="timer"]');
    const ringFg  = card.querySelector('[data-role="ring-fg"]');

    if (!account.code) { codeEl.textContent = '------'; return; }

    // Format code as "000 000"
    const raw = account.code;
    codeEl.textContent = raw.slice(0, 3) + ' ' + raw.slice(3);

    const pct  = totp.getProgress(account.timeStep || 30);
    const circ = 2 * Math.PI * 15;
    ringFg.setAttribute('stroke-dashoffset', circ * (1 - pct / 100));

    const remaining = account.timeLeft || 30;
    timerEl.textContent = `${remaining}s`;

    // Warn color when < 6s
    const isWarning = remaining <= 6;
    if (isWarning) {
      ringFg.setAttribute('stroke', '#EF4444');
      codeEl.classList.add('warning');
    } else {
      ringFg.setAttribute('stroke', '#2563EB');
      codeEl.classList.remove('warning');
    }
  }

  function buildEmptyState(filter) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = filter ? '🔍' : '🔐';
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = filter ? 'No matching accounts' : 'No accounts yet';
    const sub = document.createElement('p');
    sub.className = 'empty-sub';
    sub.textContent = filter ? 'Try a different search' : 'Click + Add to get started';
    div.appendChild(icon);
    div.appendChild(msg);
    div.appendChild(sub);
    return div;
  }

  function makeActionBtn(cls, svgContent, label, onClick) {
    const btn = document.createElement('button');
    btn.className = `action-btn ${cls}`;
    btn.setAttribute('aria-label', label);
    btn.appendChild(svgContent);
    btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return btn;
  }

  // ── Tick loop (1/sec) ─────────────────────────────────────────
  function startTick() {
    stopTick();
    tick(); // immediate
    tickInterval = setInterval(tick, 1000);
  }
  function stopTick() {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  }

  async function tick() {
    if (!masterPassword) { stopTick(); return; }
    const now = Date.now();
    await Promise.all(accounts.map(async a => {
      a.code     = await totp.generateTOTP(a.secret, { timeStep: a.timeStep || 30, digits: a.digits || 6, algorithm: a.algorithm || 'SHA-1' });
      a.timeLeft = totp.getTimeRemaining(a.timeStep || 30);
    }));
    // Update only visible cards
    accounts.forEach(a => {
      const card = accountsList.querySelector(`[data-id="${a.id}"]`);
      if (card) updateCardCode(card, a);
    });
    // Auto-copy: if a code just refreshed and autoCopy is on, copy the first visible one
    if (settings.autoCopy && accounts.length > 0) {
      const first = accounts.find(a => a.timeLeft === (a.timeStep || 30));
      if (first) silentCopy(first.code);
    }
  }

  // ── Clipboard ─────────────────────────────────────────────────
  async function copyCode(id) {
    const account = accounts.find(a => a.id === id);
    if (!account?.code) return;
    await silentCopy(account.code);
    toast(`${account.name} — code copied!`, 'success');
    // Visual flash on card
    const card = accountsList.querySelector(`[data-id="${id}"]`);
    if (card) { card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 600); }
    resetInactivityTimer();
  }

  async function silentCopy(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  // ── Add / Edit account ────────────────────────────────────────
  function openAddModal() {
    editingId = null;
    resetAccountForm();
    $('modal-title').textContent = 'Add Account';
    showModal('account-modal');
    $('acc-name').focus();
    resetInactivityTimer();
  }

  function openEditModal(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    editingId = id;
    $('acc-name').value   = account.name;
    $('acc-secret').value = account.secret;
    $('acc-issuer').value = account.issuer || '';
    $('acc-tags').value   = (account.tags || []).join(', ');
    $('modal-title').textContent = 'Edit Account';
    showModal('account-modal');
    $('acc-name').focus();
  }

  async function handleAccountSubmit(e) {
    e.preventDefault();
    const name    = $('acc-name').value.trim();
    const secret  = $('acc-secret').value.trim().replace(/\s/g, '').toUpperCase();
    const issuer  = $('acc-issuer').value.trim();
    const tagsRaw = $('acc-tags').value.trim();
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const btn     = $('acc-submit');

    if (!name)   { toast('Account name is required', 'error'); return; }
    if (!secret) { toast('Secret key is required', 'error'); return; }

    // Validate secret before attempting to generate code
    const validation = totp.validateSecret(secret);
    if (!validation.valid) {
      toast(`Invalid secret: ${validation.error}`, 'error');
      return;
    }

    setLoading(btn, true);
    try {
      const testCode = await totp.generateTOTP(secret);
      if (!testCode) throw new Error('Failed to generate TOTP code');

      if (editingId) {
        const idx = accounts.findIndex(a => a.id === editingId);
        if (idx >= 0) {
          accounts[idx] = { ...accounts[idx], name, secret, issuer, tags, updatedAt: Date.now() };
        }
        toast('Account updated', 'success');
      } else {
        accounts.push({
          id: crypto.randomUUID(),
          name, secret, issuer, tags,
          digits: 6, timeStep: 30, algorithm: 'SHA-1',
          addedAt: Date.now()
        });
        toast('Account added', 'success');
      }

      await SecureStorage.saveAccounts(accounts, masterPassword);
      closeAllModals();
      renderAccounts();
      tick();
    } catch (err) {
      console.error('Failed to add/update account:', err);
      const errorMsg = err.message || 'Unknown error';
      toast(`Invalid secret key: ${errorMsg}`, 'error');
    } finally {
      setLoading(btn, false);
    }
    resetInactivityTimer();
  }

  // ── Delete ────────────────────────────────────────────────────
  function confirmDelete(id) {
    accountToDelete = id;
    const account = accounts.find(a => a.id === id);
    $('delete-name').textContent = account?.name || 'this account';
    document.querySelector('#delete-modal .modal-title').textContent = 'Delete Account';
    showModal('delete-modal');
  }

  function handleForgotReset() {
    accountToDelete = 'vault';
    $('delete-name').textContent = 'your entire vault';
    document.querySelector('#delete-modal .modal-title').textContent = 'Reset Vault';
  const msgEl = document.querySelector('#delete-modal .delete-msg');
  msgEl.textContent = 'Delete your entire vault? PERMANENT - ALL DATA LOST FOREVER. No recovery possible.';
  const strong1 = document.createElement('strong');
  strong1.textContent = 'PERMANENT';
  const strong2 = document.createElement('strong');
  strong2.textContent = 'NO RECOVERY';
  msgEl.appendChild(strong1);
  msgEl.appendChild(document.createTextNode(' possible.'));
    showModal('delete-modal');
  }

  async function handleDeleteConfirm() {
    if (!accountToDelete) return;

    if (accountToDelete === 'vault') {
      await SecureStorage.wipeVault();
      chrome.storage.local.remove('sessionLocked');
      showView('setup');
      toast('Vault reset. All data permanently deleted.', 'warning');
      accountToDelete = null;
      closeAllModals();
      return;
    }

    accounts = accounts.filter(a => a.id !== accountToDelete);
    await SecureStorage.saveAccounts(accounts, masterPassword);
    accountToDelete = null;
    closeAllModals();
    renderAccounts();
    toast('Account deleted', 'success');
  }

  // ── Export / Import ───────────────────────────────────────────
  async function handleExport() {
    const pw = $('export-password').value;
    if (!pw) { toast('Enter an export password', 'error'); return; }
    try {
      const blob    = await SecureStorage.exportBackup(pw);
      const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(blob)}`;
      const a       = document.createElement('a');
      a.href     = dataUrl;
      a.download = `totp-backup-${new Date().toISOString().slice(0,10)}.enc`;
      a.click();
      toast('Backup exported!', 'success');
      closeAllModals();
    } catch (err) {
      toast('Export failed', 'error');
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const pw = $('import-password').value;
    if (!pw) { toast('Enter the backup password', 'error'); return; }
    try {
      const text = await file.text();
      await SecureStorage.importBackup(text, pw);
      // Re-unlock with master password after import
      const ok = await SecureStorage.unlock(masterPassword);
      if (ok) {
        accounts = await SecureStorage.loadAccounts(masterPassword);
        renderAccounts();
        tick();
      }
      toast('Backup imported!', 'success');
      closeAllModals();
    } catch (err) {
      toast('Import failed — wrong password?', 'error');
    }
    e.target.value = '';
  }

  // ── Settings ──────────────────────────────────────────────────
  function openSettings() {
    $('setting-autolock').value   = settings.autoLockMinutes || 5;
    $('setting-autocopy').checked = settings.autoCopy !== false;
    showModal('settings-modal');
    if (window.CADropdowns) window.CADropdowns.sync('setting-autolock');
    $('change-pw-btn').addEventListener('click', openChangePwModal);
  }

  async function handleSettingsSave() {
    settings.autoLockMinutes = parseInt($('setting-autolock').value, 10) || 5;
    settings.autoCopy        = $('setting-autocopy').checked;
    await SecureStorage.saveSettings(settings);
    toast('Settings saved', 'success');
    closeAllModals();
    resetInactivityTimer();
  }

  // ── Modal helpers ─────────────────────────────────────────────
  function showModal(id) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.hidden = true);
    $(id).hidden = false;
    $(id).querySelector('input, button')?.focus();
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.hidden = true);
    resetAccountForm();
    resetChangePwForm();
  }

  function resetChangePwForm() {
    $('old-pw').value = '';
    $('new-pw').value = '';
    $('confirm-pw').value = '';
  }

  function openChangePwModal() {
    resetChangePwForm();
    showModal('change-pw-modal');
    $('old-pw').focus();
    resetInactivityTimer();
  }

  async function handleChangePwSubmit(e) {
    e.preventDefault();
    const oldPw = $('old-pw').value;
    const newPw = $('new-pw').value;
    const confirmPw = $('confirm-pw').value;
    const btn = $('change-submit');

    if (!masterPassword) {
      toast('Must be unlocked to change password', 'error');
      return;
    }
    if (newPw.length < 8) {
      toast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      toast('New passwords do not match', 'error');
      shakeElement($('change-pw-modal'));
      return;
    }
    if (oldPw === newPw) {
      toast('New password is the same as current', 'warning');
      return;
    }

    setLoading(btn, true);
    try {
      // Verify old pw (already unlocked but double-check)
      const ok = await SecureStorage.unlock(oldPw);
      if (!ok) {
        toast('Current password incorrect', 'error');
        return;
      }

      await SecureStorage.changeMasterPassword(oldPw, newPw);
      masterPassword = newPw;
      toast('Master password changed successfully!', 'success');
      closeAllModals();
    } catch (err) {
      toast('Failed to change password', 'error');
    } finally {
      setLoading(btn, false);
    }
    resetInactivityTimer();
  }
  function resetAccountForm() {
    $('acc-name').value   = '';
    $('acc-secret').value = '';
    $('acc-issuer').value = '';
    $('acc-tags').value   = '';
    editingId = null;
  }

  // ── UI helpers ────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className   = `toast toast-${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function setLoading(btn, on) {
    btn.disabled     = on;
    btn.dataset.text = btn.dataset.text || btn.textContent;
    btn.textContent  = on ? 'Please wait…' : btn.dataset.text;
  }

  function shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  function avatarColorClass(name) {
    const classes = ['blue', 'purple', 'pink', 'orange', 'green', 'red', 'cyan'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return classes[Math.abs(hash) % classes.length];
  }

  // ── SVG icons (inline, CSP-safe) ─────────────────────────────
  function svgIcon(path, size = 16) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
  }
  const copyIcon  = () => svgIcon('M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z');
  const editIcon  = () => svgIcon('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z');
  const trashIcon = () => svgIcon('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6');

  // ── Keyboard navigation ───────────────────────────────────────
  function bindGlobalEvents() {
    // Lock screen
    $('lock-form').addEventListener('submit', handleUnlock);
    $('lock-toggle-pw').addEventListener('click', () => togglePasswordVisibility('lock-password', 'lock-toggle-pw'));
    $('reset-btn').addEventListener('click', handleForgotReset);

    // Setup screen
    $('setup-form').addEventListener('submit', handleSetup);

    // Vault toolbar
    $('add-account-btn').addEventListener('click', openAddModal);
    $('lock-btn').addEventListener('click', lock);
    $('settings-btn').addEventListener('click', openSettings);

    // Search
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderAccounts();
    });

    // Account modal
    $('account-form').addEventListener('submit', handleAccountSubmit);
    $('acc-toggle-pw').addEventListener('click', () => togglePasswordVisibility('acc-secret', 'acc-toggle-pw'));
    $('acc-cancel').addEventListener('click', closeAllModals);

    // Delete modal
    $('delete-confirm').addEventListener('click', handleDeleteConfirm);
    $('delete-cancel').addEventListener('click', closeAllModals);

    // Settings modal
    $('settings-save').addEventListener('click', handleSettingsSave);
    $('settings-cancel').addEventListener('click', closeAllModals);

    // Change PW modal
    $('change-pw-form').addEventListener('submit', handleChangePwSubmit);
    // Change PW toggles
    $('old-toggle').addEventListener('click', () => togglePasswordVisibility('old-pw', 'old-toggle'));
    $('new-toggle').addEventListener('click', () => togglePasswordVisibility('new-pw', 'new-toggle'));
    $('confirm-toggle').addEventListener('click', () => togglePasswordVisibility('confirm-pw', 'confirm-toggle'));
    $('change-cancel').addEventListener('click', closeAllModals);

    // Export/Import
    $('export-btn').addEventListener('click', handleExport);
    $('import-file').addEventListener('change', handleImport);
    $('import-trigger').addEventListener('click', () => {
      const pw = $('import-password').value;
      if (!pw) { toast('Enter the backup password first', 'error'); return; }
      $('import-file').click();
    });

    // CSP-safe close buttons (data-close="modal-id")
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = document.getElementById(btn.dataset.close);
        if (el) el.hidden = true;
      });
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeAllModals();
      });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllModals();
      if (currentView !== 'vault') return;
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault(); searchInput.focus();
      }
      if (e.key === 'n' && e.ctrlKey) { e.preventDefault(); openAddModal(); }
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); lock(); }
    });

    // Activity tracking for auto-lock reset
    ['click', 'keydown'].forEach(evt =>
      document.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
  }

  function togglePasswordVisibility(inputId, btnId) {
    const input = $(inputId);
    const btn   = $(btnId);
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type   = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  }

  // ── Start ─────────────────────────────────────────────────────
  init();

})();

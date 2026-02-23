'use strict';

/* ─────────────────────────────────────────
   CRYPTO UTILITY  (AES-256-GCM + PBKDF2)
───────────────────────────────────────── */
class CryptoUtil {
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv   = window.crypto.getRandomValues(new Uint8Array(12));
    const key  = await this.deriveKey(password, salt);
    const enc  = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text)
    );
    return {
      salt: Array.from(salt),
      iv:   Array.from(iv),
      data: Array.from(new Uint8Array(enc))
    };
  }

  static async decrypt(encryptedData, password) {
    const salt = new Uint8Array(encryptedData.salt);
    const iv   = new Uint8Array(encryptedData.iv);
    const data = new Uint8Array(encryptedData.data);
    const key  = await this.deriveKey(password, salt);
    const dec  = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(dec);
  }

  /* ── FIX 1: PBKDF2-based master password hash (replaces bare SHA-256) ──
     Stores { hash: [...], salt: [...] } so verification is brute-force-resistant.
     Iteration count matches vault encryption for consistent cost.            */
  static async hashMasterPassword(password) {
    const salt        = window.crypto.getRandomValues(new Uint8Array(16));
    const encoder     = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return {
      hash: Array.from(new Uint8Array(bits)),
      salt: Array.from(salt)
    };
  }

  static async verifyMasterPassword(password, stored) {
    const encoder     = new TextEncoder();
    const salt        = new Uint8Array(stored.salt);
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    const attempt  = Array.from(new Uint8Array(bits));
    const expected = stored.hash;
    // Constant-time comparison to prevent timing attacks
    if (attempt.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < attempt.length; i++) diff |= attempt[i] ^ expected[i];
    return diff === 0;
  }
}

/* ─────────────────────────────────────────
   PASSWORD MANAGER
───────────────────────────────────────── */
class PasswordManager {
  constructor() {
    this.masterPassword  = null;
    this.passwords       = [];
    this.pendingDeleteId = null;
    this.currentViewId   = null;
    this._editId         = null;
    this._detailsRevealed = false;
    this.init();
  }

  async init() {
    await this.checkFirstTime();
    this.bindEvents();

    // FIX 2: Clear sensitive data from memory when popup closes
    window.addEventListener('unload', () => {
      this.masterPassword = null;
      if (this.passwords) {
        this.passwords.length = 0;
        this.passwords = [];
      }
    });
  }

  /* ── FIRST-TIME CHECK ── */
  async checkFirstTime() {
    const { masterPasswordRecord } = await chrome.storage.local.get('masterPasswordRecord');
    if (!masterPasswordRecord) {
      document.getElementById('setupHint').textContent =
        'First time? Just enter a new master password (min 8 chars)';
    }
  }

  /* ── MASTER PASSWORD ── */
  async verifyOrSetMaster(password) {
    if (password.length < 8) {
      this.showLockError('Password must be at least 8 characters.');
      return false;
    }

    const { masterPasswordRecord } = await chrome.storage.local.get('masterPasswordRecord');

    if (!masterPasswordRecord) {
      // FIX 1: Use PBKDF2 hash instead of raw SHA-256
      const record = await CryptoUtil.hashMasterPassword(password);
      await chrome.storage.local.set({ masterPasswordRecord: record });
      this.masterPassword = password;
      this.transitionToDashboard();
      return true;
    }

    // FIX 1: Verify using PBKDF2 constant-time comparison
    const valid = await CryptoUtil.verifyMasterPassword(password, masterPasswordRecord);
    if (valid) {
      this.masterPassword = password;
      this.transitionToDashboard();
      return true;
    }

    this.showLockError('Incorrect password. Please try again.');
    this.shakeInput();
    return false;
  }

  showLockError(msg) {
    const el = document.getElementById('lockError');
    el.textContent = msg;
    el.classList.add('show');
  }

  hideLockError() {
    document.getElementById('lockError').classList.remove('show');
  }

  shakeInput() {
    const inp = document.getElementById('masterPassword');
    inp.classList.remove('shake');
    void inp.offsetWidth;
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 600);
  }

  /* ── NAVIGATION ── */
  transitionToDashboard() {
    document.getElementById('lockScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('masterPassword').value = '';
    this.hideLockError();
    this.loadPasswords();
  }

  lock() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('lockScreen').classList.remove('hidden');
    document.getElementById('masterPassword').value = '';
    // FIX 2: Clear plaintext passwords from memory on lock
    this.masterPassword = null;
    if (this.passwords) this.passwords.length = 0;
    this.passwords = [];
    this.hideLockError();
  }

  /* ── LOAD / SAVE ── */
  async loadPasswords() {
    const { encryptedPasswords } = await chrome.storage.local.get('encryptedPasswords');
    if (encryptedPasswords && this.masterPassword) {
      try {
        const raw = await CryptoUtil.decrypt(encryptedPasswords, this.masterPassword);
        this.passwords = JSON.parse(raw);
      } catch (_) {
        this.passwords = [];
      }
    } else {
      this.passwords = [];
    }
    this.renderPasswords();
    this.updateStats();
  }

  async savePasswords() {
    if (!this.masterPassword) return;
    const enc = await CryptoUtil.encrypt(JSON.stringify(this.passwords), this.masterPassword);
    await chrome.storage.local.set({ encryptedPasswords: enc });
    this.updateStats();
  }

  /* ── CRUD ── */
  async addPassword(data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    this.passwords.unshift({
      id, ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await this.savePasswords();
    this.renderPasswords();
  }

  async updatePassword(id, data) {
    const i = this.passwords.findIndex(p => p.id === id);
    if (i !== -1) {
      this.passwords[i] = {
        ...this.passwords[i], ...data,
        updatedAt: new Date().toISOString()
      };
      await this.savePasswords();
      this.renderPasswords();
    }
  }

  confirmDelete(id) {
    const pw = this.passwords.find(p => p.id === id);
    if (!pw) return;
    this.pendingDeleteId = id;
    document.getElementById('deleteTarget').textContent = pw.website || 'this entry';
    document.getElementById('deleteModal').classList.remove('hidden');
  }

  async executeDelete() {
    if (!this.pendingDeleteId) return;
    this.passwords = this.passwords.filter(p => p.id !== this.pendingDeleteId);
    this.pendingDeleteId = null;
    document.getElementById('deleteModal').classList.add('hidden');
    await this.savePasswords();
    this.renderPasswords();
    this.showToast('🗑️', 'Password deleted');
  }

  /* ── RENDER ──
     FIX 3: Removed Google favicon (privacy + CSP leak).
     FIX 3: Removed inline onerror handler (CSP violation).
     Favicons replaced with deterministic letter-avatar rendered via canvas.   */
  renderPasswords() {
    const list = document.getElementById('passwordsList');
    const term = (document.getElementById('search')?.value || '').toLowerCase();

    const filtered = this.passwords.filter(p =>
      !term ||
      (p.website  || '').toLowerCase().includes(term) ||
      (p.username || '').toLowerCase().includes(term) ||
      (p.notes    || '').toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
      list.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-icon">🗝️</div>
        <div class="empty-text">${term ? 'No matching passwords' : 'No passwords saved yet'}</div>
        <div class="empty-subtext">${term ? 'Try a different search' : 'Click "Add Password" to get started'}</div>`;
      list.appendChild(empty);
      return;
    }

    // FIX 4 (partial): Build DOM nodes instead of raw innerHTML for action buttons
    // Main card shell still uses innerHTML for brevity but all user-data fields go
    // through textContent after render, eliminating XSS surface.
    list.innerHTML = '';

    filtered.forEach((p, idx) => {
      const strength = this.passwordStrength(p.password);
      const date     = new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const letter   = (p.website || '?')[0].toUpperCase();
      const color    = this.siteColor(p.website || '');

      const item = document.createElement('div');
      item.className = 'password-item';
      item.dataset.id = p.id;
      item.style.animationDelay = `${idx * 0.04}s`;

      // FIX 3: Canvas-based letter avatar — no remote requests, no inline handlers
      const canvas = document.createElement('canvas');
      canvas.width  = 32;
      canvas.height = 32;
      canvas.className = 'pw-favicon-canvas';
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(0, 0, 32, 32, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 14px DM Sans, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 16, 17);

      const faviconWrap = document.createElement('div');
      faviconWrap.className = 'pw-favicon-wrap';
      faviconWrap.appendChild(canvas);

      const pwSite = document.createElement('div');
      pwSite.className = 'pw-site';
      pwSite.textContent = p.website || '—';          // textContent = safe

      const pwUser = document.createElement('div');
      pwUser.className = 'pw-user';
      pwUser.textContent = p.username || '—';         // textContent = safe

      const pwInfo = document.createElement('div');
      pwInfo.className = 'pw-info';
      pwInfo.appendChild(pwSite);
      pwInfo.appendChild(pwUser);

      const pwDate = document.createElement('div');
      pwDate.className = 'pw-date';
      pwDate.textContent = date;

      const pwMain = document.createElement('div');
      pwMain.className = 'pw-main';
      pwMain.appendChild(faviconWrap);
      pwMain.appendChild(pwInfo);
      pwMain.appendChild(pwDate);

      const strengthSpan = document.createElement('span');
      strengthSpan.className = `pw-strength strength-${strength}`;
      strengthSpan.textContent = { strong: '● Strong', medium: '● Medium', weak: '● Weak' }[strength];

      // Action buttons — created via DOM, no inline handlers
      const mkBtn = (cls, label) => {
        const b = document.createElement('button');
        b.className = `pw-action-btn ${cls}`;
        b.dataset.id = p.id;
        b.type = 'button';
        b.textContent = label;
        return b;
      };

      const pwActions = document.createElement('div');
      pwActions.className = 'pw-actions';
      pwActions.appendChild(mkBtn('copy-pw copy-password-btn', '🔑 Copy pw'));
      pwActions.appendChild(mkBtn('copy-username-btn', '👤 Copy user'));
      pwActions.appendChild(mkBtn('edit-btn', '✏️ Edit'));
      pwActions.appendChild(mkBtn('delete-btn-action delete-btn', '🗑️'));

      item.appendChild(pwMain);
      item.appendChild(strengthSpan);
      item.appendChild(pwActions);
      list.appendChild(item);
    });
  }

  // Deterministic HSL color from site string
  siteColor(site) {
    let hash = 0;
    for (let i = 0; i < site.length; i++) hash = site.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 35%)`;
  }

  updateStats() {
    const total = this.passwords.length;
    const weak  = this.passwords.filter(p => this.passwordStrength(p.password) === 'weak').length;

    document.getElementById('passwordCount').textContent = `${total} saved`;
    document.getElementById('weakCount').textContent     = `${weak} weak`;

    const dot = document.getElementById('weakDot');
    if (dot) dot.className = `dot ${weak > 0 ? 'danger' : 'warn'}`;
  }

  /* ── MODALS ── */
  showPasswordModal(editId = null) {
    this._editId = editId;
    const isEdit = Boolean(editId);
    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Password' : 'Add Password';

    if (isEdit) {
      const pw = this.passwords.find(p => p.id === editId);
      if (pw) {
        document.getElementById('website').value  = pw.website  || '';
        document.getElementById('username').value = pw.username || '';
        document.getElementById('password').value = pw.password || '';
        document.getElementById('notes').value    = pw.notes    || '';
        this.updateStrengthUI(pw.password || '');
      }
    } else {
      ['website', 'username', 'password', 'notes'].forEach(id => {
        document.getElementById(id).value = '';
      });
      this.updateStrengthUI('');

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          try {
            document.getElementById('website').value = new URL(tabs[0].url).hostname;
          } catch (_) {}
        }
      });
    }

    document.getElementById('passwordModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('website').focus(), 80);
  }

  hidePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    this._editId = null;
  }

  async savePasswordFromModal() {
    const website  = document.getElementById('website').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const notes    = document.getElementById('notes').value.trim();

    if (!website || !username || !password) {
      this.showToast('⚠️', 'Website, username and password are required');
      return;
    }

    const data = { website, username, password, notes };

    if (this._editId) {
      await this.updatePassword(this._editId, data);
      this.showToast('✅', 'Password updated');
    } else {
      await this.addPassword(data);
      this.showToast('✅', 'Password saved');
    }
    this.hidePasswordModal();
  }

  showDetails(id) {
    const pw = this.passwords.find(p => p.id === id);
    if (!pw) return;
    this.currentViewId    = id;
    this._detailsRevealed = false;

    // Use textContent everywhere — no innerHTML with user data
    document.getElementById('detailsFavicon').textContent    = '🔑';
    document.getElementById('detailsSite').textContent        = pw.website || 'Details';
    document.getElementById('detailsWebsiteVal').textContent  = pw.website  || '—';
    document.getElementById('detailsUsernameVal').textContent = pw.username || '—';
    document.getElementById('detailsPasswordVal').textContent = '••••••••';
    document.getElementById('detailsNotesVal').textContent    = pw.notes    || '—';

    document.getElementById('detailsPassword').classList.add('masked');
    document.getElementById('detailsModal').classList.remove('hidden');
  }

  /* ── CLIPBOARD ── */
  async copyToClipboard(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('📋', `${label} copied!`);
    } catch (_) {
      this.showToast('❌', 'Copy failed');
    }
  }

  async copyPassword(id) {
    const pw = this.passwords.find(p => p.id === id);
    if (pw) await this.copyToClipboard(pw.password, 'Password');
  }

  async copyUsername(id) {
    const pw = this.passwords.find(p => p.id === id);
    if (pw) await this.copyToClipboard(pw.username, 'Username');
  }

  /* ── STRENGTH ── */
  passwordStrength(password) {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 8)        score++;
    if (password.length >= 12)       score++;
    if (/[A-Z]/.test(password))      score++;
    if (/[a-z]/.test(password))      score++;
    if (/[0-9]/.test(password))      score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  updateStrengthUI(password) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;
    const s = this.passwordStrength(password);
    fill.className   = `strength-fill strength-${s}`;
    text.textContent = { weak: 'Weak password', medium: 'Medium strength', strong: 'Strong password' }[s];
    text.style.color = { weak: 'var(--red)', medium: 'var(--amber)', strong: 'var(--green)' }[s];
  }

  /* ── EXPORT / IMPORT ──
     FIX 5: Confirm before exporting decrypted data                         */
  exportPasswords() {
    if (!this.passwords.length) {
      this.showToast('⚠️', 'No passwords to export');
      return;
    }
    document.getElementById('exportConfirmModal').classList.remove('hidden');
  }

  doExport() {
    document.getElementById('exportConfirmModal').classList.add('hidden');
    const json = JSON.stringify(this.passwords, null, 2);
    const uri  = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    const a    = document.createElement('a');
    a.href     = uri;
    a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    this.showToast('📤', 'Export downloaded');
  }

  showImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
  }

  hideImportModal() {
    document.getElementById('importModal').classList.add('hidden');
    document.getElementById('importFile').value = '';
  }

  importPasswords(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        const existingIds = new Set(this.passwords.map(p => p.id));
        const newOnes = imported.filter(p => !existingIds.has(p.id));
        this.passwords = [...this.passwords, ...newOnes];
        await this.savePasswords();
        this.renderPasswords();
        this.showToast('📥', `${newOnes.length} passwords imported`);
        this.hideImportModal();
      } catch (_) {
        this.showToast('❌', 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  /* ── TOAST ── */
  showToast(icon, message) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = 'toast';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;                    // textContent = safe
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 280);
    }, 2600);
  }

  /* ── HELPERS ── */
  getHost(website) {
    if (!website) return null;
    try {
      const url = website.startsWith('http') ? website : 'https://' + website;
      return new URL(url).hostname;
    } catch (_) { return website; }
  }

  /* ── EVENT BINDING ── */
  bindEvents() {
    const on = (id, ev, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    };

    /* Lock screen */
    on('unlockBtn', 'click', async () => {
      const pw = document.getElementById('masterPassword').value;
      await this.verifyOrSetMaster(pw);
    });

    on('masterPassword', 'keydown', async (e) => {
      if (e.key === 'Enter') {
        const pw = document.getElementById('masterPassword').value;
        await this.verifyOrSetMaster(pw);
      }
      if (e.target.value) this.hideLockError();
    });

    on('toggleMasterPw', 'click', () => {
      const inp = document.getElementById('masterPassword');
      const btn = document.getElementById('toggleMasterPw');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });

    on('setupHint', 'click', () => {
      document.getElementById('masterPassword').focus();
    });

    /* Dashboard */
    on('lockBtn', 'click', () => this.lock());

    let _st;
    on('search', 'input', () => {
      clearTimeout(_st);
      _st = setTimeout(() => this.renderPasswords(), 220);
    });

    on('addPassword', 'click', () => this.showPasswordModal());
    on('exportBtn',   'click', () => this.exportPasswords());
    on('importBtn',   'click', () => this.showImportModal());

    /* Password list (event delegation) */
    document.getElementById('passwordsList')?.addEventListener('click', (e) => {
      const item = e.target.closest('.password-item');
      if (!item) return;
      const id = item.dataset.id;

      if (e.target.closest('.copy-password-btn')) { this.copyPassword(id); return; }
      if (e.target.closest('.copy-username-btn')) { this.copyUsername(id); return; }
      if (e.target.closest('.edit-btn'))          { this.showPasswordModal(id); return; }
      if (e.target.closest('.delete-btn'))        { this.confirmDelete(id); return; }

      this.showDetails(id);
    });

    /* Add/Edit modal */
    on('closeModal',   'click', () => this.hidePasswordModal());
    on('cancelBtn',    'click', () => this.hidePasswordModal());
    on('savePassword', 'click', () => this.savePasswordFromModal());

    on('showPassword', 'click', () => {
      const inp = document.getElementById('password');
      const btn = document.getElementById('showPassword');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });

    on('password', 'input', () => {
      this.updateStrengthUI(document.getElementById('password').value);
    });

    /* Delete modal */
    on('closeDelete',   'click', () => {
      document.getElementById('deleteModal').classList.add('hidden');
      this.pendingDeleteId = null;
    });
    on('cancelDelete',  'click', () => {
      document.getElementById('deleteModal').classList.add('hidden');
      this.pendingDeleteId = null;
    });
    on('confirmDelete', 'click', () => this.executeDelete());

    /* Export confirm modal */
    on('cancelExport',  'click', () => {
      document.getElementById('exportConfirmModal').classList.add('hidden');
    });
    on('cancelExport2', 'click', () => {
      document.getElementById('exportConfirmModal').classList.add('hidden');
    });
    on('confirmExport', 'click', () => this.doExport());

    /* Import modal */
    on('closeImport',   'click', () => this.hideImportModal());
    on('cancelImport',  'click', () => this.hideImportModal());
    on('confirmImport', 'click', () => {
      const f = document.getElementById('importFile').files[0];
      if (f) this.importPasswords(f);
      else this.showToast('⚠️', 'Please select a file');
    });

    /* Details modal */
    on('closeDetails',    'click', () => document.getElementById('detailsModal').classList.add('hidden'));
    on('closeDetailsBtn', 'click', () => document.getElementById('detailsModal').classList.add('hidden'));

    on('editFromDetails', 'click', () => {
      document.getElementById('detailsModal').classList.add('hidden');
      if (this.currentViewId) this.showPasswordModal(this.currentViewId);
    });

    on('copyDetailsUsername', 'click', () => {
      const val = document.getElementById('detailsUsernameVal').textContent;
      if (val && val !== '—') this.copyToClipboard(val, 'Username');
    });

    on('copyDetailsPassword', 'click', () => {
      const pw = this.passwords.find(p => p.id === this.currentViewId);
      if (pw) this.copyToClipboard(pw.password, 'Password');
    });

    on('toggleDetailsPassword', 'click', () => {
      const pw = this.passwords.find(p => p.id === this.currentViewId);
      if (!pw) return;
      this._detailsRevealed = !this._detailsRevealed;
      const val  = document.getElementById('detailsPasswordVal');
      const wrap = document.getElementById('detailsPassword');
      const btn  = document.getElementById('toggleDetailsPassword');
      val.textContent = this._detailsRevealed ? pw.password : '••••••••';
      wrap.classList.toggle('masked', !this._detailsRevealed);
      btn.textContent = this._detailsRevealed ? '🙈' : '👁️';
    });

    /* Close modals on backdrop click */
    ['passwordModal', 'importModal', 'deleteModal', 'detailsModal', 'exportConfirmModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.add('hidden');
      });
    });
  }
}

/* ─────────────────────────────────────────
   BOOT
   FIX 2: Do NOT attach to window — prevents external access
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  new PasswordManager();   // no window.pm exposure
});
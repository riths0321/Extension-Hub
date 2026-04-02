'use strict';

/* ═══════════════════════════════════════════════════════════
   CRYPTO UTILITY  (AES-256-GCM + PBKDF2)
═══════════════════════════════════════════════════════════ */
class CryptoUtil {
  static async deriveKey(password, salt) {
    const km = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await this.deriveKey(password, salt);
    const enc  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)
    );
    return { salt: [...salt], iv: [...iv], data: [...new Uint8Array(enc)] };
  }

  static async decrypt(obj, password) {
    const key = await this.deriveKey(password, new Uint8Array(obj.salt));
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(obj.iv) },
      key, new Uint8Array(obj.data)
    );
    return new TextDecoder().decode(dec);
  }

  static async hashMasterPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const km   = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256
    );
    return { hash: [...new Uint8Array(bits)], salt: [...salt] };
  }

  static async verifyMasterPassword(password, stored) {
    const km = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits    = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(stored.salt), iterations: 100000, hash: 'SHA-256' }, km, 256
    );
    const attempt = [...new Uint8Array(bits)];
    if (attempt.length !== stored.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < attempt.length; i++) diff |= attempt[i] ^ stored.hash[i];
    return diff === 0;
  }

  /* SHA-1 for HIBP k-anonymity (first 5 hex chars only) */
  static async sha1Hex(text) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
}

/* ═══════════════════════════════════════════════════════════
   PASSWORD GENERATOR  (crypto-secure)
═══════════════════════════════════════════════════════════ */
class PasswordGenerator {
  static UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  static LOWER   = 'abcdefghijklmnopqrstuvwxyz';
  static DIGITS  = '0123456789';
  static SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  static AMBIGUOUS = /[0O1lI]/g;

  /* Wordlist — 200 common memorable words */
  static WORDS = [
    'apple','brave','cloud','delta','eagle','flame','grace','honey','ivory','jolly',
    'kings','lemon','maple','noble','ocean','piano','quiet','river','solar','tiger',
    'ultra','vivid','water','xenon','yacht','zebra','amber','blast','crisp','dusty',
    'ember','frost','globe','haven','indie','jewel','karma','lunar','magic','north',
    'orbit','pasta','quill','ridge','storm','tulip','unity','valid','wrist','xerox',
    'young','zonal','algae','boost','coral','drift','exist','flick','groan','hydra',
    'index','joint','knack','lotus','moose','ninja','onion','prime','quest','rocky',
    'scout','titan','umbra','viola','witch','xenon','yield','zippy','agile','blend',
    'cedar','dense','elope','fjord','giant','hover','irony','jelly','kiosk','light',
    'melon','nerve','oxide','prism','quirk','rainy','snowy','torch','urban','venom',
    'wheat','xylem','yelps','zesty','azure','berry','cyber','disco','event','flora',
    'glyph','hinge','input','jumbo','kneel','lyric','motor','nudge','olive','panda',
    'quaff','rebel','skunk','timid','utmost','vivid','windy','exact','yodel','zilch',
    'atlas','bloom','crimp','dozen','elbow','finch','gulch','hippo','ideal','japan',
    'knave','llama','mirth','notch','oaken','plumb','queen','rhino','sugar','twirl',
    'ulcer','viper','whelp','xebec','yucky','zooms','arrow','bison','cloak','depot',
    'epoch','funky','grove','haiku','intro','joust','knobs','llano','mixer','nadir',
    'optic','plaid','quota','rusty','strap','tango','unite','voila','waltz','xeric',
    'yearn','zonal','abyss','brunt','crisp','dunce','extra','flair','grime','humid'
  ];

  static generatePassword(opts) {
    const { length=16, upper=true, lower=true, numbers=true, symbols=true, noAmbiguous=false } = opts;
    let pool = '';
    if (upper)   pool += this.UPPER;
    if (lower)   pool += this.LOWER;
    if (numbers) pool += this.DIGITS;
    if (symbols) pool += this.SYMBOLS;
    if (!pool)   return '';
    if (noAmbiguous) pool = pool.replace(this.AMBIGUOUS, '');

    /* Guarantee at least one char from each required set */
    const required = [];
    if (upper)   required.push(this._pick(noAmbiguous ? this.UPPER.replace(this.AMBIGUOUS,'') : this.UPPER));
    if (lower)   required.push(this._pick(noAmbiguous ? this.LOWER.replace(this.AMBIGUOUS,'') : this.LOWER));
    if (numbers) required.push(this._pick(noAmbiguous ? this.DIGITS.replace(this.AMBIGUOUS,'') : this.DIGITS));
    if (symbols) required.push(this._pick(this.SYMBOLS));

    let pw = required.join('');
    for (let i = pw.length; i < length; i++) pw += this._pick(pool);
    return this._shuffle(pw);
  }

  static generatePassphrase(opts) {
    const { wordCount=4, separator='-', capitalize=true, addNumber=true } = opts;
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      let w = this.WORDS[this._randInt(this.WORDS.length)];
      if (capitalize) w = w[0].toUpperCase() + w.slice(1);
      words.push(w);
    }
    let phrase = words.join(separator);
    if (addNumber) phrase += separator + this._randInt(100);
    return phrase;
  }

  static entropy(password) {
    const pool = this._poolSize(password);
    return pool > 0 ? Math.round(password.length * Math.log2(pool)) : 0;
  }

  static _poolSize(pw) {
    let p = 0;
    if (/[A-Z]/.test(pw)) p += 26;
    if (/[a-z]/.test(pw)) p += 26;
    if (/[0-9]/.test(pw)) p += 10;
    if (/[^A-Za-z0-9]/.test(pw)) p += 32;
    return p;
  }

  static _pick(pool) {
    return pool[this._randInt(pool.length)];
  }

  static _randInt(max) {
    const arr = new Uint32Array(1);
    let val;
    do { crypto.getRandomValues(arr); val = arr[0]; } while (val >= Math.floor(4294967296 / max) * max);
    return val % max;
  }

  static _shuffle(str) {
    const arr = [...str];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this._randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }
}

/* ═══════════════════════════════════════════════════════════
   BREACH CHECKER  (HaveIBeenPwned k-anonymity)
═══════════════════════════════════════════════════════════ */
class BreachChecker {
  static async check(password) {
    const hash   = await CryptoUtil.sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res    = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });
    if (!res.ok) throw new Error('HIBP request failed');
    const text  = await res.text();
    const lines = text.split('\r\n');
    for (const line of lines) {
      const [s, count] = line.split(':');
      if (s === suffix) return parseInt(count, 10);
    }
    return 0;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN APPLICATION
═══════════════════════════════════════════════════════════ */
class App {
  constructor() {
    this.masterPassword    = null;
    this.passwords         = [];
    this.pendingDeleteId   = null;
    this.currentViewId     = null;
    this._editId           = null;
    this._detailsRevealed  = false;
    this._genPassword      = '';
    this._genHistory       = [];
    this._breachResults    = {};
    this._activeTag        = '';
    this._clipTimer        = null;
    this._clipCountdown    = null;
    this._theme            = 'dark';
    this.init();
  }

  async init() {
    this._theme = (await this._storage('theme')) || 'dark';
    document.documentElement.setAttribute('data-theme', this._theme);
    this._updateThemeBtn();

    await this._checkFirstTime();
    this._bindEvents();
    this._bindGeneratorEvents();
    this._loadGenHistory();

    window.addEventListener('unload', () => {
      this.masterPassword = null;
      this.passwords = [];
    });
  }

  /* ─── Storage helpers ─────────────────────────────── */
  async _storage(key, value) {
    if (value === undefined) {
      const r = await chrome.storage.local.get(key);
      return r[key] ?? null;
    }
    await chrome.storage.local.set({ [key]: value });
  }

  _iconEl(name, extraClass = '') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const fillClass = name.endsWith('-fill') ? 'icon-fill' : '';
    svg.setAttribute('class', `icon ${fillClass} ${extraClass}`.trim().replace(/\s+/g, ' '));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `icons/ui-sprite.svg#${name}`);
    svg.appendChild(use);
    return svg;
  }

  _replaceIcon(el, name, extraClass = '') {
    if (!el) return;
    el.replaceChildren(this._iconEl(name, extraClass));
  }

  _setButtonLabel(btn, iconName, label) {
    if (!btn) return;
    btn.innerHTML = '';
    btn.appendChild(this._iconEl(iconName, 'icon-sm'));
    const span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);
  }

  /* ─── First-time ─────────────────────────────────── */
  async _checkFirstTime() {
    const rec = await this._storage('masterPasswordRecord');
    if (!rec) {
      document.getElementById('setupHint').textContent =
        'First time? Just enter a new master password (min 8 chars)';
    }
  }

  /* ─── Theme ──────────────────────────────────────── */
  _updateThemeBtn() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) this._replaceIcon(btn, this._theme === 'dark' ? 'sun' : 'moon');
  }

  _toggleTheme() {
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this._theme);
    this._storage('theme', this._theme);
    this._updateThemeBtn();
  }

  /* ─── Master password ────────────────────────────── */
  async _verifyOrSetMaster(password) {
    if (password.length < 8) { this._showLockError('Password must be at least 8 characters.'); return false; }
    const rec = await this._storage('masterPasswordRecord');
    if (!rec) {
      const record = await CryptoUtil.hashMasterPassword(password);
      await this._storage('masterPasswordRecord', record);
      this.masterPassword = password;
      this._toDashboard();
      return true;
    }
    const valid = await CryptoUtil.verifyMasterPassword(password, rec);
    if (valid) { this.masterPassword = password; this._toDashboard(); return true; }
    this._showLockError('Incorrect password. Please try again.');
    this._shakeInput();
    return false;
  }

  _showLockError(msg) {
    const el = document.getElementById('lockError');
    el.textContent = msg; el.classList.add('show');
  }
  _hideLockError() { document.getElementById('lockError').classList.remove('show'); }
  _shakeInput() {
    const inp = document.getElementById('masterPassword');
    inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 600);
  }

  /* ─── Navigation ─────────────────────────────────── */
  _toDashboard() {
    document.getElementById('lockScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('masterPassword').value = '';
    this._hideLockError();
    this._loadPasswords();
    this._switchTab('vault');
  }

  _lock() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('lockScreen').classList.remove('hidden');
    document.getElementById('masterPassword').value = '';
    this.masterPassword = null;
    this.passwords = [];
    this._hideLockError();
  }

  /* ─── Reset vault (forgot master) ───────────────── */
  _showResetModal() {
    const input = document.getElementById('resetConfirmInput');
    const check = document.getElementById('resetConfirmCheck');
    const btn   = document.getElementById('confirmReset');
    if (input) input.value = '';
    if (check) check.checked = false;
    if (btn) btn.disabled = true;
    document.getElementById('resetModal')?.classList.remove('hidden');
    input?.focus();
  }

  _hideResetModal() { document.getElementById('resetModal')?.classList.add('hidden'); }

  async _resetVault() {
    await chrome.storage.local.remove(['masterPasswordRecord', 'encryptedPasswords']);
    this.masterPassword = null;
    this.passwords = [];
    this.currentViewId = null;
    this._detailsRevealed = false;
    await this._checkFirstTime();
    this._lock();
    this._toast('refresh', 'Vault reset');
  }

  /* ─── Tab switching ──────────────────────────────── */
  _switchTab(name) {
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === name)
    );
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('hidden', p.id !== `tab-${name}`)
    );
    if (name === 'health') this._renderHealth();
  }

  /* ─── Load / save passwords ──────────────────────── */
  async _loadPasswords() {
    const enc = await this._storage('encryptedPasswords');
    if (enc && this.masterPassword) {
      try { this.passwords = JSON.parse(await CryptoUtil.decrypt(enc, this.masterPassword)); }
      catch (_) { this.passwords = []; }
    } else { this.passwords = []; }
    this._renderPasswords();
    this._updateStats();
    this._buildTagFilters();
  }

  async _savePasswords() {
    if (!this.masterPassword) return;
    const enc = await CryptoUtil.encrypt(JSON.stringify(this.passwords), this.masterPassword);
    await this._storage('encryptedPasswords', enc);
    this._updateStats();
  }

  /* ─── CRUD ───────────────────────────────────────── */
  async _addPassword(data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    this.passwords.unshift({ id, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await this._savePasswords(); this._renderPasswords(); this._buildTagFilters();
  }

  async _updatePassword(id, data) {
    const i = this.passwords.findIndex(p => p.id === id);
    if (i !== -1) {
      this.passwords[i] = { ...this.passwords[i], ...data, updatedAt: new Date().toISOString() };
      await this._savePasswords(); this._renderPasswords(); this._buildTagFilters();
    }
  }

  _confirmDelete(id) {
    const pw = this.passwords.find(p => p.id === id); if (!pw) return;
    this.pendingDeleteId = id;
    document.getElementById('deleteTarget').textContent = pw.website || 'this entry';
    document.getElementById('deleteModal').classList.remove('hidden');
  }

  async _executeDelete() {
    if (!this.pendingDeleteId) return;
    this.passwords = this.passwords.filter(p => p.id !== this.pendingDeleteId);
    this.pendingDeleteId = null;
    document.getElementById('deleteModal').classList.add('hidden');
    await this._savePasswords(); this._renderPasswords(); this._buildTagFilters();
    this._toast('trash', 'Password deleted');
  }

  /* ─── Strength ───────────────────────────────────── */
  _strength(pw) {
    if (!pw) return 'weak';
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (pw.length >= 16) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 3) return 'weak';
    if (s <= 5) return 'medium';
    return 'strong';
  }

  _updateStrengthUI(pw) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;
    const s = this._strength(pw);
    fill.className = `strength-fill strength-${s}`;
    text.className = `strength-text strength-text-${s}`;
    text.textContent = { weak:'Weak password', medium:'Medium strength', strong:'Strong password' }[s];
  }

  /* ─── Duplicate detection ────────────────────────── */
  _getReusedIds() {
    const seen = {};
    this.passwords.forEach(p => {
      if (!seen[p.password]) seen[p.password] = [];
      seen[p.password].push(p.id);
    });
    const reused = new Set();
    Object.values(seen).forEach(ids => { if (ids.length > 1) ids.forEach(id => reused.add(id)); });
    return reused;
  }

  /* ─── Age check ──────────────────────────────────── */
  _ageWarning(updatedAt) {
    if (!updatedAt) return false;
    const days = (Date.now() - new Date(updatedAt).getTime()) / 86400000;
    return days > 90;
  }

  /* ─── Stats ──────────────────────────────────────── */
  _updateStats() {
    const total   = this.passwords.length;
    const weak    = this.passwords.filter(p => this._strength(p.password) === 'weak').length;
    const reused  = this._getReusedIds().size;
    document.getElementById('passwordCount').textContent = `${total} saved`;
    document.getElementById('weakCount').textContent     = `${weak} weak`;
    document.getElementById('weakDot').className         = `dot ${weak > 0 ? 'danger' : 'warn'}`;
    const dupChip = document.getElementById('dupChip');
    dupChip.classList.toggle('hidden', reused === 0);
    document.getElementById('dupCount').textContent = `${reused} reused`;
  }

  /* ─── Tag filters ────────────────────────────────── */
  _buildTagFilters() {
    const tags = [...new Set(this.passwords.map(p => p.tag).filter(Boolean))];
    const row = document.getElementById('tagFilterRow');
    row.innerHTML = '';
    const all = document.createElement('button');
    all.className = `tag-filter${this._activeTag === '' ? ' active' : ''}`;
    all.dataset.tag = ''; all.textContent = 'All';
    all.addEventListener('click', () => { this._activeTag = ''; this._buildTagFilters(); this._renderPasswords(); });
    row.appendChild(all);
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = `tag-filter${this._activeTag === tag ? ' active' : ''}`;
      btn.dataset.tag = tag; btn.textContent = tag;
      btn.addEventListener('click', () => { this._activeTag = tag; this._buildTagFilters(); this._renderPasswords(); });
      row.appendChild(btn);
    });
  }

  /* ─── Render password list ───────────────────────── */
  _renderPasswords() {
    const list   = document.getElementById('passwordsList');
    const term   = (document.getElementById('search')?.value || '').toLowerCase();
    const reused = this._getReusedIds();

    const filtered = this.passwords.filter(p => {
      const tagOk = !this._activeTag || p.tag === this._activeTag;
      const termOk = !term ||
        (p.website  || '').toLowerCase().includes(term) ||
        (p.username || '').toLowerCase().includes(term) ||
        (p.notes    || '').toLowerCase().includes(term) ||
        (p.tag      || '').toLowerCase().includes(term);
      return tagOk && termOk;
    });

    if (!filtered.length) {
      list.innerHTML = '';
      const e = document.createElement('div'); e.className = 'empty-state';
      const icon = document.createElement('div'); icon.className = 'empty-icon';
      icon.appendChild(this._iconEl('key', 'icon-lg'));
      const text = document.createElement('div'); text.className = 'empty-text';
      text.textContent = term ? 'No matching passwords' : 'No passwords saved yet';
      const sub = document.createElement('div'); sub.className = 'empty-subtext';
      sub.textContent = term ? 'Try a different search' : 'Click "Add Password" to get started';
      e.appendChild(icon); e.appendChild(text); e.appendChild(sub);
      list.appendChild(e); return;
    }

    list.innerHTML = '';
    const now = Date.now();

    filtered.forEach((p, idx) => {
      const s      = this._strength(p.password);
      const date   = new Date(p.updatedAt).toLocaleDateString(undefined, { month:'short', day:'numeric' });
      const letter = (p.website || '?')[0].toUpperCase();
      const color  = this._siteColor(p.website || '');
      const isReused = reused.has(p.id);
      const isOld    = this._ageWarning(p.updatedAt);
      const breach   = this._breachResults[p.id];
      const isFav    = p.favourite;

      const item = document.createElement('div');
      item.className = 'password-item';
      item.dataset.id = p.id;
      item.classList.add(`stagger-${Math.min(idx + 1, 12)}`);

      /* Canvas avatar */
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32; canvas.className = 'pw-favicon-canvas';
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(0,0,32,32,8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 14px Manrope,system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, 16, 17);

      const favWrap = document.createElement('div'); favWrap.className = 'pw-favicon-wrap';
      favWrap.appendChild(canvas);

      const site = document.createElement('div'); site.className = 'pw-site'; site.textContent = p.website || '—';
      const user = document.createElement('div'); user.className = 'pw-user'; user.textContent = p.username || '—';
      const info = document.createElement('div'); info.className = 'pw-info'; info.appendChild(site); info.appendChild(user);
      const dateEl = document.createElement('div'); dateEl.className = 'pw-date'; dateEl.textContent = date;

      const main = document.createElement('div'); main.className = 'pw-main';
      main.appendChild(favWrap); main.appendChild(info); main.appendChild(dateEl);

      /* Meta row: strength + badges */
      const meta = document.createElement('div'); meta.className = 'pw-meta';
      const sEl  = document.createElement('span'); sEl.className = `pw-strength strength-${s}`;
      sEl.textContent = { strong:'Strong', medium:'Medium', weak:'Weak' }[s];
      meta.appendChild(sEl);

      if (isFav) {
        const f = document.createElement('span');
        f.className = 'pw-badge-fav';
        f.appendChild(this._iconEl('star-fill', 'icon-sm'));
        meta.appendChild(f);
      }
      if (p.tag) { const t = document.createElement('span'); t.className='pw-tag-badge'; t.textContent=p.tag; meta.appendChild(t); }
      if (isReused) {
        const r = document.createElement('span'); r.className='pw-badge-reused';
        r.appendChild(this._iconEl('alert', 'icon-sm')); r.appendChild(document.createTextNode(' Reused'));
        meta.appendChild(r);
      }
      if (isOld) {
        const o = document.createElement('span'); o.className='pw-badge-old';
        o.appendChild(this._iconEl('clock', 'icon-sm')); o.appendChild(document.createTextNode(' Old'));
        meta.appendChild(o);
      }
      if (breach > 0) {
        const b = document.createElement('span'); b.className='pw-badge-breach';
        b.appendChild(this._iconEl('alert', 'icon-sm')); b.appendChild(document.createTextNode(` Breached x${breach}`));
        meta.appendChild(b);
      }

      /* Action buttons */
      const mkBtn = (cls, iconName, label, ariaLabel = '') => {
        const b = document.createElement('button');
        b.className = `pw-action-btn ${cls}`; b.dataset.id = p.id; b.type = 'button';
        b.appendChild(this._iconEl(iconName, 'icon-sm'));
        if (label) {
          const span = document.createElement('span'); span.textContent = label; b.appendChild(span);
        }
        if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
        return b;
      };
      const acts = document.createElement('div'); acts.className = 'pw-actions';
      acts.appendChild(mkBtn('copy-pw copy-password-btn', 'key', 'Copy pw', 'Copy password'));
      acts.appendChild(mkBtn('copy-username-btn', 'user', 'Copy user', 'Copy username'));
      acts.appendChild(mkBtn('edit-btn', 'pencil', 'Edit', 'Edit entry'));
      const favBtn = mkBtn(`fav-btn${isFav ? ' active' : ''}`, isFav ? 'star-fill' : 'star', '', 'Toggle favorite');
      acts.appendChild(favBtn);
      acts.appendChild(mkBtn('delete-btn-action delete-btn', 'trash', '', 'Delete entry'));

      item.appendChild(main); item.appendChild(meta); item.appendChild(acts);
      list.appendChild(item);
    });
  }

  _siteColor(site) {
    let h = 0;
    for (let i = 0; i < site.length; i++) h = site.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360},50%,32%)`;
  }

  /* ─── Health tab ─────────────────────────────────── */
  _renderHealth() {
    const total  = this.passwords.length;
    const weak   = this.passwords.filter(p => this._strength(p.password) === 'weak').length;
    const reused = this._getReusedIds().size;
    const old    = this.passwords.filter(p => this._ageWarning(p.updatedAt)).length;
    const breached = Object.values(this._breachResults).filter(n => n > 0).length;

    let score = 100;
    if (total > 0) {
      score -= Math.round((weak   / total) * 40);
      score -= Math.round((reused / total) * 30);
      score -= Math.round((old    / total) * 20);
      score -= Math.round((breached / total) * 10);
      score = Math.max(0, score);
    }

    document.getElementById('hcTotal').textContent   = total;
    document.getElementById('hcWeak').textContent    = weak;
    document.getElementById('hcReused').textContent  = reused;
    document.getElementById('hcOld').textContent     = old;
    document.getElementById('hcBreach').textContent  = Object.keys(this._breachResults).length ? breached : '—';
    document.getElementById('hcScore').textContent   = total ? `${score}%` : '—';

    const hcScore = document.getElementById('hc-score');
    hcScore.className = `health-card ${score >= 80 ? 'ok' : score >= 50 ? 'info' : 'danger'}`;

    /* Issue list */
    const issues = document.getElementById('healthIssues');
    issues.innerHTML = '';
    const reusedIds = this._getReusedIds();
    let count = 0;

    this.passwords.forEach(p => {
      const s = this._strength(p.password);
      const isOld     = this._ageWarning(p.updatedAt);
      const isReused  = reusedIds.has(p.id);
      const isBreached = (this._breachResults[p.id] || 0) > 0;

      const msgs = [];
      if (isBreached) msgs.push({ cls:'issue-breach', icon:'alert', desc:`Found in ${this._breachResults[p.id]} breach${this._breachResults[p.id]===1?'':'es'}` });
      if (s === 'weak') msgs.push({ cls:'issue-weak', icon:'alert', desc:'Weak password' });
      if (isReused)     msgs.push({ cls:'issue-reused', icon:'alert', desc:'Password reused on another site' });
      if (isOld)        msgs.push({ cls:'issue-old', icon:'clock', desc:'Not changed in 90+ days' });

      msgs.forEach(m => {
        const item = document.createElement('div');
        item.className = `issue-item ${m.cls}`;
        item.dataset.id = p.id;
        item.innerHTML = `<span class="issue-icon">${this._iconEl(m.icon, 'icon-sm').outerHTML}</span><div class="issue-body"><div class="issue-site">${this._safe(p.website||'—')}</div><div class="issue-desc">${m.desc}</div></div>`;
        item.addEventListener('click', () => {
          this._switchTab('vault');
          setTimeout(() => this._showDetails(p.id), 100);
        });
        issues.appendChild(item);
        count++;
      });
    });

    if (!count) {
      issues.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'health-empty';
      empty.appendChild(this._iconEl('check', 'icon-sm'));
      const span = document.createElement('span');
      span.textContent = 'No issues found. Your vault looks healthy.';
      empty.appendChild(span);
      issues.appendChild(empty);
    }
  }

  _safe(str) { return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* ─── HIBP breach check ──────────────────────────── */
  async _checkBreaches() {
    const btn = document.getElementById('checkBreachBtn');
    btn.disabled = true; this._setButtonLabel(btn, 'refresh', 'Checking...');
    let checked = 0;
    const total = this.passwords.length;
    this._breachResults = {};
    try {
      for (const p of this.passwords) {
        checked++;
        this._setButtonLabel(btn, 'refresh', `${checked}/${total}`);
        try {
          this._breachResults[p.id] = await BreachChecker.check(p.password);
        } catch (_) { this._breachResults[p.id] = 0; }
        await new Promise(r => setTimeout(r, 300)); // be polite to API
      }
      this._toast('search', 'Breach check complete');
      this._renderPasswords();
      this._renderHealth();
    } catch (_) {
      this._toast('x', 'Breach check failed');
    } finally {
      btn.disabled = false; this._setButtonLabel(btn, 'search', 'Check Breaches (HIBP)');
    }
  }

  /* ─── Change master password ─────────────────────── */
  async _changeMasterPassword() {
    const current  = document.getElementById('currentMaster').value;
    const next     = document.getElementById('newMaster').value;
    const confirm  = document.getElementById('confirmMaster').value;
    const errEl    = document.getElementById('changeMasterError');
    errEl.classList.remove('show');

    if (next.length < 8)  { errEl.textContent='New password must be at least 8 chars'; errEl.classList.add('show'); return; }
    if (next !== confirm)  { errEl.textContent='Passwords do not match'; errEl.classList.add('show'); return; }

    const rec   = await this._storage('masterPasswordRecord');
    const valid = await CryptoUtil.verifyMasterPassword(current, rec);
    if (!valid) { errEl.textContent='Current password is incorrect'; errEl.classList.add('show'); return; }

    /* Re-encrypt vault with new master */
    const newRecord = await CryptoUtil.hashMasterPassword(next);
    const enc       = await CryptoUtil.encrypt(JSON.stringify(this.passwords), next);
    await this._storage('masterPasswordRecord', newRecord);
    await this._storage('encryptedPasswords', enc);
    this.masterPassword = next;

    document.getElementById('changeMasterModal').classList.add('hidden');
    ['currentMaster','newMaster','confirmMaster'].forEach(id => document.getElementById(id).value = '');
    this._toast('check', 'Master password changed');
  }

  /* ─── Modals: Add/Edit ───────────────────────────── */
  _showPasswordModal(editId = null) {
    this._editId = editId;
    document.getElementById('modalTitle').textContent = editId ? 'Edit Password' : 'Add Password';
    const pwInput = document.getElementById('password');
    if (pwInput) pwInput.type = 'password';
    this._replaceIcon(document.getElementById('showPassword'), 'eye', 'icon-sm');
    if (editId) {
      const pw = this.passwords.find(p => p.id === editId);
      if (pw) {
        document.getElementById('website').value  = pw.website  || '';
        document.getElementById('username').value = pw.username || '';
        document.getElementById('password').value = pw.password || '';
        document.getElementById('notes').value    = pw.notes    || '';
        document.getElementById('entryTag').value = pw.tag      || '';
        this._updateStrengthUI(pw.password || '');
      }
    } else {
      ['website','username','password','notes'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('entryTag').value = '';
      this._updateStrengthUI('');
      chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
        if (tabs[0]?.url) {
          try { document.getElementById('website').value = new URL(tabs[0].url).hostname; } catch (_) {}
        }
      });
    }
    document.getElementById('passwordModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('website').focus(), 80);
  }

  _hidePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden'); this._editId = null;
  }

  async _savePasswordFromModal() {
    const website  = document.getElementById('website').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const notes    = document.getElementById('notes').value.trim();
    const tag      = document.getElementById('entryTag').value;
    if (!website || !username || !password) { this._toast('alert', 'Website, username and password are required'); return; }
    const data = { website, username, password, notes, tag };
    if (this._editId) {
      await this._updatePassword(this._editId, data); this._toast('check', 'Password updated');
    } else {
      await this._addPassword(data); this._toast('check', 'Password saved');
    }
    this._hidePasswordModal();
  }

  /* ─── Modals: Details ────────────────────────────── */
  _showDetails(id) {
    const pw = this.passwords.find(p => p.id === id); if (!pw) return;
    this.currentViewId   = id;
    this._detailsRevealed = false;
    this._replaceIcon(document.getElementById('detailsFavicon'), 'key', 'icon-md');
    document.getElementById('detailsSite').textContent       = pw.website   || 'Details';
    document.getElementById('detailsWebsiteVal').textContent  = pw.website  || '—';
    document.getElementById('detailsUsernameVal').textContent = pw.username || '—';
    document.getElementById('detailsPasswordVal').textContent = '********';
    document.getElementById('detailsNotesVal').textContent    = pw.notes    || '—';
    document.getElementById('detailsPassword').classList.add('masked');
    this._replaceIcon(document.getElementById('toggleDetailsPassword'), 'eye', 'icon-sm');

    /* Tag */
    const tagWrap = document.getElementById('detailsTagWrap');
    tagWrap.classList.toggle('hidden', !pw.tag);
    document.getElementById('detailsTagVal').textContent = pw.tag || '';

    /* Age */
    const ageEl = document.getElementById('detailsAge');
    if (pw.updatedAt) {
      const days = Math.floor((Date.now() - new Date(pw.updatedAt).getTime()) / 86400000);
      ageEl.textContent = `Updated ${days === 0 ? 'today' : `${days} day${days===1?'':'s'} ago`}${days > 90 ? ' (old)' : ''}`;
    } else { ageEl.textContent = ''; }

    document.getElementById('detailsModal').classList.remove('hidden');
  }

  /* ─── Clipboard ──────────────────────────────────── */
  async _copyToClipboard(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      this._toast('clipboard', `${label} copied!`);
      this._startClipCountdown();
    } catch (_) { this._toast('x', 'Copy failed'); }
  }

  _startClipCountdown() {
    /* Clear any existing */
    clearInterval(this._clipTimer);
    const existing = document.querySelector('.clipboard-countdown');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'clipboard-countdown';
    document.body.appendChild(el);
    let secs = 30;
    const tick = () => {
      secs--;
      el.textContent = `Clears in ${secs}s`;
      if (secs <= 0) { clearInterval(this._clipTimer); el.remove(); navigator.clipboard.writeText('').catch(()=>{}); }
    };
    tick();
    this._clipTimer = setInterval(tick, 1000);
    /* Also schedule via background for when popup closes */
    chrome.runtime.sendMessage({ action: 'scheduleClearClipboard' }).catch(()=>{});
  }

  async _copyPassword(id)  { const p = this.passwords.find(x => x.id === id); if (p) await this._copyToClipboard(p.password, 'Password'); }
  async _copyUsername(id)  { const p = this.passwords.find(x => x.id === id); if (p) await this._copyToClipboard(p.username, 'Username'); }
  async _copyBoth(id)      { const p = this.passwords.find(x => x.id === id); if (p) await this._copyToClipboard(`${p.username}:${p.password}`, 'Username & password'); }

  /* ─── Auto-fill ──────────────────────────────────── */
  async _autoFill(id) {
    const pw = this.passwords.find(p => p.id === id); if (!pw) return;
    try {
      const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
      if (!tab?.id) throw new Error('No active tab');
      await chrome.tabs.sendMessage(tab.id, { action:'fillCredentials', username:pw.username, password:pw.password });
      this._toast('pencil', 'Auto-filled credentials');
    } catch (_) { this._toast('alert', 'Auto-fill failed on this page'); }
  }

  /* ─── Export / Import ────────────────────────────── */
  _exportPasswords() {
    if (!this.passwords.length) { this._toast('alert', 'No passwords to export'); return; }
    document.getElementById('exportConfirmModal').classList.remove('hidden');
  }
  _doExport() {
    document.getElementById('exportConfirmModal').classList.add('hidden');
    const json = JSON.stringify(this.passwords, null, 2);
    const uri  = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    const a    = document.createElement('a'); a.href=uri; a.download=`vault-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    this._toast('upload', 'Export downloaded');
  }
  _showImportModal() { document.getElementById('importModal').classList.remove('hidden'); }
  _hideImportModal() { document.getElementById('importModal').classList.add('hidden'); document.getElementById('importFile').value=''; }
  _importPasswords(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error();
        const existing = new Set(this.passwords.map(p => p.id));
        const newOnes  = imported.filter(p => !existing.has(p.id));
        this.passwords = [...this.passwords, ...newOnes];
        await this._savePasswords(); this._renderPasswords(); this._buildTagFilters();
        this._toast('download', `${newOnes.length} passwords imported`);
        this._hideImportModal();
      } catch (_) { this._toast('x', 'Invalid JSON file'); }
    };
    reader.readAsText(file);
  }

  /* ═══════════════════════════════════════════════════
     GENERATOR
  ═══════════════════════════════════════════════════ */
  _genMode() { return document.querySelector('.mode-btn.active')?.dataset.mode || 'password'; }

  _generateOne() {
    const mode = this._genMode();
    if (mode === 'passphrase') {
      return PasswordGenerator.generatePassphrase({
        wordCount:  +document.getElementById('wordCountSlider').value,
        separator:  document.getElementById('separatorSelect').value,
        capitalize: document.getElementById('chkCapitalize').checked,
        addNumber:  document.getElementById('chkAddNumber').checked
      });
    }
    return PasswordGenerator.generatePassword({
      length:      +document.getElementById('lengthSlider').value,
      upper:        document.getElementById('chkUpper').checked,
      lower:        document.getElementById('chkLower').checked,
      numbers:      document.getElementById('chkNumbers').checked,
      symbols:      document.getElementById('chkSymbols').checked,
      noAmbiguous:  document.getElementById('chkNoAmbiguous').checked
    });
  }

  _generate() {
    const count = +document.getElementById('batchCount').value;
    if (count === 1) {
      this._genPassword = this._generateOne();
      this._updateGenUI(this._genPassword);
      document.getElementById('batchResults').classList.add('hidden');
      this._pushHistory(this._genPassword);
    } else {
      const passwords = Array.from({ length: count }, () => this._generateOne());
      this._genPassword = passwords[0];
      this._updateGenUI(passwords[0]);
      this._renderBatch(passwords);
      passwords.forEach(pw => this._pushHistory(pw));
    }
  }

  _updateGenUI(pw) {
    document.getElementById('genOutput').textContent = pw;
    const s    = this._strength(pw);
    const ent  = PasswordGenerator.entropy(pw);
    const fill = document.getElementById('genStrengthFill');
    const lbl  = document.getElementById('genStrengthLabel');
    fill.className = `gen-strength-fill strength-${s}`;
    lbl.className  = `strength-badge strength-${s}`;
    lbl.textContent = { weak:'Weak', medium:'Medium', strong:'Strong' }[s];
    document.getElementById('genEntropy').textContent = `${ent} bits`;
  }

  _renderBatch(passwords) {
    const wrap = document.getElementById('batchResults');
    wrap.innerHTML = ''; wrap.classList.remove('hidden');
    passwords.forEach(pw => {
      const item  = document.createElement('div'); item.className = 'batch-item';
      const pwEl  = document.createElement('span'); pwEl.className='batch-pw'; pwEl.textContent=pw;
      const cpBtn = document.createElement('button'); cpBtn.className='batch-copy'; cpBtn.textContent='Copy';
      cpBtn.addEventListener('click', () => this._copyToClipboard(pw, 'Password'));
      item.appendChild(pwEl); item.appendChild(cpBtn); wrap.appendChild(item);
    });
  }

  _pushHistory(pw) {
    this._genHistory.unshift({ pw, time: Date.now() });
    if (this._genHistory.length > 10) this._genHistory.pop();
    this._saveGenHistory();
    this._renderHistory();
  }

  _renderHistory() {
    const wrap = document.getElementById('genHistory');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!this._genHistory.length) {
      const empty = document.createElement('div');
      empty.className = 'gen-history-empty';
      empty.textContent = 'No history yet';
      wrap.appendChild(empty);
      return;
    }
    this._genHistory.forEach(({ pw, time }) => {
      const item = document.createElement('div'); item.className='hist-item';
      const pwEl = document.createElement('span'); pwEl.className='hist-pw'; pwEl.textContent=pw;
      const timeEl = document.createElement('span'); timeEl.className='hist-time';
      const mins = Math.round((Date.now() - time) / 60000);
      timeEl.textContent = mins < 1 ? 'just now' : `${mins}m ago`;
      item.appendChild(pwEl); item.appendChild(timeEl);
      item.addEventListener('click', () => {
        this._genPassword = pw; this._updateGenUI(pw);
        document.getElementById('batchResults').classList.add('hidden');
      });
      wrap.appendChild(item);
    });
  }

  async _saveGenHistory() { await this._storage('genHistory', this._genHistory); }
  async _loadGenHistory()  {
    const h = await this._storage('genHistory');
    if (Array.isArray(h)) { this._genHistory = h; this._renderHistory(); }
  }

  /* Save generated password to vault */
  _showSaveGenModal() {
    if (!this._genPassword) { this._toast('alert', 'Generate a password first'); return; }
    document.getElementById('genPasswordPreview').textContent = this._genPassword;
    document.getElementById('saveGenWebsite').value  = '';
    document.getElementById('saveGenUsername').value = '';
    document.getElementById('saveGenTag').value      = '';
    chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
      if (tabs[0]?.url) {
        try { document.getElementById('saveGenWebsite').value = new URL(tabs[0].url).hostname; } catch (_) {}
      }
    });
    document.getElementById('saveGenModal').classList.remove('hidden');
  }

  async _confirmSaveGen() {
    const website  = document.getElementById('saveGenWebsite').value.trim();
    const username = document.getElementById('saveGenUsername').value.trim();
    const tag      = document.getElementById('saveGenTag').value;
    if (!website || !username) { this._toast('alert', 'Website and username are required'); return; }
    await this._addPassword({ website, username, password: this._genPassword, notes:'', tag });
    document.getElementById('saveGenModal').classList.add('hidden');
    this._toast('check', 'Saved to vault!');
  }

  /* Auto-fill with generated password */
  async _autoFillGenerated() {
    if (!this._genPassword) { this._toast('alert', 'Generate a password first'); return; }
    try {
      const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
      if (!tab?.id) throw new Error();
      await chrome.tabs.sendMessage(tab.id, { action:'fillCredentials', username:'', password: this._genPassword });
      this._toast('pencil', 'Password filled on page');
    } catch (_) { this._toast('alert', 'Auto-fill failed on this page'); }
  }

  /* ═══════════════════════════════════════════════════
     EVENT BINDING
  ═══════════════════════════════════════════════════ */
  _bindEvents() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

    /* Lock screen */
    on('unlockBtn',      'click',   async () => { await this._verifyOrSetMaster(document.getElementById('masterPassword').value); });
    on('masterPassword', 'keydown', async (e) => { if (e.key==='Enter') await this._verifyOrSetMaster(e.target.value); if (e.target.value) this._hideLockError(); });
    on('toggleMasterPw', 'click', () => {
      const inp = document.getElementById('masterPassword');
      inp.type = inp.type==='password'?'text':'password';
      this._replaceIcon(document.getElementById('toggleMasterPw'), inp.type==='password' ? 'eye' : 'eye-off', 'icon-md');
    });
    on('setupHint', 'click', () => document.getElementById('masterPassword').focus());
    on('forgotMasterBtn', 'click', () => this._showResetModal());

    const syncResetConfirm = () => {
      const val = document.getElementById('resetConfirmInput')?.value.trim().toUpperCase();
      const ok  = document.getElementById('resetConfirmCheck')?.checked;
      const btn = document.getElementById('confirmReset');
      if (btn) btn.disabled = !(val === 'RESET' && ok);
    };

    on('resetConfirmInput', 'input', syncResetConfirm);
    on('resetConfirmCheck', 'change', syncResetConfirm);
    on('closeReset',  'click', () => this._hideResetModal());
    on('cancelReset', 'click', () => this._hideResetModal());
    on('confirmReset','click', async () => { await this._resetVault(); this._hideResetModal(); });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const reset = document.getElementById('resetModal');
      if (reset && !reset.classList.contains('hidden')) this._hideResetModal();
    });

    /* Dashboard */
    on('themeToggleBtn', 'click', () => this._toggleTheme());
    on('lockBtn', 'click', () => this._lock());

    /* Tab switching */
    document.querySelectorAll('.tab').forEach(tab =>
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab))
    );

    /* Search */
    let _st;
    on('search', 'input', () => { clearTimeout(_st); _st=setTimeout(() => this._renderPasswords(), 200); });

    /* Vault actions */
    on('addPassword', 'click', () => this._showPasswordModal());
    on('exportBtn',   'click', () => this._exportPasswords());
    on('importBtn',   'click', () => this._showImportModal());

    /* Password list delegation */
    document.getElementById('passwordsList')?.addEventListener('click', (e) => {
      const item = e.target.closest('.password-item'); if (!item) return;
      const id   = item.dataset.id;
      if (e.target.closest('.copy-password-btn')) { this._copyPassword(id); return; }
      if (e.target.closest('.copy-username-btn')) { this._copyUsername(id); return; }
      if (e.target.closest('.edit-btn'))           { this._showPasswordModal(id); return; }
      if (e.target.closest('.delete-btn'))         { this._confirmDelete(id); return; }
      if (e.target.closest('.fav-btn'))            { this._toggleFav(id); return; }
      this._showDetails(id);
    });

    /* Add/Edit modal */
    on('closeModal',   'click', () => this._hidePasswordModal());
    on('cancelBtn',    'click', () => this._hidePasswordModal());
    on('savePassword', 'click', () => this._savePasswordFromModal());
    on('showPassword', 'click', () => {
      const inp = document.getElementById('password');
      inp.type = inp.type==='password'?'text':'password';
      this._replaceIcon(document.getElementById('showPassword'), inp.type==='password' ? 'eye' : 'eye-off', 'icon-sm');
    });
    on('password', 'input', () => this._updateStrengthUI(document.getElementById('password').value));
    on('inlineGenBtn', 'click', () => {
      const pw = PasswordGenerator.generatePassword({ length:16,upper:true,lower:true,numbers:true,symbols:true,noAmbiguous:false });
      document.getElementById('password').value = pw;
      this._updateStrengthUI(pw);
      this._toast('bolt', 'Password generated!');
    });

    /* Details modal */
    on('closeDetails',    'click', () => document.getElementById('detailsModal').classList.add('hidden'));
    on('closeDetailsBtn', 'click', () => document.getElementById('detailsModal').classList.add('hidden'));
    on('editFromDetails', 'click', () => {
      document.getElementById('detailsModal').classList.add('hidden');
      if (this.currentViewId) this._showPasswordModal(this.currentViewId);
    });
    on('autofillDetails', 'click', () => this._autoFill(this.currentViewId));
    on('copyDetailsUsername', 'click', () => {
      const v = document.getElementById('detailsUsernameVal').textContent;
      if (v && v !== '—') this._copyToClipboard(v, 'Username');
    });
    on('copyDetailsPassword', 'click', () => this._copyPassword(this.currentViewId));
    on('copyBothBtn', 'click', () => this._copyBoth(this.currentViewId));
    on('toggleDetailsPassword', 'click', () => {
      const pw  = this.passwords.find(p => p.id === this.currentViewId); if (!pw) return;
      this._detailsRevealed = !this._detailsRevealed;
      document.getElementById('detailsPasswordVal').textContent = this._detailsRevealed ? pw.password : '********';
      document.getElementById('detailsPassword').classList.toggle('masked', !this._detailsRevealed);
      this._replaceIcon(document.getElementById('toggleDetailsPassword'), this._detailsRevealed ? 'eye-off' : 'eye', 'icon-sm');
    });

    /* Delete modal */
    on('closeDelete',  'click', () => { document.getElementById('deleteModal').classList.add('hidden'); this.pendingDeleteId=null; });
    on('cancelDelete', 'click', () => { document.getElementById('deleteModal').classList.add('hidden'); this.pendingDeleteId=null; });
    on('confirmDelete','click', () => this._executeDelete());

    /* Export modal */
    on('cancelExport',  'click', () => document.getElementById('exportConfirmModal').classList.add('hidden'));
    on('cancelExport2', 'click', () => document.getElementById('exportConfirmModal').classList.add('hidden'));
    on('confirmExport', 'click', () => this._doExport());

    /* Import modal */
    on('closeImport',   'click', () => this._hideImportModal());
    on('cancelImport',  'click', () => this._hideImportModal());
    on('confirmImport', 'click', () => {
      const f = document.getElementById('importFile').files[0];
      if (f) this._importPasswords(f); else this._toast('alert', 'Please select a file');
    });

    /* Save-gen modal */
    on('closeSaveGen',    'click', () => document.getElementById('saveGenModal').classList.add('hidden'));
    on('cancelSaveGen',   'click', () => document.getElementById('saveGenModal').classList.add('hidden'));
    on('confirmSaveGen',  'click', () => this._confirmSaveGen());

    /* Health tab */
    on('checkBreachBtn',  'click', () => this._checkBreaches());
    on('changeMasterBtn', 'click', () => document.getElementById('changeMasterModal').classList.remove('hidden'));

    /* Change master modal */
    on('closeChangeMaster',   'click', () => document.getElementById('changeMasterModal').classList.add('hidden'));
    on('cancelChangeMaster',  'click', () => document.getElementById('changeMasterModal').classList.add('hidden'));
    on('confirmChangeMaster', 'click', () => this._changeMasterPassword());

    /* Backdrop dismiss */
    ['passwordModal','importModal','deleteModal','detailsModal','exportConfirmModal','saveGenModal','changeMasterModal','resetModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { if (e.target===el) el.classList.add('hidden'); });
    });
  }

  _bindGeneratorEvents() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

    /* Mode toggle */
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b===btn));
        const isPP = btn.dataset.mode === 'passphrase';
        document.getElementById('pwOptions').classList.toggle('hidden', isPP);
        document.getElementById('ppOptions').classList.toggle('hidden', !isPP);
        this._generate();
      });
    });

    /* Sliders */
    on('lengthSlider', 'input', (e) => { document.getElementById('lengthVal').textContent=e.target.value; this._generate(); });
    on('wordCountSlider','input',(e) => { document.getElementById('wordCountVal').textContent=e.target.value; this._generate(); });

    /* Checkboxes & selects → regenerate */
    ['chkUpper','chkLower','chkNumbers','chkSymbols','chkNoAmbiguous','chkCapitalize','chkAddNumber','separatorSelect','batchCount']
      .forEach(id => on(id, 'change', () => this._generate()));

    /* Buttons */
    on('generateBtn',    'click', () => this._generate());
    on('copyGenBtn',     'click', () => { if (this._genPassword) this._copyToClipboard(this._genPassword, 'Password'); else this._toast('alert','Generate first'); });
    on('saveToVaultBtn', 'click', () => this._showSaveGenModal());
    on('autoFillGenBtn', 'click', () => this._autoFillGenerated());
    on('clearHistoryBtn','click', () => { this._genHistory=[]; this._saveGenHistory(); this._renderHistory(); });

    /* Keyboard: Space/Enter to regenerate when focused on gen tab */
    document.getElementById('tab-generator')?.addEventListener('keydown', (e) => {
      if ((e.code==='Space' || e.code==='Enter') && !['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)) {
        e.preventDefault(); this._generate();
      }
    });

    /* Generate on load */
    this._generate();
  }

  /* Favourite toggle */
  async _toggleFav(id) {
    const p = this.passwords.find(x => x.id === id); if (!p) return;
    p.favourite = !p.favourite;
    await this._savePasswords();
    this._renderPasswords();
  }

  /* ─── Toast ──────────────────────────────────────── */
  _toast(icon, message) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className='toast';
    const i = document.createElement('span'); i.className='toast-icon'; i.appendChild(this._iconEl(icon, 'icon-sm'));
    const m = document.createElement('span'); m.textContent=message;
    t.appendChild(i); t.appendChild(m); document.body.appendChild(t);
    setTimeout(() => { t.classList.add('toast-out'); setTimeout(()=>t.remove(),280); }, 2600);
  }
}

/* ─── Boot ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => { new App(); });

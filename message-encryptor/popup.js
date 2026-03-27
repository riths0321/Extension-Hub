// ── CONFIG ────────────────────────────────────────────────────────────────────
const ITER           = 100_000;
const SALT_LEN       = 16;
const IV_LEN         = 12;
const FILE_MAGIC     = [0x45, 0x4e, 0x43, 0x31];
const FLAG_COMPRESSED  = 0x01;
const FLAG_SIGNED      = 0x02;
const FLAG_NO_PASSWORD = 0x04;
const NO_PWD_KEY       = 'NO_PASSWORD_KEY_V1';

// ── STATE ─────────────────────────────────────────────────────────────────────
let mode          = 'encrypt';
let fmt           = 'base64';
let selectedFiles = [];
let history       = [];

const $ = id => document.getElementById(id);

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupEventListeners();
  setupKeyboardShortcuts();
  updateModeUI();
});

function setupEventListeners() {
  // Tabs
  $('tabEncrypt').addEventListener('click', () => switchTab('encrypt'));
  $('tabDecrypt').addEventListener('click', () => switchTab('decrypt'));
  $('tabFiles'  ).addEventListener('click', () => switchTab('files'));
  $('tabHistory').addEventListener('click', () => switchTab('history'));

  // Format toggle
  $('fmtB64').addEventListener('click', () => setFmt('base64'));
  $('fmtHex').addEventListener('click',  () => setFmt('hex'));

  // Message
  $('message').addEventListener('input', onMsgInput);

  // Password
  $('password').addEventListener('input', onPwdInput);
  $('eyeBtn'   ).addEventListener('click', () => toggleEye('password', 'eyeOpen', 'eyeClosed'));
  $('genPwdBtn').addEventListener('click', generatePassword);
  $('chkPassword').addEventListener('change', onPwdToggle);

  // Import .txt
  $('importTxtBtn'  ).addEventListener('click', () => $('importTxtInput').click());
  $('importTxtInput').addEventListener('change', onImportTxt);

  // Main action
  $('actionBtn').addEventListener('click', doAction);

  // Output buttons
  $('copyBtn'  ).addEventListener('click', doCopy);
  $('exportBtn').addEventListener('click', doExport);
  $('clearBtn' ).addEventListener('click', doClear);

  // Files
  const dz = $('dropZone');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('over'));
  dz.addEventListener('drop',      e  => { e.preventDefault(); dz.classList.remove('over'); addFiles(e.dataTransfer.files); });
  dz.addEventListener('click', () => $('fileInput').click());
  $('fileInput'      ).addEventListener('change', e => addFiles(e.target.files));
  $('fileEncryptBtn' ).addEventListener('click', () => processFiles('encrypt'));
  $('fileDecryptBtn' ).addEventListener('click', () => processFiles('decrypt'));
  $('fileEyeBtn'     ).addEventListener('click', () => toggleEye('filePwd', 'fileEyeOpen', 'fileEyeClosed'));
  $('chkFilePassword').addEventListener('change', onFilePwdToggle);

  // History
  $('clearHistoryBtn').addEventListener('click', clearHistory);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!$('panelMain').classList.contains('hidden')) doAction();
    }
    if (e.key === 'Escape') {
      doClear();
    }
  });
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(t) {
  ['Encrypt','Decrypt','Files','History'].forEach(n =>
    $('tab' + n).classList.toggle('active', n.toLowerCase() === t)
  );
  ['Main','Files','History'].forEach(n => $('panel' + n).classList.add('hidden'));

  if (t === 'encrypt' || t === 'decrypt') {
    mode = t;
    $('panelMain').classList.remove('hidden');
    updateModeUI();
    
    // Reset fields on switch
    $('message').value = '';
    $('output').value = '';
    $('charCount').textContent = '0';
    setStatus('');
    
    // Reset password state
    $('chkPassword').checked = true;
    $('password').value = '';
    clearStrength();
    onPwdToggle();
  } else if (t === 'files') {
    $('panelFiles').classList.remove('hidden');
    renderFiles();
  } else {
    $('panelHistory').classList.remove('hidden');
    renderHistory();
  }
}

function updateModeUI() {
  $('msgLabel').textContent = mode === 'encrypt' ? 'Message' : 'Encrypted text';
  $('message').placeholder = mode === 'encrypt' ? 'Type your secret message…' : 'Paste encrypted text here…';
  
  const btn = $('actionBtn');
  if (mode === 'encrypt') {
    btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="9" width="16" height="9" rx="2"/><path d="M5.5 9V6a4.5 4.5 0 0 1 9 0v3"/></svg> Encrypt';
  } else {
    btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="9" width="16" height="9" rx="2"/><path d="M5.5 9V6a3 2.5 0 0 1 5-.3"/></svg> Decrypt';
  }
}

// ── FORMAT ────────────────────────────────────────────────────────────────────
function setFmt(f) {
  fmt = f;
  $('fmtB64').classList.toggle('active', f === 'base64');
  $('fmtHex').classList.toggle('active', f === 'hex');
}

// ── MESSAGE ───────────────────────────────────────────────────────────────────
function onMsgInput() {
  const bytes = new TextEncoder().encode($('message').value).length;
  if (bytes > 1024) {
    $('charCount').textContent = (bytes / 1024).toFixed(1) + ' KB';
  } else {
    $('charCount').textContent = bytes + ' chars';
  }
}

function onImportTxt(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    $('message').value = ev.target.result;
    onMsgInput();
    setStatus(`✓ Imported: ${file.name}`, 'success');
  };
  r.onerror = () => setStatus('✗ Failed to import file', 'error');
  r.readAsText(file);
  e.target.value = '';
}

// ── EYE TOGGLE ────────────────────────────────────────────────────────────────
function toggleEye(inputId, openId, closedId) {
  const inp = $(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $(openId).style.display = show ? 'none' : '';
  $(closedId).style.display = show ? '' : 'none';
}

// ── PASSWORD GENERATION (cryptographically secure) ───────────────────────────
function generatePassword() {
  if (!$('chkPassword').checked) {
    $('chkPassword').checked = true;
    onPwdToggle();
  }
  
  const length = 20;
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  const charsetLength = charset.length;
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  
  let pwd = '';
  for (let i = 0; i < length; i++) {
    let randomIndex;
    do {
      randomIndex = randomBytes[i] % charsetLength;
    } while (randomBytes[i] - randomIndex > 255 - charsetLength);
    pwd += charset[randomIndex];
  }
  
  $('password').value = pwd;
  $('password').type = 'text';
  $('eyeOpen').style.display = 'none';
  $('eyeClosed').style.display = '';
  onPwdInput();
  showToast('🔑 Password generated: ' + pwd, 4000);
}

function showToast(msg, duration = 3000) {
  const existing = document.querySelector('.gen-toast');
  if (existing) existing.remove();
  
  const t = document.createElement('div');
  t.className = 'gen-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  
  setTimeout(() => {
    t.style.transition = 'opacity .3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 350);
  }, duration);
}

// ── PASSWORD STRENGTH ─────────────────────────────────────────────────────────
function onPwdInput() {
  if ($('password').disabled) return;
  const v = $('password').value;
  const s = calcStrength(v);
  const colors = ['#f96b6b', '#f5a623', '#f5a623', '#2ecc71', '#7c6dfa'];
  const labels = ['Weak', 'Fair', 'Fair', 'Strong', 'Very strong'];
  
  if (v) {
    const widthPercent = (s / 5) * 100;
    $('strFill').style.width = widthPercent + '%';
    $('strFill').style.background = colors[s - 1];
    $('strText').textContent = labels[s - 1];
    $('strText').style.color = colors[s - 1];
  } else {
    clearStrength();
  }
}

function clearStrength() {
  $('strFill').style.width = '0%';
  $('strFill').style.background = 'transparent';
  $('strText').textContent = '';
  $('strText').style.color = '';
}

function calcStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 14) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(5, Math.max(1, s));
}

// ── PASSWORD TOGGLE ───────────────────────────────────────────────────────────
function onPwdToggle() {
  const use = $('chkPassword').checked;
  const sec = $('pwdSection');
  const pwdInp = $('password');
  
  if (use) {
    sec.style.display = '';
    pwdInp.disabled = false;
    onPwdInput();
  } else {
    sec.style.display = 'none';
    pwdInp.disabled = true;
    pwdInp.value = '';
    clearStrength();
  }
}

function onFilePwdToggle() {
  const use = $('chkFilePassword').checked;
  const sec = $('filePwdSection');
  const inp = $('filePwd');
  sec.style.display = use ? '' : 'none';
  inp.disabled = !use;
  if (!use) inp.value = '';
}

// ── CRYPTO HELPERS ────────────────────────────────────────────────────────────
function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b642buf(s) {
  const bin = atob(s.trim());
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

function buf2hex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hex2buf(h) {
  const u = new Uint8Array(h.length / 2);
  for (let i = 0; i < u.length; i++) {
    u[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return u.buffer;
}

function encode(buf) {
  return fmt === 'hex' ? buf2hex(buf) : buf2b64(buf);
}

function decode(s) {
  const t = s.trim();
  if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0 && t.length >= 64) {
    return hex2buf(t);
  }
  return b642buf(t);
}

async function deriveKey(pwd, salt, uses = ['encrypt', 'decrypt']) {
  const mat = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    mat,
    { name: 'AES-GCM', length: 256 },
    false,
    uses
  );
}

async function deriveHmac(pwd, salt) {
  const mat = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    mat,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify']
  );
}

async function makeNoPwdKey(usage) {
  const raw = new TextEncoder().encode(NO_PWD_KEY);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

async function compress(data) {
  if (!window.CompressionStream) {
    console.warn('CompressionStream not supported');
    return data;
  }
  try {
    const compressedStream = new Response(
      new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
    );
    return new Uint8Array(await compressedStream.arrayBuffer());
  } catch (e) {
    console.warn('Compression failed', e);
    return data;
  }
}

async function decompress(data) {
  if (!window.DecompressionStream) {
    console.warn('DecompressionStream not supported');
    return data;
  }
  try {
    const decompressedStream = new Response(
      new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
    );
    return new Uint8Array(await decompressedStream.arrayBuffer());
  } catch (e) {
    console.warn('Decompression failed', e);
    return data;
  }
}

// ── ENCRYPT MESSAGE ───────────────────────────────────────────────────────────
async function encryptMsg(text, pwd, doCompress, doSign, usePassword) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  let payload = new TextEncoder().encode(text);
  let flags = 0;
  
  if (doCompress) {
    payload = await compress(payload);
    flags |= FLAG_COMPRESSED;
  }
  
  let key;
  if (!usePassword) {
    flags |= FLAG_NO_PASSWORD;
    key = await makeNoPwdKey('encrypt');
  } else {
    key = await deriveKey(pwd, salt);
  }
  
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  
  let hmacBlob = new Uint8Array(0);
  if (doSign && usePassword) {
    flags |= FLAG_SIGNED;
    const hs = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const hk = await deriveHmac(pwd, hs);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', hk, ct));
    hmacBlob = new Uint8Array(SALT_LEN + sig.byteLength);
    hmacBlob.set(hs, 0);
    hmacBlob.set(sig, SALT_LEN);
  }
  
  const hl = hmacBlob.byteLength;
  const out = new Uint8Array(1 + SALT_LEN + IV_LEN + 2 + hl + ct.byteLength);
  let o = 0;
  out[o++] = flags;
  out.set(salt, o); o += SALT_LEN;
  out.set(iv, o); o += IV_LEN;
  out[o++] = (hl >> 8) & 0xff;
  out[o++] = hl & 0xff;
  if (hl) {
    out.set(hmacBlob, o);
    o += hl;
  }
  out.set(new Uint8Array(ct), o);
  return encode(out.buffer);
}

// ── DECRYPT MESSAGE ───────────────────────────────────────────────────────────
async function decryptMsg(packed, pwd) {
  let rawBuf;
  try {
    rawBuf = decode(packed);
  } catch {
    throw new Error('Invalid format — paste the complete encrypted text');
  }
  
  const d = new Uint8Array(rawBuf);
  let o = 0;
  const flags = d[o++];
  const isComp = !!(flags & FLAG_COMPRESSED);
  const isSigned = !!(flags & FLAG_SIGNED);
  const isNoPwd = !!(flags & FLAG_NO_PASSWORD);
  const salt = d.slice(o, o + SALT_LEN); o += SALT_LEN;
  const iv = d.slice(o, o + IV_LEN); o += IV_LEN;
  const hl = (d[o] << 8) | d[o + 1]; o += 2;
  const hmacBlob = d.slice(o, o + hl); o += hl;
  const ct = d.slice(o);
  
  let key;
  if (isNoPwd) {
    key = await makeNoPwdKey('decrypt');
  } else {
    if (!pwd) throw new Error('This message requires a password to decrypt');
    key = await deriveKey(pwd, salt);
  }
  
  if (isSigned && hmacBlob.byteLength === SALT_LEN + 32) {
    const hk = await deriveHmac(isNoPwd ? NO_PWD_KEY : pwd, hmacBlob.slice(0, SALT_LEN));
    const ok = await crypto.subtle.verify('HMAC', hk, hmacBlob.slice(SALT_LEN), ct);
    if (!ok) throw new Error('Signature invalid — message may have been tampered with');
  }
  
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  } catch {
    throw new Error(isNoPwd ? 'Decryption failed — data may be corrupted' : 'Wrong password or corrupted data');
  }
  
  let payload = new Uint8Array(plain);
  if (isComp) payload = await decompress(payload);
  return { text: new TextDecoder().decode(payload), signed: isSigned };
}

// ── MAIN ACTION ───────────────────────────────────────────────────────────────
async function doAction() {
  const text = $('message').value.trim();
  const pwd = $('password').value;
  const usePassword = $('chkPassword').checked;
  
  if (!text) {
    setStatus(mode === 'encrypt' ? '✗ Enter a message first' : '✗ Paste encrypted text first', 'error');
    return;
  }
  
  if (mode === 'encrypt') {
    if (usePassword && !pwd) {
      setStatus('✗ Enter a password, or turn off the password toggle', 'error');
      return;
    }
  } else {
    try {
      const flags = new Uint8Array(decode(text))[0];
      if (!(flags & FLAG_NO_PASSWORD) && !pwd) {
        setStatus('✗ This message requires a password to decrypt', 'error');
        return;
      }
    } catch {
      setStatus('✗ Invalid encrypted format — paste the full encrypted text', 'error');
      return;
    }
  }
  
  const btn = $('actionBtn');
  const origHTML = btn.innerHTML;
  btn.textContent = mode === 'encrypt' ? 'Encrypting…' : 'Decrypting…';
  btn.disabled = true;
  setStatus('Processing...', 'info');
  
  try {
    if (mode === 'encrypt') {
      const out = await encryptMsg(text, pwd, $('chkCompress').checked, $('chkSign').checked, usePassword);
      $('output').value = out;
      setStatus(usePassword ? '✓ Encrypted with password' : '✓ Encrypted (no password)', 'success');
      addHistory('enc', out);
    } else {
      const { text: plain, signed } = await decryptMsg(text, pwd);
      $('output').value = plain;
      setStatus(signed ? '✓ Decrypted · signature verified' : '✓ Decrypted successfully', 'success');
      addHistory('dec', plain);
    }
  } catch (e) {
    setStatus(`✗ ${e.message}`, 'error');
  } finally {
    btn.innerHTML = origHTML;
    btn.disabled = false;
  }
}

// ── COPY ──────────────────────────────────────────────────────────────────────
async function doCopy() {
  const v = $('output').value;
  if (!v) {
    setStatus('✗ Nothing to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(v);
    const btn = $('copyBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
    
    const flash = $('copyFlash');
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');
    
    setStatus('✓ Copied to clipboard', 'success');
  } catch {
    setStatus('✗ Copy failed — select manually', 'error');
  }
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
function doExport() {
  const v = $('output').value;
  if (!v) {
    setStatus('✗ Nothing to export', 'error');
    return;
  }
  
  const blob = new Blob([v], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vault_${Date.now()}.txt`;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
  setStatus('✓ Exported to file', 'success');
}

// ── CLEAR ─────────────────────────────────────────────────────────────────────
function doClear() {
  $('message').value = '';
  $('output').value = '';
  $('charCount').textContent = '0';
  $('chkPassword').checked = true;
  $('password').value = '';
  $('password').disabled = false;
  clearStrength();
  onPwdToggle();
  setStatus('✓ Cleared', 'success');
}

function setStatus(msg, type = 'info') {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status-line';
  if (type === 'error') {
    el.classList.add('error');
  } else if (type === 'success') {
    el.classList.add('success');
  } else if (type === 'info') {
    el.classList.add('info');
  }
  
  if (type !== 'error') {
    setTimeout(() => {
      if ($('status').textContent === msg) {
        $('status').textContent = '';
        $('status').className = 'status-line';
      }
    }, 3000);
  }
}

// ── FILES ─────────────────────────────────────────────────────────────────────
function addFiles(files) {
  if (!files || files.length === 0) return;
  selectedFiles = [...selectedFiles, ...Array.from(files)];
  renderFiles();
  setFileStatus(`✓ Added ${files.length} file(s)`, 'success');
}

function renderFiles() {
  const el = $('fileList');
  if (selectedFiles.length === 0) {
    el.innerHTML = '';
    return;
  }
  
  el.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'file-item';
    d.innerHTML = `
      <span class="fname" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
      <span class="fsize">${formatBytes(f.size)}</span>
      <button class="fremove" data-i="${i}">✕</button>
    `;
    el.appendChild(d);
  });
  
  el.querySelectorAll('.fremove').forEach(b =>
    b.addEventListener('click', e => {
      selectedFiles.splice(+e.target.dataset.i, 1);
      renderFiles();
      setFileStatus('✓ File removed', 'success');
    })
  );
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function processFiles(action) {
  if (!selectedFiles.length) {
    setFileStatus('✗ Select files first', 'error');
    return;
  }
  
  const pwd = $('filePwd').value;
  const usePwd = $('chkFilePassword').checked;
  
  if (usePwd && !pwd && action === 'encrypt') {
    setFileStatus('✗ Enter a password or turn off the password toggle', 'error');
    return;
  }
  
  const wrap = $('progressWrap');
  const fill = $('progressFill');
  const lbl = $('progressLabel');
  wrap.classList.remove('hidden');
  
  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i];
    lbl.textContent = `${action === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${i + 1}/${selectedFiles.length}: ${f.name}`;
    fill.style.width = (i / selectedFiles.length * 100) + '%';
    
    try {
      if (action === 'encrypt') {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
        let flags = 0;
        let key;
        
        if (!usePwd) {
          flags |= FLAG_NO_PASSWORD;
          key = await makeNoPwdKey('encrypt');
        } else {
          key = await deriveKey(pwd, salt);
        }
        
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
        const nameBytes = new TextEncoder().encode(f.name);
        const nl = nameBytes.byteLength;
        const out = new Uint8Array(4 + 1 + SALT_LEN + IV_LEN + 2 + nl + ct.byteLength);
        let o = 0;
        out.set(FILE_MAGIC, o); o += 4;
        out[o] = flags; o += 1;
        out.set(salt, o); o += SALT_LEN;
        out.set(iv, o); o += IV_LEN;
        out[o++] = (nl >> 8) & 0xff;
        out[o++] = nl & 0xff;
        out.set(nameBytes, o); o += nl;
        out.set(new Uint8Array(ct), o);
        downloadBlob(new Blob([out], { type: 'application/octet-stream' }), f.name + '.enc');
      } else {
        const raw = new Uint8Array(await f.arrayBuffer());
        if (!FILE_MAGIC.every((b, j) => b === raw[j])) {
          throw new Error('Not a valid .enc file');
        }
        let o = 4;
        const flags = raw[o]; o += 1;
        const isNoPwd = !!(flags & FLAG_NO_PASSWORD);
        const salt = raw.slice(o, o + SALT_LEN); o += SALT_LEN;
        const iv = raw.slice(o, o + IV_LEN); o += IV_LEN;
        const nl = (raw[o] << 8) | raw[o + 1]; o += 2;
        const origName = new TextDecoder().decode(raw.slice(o, o + nl)); o += nl;
        const ct = raw.slice(o);
        
        let key;
        if (isNoPwd) {
          key = await makeNoPwdKey('decrypt');
        } else {
          if (!pwd) throw new Error('Password required — this file is password-protected');
          key = await deriveKey(pwd, salt);
        }
        
        let pt;
        try {
          pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        } catch {
          throw new Error(isNoPwd ? 'File corrupted' : 'Wrong password — decryption failed');
        }
        downloadBlob(new Blob([pt]), origName);
      }
      addHistory('file', f.name);
    } catch (e) {
      fill.style.width = '100%';
      lbl.textContent = 'Failed: ' + f.name;
      setFileStatus(`✗ ${e.message}`, 'error');
      setTimeout(() => wrap.classList.add('hidden'), 4000);
      return;
    }
  }
  
  fill.style.width = '100%';
  lbl.textContent = `✓ Done — ${selectedFiles.length} file(s) processed`;
  setFileStatus(`✓ ${selectedFiles.length} file(s) ${action}ed ${usePwd ? 'with password' : '(no password)'}`, 'success');
  setTimeout(() => wrap.classList.add('hidden'), 3000);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

function setFileStatus(msg, type = 'info') {
  const el = $('fileStatus');
  el.textContent = msg;
  el.className = 'status-line';
  if (type === 'error') {
    el.classList.add('error');
  } else if (type === 'success') {
    el.classList.add('success');
  } else {
    el.classList.add('info');
  }
  
  if (type !== 'error') {
    setTimeout(() => {
      if ($('fileStatus').textContent === msg) {
        $('fileStatus').textContent = '';
        $('fileStatus').className = 'status-line';
      }
    }, 3000);
  }
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    const saved = localStorage.getItem('encryptorHistory');
    if (saved) {
      history = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load history', e);
    history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem('encryptorHistory', JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save history', e);
  }
}

function addHistory(type, full) {
  history.unshift({
    type,
    full,
    preview: full.length > 80 ? full.slice(0, 80) + '…' : full,
    ts: new Date().toLocaleTimeString()
  });
  if (history.length > 50) history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const el = $('historyList');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
      No history yet
    </div>`;
    return;
  }
  
  el.innerHTML = history.map((h, i) => `
    <div class="hist-item">
      <div class="hist-top">
        <span class="hist-badge ${h.type}">${h.type === 'enc' ? 'encrypted' : h.type === 'dec' ? 'decrypted' : 'file'}</span>
        <span class="hist-time">${escapeHtml(h.ts)}</span>
      </div>
      <div class="hist-preview" title="${escapeHtml(h.full)}">${escapeHtml(h.preview)}</div>
      <div class="hist-acts">
        <button class="nano-btn copy-hist" data-i="${i}">Copy</button>
        <button class="nano-btn use-hist" data-i="${i}">Use</button>
        <button class="nano-btn nano-danger del-hist" data-i="${i}">Remove</button>
      </div>
    </div>
  `).join('');
  
  el.querySelectorAll('.copy-hist').forEach(b =>
    b.addEventListener('click', async e => {
      const h = history[+e.target.dataset.i];
      if (h) {
        await navigator.clipboard.writeText(h.full);
        setStatus('✓ Copied to clipboard', 'success');
      }
    })
  );
  
  el.querySelectorAll('.use-hist').forEach(b =>
    b.addEventListener('click', e => {
      const h = history[+e.target.dataset.i];
      if (h) {
        switchTab(h.type === 'enc' ? 'decrypt' : 'encrypt');
        $('message').value = h.full;
        onMsgInput();
        setStatus(`✓ Loaded ${h.type === 'enc' ? 'encrypted' : 'decrypted'} message`, 'success');
      }
    })
  );
  
  el.querySelectorAll('.del-hist').forEach(b =>
    b.addEventListener('click', e => {
      history.splice(+e.target.dataset.i, 1);
      saveHistory();
      renderHistory();
      setStatus('✓ History item removed', 'success');
    })
  );
}

function clearHistory() {
  if (history.length && confirm('Clear all history?')) {
    history = [];
    saveHistory();
    renderHistory();
    setStatus('✓ History cleared', 'success');
  }
}
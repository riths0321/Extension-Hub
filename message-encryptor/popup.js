const messageEl = document.getElementById("message");
const passwordEl = document.getElementById("password");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");

const actionBtn = document.getElementById("actionBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const tabEncrypt = document.getElementById("tabEncrypt");
const tabDecrypt = document.getElementById("tabDecrypt");
const labelMessage = document.getElementById("labelMessage");

// State
let currentMode = 'encrypt'; // 'encrypt' or 'decrypt'

// Configuration
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ALGO_NAME = 'AES-GCM';
const HASH_NAME = 'SHA-256';

// ---------- UI LOGIC ----------

function switchTab(mode) {
  if (currentMode === mode) return; // Prevent clearing if clicking the same tab
  currentMode = mode;

  // Clear fields on switch
  messageEl.value = "";
  passwordEl.value = "";
  outputEl.value = "";
  statusEl.textContent = "";

  if (mode === 'encrypt') {
    // UI Updates
    tabEncrypt.classList.add('active');
    tabDecrypt.classList.remove('active');
    document.body.classList.remove('decrypt-mode');

    labelMessage.textContent = "Message to Encrypt";
    messageEl.placeholder = "Enter your secret message...";
    actionBtn.textContent = "ENCRYPT MESSAGE";

  } else {
    // UI Updates
    tabDecrypt.classList.add('active');
    tabEncrypt.classList.remove('active');
    document.body.classList.add('decrypt-mode');

    labelMessage.textContent = "Encrypted Text to Decrypt";
    messageEl.placeholder = "Paste the encrypted text here...";
    actionBtn.textContent = "DECRYPT MESSAGE";
  }
}

tabEncrypt.onclick = () => switchTab('encrypt');
tabDecrypt.onclick = () => switchTab('decrypt');

// ---------- HELPERS ----------

function setStatus(msg, error = false) {
  statusEl.textContent = msg;
  statusEl.style.color = error ? "#d32f2f" : "#388e3c";
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  try {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    throw new Error("Invalid Base64");
  }
}

// ---------- CRYPTO CORE ----------

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: HASH_NAME
    },
    keyMaterial,
    { name: ALGO_NAME, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(text, password) {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: ALGO_NAME,
        iv: iv
      },
      key,
      enc.encode(text)
    );

    const combined = new Uint8Array(salt.byteLength + iv.byteLength + encryptedContent.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(encryptedContent), salt.byteLength + iv.byteLength);

    return arrayBufferToBase64(combined.buffer);
  } catch (err) {
    console.error(err);
    throw new Error("Encryption failed");
  }
}

async function decryptMessage(packedData, password) {
  try {
    const combined = new Uint8Array(base64ToArrayBuffer(packedData));
    if (combined.byteLength < SALT_LENGTH + IV_LENGTH) throw new Error("Invalid data");

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: ALGO_NAME,
        iv: iv
      },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (err) {
    console.error(err);
    throw new Error("Wrong password or corrupted data");
  }
}

// ---------- ACTION HANDLER ----------

actionBtn.onclick = async () => {
  const text = messageEl.value.trim();
  const password = passwordEl.value;

  if (!text) return setStatus(`Please enter ${currentMode === 'encrypt' ? 'message' : 'encrypted text'}`, true);
  if (!password) return setStatus("Please enter a password", true);

  // Loading State
  const originalText = actionBtn.textContent;
  actionBtn.textContent = "Processing...";
  actionBtn.disabled = true;

  try {
    if (currentMode === 'encrypt') {
      const encrypted = await encryptMessage(text, password);
      outputEl.value = encrypted;
      setStatus("Message Encrypted Successfully!");
    } else {
      const decrypted = await decryptMessage(text, password);
      outputEl.value = decrypted;
      setStatus("Message Decrypted Successfully!");
    }
  } catch (e) {
    setStatus(e.message || "Operation Failed", true);
  } finally {
    actionBtn.textContent = originalText;
    actionBtn.disabled = false;
  }
};

copyBtn.onclick = async () => {
  if (!outputEl.value) return;
  await navigator.clipboard.writeText(outputEl.value);

  copyBtn.classList.add("copied");
  copyBtn.textContent = "Copied!";

  setTimeout(() => {
    copyBtn.classList.remove("copied");
    copyBtn.textContent = "Copy Output";
  }, 1200);
};

clearBtn.onclick = () => {
  messageEl.value = "";
  passwordEl.value = "";
  outputEl.value = "";
  setStatus("");
};

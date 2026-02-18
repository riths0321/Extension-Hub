📩 Message Encryptor & Decryptor

Securely encrypt and decrypt any message using AES encryption — fast, offline, and private.

🚀 Features

✔ **Web Crypto API (AES-GCM + PBKDF2)** - Military-grade security
✔ **User Password Protection** - No hardcoded keys
✔ **Tabbed Interface** - Separate Encryption & Decryption modes
✔ **Instant & Offline** - No data leaves your device
✔ **Zero Dependencies** - Lightweight (No external libraries)
✔ **Modern UI** - Clean, responsive design

📂 File Structure
/YourExtension/
│── manifest.json
│── popup.html
│── popup.css
│── popup.js
│── icons/
│     ├── icon16.png
│     ├── icon48.png
│     ├── icon128.png

🧠 How It Works

This extension uses the browser's native **Web Crypto API** for maximum security and performance.

1. **Key Derivation (PBKDF2):**
   - Your password is combined with a random **Salt (16 bytes)**.
   - It undergoes **100,000 iterations** of SHA-256 hashing to derive a cryptographic key.

2. **Encryption (AES-GCM):**
   - The message is encrypted using **AES-GCM** (Galois/Counter Mode).
   - A random **IV (Initialization Vector)** is used for every message.
   - The output includes the Salt + IV + Ciphertext (Base64 encoded).

3. **Decryption:**
   - The extension extracts the Salt and IV.
   - It re-derives the key using the same password.
   - It authenticates and decrypts the message.

🛠 Installation (Developer Mode)

1. Download the project folder.
2. Open Chrome → go to: `chrome://extensions/`
3. Enable **Developer Mode** (top-right).
4. Click **Load Unpacked**.
5. Select your extension folder.

The extension will now appear in your browser toolbar.

🧪 Usage

1. Open the extension popup.
2. Select **ENCRYPT** or **DECRYPT** tab.
3. Enter your message/text.
4. Enter a strong **Password**.
5. Click the Action Button (Encrypt/Decrypt).
6. Copy the result using the validation button.

🔒 Security Note

- **No Hardcoded Keys:** Security depends entirely on the password you choose.
- **Client-Side Only:** All operations happen locally. No servers involved.

📜 manifest.json
manifest_version: 3
Permissions: None


# 💻 Code Snippet Manager

### 🧩 Description
**Code Snippet Manager** is a personal library for your most-used code blocks. Whether it's a complex Regex, a standard CSS reset, or a reusable React component, save it here with a title and language tag. Copy it back to your clipboard with a single click.

### 🚀 Features
- **Snippet Library**: Save, Edit, and Delete snippets.
- **Syntax Highlighting**: Supports proper coloring for JS, Python, CSS, etc.
- **Search**: Quickly find snippets by title or content.
- **Smart Copy**: One-click functionality to copy code to clipboard.

### 🛠️ Tech Stack
- **HTML5**: UI structure.
- **CSS3**: Theme and highlighting styles.
- **JavaScript (Vanilla)**: Storage and search logic.
- **Chrome Extension (Manifest V3)**: Storage persistence.

### 📂 Folder Structure
```
CodeSnippetManager/
├── icons/             # Icons
├── content.js         # (Optional) Page integration
├── popup.html         # Library UI
├── popup.js           # Logic
└── manifest.json      # Config
```

### ⚙️ Installation (Developer Mode)
1.  Clone repo.
2.  Open `chrome://extensions/`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked**.
5.  Select `CodeSnippetManager`.

### 🧠 How It Works
1.  **Saving**: Takes user input (Title, Language, Code) and creates an object.
2.  **Persistence**: Saves the array of snippet objects to `chrome.storage.sync`.
3.  **Rendering**: loops through saved snippets and creates DOM elements with syntax highlighting classes.

### 🔐 Permissions Explained
- **`storage`**: Necessary to store your snippets permanently.
- **`activeTab`**: To potentially paste snippets directly (if feature enabled).

### 📸 Screenshots
*(Placeholder for screenshots)*
![Snippet Library](https://via.placeholder.com/600x400?text=Snippet+Library)

### 🔒 Privacy Policy
- **Your Code is Yours**: We do not sync your snippets to any cloud server. They stay in your browser.

### 📄 License
This project is licensed under the **MIT License**.

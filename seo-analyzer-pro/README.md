# 📈 SEO Analyzer Pro

### 🧩 Description
**SEO Analyzer Pro** gives you an instant SEO health check for any webpage. One click reveals critical onsite SEO metrics like Meta Tags, Heading Hierarchy (H1-H6), Image Alt attributes, and internal/external link counts. Optimize your site faster.

### 🚀 Features
- **Meta Data**: Inspect Title, Description, and Keywords.
- **Headings**: Visualizes the H1-H6 structure.
- **Images**: Finds images missing `alt` tags.
- **Links**: Counts broken, internal, and external links.
- **Social**: Checks for Open Graph and Twitter Card tags.

### 🛠️ Tech Stack
- **JavaScript**: DOM traversal.
- **Chrome Extension (Manifest V3)**: Scripting.

### 📂 Folder Structure
```
seo-generator-extension/
├── manifest.json      # Config
├── popup.html         # Report UI
└── content.js         # Scanner
```

### ⚙️ Installation (Developer Mode)
1.  Download source.
2.  Open `chrome://extensions`.
3.  Turn on **Developer mode**.
4.  Load unpacked -> `seo-generator-extension`.

### 🧠 How It Works
1.  **Scan**: Inject `content.js` to query the DOM.
2.  **Extraction**: Gathers data (`document.title`, `meta[name="description"]`, `img`, `a`).
3.  **Report**: Sends data back to the popup for categorization and display.

### 🔐 Permissions Explained
- **`activeTab`**: To scan the current page.
- **`scripting`**: To execute the analysis script.
- **`storage`**: To save preferences or reports.

### 📸 Screenshots
*(Placeholder for screenshots)*
![SEO Report](https://via.placeholder.com/600x400?text=SEO+Report)

### 🔒 Privacy Policy
- **On-Demand**: Scans only when you click the button.
- **Private**: No report data is sent to our servers.

### 📄 License
This project is licensed under the **MIT License**.
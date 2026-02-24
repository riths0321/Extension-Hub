# 🖼️ Image Resizer

### 🧩 Description
**Image Resizer** is a quick utility to resize images for web use. Don't open Photoshop just to shrink a photo. Drag and drop your image, set your target dimensions or percentage, and download the optimized file instantly.

### 🚀 Features
- **Drag & Drop**: Simple interface.
- **Custom Dimensions**: Set Width/Height or Scale %.
- **Format Support**: Supports JPG, PNG, WEBP.
- **Quality Control**: Adjust compression level.

### 🛠️ Tech Stack
- **HTML5**: Canvas and UI.
- **JavaScript**: HTML5 Canvas API for resizing.
- **Chrome Extension (Manifest V3)**: Popup.

### 📂 Folder Structure
```
image-resizer-extension/
├── popup/             # UI files
├── options/           # Settings
└── manifest.json      # Config
```

### ⚙️ Installation (Developer Mode)
1.  Download source.
2.  Open `chrome://extensions`.
3.  Turn on **Developer mode**.
4.  Load unpacked -> `image-resizer-extension`.

### 🧠 How It Works
1.  **Input**: Reads file via `input[type=file]`.
2.  **Canvas**: Draws image onto an off-screen `<canvas>`.
3.  **Resize**: Resamples the canvas to new dimensions.
4.  **Export**: Converts canvas back to Data URL/Blob and triggers download.

### 🔐 Permissions Explained
- **`downloads`**: To save the resized image to your disk.

### 📸 Screenshots
*(Placeholder for screenshots)*
![Resizer Tool](https://via.placeholder.com/600x400?text=Resizer+Tool)

### 🔒 Privacy Policy
- **Local**: Images are processed in-browser. No upload.

### 📄 License
This project is licensed under the **MIT License**.

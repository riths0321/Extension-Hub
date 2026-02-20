/* ================================================
   README Generator — popup.js
   CSP-compliant: No eval(), no inline handlers
   All events attached via addEventListener
   ================================================ */

"use strict";

// ─── DOM refs ───────────────────────────────────
const input       = document.getElementById("projectInput");
const genBtn      = document.getElementById("generateBtn");
const clearBtn    = document.getElementById("clearBtn");
const copyBtn     = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const pre         = document.getElementById("previewArea");
const tplSelect   = document.getElementById("templateSelect");
const licSelect   = document.getElementById("licenseSelect");
const charCount   = document.getElementById("charCount");

let generatedText = "";

// ─── Restore saved prefs ────────────────────────
chrome.storage.sync.get(["template", "license"], (data) => {
  if (data.template && tplSelect) tplSelect.value = data.template;
  if (data.license  && licSelect) licSelect.value  = data.license;
});

// ─── Input handler ──────────────────────────────
input.addEventListener("input", () => {
  const len = input.value.trim().length;
  charCount.textContent = len;

  const ready = len >= 30;
  genBtn.disabled = !ready;
  charCount.parentElement.classList.toggle("ready", ready);
});

// ─── Generate README ────────────────────────────
genBtn.addEventListener("click", () => {
  const text     = input.value.trim();
  const template = tplSelect.value;
  const license  = licSelect.value;

  generatedText = buildReadme(text, template, license);
  pre.textContent = generatedText;

  copyBtn.disabled     = false;
  downloadBtn.disabled = false;
});

// ─── Copy ───────────────────────────────────────
copyBtn.addEventListener("click", () => {
  if (!generatedText) return;
  navigator.clipboard.writeText(generatedText).then(() => {
    flash(copyBtn, "✓ Copied!", "flash-success");
  });
});

// ─── Download ───────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!generatedText) return;
  const blob = new Blob([generatedText], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "README.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  flash(downloadBtn, "✓ Saved!", "flash-success");
});

// ─── Clear ──────────────────────────────────────
clearBtn.addEventListener("click", () => {
  input.value        = "";
  pre.textContent    = "Your README will appear here…\n\nStart by describing your project above, then hit Generate!";
  generatedText      = "";
  charCount.textContent = "0";
  charCount.parentElement.classList.remove("ready");

  genBtn.disabled      = true;
  copyBtn.disabled     = true;
  downloadBtn.disabled = true;
});

// ─── Save prefs on change ───────────────────────
tplSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ template: tplSelect.value });
});

licSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ license: licSelect.value });
});

// ─── README builder ─────────────────────────────
function buildReadme(text, mode, license) {
  const lines    = text.split("\n").map(l => l.trim()).filter(Boolean);
  const title    = deriveTitle(lines);
  const desc     = lines.slice(0, 4).join(" ");
  const features = extractFeatures(lines);
  const badges   = buildBadges(license);

  if (mode === "minimal") {
    return [
      `# ${title}`,
      "",
      desc,
      "",
      features.length ? `## Features\n${features.map(f => `- ${f}`).join("\n")}` : "",
      "",
      license !== "none" ? `## License\n${license}` : ""
    ].filter(s => s !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (mode === "full") {
    return [
      badges,
      "",
      `# ${title}`,
      "",
      `> ${desc}`,
      "",
      "## 📋 Table of Contents",
      "- [Overview](#overview)",
      "- [Features](#features)",
      "- [Installation](#installation)",
      "- [Usage](#usage)",
      "- [Contributing](#contributing)",
      "- [License](#license)",
      "",
      "## 🔍 Overview",
      desc,
      "",
      "## ✨ Features",
      features.length
        ? features.map(f => `- ✅ ${f}`).join("\n")
        : "- Feature one\n- Feature two",
      "",
      "## 🚀 Installation",
      "```bash\n# Clone the repository\ngit clone https://github.com/username/repo.git\n\n# Navigate to project directory\ncd repo\n\n# Install dependencies\nnpm install\n```",
      "",
      "## 💡 Usage",
      "```bash\nnpm start\n```",
      "",
      "## 🤝 Contributing",
      "Contributions are welcome! Please open an issue or submit a pull request.",
      "",
      "1. Fork the project",
      "2. Create your feature branch (`git checkout -b feature/AmazingFeature`)",
      "3. Commit your changes (`git commit -m 'Add AmazingFeature'`)",
      "4. Push to the branch (`git push origin feature/AmazingFeature`)",
      "5. Open a Pull Request",
      "",
      license !== "none" ? `## 📄 License\nDistributed under the ${license} License. See \`LICENSE\` for details.` : ""
    ].filter(s => s !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // Standard (default)
  return [
    `# ${title}`,
    "",
    desc,
    "",
    "## Features",
    features.length
      ? features.map(f => `- ${f}`).join("\n")
      : "- Feature one\n- Feature two",
    "",
    "## Installation",
    "```bash\nnpm install\n```",
    "",
    "## Usage",
    "```bash\nnpm start\n```",
    "",
    license !== "none" ? `## License\n${license}` : ""
  ].filter(s => s !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function deriveTitle(lines) {
  // If first line looks like a heading, strip the #
  const first = lines[0] || "My Project";
  return first.replace(/^#+\s*/, "").replace(/^[-*•]\s*/, "").trim() || "My Project";
}

function extractFeatures(lines) {
  const featureLines = lines.filter(l => /^[-*•]/.test(l));
  if (featureLines.length) {
    return featureLines.map(l => l.replace(/^[-*•]\s*/, "").trim());
  }
  // Fallback: pull meaningful phrases from the text
  return [];
}

function buildBadges(license) {
  const shields = [];
  if (license !== "none") {
    shields.push(`![License](https://img.shields.io/badge/license-${encodeURIComponent(license)}-blue.svg)`);
  }
  shields.push("![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)");
  return shields.join(" ");
}

// ─── Button flash helper ─────────────────────────
function flash(btn, label, cssClass) {
  // Save original nodes safely
  const originalNodes = Array.from(btn.childNodes);

  // Clear button content safely
  btn.replaceChildren();
  const span = document.createElement("span");
  span.textContent = label;
  btn.appendChild(span);

  if (cssClass) btn.classList.add(cssClass);

  setTimeout(() => {
    btn.replaceChildren(...originalNodes);
    if (cssClass) btn.classList.remove(cssClass);
  }, 1400);
}

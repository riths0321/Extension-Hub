/* ================================================
   README Generator — popup.js  v2.0
   CSP-compliant · No eval() · No inline handlers
   ================================================ */

"use strict";

// ─── DOM refs ───────────────────────────────────
const input       = document.getElementById("projectInput");
const genBtn      = document.getElementById("generateBtn");
const clearBtn    = document.getElementById("clearBtn");
const copyBtn     = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const pre         = document.getElementById("previewArea");
const resultBox   = document.getElementById("resultBox");
const tplSelect   = document.getElementById("templateSelect");
const licSelect   = document.getElementById("licenseSelect");
const charCount   = document.getElementById("charCount");
const wordChip    = document.getElementById("wordChip");
const wordCount   = document.getElementById("wordCount");
const customSelects = Array.from(document.querySelectorAll("[data-select-wrapper]"));

let generatedText = "";

// ─── Restore saved prefs ────────────────────────
chrome.storage.sync.get(["template", "license", "lastInput"], (data) => {
  if (data.template && tplSelect) tplSelect.value = data.template;
  if (data.license  && licSelect) licSelect.value  = data.license;
  if (data.lastInput && input) {
    input.value = data.lastInput;
    updateCharCount();
  }
  syncCustomSelect(tplSelect);
  syncCustomSelect(licSelect);
});

// ─── Input handler ──────────────────────────────
function updateCharCount() {
  const len = input.value.trim().length;
  charCount.textContent = len;
  const ready = len >= 30;
  genBtn.disabled = !ready;
  charCount.parentElement.classList.toggle("ready", ready);
}

input.addEventListener("input", () => {
  updateCharCount();
  // Debounced save
  clearTimeout(input._saveTimer);
  input._saveTimer = setTimeout(() => {
    chrome.storage.sync.set({ lastInput: input.value });
  }, 800);
});

// ─── Generate README ────────────────────────────
genBtn.addEventListener("click", () => {
  const text     = input.value.trim();
  const template = tplSelect.value;
  const license  = licSelect.value;

  // Loading state
  genBtn.classList.add("loading");
  genBtn.querySelector(".btn-text").textContent = "Generating...";

  // Simulate brief async for UX polish
  setTimeout(() => {
    generatedText = buildReadme(text, template, license);
    pre.textContent = generatedText;

    // Word count
    const wc = generatedText.split(/\s+/).filter(Boolean).length;
    wordCount.textContent = wc;
    wordChip.classList.add("visible");
    resultBox.classList.add("has-content");

    copyBtn.disabled     = false;
    downloadBtn.disabled = false;

    genBtn.classList.remove("loading");
    genBtn.querySelector(".btn-text").textContent = "GENERATE README";

    // Scroll result into view
    pre.scrollTop = 0;
  }, 320);
});

// ─── Copy ───────────────────────────────────────
copyBtn.addEventListener("click", () => {
  if (!generatedText) return;
  copyToClipboard(generatedText)
    .then(() => {
      flash(copyBtn, "Copied", "flash-success");
    })
    .catch(() => {
      flash(copyBtn, "Copy failed", "flash-error");
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
  flash(downloadBtn, "Saved", "flash-success");
});

// ─── Clear ──────────────────────────────────────
clearBtn.addEventListener("click", () => {
  input.value           = "";
  pre.textContent       = "Your README will appear here.\n\nDescribe your project above and select a template to generate a polished draft.";
  generatedText         = "";
  charCount.textContent = "0";
  charCount.parentElement.classList.remove("ready");
  wordChip.classList.remove("visible");
  resultBox.classList.remove("has-content");

  genBtn.disabled      = true;
  copyBtn.disabled     = true;
  downloadBtn.disabled = true;
  chrome.storage.sync.remove("lastInput");
});

// ─── Save prefs on change ───────────────────────
tplSelect.addEventListener("change", () => chrome.storage.sync.set({ template: tplSelect.value }));
licSelect.addEventListener("change", () => chrome.storage.sync.set({ license:  licSelect.value }));

customSelects.forEach((wrapper) => {
  const trigger = wrapper.querySelector("[data-select-trigger]");
  const menu = wrapper.querySelector("[data-select-menu]");
  const select = document.getElementById(trigger.dataset.target);
  const options = Array.from(menu.querySelectorAll(".select-option"));

  trigger.addEventListener("click", () => {
    const isOpen = wrapper.classList.contains("is-open");
    closeAllCustomSelects();
    if (!isOpen) {
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      select.value = option.dataset.value;
      syncCustomSelect(select);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeAllCustomSelects();
    });
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-select-wrapper]")) {
    closeAllCustomSelects();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllCustomSelects();
  }
});

// ─── README builder ─────────────────────────────
function buildReadme(text, mode, license) {
  const lines    = text.split("\n").map(l => l.trim()).filter(Boolean);
  const title    = deriveTitle(lines);
  const desc     = buildDescription(lines);
  const features = extractFeatures(lines);
  const tech     = extractTech(text);

  if (mode === "minimal") {
    return assemble([
      `# ${title}`,
      "",
      desc,
      "",
      features.length ? `## Features\n\n${features.map(f => `- ${f}`).join("\n")}` : "",
      "",
      tech.length ? `## Tech Stack\n\n${tech.map(t => `- ${t}`).join("\n")}` : "",
      "",
      license !== "none" ? `## License\n\nThis project is licensed under the **${license}** license.` : ""
    ]);
  }

  if (mode === "full") {
    return assemble([
      `<div align="center">`,
      "",
      `# ${title}`,
      "",
      `### ${desc}`,
      "",
      `</div>`,
      "",
      "---",
      "",
      "## Overview",
      "",
      desc,
      "",
      "---",
      "",
      "## Features",
      "",
      features.length
        ? features.map(f => `- ${f}`).join("\n")
        : "- Feature one\n- Feature two\n- Feature three",
      "",
      tech.length ? [
        "---",
        "",
        "## Tech Stack",
        "",
        tech.map(t => `| \`${t}\` | Included |`).join("\n"),
        ""
      ].join("\n") : "",
      "---",
      "",
      "## Installation",
      "",
      "```bash",
      "# 1. Clone the repository",
      `git clone https://github.com/username/${slugify(title)}.git`,
      "",
      "# 2. Navigate to the project directory",
      `cd ${slugify(title)}`,
      "",
      "# 3. Install dependencies",
      "npm install",
      "```",
      "",
      "---",
      "",
      "## Usage",
      "",
      "```bash",
      "npm start",
      "```",
      "",
      "---",
      "",
      "## Contributing",
      "",
      "Contributions are welcome and appreciated!",
      "",
      "1. Fork the project",
      "2. Create your feature branch: `git checkout -b feature/AmazingFeature`",
      "3. Commit your changes: `git commit -m 'Add AmazingFeature'`",
      "4. Push to the branch: `git push origin feature/AmazingFeature`",
      "5. Open a Pull Request",
      "",
      license !== "none" ? [
        "---",
        "",
        "## License",
        "",
        `Distributed under the **${license}** License. See \`LICENSE\` for more information.`,
        ""
      ].join("\n") : ""
    ]);
  }

  // ── Standard (default) ──
  return assemble([
    `# ${title}`,
    "",
    desc,
    "",
    "## Features",
    "",
    features.length
      ? features.map(f => `- ${f}`).join("\n")
      : "- Feature one\n- Feature two\n- Feature three",
    "",
    tech.length ? `## Tech Stack\n\n${tech.map(t => `- ${t}`).join("\n")}` : "",
    "",
    "## Installation",
    "",
    "```bash",
    "npm install",
    "```",
    "",
    "## Usage",
    "",
    "```bash",
    "npm start",
    "```",
    "",
    license !== "none" ? `## License\n\nThis project is licensed under the **${license}** license.` : ""
  ]);
}

// ─── Helpers ────────────────────────────────────

function assemble(parts) {
  return parts
    .filter(s => s !== undefined && s !== null)
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function deriveTitle(lines) {
  const first = lines[0] || "My Project";
  return first.replace(/^#+\s*/, "").replace(/^[-*•]\s*/, "").trim() || "My Project";
}

function buildDescription(lines) {
  // Skip the title line, grab the next meaningful sentences
  const rest = lines.slice(1).filter(l => !/^[-*•#]/.test(l));
  return rest.slice(0, 3).join(" ").trim() || lines.slice(0, 2).join(" ").trim();
}

function extractFeatures(lines) {
  const bulletLines = lines.filter(l => /^[-*•]/.test(l));
  if (bulletLines.length) {
    return bulletLines.map(l => l.replace(/^[-*•]\s*/, "").trim());
  }
  // Fallback: detect feature-like sentences (containing "support", "allow", "enable", etc.)
  const featureWords = /\b(support|allow|enable|provide|feature|include|offer|built|create|manage|track|generate|automate)\b/i;
  return lines.filter(l => featureWords.test(l)).slice(0, 5);
}

function extractTech(text) {
  const known = [
    "React","Vue","Angular","Svelte","Next.js","Nuxt","Remix",
    "Node.js","Express","Fastify","NestJS","Django","Flask","FastAPI",
    "TypeScript","JavaScript","Python","Rust","Go","Java","Kotlin","Swift",
    "PostgreSQL","MySQL","MongoDB","Redis","SQLite","Supabase","Firebase",
    "Docker","Kubernetes","AWS","Azure","GCP","Vercel","Netlify",
    "Tailwind","Bootstrap","Sass","GraphQL","REST","WebSocket",
    "Prisma","Drizzle","Mongoose","SQLAlchemy"
  ];
  const found = known.filter(t => new RegExp(`\\b${t.replace(".", "\\.")}\\b`, "i").test(text));
  return [...new Set(found)].slice(0, 8);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-project";
}

// ─── Button flash helper ─────────────────────────
function flash(btn, label, cssClass) {
  const originalNodes = Array.from(btn.childNodes);
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

function copyToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }

  return fallbackCopy(text);
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const didCopy = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (didCopy) {
        resolve();
        return;
      }
    } catch (error) {
      document.body.removeChild(textarea);
      reject(error);
      return;
    }

    reject(new Error("Copy command was not successful."));
  });
}

function syncCustomSelect(select) {
  if (!select) return;
  const wrapper = select.closest("[data-select-wrapper]");
  if (!wrapper) return;

  const triggerText = wrapper.querySelector(".select-trigger-text");
  const options = Array.from(wrapper.querySelectorAll(".select-option"));
  const selectedOption = options.find((option) => option.dataset.value === select.value);
  const selectedLabel = selectedOption ? selectedOption.textContent : select.value;

  triggerText.textContent = selectedLabel;

  options.forEach((option) => {
    const isSelected = option.dataset.value === select.value;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function closeAllCustomSelects() {
  customSelects.forEach((wrapper) => {
    wrapper.classList.remove("is-open");
    const trigger = wrapper.querySelector("[data-select-trigger]");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

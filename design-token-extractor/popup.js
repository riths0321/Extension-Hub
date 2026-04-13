class TokenGenerator {
  constructor() {
    this.scanBtn = document.getElementById("scanBtn");
    this.copyBtn = document.getElementById("copyBtn");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.clearBtn = document.getElementById("clearBtn");

    this.loading = document.getElementById("loading");
    this.results = document.getElementById("results");
    this.output = document.getElementById("output");
    this.stats = document.getElementById("stats");
    this.format = document.getElementById("format");

    this.bindEvents();
  }

  bindEvents() {
    this.scanBtn.addEventListener("click", () => this.scanPage());
    this.copyBtn.addEventListener("click", () => this.copyOutput());
    this.downloadBtn.addEventListener("click", () => this.downloadOutput());
    this.clearBtn.addEventListener("click", () => this.clearOutput());
  }

  getSelectedCategories() {
    return {
      colors: document.getElementById("colors").checked,
      typography: document.getElementById("typography").checked,
      spacing: document.getElementById("spacing").checked,
      shadows: document.getElementById("shadows").checked,
      borderRadius: document.getElementById("borderRadius").checked,
      breakpoints: document.getElementById("breakpoints").checked
    };
  }

  setLoading(isLoading) {
    this.loading.classList.toggle("hidden", !isLoading);
    this.scanBtn.disabled = isLoading;
  }

  showResults() {
    this.results.classList.remove("hidden");
  }

  async scanPage() {
    this.setLoading(true);
    this.output.value = "";
    this.stats.textContent = "";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^https?:/i.test(tab.url || "")) {
        throw new Error("Open a normal website tab and try again.");
      }

      const payload = { action: "extractTokens" };
      let response;

      try {
        response = await chrome.tabs.sendMessage(tab.id, payload);
      } catch {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        response = await chrome.tabs.sendMessage(tab.id, payload);
      }

      if (!response?.success) {
        throw new Error(response?.error || "Token extraction failed on this page.");
      }

      const generated = this.generateCode(response.tokens, this.format.value);
      this.output.value = generated;
      this.showResults();
      this.updateStats(response.tokens);
    } catch (error) {
      this.output.value = `Error: ${error.message}`;
      this.showResults();
      this.stats.textContent = "Scan failed.";
    } finally {
      this.setLoading(false);
    }
  }

  filterTokens(tokens) {
    const selected = this.getSelectedCategories();
    const filtered = {};

    Object.keys(selected).forEach((category) => {
      const value = tokens?.[category];
      if (selected[category] && value && value.length > 0) {
        filtered[category] = value;
      }
    });

    return filtered;
  }

  generateCode(tokens, format) {
    const filtered = this.filterTokens(tokens || {});

    try {
      const generator = new TemplateGenerator(filtered);
      return generator.generate(format);
    } catch {
      if (format === "json") return JSON.stringify(filtered, null, 2);
      if (format === "css") {
        const lines = [":root {"];
        (filtered.colors || []).forEach((c, i) => lines.push(`  --color-${i + 1}: ${c.value};`));
        lines.push("}");
        return lines.join("\n");
      }
      return "Unable to generate this format for extracted tokens.";
    }
  }

  async copyOutput() {
    const content = this.output.value.trim();
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      const prev = this.copyBtn.textContent;
      this.copyBtn.textContent = "Copied";
      setTimeout(() => {
        this.copyBtn.textContent = prev;
      }, 1300);
    } catch {
      this.stats.textContent = "Clipboard blocked. Use manual copy.";
    }
  }

  downloadOutput() {
    const content = this.output.value;
    if (!content.trim()) return;

    const format = this.format.value;
    const ext = format === "tailwind" ? "js" : format === "json" ? "json" : format;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `design-tokens.${ext}`;
    link.click();

    URL.revokeObjectURL(url);
  }

  clearOutput() {
    this.output.value = "";
    this.stats.textContent = "Cleared.";
  }

  updateStats(tokens) {
    const map = [
      ["colors", "colors"],
      ["typography", "font styles"],
      ["spacing", "spacing values"],
      ["shadows", "shadows"],
      ["borderRadius", "radius values"],
      ["breakpoints", "breakpoints"]
    ];

    const chunks = map
      .map(([key, label]) => {
        const count = Array.isArray(tokens[key]) ? tokens[key].length : 0;
        return count > 0 ? `${count} ${label}` : "";
      })
      .filter(Boolean);

    this.stats.textContent = chunks.length ? `Found: ${chunks.join(", ")}` : "No tokens found.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new TokenGenerator();
});

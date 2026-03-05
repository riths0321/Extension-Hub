class JobShieldPopup {
  constructor() {
    this.maxHistory = 60;
    this.lastResult = null;
    this.settings = {
      autoScan: true,
      showBadge: true,
      enableSound: true,
      sensitivityLevel: "medium"
    };

    this.initRefs();
    this.bindEvents();
    this.bootstrap();
  }

  initRefs() {
    this.statusCard = document.getElementById("statusCard");
    this.statusGlyph = document.getElementById("statusGlyph");
    this.statusTitle = document.getElementById("statusTitle");
    this.statusSubtitle = document.getElementById("statusSubtitle");
    this.scoreFill = document.getElementById("scoreFill");
    this.scoreLabel = document.getElementById("scoreLabel");

    this.wordsScanned = document.getElementById("wordsScanned");
    this.analysisTime = document.getElementById("analysisTime");
    this.domainInfo = document.getElementById("domainInfo");
    this.flagsList = document.getElementById("flagsList");

    this.rescanBtn = document.getElementById("rescanBtn");
    this.viewHistoryBtn = document.getElementById("viewHistoryBtn");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.clearHistoryBtn = document.getElementById("clearHistoryBtn");
    this.hintText = document.getElementById("hintText");

    this.historyModal = document.getElementById("historyModal");
    this.settingsModal = document.getElementById("settingsModal");
    this.historyList = document.getElementById("historyList");

    this.autoScan = document.getElementById("autoScan");
    this.showBadge = document.getElementById("showBadge");
    this.enableSound = document.getElementById("enableSound");
    this.sensitivityLevel = document.getElementById("sensitivityLevel");
  }

  bindEvents() {
    this.rescanBtn.addEventListener("click", () => this.analyzeCurrentTab(true));
    this.viewHistoryBtn.addEventListener("click", () => this.openHistory());
    this.settingsBtn.addEventListener("click", () => this.openModal(this.settingsModal));
    this.clearHistoryBtn.addEventListener("click", () => this.clearHistory());

    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) this.closeModal(modal);
      });
    });

    [this.historyModal, this.settingsModal].forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) this.closeModal(modal);
      });
    });

    [this.autoScan, this.showBadge, this.enableSound, this.sensitivityLevel].forEach((el) => {
      el.addEventListener("change", () => this.saveSettings());
    });
  }

  async bootstrap() {
    await this.loadSettings();
    await this.analyzeCurrentTab(false);
  }

  async loadSettings() {
    const data = await chrome.storage.local.get(Object.keys(this.settings));
    this.settings = { ...this.settings, ...data };

    this.autoScan.checked = this.settings.autoScan !== false;
    this.showBadge.checked = this.settings.showBadge !== false;
    this.enableSound.checked = this.settings.enableSound !== false;
    this.sensitivityLevel.value = this.settings.sensitivityLevel || "medium";
  }

  async saveSettings() {
    this.settings = {
      autoScan: this.autoScan.checked,
      showBadge: this.showBadge.checked,
      enableSound: this.enableSound.checked,
      sensitivityLevel: this.sensitivityLevel.value
    };
    await chrome.storage.local.set(this.settings);
  }

  setScanningState() {
    this.statusCard.className = "status-card scanning";
    this.statusGlyph.textContent = "⏳";
    this.statusTitle.textContent = "Analyzing current page";
    this.statusSubtitle.textContent = "Checking job content for scam signals";
    this.scoreFill.style.width = "0%";
    this.scoreFill.style.background = "var(--brand)";
    this.scoreLabel.textContent = "0 / 100";
    this.flagsList.replaceChildren(this.makeEmpty("Scanning for risk signals..."));
    this.hintText.textContent = "All analysis is local on your browser.";
  }

  setErrorState(message) {
    this.statusCard.className = "status-card warning";
    this.statusGlyph.textContent = "⚠️";
    this.statusTitle.textContent = message;
    this.statusSubtitle.textContent = "Open a normal website tab and try again.";
    this.scoreFill.style.width = "0%";
    this.scoreLabel.textContent = "-";
    this.flagsList.replaceChildren(this.makeEmpty("Unable to scan this page."));
  }

  makeEmpty(text) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = text;
    return li;
  }

  async analyzeCurrentTab(force) {
    try {
      this.setScanningState();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || !tab.url || !/^https?:/i.test(tab.url)) {
        this.setErrorState("This tab cannot be scanned");
        return;
      }

      const message = {
        action: "analyzePage",
        sensitivity: this.sensitivityLevel.value,
        force: Boolean(force)
      };

      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        response = await chrome.tabs.sendMessage(tab.id, message);
      }

      if (!response || response.error) {
        this.setErrorState(response?.error || "No response from scanner");
        return;
      }

      this.lastResult = response;
      this.paintResult(response);
      await this.persistHistory(response, tab.url);

      if (this.settings.enableSound && response.status !== "safe") {
        this.playTone(response.status);
      }
    } catch {
      this.setErrorState("Scan failed");
    }
  }

  paintResult(result) {
    const normalizedStatus = result.status || this.statusFromScore(Number(result.riskScore || 0));
    const statusMeta = {
      safe: { title: "Low risk detected", subtitle: "No major scam patterns found", glyph: "✅", color: "var(--good)" },
      suspicious: { title: "Caution advised", subtitle: "Some suspicious signals were found", glyph: "⚠️", color: "var(--warn)" },
      danger: { title: "High risk detected", subtitle: "Strong scam indicators found", glyph: "⛔", color: "var(--bad)" }
    }[normalizedStatus] || { title: "Caution advised", subtitle: "Some suspicious signals were found", glyph: "⚠️", color: "var(--warn)" };

    this.statusCard.className = `status-card ${normalizedStatus === "suspicious" ? "warning" : normalizedStatus}`;
    this.statusGlyph.textContent = statusMeta.glyph;
    this.statusTitle.textContent = statusMeta.title;
    this.statusSubtitle.textContent = statusMeta.subtitle;

    this.scoreFill.style.width = `${result.riskScore}%`;
    this.scoreFill.style.background = statusMeta.color;
    this.scoreLabel.textContent = `${Math.round(result.riskScore)} / 100`;

    this.wordsScanned.textContent = Number(result.wordsScanned || 0).toLocaleString();
    this.analysisTime.textContent = `${result.analysisTime || 0} ms`;
    this.domainInfo.textContent = result.domain || "Unknown";

    this.renderFlags(result.redFlags || []);
    this.hintText.textContent = normalizedStatus === "safe"
      ? "Looks cleaner than typical scam pages."
      : "Verify company details before sharing personal info.";
  }

  statusFromScore(score) {
    if (score < 30) return "safe";
    if (score < 70) return "suspicious";
    return "danger";
  }

  renderFlags(flags) {
    this.flagsList.replaceChildren();
    if (!flags.length) {
      this.flagsList.appendChild(this.makeEmpty("No strong scam signals found."));
      return;
    }

    flags.forEach((flag) => {
      const li = document.createElement("li");
      li.className = `flag-${flag.level || "low"}`;

      const title = document.createElement("strong");
      title.textContent = `${flag.type}: `;
      li.appendChild(title);

      const text = document.createTextNode(flag.description || "Potential risk detected");
      li.appendChild(text);

      this.flagsList.appendChild(li);
    });
  }

  async persistHistory(result, url) {
    const { scanHistory = [] } = await chrome.storage.local.get(["scanHistory"]);
    const domain = result.domain || this.safeDomain(url);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      domain,
      riskScore: Number(result.riskScore || 0),
      status: result.status || "safe",
      flagCount: Array.isArray(result.redFlags) ? result.redFlags.length : 0,
      flags: Array.isArray(result.redFlags) ? result.redFlags.map((f) => f.type) : [],
      scannedAt: new Date().toISOString()
    };

    const next = [entry, ...scanHistory].slice(0, this.maxHistory);
    await chrome.storage.local.set({ scanHistory: next });
  }

  safeDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  }

  async openHistory() {
    const { scanHistory = [] } = await chrome.storage.local.get(["scanHistory"]);
    this.historyList.replaceChildren();

    if (!scanHistory.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No history yet.";
      this.historyList.appendChild(empty);
      this.openModal(this.historyModal);
      return;
    }

    scanHistory.forEach((entry) => {
      const item = document.createElement("article");
      item.className = `history-item ${entry.status}`;

      const domain = document.createElement("div");
      domain.className = "history-domain truncate";
      domain.textContent = entry.domain || "unknown";

      const meta = document.createElement("div");
      meta.className = "history-meta";
      const d = new Date(entry.scannedAt);
      meta.textContent = `${d.toLocaleString()} | Risk ${Math.round(entry.riskScore)}/100 | Flags ${entry.flagCount}`;

      item.append(domain, meta);
      this.historyList.appendChild(item);
    });

    this.openModal(this.historyModal);
  }

  async clearHistory() {
    await chrome.storage.local.set({ scanHistory: [] });
    this.historyList.replaceChildren(this.makeEmpty("No history yet."));
  }

  openModal(modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  closeModal(modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  playTone(status) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.value = status === "danger" ? 280 : 420;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch {
      // Ignore audio errors.
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new JobShieldPopup();
});

(() => {
  if (window.__jobshieldLoaded) return;
  window.__jobshieldLoaded = true;

  class JobPageAnalyzer {
    constructor() {
      this.settings = { sensitivity: "medium" };
      this.badgeInjected = false;
      this.badgeRoot = null;
      this.patterns = this.buildPatterns();
      this.listen();
      this.bootstrap();
    }

    async bootstrap() {
      const data = await chrome.storage.local.get(["showBadge", "autoScan", "sensitivityLevel"]);
      this.settings.sensitivity = data.sensitivityLevel || "medium";

      if (data.showBadge !== false && this.isJobLikePage()) {
        this.injectBadge();
      }

      if (data.autoScan !== false && this.isJobLikePage()) {
        setTimeout(() => {
          const result = this.analyzePage();
          this.updateBadge(result);
        }, 900);
      }
    }

    buildPatterns() {
      return {
        payment: {
          level: "high",
          description: "Mentions upfront fee or money transfer.",
          regex: [
            /registration\s*(fee|payment|charge)/gi,
            /pay\s*(for|to)\s*(apply|application|process)/gi,
            /upfront\s*(payment|fee|cost)/gi,
            /money\s*(transfer|deposit|advance)/gi
          ]
        },
        urgency: {
          level: "medium",
          description: "Creates urgency pressure to apply immediately.",
          regex: [
            /urgent\s*(hiring|required|position)/gi,
            /apply\s*(now|immediately|asap)/gi,
            /limited\s*(spots|time|offer)/gi,
            /last\s*(chance|opportunity)/gi
          ]
        },
        contact: {
          level: "high",
          description: "Asks for unprofessional contact channels.",
          regex: [
            /whatsapp\s*(only|contact|message)/gi,
            /telegram\s*(only|contact|message)/gi,
            /personal\s*email\s*(only|required)/gi,
            /text\s*(only|message)\s*to/gi
          ]
        },
        salary: {
          level: "medium",
          description: "Promises unrealistic or guaranteed high income.",
          regex: [
            /guaranteed\s*(salary|income|earning)/gi,
            /no\s*experience\s*high\s*pay/gi,
            /earn\s*\$?\d+[kK]?\s*(per|\/)?\s*(week|month|day)/gi,
            /easy\s*(money|income|cash)/gi
          ]
        },
        process: {
          level: "medium",
          description: "Suspiciously easy hiring process.",
          regex: [
            /no\s*(interview|skills|experience)\s*required/gi,
            /instant\s*(hiring|selection|approval)/gi,
            /auto\s*(selection|approval)/gi
          ]
        },
        remoteScam: {
          level: "high",
          description: "Common remote-work scam terminology.",
          regex: [
            /mystery\s*shopper/gi,
            /package\s*(forwarding|handling|reshipping)/gi,
            /payment\s*processing\s*job/gi,
            /data\s*entry\s*\$\d+/gi
          ]
        }
      };
    }

    listen() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action !== "analyzePage") return;
        try {
          this.settings.sensitivity = request.sensitivity || this.settings.sensitivity;
          const result = this.analyzePage();
          this.updateBadge(result);
          sendResponse(result);
        } catch (err) {
          sendResponse({ error: err.message || "Analyzer error" });
        }
        return true;
      });
    }

    analyzePage() {
      const start = performance.now();
      const text = this.extractText();
      const wordsScanned = text.split(/\s+/).filter(Boolean).length;
      const redFlags = this.findFlags(text);
      const riskScore = this.computeRiskScore(redFlags);
      const status = this.getStatus(riskScore);

      return {
        riskScore,
        status,
        redFlags,
        wordsScanned,
        analysisTime: Math.max(1, Math.round(performance.now() - start)),
        domain: this.getDomain()
      };
    }

    extractText() {
      const selectors = [
        "main",
        "article",
        "[class*='job']",
        "[id*='job']",
        "section",
        "body"
      ];

      let merged = "";
      selectors.forEach((selector) => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((node) => {
          const text = node?.innerText || "";
          if (text.length > 25) merged += ` ${text}`;
        });
      });

      return merged.toLowerCase();
    }

    findFlags(text) {
      const output = [];
      const thresholdBySensitivity = {
        low: { low: 4, medium: 2, high: 1 },
        medium: { low: 2, medium: 1, high: 1 },
        high: { low: 1, medium: 1, high: 1 }
      };
      const activeThreshold = thresholdBySensitivity[this.settings.sensitivity] || thresholdBySensitivity.medium;

      Object.entries(this.patterns).forEach(([key, config]) => {
        let total = 0;
        config.regex.forEach((rx) => {
          const clone = new RegExp(rx.source, rx.flags);
          const matches = text.match(clone);
          if (matches) total += matches.length;
        });

        if (total >= activeThreshold[config.level]) {
          output.push({
            type: this.prettyName(key),
            level: config.level,
            description: config.description,
            count: total
          });
        }
      });

      const order = { high: 3, medium: 2, low: 1 };
      output.sort((a, b) => order[b.level] - order[a.level]);
      return output;
    }

    computeRiskScore(flags) {
      const weights = { high: 18, medium: 11, low: 6 };
      let score = 0;

      flags.forEach((flag) => {
        score += (weights[flag.level] || 5) * Math.min(flag.count, 5);
      });

      const mult = { low: 0.8, medium: 1, high: 1.25 }[this.settings.sensitivity] || 1;
      score *= mult;
      return Math.min(100, Math.round(score));
    }

    getStatus(score) {
      if (score < 30) return "safe";
      if (score < 70) return "suspicious";
      return "danger";
    }

    prettyName(key) {
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
    }

    getDomain() {
      try {
        return new URL(window.location.href).hostname;
      } catch {
        return "unknown";
      }
    }

    isJobLikePage() {
      const url = window.location.href.toLowerCase();
      const marker = ["job", "jobs", "career", "hiring", "employment", "position"];
      return marker.some((term) => url.includes(term));
    }

    injectBadge() {
      if (this.badgeInjected || document.getElementById("jobshield-badge")) return;

      const root = document.createElement("div");
      root.id = "jobshield-badge";
      root.setAttribute("role", "status");

      const wrap = document.createElement("div");
      wrap.className = "js-wrap";

      const dot = document.createElement("span");
      dot.className = "js-dot";
      dot.textContent = "🛡️";

      const text = document.createElement("div");
      text.className = "js-text";

      const title = document.createElement("div");
      title.id = "jobshield-badge-title";
      title.textContent = "JobShield scanning...";

      const sub = document.createElement("div");
      sub.id = "jobshield-badge-sub";
      sub.textContent = "Risk: -";

      const close = document.createElement("button");
      close.className = "js-close";
      close.type = "button";
      close.setAttribute("aria-label", "Hide JobShield badge");
      close.textContent = "×";

      text.append(title, sub);
      wrap.append(dot, text, close);
      root.appendChild(wrap);
      document.documentElement.appendChild(root);

      close.addEventListener("click", () => {
        root.remove();
        this.badgeInjected = false;
      });

      this.injectBadgeStyles();
      this.badgeInjected = true;
      this.badgeRoot = root;
    }

    injectBadgeStyles() {
      if (document.getElementById("jobshield-badge-style")) return;
      const style = document.createElement("style");
      style.id = "jobshield-badge-style";
      style.textContent = `
        #jobshield-badge {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 2147483647;
          background: #111827;
          border: 1px solid #2d3d56;
          border-radius: 10px;
          color: #e5ecfb;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          max-width: 290px;
          min-width: 230px;
        }
        #jobshield-badge .js-wrap { display: flex; gap: 8px; align-items: center; padding: 8px 10px; }
        #jobshield-badge .js-dot { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; background: #1f2937; }
        #jobshield-badge .js-text { flex: 1; min-width: 0; }
        #jobshield-badge-title { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #jobshield-badge-sub { font-size: 11px; color: #a9bad6; }
        #jobshield-badge .js-close { border: 0; background: transparent; color: #8fa4c7; font-size: 18px; line-height: 1; cursor: pointer; }
        #jobshield-badge.safe .js-dot { background: rgba(52, 211, 153, 0.2); }
        #jobshield-badge.suspicious .js-dot { background: rgba(251, 191, 36, 0.2); }
        #jobshield-badge.danger .js-dot { background: rgba(248, 113, 113, 0.2); }
      `;
      document.documentElement.appendChild(style);
    }

    updateBadge(result) {
      if (!this.badgeInjected && this.isJobLikePage()) this.injectBadge();
      const badge = this.badgeRoot || document.getElementById("jobshield-badge");
      if (!badge) return;

      badge.classList.remove("safe", "suspicious", "danger");
      badge.classList.add(result.status);

      const title = badge.querySelector("#jobshield-badge-title");
      const sub = badge.querySelector("#jobshield-badge-sub");
      if (!title || !sub) return;

      const map = {
        safe: "Low risk",
        suspicious: "Caution",
        danger: "High risk"
      };

      title.textContent = `JobShield: ${map[result.status] || "Scan"}`;
      sub.textContent = `Risk ${Math.round(result.riskScore)} / 100 · Flags ${result.redFlags.length}`;
    }
  }

  new JobPageAnalyzer();
})();

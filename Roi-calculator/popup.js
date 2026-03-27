document.addEventListener("DOMContentLoaded", () => {

  // ============ STORAGE ABSTRACTION ============
  // Works in both Chrome Extension and standalone browser
  const storage = {
    get(keys) {
      if (typeof chrome !== "undefined" && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.get(keys, resolve));
      }
      const result = {};
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        result[k] = val ? JSON.parse(val) : undefined;
      });
      return Promise.resolve(result);
    },
    set(obj) {
      if (typeof chrome !== "undefined" && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.set(obj, resolve));
      }
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      return Promise.resolve();
    }
  };

  // ============ STATE ============
  let currentHistory = [];
  let currentProjectId = null;
  let currentFilter = "all";
  let currentSort = "date";
  let templates = [];
  let tags = [];
  let selectedCompareIds = [];

  // ============ INIT ============
  init();

  async function init() {
    await loadHistory();
    await loadTemplates();
    loadTheme();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupTabs();
    setupTagInput();
    setupSliders();
  }

  // ============ TAB SYSTEM ============
  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => {
          p.classList.add("hidden");
          p.classList.remove("active");
        });
        btn.classList.add("active");
        const panel = document.getElementById(`tab-${tab}`);
        if (panel) {
          panel.classList.remove("hidden");
          panel.classList.add("active");
        }
        // Refresh data when switching tabs
        if (tab === "portfolio") refreshPortfolioTab();
        if (tab === "insights") refreshInsightsTab();
        if (tab === "history") renderHistory(getFilteredHistory());
      });
    });
  }

  // ============ EVENT LISTENERS ============
  function setupEventListeners() {
    document.getElementById("calculate")?.addEventListener("click", calculateROI);
    document.getElementById("clearHistory")?.addEventListener("click", clearHistory);
    document.getElementById("exportCSV")?.addEventListener("click", () => exportData("csv"));
    document.getElementById("exportPDF")?.addEventListener("click", () => exportData("pdf"));
    document.getElementById("exportJSON")?.addEventListener("click", () => exportData("json"));
    document.getElementById("exportExcel")?.addEventListener("click", () => exportData("excel"));
    document.getElementById("searchProject")?.addEventListener("input", handleSearch);
    document.getElementById("clearSearch")?.addEventListener("click", clearSearch);
    document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
    document.getElementById("scenarioBtn")?.addEventListener("click", openScenarioModal);
    document.getElementById("businessBtn")?.addEventListener("click", toggleBusinessSection);
    document.getElementById("templateBtn")?.addEventListener("click", openTemplateModal);
    document.getElementById("priorityBtn")?.addEventListener("click", openPriorityModal);
    document.getElementById("compareBtn")?.addEventListener("click", openCompareModal);
    document.getElementById("favoriteToggle")?.addEventListener("click", toggleFavorite);
    document.getElementById("calculateBusiness")?.addEventListener("click", calculateBusinessMetrics);
    document.getElementById("filterFavorites")?.addEventListener("click", () => {
      setFilter("favorites");
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    });
    document.getElementById("saveTemplate")?.addEventListener("click", saveCurrentTemplate);
    document.getElementById("runCustomScenario")?.addEventListener("click", runCustomScenario);
    document.getElementById("sortSelect")?.addEventListener("change", e => {
      currentSort = e.target.value;
      renderHistory(getFilteredHistory());
    });

    // Filter chips
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        setFilter(chip.dataset.filter);
      });
    });

    // Modal close buttons
    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", closeAllModals);
    });

    document.querySelectorAll(".close-modal-overlay").forEach(el => {
      el.addEventListener("click", closeAllModals);
    });

    // Scenario cards
    document.querySelectorAll(".scenario-card").forEach(card => {
      card.addEventListener("click", () => {
        const type = card.dataset.scenario;
        if (type === "custom") {
          document.getElementById("customScenarioInputs")?.classList.remove("hidden");
        } else {
          document.getElementById("customScenarioInputs")?.classList.add("hidden");
          calculateScenario(type);
        }
      });
    });

    // Close sections
    document.querySelectorAll(".close-section").forEach(btn => {
      btn.addEventListener("click", () => {
        const sectionId = btn.dataset.section;
        document.getElementById(sectionId)?.classList.add("hidden");
      });
    });

    // Search clear button
    document.getElementById("searchProject")?.addEventListener("input", function() {
      const clearBtn = document.getElementById("clearSearch");
      if (clearBtn) clearBtn.classList.toggle("hidden", !this.value);
    });

    document.getElementById("scenarioResults")?.addEventListener("click", e => {
      const button = e.target.closest(".apply-scenario");
      if (!button) return;
      applyScenario(Number(button.dataset.gain), Number(button.dataset.hours));
    });

    document.getElementById("templateList")?.addEventListener("click", e => {
      const loadButton = e.target.closest("[data-template-load]");
      if (loadButton) {
        loadTemplate(Number(loadButton.dataset.templateLoad));
        return;
      }

      const deleteButton = e.target.closest("[data-template-delete]");
      if (deleteButton) {
        deleteTemplate(Number(deleteButton.dataset.templateDelete));
      }
    });

    document.getElementById("historyList")?.addEventListener("click", e => {
      const item = e.target.closest("[data-project-id]");
      if (!item) return;
      loadProject(Number(item.dataset.projectId));
    });
  }

  // ============ KEYBOARD SHORTCUTS ============
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") { e.preventDefault(); calculateROI(); }
        if (e.key === "s") { e.preventDefault(); showNotification("Auto-saved!", "success"); }
        if (e.key === "f") { e.preventDefault(); document.getElementById("searchProject")?.focus(); }
      }
      if (e.key === "Escape") closeAllModals();
    });
  }

  // ============ TAGS ============
  function setupTagInput() {
    const tagInput = document.getElementById("tagInput");
    if (!tagInput) return;

    tagInput.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === ",") && tagInput.value.trim()) {
        e.preventDefault();
        addTag(tagInput.value.trim().replace(",", ""));
        tagInput.value = "";
      }
      if (e.key === "Backspace" && !tagInput.value && tags.length) {
        removeTag(tags[tags.length - 1]);
      }
    });

    document.getElementById("tagsContainer")?.addEventListener("click", () => tagInput.focus());
  }

  function addTag(text) {
    if (tags.includes(text) || tags.length >= 5) return;
    tags.push(text);
    renderTags();
  }

  function removeTag(text) {
    tags = tags.filter(t => t !== text);
    renderTags();
  }

  function renderTags() {
    const container = document.getElementById("tagsContainer");
    const input = document.getElementById("tagInput");
    if (!container || !input) return;

    container.querySelectorAll(".tag-chip").forEach(el => el.remove());

    tags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `${tag} <span class="remove-tag" data-tag="${tag}">×</span>`;
      chip.querySelector(".remove-tag").addEventListener("click", e => {
        e.stopPropagation();
        removeTag(tag);
      });
      container.insertBefore(chip, input);
    });
  }

  function setTagsFromArray(arr) {
    tags = arr || [];
    renderTags();
  }

  // ============ SLIDERS ============
  function setupSliders() {
    const riskSlider = document.getElementById("riskSlider");
    const confidenceSlider = document.getElementById("confidenceSlider");

    const riskLabels = ["Very Low", "Low", "Medium", "High", "Very High"];
    const riskClasses = ["risk-very-low", "risk-low", "risk-medium", "risk-high", "risk-very-high"];

    riskSlider?.addEventListener("input", () => {
      const val = parseInt(riskSlider.value) - 1;
      const badge = document.getElementById("riskLabel");
      if (badge) {
        badge.textContent = riskLabels[val];
        badge.className = `risk-badge ${riskClasses[val]}`;
      }
    });

    confidenceSlider?.addEventListener("input", () => {
      const confLabel = document.getElementById("confidenceValue");
      if (confLabel) confLabel.textContent = confidenceSlider.value + "%";
    });
  }

  // ============ THEME ============
  function loadTheme() {
    const saved = localStorage.getItem("theme") || "light";
    document.body.classList.toggle("dark-mode", saved === "dark");
    updateThemeIcon();
  }

  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;
    const isDark = document.body.classList.contains("dark-mode");
    icon.innerHTML = isDark
      ? `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
      : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }

  // ============ MAIN ROI CALCULATION ============
  function calculateROI() {
    const name = document.getElementById("featureName").value.trim() || "Unnamed Feature";
    const gain = parseFloat(document.getElementById("gain").value);
    const hours = parseFloat(document.getElementById("hours").value);
    const rate = parseFloat(document.getElementById("rate").value);
    const category = document.getElementById("category").value;
    const status = document.getElementById("status").value;
    const notes = document.getElementById("notes").value;
    const riskLevel = parseInt(document.getElementById("riskSlider")?.value || 3);
    const confidence = parseInt(document.getElementById("confidenceSlider")?.value || 70);
    const timeHorizon = parseInt(document.getElementById("timeHorizon")?.value || 3);

    if (isNaN(gain) || isNaN(hours) || isNaN(rate)) {
      showNotification("Please enter valid numbers", "error");
      return;
    }

    if (hours <= 0 || rate <= 0) {
      showNotification("Hours and rate must be > 0", "error");
      return;
    }

    const cost = hours * rate;
    const netProfit = gain - cost;
    const roi = ((netProfit / cost) * 100).toFixed(1);
    const profitMargin = gain > 0 ? ((netProfit / gain) * 100).toFixed(1) : 0;

    // Time-based
    const monthlyGain = gain / 12;
    const paybackMonths = monthlyGain > 0 ? Math.ceil(cost / monthlyGain) : "∞";

    // NPV with time horizon
    const discountRate = 0.1;
    let npv = -cost;
    for (let month = 1; month <= timeHorizon * 12; month++) {
      npv += monthlyGain / Math.pow(1 + discountRate / 12, month);
    }

    // IRR
    const irr = calculateIRR([-cost, ...Array(12).fill(monthlyGain)]);

    // CAGR
    const cagr = ((gain / cost) ** (1 / timeHorizon) - 1) * 100;

    // ROAS
    const roas = gain / cost;

    // Multi-year profit
    const multiYearProfit = (gain * timeHorizon) - cost;

    // Risk-adjusted ROI
    const riskMultiplier = [1.0, 0.95, 0.85, 0.70, 0.50][riskLevel - 1];
    const confidenceMultiplier = confidence / 100;
    const adjustedROI = (parseFloat(roi) * riskMultiplier * confidenceMultiplier).toFixed(1);

    // Risk score (0-100, lower is better risk)
    const riskScore = calculateRiskScore(riskLevel, confidence, parseFloat(roi), paybackMonths);

    const metrics = {
      cost, netProfit, roi: parseFloat(roi), profitMargin, paybackMonths,
      npv, irr, cagr, roas, multiYearProfit, adjustedROI, riskScore,
      riskLevel, confidence, timeHorizon
    };

    updateResults(metrics);

    const projectId = Date.now();
    currentProjectId = projectId;

    const historyItem = {
      id: projectId,
      name, category, status, notes,
      gain, hours, rate,
      roi: parseFloat(roi),
      adjustedROI: parseFloat(adjustedROI),
      riskLevel, confidence, timeHorizon,
      irr: parseFloat(irr.toFixed(2)),
      cagr: parseFloat(cagr.toFixed(2)),
      roas: parseFloat(roas.toFixed(2)),
      cost, netProfit, npv: npv.toFixed(0),
      multiYearProfit,
      profitMargin: parseFloat(profitMargin),
      paybackMonths: paybackMonths === "∞" ? 9999 : paybackMonths,
      tags: [...tags],
      favorite: false,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };

    updateFavoriteIcon(false);
    saveToHistory(historyItem);
    showNotification("ROI calculated!", "success");
    showAIRecommendation(metrics, name);
  }

  function calculateRiskScore(riskLevel, confidence, roi, payback) {
    let score = 100;
    score -= (riskLevel - 1) * 12; // risk level impact
    score -= ((100 - confidence) / 100) * 20; // confidence impact
    if (roi < 0) score -= 25;
    else if (roi < 50) score -= 10;
    if (payback !== "∞" && payback > 18) score -= 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function showAIRecommendation(metrics, name) {
    const recBox = document.getElementById("aiRecommendation");
    if (!recBox) return;

    const { roi, adjustedROI, riskScore, paybackMonths, roas, irr } = metrics;
    let recommendation = "";

    if (roi > 200 && riskScore > 70) {
      recommendation = `<strong>🚀 High Priority</strong> "${name}" shows exceptional ROI with manageable risk. Prioritize immediately — expected ${roas.toFixed(1)}x return on investment.`;
    } else if (roi > 100 && riskScore > 50) {
      recommendation = `<strong>📈 Build It</strong> Solid ROI with acceptable risk profile. IRR of ${irr.toFixed(0)}% exceeds typical hurdle rates. Recommend proceeding.`;
    } else if (roi > 50) {
      recommendation = `<strong>🤔 Consider Carefully</strong> Decent returns but moderate risk. Risk-adjusted ROI of ${adjustedROI}% is lower than headline. Validate assumptions first.`;
    } else if (roi > 0) {
      recommendation = `<strong>⚠️ Marginal</strong> Low ROI — only proceed if strategically necessary. Consider renegotiating scope to reduce ${formatCurrency(metrics.cost)} cost.`;
    } else {
      recommendation = `<strong>❌ Don't Build</strong> Negative ROI. Cost exceeds projected gain. Either increase revenue potential or reduce dev hours significantly.`;
    }

    recBox.innerHTML = `<div class="rec-title">💡 AI Recommendation</div>${recommendation}`;
    recBox.classList.add("visible");
  }

  // IRR Calculation
  function calculateIRR(cashflows, guess = 0.1) {
    let rate = guess;
    for (let i = 0; i < 100; i++) {
      let npv = 0, derivative = 0;
      for (let j = 0; j < cashflows.length; j++) {
        const factor = Math.pow(1 + rate, j);
        npv += cashflows[j] / factor;
        if (j > 0) derivative -= (j * cashflows[j]) / Math.pow(1 + rate, j + 1);
      }
      if (Math.abs(derivative) < 0.000001) break;
      const newRate = rate - npv / derivative;
      if (Math.abs(newRate - rate) < 0.00001) return newRate * 100;
      rate = newRate;
    }
    return rate * 100;
  }

  // Update Results UI
  function updateResults(metrics) {
    const { cost, netProfit, roi, profitMargin, paybackMonths, npv, irr, cagr, roas, multiYearProfit, adjustedROI, riskScore } = metrics;

    document.getElementById("total-cost").textContent = formatCurrency(cost);
    document.getElementById("net-profit").textContent = formatCurrency(netProfit);
    document.getElementById("profit-margin").textContent = formatPercentage(profitMargin);
    document.getElementById("payback").textContent = formatMonths(paybackMonths);
    document.getElementById("npv").textContent = formatCurrency(npv);
    document.getElementById("irr").textContent = formatPercentage(irr);
    document.getElementById("cagr").textContent = formatPercentage(cagr);
    document.getElementById("roas").textContent = roas.toFixed(2) + "x";
    document.getElementById("threeYrProfit").textContent = formatCurrency(multiYearProfit);
    document.getElementById("adjustedROI").textContent = adjustedROI + "%";

    // ROI display
    const roiEl = document.getElementById("roi-percent");
    roiEl.textContent = `${roi}%`;

    const rating = getROIRating(roi);
    document.getElementById("roiRating").textContent = rating.label;

    // Progress bar
    const progressWidth = Math.min(Math.max((roi / 300) * 100, 0), 100);
    document.getElementById("roiProgress").style.width = `${progressWidth}%`;

    // Risk ring
    const riskRingPath = document.getElementById("riskRingPath");
    if (riskRingPath) {
      riskRingPath.style.strokeDasharray = `${riskScore}, 100`;
      const riskColor = riskScore >= 70 ? "#10b981" : riskScore >= 40 ? "#f59e0b" : "#ef4444";
      riskRingPath.style.stroke = riskColor;
    }
    const riskDisplay = document.getElementById("riskScoreDisplay");
    if (riskDisplay) riskDisplay.textContent = riskScore;

    document.getElementById("result-container").classList.remove("hidden");
  }

  // ============ PRIORITY SCORE ============
  function calculatePriorityScore(item) {
    const roi = item.roi || 0;
    const cost = item.cost || 1;
    const risk = item.riskLevel || 3;
    const confidence = item.confidence || 70;

    // Weighted score: ROI (40%), Cost efficiency (30%), Risk-adj (20%), Confidence (10%)
    const roiScore = Math.min(roi / 3, 40);
    const costScore = Math.min((100000 / cost) * 0.003, 30);
    const riskScore = ((6 - risk) / 5) * 20;
    const confScore = (confidence / 100) * 10;

    return Math.round(roiScore + costScore + riskScore + confScore);
  }

  function openPriorityModal() {
    const modal = document.getElementById("priorityModal");
    if (!modal) return;

    const content = document.getElementById("priorityContent");
    if (!content) return;

    if (currentProjectId) {
      const project = currentHistory.find(p => p.id === currentProjectId);
      if (project) {
        const score = calculatePriorityScore(project);
        const label = score >= 75 ? "🏆 High Priority" : score >= 50 ? "📊 Medium Priority" : score >= 25 ? "📉 Low Priority" : "⚠️ Deprioritize";

        content.innerHTML = `
          <div class="priority-score-display">
            <div class="priority-score-num">${score}</div>
            <div class="priority-score-label">${label}</div>
          </div>
          <div class="priority-breakdown">
            <div class="priority-row"><span>ROI Score</span><strong>${Math.min((project.roi / 3), 40).toFixed(0)}/40</strong></div>
            <div class="priority-row"><span>Cost Efficiency</span><strong>${Math.min(100000 / project.cost * 0.003, 30).toFixed(0)}/30</strong></div>
            <div class="priority-row"><span>Risk Factor</span><strong>${(((6 - (project.riskLevel || 3)) / 5) * 20).toFixed(0)}/20</strong></div>
            <div class="priority-row"><span>Confidence</span><strong>${((project.confidence || 70) / 100 * 10).toFixed(0)}/10</strong></div>
          </div>
        `;
        modal.classList.remove("hidden");
        return;
      }
    }
    showNotification("Calculate a project first", "error");
  }

  // ============ BUSINESS METRICS ============
  function calculateBusinessMetrics() {
    const ltv = parseFloat(document.getElementById("ltv")?.value);
    const cac = parseFloat(document.getElementById("cac")?.value);
    const churn = parseFloat(document.getElementById("churn")?.value);
    const customers = parseFloat(document.getElementById("customers")?.value);
    const mrr = parseFloat(document.getElementById("mrr")?.value) || 0;
    const growthRate = parseFloat(document.getElementById("growthRate")?.value) || 0;

    if (isNaN(ltv) || isNaN(cac) || isNaN(churn) || isNaN(customers)) {
      showNotification("Fill all required fields", "error");
      return;
    }

    const ltvCacRatio = ltv / cac;
    const paybackMonths = cac / (ltv / 12);
    const customerLifetime = 100 / churn;
    const totalRevenue = ltv * customers;
    const totalCac = cac * customers;
    const grossProfit = totalRevenue - totalCac;
    const arr = mrr * 12;
    const projectedMRR12 = mrr * Math.pow(1 + growthRate / 100, 12);

    const resultsDiv = document.getElementById("businessResults");
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="business-card">
        <div class="metric"><span>LTV:CAC Ratio</span>
          <strong class="${ltvCacRatio >= 3 ? 'positive' : ltvCacRatio >= 1 ? 'warning' : 'negative'}">${ltvCacRatio.toFixed(2)}:1</strong>
        </div>
        <div class="metric"><span>CAC Payback</span><strong>${paybackMonths.toFixed(1)} months</strong></div>
        <div class="metric"><span>Customer Lifetime</span><strong>${customerLifetime.toFixed(0)} months</strong></div>
        <div class="metric"><span>Gross Profit Pool</span><strong>${formatCurrency(grossProfit)}</strong></div>
        ${arr > 0 ? `<div class="metric"><span>ARR</span><strong>${formatCurrency(arr)}</strong></div>` : ""}
        ${mrr > 0 && growthRate > 0 ? `<div class="metric"><span>Projected MRR (12mo)</span><strong>${formatCurrency(projectedMRR12)}</strong></div>` : ""}
        <div class="metric-note ${ltvCacRatio >= 3 ? 'success' : ltvCacRatio >= 1 ? 'warning' : 'danger'}">
          ${ltvCacRatio >= 3 ? '✅ Healthy business model' : ltvCacRatio >= 1 ? '⚠️ Needs improvement' : '❌ Unsustainable — reduce CAC or increase LTV'}
        </div>
      </div>
    `;
  }

  // ============ SCENARIO ANALYSIS ============
  function openScenarioModal() {
    document.getElementById("scenarioModal")?.classList.remove("hidden");
  }

  function calculateScenario(type) {
    const gain = parseFloat(document.getElementById("gain").value) || 50000;
    const hours = parseFloat(document.getElementById("hours").value) || 40;
    const rate = parseFloat(document.getElementById("rate").value) || 100;

    const scenarios = {
      best: { gainMult: 1.3, hoursMult: 0.8 },
      realistic: { gainMult: 1.0, hoursMult: 1.0 },
      worst: { gainMult: 0.7, hoursMult: 1.2 }
    };

    const s = scenarios[type];
    const scenarioGain = gain * s.gainMult;
    const scenarioHours = hours * s.hoursMult;
    const cost = scenarioHours * rate;
    const netProfit = scenarioGain - cost;
    const roi = ((netProfit / cost) * 100).toFixed(1);

    const colors = { best: "best", worst: "worst", realistic: "realistic" };
    const labels = { best: "BEST CASE (+30% gain, −20% hours)", worst: "WORST CASE (−30% gain, +20% hours)", realistic: "REALISTIC (current estimates)" };

    const resultsDiv = document.getElementById("scenarioResults");
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="scenario-result ${colors[type]}">
        <h4>${labels[type]}</h4>
        <div class="scenario-metrics">
          <div class="scenario-metric-row"><span>Annual Gain</span><strong>${formatCurrency(scenarioGain)}</strong></div>
          <div class="scenario-metric-row"><span>Dev Hours</span><strong>${scenarioHours.toFixed(0)}h</strong></div>
          <div class="scenario-metric-row"><span>Total Cost</span><strong>${formatCurrency(cost)}</strong></div>
          <div class="scenario-metric-row"><span>Net Profit</span><strong>${formatCurrency(netProfit)}</strong></div>
          <div class="scenario-metric-row"><span>ROI</span><strong>${roi}%</strong></div>
        </div>
        <button class="apply-scenario" data-gain="${scenarioGain}" data-hours="${scenarioHours}">Apply to Main Form</button>
      </div>
    `;
  }

  function runCustomScenario() {
    const gainMult = parseFloat(document.getElementById("gainMultiplier")?.value) || 1;
    const hoursMult = parseFloat(document.getElementById("hoursMultiplier")?.value) || 1;
    const gain = parseFloat(document.getElementById("gain").value) || 50000;
    const hours = parseFloat(document.getElementById("hours").value) || 40;
    const rate = parseFloat(document.getElementById("rate").value) || 100;

    const scenarioGain = gain * gainMult;
    const scenarioHours = hours * hoursMult;
    const cost = scenarioHours * rate;
    const netProfit = scenarioGain - cost;
    const roi = ((netProfit / cost) * 100).toFixed(1);

    const resultsDiv = document.getElementById("scenarioResults");
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="scenario-result realistic">
        <h4>CUSTOM SCENARIO (Gain ×${gainMult}, Hours ×${hoursMult})</h4>
        <div class="scenario-metrics">
          <div class="scenario-metric-row"><span>Annual Gain</span><strong>${formatCurrency(scenarioGain)}</strong></div>
          <div class="scenario-metric-row"><span>Dev Hours</span><strong>${scenarioHours.toFixed(0)}h</strong></div>
          <div class="scenario-metric-row"><span>Total Cost</span><strong>${formatCurrency(cost)}</strong></div>
          <div class="scenario-metric-row"><span>ROI</span><strong>${roi}%</strong></div>
        </div>
        <button class="apply-scenario" data-gain="${scenarioGain}" data-hours="${scenarioHours}">Apply to Main Form</button>
      </div>
    `;
  }

  function applyScenario(gain, hours) {
    document.getElementById("gain").value = Math.round(gain);
    document.getElementById("hours").value = Math.round(hours);
    closeAllModals();
    calculateROI();
    showNotification("Scenario applied!", "success");
  }

  // ============ PORTFOLIO TAB ============
  function refreshPortfolioTab() {
    if (!currentHistory.length) {
      document.getElementById("bestROIStat").textContent = "--";
      document.getElementById("totalProfit").textContent = "$0";
      document.getElementById("avgROI").textContent = "0%";
      document.getElementById("favoriteCount").textContent = "0";
      updateTrendChart([]);
      renderCategoryBreakdown([]);
      document.getElementById("bestFeatureDetails").innerHTML = '<span class="no-data">No data yet</span>';
      return;
    }

    const totalProfit = currentHistory.reduce((s, i) => s + (i.netProfit || 0), 0);
    const avgROI = (currentHistory.reduce((s, i) => s + i.roi, 0) / currentHistory.length).toFixed(1);
    const best = currentHistory.reduce((b, i) => i.roi > (b?.roi || -Infinity) ? i : b, null);
    const favorites = currentHistory.filter(i => i.favorite).length;

    document.getElementById("bestROIStat").textContent = best ? `${best.roi}%` : "--";
    document.getElementById("totalProfit").textContent = formatCurrency(totalProfit);
    document.getElementById("avgROI").textContent = `${avgROI}%`;
    document.getElementById("favoriteCount").textContent = favorites;

    updateTrendChart(currentHistory);
    renderCategoryBreakdown(currentHistory);

    if (best) {
      document.getElementById("bestFeatureDetails").innerHTML = `
        <div class="best-feature-row"><span class="label">Feature</span><span class="value">${best.name}</span></div>
        <div class="best-feature-row"><span class="label">ROI</span><span class="value best-feature-positive">${best.roi}%</span></div>
        <div class="best-feature-row"><span class="label">Net Profit</span><span class="value">${formatCurrency(best.netProfit)}</span></div>
        <div class="best-feature-row"><span class="label">Category</span><span class="value">${best.category}</span></div>
        <div class="best-feature-row"><span class="label">Status</span><span class="value">${best.status}</span></div>
      `;
    }
  }

  function renderCategoryBreakdown(history) {
    const container = document.getElementById("categoryBreakdown");
    if (!container) return;

    if (!history.length) { container.innerHTML = '<div class="no-data">No data</div>'; return; }

    const categories = {};
    history.forEach(item => {
      const cat = item.category || "Other";
      if (!categories[cat]) categories[cat] = { count: 0, totalROI: 0 };
      categories[cat].count++;
      categories[cat].totalROI += item.roi;
    });

    const maxCount = Math.max(...Object.values(categories).map(c => c.count));
    const catColors = { Product: "var(--accent)", Marketing: "var(--green)", Development: "var(--blue)", Sales: "var(--orange)", Support: "var(--purple)", Infrastructure: "#06b6d4", Security: "#f43f5e" };

    container.innerHTML = Object.entries(categories)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => `
        <div class="category-row">
          <span class="category-name">${name}</span>
          <div class="category-bar-bg">
            <div class="category-bar-fill" data-width="${(data.count / maxCount) * 100}" data-color="${catColors[name] || "var(--accent)"}"></div>
          </div>
          <span class="category-roi ${data.totalROI / data.count >= 0 ? "positive" : "negative"}">${(data.totalROI / data.count).toFixed(0)}%</span>
        </div>
      `).join('');

    container.querySelectorAll(".category-bar-fill").forEach(bar => {
      bar.style.width = `${bar.dataset.width}%`;
      bar.style.background = bar.dataset.color;
    });
  }

  // ============ INSIGHTS TAB ============
  function refreshInsightsTab() {
    updatePriorityMatrix();
    updateSmartRecommendations();
    updateROIDistribution();
  }

  function updatePriorityMatrix() {
    const quadrants = { wins: [], strategic: [], fillins: [], avoid: [] };
    const medCost = currentHistory.length ? currentHistory.reduce((s, i) => s + i.cost, 0) / currentHistory.length : 5000;

    currentHistory.forEach(item => {
      const isHighROI = item.roi > 100;
      const isLowCost = item.cost < medCost;
      if (isHighROI && isLowCost) quadrants.wins.push(item);
      else if (isHighROI && !isLowCost) quadrants.strategic.push(item);
      else if (!isHighROI && isLowCost) quadrants.fillins.push(item);
      else quadrants.avoid.push(item);
    });

    const colors = { wins: "var(--green)", strategic: "var(--blue)", fillins: "var(--orange)", avoid: "var(--red)" };

    Object.entries(quadrants).forEach(([key, items]) => {
      const el = document.getElementById(`q${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (!el) return;
      el.innerHTML = items.slice(0, 6).map((item, i) =>
        `<div class="q-dot" data-color="${colors[key]}" title="${item.name}: ${item.roi}%">${i + 1}</div>`
      ).join('');

      el.querySelectorAll(".q-dot").forEach(dot => {
        dot.style.background = dot.dataset.color;
      });
    });
  }

  function updateSmartRecommendations() {
    const container = document.getElementById("smartRecommendations");
    if (!container) return;

    if (!currentHistory.length) {
      container.innerHTML = '<div class="no-data">Calculate some features to see recommendations</div>';
      return;
    }

    const recs = [];

    // Best ROI feature
    const best = currentHistory.reduce((b, i) => i.roi > (b?.roi || -Infinity) ? i : b, null);
    if (best && best.roi > 100) {
      recs.push({ type: "good", icon: "🏆", title: `Expand "${best.name}"`, text: `Your top performer at ${best.roi}% ROI. Consider allocating more resources.` });
    }

    // Features with negative ROI
    const negatives = currentHistory.filter(i => i.roi < 0);
    if (negatives.length) {
      recs.push({ type: "bad", icon: "❌", title: `${negatives.length} Unprofitable Feature${negatives.length > 1 ? "s" : ""}`, text: `"${negatives[0].name}" ${negatives.length > 1 ? `and ${negatives.length - 1} others have` : "has"} negative ROI. Consider cutting scope.` });
    }

    // High risk items
    const highRisk = currentHistory.filter(i => (i.riskLevel || 3) >= 4);
    if (highRisk.length) {
      recs.push({ type: "warn", icon: "⚠️", title: "High-Risk Pipeline", text: `${highRisk.length} feature${highRisk.length > 1 ? "s" : ""} flagged as high risk. Validate assumptions before committing.` });
    }

    // Portfolio diversity
    const categories = new Set(currentHistory.map(i => i.category));
    if (categories.size === 1) {
      recs.push({ type: "warn", icon: "📊", title: "Diversify Portfolio", text: `All features are in ${[...categories][0]}. Consider balancing across categories to reduce concentration risk.` });
    }

    // Low confidence estimates
    const lowConf = currentHistory.filter(i => (i.confidence || 70) < 50);
    if (lowConf.length) {
      recs.push({ type: "warn", icon: "🔍", title: "Validate Estimates", text: `${lowConf.length} feature${lowConf.length > 1 ? "s" : ""} with low confidence (< 50%). Run user research or A/B tests to improve accuracy.` });
    }

    if (!recs.length) {
      recs.push({ type: "good", icon: "✅", title: "Portfolio Looks Healthy", text: "Your features show positive ROI and balanced risk. Keep building!" });
    }

    container.innerHTML = recs.map(r => `
      <div class="rec-card ${r.type}">
        <span class="rec-icon">${r.icon}</span>
        <div class="rec-text"><strong>${r.title}</strong>${r.text}</div>
      </div>
    `).join('');
  }

  function updateROIDistribution() {
    const container = document.getElementById("roiDistribution");
    if (!container) return;

    const buckets = [
      { label: "< 0% (Loss)", min: -Infinity, max: 0, color: "var(--red)" },
      { label: "0–50%", min: 0, max: 50, color: "var(--orange)" },
      { label: "50–100%", min: 50, max: 100, color: "var(--blue)" },
      { label: "100–200%", min: 100, max: 200, color: "var(--accent)" },
      { label: "200%+ 🚀", min: 200, max: Infinity, color: "var(--green)" }
    ];

    if (!currentHistory.length) { container.innerHTML = '<div class="no-data">No data</div>'; return; }

    const maxCount = Math.max(...buckets.map(b => currentHistory.filter(i => i.roi >= b.min && i.roi < b.max).length), 1);

    container.innerHTML = buckets.map(b => {
      const count = currentHistory.filter(i => i.roi >= b.min && i.roi < b.max).length;
      return `
        <div class="dist-row">
          <span class="dist-label">${b.label}</span>
          <div class="dist-bar-bg">
            <div class="dist-bar-fill" data-width="${(count / maxCount) * 100}" data-color="${b.color}"></div>
          </div>
          <span class="dist-count">${count}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll(".dist-bar-fill").forEach(bar => {
      bar.style.width = `${bar.dataset.width}%`;
      bar.style.background = bar.dataset.color;
    });
  }

  // ============ TREND CHART ============
  function updateTrendChart(history) {
    const chart = document.getElementById("trendChart");
    if (!chart) return;

    const recent = history.slice(0, 6).reverse();
    if (!recent.length) { chart.innerHTML = '<div class="no-data">No trend data</div>'; return; }

    const maxROI = Math.max(...recent.map(p => Math.abs(p.roi)), 1);

    chart.innerHTML = recent.map(p => {
      const height = Math.max((Math.abs(p.roi) / maxROI) * 90, 5);
      return `
        <div class="trend-bar ${p.roi >= 0 ? "" : "negative"}" data-height="${height}">
          <div class="bar-tooltip">${p.name}<br>${p.roi}%</div>
        </div>
      `;
    }).join('');

    chart.querySelectorAll(".trend-bar").forEach(bar => {
      bar.style.height = `${bar.dataset.height}%`;
    });

    const trendEl = document.getElementById("trendIndicator");
    if (trendEl && recent.length >= 2) {
      const latest = recent[recent.length - 1].roi;
      const previous = recent[recent.length - 2].roi;
      const diff = (latest - previous).toFixed(1);
      trendEl.textContent = latest > previous ? `↑ +${diff}%` : latest < previous ? `↓ ${diff}%` : "→ Stable";
    }
  }

  // ============ COMPARE MODAL ============
  function openCompareModal() {
    const modal = document.getElementById("compareModal");
    if (!modal) return;

    selectedCompareIds = [];
    renderCompareSelector();
    modal.classList.remove("hidden");
  }

  function renderCompareSelector() {
    const container = document.getElementById("compareSelector");
    if (!container) return;

    if (!currentHistory.length) {
      container.innerHTML = '<div class="no-data">No history to compare</div>';
      return;
    }

    container.innerHTML = currentHistory.slice(0, 15).map(item => `
      <div class="compare-item" data-id="${item.id}">
        <input type="checkbox" data-id="${item.id}" ${selectedCompareIds.includes(item.id) ? 'checked' : ''}>
        <span>${item.name} — <strong>${item.roi}% ROI</strong></span>
      </div>
    `).join('');

    container.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.addEventListener("change", () => {
        const id = parseInt(cb.dataset.id);
        if (cb.checked) {
          if (selectedCompareIds.length < 3) selectedCompareIds.push(id);
          else { cb.checked = false; showNotification("Max 3 features", "error"); return; }
        } else {
          selectedCompareIds = selectedCompareIds.filter(i => i !== id);
        }
        renderCompareTable();
      });
    });
  }

  function renderCompareTable() {
    const container = document.getElementById("compareTable");
    if (!container || !selectedCompareIds.length) { if (container) container.innerHTML = ""; return; }

    const items = selectedCompareIds.map(id => currentHistory.find(i => i.id === id)).filter(Boolean);
    if (items.length < 2) { container.innerHTML = ""; return; }

    const metrics = [
      { key: "roi", label: "ROI", fmt: v => `${v}%`, higherBetter: true },
      { key: "netProfit", label: "Net Profit", fmt: formatCurrency, higherBetter: true },
      { key: "cost", label: "Total Cost", fmt: formatCurrency, higherBetter: false },
      { key: "paybackMonths", label: "Payback", fmt: v => v >= 9999 ? "∞" : `${v} mo`, higherBetter: false },
      { key: "irr", label: "IRR", fmt: v => `${v}%`, higherBetter: true },
      { key: "roas", label: "ROAS", fmt: v => `${v}x`, higherBetter: true }
    ];

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            ${items.map(i => `<th>${i.name.slice(0, 12)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${metrics.map(m => {
            const vals = items.map(i => parseFloat(i[m.key]) || 0);
            const best = m.higherBetter ? Math.max(...vals) : Math.min(...vals);
            return `
              <tr>
                <td class="metric-label-cell">${m.label}</td>
                ${items.map((item, idx) => {
                  const isWinner = vals[idx] === best;
                  return `<td class="${isWinner ? 'winner' : ''}">${m.fmt(item[m.key] || 0)}</td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;
  }

  // ============ TEMPLATES ============
  async function loadTemplates() {
    const data = await storage.get(["templates"]);
    templates = data.templates || [];
  }

  function openTemplateModal() {
    document.getElementById("templateModal")?.classList.remove("hidden");
    renderTemplates();
  }

  async function saveCurrentTemplate() {
    const name = document.getElementById("templateName")?.value?.trim();
    if (!name) { showNotification("Enter template name", "error"); return; }

    const template = {
      id: Date.now(),
      name,
      category: document.getElementById("category")?.value,
      rate: document.getElementById("rate")?.value,
      notes: document.getElementById("notes")?.value,
      riskLevel: document.getElementById("riskSlider")?.value,
      timeHorizon: document.getElementById("timeHorizon")?.value,
      tags: [...tags],
      date: new Date().toLocaleDateString()
    };

    templates.push(template);
    await storage.set({ templates });
    renderTemplates();
    showNotification("Template saved!", "success");
    if (document.getElementById("templateName")) document.getElementById("templateName").value = "";
  }

  function renderTemplates() {
    const list = document.getElementById("templateList");
    if (!list) return;

    if (!templates.length) { list.innerHTML = '<div class="no-data">No templates yet</div>'; return; }

    list.innerHTML = templates.map(t => `
      <div class="template-item">
        <button class="template-info template-info-button" data-template-load="${t.id}" type="button">
          <strong>${t.name}</strong>
          <small>${t.category} • Rate: $${t.rate}/hr • ${t.date}</small>
        </button>
        <button class="template-delete" data-template-delete="${t.id}" title="Delete" type="button">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `).join('');
  }

  function loadTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    const el = id => document.getElementById(id);
    if (el("category")) el("category").value = template.category;
    if (el("rate")) el("rate").value = template.rate;
    if (el("notes")) el("notes").value = template.notes || "";
    if (el("riskSlider") && template.riskLevel) el("riskSlider").value = template.riskLevel;
    if (el("timeHorizon") && template.timeHorizon) el("timeHorizon").value = template.timeHorizon;
    if (template.tags) setTagsFromArray(template.tags);
    closeAllModals();
    showNotification(`"${template.name}" loaded`, "success");
  }

  async function deleteTemplate(id) {
    templates = templates.filter(t => t.id !== id);
    await storage.set({ templates });
    renderTemplates();
    showNotification("Template deleted", "success");
  }

  // ============ FAVORITES ============
  function toggleFavorite() {
    if (!currentProjectId) { showNotification("Calculate a project first", "error"); return; }
    const project = currentHistory.find(p => p.id === currentProjectId);
    if (!project) return;
    project.favorite = !project.favorite;
    storage.set({ roiHistory: currentHistory }).then(() => {
      renderHistory(getFilteredHistory());
      refreshPortfolioTab();
      updateFavoriteIcon(project.favorite);
      showNotification(project.favorite ? "Added to favorites ⭐" : "Removed from favorites", "success");
    });
  }

  function updateFavoriteIcon(isFav) {
    const btn = document.getElementById("favoriteToggle");
    if (!btn) return;
    btn.classList.toggle("is-favorite", isFav);
    const icon = btn.querySelector("svg");
    if (icon) icon.setAttribute("fill", isFav ? "currentColor" : "none");
  }

  // ============ HISTORY ============
  async function saveToHistory(item) {
    currentHistory.unshift(item);
    if (currentHistory.length > 100) currentHistory = currentHistory.slice(0, 100);
    await storage.set({ roiHistory: currentHistory });
    renderHistory(getFilteredHistory());
  }

  async function loadHistory() {
    const data = await storage.get(["roiHistory"]);
    currentHistory = data.roiHistory || [];
    renderHistory(getFilteredHistory());
  }

  function setFilter(filter) {
    currentFilter = filter;
    renderHistory(getFilteredHistory());
  }

  function getFilteredHistory() {
    let filtered = [...currentHistory];
    if (currentFilter === "favorites") filtered = filtered.filter(p => p.favorite);
    else if (currentFilter !== "all") filtered = filtered.filter(p => p.category === currentFilter);

    // Sort
    switch (currentSort) {
      case "roi": filtered.sort((a, b) => b.roi - a.roi); break;
      case "profit": filtered.sort((a, b) => b.netProfit - a.netProfit); break;
      case "cost": filtered.sort((a, b) => a.cost - b.cost); break;
      default: filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    return filtered;
  }

  function renderHistory(history) {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    if (!history.length) {
      historyList.innerHTML = '<li class="history-empty-item">No features found</li>';
      document.getElementById("historyCount").textContent = "0 projects";
      return;
    }

    const roiColors = { high: "var(--green)", medium: "var(--blue)", low: "var(--orange)", negative: "var(--red)" };

    historyList.innerHTML = history.map(item => {
      const roiClass = item.roi >= 0 ? "positive" : "negative";
      const barColor = item.roi > 100 ? roiColors.high : item.roi > 50 ? roiColors.medium : item.roi > 0 ? roiColors.low : roiColors.negative;
      const tagHtml = item.tags?.length ? item.tags.slice(0, 2).map(t => `<span class="hist-tag">${t}</span>`).join('') : "";

      return `
        <li data-project-id="${item.id}">
          <div class="hist-color" data-color="${barColor}"></div>
          <div class="hist-info">
            <div class="hist-name">${item.favorite ? "⭐ " : ""}${item.name}</div>
            <div class="hist-meta">
              <span>${item.category || "Product"}</span>
              <span>•</span>
              <span>${item.status || "Idea"}</span>
              ${tagHtml}
            </div>
            <div class="history-date">${item.date}</div>
          </div>
          <div class="hist-roi ${roiClass}">${item.roi}%</div>
        </li>
      `;
    }).join('');

    historyList.querySelectorAll(".hist-color").forEach(colorBar => {
      colorBar.style.background = colorBar.dataset.color;
    });

    document.getElementById("historyCount").textContent = `${history.length} project${history.length !== 1 ? "s" : ""}`;
  }

  function loadProject(id) {
    const project = currentHistory.find(p => p.id === id);
    if (!project) return;

    const el = id => document.getElementById(id);
    if (el("featureName")) el("featureName").value = project.name;
    if (el("category")) el("category").value = project.category || "Product";
    if (el("status")) el("status").value = project.status || "Idea";
    if (el("notes")) el("notes").value = project.notes || "";
    if (el("gain")) el("gain").value = project.gain || (project.netProfit + project.cost);
    if (el("hours")) el("hours").value = project.hours || Math.round(project.cost / 100);
    if (el("rate")) el("rate").value = project.rate || 100;
    if (el("riskSlider") && project.riskLevel) el("riskSlider").value = project.riskLevel;
    if (el("confidenceSlider") && project.confidence) {
      el("confidenceSlider").value = project.confidence;
      const confLabel = el("confidenceValue");
      if (confLabel) confLabel.textContent = project.confidence + "%";
    }
    if (el("timeHorizon") && project.timeHorizon) el("timeHorizon").value = project.timeHorizon;
    if (project.tags) setTagsFromArray(project.tags);

    currentProjectId = id;
    updateFavoriteIcon(project.favorite);

    // Switch to calculator tab
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => { p.classList.add("hidden"); p.classList.remove("active"); });
    document.querySelector('[data-tab="calculator"]')?.classList.add("active");
    document.getElementById("tab-calculator")?.classList.remove("hidden");
    document.getElementById("tab-calculator")?.classList.add("active");

    calculateROI();
    showNotification(`Loaded "${project.name}"`, "success");
  }

  // ============ SEARCH ============
  function handleSearch() {
    const query = document.getElementById("searchProject")?.value?.toLowerCase() || "";
    if (!query) {
      renderHistory(getFilteredHistory());
      return;
    }
    const filtered = currentHistory.filter(item =>
      item.name.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(query)))
    );
    renderHistory(filtered);
  }

  function clearSearch() {
    const searchInput = document.getElementById("searchProject");
    if (searchInput) searchInput.value = "";
    document.getElementById("clearSearch")?.classList.add("hidden");
    renderHistory(getFilteredHistory());
  }

  // ============ CLEAR HISTORY ============
  async function clearHistory() {
    if (!confirm("Clear all history? This cannot be undone.")) return;
    currentHistory = [];
    await storage.set({ roiHistory: [] });
    renderHistory([]);
    refreshPortfolioTab();
    showNotification("History cleared", "success");
  }

  // ============ TOGGLE BUSINESS ============
  function toggleBusinessSection() {
    const section = document.getElementById("businessSection");
    section?.classList.toggle("hidden");
  }

  // ============ CLOSE MODALS ============
  function closeAllModals() {
    ["scenarioModal", "templateModal", "compareModal", "priorityModal"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
  }

  // ============ EXPORT ============
  async function exportData(format) {
    if (!currentHistory.length) { showNotification("No data to export", "error"); return; }
    switch (format) {
      case "csv": exportToCSV(); break;
      case "pdf": await exportToPDF(); break;
      case "json": exportToJSON(); break;
      case "excel": exportToExcel(); break;
    }
  }

  function exportToCSV() {
    let csv = "Feature,Category,Status,Tags,Annual Gain,Cost,Net Profit,ROI,Adj ROI,IRR,CAGR,ROAS,NPV,Risk Level,Confidence,Time Horizon,Payback (mo),Date,Favorite\n";
    currentHistory.forEach(item => {
      csv += `"${item.name}","${item.category || ""}","${item.status || ""}","${(item.tags || []).join("; ")}",${item.gain || 0},${item.cost || 0},${item.netProfit || 0},${item.roi}%,${item.adjustedROI || item.roi}%,${item.irr || 0}%,${item.cagr || 0}%,${item.roas || 0}x,${item.npv || 0},${item.riskLevel || 3},${item.confidence || 70}%,${item.timeHorizon || 1}yr,${item.paybackMonths >= 9999 ? "∞" : item.paybackMonths || 0},"${item.date}","${item.favorite ? "Yes" : "No"}"\n`;
    });
    const totalProfit = currentHistory.reduce((s, i) => s + (i.netProfit || 0), 0);
    const avgROI = (currentHistory.reduce((s, i) => s + i.roi, 0) / currentHistory.length).toFixed(1);
    csv += `\n"SUMMARY"\n"Total Projects",${currentHistory.length}\n"Total Profit",${totalProfit}\n"Average ROI",${avgROI}%\n`;
    downloadFile(csv, `roi-report-${dateStr()}.csv`, "text/csv");
    showNotification("CSV exported!", "success");
  }

  async function exportToPDF() {
    const totalProfit = currentHistory.reduce((s, i) => s + (i.netProfit || 0), 0);
    const avgROI = (currentHistory.reduce((s, i) => s + i.roi, 0) / currentHistory.length).toFixed(1);
    const best = currentHistory.reduce((b, i) => i.roi > (b?.roi || -Infinity) ? i : b, null);

    await storage.set({
      pendingReport: {
        generatedAt: new Date().toLocaleString(),
        totalProfit,
        avgROI,
        best,
        projects: currentHistory
      }
    });

    const reportUrl = typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("report.html")
      : new URL("report.html", window.location.href).href;
    window.open(reportUrl, "_blank");
  }

  function exportToJSON() {
    const json = JSON.stringify({
      generated: new Date().toISOString(),
      version: "2.0",
      summary: {
        totalProjects: currentHistory.length,
        totalProfit: currentHistory.reduce((s, i) => s + (i.netProfit || 0), 0),
        averageROI: (currentHistory.reduce((s, i) => s + i.roi, 0) / currentHistory.length).toFixed(1)
      },
      projects: currentHistory
    }, null, 2);
    downloadFile(json, `roi-data-${dateStr()}.json`, "application/json");
    showNotification("JSON exported!", "success");
  }

  function exportToExcel() {
    let csv = "Feature\tCategory\tStatus\tTags\tAnnual Gain\tCost\tNet Profit\tROI\tAdjusted ROI\tIRR\tCAGR\tROAS\tNPV\tRisk\tConfidence\tDate\tFavorite\n";
    currentHistory.forEach(item => {
      csv += `${item.name}\t${item.category || ""}\t${item.status || ""}\t${(item.tags || []).join("; ")}\t${item.gain || 0}\t${item.cost || 0}\t${item.netProfit || 0}\t${item.roi}%\t${item.adjustedROI || item.roi}%\t${item.irr || 0}%\t${item.cagr || 0}%\t${item.roas || 0}x\t${item.npv || 0}\t${item.riskLevel || 3}\t${item.confidence || 70}%\t${item.date}\t${item.favorite ? "Yes" : "No"}\n`;
    });
    downloadFile(csv, `roi-excel-${dateStr()}.xls`, "application/vnd.ms-excel");
    showNotification("Excel downloaded!", "success");
  }

  function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  // ============ HELPERS ============
  function getROIRating(roi) {
    if (roi > 200) return { label: "🚀 Excellent" };
    if (roi > 100) return { label: "📈 Great" };
    if (roi > 50) return { label: "📊 Good" };
    if (roi > 0) return { label: "📉 Fair" };
    return { label: "⚠️ Poor" };
  }

  function showNotification(message, type = "info") {
    // Remove existing notifications
    document.querySelectorAll(".notification").forEach(n => n.remove());

    const icons = { success: "✓", error: "✕", info: "ℹ" };
    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${icons[type] || "ℹ"}</span><span>${message}</span>`;
    document.body.appendChild(n);

    setTimeout(() => {
      n.classList.add("fade-out");
      setTimeout(() => n.remove(), 300);
    }, 2500);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  function formatPercentage(value) {
    return `${parseFloat(value).toFixed(1)}%`;
  }

  function formatMonths(months) {
    if (months === "∞" || months >= 9999) return "∞";
    if (months < 1) return "< 1 mo";
    if (months > 24) return `${(months / 12).toFixed(1)} yr`;
    return `${months} mo`;
  }

  function dateStr() {
    return new Date().toISOString().split("T")[0];
  }

});

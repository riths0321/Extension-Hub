document.addEventListener("DOMContentLoaded", async () => {
  const storage = {
    get(keys) {
      if (typeof chrome !== "undefined" && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.get(keys, resolve));
      }
      const result = {};
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        result[key] = value ? JSON.parse(value) : undefined;
      });
      return Promise.resolve(result);
    },
    set(obj) {
      if (typeof chrome !== "undefined" && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.set(obj, resolve));
      }
      Object.entries(obj).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
      return Promise.resolve();
    }
  };

  const data = await storage.get(["pendingReport"]);
  const report = data.pendingReport;

  if (!report || !Array.isArray(report.projects)) {
    document.body.textContent = "No report data available.";
    return;
  }

  document.getElementById("reportSubtitle").textContent =
    `Generated ${report.generatedAt} · ${report.projects.length} features analyzed`;

  const hero = document.getElementById("reportHero");
  if (report.best) {
    hero.replaceChildren();
    hero.appendChild(document.createTextNode("Best Performer: "));
    const strong = document.createElement("strong");
    strong.textContent = report.best.name;
    hero.appendChild(strong);
    hero.appendChild(document.createTextNode(` — ${report.best.roi}% ROI · ${formatCurrency(report.best.netProfit)} profit`));
    hero.classList.remove("hidden");
  }

  const summary = document.getElementById("reportSummary");
  summary.replaceChildren();
  [
    { label: "Total Projects", value: report.projects.length },
    { label: "Average ROI", value: `${report.avgROI}%` },
    { label: "Total Profit", value: formatCurrency(report.totalProfit) }
  ].forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "report-card";

    const heading = document.createElement("h3");
    heading.textContent = card.label;
    const value = document.createElement("div");
    value.className = "value";
    value.textContent = card.value;

    cardEl.append(heading, value);
    summary.appendChild(cardEl);
  });

  const rows = document.getElementById("reportRows");
  rows.replaceChildren();
  report.projects.forEach(item => {
    const tr = document.createElement("tr");

    const feature = document.createElement("td");
    feature.textContent = `${item.favorite ? "⭐ " : ""}${item.name}`;

    const category = document.createElement("td");
    category.textContent = item.category || "-";

    const roi = document.createElement("td");
    roi.className = item.roi >= 0 ? "report-positive" : "report-negative";
    roi.textContent = `${item.roi}%`;

    const adjusted = document.createElement("td");
    adjusted.textContent = `${item.adjustedROI || item.roi}%`;

    const netProfit = document.createElement("td");
    netProfit.className = (item.netProfit || 0) >= 0 ? "report-positive" : "report-negative";
    netProfit.textContent = formatCurrency(item.netProfit || 0);

    const irr = document.createElement("td");
    irr.textContent = item.irr ? `${item.irr.toFixed(1)}%` : "-";

    const risk = document.createElement("td");
    risk.textContent = ["", "Very Low", "Low", "Medium", "High", "Very High"][item.riskLevel || 3];

    const date = document.createElement("td");
    date.textContent = item.date;

    tr.append(feature, category, roi, adjusted, netProfit, irr, risk, date);
    rows.appendChild(tr);
  });

  await storage.set({ pendingReport: null });

  setTimeout(() => {
    window.print();
  }, 50);

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
});

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
    hero.innerHTML =
      `Best Performer: <strong>${report.best.name}</strong> — ${report.best.roi}% ROI · ${formatCurrency(report.best.netProfit)} profit`;
    hero.classList.remove("hidden");
  }

  const summary = document.getElementById("reportSummary");
  summary.innerHTML = [
    { label: "Total Projects", value: report.projects.length },
    { label: "Average ROI", value: `${report.avgROI}%` },
    { label: "Total Profit", value: formatCurrency(report.totalProfit) }
  ].map(card => `
    <div class="report-card">
      <h3>${card.label}</h3>
      <div class="value">${card.value}</div>
    </div>
  `).join("");

  const rows = document.getElementById("reportRows");
  rows.innerHTML = report.projects.map(item => `
    <tr>
      <td>${item.favorite ? "⭐ " : ""}${item.name}</td>
      <td>${item.category || "-"}</td>
      <td class="${item.roi >= 0 ? "report-positive" : "report-negative"}">${item.roi}%</td>
      <td>${item.adjustedROI || item.roi}%</td>
      <td class="${(item.netProfit || 0) >= 0 ? "report-positive" : "report-negative"}">${formatCurrency(item.netProfit || 0)}</td>
      <td>${item.irr ? `${item.irr.toFixed(1)}%` : "-"}</td>
      <td>${["", "Very Low", "Low", "Medium", "High", "Very High"][item.riskLevel || 3]}</td>
      <td>${item.date}</td>
    </tr>
  `).join("");

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

const els = {
  balance: document.getElementById("balance"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  title: document.getElementById("title"),
  amount: document.getElementById("amount"),
  entryDate: document.getElementById("entryDate"),
  type: document.getElementById("type"),
  category: document.getElementById("category"),
  add: document.getElementById("add"),
  limit: document.getElementById("limit"),
  saveLimit: document.getElementById("saveLimit"),
  limitBar: document.getElementById("limitBar"),
  limitInfo: document.getElementById("limitInfo"),
  monthFilter: document.getElementById("monthFilter"),
  viewReport: document.getElementById("viewReport"),
  resetReport: document.getElementById("resetReport"),
  export: document.getElementById("export"),
  history: document.getElementById("history"),
  clearHistory: document.getElementById("clearHistory"),
  status: document.getElementById("status")
};

let wallet = [];
let limit = 0;
let activeFilterMonth = "";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

initialize().catch((error) => {
  setStatus(error.message || "Failed to initialize extension.", true);
});

function initialize() {
  bindEvents();
  return loadState();
}

function bindEvents() {
  els.add.addEventListener("click", onAddEntry);
  els.saveLimit.addEventListener("click", onSaveLimit);
  els.viewReport.addEventListener("click", onViewReport);
  els.resetReport.addEventListener("click", onResetReport);
  els.export.addEventListener("click", onExport);
  els.clearHistory.addEventListener("click", onClearHistory);
}

function loadState() {
  return chrome.storage.local.get(["wallet", "limit"]).then((res) => {
    wallet = Array.isArray(res.wallet) ? res.wallet : [];
    limit = Number.isFinite(Number(res.limit)) ? Number(res.limit) : 0;
    els.limit.value = limit > 0 ? String(limit) : "";
    els.entryDate.value = todayDateInputValue();
    render();
  });
}

function onAddEntry() {
  const title = els.title.value.trim();
  const amount = Number(els.amount.value);
  const entryDate = els.entryDate.value || todayDateInputValue();
  const type = els.type.value;
  const category = els.category.value;

  if (!title) {
    setStatus("Please enter a title.", true);
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus("Please enter a valid amount greater than 0.", true);
    return;
  }
  if (type !== "income" && type !== "expense") {
    setStatus("Invalid transaction type selected.", true);
    return;
  }

  wallet.push({
    id: crypto.randomUUID(),
    title,
    amount: round2(amount),
    type,
    category,
    date: entryDate,
    monthKey: getMonthKeyFromDateString(entryDate),
    time: new Date(`${entryDate}T12:00:00`).toISOString()
  });

  chrome.storage.local.set({ wallet }).then(() => {
    els.title.value = "";
    els.amount.value = "";
    render();
    setStatus("Entry added.");
  });
}

function onSaveLimit() {
  const value = Number(els.limit.value);
  if (!Number.isFinite(value) || value < 0) {
    setStatus("Please enter a valid monthly limit (0 or higher).", true);
    return;
  }

  limit = round2(value);
  chrome.storage.local.set({ limit }).then(() => {
    renderLimitInfo();
    setStatus(limit === 0 ? "Monthly limit removed." : "Monthly limit saved.");
  });
}

function onViewReport() {
  const month = els.monthFilter.value;
  if (!month) {
    setStatus("Select a month to view monthly report.", true);
    return;
  }
  activeFilterMonth = month;
  render();
  setStatus(`Showing report for ${month}.`);
}

function onResetReport() {
  activeFilterMonth = "";
  els.monthFilter.value = "";
  render();
  setStatus("Showing all transactions.");
}

function onExport() {
  const list = getFilteredWallet();
  if (!list.length) {
    setStatus("No transactions available to export.", true);
    return;
  }

  const csvRows = ["Title,Amount,Type,Category,Date"];
  list.forEach((item) => {
    const safeTitle = String(item.title).replaceAll('"', '""');
    csvRows.push(
      `"${safeTitle}",${item.amount},${item.type},${item.category},${new Date(item.time).toISOString()}`
    );
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const fileSuffix = activeFilterMonth || "all";

  chrome.downloads
    .download({
      url,
      filename: `budget_report_${fileSuffix}.csv`,
      saveAs: false
    })
    .then(() => {
      setStatus("CSV exported.");
    })
    .catch(() => {
      setStatus("Failed to export CSV.", true);
    })
    .finally(() => {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
}

function onClearHistory() {
  if (!window.confirm("Delete all transaction history?")) return;

  wallet = [];
  activeFilterMonth = "";
  els.monthFilter.value = "";
  chrome.storage.local.set({ wallet }).then(() => {
    render();
    setStatus("All history cleared.");
  });
}

function getFilteredWallet() {
  if (!activeFilterMonth) return wallet;
  return wallet.filter((item) => getItemMonthKey(item) === activeFilterMonth);
}

function getCurrentMonthKey() {
  return getMonthKeyFromDate(new Date());
}

function getMonthlyExpense(monthKey) {
  return wallet.reduce((sum, item) => {
    if (item.type !== "expense") return sum;
    if (getItemMonthKey(item) !== monthKey) return sum;
    return sum + Number(item.amount || 0);
  }, 0);
}

function render() {
  const list = getFilteredWallet();
  renderSummary(wallet);
  renderHistory(list);
  drawChart(list);
  renderLimitInfo();
}

function renderSummary(allItems) {
  let income = 0;
  let expense = 0;

  allItems.forEach((item) => {
    if (item.type === "income") {
      income += Number(item.amount || 0);
    } else {
      expense += Number(item.amount || 0);
    }
  });

  const balance = income - expense;
  els.balance.textContent = currency.format(balance);
  els.totalIncome.textContent = currency.format(income);
  els.totalExpense.textContent = currency.format(expense);
}

function renderHistory(list) {
  els.history.textContent = "";

  if (!list.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No transactions found.";
    els.history.appendChild(empty);
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.time) - new Date(a.time));
  sorted.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-main";
    main.textContent = `${item.title} (${item.category})`;

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = item.date || new Date(item.time).toLocaleDateString();

    const amount = document.createElement("div");
    amount.className = `history-amount ${item.type}`;
    amount.textContent = `${item.type === "expense" ? "-" : "+"}${currency.format(item.amount)}`;

    li.append(main, amount, meta);
    els.history.appendChild(li);
  });
}

function renderLimitInfo() {
  const monthKey = getCurrentMonthKey();
  const monthlySpent = getMonthlyExpense(monthKey);

  if (!limit) {
    els.limitInfo.textContent = "No monthly limit set.";
    els.limitBar.style.width = "0%";
    return;
  }

  const percent = Math.min((monthlySpent / limit) * 100, 100);
  els.limitBar.style.width = `${Math.max(percent, 0)}%`;

  const remaining = limit - monthlySpent;
  if (remaining >= 0) {
    els.limitInfo.textContent = `${currency.format(monthlySpent)} spent this month. ${currency.format(
      remaining
    )} remaining.`;
  } else {
    els.limitInfo.textContent = `${currency.format(monthlySpent)} spent this month. Over limit by ${currency.format(
      Math.abs(remaining)
    )}.`;
  }
}

function setStatus(message, isError = false) {
  els.status.textContent = message || "";
  els.status.style.color = isError ? "#b42342" : "#5c6682";
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function getItemMonthKey(item) {
  if (item?.monthKey) return item.monthKey;
  if (item?.date) return getMonthKeyFromDateString(item.date);

  const dt = new Date(item?.time || Date.now());
  return getMonthKeyFromDate(dt);
}

function getMonthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthKeyFromDateString(dateString) {
  return String(dateString || "").slice(0, 7);
}

function todayDateInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

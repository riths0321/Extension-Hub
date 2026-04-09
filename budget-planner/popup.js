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
  history: document.getElementById("history"),
  clearHistory: document.getElementById("clearHistory"),
  status: document.getElementById("status"),
  searchInput: document.getElementById("searchInput"),
  filterType: document.getElementById("filterType"),
  filterCategory: document.getElementById("filterCategory"),
  splitTitle: document.getElementById("splitTitle"),
  splitAmount: document.getElementById("splitAmount"),
  splitPeople: document.getElementById("splitPeople"),
  splitPaidBy: document.getElementById("splitPaidBy"),
  splitParticipants: document.getElementById("splitParticipants"),
  calculateSplit: document.getElementById("calculateSplit"),
  addSplitExpense: document.getElementById("addSplitExpense"),
  splitResult: document.getElementById("splitResult"),
  recurringTitle: document.getElementById("recurringTitle"),
  recurringAmount: document.getElementById("recurringAmount"),
  recurringType: document.getElementById("recurringType"),
  recurringCategory: document.getElementById("recurringCategory"),
  recurringFrequency: document.getElementById("recurringFrequency"),
  addRecurring: document.getElementById("addRecurring"),
  recurringList: document.getElementById("recurringList"),
  exportAllData: document.getElementById("exportAllData"),
  importData: document.getElementById("importData"),
  importFile: document.getElementById("importFile"),
  backupData: document.getElementById("backupData"),
  restoreBackup: document.getElementById("restoreBackup"),
  insights: document.getElementById("insights"),
  refreshInsights: document.getElementById("refreshInsights"),
  budgetCategory: document.getElementById("budgetCategory"),
  budgetAmount: document.getElementById("budgetAmount"),
  setCategoryBudget: document.getElementById("setCategoryBudget"),
  categoryBudgets: document.getElementById("categoryBudgets")
};

let wallet = [];
let limit = 0;
let categoryBudgets = {};
let recurringTransactions = [];
let activeFilterMonth = "";
let currentSplit = null;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

initialize().catch((error) => {
  setStatus(error.message || "Failed to initialize extension.", true);
});

async function initialize() {
  bindEvents();
  setupTabs();
  await loadState();
  await checkRecurringTransactions();
}

function bindEvents() {
  els.add.addEventListener("click", onAddEntry);
  els.saveLimit.addEventListener("click", onSaveLimit);
  els.clearHistory.addEventListener("click", onClearHistory);
  els.searchInput?.addEventListener("input", () => renderFilteredHistory());
  els.filterType?.addEventListener("change", () => renderFilteredHistory());
  els.filterCategory?.addEventListener("change", () => renderFilteredHistory());
  els.splitPeople?.addEventListener("input", renderSplitParticipantInputs);
  els.splitPaidBy?.addEventListener("input", syncSplitPayerName);
  els.calculateSplit?.addEventListener("click", onCalculateSplit);
  els.addSplitExpense?.addEventListener("click", onAddSplitExpense);
  els.addRecurring?.addEventListener("click", onAddRecurring);
  els.exportAllData?.addEventListener("click", onExportAllData);
  els.importData?.addEventListener("click", () => els.importFile.click());
  els.importFile?.addEventListener("change", onImportData);
  els.backupData?.addEventListener("click", onBackupData);
  els.restoreBackup?.addEventListener("click", onRestoreBackup);
  els.refreshInsights?.addEventListener("click", generateInsights);
  els.setCategoryBudget?.addEventListener("click", onSetCategoryBudget);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabId}Tab`).classList.add('active');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tabId === 'budgets') renderCategoryBudgets();
      if (tabId === 'tools') {
        loadRecurringTransactions();
        generateInsights();
      }
      if (tabId === 'transactions') renderFilteredHistory();
    });
  });
}

async function loadState() {
  const res = await chrome.storage.local.get(["wallet", "limit", "categoryBudgets", "recurringTransactions"]);
  wallet = Array.isArray(res.wallet) ? res.wallet : [];
  limit = Number.isFinite(Number(res.limit)) ? Number(res.limit) : 0;
  categoryBudgets = res.categoryBudgets || {};
  recurringTransactions = res.recurringTransactions || [];
  els.limit.value = limit > 0 ? String(limit) : "";
  els.entryDate.value = todayDateInputValue();
  renderSplitParticipantInputs();
  render();
}

async function checkRecurringTransactions() {
  const today = new Date();
  let added = false;
  
  for (const recurring of recurringTransactions) {
    const lastAdded = recurring.lastAdded ? new Date(recurring.lastAdded) : null;
    let shouldAdd = false;
    
    if (!lastAdded) {
      shouldAdd = true;
    } else {
      const diffDays = Math.floor((today - lastAdded) / (1000 * 60 * 60 * 24));
      if (recurring.frequency === 'weekly' && diffDays >= 7) shouldAdd = true;
      else if (recurring.frequency === 'monthly' && diffDays >= 30) shouldAdd = true;
      else if (recurring.frequency === 'yearly' && diffDays >= 365) shouldAdd = true;
    }
    
    if (shouldAdd) {
      wallet.push({
        id: crypto.randomUUID(),
        title: recurring.title,
        amount: recurring.amount,
        type: recurring.type,
        category: recurring.category,
        date: todayDateInputValue(),
        monthKey: getMonthKeyFromDate(today),
        time: today.toISOString(),
        recurring: true
      });
      recurring.lastAdded = today.toISOString();
      added = true;
    }
  }
  
  if (added) {
    await chrome.storage.local.set({ wallet, recurringTransactions });
    render();
    setStatus("Recurring transactions added.");
  }
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
    checkBudgetAlerts(category, amount);
    setStatus("Entry added.");
  });
}

function checkBudgetAlerts(category, amount) {
  const monthKey = getCurrentMonthKey();
  const categorySpent = getCategorySpent(monthKey, category);
  
  if (categoryBudgets[category] && categorySpent > categoryBudgets[category]) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Category Budget Alert",
      message: `${category} budget exceeded! Spent: ${currency.format(categorySpent)}, Budget: ${currency.format(categoryBudgets[category])}`
    }).catch(() => {});
  }
}

function getCategorySpent(monthKey, category) {
  return wallet.reduce((sum, item) => {
    if (item.type === "expense" && getItemMonthKey(item) === monthKey && item.category === category) {
      return sum + Number(item.amount || 0);
    }
    return sum;
  }, 0);
}

function onCalculateSplit() {
  const title = els.splitTitle?.value.trim();
  const totalAmount = Number(els.splitAmount?.value);
  const people = Number(els.splitPeople?.value);
  const paidByInput = els.splitPaidBy?.value.trim();
  const participants = getSplitParticipants();

  if (!title || !totalAmount || !people) {
    setStatus("Please fill bill title, amount, and number of people.", true);
    return;
  }

  if (people < 2) {
    setStatus("Need at least 2 people to split.", true);
    return;
  }

  if (participants.length !== people) {
    setStatus(`Please add ${people} participant names.`, true);
    return;
  }

  if (new Set(participants.map((person) => person.name.toLowerCase())).size !== participants.length) {
    setStatus("Participant names must be unique.", true);
    return;
  }

  if (paidByInput && !participants.some((person) => person.name.toLowerCase() === paidByInput.toLowerCase())) {
    setStatus("Main payer name must match one of the participants.", true);
    return;
  }

  const splitPaymentResolution = resolveSplitPayments(participants, totalAmount, paidByInput);
  if (splitPaymentResolution.error) {
    setStatus(splitPaymentResolution.error, true);
    return;
  }

  const { participants: resolvedParticipants, totalPaid, paidBy } = splitPaymentResolution;

  const perPerson = round2(totalAmount / people);
  const totalCollected = round2(perPerson * people);
  const adjustment = round2(totalAmount - totalCollected);
  const paidByKey = paidBy.toLowerCase();
  const breakdown = resolvedParticipants.map((person, index) => {
    const share = index === participants.length - 1 ? round2(perPerson + adjustment) : perPerson;
    const balance = round2(person.paid - share);
    const isMainPayer = paidByKey && person.name.toLowerCase() === paidByKey;
    const isPayer = person.paid > 0;

    return {
      name: person.name,
      paid: person.paid,
      share,
      isPayer,
      isMainPayer,
      balance
    };
  });

  currentSplit = {
    title,
    totalAmount: round2(totalAmount),
    people,
    paidBy,
    participants: resolvedParticipants,
    totalPaid,
    breakdown
  };

  els.splitResult.innerHTML = `
    <strong>Split Result</strong>
    <div class="split-summary">
      <div class="split-summary-card">
        <span class="split-summary-label">Total Bill</span>
        <span class="split-summary-value">${currency.format(totalAmount)}</span>
      </div>
      <div class="split-summary-card">
        <span class="split-summary-label">Per Person</span>
        <span class="split-summary-value">${currency.format(round2(totalAmount / people))}</span>
      </div>
      <div class="split-summary-card">
        <span class="split-summary-label">Total Paid Entered</span>
        <span class="split-summary-value">${currency.format(totalPaid)}</span>
      </div>
      <div class="split-summary-card">
        <span class="split-summary-label">Main Payer</span>
        <span class="split-summary-value">${escapeHtml(paidBy || "Auto assigned")}</span>
      </div>
    </div>
    <div class="split-breakdown">
      ${breakdown.map((person) => `
        <div class="split-person-card${person.isPayer ? " is-payer" : ""}${person.isMainPayer ? " is-main-payer" : ""}">
          <div class="split-person-name">${escapeHtml(person.name)}</div>
          <div class="split-person-paid">Paid: ${currency.format(person.paid)}</div>
          <div class="split-person-share">Bill share: ${currency.format(person.share)}</div>
          <div class="split-person-note">${getSplitBalanceMessage(person.balance)}</div>
        </div>
      `).join("")}
    </div>
  `;
  els.splitResult.hidden = false;
  els.addSplitExpense.hidden = false;
  setStatus("Split bill calculated.");
}

function onAddSplitExpense() {
  if (!currentSplit) return;
  
  wallet.push({
    id: crypto.randomUUID(),
    title: `${currentSplit.title} (Split)`,
    amount: currentSplit.totalAmount,
    type: "expense",
    category: "Food",
    date: todayDateInputValue(),
    monthKey: getCurrentMonthKey(),
    time: new Date().toISOString(),
    split: true,
    splitDetails: currentSplit
  });
  
  chrome.storage.local.set({ wallet }).then(() => {
    render();
    setStatus("Split expense added!");
    resetSplitForm();
  });
}

async function onAddRecurring() {
  const title = els.recurringTitle?.value.trim();
  const amount = Number(els.recurringAmount?.value);
  const type = els.recurringType?.value;
  const category = els.recurringCategory?.value;
  const frequency = els.recurringFrequency?.value;

  if (!title || !amount) {
    setStatus("Please fill recurring transaction details.", true);
    return;
  }

  recurringTransactions.push({
    id: crypto.randomUUID(),
    title,
    amount,
    type,
    category,
    frequency,
    lastAdded: null
  });

  await chrome.storage.local.set({ recurringTransactions });
  loadRecurringTransactions();
  setStatus("Recurring transaction added.");
}

async function loadRecurringTransactions() {
  if (!els.recurringList) return;
  
  els.recurringList.textContent = "";
  
  if (recurringTransactions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No recurring transactions.";
    els.recurringList.appendChild(empty);
    return;
  }
  
  for (const recurring of recurringTransactions) {
    const div = document.createElement("div");
    div.className = "recurring-item";

    const info = document.createElement("div");
    info.className = "recurring-info";

    const title = document.createElement("div");
    title.className = "recurring-title";
    title.textContent = recurring.title;

    const details = document.createElement("div");
    details.className = "recurring-details";
    details.textContent = `${currency.format(recurring.amount)} - ${recurring.type} - ${recurring.frequency}`;

    const button = document.createElement("button");
    button.className = "delete-recurring";
    button.dataset.id = recurring.id;
    button.textContent = "Delete";

    info.append(title, details);
    div.append(info, button);
    els.recurringList.appendChild(div);
  }
  
  document.querySelectorAll('.delete-recurring').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      recurringTransactions = recurringTransactions.filter(r => r.id !== id);
      await chrome.storage.local.set({ recurringTransactions });
      loadRecurringTransactions();
      setStatus("Recurring transaction deleted.");
    });
  });
}

async function onExportAllData() {
  const exportData = {
    wallet,
    limit,
    categoryBudgets,
    recurringTransactions,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url,
    filename: `budget_full_backup_${Date.now()}.json`,
    saveAs: true
  }).then(() => {
    setStatus("Data exported successfully.");
  }).catch(() => {
    setStatus("Failed to export data.", true);
  }).finally(() => {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

async function onImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.wallet) wallet = data.wallet;
      if (data.limit !== undefined) limit = data.limit;
      if (data.categoryBudgets) categoryBudgets = data.categoryBudgets;
      if (data.recurringTransactions) recurringTransactions = data.recurringTransactions;
      
      await chrome.storage.local.set({ wallet, limit, categoryBudgets, recurringTransactions });
      render();
      setStatus("Data imported successfully.");
    } catch (error) {
      setStatus("Invalid backup file.", true);
    }
  };
  reader.readAsText(file);
  els.importFile.value = "";
}

async function onBackupData() {
  await onExportAllData();
}

async function onRestoreBackup() {
  if (confirm("Restore backup? This will overwrite all current data.")) {
    els.importFile.click();
  }
}

async function generateInsights() {
  if (!els.insights) return;
  
  const currentMonth = getCurrentMonthKey();
  const monthlyExpenses = getMonthlyExpense(currentMonth);
  const categorySpending = {};
  
  wallet.forEach(item => {
    if (item.type === "expense" && getItemMonthKey(item) === currentMonth) {
      categorySpending[item.category] = (categorySpending[item.category] || 0) + item.amount;
    }
  });
  
  const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];
  const totalBudget = limit;
  const percentUsed = totalBudget > 0 ? (monthlyExpenses / totalBudget) * 100 : 0;
  
  let insightsHtml = '<div class="insight-item">📊 Monthly Spending: ' + currency.format(monthlyExpenses) + '</div>';
  
  if (totalBudget > 0) {
    insightsHtml += `<div class="insight-item">🎯 Budget Used: ${percentUsed.toFixed(1)}%</div>`;
    if (percentUsed > 80) {
      insightsHtml += '<div class="insight-item">⚠️ You\'re close to your monthly budget limit!</div>';
    }
  }
  
  if (topCategory) {
    insightsHtml += `<div class="insight-item">🍽️ Highest spending category: ${escapeHtml(topCategory[0])} (${currency.format(topCategory[1])})</div>`;
  }
  
  const suggestions = [];
  if (categorySpending.Food && categorySpending.Food > monthlyExpenses * 0.3) {
    suggestions.push("Consider reducing dining out expenses");
  }
  if (categorySpending.Shopping && categorySpending.Shopping > monthlyExpenses * 0.2) {
    suggestions.push("Shopping expenses are high this month");
  }
  
  if (suggestions.length > 0) {
    insightsHtml += '<div class="insight-item">💡 Suggestions:<br>' + suggestions.map(s => `• ${s}`).join('<br>') + '</div>';
  }
  
  if (monthlyExpenses === 0) {
    insightsHtml += '<div class="insight-item">Add some expenses to see insights!</div>';
  }
  
  els.insights.innerHTML = insightsHtml;
}

function onSetCategoryBudget() {
  const category = els.budgetCategory?.value;
  const amount = Number(els.budgetAmount?.value);
  
  if (!category || !amount || amount <= 0) {
    setStatus("Please enter a valid budget amount.", true);
    return;
  }
  
  categoryBudgets[category] = amount;
  chrome.storage.local.set({ categoryBudgets }).then(() => {
    renderCategoryBudgets();
    setStatus(`${category} budget set to ${currency.format(amount)}`);
    els.budgetAmount.value = "";
  });
}

function renderCategoryBudgets() {
  if (!els.categoryBudgets) return;
  
  const monthKey = getCurrentMonthKey();
  els.categoryBudgets.textContent = "";
  
  if (Object.keys(categoryBudgets).length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No category budgets set.";
    els.categoryBudgets.appendChild(empty);
    return;
  }
  
  for (const [category, budget] of Object.entries(categoryBudgets)) {
    const spent = getCategorySpent(monthKey, category);
    const percent = Math.min((spent / budget) * 100, 100);
    
    const div = document.createElement("div");
    div.className = "category-budget-item";

    const name = document.createElement("div");
    name.className = "category-budget-name";
    name.textContent = category;

    const progressWrap = document.createElement("div");
    progressWrap.className = "category-budget-progress";

    const progressBar = document.createElement("progress");
    progressBar.className = "category-budget-bar";
    progressBar.max = 100;
    progressBar.value = Number.isFinite(percent) ? percent : 0;
    progressWrap.appendChild(progressBar);

    const spentLabel = document.createElement("div");
    spentLabel.className = "category-budget-spent";
    spentLabel.textContent = `${currency.format(spent)} / ${currency.format(budget)}`;

    div.append(name, progressWrap, spentLabel);
    els.categoryBudgets.appendChild(div);
  }
}

function renderFilteredHistory() {
  if (!els.searchInput) return;
  
  const searchTerm = els.searchInput.value.toLowerCase();
  const typeFilter = els.filterType?.value || "all";
  const categoryFilter = els.filterCategory?.value || "all";
  
  let filtered = getFilteredWallet();
  
  if (searchTerm) {
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm)
    );
  }
  
  if (typeFilter !== "all") {
    filtered = filtered.filter(item => item.type === typeFilter);
  }
  
  if (categoryFilter !== "all") {
    filtered = filtered.filter(item => item.category === categoryFilter);
  }
  
  renderHistory(filtered);
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
  if (window.drawChart) drawChart(list);
  renderLimitInfo();
  if (document.querySelector('.tab-btn.active')?.dataset.tab === 'budgets') {
    renderCategoryBudgets();
  }
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
  if (!els.history) return;
  els.history.textContent = "";

  if (!list.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No transactions found.";
    els.history.appendChild(empty);
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.time) - new Date(a.time));
  sorted.slice(0, 50).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-main";
    main.textContent = `${item.title} (${item.category})${item.split ? ' [Split]' : ''}${item.recurring ? ' [Recurring]' : ''}`;

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
    if (els.limitInfo) els.limitInfo.textContent = "No monthly limit set.";
    if (els.limitBar) els.limitBar.value = 0;
    return;
  }

  const percent = Math.min((monthlySpent / limit) * 100, 100);
  if (els.limitBar) els.limitBar.value = Math.max(percent, 0);

  const remaining = limit - monthlySpent;
  if (els.limitInfo) {
    if (remaining >= 0) {
      els.limitInfo.textContent = `${currency.format(monthlySpent)} spent this month. ${currency.format(remaining)} remaining.`;
    } else {
      els.limitInfo.textContent = `${currency.format(monthlySpent)} spent this month. Over limit by ${currency.format(Math.abs(remaining))}.`;
    }
  }
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

function onClearHistory() {
  if (!window.confirm("Delete all transaction history?")) return;

  wallet = [];
  activeFilterMonth = "";
  if (els.monthFilter) els.monthFilter.value = "";
  chrome.storage.local.set({ wallet }).then(() => {
    render();
    setStatus("All history cleared.");
  });
}

function renderSplitParticipantInputs() {
  if (!els.splitParticipants) return;

  const people = Math.max(0, Number(els.splitPeople?.value) || 0);
  const existingParticipants = Array.from(els.splitParticipants.querySelectorAll(".split-person-row")).map((row) => ({
    name: row.querySelector(".split-person-input")?.value || "",
    paid: row.querySelector(".split-paid-input")?.value || ""
  }));
  els.splitParticipants.textContent = "";

  if (people < 1) return;

  for (let index = 0; index < people; index += 1) {
    const row = document.createElement("div");
    row.className = "split-person-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "split-person-input";
    nameInput.placeholder = `Person ${index + 1} name`;
    nameInput.value = existingParticipants[index]?.name || "";

    const paidInput = document.createElement("input");
    paidInput.type = "number";
    paidInput.step = "0.01";
    paidInput.min = "0";
    paidInput.className = "split-paid-input";
    paidInput.placeholder = "Paid amount";
    paidInput.value = existingParticipants[index]?.paid || "";

    row.append(nameInput, paidInput);
    els.splitParticipants.appendChild(row);
  }

  syncSplitPayerName();
}

function syncSplitPayerName() {
  if (!els.splitParticipants) return;

  const payerName = els.splitPaidBy?.value.trim();
  const participantInputs = Array.from(els.splitParticipants.querySelectorAll(".split-person-input"));
  if (!participantInputs.length || !payerName) return;

  const alreadyIncluded = participantInputs.some((input) => input.value.trim().toLowerCase() === payerName.toLowerCase());
  if (!alreadyIncluded && !participantInputs[0].value.trim()) {
    participantInputs[0].value = payerName;
  }
}

function getSplitParticipants() {
  if (!els.splitParticipants) return [];

  return Array.from(els.splitParticipants.querySelectorAll(".split-person-row"))
    .map((row, index) => {
      const enteredName = row.querySelector(".split-person-input")?.value.trim() || "";
      const paid = Number(row.querySelector(".split-paid-input")?.value || 0);

      return {
        name: enteredName || `Person ${index + 1}`,
        paid: round2(Number.isFinite(paid) ? paid : 0)
      };
    });
}

function resetSplitForm() {
  els.splitTitle.value = "";
  els.splitAmount.value = "";
  els.splitPeople.value = "";
  els.splitPaidBy.value = "";
  els.splitResult.innerHTML = "";
  els.splitResult.hidden = true;
  els.addSplitExpense.hidden = true;
  currentSplit = null;
  renderSplitParticipantInputs();
}

function getSplitBalanceMessage(balance) {
  if (balance > 0) {
    return `Should receive ${currency.format(balance)} back.`;
  }

  if (balance < 0) {
    return `Needs to pay ${currency.format(Math.abs(balance))} more.`;
  }

  return "Already settled exactly.";
}

function resolveSplitPayments(participants, totalAmount, paidByInput) {
  const normalizedParticipants = participants.map((person) => ({
    name: person.name,
    paid: round2(Math.max(0, Number(person.paid) || 0))
  }));

  let totalPaid = round2(normalizedParticipants.reduce((sum, person) => sum + person.paid, 0));
  if (totalPaid > round2(totalAmount)) {
    return {
      error: `Paid amount is more than the bill total. Currently paid: ${currency.format(totalPaid)}.`
    };
  }

  let payerName = paidByInput;
  let payerIndex = payerName
    ? normalizedParticipants.findIndex((person) => person.name.toLowerCase() === payerName.toLowerCase())
    : -1;

  if (payerIndex === -1) {
    const contributors = normalizedParticipants
      .map((person, index) => ({ ...person, index }))
      .filter((person) => person.paid > 0);

    if (contributors.length === 1) {
      payerIndex = contributors[0].index;
      payerName = contributors[0].name;
    } else if (contributors.length === 0 && normalizedParticipants.length > 0) {
      payerIndex = 0;
      payerName = normalizedParticipants[0].name;
    }
  }

  const remaining = round2(totalAmount - totalPaid);
  if (remaining > 0) {
    if (payerIndex === -1) {
      return {
        error: "Add a main payer name or complete the paid amounts so the bill can be balanced."
      };
    }

    normalizedParticipants[payerIndex].paid = round2(normalizedParticipants[payerIndex].paid + remaining);
    totalPaid = round2(totalPaid + remaining);
  }

  return {
    participants: normalizedParticipants,
    totalPaid,
    paidBy: payerName
  };
}

function setStatus(message, isError = false) {
  if (els.status) {
    els.status.textContent = message || "";
    els.status.classList.remove("is-error", "is-info");
    if (message) {
      els.status.classList.add(isError ? "is-error" : "is-info");
    }
    setTimeout(() => {
      if (els.status.textContent === message) {
        els.status.textContent = "";
        els.status.classList.remove("is-error", "is-info");
      }
    }, 3000);
  }
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

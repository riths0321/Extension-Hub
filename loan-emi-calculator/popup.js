const amountInput = document.getElementById("amount");
const rateInput = document.getElementById("rate");
const monthsInput = document.getElementById("months");

const emiEl = document.getElementById("emi");
const interestEl = document.getElementById("interest");
const totalEl = document.getElementById("total");
const principalShareEl = document.getElementById("principalShare");
const interestShareEl = document.getElementById("interestShare");
const messageEl = document.getElementById("message");

const calculateBtn = document.getElementById("calculate");
const resetBtn = document.getElementById("reset");

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
}

function formatINR(value) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function validateInputs(principal, annualRate, months) {
  if (!Number.isFinite(principal) || principal <= 0) {
    return "Enter a valid loan amount.";
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 60) {
    return "Enter an annual interest rate between 0 and 60.";
  }
  if (!Number.isFinite(months) || months < 1 || months > 600) {
    return "Enter tenure between 1 and 600 months.";
  }
  return "";
}

function calculateEMI(principal, annualRate, months) {
  const monthlyRate = annualRate / 12 / 100;

  if (monthlyRate === 0) {
    const emi = principal / months;
    const totalPayment = principal;
    const totalInterest = 0;
    return { emi, totalPayment, totalInterest };
  }

  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;

  return { emi, totalPayment, totalInterest };
}

function renderResults(principal, results) {
  emiEl.textContent = formatINR(results.emi);
  interestEl.textContent = formatINR(results.totalInterest);
  totalEl.textContent = formatINR(results.totalPayment);

  const principalPct = (principal / results.totalPayment) * 100;
  const interestPct = (results.totalInterest / results.totalPayment) * 100;

  principalShareEl.textContent = `${principalPct.toFixed(1)}%`;
  interestShareEl.textContent = `${interestPct.toFixed(1)}%`;
}

function clearResults() {
  emiEl.textContent = "-";
  interestEl.textContent = "-";
  totalEl.textContent = "-";
  principalShareEl.textContent = "-";
  interestShareEl.textContent = "-";
}

function handleCalculate() {
  const principal = Number(amountInput.value);
  const annualRate = Number(rateInput.value);
  const months = Number(monthsInput.value);

  const validationError = validateInputs(principal, annualRate, months);
  if (validationError) {
    setMessage(validationError, true);
    clearResults();
    return;
  }

  const result = calculateEMI(principal, annualRate, months);
  renderResults(principal, result);
  setMessage("Calculation updated.");
}

function handleReset() {
  amountInput.value = "";
  rateInput.value = "";
  monthsInput.value = "";
  clearResults();
  setMessage("Reset complete.");
}

function setupQuickMonths() {
  document.querySelectorAll(".quick").forEach((btn) => {
    btn.addEventListener("click", () => {
      monthsInput.value = btn.dataset.months;
    });
  });
}

calculateBtn.addEventListener("click", handleCalculate);
resetBtn.addEventListener("click", handleReset);
setupQuickMonths();
setMessage("Enter values and calculate EMI.");

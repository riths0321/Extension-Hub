// ─────────────────────────────────────────
// EMI Pro — popup.js
// ─────────────────────────────────────────

// DOM refs
const amountInput       = document.getElementById("amount");
const rateInput         = document.getElementById("rate");
const monthsInput       = document.getElementById("months");
const prepaymentInput   = document.getElementById("prepayment");
const emiEl             = document.getElementById("emi");
const principalDisplay  = document.getElementById("principalDisplay");
const interestEl        = document.getElementById("interest");
const totalEl           = document.getElementById("total");
const savedInterestEl   = document.getElementById("savedInterest");
const savedTimeEl       = document.getElementById("savedTime");
const sipAmountEl       = document.getElementById("sipAmount");
const prepayBox         = document.getElementById("prepay-insight");
const sipBox            = document.getElementById("sip-insight");
const messageEl         = document.getElementById("message");

// Comparison
const compareRateInput    = document.getElementById("compareRate");
const compareMonthsInput  = document.getElementById("compareMonths");
const comparisonResultDiv = document.getElementById("comparisonResult");
const compareBtn          = document.getElementById("compareBtn");

// Health
const healthScoreBox  = document.getElementById("healthScoreBox");
const emiRatioEl      = document.getElementById("emiRatio");
const healthRatingEl  = document.getElementById("healthRating");
const healthAdviceEl  = document.getElementById("healthAdvice");
const updateIncomeBtn = document.getElementById("updateIncomeBtn");

// Ratio bar
const ratioSection  = document.getElementById("ratioSection");
const principalBar  = document.getElementById("principalBar");
const interestBar   = document.getElementById("interestBar");
const principalPct  = document.getElementById("principalPct");
const interestPct   = document.getElementById("interestPct");

// Ring
const progressRing = document.getElementById("progressRing");
const RING_CIRCUM   = 326.7; // 2π × 52

// State
let currentLoanData = { principal: 0, rate: 0, months: 0, emi: 0, totalInterest: 0 };
let userMonthlyIncome = null;
let activeChip = null;

// ── Formatters ───────────────────────────────────
function fmt(v) {
  return "₹ " + Math.round(v).toLocaleString("en-IN");
}
function fmtFull(v) {
  return "₹ " + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Core Math ────────────────────────────────────
function calcEMI(p, r, n) {
  if (p <= 0 || r <= 0 || n <= 0) return null;
  const mr = r / 12 / 100;
  const f  = Math.pow(1 + mr, n);
  return (p * mr * f) / (f - 1);
}

function calcSIP(target, years, ar = 12) {
  if (target <= 0 || years <= 0) return 0;
  const r = ar / 12 / 100, n = years * 12;
  return target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

function calcPrepayImpact(p, r, n, emi, extra) {
  if (extra <= 0) return null;
  const mr = r / 12 / 100;
  let bal = p, months = 0, interest = 0;
  while (bal > 0 && months < 600) {
    const iM = bal * mr;
    const pM = (emi + extra) - iM;
    if (pM <= 0) break;
    interest += iM;
    bal -= pM;
    months++;
  }
  const origInterest = (emi * n) - p;
  return {
    interestSaved: Math.max(0, origInterest - interest),
    timeSaved: Math.max(0, n - months)
  };
}

// ── Ring Animation ───────────────────────────────
function setRing(interestFraction) {
  // Higher interest = more of the ring filled (shows cost visually)
  const pct    = Math.min(Math.max(interestFraction, 0.05), 0.95);
  const offset = RING_CIRCUM * (1 - pct);
  progressRing.style.strokeDashoffset = offset;
}

// ── Health Score ─────────────────────────────────
function showHealthScore(emi) {
  if (!userMonthlyIncome) {
    const input = prompt("Enter your monthly income (₹) for Health Score:", "50000");
    if (!input || isNaN(input) || Number(input) <= 0) return;
    userMonthlyIncome = Number(input);
  }
  const ratio = (emi / userMonthlyIncome) * 100;
  emiRatioEl.textContent = ratio.toFixed(1) + "%";

  let rating, advice;
  if (ratio <= 30) {
    rating = "Excellent ✅";
    advice = "Your EMI is within the ideal 30% limit — great financial flexibility!";
    healthRatingEl.style.color = "var(--green)";
  } else if (ratio <= 40) {
    rating = "Moderate ⚠️";
    advice = "Above 30% of income. Consider reducing debt or boosting income to stay safe.";
    healthRatingEl.style.color = "var(--gold)";
  } else {
    rating = "High Risk ❌";
    advice = "EMI exceeds 40% of income! Prepay or extend tenure to reduce stress.";
    healthRatingEl.style.color = "var(--red)";
  }
  healthRatingEl.textContent = rating;
  healthAdviceEl.textContent = advice;
  healthScoreBox.style.display = "block";
}

// ── Comparison ───────────────────────────────────
function compareLoan() {
  if (currentLoanData.principal <= 0) {
    comparisonResultDiv.innerHTML = `<p class="hint center">⚠️ Calculate your loan first.</p>`;
    return;
  }
  const cr = parseFloat(compareRateInput.value);
  const cn = parseInt(compareMonthsInput.value, 10);
  if (!cr || !cn || cr <= 0 || cn <= 0) {
    comparisonResultDiv.innerHTML = `<p class="hint center">⚠️ Enter valid alt. rate and tenure.</p>`;
    return;
  }
  const cEmi = calcEMI(currentLoanData.principal, cr, cn);
  if (!cEmi) return;
  const cTotal    = cEmi * cn;
  const cInterest = cTotal - currentLoanData.principal;
  const myTotal   = currentLoanData.emi * currentLoanData.months;
  const diff      = currentLoanData.totalInterest - cInterest;

  let verdict;
  if (diff > 0)      verdict = `<div class="comp-verdict good">✅ Alternative saves ${fmtFull(diff)} in interest</div>`;
  else if (diff < 0) verdict = `<div class="comp-verdict warn">⚠️ Current loan is cheaper by ${fmtFull(Math.abs(diff))}</div>`;
  else               verdict = `<div class="comp-verdict neutral">📊 Both options cost the same</div>`;

  comparisonResultDiv.innerHTML = `
    <div class="comparison-table">
      <div class="comp-header">
        <span></span><strong>Current</strong><strong>Alternative</strong>
      </div>
      <div class="comp-row">
        <span>Rate</span><span>${currentLoanData.rate}%</span><span>${cr}%</span>
      </div>
      <div class="comp-row">
        <span>EMI</span><span>${fmtFull(currentLoanData.emi)}</span><span>${fmtFull(cEmi)}</span>
      </div>
      <div class="comp-row">
        <span>Interest</span><span>${fmtFull(currentLoanData.totalInterest)}</span><span>${fmtFull(cInterest)}</span>
      </div>
      <div class="comp-row">
        <span>Total</span><span>${fmtFull(myTotal)}</span><span>${fmtFull(cTotal)}</span>
      </div>
    </div>
    ${verdict}
  `;
}

// ── Message ──────────────────────────────────────
function setMsg(text, color = "var(--text-2)") {
  messageEl.textContent = text;
  messageEl.style.color = color;
  clearTimeout(window._msgTimer);
  window._msgTimer = setTimeout(() => {
    if (messageEl.textContent === text) messageEl.textContent = "";
  }, 4000);
}

// ── Main Calculate ────────────────────────────────
function calculate() {
  const p     = Number(amountInput.value);
  const r     = Number(rateInput.value);
  const n     = Number(monthsInput.value);
  const extra = Number(prepaymentInput.value) || 0;

  if (p <= 0 || r <= 0 || n <= 0) {
    setMsg("Please fill in amount, rate and tenure.", "var(--red)");
    return;
  }

  const emi          = calcEMI(p, r, n);
  const totalInterest = (emi * n) - p;
  const totalPayable  = emi * n;

  currentLoanData = { principal: p, rate: r, months: n, emi, totalInterest };

  // EMI display
  emiEl.textContent           = fmtFull(emi);
  principalDisplay.textContent = fmt(p);
  interestEl.textContent      = fmt(totalInterest);
  totalEl.textContent         = fmt(totalPayable);

  // Ring — fill proportional to interest share of total
  setRing(totalInterest / totalPayable);

  // Ratio bar
  const pPct = (p / totalPayable) * 100;
  const iPct = (totalInterest / totalPayable) * 100;
  principalBar.style.width = pPct + "%";
  interestBar.style.width  = iPct + "%";
  principalPct.textContent = pPct.toFixed(1) + "% principal";
  interestPct.textContent  = iPct.toFixed(1) + "% interest";
  ratioSection.style.display = "block";

  // Prepayment
  if (extra > 0) {
    const impact = calcPrepayImpact(p, r, n, emi, extra);
    if (impact && impact.interestSaved > 0) {
      savedInterestEl.textContent = fmtFull(impact.interestSaved);
      savedTimeEl.textContent = `${impact.timeSaved} month${impact.timeSaved !== 1 ? "s" : ""} early`;
      prepayBox.style.display = "block";
    } else {
      prepayBox.style.display = "none";
    }
  } else {
    prepayBox.style.display = "none";
  }

  // SIP Offset
  if (totalInterest > 0) {
    const sip = calcSIP(totalInterest, n / 12);
    sipAmountEl.textContent = fmtFull(sip);
    sipBox.style.display = "block";
  } else {
    sipBox.style.display = "none";
  }

  // Health Score
  showHealthScore(emi);

  setMsg("✅ Calculated! Use Compare to find a better deal.", "var(--green)");
}

// ── Reset ────────────────────────────────────────
function reset() {
  amountInput.value      = "500000";
  rateInput.value        = "8.5";
  monthsInput.value      = "60";
  prepaymentInput.value  = "0";
  if (compareRateInput)   compareRateInput.value  = "";
  if (compareMonthsInput) compareMonthsInput.value = "";

  emiEl.textContent = "₹ —";
  principalDisplay.textContent = "—";
  interestEl.textContent = "—";
  totalEl.textContent = "—";

  progressRing.style.strokeDashoffset = RING_CIRCUM;
  ratioSection.style.display = "none";
  prepayBox.style.display    = "none";
  sipBox.style.display       = "none";
  healthScoreBox.style.display = "none";
  comparisonResultDiv.innerHTML = `<p class="hint center">Enter alt. rate &amp; tenure above to compare →</p>`;
  currentLoanData = { principal: 0, rate: 0, months: 0, emi: 0, totalInterest: 0 };

  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  setMsg("Reset to defaults.");
}

// ── Update Income ─────────────────────────────────
function updateIncome() {
  const v = prompt("Enter your monthly income (₹):", userMonthlyIncome || "50000");
  if (v && !isNaN(v) && Number(v) > 0) {
    userMonthlyIncome = Number(v);
    const curEmi = parseFloat(emiEl.textContent.replace(/[^0-9.]/g, ""));
    if (!isNaN(curEmi) && curEmi > 0) showHealthScore(curEmi);
    setMsg("Income updated!", "var(--green)");
  }
}

// ── Wire up ───────────────────────────────────────
document.getElementById("calculate").addEventListener("click", calculate);
document.getElementById("reset").addEventListener("click", reset);
if (compareBtn)    compareBtn.addEventListener("click", compareLoan);
if (updateIncomeBtn) updateIncomeBtn.addEventListener("click", updateIncome);

// Chip buttons
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    monthsInput.value = btn.dataset.months;
    clearTimeout(window._autoCalc);
    window._autoCalc = setTimeout(calculate, 150);
  });
});

// Auto-recalculate on input change
[amountInput, rateInput, monthsInput, prepaymentInput].forEach(el => {
  if (el) el.addEventListener("input", () => {
    clearTimeout(window._autoCalc);
    window._autoCalc = setTimeout(calculate, 500);
  });
});

// ─────────────────────────────────────────
// Theme Toggle - Dark/Light Mode
// ─────────────────────────────────────────

function initTheme() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('emiProTheme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark'); // default to dark
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('emiProTheme', newTheme);
  
  // Optional: Show a quick feedback message
  const originalText = messageEl.textContent;
  messageEl.textContent = `🌓 ${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`;
  messageEl.style.color = "var(--green)";
  setTimeout(() => {
    if (messageEl.textContent === `🌓 ${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`) {
      messageEl.textContent = originalText !== `🌓 ${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated` ? originalText : "";
    }
  }, 1500);
}

// Add theme toggle event listener
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// Initialize theme on load
initTheme();

// Boot
setTimeout(calculate, 120);
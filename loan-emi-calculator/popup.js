// ─────────────────────────────────────────
// EMI Pro — popup.js  (fixed & production-ready)
// ─────────────────────────────────────────

// ── DOM refs ─────────────────────────────
const amountInput       = document.getElementById('amount');
const rateInput         = document.getElementById('rate');
const monthsInput       = document.getElementById('months');
const prepaymentInput   = document.getElementById('prepayment');
const emiEl             = document.getElementById('emi');
const principalDisplay  = document.getElementById('principalDisplay');
const interestEl        = document.getElementById('interest');
const totalEl           = document.getElementById('total');
const savedInterestEl   = document.getElementById('savedInterest');
const savedTimeEl       = document.getElementById('savedTime');
const sipAmountEl       = document.getElementById('sipAmount');
const prepayBox         = document.getElementById('prepay-insight');
const sipBox            = document.getElementById('sip-insight');
const messageEl         = document.getElementById('message');

const compareRateInput    = document.getElementById('compareRate');
const compareMonthsInput  = document.getElementById('compareMonths');
const comparisonResultDiv = document.getElementById('comparisonResult');
const compareBtn          = document.getElementById('compareBtn');

const healthScoreBox  = document.getElementById('healthScoreBox');
const emiRatioEl      = document.getElementById('emiRatio');
const healthRatingEl  = document.getElementById('healthRating');
const healthAdviceEl  = document.getElementById('healthAdvice');
const updateIncomeBtn = document.getElementById('updateIncomeBtn');

const ratioSection  = document.getElementById('ratioSection');
const principalBar  = document.getElementById('principalBar');
const interestBar   = document.getElementById('interestBar');
const principalPct  = document.getElementById('principalPct');
const interestPct   = document.getElementById('interestPct');

const progressRing  = document.getElementById('progressRing');
const RING_CIRCUM   = 326.7;

// Income Modal
const incomeModal     = document.getElementById('incomeModal');
const incomeInput     = document.getElementById('incomeInput');
const incomeConfirmBtn= document.getElementById('incomeConfirmBtn');
const incomeCancelBtn = document.getElementById('incomeCancelBtn');

// State
let currentLoanData   = { principal: 0, rate: 0, months: 0, emi: 0, totalInterest: 0 };
let userMonthlyIncome = null;
let pendingIncomeAction = null; // 'calculate' | 'update'

// ── Formatters ────────────────────────────
function fmt(v) {
  return '₹ ' + Math.round(v).toLocaleString('en-IN');
}
function fmtFull(v) {
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Core Math ─────────────────────────────
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
    timeSaved:     Math.max(0, n - months)
  };
}

// ── Ring Animation ─────────────────────────
function setRing(interestFraction) {
  const pct    = Math.min(Math.max(interestFraction, 0.05), 0.95);
  const offset = RING_CIRCUM * (1 - pct);
  progressRing.style.strokeDashoffset = offset;
}

// ── Income Modal (replaces blocked prompt()) ─
function openIncomeModal(action) {
  pendingIncomeAction = action;
  incomeInput.value   = userMonthlyIncome || '';
  incomeModal.style.display = 'flex';
  incomeInput.focus();
}

function closeIncomeModal() {
  incomeModal.style.display = 'none';
  pendingIncomeAction = null;
}

function confirmIncome() {
  const v = Number(incomeInput.value);
  if (!v || v <= 0) {
    incomeInput.style.borderColor = 'var(--red)';
    setTimeout(() => { incomeInput.style.borderColor = ''; }, 1200);
    return;
  }
  userMonthlyIncome = v;
  closeIncomeModal();

  if (pendingIncomeAction === 'update') {
    // Re-run health score with existing EMI
    const rawEmi = emiEl.textContent.replace(/[^0-9.]/g, '');
    const curEmi = parseFloat(rawEmi);
    if (!isNaN(curEmi) && curEmi > 0) showHealthScore(curEmi);
    setMsg('Income updated!', 'var(--green)');
  } else {
    // Was triggered from calculate — run health display now
    const rawEmi = emiEl.textContent.replace(/[^0-9.]/g, '');
    const curEmi = parseFloat(rawEmi);
    if (!isNaN(curEmi) && curEmi > 0) showHealthScore(curEmi);
  }
}

// ── Health Score ──────────────────────────
function showHealthScore(emi) {
  if (!userMonthlyIncome) {
    openIncomeModal('calculate');
    return;
  }
  const ratio = (emi / userMonthlyIncome) * 100;
  emiRatioEl.textContent = ratio.toFixed(1) + '%';

  let rating, advice;
  if (ratio <= 30) {
    rating = 'Excellent ✅';
    advice = 'Your EMI is within the ideal 30% limit — great financial flexibility!';
    healthRatingEl.style.color = 'var(--green)';
  } else if (ratio <= 40) {
    rating = 'Moderate ⚠️';
    advice = 'Above 30% of income. Consider reducing debt or boosting income to stay safe.';
    healthRatingEl.style.color = 'var(--amber)';
  } else {
    rating = 'High Risk ❌';
    advice = 'EMI exceeds 40% of income! Prepay or extend tenure to reduce stress.';
    healthRatingEl.style.color = 'var(--red)';
  }
  healthRatingEl.textContent = rating;
  healthAdviceEl.textContent = advice;
  healthScoreBox.style.display = 'block';
}

// ── CSP-safe DOM builder for comparison results ─
function buildCompareHint(text) {
  const p = document.createElement('p');
  p.className = 'hint center';
  p.textContent = text;
  return p;
}

function buildComparisonTable(cur, alt) {
  const wrap = document.createElement('div');

  // Table
  const table = document.createElement('div');
  table.className = 'comparison-table';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'comp-header';
  ['', 'Current', 'Alternative'].forEach(txt => {
    const s = document.createElement('strong');
    s.textContent = txt;
    hdr.appendChild(s);
  });
  table.appendChild(hdr);

  // Rows
  const rows = [
    ['Rate',     cur.rate + '%',            alt.rate + '%'],
    ['EMI',      fmtFull(cur.emi),          fmtFull(alt.emi)],
    ['Interest', fmtFull(cur.totalInterest),fmtFull(alt.totalInterest)],
    ['Total',    fmtFull(cur.total),        fmtFull(alt.total)],
  ];
  rows.forEach(([label, c, a]) => {
    const row = document.createElement('div');
    row.className = 'comp-row';
    [label, c, a].forEach(txt => {
      const span = document.createElement('span');
      span.textContent = txt;
      row.appendChild(span);
    });
    table.appendChild(row);
  });

  wrap.appendChild(table);

  // Verdict
  const diff = cur.totalInterest - alt.totalInterest;
  const verdict = document.createElement('div');
  verdict.className = 'comp-verdict';
  if (diff > 0) {
    verdict.classList.add('good');
    verdict.textContent = '✅ Alternative saves ' + fmtFull(diff) + ' in interest';
  } else if (diff < 0) {
    verdict.classList.add('warn');
    verdict.textContent = '⚠️ Current loan is cheaper by ' + fmtFull(Math.abs(diff));
  } else {
    verdict.classList.add('neutral');
    verdict.textContent = '📊 Both options cost the same';
  }
  wrap.appendChild(verdict);

  return wrap;
}

// ── Comparison ────────────────────────────
function compareLoan() {
  comparisonResultDiv.textContent = '';

  if (currentLoanData.principal <= 0) {
    comparisonResultDiv.appendChild(buildCompareHint('⚠️ Calculate your loan first.'));
    return;
  }
  const cr = parseFloat(compareRateInput.value);
  const cn = parseInt(compareMonthsInput.value, 10);
  if (!cr || !cn || cr <= 0 || cn <= 0) {
    comparisonResultDiv.appendChild(buildCompareHint('⚠️ Enter valid alt. rate and tenure.'));
    return;
  }
  const cEmi      = calcEMI(currentLoanData.principal, cr, cn);
  if (!cEmi) return;
  const cTotal    = cEmi * cn;
  const cInterest = cTotal - currentLoanData.principal;
  const myTotal   = currentLoanData.emi * currentLoanData.months;

  const tableEl = buildComparisonTable(
    { rate: currentLoanData.rate, emi: currentLoanData.emi, totalInterest: currentLoanData.totalInterest, total: myTotal },
    { rate: cr,                   emi: cEmi,                totalInterest: cInterest,                     total: cTotal  }
  );
  comparisonResultDiv.appendChild(tableEl);
}

// ── Message ───────────────────────────────
function setMsg(text, color) {
  messageEl.textContent = text;
  messageEl.style.color = color || 'var(--text-2)';
  clearTimeout(window._msgTimer);
  window._msgTimer = setTimeout(() => {
    if (messageEl.textContent === text) messageEl.textContent = '';
  }, 4000);
}

// ── Main Calculate ─────────────────────────
function calculate() {
  const p     = Number(amountInput.value);
  const r     = Number(rateInput.value);
  const n     = Number(monthsInput.value);
  const extra = Number(prepaymentInput.value) || 0;

  if (p <= 0 || r <= 0 || n <= 0) {
    setMsg('Please fill in amount, rate and tenure.', 'var(--red)');
    return;
  }

  const emi           = calcEMI(p, r, n);
  const totalInterest = (emi * n) - p;
  const totalPayable  = emi * n;

  currentLoanData = { principal: p, rate: r, months: n, emi, totalInterest };

  emiEl.textContent            = fmtFull(emi);
  principalDisplay.textContent = fmt(p);
  interestEl.textContent       = fmt(totalInterest);
  totalEl.textContent          = fmt(totalPayable);

  setRing(totalInterest / totalPayable);

  const pPct = (p / totalPayable) * 100;
  const iPct = (totalInterest / totalPayable) * 100;
  principalBar.style.width = pPct + '%';
  interestBar.style.width  = iPct + '%';
  principalPct.textContent = pPct.toFixed(1) + '% principal';
  interestPct.textContent  = iPct.toFixed(1) + '% interest';
  ratioSection.style.display = 'block';

  // Prepayment impact
  if (extra > 0) {
    const impact = calcPrepayImpact(p, r, n, emi, extra);
    if (impact && impact.interestSaved > 0) {
      savedInterestEl.textContent = fmtFull(impact.interestSaved);
      savedTimeEl.textContent = impact.timeSaved + ' month' + (impact.timeSaved !== 1 ? 's' : '') + ' early';
      prepayBox.style.display = 'block';
    } else {
      prepayBox.style.display = 'none';
    }
  } else {
    prepayBox.style.display = 'none';
  }

  // SIP offset
  if (totalInterest > 0) {
    const sip = calcSIP(totalInterest, n / 12);
    sipAmountEl.textContent = fmtFull(sip);
    sipBox.style.display = 'block';
  } else {
    sipBox.style.display = 'none';
  }

  // Health score
  showHealthScore(emi);

  setMsg('✅ Calculated! Use Compare to find a better deal.', 'var(--green)');
}

// ── Reset ─────────────────────────────────
function reset() {
  amountInput.value     = '500000';
  rateInput.value       = '8.5';
  monthsInput.value     = '60';
  prepaymentInput.value = '0';
  if (compareRateInput)   compareRateInput.value   = '';
  if (compareMonthsInput) compareMonthsInput.value = '';

  emiEl.textContent            = '₹ —';
  principalDisplay.textContent = '—';
  interestEl.textContent       = '—';
  totalEl.textContent          = '—';

  progressRing.style.strokeDashoffset = RING_CIRCUM;
  ratioSection.style.display   = 'none';
  prepayBox.style.display      = 'none';
  sipBox.style.display         = 'none';
  healthScoreBox.style.display = 'none';

  // Reset comparison div — CSP-safe
  comparisonResultDiv.textContent = '';
  comparisonResultDiv.appendChild(buildCompareHint('Enter alt. rate & tenure above to compare →'));

  currentLoanData = { principal: 0, rate: 0, months: 0, emi: 0, totalInterest: 0 };
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  setMsg('Reset to defaults.');
}

// ── Theme — FIX: localStorage → chrome.storage.local ─
function initTheme() {
  chrome.storage.local.get('emiProTheme', result => {
    // Default: light mode (open hote hi light dikhe)
    const theme = result.emiProTheme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  chrome.storage.local.set({ emiProTheme: next });
  setMsg('🌓 ' + (next === 'dark' ? 'Dark' : 'Light') + ' mode activated', 'var(--green)');
}

// ── Wire up ───────────────────────────────
document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('reset').addEventListener('click', reset);
if (compareBtn)      compareBtn.addEventListener('click', compareLoan);
if (updateIncomeBtn) updateIncomeBtn.addEventListener('click', () => openIncomeModal('update'));

// Income modal buttons
if (incomeConfirmBtn) incomeConfirmBtn.addEventListener('click', confirmIncome);
if (incomeCancelBtn)  incomeCancelBtn.addEventListener('click',  closeIncomeModal);
if (incomeInput) {
  incomeInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmIncome(); if (e.key === 'Escape') closeIncomeModal(); });
}
// Close modal on backdrop click
if (incomeModal) {
  incomeModal.addEventListener('click', e => { if (e.target === incomeModal) closeIncomeModal(); });
}

// Theme toggle
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

// Chip buttons
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    monthsInput.value = btn.dataset.months;
    clearTimeout(window._autoCalc);
    window._autoCalc = setTimeout(calculate, 150);
  });
});

// Auto-recalculate
[amountInput, rateInput, monthsInput, prepaymentInput].forEach(el => {
  if (el) el.addEventListener('input', () => {
    clearTimeout(window._autoCalc);
    window._autoCalc = setTimeout(calculate, 500);
  });
});

// Boot
initTheme();
setTimeout(calculate, 120);

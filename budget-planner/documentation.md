# Budget Planner

## Overview

A personal finance tracker Chrome extension with income/expense logging, category-based classification, a monthly budget limit with progress bar, a canvas-based spending chart, CSV export, and transaction history. All data is stored locally in the browser.

## Existing Features (Verified from Code)

* Add entries: title, amount, date, type (income/expense), category
* 7 categories: Food, Rent, Travel, Shopping, Bills, Salary, Other
* Current balance display (income minus expenses)
* Total income and total expense summary stats
* Monthly budget limit setter with a visual progress bar
* Progress bar color changes as limit is approached/exceeded
* Canvas-based spending overview chart (`chart.js`)
* Monthly filter — select a month to view filtered transactions
* "View Monthly Report" and "Show All" buttons
* CSV export of all entries
* Transaction history list with clear-all button
* Status notification area for in-app feedback
* Data stored in `chrome.storage.local`

## New Features to Add (Proposed Upgrades)

* **AI Spend Pattern Alerts** → After 10+ entries, detect when a category is trending 30%+ above its historical average and alert the user inline.
* **Recurring Entry Automation** → Mark any expense as recurring (weekly/monthly) — extension auto-logs it on schedule.
* **Budget Health Score** → A 0–100 score calculated from spend vs. budget ratio, recurring commitments vs. income, and savings rate.
* **Category Budget Limits** → Set individual spending limits per category (not just an overall monthly limit).
* **Multi-Month Trend View** → Compare spending patterns across 3–6 months in the chart view.

## Feature Workflow

1. User opens the extension popup at the start of the month.
2. Sets a monthly budget limit.
3. Adds income and expense entries throughout the month with category and date.
4. Balance, total income, and total expense update on each entry.
5. The progress bar fills as total expenses approach the monthly limit.
6. The spending chart visualizes category breakdown.
7. User filters by month using the month selector to view historical data.
8. Exports all transactions as CSV at month end.

## Productivity Impact

* Monthly budget limit with visual progress bar provides an instantly readable spending health check.
* Category classification enables analysis of where money is going without manual sorting.
* CSV export bridges in-extension tracking with external accounting tools (Excel, Google Sheets).
* Canvas chart gives a single-view spend distribution — no calculation needed.

## Edge Cases & Limitations

* Chart rendering depends on the canvas element — very small popup sizes may clip the chart.
* "Monthly Report" filter is by calendar month — entries without a date default to today's date.
* CSV export includes all entries across all time — no per-month export filter currently.
* Budget limit is a single overall number — per-category limits are not yet supported.
* There is no recurring entry system — repeating expenses must be logged manually each time.

## Future Scope

* Multi-currency support with static exchange rate input.
* Savings goal tracker with projected completion date based on current rate.
* Monthly summary notification — reminder on the last day of the month with spend stats.

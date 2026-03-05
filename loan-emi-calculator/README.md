# Loan EMI Studio (Chrome Extension)

Loan EMI Studio is a Chrome popup calculator for quick EMI estimation with repayment breakdown.

## Features
- Monthly EMI calculation using standard amortization formula.
- Handles zero-interest scenarios correctly.
- Shows total interest, total payment, principal share, and interest share.
- Quick tenure chips (`1Y`, `3Y`, `5Y`, `10Y`).
- Clean local-only popup (no external APIs, no tracking).

## Tech
- HTML
- CSS
- Vanilla JavaScript
- Chrome Extension Manifest V3

## File Structure
- `manifest.json`
- `popup.html`
- `popup.js`
- `style.css`
- `icons/`

## Install
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `loan-emi-calculator`.

## Privacy
All calculations happen locally inside popup and no data is transmitted.

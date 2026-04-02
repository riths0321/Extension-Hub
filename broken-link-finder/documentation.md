# Broken Link Finder

## Overview

A professional link audit extension that scans the current page for broken links, highlights them visually on the page, and provides a detailed report with link health statistics. Exports results as CSV or JSON with optional multi-page bulk scan mode.

## Existing Features (Verified from Code)

* **"Scan Page" button** — scans all links on the current page and tests their status
* **"Highlight" button** — visually highlights broken links directly on the live page (via content script)
* **"Clear" button** — removes all highlights from the page
* **Link Health Dashboard** (4 stat cards):
  * Total Links found on the page
  * Broken Links count
  * Success Rate percentage with mini progress bar
  * SEO Health Score
* **Broken Links Report table** with columns: URL, Status, Link Text, Actions
* **Export CSV button** — downloads broken link list as CSV
* **Export JSON button** — downloads broken link list as JSON
* **"Copy All" button** — copies the broken link list to clipboard
* **Current page URL display** in the header info bar
* **Refresh button** — re-scans without closing popup
* **Settings panel** (toggle via ⚙️ button) with 4 options:
  * Auto-highlight broken links after scan (toggle)
  * Show desktop notifications on scan complete (toggle)
  * Include external links in scan (toggle, slower)
  * Bulk scan mode — enables multi-page scanning (toggle)
* **Scan progress bar** with percentage in the footer
* **Status indicator** — shows "Ready to scan", "Scanning...", "Done" states
* `siteManager.js` handles multi-page/site crawl logic
* Link test library in `lib/` folder

## New Features to Add (Proposed Upgrades)

* **Redirect Chain Analyzer** → For each link, follow the full redirect chain and show every hop (301/302/etc.) — flag chains longer than 3 hops as a performance warning.
* **Link Status Classification** → Categorize every link into ✅ Live, ⚠️ Redirect, 🔴 Broken (404), 🔴 Server Error (5xx), ⏱ Slow (>3s response) — shown in filtered tabs.
* **Broken Link Replacement Suggester** → AI finds a relevant alternative URL for dead pages using Wayback Machine or a search fallback.
* **Scan Depth Control** → Configurable depth slider (1 = current page only, 2 = current page + all linked pages).
* **Scheduled Scans** → Run a link audit daily on a saved URL list and notify on new broken links.

## Feature Workflow

1. User opens popup on any webpage.
2. Clicks "Scan Page" — extension tests all links on the page in parallel.
3. Link Health Dashboard updates with totals, broken count, success rate, and SEO score.
4. Broken Links Report table populates with URL, status code, and link text.
5. User clicks "Highlight" to visually mark broken links on the live page.
6. Settings can toggle auto-highlight, notifications, and external link inclusion.
7. User exports the report as CSV or JSON for developer or client review.
8. Bulk scan mode (settings) enables crawling linked pages beyond the current page.

## Productivity Impact

* Visual page highlighting makes broken links immediately obvious without reading a list.
* CSV and JSON export covers both human review and automated pipeline use cases.
* The 4-stat dashboard gives a quick health summary without reading individual link rows.
* Bulk scan mode scales the tool from a single-page check to a light site crawl.

## Edge Cases & Limitations

* External link scanning (`checkExternalLinks` toggle) is slower and may hit CORS or rate-limiting on some domains.
* Bulk scan mode may produce many network requests — rate limiting is recommended on large sites.
* Links behind authentication (returning 401/403) are not classified as broken but will show as errors.
* Dynamic links injected via JavaScript after page load may not be captured in the initial scan.
* Desktop notification support depends on browser notification permissions being granted.

## Future Scope

* CMS plugin companion — export broken link report as WordPress or Webflow import format.
* Broken link email reports — scheduled scan results delivered to an email via a lightweight backend.
* Link monitoring dashboard — track broken link history across multiple saved sites over time.

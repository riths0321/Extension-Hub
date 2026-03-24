# Deep Redirect Trace

**Deep Redirect Trace** is a professional Chrome Extension for SEOs, web developers, and tech auditors. It acts as a comprehensive redirect chain analyzer, SEO auditor, and site health inspector with real-time background tracking built safely on Manifest V3.

![Deep Redirect Trace](https://raw.githubusercontent.com/SAURABHTIWARI-ANSLATION/Deep-Redirect-Trace/main/icons/icon128.png)

## 🚀 Features

### 1. Advanced Redirect Chain Tracking
- Automatically tracks **all HTTP hops** from the initial request to the final destination.
- Displays individual hop **Status Codes** (e.g., 301, 302, 307, 200).
- Calculates the **timing (ms)** for each step of the redirect chain.
- Instantly detects and warns about infinite **redirect loops**.

### 2. Comprehensive SEO Auditor
- Scans core meta tags: Title, Description, Robots, Viewport, Canonical mapping.
- Flags Missing tags, Length issues, or Indexability blocking (Noindex rules).
- Outputs full **Heading Tree** arrays (H1-H6 structure).
- Extracts and checks for **Structured Data (Schema.org / JSON-LD)**.
- Analyzes on-page **Keyword Density**.
- Validates **Hreflang** deployment for international SEO.
- Inspects dynamically injected Facebook **Open Graph** & **Twitter Cards**.

### 3. Granular Link Analyzer
- Quickly filters page links into exactly categorizable groupings.
- Instantly view **Internal** vs **External** links.
- Specifically surfaces **Nofollow**, **Sponsored**, and **UGC** (User Generated Content) links. 
- Marks highlighted elements directly onto the active webpage with colored CSS dashed borders.
- Runs a background **Broken Link** validation check to quickly reveal 404s.

### 4. Technical Health & Security Inspector
- Evaluates the page’s **Core Web Vitals** (LCP, CLS, FID, Time to First Byte, INP, etc.).
- Scrutinizes **HTTP Response Headers** per hop.
- Generates a **Security Score** derived from standard modern infosec headers (CSP, HSTS, X-Frame-Options, etc.).
- Alerts on **Mixed Content** (HTTP resources loaded on HTTPS pages).
- In-panel fetch tools to analyze `robots.txt` and `sitemap.xml`.

### 5. Automated AI-Style Insights
- Compiles a generated "Insights" checklist to present easy-to-read optimization warnings spanning SEO, Architecture, Speed, and Technical Health criteria derived natively from the DOM.

### 6. Tools & History 
- Keeps an organized **local History** of analyses matching up domains and their hopping statuses locally.
- **Cross-tab tracking tracking:** Track redirects concurrently across all tabs open in real-time.

---

## 🔒 Security & Compliance
This extension is meticulously built for safety, performance, and maximum transparency:
- **Manifest V3 Compliant:** Utilizes service workers, optimized host permissions, and runs performantly in modern Chrome ecosystems.
- **Zero Remote Dependencies:** All CSS, fonts, and assets are local to the extension file-tree. There are no remote tracking pixels, injected third-party Google Fonts scripts, or dependencies on CDNs.  
- **Strict Content Security Policy (CSP):** Enforces a tight scope without utilizing `unsafe-inline` or unsafe Javascript eval configurations. Inline DOM events (such as `onerror` and `onclick`) are systematically removed in favor of securely bounded runtime Event Listeners.

---

## 🛠 Installation

**Developer / Unpacked Mode:**
1. Clone this repository or download the ZIP.
   ```bash
   git clone https://github.com/SAURABHTIWARI-ANSLATION/Deep-Redirect-Trace.git
   ```
2. Navigate to `chrome://extensions/` in your Chrome browser.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the repository directory.
5. Pin the extension to your toolbar and click it to audit any open webpage!

## Export Functionality
Deep Redirect Trace generates heavy raw data sets for your analyses. It supports frictionless output by allowing users to:
- Copy the entire UI audit directly to clipboard in an organized CLI-style text format.
- Export Redirect Chains and hop metadata safely to **CSV**.
- Rapidly export the full JSON object context to `.json` files.

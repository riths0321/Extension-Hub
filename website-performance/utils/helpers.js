// utils/helpers.js — PerfPro v3.1
// CSP-safe: no eval, no innerHTML, no external deps
'use strict';

/**
 * Format milliseconds into a human-readable string.
 * @param {number|null} ms
 * @returns {string}
 */
function fmtMs(ms) {
  if (ms == null) return 'N/A';
  if (ms >= 1000) return (ms / 1000).toFixed(2) + ' s';
  return Math.round(ms) + ' ms';
}

/**
 * Format kilobytes into KB or MB.
 * @param {number|null} kb
 * @returns {string}
 */
function fmtKB(kb) {
  if (kb == null) return 'N/A';
  if (kb >= 1024) return (kb / 1024).toFixed(2) + ' MB';
  return kb.toLocaleString() + ' KB';
}

/**
 * Return a CSS class based on a metric value and thresholds.
 * @param {number|null} value
 * @param {[number, number]} thresholds [good_max, avg_max]
 * @param {boolean} [lowerIsBetter=true]
 * @returns {'good'|'avg'|'poor'|''}
 */
function ratingClass(value, [goodMax, avgMax], lowerIsBetter = true) {
  if (value == null) return '';
  if (lowerIsBetter) {
    if (value <= goodMax) return 'good';
    if (value <= avgMax)  return 'avg';
    return 'poor';
  }
  if (value >= goodMax) return 'good';
  if (value >= avgMax)  return 'avg';
  return 'poor';
}

/**
 * Map a numeric score to a CSS class.
 * @param {number} score
 * @returns {'good'|'avg'|'poor'}
 */
function scoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'avg';
  return 'poor';
}

/**
 * Sanitize a value for safe insertion as textContent.
 * Trims and limits length — prevents accidental huge strings in the UI.
 * @param {string} str
 * @param {number} [maxLen=120]
 * @returns {string}
 */
function sanitize(str, maxLen = 120) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLen);
}

/**
 * Create a DOM element with optional attributes and text content.
 * CSP-safe: never uses innerHTML or eval.
 * @param {string} tag
 * @param {Object} [attrs={}]
 * @param {string} [text='']
 * @returns {HTMLElement}
 */
function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'title') node.title = v;
    else node.setAttribute(k, v);
  }
  if (text !== '') node.textContent = text;
  return node;
}

/**
 * Generate sorted performance recommendations from an analysis result.
 * @param {Object} data  Full analysis object from performanceService
 * @returns {Array<{severity:string, area:string, issue:string, fix:string}>}
 */
function generateRecommendations(data) {
  const recs = [];
  const m = data.metrics;
  const s = data.seo;

  // Load time
  if (m.loadTime > 3000)
    recs.push({ severity: 'high', area: 'Speed',
      issue: `Slow page load (${fmtMs(m.loadTime)})`,
      fix: 'Optimize critical render path, enable server compression (Brotli/gzip), use a CDN, defer non-critical JS.' });
  else if (m.loadTime > 1500)
    recs.push({ severity: 'medium', area: 'Speed',
      issue: `Moderate load time (${fmtMs(m.loadTime)})`,
      fix: 'Profile bottlenecks with Chrome DevTools → Performance. Audit LCP and render-blocking resources.' });

  // FCP
  if (m.fcp && m.fcp > 1800)
    recs.push({ severity: m.fcp > 3000 ? 'high' : 'medium', area: 'Speed',
      issue: `Slow First Contentful Paint (${fmtMs(m.fcp)})`,
      fix: 'Eliminate render-blocking CSS/JS, inline critical styles, preload key fonts.' });

  // LCP
  if (m.lcp && m.lcp > 2500)
    recs.push({ severity: m.lcp > 4000 ? 'high' : 'medium', area: 'Speed',
      issue: `Slow Largest Contentful Paint (${fmtMs(m.lcp)})`,
      fix: 'Preload the LCP image/element, optimize server response time, use next-gen image formats (WebP/AVIF).' });

  // CLS
  if (m.cls != null && m.cls > 0.1)
    recs.push({ severity: m.cls > 0.25 ? 'high' : 'medium', area: 'Stability',
      issue: `High Layout Shift (CLS: ${m.cls})`,
      fix: 'Add explicit size attributes to images and videos; avoid inserting content above existing DOM nodes.' });

  // DOM size
  if (m.domCount > 1500)
    recs.push({ severity: 'high', area: 'DOM',
      issue: `Excessive DOM size (${m.domCount.toLocaleString()} elements)`,
      fix: 'Use virtual scrolling for long lists, lazy-load off-screen content, simplify markup.' });
  else if (m.domCount > 800)
    recs.push({ severity: 'medium', area: 'DOM',
      issue: `Large DOM (${m.domCount.toLocaleString()} elements)`,
      fix: 'Remove hidden off-screen elements and avoid deeply nested structures.' });

  // Page size
  const pageMB = m.transferKB / 1024;
  if (pageMB > 5)
    recs.push({ severity: 'high', area: 'Assets',
      issue: `Very large page (${fmtKB(m.transferKB)})`,
      fix: 'Enable gzip/Brotli, convert images to WebP/AVIF, audit and remove unused third-party resources.' });
  else if (pageMB > 2)
    recs.push({ severity: 'medium', area: 'Assets',
      issue: `Large page size (${fmtKB(m.transferKB)})`,
      fix: 'Minify CSS/JS, optimise images, and ensure static assets are cached aggressively.' });

  // Script count
  if (m.scripts > 30)
    recs.push({ severity: 'high', area: 'JavaScript',
      issue: `Too many JS files (${m.scripts})`,
      fix: 'Bundle scripts with a modern bundler (Vite/Rollup/Webpack), add defer/async to non-critical tags, remove unused third-party scripts.' });
  else if (m.scripts > 15)
    recs.push({ severity: 'medium', area: 'JavaScript',
      issue: `High script count (${m.scripts})`,
      fix: 'Combine and minify scripts; leverage HTTP/2 multiplexing where bundling is not practical.' });

  // Heavy images
  if (data.heavyImages && data.heavyImages.length)
    recs.push({ severity: 'medium', area: 'Images',
      issue: `${data.heavyImages.length} oversized image(s) detected`,
      fix: `Convert to WebP/AVIF, add loading="lazy", use responsive srcset. Largest: ${data.heavyImages[0].url} (${data.heavyImages[0].size} KB)` });

  // Accessibility
  if (s.imagesWithoutAlt > 0)
    recs.push({ severity: 'medium', area: 'Accessibility',
      issue: `${s.imagesWithoutAlt} image(s) missing alt text`,
      fix: 'Add descriptive alt attributes to all meaningful images for screen readers and SEO.' });

  // SEO
  if (!s.metaDescription)
    recs.push({ severity: 'medium', area: 'SEO',
      issue: 'No meta description',
      fix: 'Add <meta name="description" content="…"> (150–160 chars) for better search click-through rates.' });
  else if (s.metaDescriptionLength > 160)
    recs.push({ severity: 'low', area: 'SEO',
      issue: `Meta description too long (${s.metaDescriptionLength} chars)`,
      fix: 'Keep meta descriptions under 160 characters to prevent truncation in search results.' });

  if (!s.metaViewport)
    recs.push({ severity: 'high', area: 'Mobile',
      issue: 'Missing viewport meta tag',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to fix mobile rendering.' });

  if (s.headings.h1 === 0)
    recs.push({ severity: 'medium', area: 'SEO',
      issue: 'No H1 heading',
      fix: 'Add exactly one H1 heading that clearly describes the page content.' });
  else if (s.headings.h1 > 1)
    recs.push({ severity: 'medium', area: 'SEO',
      issue: `Multiple H1 headings (${s.headings.h1})`,
      fix: 'Use only one H1 per page to maintain a clear content hierarchy for SEO.' });

  const severityWeight = { high: 3, medium: 2, low: 1 };
  return recs.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
}
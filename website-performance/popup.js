let currentAnalysis = null;

const THEME_STORAGE_KEY = "perfpro-theme";
const SVG_NS = "http://www.w3.org/2000/svg";
const SCORE_RING_CIRCUMFERENCE = 163.4;
const FALLBACK_TAB = "overview";
const VALID_TABS = new Set([
  "overview",
  "resources",
  "issues",
  "seo",
  "recommendations"
]);

const analyzeBtn = document.getElementById("analyzeBtn");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const copyReportBtn = document.getElementById("copyReportBtn");
const themeToggleBtn = document.getElementById("themeToggle");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));

initTheme();
bindUiEvents();

function initTheme() {
  document.documentElement.setAttribute("data-theme", getStoredTheme());
}

function bindUiEvents() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTab = btn.dataset.tab || FALLBACK_TAB;
      setActiveTab(nextTab);
      if (currentAnalysis) {
        displayResult(currentAnalysis, nextTab);
      }
    });
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", analyzeCurrentPage);
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", exportToJSON);
  }

  if (copyReportBtn) {
    copyReportBtn.addEventListener("click", copyReport);
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", nextTheme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage failures and keep the selected theme for this session.
  }
}

async function analyzeCurrentPage() {
  setStatus("Analyzing page...");
  renderLoadingState();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("No active tab");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectComprehensiveData
    });

    const analysis = results?.[0]?.result;
    if (!analysis) {
      throw new Error("No data returned");
    }

    currentAnalysis = {
      ...analysis,
      recommendations: generateRecommendations(analysis)
    };

    displayResult(currentAnalysis, getActiveTab());
    setStatus("Analysis complete.");
  } catch (error) {
    console.error(error);
    currentAnalysis = null;
    setStatus("Failed to analyze the page. Open a standard webpage and try again.");
    renderErrorState(error?.message || "Unknown error");
  }
}

function generateRecommendations(data) {
  const recommendations = [];

  if (data.metrics.domCount > 1500) {
    recommendations.push({
      severity: "high",
      issue: `Excessive DOM elements (${data.metrics.domCount.toLocaleString()})`,
      impact: "Slows down page rendering, increases memory usage, and hurts interactivity",
      solution: "• Lazy load off-screen content\n• Remove unused HTML elements\n• Use virtual scrolling for long lists\n• Avoid deeply nested DOM structures\n• Implement pagination for large datasets",
      tools: "Chrome DevTools -> Elements panel -> Find unused elements\nLighthouse -> DOM size audit"
    });
  } else if (data.metrics.domCount > 800) {
    recommendations.push({
      severity: "medium",
      issue: `High DOM element count (${data.metrics.domCount.toLocaleString()})`,
      impact: "May cause slower rendering and higher memory consumption",
      solution: "• Consider lazy loading\n• Simplify HTML structure\n• Remove hidden/off-screen elements\n• Use document fragments when adding elements dynamically",
      tools: 'Chrome DevTools -> Performance -> Check "Layout Shift"'
    });
  }

  if (data.metrics.scripts > 30) {
    recommendations.push({
      severity: "high",
      issue: `Too many JavaScript files (${data.metrics.scripts})`,
      impact: "Increases network requests, blocks page rendering, delays interactivity",
      solution: '• Bundle and minify JS files using Webpack/Rollup\n• Implement code splitting\n• Defer non-critical scripts with "defer" or "async"\n• Remove unused JavaScript\n• Use tree shaking to eliminate dead code',
      tools: "Webpack Bundle Analyzer\nChrome DevTools -> Coverage tab (Ctrl+Shift+P -> Show Coverage)"
    });
  } else if (data.metrics.scripts > 15) {
    recommendations.push({
      severity: "medium",
      issue: `High number of scripts (${data.metrics.scripts})`,
      impact: "Multiple network requests affecting load time",
      solution: "• Combine scripts where possible\n• Use HTTP/2 multiplexing\n• Implement script bundling\n• Audit third-party scripts necessity",
      tools: 'Chrome DevTools -> Network tab -> Filter by "JS"'
    });
  }

  const jsSizeMB = data.breakdown.script.size / (1024 * 1024);
  if (jsSizeMB > 2) {
    recommendations.push({
      severity: "high",
      issue: `Large JavaScript bundle (${jsSizeMB.toFixed(2)} MB)`,
      impact: "Increases download time, parsing time, and memory usage",
      solution: "• Split code into smaller chunks\n• Implement lazy loading with dynamic imports\n• Remove duplicate dependencies\n• Use modern bundle optimization techniques\n• Enable gzip/Brotli compression on server",
      tools: "Webpack Bundle Analyzer\nsource-map-explorer\nLighthouse -> JavaScript execution time"
    });
  } else if (jsSizeMB > 1) {
    recommendations.push({
      severity: "medium",
      issue: `Large JavaScript payload (${jsSizeMB.toFixed(2)} MB)`,
      impact: "Longer download and parse times",
      solution: "• Minify JavaScript\n• Remove console.log statements\n• Use code splitting\n• Audit and remove unused libraries",
      tools: "npm dedupe\nWebpack Bundle Analyzer"
    });
  }

  if (data.metrics.styles > 8) {
    recommendations.push({
      severity: "medium",
      issue: `Multiple CSS files (${data.metrics.styles})`,
      impact: "Additional HTTP requests and render-blocking resources",
      solution: "• Combine CSS files\n• Critical CSS inline in <head>\n• Load non-critical CSS asynchronously\n• Use CSS minification\n• Remove unused CSS",
      tools: "PurgeCSS\nUnusedCSS\nChrome DevTools -> Coverage tab"
    });
  }

  const imageSizeMB = data.breakdown.image.size / (1024 * 1024);
  if (imageSizeMB > 3) {
    recommendations.push({
      severity: "high",
      issue: `Large images (${imageSizeMB.toFixed(2)} MB total)`,
      impact: "Significantly increases page weight and load time",
      solution: "• Compress images with tools like ImageOptim, Squoosh\n• Use modern formats: WebP, AVIF\n• Implement lazy loading: loading=\"lazy\"\n• Use responsive images with srcset\n• Serve scaled images (do not downscale with CSS)",
      tools: "Squoosh.app\nTinyPNG\nLighthouse -> Properly size images"
    });
  }

  if (data.seo.imagesWithoutAlt > 0) {
    recommendations.push({
      severity: "medium",
      issue: `${data.seo.imagesWithoutAlt} images missing alt text`,
      impact: "Poor accessibility for screen readers, negative SEO impact",
      solution: "• Add descriptive alt attributes to all images\n• Use empty alt for decorative images\n• Include keywords naturally\n• Follow accessibility guidelines (WCAG)",
      tools: "Chrome DevTools -> Accessibility panel\nWAVE Evaluation Tool"
    });
  }

  const pageSizeMB = data.metrics.transferKB / 1024;
  if (pageSizeMB > 5) {
    recommendations.push({
      severity: "high",
      issue: `Large page size (${pageSizeMB.toFixed(2)} MB)`,
      impact: "Slow load times, especially on mobile networks, higher bounce rates",
      solution: "• Enable compression (gzip/Brotli)\n• Optimize all assets\n• Implement caching strategies\n• Remove unused resources\n• Use a CDN",
      tools: "WebPageTest.org\nGTmetrix\nCloudFlare/CDN services"
    });
  } else if (pageSizeMB > 2) {
    recommendations.push({
      severity: "medium",
      issue: `Page size could be smaller (${pageSizeMB.toFixed(2)} MB)`,
      impact: "May load slowly on slower connections",
      solution: "• Audit and optimize largest assets\n• Implement lazy loading\n• Compress text resources\n• Consider using a service worker for offline caching",
      tools: "Chrome DevTools -> Network -> Large resource sorting\nLighthouse -> Total Byte Weight"
    });
  }

  if (data.seo.headings.h1 === 0) {
    recommendations.push({
      severity: "high",
      issue: "Missing H1 heading",
      impact: "Poor SEO structure, unclear page hierarchy",
      solution: "• Add one descriptive H1 heading per page\n• Include primary keywords naturally\n• Ensure H1 reflects page content",
      tools: "SEO tools\nWAVE Evaluation Tool"
    });
  } else if (data.seo.headings.h1 > 1) {
    recommendations.push({
      severity: "medium",
      issue: `Multiple H1 headings (${data.seo.headings.h1})`,
      impact: "Confusing page structure for search engines and screen readers",
      solution: "• Use only one H1 per page\n• Structure content with H2, H3 for subsections\n• Maintain logical heading hierarchy",
      tools: "Chrome DevTools -> Accessibility tree\nWAVE Evaluation Tool"
    });
  }

  if (data.seo.metaDescription === "Missing") {
    recommendations.push({
      severity: "medium",
      issue: "No meta description",
      impact: "Reduced click-through rates from search results, poor SEO",
      solution: "• Add meta description: <meta name=\"description\" content=\"...\">\n• Keep it between 150-160 characters\n• Include primary keywords\n• Make it compelling for users",
      tools: "Google Search Console\nSEO plugins (Yoast, RankMath)"
    });
  } else if (data.seo.metaDescription.length > 160) {
    recommendations.push({
      severity: "low",
      issue: `Meta description too long (${data.seo.metaDescription.length} chars)`,
      impact: "May get truncated in search results",
      solution: "• Shorten to 150-160 characters\n• Place important information first",
      tools: "SEO preview tools"
    });
  }

  if (data.seo.metaViewport === "Missing") {
    recommendations.push({
      severity: "high",
      issue: "Missing viewport meta tag",
      impact: "Poor mobile experience, not responsive",
      solution: "• Add viewport meta: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n• Ensure responsive design\n• Test on multiple device sizes",
      tools: "Chrome DevTools -> Device Toolbar\nResponsively.app"
    });
  }

  if (data.metrics.loadTime && data.metrics.loadTime > 3000) {
    recommendations.push({
      severity: "high",
      issue: `Slow load time (${data.metrics.loadTime}ms)`,
      impact: "Poor user experience, higher bounce rates, lower conversions",
      solution: "• Optimize critical rendering path\n• Reduce server response time\n• Implement lazy loading\n• Use a CDN\n• Enable browser caching\n• Preload critical resources",
      tools: "WebPageTest.org\nLighthouse\nChrome DevTools -> Performance panel"
    });
  } else if (data.metrics.loadTime && data.metrics.loadTime > 1500) {
    recommendations.push({
      severity: "medium",
      issue: `Moderate load time (${data.metrics.loadTime}ms)`,
      impact: "Could be faster to improve user experience",
      solution: "• Analyze performance bottlenecks\n• Optimize largest contentful paint (LCP)\n• Reduce render-blocking resources",
      tools: "Lighthouse\nChrome DevTools -> Performance -> Web Vitals"
    });
  }

  if (data.metrics.fcp && data.metrics.fcp > 2000) {
    recommendations.push({
      severity: "high",
      issue: `Slow First Contentful Paint (${data.metrics.fcp}ms)`,
      impact: "Users see content late, perceived as slow",
      solution: "• Eliminate render-blocking resources\n• Inline critical CSS\n• Optimize server response time\n• Preload key requests\n• Reduce JavaScript execution time",
      tools: "Lighthouse -> First Contentful Paint\nChrome DevTools -> Performance"
    });
  }

  if (data.metrics.requests > 50) {
    recommendations.push({
      severity: "medium",
      issue: `High number of network requests (${data.metrics.requests})`,
      impact: "Increased latency, slower page load",
      solution: "• Combine resources where possible\n• Use HTTP/2 multiplexing\n• Implement HTTP/3\n• Remove unnecessary third-party scripts\n• Use resource hints: preconnect, prefetch",
      tools: "Chrome DevTools -> Network -> Request count\nLighthouse -> Minimize requests"
    });
  }

  return recommendations.sort((a, b) => {
    const severityWeight = { high: 3, medium: 2, low: 1 };
    return severityWeight[b.severity] - severityWeight[a.severity];
  });
}

function collectComprehensiveData() {
  try {
    const resources = performance.getEntriesByType("resource") || [];
    const navigation = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint") || [];

    const breakdown = {
      script: { count: 0, size: 0 },
      stylesheet: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      font: { count: 0, size: 0 },
      fetch: { count: 0, size: 0 },
      other: { count: 0, size: 0 }
    };

    resources.forEach((resource) => {
      let type = resource.initiatorType || "other";
      const size = resource.transferSize || 0;

      if (type === "link" || type === "css") {
        type = "stylesheet";
      } else if (type === "img") {
        type = "image";
      } else if (type === "script") {
        type = "script";
      }

      if (breakdown[type]) {
        breakdown[type].count += 1;
        breakdown[type].size += size;
      } else {
        breakdown.other.count += 1;
        breakdown.other.size += size;
      }
    });

    const fcp = paint.find((entry) => entry.name === "first-contentful-paint");
    const domElements = document.getElementsByTagName("*").length;
    const scripts = document.getElementsByTagName("script").length;
    const styles = document.querySelectorAll('link[rel="stylesheet"]').length;
    const images = document.getElementsByTagName("img").length;
    const iframes = document.getElementsByTagName("iframe").length;
    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || null;
    const metaViewport =
      document.querySelector('meta[name="viewport"]')?.getAttribute("content") || null;
    const title = document.title || "No title";
    const headings = {
      h1: document.getElementsByTagName("h1").length,
      h2: document.getElementsByTagName("h2").length,
      h3: document.getElementsByTagName("h3").length
    };

    let imagesWithoutAlt = 0;
    const allImages = document.getElementsByTagName("img");
    for (let index = 0; index < allImages.length; index += 1) {
      if (!allImages[index].alt) {
        imagesWithoutAlt += 1;
      }
    }

    const totalSizeKB = Math.round(
      resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0) / 1024
    );

    let score = 100;
    if (domElements > 1500) {
      score -= 20;
    } else if (domElements > 800) {
      score -= 10;
    }

    if (totalSizeKB > 5000) {
      score -= 25;
    } else if (totalSizeKB > 2000) {
      score -= 15;
    } else if (totalSizeKB > 1000) {
      score -= 5;
    }

    if (scripts > 30) {
      score -= 15;
    }
    if (imagesWithoutAlt > 5) {
      score -= 10;
    }
    if (!metaDescription) {
      score -= 5;
    }
    if (!metaViewport) {
      score -= 10;
    }
    if (headings.h1 === 0) {
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));

    const issues = [];
    if (totalSizeKB > 3000) {
      issues.push(`Large page size: ${totalSizeKB} KB`);
    }
    if (scripts > 25) {
      issues.push(`Too many scripts: ${scripts}`);
    }
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt text`);
    }
    if (!metaDescription) {
      issues.push("Missing meta description");
    }
    if (domElements > 1000) {
      issues.push(`High DOM complexity: ${domElements} elements`);
    }
    if (!metaViewport) {
      issues.push("Missing viewport meta tag");
    }
    if (headings.h1 === 0) {
      issues.push("No H1 heading found");
    }
    if (headings.h1 > 1) {
      issues.push(`Multiple H1 headings (${headings.h1})`);
    }

    return {
      url: window.location.href,
      title,
      score,
      metrics: {
        domCount: domElements,
        requests: resources.length,
        loadTime: navigation ? Math.round(navigation.loadEventEnd || 0) : null,
        transferKB: totalSizeKB,
        fcp: fcp ? Math.round(fcp.startTime) : null,
        scripts,
        styles,
        images,
        iframes
      },
      breakdown,
      seo: {
        metaDescription: metaDescription || "Missing",
        metaDescriptionLength: metaDescription ? metaDescription.length : 0,
        metaViewport: metaViewport || "Missing",
        title,
        headings,
        imagesWithoutAlt
      },
      issues,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      url: window.location.href,
      title: document.title || "Unknown"
    };
  }
}

function displayResult(data, tab = FALLBACK_TAB) {
  if (!data || !resultEl) {
    return;
  }

  const safeTab = VALID_TABS.has(tab) ? tab : FALLBACK_TAB;
  setActiveTab(safeTab);

  if (data.error) {
    renderErrorState(data.error);
    return;
  }

  const content = buildTabContent(data, safeTab);
  resultEl.replaceChildren(content);
}

function buildTabContent(data, tab) {
  switch (tab) {
    case "resources":
      return renderResources(data);
    case "issues":
      return renderIssues(data);
    case "seo":
      return renderSeo(data);
    case "recommendations":
      return renderRecommendations(data);
    case "overview":
    default:
      return renderOverview(data);
  }
}

function renderOverview(data) {
  const fragment = document.createDocumentFragment();

  fragment.append(
    createScoreBlock(data),
    createMetricRow("Page Title", truncateText(data.title, 40), {
      valueClass: "metric-value-small"
    }),
    createMetricRow("DOM Elements", formatNumber(data.metrics.domCount), {
      valueClass: data.metrics.domCount > 800 ? "warning" : ""
    }),
    createMetricRow("Network Requests", formatNumber(data.metrics.requests)),
    createMetricRow("Load Time", formatMilliseconds(data.metrics.loadTime)),
    createMetricRow("Transfer Size", `${formatNumber(data.metrics.transferKB)} KB`, {
      valueClass: data.metrics.transferKB > 2000 ? "warning" : ""
    }),
    createMetricRow("First Paint (FCP)", formatMilliseconds(data.metrics.fcp))
  );

  return fragment;
}

function renderResources(data) {
  const fragment = document.createDocumentFragment();

  fragment.append(
    createMetricRow(
      "JavaScript",
      `${data.breakdown.script.count} files (${formatNumber(
        Math.round(data.breakdown.script.size / 1024)
      )} KB)`
    ),
    createMetricRow(
      "CSS",
      `${data.breakdown.stylesheet.count} files (${formatNumber(
        Math.round(data.breakdown.stylesheet.size / 1024)
      )} KB)`
    ),
    createMetricRow(
      "Images",
      `${data.breakdown.image.count} files (${formatNumber(
        Math.round(data.breakdown.image.size / 1024)
      )} KB)`
    ),
    createMetricRow(
      "Fonts",
      `${data.breakdown.font.count} files (${formatNumber(
        Math.round(data.breakdown.font.size / 1024)
      )} KB)`
    ),
    createMetricRow("Fetch/XHR", `${data.breakdown.fetch.count} files`),
    createMetricRow("Other Resources", `${data.breakdown.other.count} files`),
    createMetricRow("Total Images on Page", String(data.metrics.images))
  );

  return fragment;
}

function renderIssues(data) {
  const fragment = document.createDocumentFragment();

  if (!data.issues.length) {
    fragment.append(createBannerMessage("No critical issues detected.", "success"));
  } else {
    data.issues.forEach((issue) => {
      fragment.append(createBannerMessage(issue, "warning"));
    });
  }

  fragment.append(
    createMetricRow("Tip", "Use Copy Report for a full plain-text summary.", {
      stack: true
    })
  );

  return fragment;
}

function renderSeo(data) {
  const fragment = document.createDocumentFragment();
  const descriptionMissing = data.seo.metaDescription === "Missing";

  fragment.append(
    createMetricRow("Title", truncateText(data.seo.title, 80), {
      stack: true
    }),
    createMetricRow("Meta Description", truncateText(data.seo.metaDescription, 100), {
      stack: !descriptionMissing,
      valueClass: descriptionMissing ? "warning" : "",
      noteText: descriptionMissing
        ? ""
        : `Length: ${data.seo.metaDescriptionLength} characters ${getMetaDescriptionHint(
            data.seo.metaDescriptionLength
          )}`
    }),
    createMetricRow("Viewport", data.seo.metaViewport, {
      valueClass: data.seo.metaViewport === "Missing" ? "warning" : ""
    }),
    createMetricRow(
      "Heading Structure",
      `H1: ${data.seo.headings.h1} | H2: ${data.seo.headings.h2} | H3: ${data.seo.headings.h3}`
    ),
    createMetricRow("Images Missing Alt", String(data.seo.imagesWithoutAlt), {
      valueClass: data.seo.imagesWithoutAlt > 0 ? "warning" : ""
    })
  );

  if (data.seo.headings.h1 === 0) {
    fragment.append(createBannerMessage("No H1 heading found. This matters for SEO.", "warning"));
  }

  if (data.seo.headings.h1 > 1) {
    fragment.append(
      createBannerMessage("Multiple H1 headings found. Pages usually should have one.", "warning")
    );
  }

  return fragment;
}

function renderRecommendations(data) {
  const fragment = document.createDocumentFragment();

  if (!data.recommendations?.length) {
    fragment.append(createBannerMessage("No critical performance recommendations right now.", "success"));
    return fragment;
  }

  const count = createElement("div", {
    className: "rec-count",
    text: `${data.recommendations.length} recommendation(s) to review`
  });

  fragment.append(count);
  data.recommendations.forEach((recommendation) => {
    fragment.append(createRecommendationCard(recommendation));
  });

  return fragment;
}

function renderLoadingState() {
  if (!resultEl) {
    return;
  }

  const fragment = document.createDocumentFragment();
  fragment.append(
    createElement("div", { className: "loading-bar", attrs: { "aria-hidden": "true" } }),
    createBannerMessage("Loading metrics...", "info")
  );

  resultEl.replaceChildren(fragment);
}

function renderErrorState(message) {
  if (!resultEl) {
    return;
  }

  resultEl.replaceChildren(createBannerMessage(`Error: ${message}`, "error"));
}

function exportToJSON() {
  if (!currentAnalysis) {
    setStatus("No analysis data to export.");
    return;
  }

  const blob = new Blob([JSON.stringify(currentAnalysis, null, 2)], {
    type: "application/json"
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = `performance-report-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  setStatus("Report exported as JSON.");
}

function copyReport() {
  if (!currentAnalysis) {
    setStatus("No analysis data to copy.");
    return;
  }

  const recommendationsText =
    currentAnalysis.recommendations && currentAnalysis.recommendations.length > 0
      ? currentAnalysis.recommendations
          .map((recommendation) => {
            return [
              `[${recommendation.severity.toUpperCase()}] ${recommendation.issue}`,
              `Impact: ${recommendation.impact}`,
              `Solution:\n${recommendation.solution}`,
              `Tools: ${recommendation.tools}`
            ].join("\n");
          })
          .join(`\n${"-".repeat(50)}\n`)
      : "No recommendations - page looks well optimized.";

  const report = [
    "PERFORMANCE ANALYSIS REPORT",
    "=".repeat(60),
    `URL: ${currentAnalysis.url}`,
    `Title: ${currentAnalysis.title}`,
    `Score: ${currentAnalysis.score}/100`,
    "",
    "METRICS",
    `- DOM Elements: ${formatNumber(currentAnalysis.metrics.domCount)}`,
    `- Network Requests: ${formatNumber(currentAnalysis.metrics.requests)}`,
    `- Load Time: ${formatMilliseconds(currentAnalysis.metrics.loadTime)}`,
    `- Transfer Size: ${formatNumber(currentAnalysis.metrics.transferKB)} KB`,
    `- First Paint (FCP): ${formatMilliseconds(currentAnalysis.metrics.fcp)}`,
    `- JavaScript Files: ${currentAnalysis.metrics.scripts}`,
    `- CSS Files: ${currentAnalysis.metrics.styles}`,
    "",
    "RESOURCE BREAKDOWN",
    `- JS: ${currentAnalysis.breakdown.script.count} files (${Math.round(
      currentAnalysis.breakdown.script.size / 1024
    )} KB)`,
    `- CSS: ${currentAnalysis.breakdown.stylesheet.count} files (${Math.round(
      currentAnalysis.breakdown.stylesheet.size / 1024
    )} KB)`,
    `- Images: ${currentAnalysis.breakdown.image.count} files (${Math.round(
      currentAnalysis.breakdown.image.size / 1024
    )} KB)`,
    `- Fonts: ${currentAnalysis.breakdown.font.count} files`,
    "",
    "RECOMMENDATIONS",
    recommendationsText,
    "",
    `Report generated: ${formatTimestamp(currentAnalysis.timestamp)}`
  ].join("\n");

  navigator.clipboard
    .writeText(report)
    .then(() => {
      setStatus("Full report copied to clipboard.");
    })
    .catch(() => {
      setStatus("Failed to copy the report.");
    });
}

function setStatus(text) {
  if (!statusEl) {
    return;
  }

  const textNode = statusEl.querySelector("#statusText");
  if (textNode) {
    textNode.textContent = text;
    return;
  }

  statusEl.textContent = text;
}

function getActiveTab() {
  const activeTab = tabButtons.find((button) => button.classList.contains("active"))?.dataset.tab;
  return VALID_TABS.has(activeTab) ? activeTab : FALLBACK_TAB;
}

function setActiveTab(tab) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function createScoreBlock(data) {
  const scoreClass = getScoreClass(data.score);
  const scoreBlock = createElement("div", { className: `score-block ${scoreClass}` });
  const scoreRing = createElement("div", { className: "score-ring" });
  const scoreSvg = createSvgElement("svg", {
    viewBox: "0 0 58 58",
    "aria-hidden": "true"
  });

  scoreSvg.append(
    createSvgElement("circle", {
      class: "ring-bg",
      cx: "29",
      cy: "29",
      r: "26"
    }),
    createSvgElement("circle", {
      class: "ring-fill",
      cx: "29",
      cy: "29",
      r: "26",
      "stroke-dasharray": String(SCORE_RING_CIRCUMFERENCE),
      "stroke-dashoffset": calculateScoreOffset(data.score).toFixed(1)
    })
  );

  const numberWrap = createElement("div", { className: "score-num-wrap" });
  numberWrap.append(createElement("span", { className: "score-num", text: String(data.score) }));

  scoreRing.append(scoreSvg, numberWrap);

  const scoreMeta = createElement("div", { className: "score-meta" });
  scoreMeta.append(
    createElement("div", { className: "score-title", text: "Performance Score" }),
    createElement("div", {
      className: "score-url",
      text: formatUrl(data.url)
    }),
    createElement("span", {
      className: "score-grade",
      text: getScoreLabel(scoreClass)
    })
  );

  scoreBlock.append(scoreRing, scoreMeta);
  return scoreBlock;
}

function createRecommendationCard(recommendation) {
  const container = createElement("div", {
    className: `recommendation-item recommendation-${recommendation.severity}`
  });
  const title = createElement("div", { className: "recommendation-title" });
  const severityBadge = createElement("span", {
    className: "recommendation-badge",
    text: recommendation.severity.toUpperCase()
  });
  const titleText = createElement("span", {
    className: "recommendation-title-text",
    text: recommendation.issue
  });
  const impact = createElement("div", {
    className: "recommendation-impact",
    text: `Impact: ${recommendation.impact}`
  });
  const solution = createElement("div", {
    className: "recommendation-solution",
    text: `Solution:\n${recommendation.solution}`
  });
  const tools = createElement("div", {
    className: "recommendation-tools",
    text: `Tools: ${recommendation.tools}`
  });

  title.append(severityBadge, titleText);
  container.append(title, impact, solution, tools);

  return container;
}

function createMetricRow(label, value, options = {}) {
  const { valueClass = "", stack = false, noteText = "" } = options;
  const row = createElement("div", {
    className: `metric${stack || noteText ? " metric-stack" : ""}`
  });
  const labelEl = createElement("span", { className: "metric-label", text: label });
  const valueEl = createElement("span", {
    className: `metric-value${valueClass ? ` ${valueClass}` : ""}`,
    text: value
  });

  row.append(labelEl, valueEl);

  if (noteText) {
    row.append(createElement("div", { className: "metric-note", text: noteText }));
  }

  return row;
}

function createBannerMessage(text, tone) {
  return createElement("div", {
    className: `banner-message banner-${tone}`,
    text
  });
}

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  const { className, text, attrs } = options;

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(name, String(value));
      }
    });
  }

  return element;
}

function createSvgElement(tagName, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tagName);

  Object.entries(attrs).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, String(value));
    }
  });

  return element;
}

function getScoreClass(score) {
  if (score >= 80) {
    return "good";
  }
  if (score >= 50) {
    return "avg";
  }
  return "poor";
}

function getScoreLabel(scoreClass) {
  if (scoreClass === "good") {
    return "EXCELLENT";
  }
  if (scoreClass === "avg") {
    return "NEEDS WORK";
  }
  return "POOR";
}

function calculateScoreOffset(score) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  return SCORE_RING_CIRCUMFERENCE - (normalizedScore / 100) * SCORE_RING_CIRCUMFERENCE;
}

function truncateText(value, maxLength) {
  const text = typeof value === "string" && value.trim() ? value.trim() : "N/A";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "N/A";
}

function formatMilliseconds(value) {
  return Number.isFinite(value) ? `${value} ms` : "N/A";
}

function formatUrl(url) {
  const safeUrl = typeof url === "string" && url ? url.replace(/^https?:\/\//, "") : "N/A";
  return safeUrl.length > 42 ? `${safeUrl.slice(0, 42)}...` : safeUrl;
}

function formatTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "N/A" : timestamp.toLocaleString();
}

function getMetaDescriptionHint(length) {
  if (length > 160) {
    return "(too long)";
  }
  if (length < 120) {
    return "(could be longer)";
  }
  return "(optimal)";
}

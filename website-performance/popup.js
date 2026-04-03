let currentAnalysis = null;

// ── Theme toggle ──
(function initTheme() {
  const saved = localStorage.getItem('perfpro-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('perfpro-theme', next);
  });
});

const analyzeBtn = document.getElementById("analyzeBtn");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const copyReportBtn = document.getElementById("copyReportBtn");

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (currentAnalysis) {
      displayResult(currentAnalysis, btn.getAttribute('data-tab'));
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

async function analyzeCurrentPage() {
  try {
    setStatus("🔍 Analyzing performance...");
    if (resultEl) resultEl.innerHTML = '<div class="metric">Loading metrics...</div>';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectComprehensiveData
    });

    if (results && results[0] && results[0].result) {
      currentAnalysis = results[0].result;
      // Add recommendations after getting data
      currentAnalysis.recommendations = generateRecommendations(currentAnalysis);
      displayResult(currentAnalysis, 'overview');
      setStatus("✅ Analysis complete!");
    } else {
      throw new Error("No data returned");
    }
  } catch (err) {
    console.error(err);
    setStatus("❌ Failed to analyze page. Make sure you're on a webpage.");
    if (resultEl) {
      resultEl.innerHTML = `<div class="metric" style="color: #ef4444;">Error: ${err.message}</div>`;
    }
  }
}

// Generate performance recommendations
function generateRecommendations(data) {
  const recommendations = [];
  
  // DOM size recommendations
  if (data.metrics.domCount > 1500) {
    recommendations.push({
      severity: 'high',
      issue: `Excessive DOM elements (${data.metrics.domCount.toLocaleString()})`,
      impact: 'Slows down page rendering, increases memory usage, and hurts interactivity',
      solution: '• Lazy load off-screen content\n• Remove unused HTML elements\n• Use virtual scrolling for long lists\n• Avoid deeply nested DOM structures\n• Implement pagination for large datasets',
      tools: 'Chrome DevTools → Elements panel → Find unused elements\nLighthouse → DOM size audit'
    });
  } else if (data.metrics.domCount > 800) {
    recommendations.push({
      severity: 'medium',
      issue: `High DOM element count (${data.metrics.domCount.toLocaleString()})`,
      impact: 'May cause slower rendering and higher memory consumption',
      solution: '• Consider lazy loading\n• Simplify HTML structure\n• Remove hidden/off-screen elements\n• Use document fragments when adding elements dynamically',
      tools: 'Chrome DevTools → Performance → Check "Layout Shift"'
    });
  }
  
  // JavaScript recommendations
  if (data.metrics.scripts > 30) {
    recommendations.push({
      severity: 'high',
      issue: `Too many JavaScript files (${data.metrics.scripts})`,
      impact: 'Increases network requests, blocks page rendering, delays interactivity',
      solution: '• Bundle and minify JS files using Webpack/Rollup\n• Implement code splitting\n• Defer non-critical scripts with "defer" or "async"\n• Remove unused JavaScript\n• Use tree shaking to eliminate dead code',
      tools: 'Webpack Bundle Analyzer\nChrome DevTools → Coverage tab (Ctrl+Shift+P → Show Coverage)'
    });
  } else if (data.metrics.scripts > 15) {
    recommendations.push({
      severity: 'medium',
      issue: `High number of scripts (${data.metrics.scripts})`,
      impact: 'Multiple network requests affecting load time',
      solution: '• Combine scripts where possible\n• Use HTTP/2 multiplexing\n• Implement script bundling\n• Audit third-party scripts necessity',
      tools: 'Chrome DevTools → Network tab → Filter by "JS"'
    });
  }
  
  // JavaScript size recommendations
  const jsSizeMB = data.breakdown.script.size / (1024 * 1024);
  if (jsSizeMB > 2) {
    recommendations.push({
      severity: 'high',
      issue: `Large JavaScript bundle (${jsSizeMB.toFixed(2)} MB)`,
      impact: 'Increases download time, parsing time, and memory usage',
      solution: '• Split code into smaller chunks\n• Implement lazy loading with dynamic imports\n• Remove duplicate dependencies\n• Use modern bundle optimization techniques\n• Enable gzip/Brotli compression on server',
      tools: 'Webpack Bundle Analyzer\nsource-map-explorer\nLighthouse → JavaScript execution time'
    });
  } else if (jsSizeMB > 1) {
    recommendations.push({
      severity: 'medium',
      issue: `Large JavaScript payload (${jsSizeMB.toFixed(2)} MB)`,
      impact: 'Longer download and parse times',
      solution: '• Minify JavaScript\n• Remove console.log statements\n• Use code splitting\n• Audit and remove unused libraries',
      tools: 'npm dedupe\nWebpack Bundle Analyzer'
    });
  }
  
  // CSS recommendations
  if (data.metrics.styles > 8) {
    recommendations.push({
      severity: 'medium',
      issue: `Multiple CSS files (${data.metrics.styles})`,
      impact: 'Additional HTTP requests and render-blocking resources',
      solution: '• Combine CSS files\n• Critical CSS inline in <head>\n• Load non-critical CSS asynchronously\n• Use CSS minification\n• Remove unused CSS',
      tools: 'PurgeCSS\nUnusedCSS\nChrome DevTools → Coverage tab'
    });
  }
  
  // Image recommendations
  const imageSizeMB = data.breakdown.image.size / (1024 * 1024);
  if (imageSizeMB > 3) {
    recommendations.push({
      severity: 'high',
      issue: `Large images (${imageSizeMB.toFixed(2)} MB total)`,
      impact: 'Significantly increases page weight and load time',
      solution: '• Compress images with tools like ImageOptim, Squoosh\n• Use modern formats: WebP, AVIF\n• Implement lazy loading: loading="lazy"\n• Use responsive images with srcset\n• Serve scaled images (don\'t downscale with CSS)',
      tools: 'Squoosh.app\nTinyPNG\nLighthouse → Properly size images'
    });
  }
  
  // Image alt text recommendations
  if (data.seo.imagesWithoutAlt > 0) {
    recommendations.push({
      severity: 'medium',
      issue: `${data.seo.imagesWithoutAlt} images missing alt text`,
      impact: 'Poor accessibility for screen readers, negative SEO impact',
      solution: '• Add descriptive alt attributes to all images\n• Use empty alt for decorative images\n• Include keywords naturally\n• Follow accessibility guidelines (WCAG)',
      tools: 'Chrome DevTools → Accessibility panel\nWAVE Evaluation Tool'
    });
  }
  
  // Page size recommendations
  const pageSizeMB = data.metrics.transferKB / 1024;
  if (pageSizeMB > 5) {
    recommendations.push({
      severity: 'high',
      issue: `Large page size (${pageSizeMB.toFixed(2)} MB)`,
      impact: 'Slow load times, especially on mobile networks, higher bounce rates',
      solution: '• Enable compression (gzip/Brotli)\n• Optimize all assets\n• Implement caching strategies\n• Remove unused resources\n• Use a CDN',
      tools: 'WebPageTest.org\nGTmetrix\nCloudFlare/CDN services'
    });
  } else if (pageSizeMB > 2) {
    recommendations.push({
      severity: 'medium',
      issue: `Page size could be smaller (${pageSizeMB.toFixed(2)} MB)`,
      impact: 'May load slowly on slower connections',
      solution: '• Audit and optimize largest assets\n• Implement lazy loading\n• Compress text resources\n• Consider using a service worker for offline caching',
      tools: 'Chrome DevTools → Network → Large resource sorting\nLighthouse → Total Byte Weight'
    });
  }
  
  // Heading structure recommendations
  if (data.seo.headings.h1 === 0) {
    recommendations.push({
      severity: 'high',
      issue: 'Missing H1 heading',
      impact: 'Poor SEO structure, unclear page hierarchy',
      solution: '• Add one descriptive H1 heading per page\n• Include primary keywords naturally\n• Ensure H1 reflects page content',
      tools: 'SEO tools\nWAVE Evaluation Tool'
    });
  } else if (data.seo.headings.h1 > 1) {
    recommendations.push({
      severity: 'medium',
      issue: `Multiple H1 headings (${data.seo.headings.h1})`,
      impact: 'Confusing page structure for search engines and screen readers',
      solution: '• Use only one H1 per page\n• Structure content with H2, H3 for subsections\n• Maintain logical heading hierarchy',
      tools: 'Chrome DevTools → Accessibility tree\nWAVE Evaluation Tool'
    });
  }
  
  // Meta description recommendations
  if (data.seo.metaDescription === 'Missing') {
    recommendations.push({
      severity: 'medium',
      issue: 'No meta description',
      impact: 'Reduced click-through rates from search results, poor SEO',
      solution: '• Add meta description: <meta name="description" content="...">\n• Keep it between 150-160 characters\n• Include primary keywords\n• Make it compelling for users',
      tools: 'Google Search Console\nSEO plugins (Yoast, RankMath)'
    });
  } else if (data.seo.metaDescription.length > 160) {
    recommendations.push({
      severity: 'low',
      issue: `Meta description too long (${data.seo.metaDescription.length} chars)`,
      impact: 'May get truncated in search results',
      solution: '• Shorten to 150-160 characters\n• Place important information first',
      tools: 'SEO preview tools'
    });
  }
  
  // Viewport recommendations
  if (data.seo.metaViewport === 'Missing') {
    recommendations.push({
      severity: 'high',
      issue: 'Missing viewport meta tag',
      impact: 'Poor mobile experience, not responsive',
      solution: '• Add viewport meta: <meta name="viewport" content="width=device-width, initial-scale=1">\n• Ensure responsive design\n• Test on multiple device sizes',
      tools: 'Chrome DevTools → Device Toolbar\nResponsively.app'
    });
  }
  
  // Load time recommendations
  if (data.metrics.loadTime && data.metrics.loadTime > 3000) {
    recommendations.push({
      severity: 'high',
      issue: `Slow load time (${data.metrics.loadTime}ms)`,
      impact: 'Poor user experience, higher bounce rates, lower conversions',
      solution: '• Optimize critical rendering path\n• Reduce server response time\n• Implement lazy loading\n• Use a CDN\n• Enable browser caching\n• Preload critical resources',
      tools: 'WebPageTest.org\nLighthouse\nChrome DevTools → Performance panel'
    });
  } else if (data.metrics.loadTime && data.metrics.loadTime > 1500) {
    recommendations.push({
      severity: 'medium',
      issue: `Moderate load time (${data.metrics.loadTime}ms)`,
      impact: 'Could be faster to improve user experience',
      solution: '• Analyze performance bottlenecks\n• Optimize largest contentful paint (LCP)\n• Reduce render-blocking resources',
      tools: 'Lighthouse\nChrome DevTools → Performance → Web Vitals'
    });
  }
  
  // First Contentful Paint recommendations
  if (data.metrics.fcp && data.metrics.fcp > 2000) {
    recommendations.push({
      severity: 'high',
      issue: `Slow First Contentful Paint (${data.metrics.fcp}ms)`,
      impact: 'Users see content late, perceived as slow',
      solution: '• Eliminate render-blocking resources\n• Inline critical CSS\n• Optimize server response time\n• Preload key requests\n• Reduce JavaScript execution time',
      tools: 'Lighthouse → First Contentful Paint\nChrome DevTools → Performance'
    });
  }
  
  // Network requests recommendations
  if (data.metrics.requests > 50) {
    recommendations.push({
      severity: 'medium',
      issue: `High number of network requests (${data.metrics.requests})`,
      impact: 'Increased latency, slower page load',
      solution: '• Combine resources where possible\n• Use HTTP/2 multiplexing\n• Implement HTTP/3\n• Remove unnecessary third-party scripts\n• Use resource hints: preconnect, prefetch',
      tools: 'Chrome DevTools → Network → Request count\nLighthouse → Minimize requests'
    });
  }
  
  return recommendations.sort((a, b) => {
    const severityWeight = { high: 3, medium: 2, low: 1 };
    return severityWeight[b.severity] - severityWeight[a.severity];
  });
}

// Comprehensive data collection (runs in page context)
function collectComprehensiveData() {
  try {
    const resources = performance.getEntriesByType("resource") || [];
    const navigation = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint") || [];
    
    // Resource breakdown
    const breakdown = {
      script: { count: 0, size: 0 },
      stylesheet: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      font: { count: 0, size: 0 },
      fetch: { count: 0, size: 0 },
      other: { count: 0, size: 0 }
    };
    
    resources.forEach(r => {
      let type = r.initiatorType || 'other';
      const size = r.transferSize || 0;
      
      if (type === 'link' || type === 'css') type = 'stylesheet';
      if (type === 'img') type = 'image';
      if (type === 'script') type = 'script';
      
      if (breakdown[type]) {
        breakdown[type].count++;
        breakdown[type].size += size;
      } else {
        breakdown.other.count++;
        breakdown.other.size += size;
      }
    });
    
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    const fcpTime = fcp ? Math.round(fcp.startTime) : null;
    
    const domElements = document.getElementsByTagName("*").length;
    const scripts = document.getElementsByTagName("script").length;
    const styles = document.querySelectorAll('link[rel="stylesheet"]').length;
    const images = document.getElementsByTagName("img").length;
    const iframes = document.getElementsByTagName("iframe").length;
    
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    const metaViewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content');
    const title = document.title || 'No title';
    const headings = {
      h1: document.getElementsByTagName('h1').length,
      h2: document.getElementsByTagName('h2').length,
      h3: document.getElementsByTagName('h3').length
    };
    
    let imagesWithoutAlt = 0;
    const allImages = document.getElementsByTagName('img');
    for (let i = 0; i < allImages.length; i++) {
      if (!allImages[i].alt || allImages[i].alt === '') {
        imagesWithoutAlt++;
      }
    }
    
    let totalSize = 0;
    resources.forEach(r => {
      totalSize += (r.transferSize || 0);
    });
    const totalSizeKB = Math.round(totalSize / 1024);
    
    let score = 100;
    if (domElements > 1500) score -= 20;
    else if (domElements > 800) score -= 10;
    
    if (totalSizeKB > 5000) score -= 25;
    else if (totalSizeKB > 2000) score -= 15;
    else if (totalSizeKB > 1000) score -= 5;
    
    if (scripts > 30) score -= 15;
    if (imagesWithoutAlt > 5) score -= 10;
    if (!metaDescription) score -= 5;
    if (!metaViewport) score -= 10;
    if (headings.h1 === 0) score -= 5;
    
    score = Math.max(0, Math.min(100, score));
    
    const issues = [];
    if (totalSizeKB > 3000) issues.push(`🚨 Large page size: ${totalSizeKB} KB`);
    if (scripts > 25) issues.push(`📦 Too many scripts: ${scripts}`);
    if (imagesWithoutAlt > 0) issues.push(`🖼️ ${imagesWithoutAlt} images missing alt text`);
    if (!metaDescription) issues.push(`📝 Missing meta description`);
    if (domElements > 1000) issues.push(`🌲 High DOM complexity: ${domElements} elements`);
    if (!metaViewport) issues.push(`📱 Missing viewport meta tag`);
    if (headings.h1 === 0) issues.push(`📌 No H1 heading found`);
    if (headings.h1 > 1) issues.push(`📌 Multiple H1 headings (${headings.h1})`);
    
    return {
      url: window.location.href,
      title: title,
      score: score,
      metrics: {
        domCount: domElements,
        requests: resources.length,
        loadTime: navigation ? Math.round(navigation.loadEventEnd || 0) : null,
        transferKB: totalSizeKB,
        fcp: fcpTime,
        scripts: scripts,
        styles: styles,
        images: images,
        iframes: iframes
      },
      breakdown: breakdown,
      seo: {
        metaDescription: metaDescription || 'Missing',
        metaDescriptionLength: metaDescription ? metaDescription.length : 0,
        metaViewport: metaViewport || 'Missing',
        title: title,
        headings: headings,
        imagesWithoutAlt: imagesWithoutAlt
      },
      issues: issues,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      error: err.message,
      url: window.location.href,
      title: document.title || 'Unknown'
    };
  }
}

function displayResult(data, tab = 'overview') {
  if (!data || !resultEl) return;
  
  if (data.error) {
    resultEl.innerHTML = `<div class="metric" style="color: #ef4444;">Error: ${data.error}</div>`;
    return;
  }
  
  const getScoreClass = (score) => {
    if (score >= 80) return 'good';
    if (score >= 50) return 'avg';
    return 'poor';
  };
  
  const tabs = {
    overview: () => {
      const cls = getScoreClass(data.score);
      const gradeLabel = cls === 'good' ? '✦ EXCELLENT' : cls === 'avg' ? '▲ NEEDS WORK' : '✕ POOR';
      // SVG ring: circumference = 2π×26 ≈ 163.4
      const C = 163.4;
      const offset = C - (data.score / 100) * C;
      const shortUrl = (data.url || 'N/A').replace(/^https?:\/\//, '').substring(0, 42);
      return `
      <div class="score-block ${cls}">
        <div class="score-ring">
          <svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg">
            <circle class="ring-bg"   cx="29" cy="29" r="26"/>
            <circle class="ring-fill" cx="29" cy="29" r="26"
              stroke-dasharray="${C}"
              stroke-dashoffset="${offset.toFixed(1)}"/>
          </svg>
          <div class="score-num-wrap">
            <span class="score-num">${data.score}</span>
          </div>
        </div>
        <div class="score-meta">
          <div class="score-title">Performance Score</div>
          <div class="score-url">${shortUrl}</div>
          <span class="score-grade">${gradeLabel}</span>
        </div>
      </div>
      <div class="metric">
        <span class="metric-label">📄 Page Title</span>
        <span class="metric-value" style="font-size:10px;">${(data.title || 'N/A').substring(0,40)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">🌲 DOM Elements</span>
        <span class="metric-value ${data.metrics.domCount > 800 ? 'warning' : ''}">${data.metrics.domCount.toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-label">📡 Network Requests</span>
        <span class="metric-value">${data.metrics.requests.toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-label">⚡ Load Time</span>
        <span class="metric-value">${data.metrics.loadTime ? data.metrics.loadTime + ' ms' : 'N/A'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">📦 Transfer Size</span>
        <span class="metric-value ${data.metrics.transferKB > 2000 ? 'warning' : ''}">${data.metrics.transferKB.toLocaleString()} KB</span>
      </div>
      <div class="metric">
        <span class="metric-label">🎨 First Paint (FCP)</span>
        <span class="metric-value">${data.metrics.fcp ? data.metrics.fcp + ' ms' : 'N/A'}</span>
      </div>
    `; },
    
    recommendations: () => {
      if (!data.recommendations || data.recommendations.length === 0) {
        return '<div class="metric" style="color: #22c55e;">🎉 Great job! No critical performance issues found!</div>';
      }
      
      return `
        <div style="margin-bottom: 12px; font-size: 11px; color: #94a3b8;">
          📋 ${data.recommendations.length} recommendation(s) to improve performance
        </div>
        ${data.recommendations.map(rec => `
          <div class="recommendation" style="margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 3px solid ${rec.severity === 'high' ? '#ef4444' : rec.severity === 'medium' ? '#f59e0b' : '#3b82f6'}">
            <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">${rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🔵'}</span>
              <span style="font-size: 13px;">${rec.issue}</span>
            </div>
            <div style="font-size: 11px; color: #f59e0b; margin-bottom: 8px;">
              ⚠️ Impact: ${rec.impact}
            </div>
            <div style="font-size: 11px; color: #22c55e; margin-bottom: 8px;">
              💡 Solution:<br>
              <span style="color: #e5e7eb; white-space: pre-line;">${rec.solution}</span>
            </div>
            <div style="font-size: 10px; color: #3b82f6;">
              🛠️ Tools: ${rec.tools}
            </div>
          </div>
        `).join('')}
      `;
    },
    
    resources: () => `
      <div class="metric">
        <span class="metric-label">📜 JavaScript:</span>
        <span class="metric-value">${data.breakdown.script.count} files (${Math.round(data.breakdown.script.size / 1024).toLocaleString()} KB)</span>
      </div>
      <div class="metric">
        <span class="metric-label">🎨 CSS:</span>
        <span class="metric-value">${data.breakdown.stylesheet.count} files (${Math.round(data.breakdown.stylesheet.size / 1024).toLocaleString()} KB)</span>
      </div>
      <div class="metric">
        <span class="metric-label">🖼️ Images:</span>
        <span class="metric-value">${data.breakdown.image.count} files (${Math.round(data.breakdown.image.size / 1024).toLocaleString()} KB)</span>
      </div>
      <div class="metric">
        <span class="metric-label">🔤 Fonts:</span>
        <span class="metric-value">${data.breakdown.font.count} files (${Math.round(data.breakdown.font.size / 1024).toLocaleString()} KB)</span>
      </div>
      <div class="metric">
        <span class="metric-label">🌐 Fetch/XHR:</span>
        <span class="metric-value">${data.breakdown.fetch.count} files</span>
      </div>
      <div class="metric">
        <span class="metric-label">📦 Other Resources:</span>
        <span class="metric-value">${data.breakdown.other.count} files</span>
      </div>
      <div class="metric">
        <span class="metric-label">🖼️ Total Images on Page:</span>
        <span class="metric-value">${data.metrics.images}</span>
      </div>
    `,
    
    issues: () => `
      ${data.issues.length === 0 ? 
        '<div class="metric" style="color: #22c55e;">✅ No critical issues detected! Great job! 🎉</div>' : 
        data.issues.map(issue => `<div class="metric" style="color: #f59e0b;">${issue}</div>`).join('')
      }
      <div class="metric" style="margin-top: 12px;">
        <span class="metric-label">💡 Tip:</span>
        <span class="metric-value">Check "Recommendations" tab for detailed fixes!</span>
      </div>
    `,
    
    seo: () => `
      <div class="metric">
        <span class="metric-label">📝 Title:</span>
        <span class="metric-value" style="word-break: break-all;">${(data.seo.title || 'Missing').substring(0, 80)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">📄 Meta Description:</span>
        <span class="metric-value" style="word-break: break-all;">${(data.seo.metaDescription || '❌ Missing').substring(0, 100)}</span>
        ${data.seo.metaDescription !== 'Missing' ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Length: ${data.seo.metaDescriptionLength} characters ${data.seo.metaDescriptionLength > 160 ? '(too long)' : data.seo.metaDescriptionLength < 120 ? '(could be longer)' : '(optimal)'}</div>` : ''}
      </div>
      <div class="metric">
        <span class="metric-label">📱 Viewport:</span>
        <span class="metric-value ${data.seo.metaViewport === 'Missing' ? 'warning' : ''}">${data.seo.metaViewport}</span>
      </div>
      <div class="metric">
        <span class="metric-label">🔤 Heading Structure:</span>
        <span class="metric-value">H1: ${data.seo.headings.h1} | H2: ${data.seo.headings.h2} | H3: ${data.seo.headings.h3}</span>
      </div>
      <div class="metric">
        <span class="metric-label">🖼️ Images Missing Alt:</span>
        <span class="metric-value ${data.seo.imagesWithoutAlt > 0 ? 'warning' : ''}">${data.seo.imagesWithoutAlt}</span>
      </div>
      ${data.seo.headings.h1 === 0 ? 
        '<div class="metric" style="color: #f59e0b;">⚠️ No H1 heading found (important for SEO)</div>' : ''}
      ${data.seo.headings.h1 > 1 ? 
        '<div class="metric" style="color: #f59e0b;">⚠️ Multiple H1 headings found (should be only one)</div>' : ''}
    `
  };
  
  resultEl.innerHTML = tabs[tab] ? tabs[tab]() : tabs.overview();
}

function exportToJSON() {
  if (!currentAnalysis) {
    setStatus("⚠️ No analysis data to export");
    return;
  }
  
  const dataStr = JSON.stringify(currentAnalysis, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus("✅ Report exported as JSON!");
}

function copyReport() {
  if (!currentAnalysis) {
    setStatus("⚠️ No analysis data to copy");
    return;
  }
  
  const recommendationsText = currentAnalysis.recommendations && currentAnalysis.recommendations.length > 0
    ? `\n📋 RECOMMENDATIONS:\n${currentAnalysis.recommendations.map(rec => 
        `\n[${rec.severity.toUpperCase()}] ${rec.issue}\nImpact: ${rec.impact}\nSolution:\n${rec.solution}\nTools: ${rec.tools}`
      ).join('\n' + '='.repeat(50) + '\n')}`
    : '\n✅ No recommendations - page is well optimized!';
  
  const report = `
╔═══════════════════════════════════════════════════════════╗
║              PERFORMANCE ANALYSIS REPORT                  ║
╚═══════════════════════════════════════════════════════════╝

URL: ${currentAnalysis.url}
Title: ${currentAnalysis.title}
Score: ${currentAnalysis.score}/100

📊 METRICS:
├─ DOM Elements: ${currentAnalysis.metrics.domCount.toLocaleString()}
├─ Network Requests: ${currentAnalysis.metrics.requests}
├─ Load Time: ${currentAnalysis.metrics.loadTime || 'N/A'} ms
├─ Transfer Size: ${currentAnalysis.metrics.transferKB.toLocaleString()} KB
├─ First Paint (FCP): ${currentAnalysis.metrics.fcp || 'N/A'} ms
├─ JavaScript Files: ${currentAnalysis.metrics.scripts}
└─ CSS Files: ${currentAnalysis.metrics.styles}

📦 RESOURCE BREAKDOWN:
├─ JS: ${currentAnalysis.breakdown.script.count} files (${Math.round(currentAnalysis.breakdown.script.size / 1024)} KB)
├─ CSS: ${currentAnalysis.breakdown.stylesheet.count} files (${Math.round(currentAnalysis.breakdown.stylesheet.size / 1024)} KB)
├─ Images: ${currentAnalysis.breakdown.image.count} files (${Math.round(currentAnalysis.breakdown.image.size / 1024)} KB)
└─ Fonts: ${currentAnalysis.breakdown.font.count} files

${recommendationsText}

Report generated: ${new Date(currentAnalysis.timestamp).toLocaleString()}
  `.trim();
  
  navigator.clipboard.writeText(report).then(() => {
    setStatus("📋 Full report copied to clipboard!");
  }).catch(() => {
    setStatus("❌ Failed to copy report");
  });
}

function setStatus(text) {
  if (statusEl) {
    const span = statusEl.querySelector('#statusText');
    if (span) span.textContent = text;
    else statusEl.textContent = text;
  }
}
// services/performanceService.js — PerfPro v3.1
// This function is serialised and injected into the TARGET PAGE via
// chrome.scripting.executeScript({ func: collectComprehensiveData }).
// Rules: no closures over extension globals; no chrome.* calls; runs in page context.

function collectComprehensiveData() {
  try {
    const resources  = performance.getEntriesByType('resource')   || [];
    const navEntries = performance.getEntriesByType('navigation');
    const nav        = navEntries.length ? navEntries[0] : null;
    const paintEntries = performance.getEntriesByType('paint') || [];

    // ── Resource breakdown ──────────────────────────────────────
    const breakdown = {
      script:     { count: 0, size: 0 },
      stylesheet: { count: 0, size: 0 },
      image:      { count: 0, size: 0 },
      font:       { count: 0, size: 0 },
      fetch:      { count: 0, size: 0 },
      other:      { count: 0, size: 0 }
    };

    let totalTransfer = 0;
    resources.forEach(r => {
      let type = (r.initiatorType || 'other').toLowerCase();
      if (type === 'link' || type === 'css')                   type = 'stylesheet';
      if (type === 'img'  || type === 'image')                 type = 'image';
      if (type === 'xmlhttprequest' || type === 'beacon')      type = 'fetch';
      if (!breakdown[type])                                    type = 'other';
      const sz = r.transferSize || 0;
      breakdown[type].count++;
      breakdown[type].size += sz;
      totalTransfer += sz;
    });

    // ── Navigation timings ──────────────────────────────────────
    const loadTime           = nav ? Math.round(nav.loadEventEnd || 0)              : null;
    const domContentLoaded   = nav ? Math.round(nav.domContentLoadedEventEnd || 0)  : null;
    const ttfb               = nav ? Math.round(nav.responseStart - nav.requestStart) : null;

    // ── Paint timings ───────────────────────────────────────────
    const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
    const fcp      = fcpEntry ? Math.round(fcpEntry.startTime) : null;

    // ── LCP (synchronous snapshot of buffered entries) ──────────
    let lcp = null;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries && lcpEntries.length) {
        lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }
    } catch (_) { /* API not supported */ }

    // ── CLS snapshot ────────────────────────────────────────────
    let cls = null;
    try {
      const clsEntries = performance.getEntriesByType('layout-shift');
      if (clsEntries && clsEntries.length) {
        cls = parseFloat(clsEntries.reduce((s, e) => s + (e.value || 0), 0).toFixed(4));
      }
    } catch (_) { /* API not supported */ }

    // ── DOM stats ───────────────────────────────────────────────
    const domCount   = document.getElementsByTagName('*').length;
    const scriptTags = document.getElementsByTagName('script').length;
    const styleTags  = document.querySelectorAll('link[rel="stylesheet"]').length;
    const imgTags    = document.getElementsByTagName('img').length;
    const iframes    = document.getElementsByTagName('iframe').length;
    const links      = document.getElementsByTagName('a').length;

    // ── Images without alt ──────────────────────────────────────
    const allImgs = document.getElementsByTagName('img');
    let imagesWithoutAlt = 0;
    for (let i = 0; i < allImgs.length; i++) {
      if (!allImgs[i].hasAttribute('alt')) imagesWithoutAlt++;
    }

    // ── Heavy asset detection ───────────────────────────────────
    const heavyImages  = [];
    const heavyScripts = [];
    resources.forEach(r => {
      const name = r.name.split('/').pop().substring(0, 60);
      if ((r.initiatorType === 'img' || r.initiatorType === 'image') && r.transferSize > 200 * 1024) {
        heavyImages.push({ url: name, size: Math.round(r.transferSize / 1024) });
      }
      if (r.initiatorType === 'script' && r.transferSize > 100 * 1024) {
        heavyScripts.push({ url: name, size: Math.round(r.transferSize / 1024) });
      }
    });

    // ── SEO metadata ────────────────────────────────────────────
    const metaDescription = document.querySelector('meta[name="description"]')
      ?.getAttribute('content') || null;
    const metaViewport = document.querySelector('meta[name="viewport"]')
      ?.getAttribute('content') || null;
    const ogTitle    = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
    const canonical  = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
    const robotsMeta = document.querySelector('meta[name="robots"]')?.getAttribute('content') || null;

    const headings = {
      h1: document.getElementsByTagName('h1').length,
      h2: document.getElementsByTagName('h2').length,
      h3: document.getElementsByTagName('h3').length,
      h4: document.getElementsByTagName('h4').length
    };

    // ── Performance score ────────────────────────────────────────
    let score = 100;
    const totalKB = Math.round(totalTransfer / 1024);

    if      (loadTime > 5000) score -= 25;
    else if (loadTime > 3000) score -= 15;
    else if (loadTime > 1500) score -= 8;

    if      (fcp > 3000) score -= 20;
    else if (fcp > 1800) score -= 10;
    else if (fcp > 1000) score -= 3;

    if      (lcp > 4000) score -= 15;
    else if (lcp > 2500) score -= 8;

    if      (domCount > 1500) score -= 15;
    else if (domCount > 800)  score -= 7;

    if      (totalKB > 5000) score -= 20;
    else if (totalKB > 2000) score -= 10;
    else if (totalKB > 1000) score -= 4;

    if      (scriptTags > 30) score -= 10;
    else if (scriptTags > 15) score -= 5;

    if (!metaDescription) score -= 5;
    if (!metaViewport)    score -= 8;
    if (headings.h1 === 0) score -= 5;
    if (imagesWithoutAlt > 5) score -= 5;
    if (cls !== null && cls > 0.25) score -= 8;

    score = Math.max(0, Math.min(100, Math.round(score)));

    // ── Issues list ──────────────────────────────────────────────
    const issues = [];
    if (loadTime && loadTime > 3000)
      issues.push({ severity: 'high',   text: `Slow load time: ${loadTime} ms` });
    if (fcp && fcp > 1800)
      issues.push({ severity: 'high',   text: `Slow FCP: ${fcp} ms` });
    if (lcp && lcp > 2500)
      issues.push({ severity: 'high',   text: `Slow LCP: ${lcp} ms` });
    if (totalKB > 3000)
      issues.push({ severity: 'high',   text: `Large page: ${totalKB} KB` });
    if (scriptTags > 25)
      issues.push({ severity: 'high',   text: `Too many scripts: ${scriptTags}` });
    if (!metaViewport)
      issues.push({ severity: 'high',   text: 'Missing viewport meta tag' });
    if (cls !== null && cls > 0.1)
      issues.push({ severity: cls > 0.25 ? 'high' : 'medium', text: `High CLS: ${cls}` });
    if (domCount > 1000)
      issues.push({ severity: 'medium', text: `High DOM size: ${domCount} elements` });
    if (imagesWithoutAlt > 0)
      issues.push({ severity: 'medium', text: `${imagesWithoutAlt} image(s) missing alt text` });
    if (!metaDescription)
      issues.push({ severity: 'medium', text: 'Missing meta description' });
    if (headings.h1 === 0)
      issues.push({ severity: 'medium', text: 'No H1 heading found' });
    if (headings.h1 > 1)
      issues.push({ severity: 'medium', text: `Multiple H1 headings (${headings.h1})` });
    if (heavyImages.length > 0)
      issues.push({ severity: 'medium', text: `${heavyImages.length} heavy image(s) detected` });
    if (iframes > 3)
      issues.push({ severity: 'low',    text: `${iframes} iframes on page` });

    const severityWeight = { high: 3, medium: 2, low: 1 };
    issues.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

    return {
      url:   window.location.href,
      title: document.title || 'No Title',
      score,
      metrics: {
        loadTime,
        domContentLoaded,
        ttfb,
        fcp,
        lcp,
        cls,
        domCount,
        requests: resources.length,
        transferKB: totalKB,
        scripts: scriptTags,
        styles:  styleTags,
        images:  imgTags,
        iframes,
        links
      },
      breakdown,
      seo: {
        title: document.title || null,
        metaDescription,
        metaDescriptionLength: metaDescription ? metaDescription.length : 0,
        metaViewport,
        ogTitle,
        canonical,
        robotsMeta,
        headings,
        imagesWithoutAlt
      },
      heavyScripts: heavyScripts.slice(0, 5),
      heavyImages:  heavyImages.slice(0, 5),
      issues,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    return {
      error:     err.message,
      url:       window.location.href,
      title:     document.title || 'Unknown',
      timestamp: new Date().toISOString()
    };
  }
}
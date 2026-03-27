// Tech Detector Pro v2.0 — Content Script
// Advanced DOM + Script + Meta + Window + Performance scanning engine
'use strict';

if (typeof window.__TECH_DETECTOR_V2__ === 'undefined') {
  window.__TECH_DETECTOR_V2__ = true;

  // ─── State ───
  let TECH_PATTERNS = {};
  let DB_LOADED = false;

  // ─── Load tech database ───
  async function loadDB() {
    if (DB_LOADED) return true;
    try {
      const res = await fetch(chrome.runtime.getURL('technologies.json'));
      const data = await res.json();
      TECH_PATTERNS = {};
      
      Object.entries(data.technologies).forEach(([cat, techs]) => {
        techs.forEach(t => {
          TECH_PATTERNS[t.id] = {
            name: t.name,
            category: cat,
            patterns: t.patterns || [],
            website: t.website || null,
            versionCheck: t.versionCheck || null
          };
        });
      });
      
      DB_LOADED = true;
      return true;
    } catch (e) {
      console.error('[TDP] DB load failed:', e);
      return false;
    }
  }

  // ─── Confidence helpers ───
  function confLabel(score) {
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  // ─── Version extraction (improved) ───
  const VERSION_EXTRACTORS = {
    react: [
      () => {
        try {
          const h = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          if (h?.renderers?.size) {
            for (const [, r] of h.renderers) {
              if (r.version) return r.version;
            }
          }
          if (window.React?.version) return window.React.version;
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /react[/@-](\d+\.\d+[\.\d]*)/i),
    ],
    vue: [
      () => {
        try {
          return window.Vue?.version || window.__vue_version__ || null;
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /vue[/@-](\d+\.\d+[\.\d]*)/i),
    ],
    angular: [
      () => {
        try {
          const el = document.querySelector('[ng-version]');
          return el?.getAttribute('ng-version') || null;
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /angular[/@-](\d+\.\d+[\.\d]*)/i),
    ],
    jquery: [
      () => {
        try {
          return window.jQuery?.fn?.jquery || window.$?.fn?.jquery || null;
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /jquery[/@-v]?(\d+\.\d+[\.\d]*)/i),
    ],
    bootstrap: [
      () => {
        try {
          return window.bootstrap?.Tooltip?.VERSION || null;
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /bootstrap[/@-v]?(\d+\.\d+[\.\d]*)/i),
    ],
    wordpress: [
      () => {
        try {
          const meta = document.querySelector('meta[name="generator"]');
          if (meta && meta.content.toLowerCase().includes('wordpress')) {
            const match = meta.content.match(/(\d+\.\d+[\.\d]*)/);
            return match ? match[1] : null;
          }
        } catch {}
        return null;
      },
      (src) => extractVersionFromStr(src, /ver=(\d+\.\d+[\.\d]*)/),
    ],
    nextjs: [
      () => {
        try {
          if (window.__NEXT_DATA__) {
            return window.__NEXT_DATA__.version || 'detected';
          }
        } catch {}
        return null;
      },
    ],
    nuxt: [
      () => {
        try {
          return window.__NUXT__?.config?.app?.nuxtVersion || null;
        } catch {}
        return null;
      },
    ],
    tailwind: [
      () => {
        try {
          // Check for Tailwind classes in HTML
          const html = document.documentElement.outerHTML;
          if (/class="[^"]*(?:flex|grid|text-|bg-|p-|m-|rounded|border)[^"]*"/i.test(html)) {
            return 'detected';
          }
        } catch {}
        return null;
      },
    ],
  };

  function extractVersionFromStr(str, regex) {
    const m = str.match(regex);
    return m ? m[1] : null;
  }

  function getVersion(techId, allSrc) {
    const extractors = VERSION_EXTRACTORS[techId];
    if (!extractors) return null;
    for (const fn of extractors) {
      try {
        const v = fn.length === 0 ? fn() : fn(allSrc);
        if (v) return v;
      } catch {}
    }
    return null;
  }

  // ─── Main detection engine ───
  async function detectTechnologies() {
    await loadDB();

    const detected = {
      frontend: [],
      backend: [],
      cms: [],
      analytics: [],
      hosting: [],
      libraries: [],
      payment: [],
      build_tools: []
    };

    // ── Gather all signals ──
    const scripts = Array.from(document.scripts);
    const links = Array.from(document.querySelectorAll('link'));
    const metas = Array.from(document.querySelectorAll('meta'));
    const allScripts = scripts.map(s => s.src || '').filter(Boolean);
    const allSrc = allScripts.join(' ');
    const rawHTML = document.documentElement.outerHTML;
    const htmlLower = rawHTML.substring(0, 150000).toLowerCase();
    const htmlFull = rawHTML.substring(0, 150000);

    // Get all response headers (via fetch if possible)
    let headers = '';
    try {
      const response = await fetch(window.location.href, { method: 'HEAD', mode: 'no-cors' });
      headers = JSON.stringify(response.headers);
    } catch (e) {}

    // ── Window globals detection (most reliable) ──
    const globalChecks = [
      { check: () => window.React, id: 'react', name: 'React', cat: 'frontend', score: 3 },
      { check: () => window.__REACT_DEVTOOLS_GLOBAL_HOOK__, id: 'react', name: 'React', cat: 'frontend', score: 3 },
      { check: () => window.Vue, id: 'vue', name: 'Vue.js', cat: 'frontend', score: 3 },
      { check: () => window.__VUE__, id: 'vue', name: 'Vue.js', cat: 'frontend', score: 3 },
      { check: () => window.__NEXT_DATA__, id: 'nextjs', name: 'Next.js', cat: 'frontend', score: 3 },
      { check: () => window.__NUXT__, id: 'nuxt', name: 'Nuxt.js', cat: 'frontend', score: 3 },
      { check: () => window.angular, id: 'angular', name: 'Angular', cat: 'frontend', score: 3 },
      { check: () => window.__ANGULAR__, id: 'angular', name: 'Angular', cat: 'frontend', score: 3 },
      { check: () => window.Alpine, id: 'alpinejs', name: 'Alpine.js', cat: 'frontend', score: 3 },
      { check: () => window.htmx, id: 'htmx', name: 'htmx', cat: 'frontend', score: 3 },
      { check: () => window.jQuery, id: 'jquery', name: 'jQuery', cat: 'libraries', score: 3 },
      { check: () => window.$?.fn?.jquery, id: 'jquery', name: 'jQuery', cat: 'libraries', score: 3 },
      { check: () => window.gsap, id: 'gsap', name: 'GSAP', cat: 'libraries', score: 3 },
      { check: () => window.THREE, id: 'threejs', name: 'Three.js', cat: 'libraries', score: 3 },
      { check: () => window.d3, id: 'd3js', name: 'D3.js', cat: 'libraries', score: 3 },
      { check: () => window._?.VERSION, id: 'lodash', name: 'Lodash', cat: 'libraries', score: 3 },
      { check: () => window.gtag, id: 'google_analytics_4', name: 'Google Analytics 4', cat: 'analytics', score: 3 },
      { check: () => window.ga, id: 'google_analytics_4', name: 'Google Analytics', cat: 'analytics', score: 2 },
      { check: () => window.dataLayer, id: 'google_tag_manager', name: 'Google Tag Manager', cat: 'analytics', score: 2 },
      { check: () => window.fbq, id: 'facebook_pixel', name: 'Meta Pixel', cat: 'analytics', score: 3 },
      { check: () => window.Shopify, id: 'shopify', name: 'Shopify', cat: 'cms', score: 3 },
      { check: () => window.wc_add_to_cart_params, id: 'woocommerce', name: 'WooCommerce', cat: 'cms', score: 3 },
      { check: () => window.Stripe, id: 'stripe', name: 'Stripe', cat: 'payment', score: 3 },
      { check: () => window.Intercom, id: 'intercom', name: 'Intercom', cat: 'analytics', score: 3 },
    ];

    for (const { check, id, name, cat, score } of globalChecks) {
      try {
        if (check()) {
          const version = getVersion(id, allSrc);
          addTech(detected, cat, {
            id, name, category: cat, version,
            confidence: confLabel(score), detectionMethod: 'window'
          });
        }
      } catch (e) {}
    }

    // ── Script URL detection ──
    const scriptPatterns = [
      { pattern: /react/i, id: 'react', name: 'React', cat: 'frontend', score: 2 },
      { pattern: /vue/i, id: 'vue', name: 'Vue.js', cat: 'frontend', score: 2 },
      { pattern: /angular/i, id: 'angular', name: 'Angular', cat: 'frontend', score: 2 },
      { pattern: /next/i, id: 'nextjs', name: 'Next.js', cat: 'frontend', score: 2 },
      { pattern: /nuxt/i, id: 'nuxt', name: 'Nuxt.js', cat: 'frontend', score: 2 },
      { pattern: /gatsby/i, id: 'gatsby', name: 'Gatsby', cat: 'frontend', score: 2 },
      { pattern: /svelte/i, id: 'svelte', name: 'Svelte', cat: 'frontend', score: 2 },
      { pattern: /jquery/i, id: 'jquery', name: 'jQuery', cat: 'libraries', score: 2 },
      { pattern: /bootstrap/i, id: 'bootstrap', name: 'Bootstrap', cat: 'libraries', score: 2 },
      { pattern: /tailwind/i, id: 'tailwind', name: 'Tailwind CSS', cat: 'frontend', score: 2 },
      { pattern: /\/wp-content\//i, id: 'wordpress', name: 'WordPress', cat: 'cms', score: 3 },
      { pattern: /\/wp-includes\//i, id: 'wordpress', name: 'WordPress', cat: 'cms', score: 3 },
      { pattern: /shopify/i, id: 'shopify', name: 'Shopify', cat: 'cms', score: 3 },
      { pattern: /googletagmanager/i, id: 'google_tag_manager', name: 'Google Tag Manager', cat: 'analytics', score: 2 },
      { pattern: /gtag\/js/i, id: 'google_analytics_4', name: 'Google Analytics 4', cat: 'analytics', score: 2 },
      { pattern: /hotjar/i, id: 'hotjar', name: 'Hotjar', cat: 'analytics', score: 2 },
      { pattern: /stripe/i, id: 'stripe', name: 'Stripe', cat: 'payment', score: 2 },
      { pattern: /cloudflare/i, id: 'cloudflare', name: 'Cloudflare', cat: 'hosting', score: 2 },
      { pattern: /vercel/i, id: 'vercel', name: 'Vercel', cat: 'hosting', score: 2 },
      { pattern: /netlify/i, id: 'netlify', name: 'Netlify', cat: 'hosting', score: 2 },
      { pattern: /amazonaws/i, id: 'aws', name: 'Amazon AWS', cat: 'hosting', score: 2 },
      { pattern: /azure/i, id: 'azure', name: 'Microsoft Azure', cat: 'hosting', score: 2 },
    ];

    allScripts.forEach(src => {
      scriptPatterns.forEach(({ pattern, id, name, cat, score }) => {
        if (pattern.test(src)) {
          const version = getVersion(id, src);
          addTech(detected, cat, {
            id, name, category: cat, version,
            confidence: confLabel(score), detectionMethod: 'script-url'
          });
        }
      });
    });

    // ── HTML/DOM pattern detection ──
    const domPatterns = [
      { pattern: 'data-reactroot', id: 'react', name: 'React', cat: 'frontend', score: 3 },
      { pattern: 'data-reactid', id: 'react', name: 'React', cat: 'frontend', score: 3 },
      { pattern: '_reactRootContainer', id: 'react', name: 'React', cat: 'frontend', score: 3 },
      { pattern: 'data-v-', id: 'vue', name: 'Vue.js', cat: 'frontend', score: 3 },
      { pattern: 'v-cloak', id: 'vue', name: 'Vue.js', cat: 'frontend', score: 3 },
      { pattern: 'ng-version', id: 'angular', name: 'Angular', cat: 'frontend', score: 3 },
      { pattern: '_nghost', id: 'angular', name: 'Angular', cat: 'frontend', score: 3 },
      { pattern: 'data-astro', id: 'astro', name: 'Astro', cat: 'frontend', score: 3 },
      { pattern: 'svelte-', id: 'svelte', name: 'Svelte', cat: 'frontend', score: 3 },
      { pattern: 'wp-content', id: 'wordpress', name: 'WordPress', cat: 'cms', score: 3 },
      { pattern: 'wp-json', id: 'wordpress', name: 'WordPress', cat: 'cms', score: 3 },
      { pattern: 'woocommerce', id: 'woocommerce', name: 'WooCommerce', cat: 'cms', score: 3 },
    ];

    domPatterns.forEach(({ pattern, id, name, cat, score }) => {
      if (htmlLower.includes(pattern)) {
        const version = getVersion(id, '');
        addTech(detected, cat, {
          id, name, category: cat, version,
          confidence: confLabel(score), detectionMethod: 'dom-attribute'
        });
      }
    });

    // ── Meta tag detection ──
    metas.forEach(meta => {
      const generator = meta.getAttribute('generator');
      if (generator) {
        const genLower = generator.toLowerCase();
        if (genLower.includes('wordpress')) {
          const version = extractVersionFromStr(generator, /(\d+\.\d+[\.\d]*)/);
          addTech(detected, 'cms', {
            id: 'wordpress', name: 'WordPress', category: 'cms',
            version, confidence: 'high', detectionMethod: 'meta-generator'
          });
        }
        if (genLower.includes('wix')) {
          addTech(detected, 'cms', {
            id: 'wix', name: 'Wix', category: 'cms',
            version: null, confidence: 'high', detectionMethod: 'meta-generator'
          });
        }
        if (genLower.includes('webflow')) {
          addTech(detected, 'cms', {
            id: 'webflow', name: 'Webflow', category: 'cms',
            version: null, confidence: 'high', detectionMethod: 'meta-generator'
          });
        }
      }
    });

    // ── CSS Framework detection via classes ──
    const htmlSample = rawHTML.substring(0, 50000);
    
    if (/\b(container|row|col-|btn|navbar|modal|card)\b/i.test(htmlSample)) {
      addTech(detected, 'libraries', {
        id: 'bootstrap', name: 'Bootstrap', category: 'libraries',
        version: null, confidence: 'medium', detectionMethod: 'css-classes'
      });
    }
    
    if (/\b(flex|grid|text-|bg-|p-|m-|rounded|shadow)\b/i.test(htmlSample)) {
      addTech(detected, 'frontend', {
        id: 'tailwind', name: 'Tailwind CSS', category: 'frontend',
        version: null, confidence: 'medium', detectionMethod: 'css-classes'
      });
    }

    // ── Deduplicate ──
    Object.keys(detected).forEach(cat => {
      if (Array.isArray(detected[cat])) {
        detected[cat] = dedup(detected[cat]);
      }
    });

    return detected;
  }

  // ─── Add tech helper ───
  function addTech(detected, cat, item) {
    if (!detected[cat]) {
      detected[cat] = [];
    }
    const bucket = detected[cat];
    const existing = bucket.find(t => t.id === item.id);
    const confScore = { high: 3, medium: 2, low: 1 };

    if (existing) {
      if (confScore[item.confidence] > confScore[existing.confidence]) {
        existing.confidence = item.confidence;
        existing.detectionMethod = item.detectionMethod;
      }
      if (item.version && !existing.version) {
        existing.version = item.version;
      }
    } else {
      item.detectedAt = new Date().toISOString();
      bucket.push(item);
    }
  }

  // ─── Dedup by id ───
  function dedup(arr) {
    const seen = new Map();
    const confScore = { high: 3, medium: 2, low: 1 };
    arr.forEach(item => {
      const existing = seen.get(item.id);
      if (!existing || confScore[item.confidence] > confScore[existing.confidence]) {
        seen.set(item.id, item);
      }
    });
    return Array.from(seen.values());
  }

  // ─── Message listener ───
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      try {
        if (msg.type === 'PING') {
          sendResponse({ pong: true });
          return;
        }
        if (msg.type === 'DETECT_TECHNOLOGIES') {
          const technologies = await detectTechnologies();
          const result = {
            url: window.location.href,
            hostname: window.location.hostname,
            title: document.title,
            technologies,
            timestamp: new Date().toISOString(),
          };
          sendResponse({ success: true, data: result });
        }
      } catch (err) {
        console.error('[TDP] Error:', err);
        sendResponse({ error: true, message: err.message });
      }
    })();
    return true;
  });

}

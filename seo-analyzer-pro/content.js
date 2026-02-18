/* -------------------------------------------
   SEO Analyzer Pro – Content Script
   Production Safe Version
-------------------------------------------- */

(function () {
  'use strict';

  console.log("SEO Analyzer Pro content script ready");

  /* ================= COLLECT SEO DATA ================= */
  function collectSEOData() {
    const seoData = {
      url: window.location.href,
      title: document.title?.trim() || '',
      metaDescription: '',
      h1: [],
      h2: [],
      canonical: false,
      canonicalUrl: '',
      robots: '',
      viewport: '',
      charset: '',
      og: {}
    };

    // META TAGS
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name')?.toLowerCase();
      const property = meta.getAttribute('property')?.toLowerCase();
      const content = meta.getAttribute('content')?.trim() || '';

      if (name === 'description') seoData.metaDescription = content;
      if (name === 'robots') seoData.robots = content;
      if (name === 'viewport') seoData.viewport = content;

      // charset fix (meta charset="utf-8")
      if (meta.getAttribute('charset')) {
        seoData.charset = meta.getAttribute('charset');
      }

      if (property?.startsWith('og:')) {
        const key = property.replace('og:', '');
        seoData.og[key] = content;
      }
    });

    // CANONICAL
    const canonicalEl = document.querySelector("link[rel='canonical']");
    if (canonicalEl?.href) {
      seoData.canonical = true;
      seoData.canonicalUrl = canonicalEl.href;
    }

    // HEADINGS
    document.querySelectorAll('h1').forEach(h => {
      const text = h.textContent?.trim();
      if (text) seoData.h1.push(text);
    });

    document.querySelectorAll('h2').forEach(h => {
      const text = h.textContent?.trim();
      if (text) seoData.h2.push(text);
    });

    console.log("SEO collected:", seoData);
    return seoData;
  }

  /* ================= QUICK CHECKS ================= */
  function quickHeadings() {
    const h1 = Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).filter(Boolean);
    const h2 = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).filter(Boolean);
    return { h1, h2 };
  }

  function quickMeta() {
    let title = document.title?.trim() || '';
    let metaDescription = '';

    const meta = document.querySelector('meta[name="description"]');
    if (meta) metaDescription = meta.getAttribute('content')?.trim() || '';

    return { title, metaDescription };
  }

  /* ================= MESSAGE LISTENER ================= */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    try {
      if (!message || !message.type) return;

      switch (message.type) {

        case 'GET_SEO_DATA':
          sendResponse(collectSEOData());
          break;

        case 'QUICK_HEADINGS':
          sendResponse(quickHeadings());
          break;

        case 'QUICK_META':
          sendResponse(quickMeta());
          break;

        default:
          sendResponse({ error: "Unknown request" });
      }

    } catch (err) {
      console.error("SEO Analyzer error:", err);
      sendResponse({ error: "Analysis failed" });
    }

    return true;
  });

})();

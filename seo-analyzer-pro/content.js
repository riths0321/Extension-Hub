/* =====================================================
   content.js – SEO Analyzer Pro v4.0 (UPDATED)
   Added: All Links, All Metas, All Scripts, XFN/Rel Tags
===================================================== */
(function () {
  'use strict';

  function collectFullSEO() {
    const data = {
      url:             window.location.href,
      urlPath:         window.location.pathname || '/',
      urlHash:         window.location.hash || '',
      anchorText:      '',
      title:           '',
      metaDescription: '',
      robots:          '',
      viewport:        '',
      charset:         '',
      canonical:       '',
      hreflang:        [],
      headings:        { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      images:          { total: 0, missingAlt: [], emptyAlt: [], withAlt: 0, decorative: 0, withoutTitle: 0, list: [] },
      links:           { internal: [], external: [], total: 0, totalCount: 0, uniqueCount: 0, allLinks: [] },
      og:              {},
      twitter:         {},
      schema:          [],
      performance:     {},
      indexability:    {},
      wordCount:       0,
    };

    /* ---- URL anchor text ---- */
    if (data.urlHash) {
      let anchorId = data.urlHash.slice(1);
      try {
        anchorId = decodeURIComponent(anchorId);
      } catch (_e) {
        // Keep raw hash if malformed encoding is present.
      }
      const anchorEl = document.getElementById(anchorId) || document.querySelector(`a[name="${anchorId}"]`);
      if (anchorEl) {
        data.anchorText = (anchorEl.textContent || anchorEl.getAttribute('aria-label') || '').trim().slice(0, 160);
      }
    }

    /* ---- TITLE ---- */
    data.title = (document.title || '').trim();

    /* ---- META TAGS (original) ---- */
    document.querySelectorAll('meta').forEach(m => {
      const name    = (m.getAttribute('name') || '').toLowerCase();
      const prop    = (m.getAttribute('property') || '').toLowerCase();
      const content = (m.getAttribute('content') || '').trim();
      const charset = m.getAttribute('charset');
      const httpEq  = (m.getAttribute('http-equiv') || '').toLowerCase();

      if (name === 'description')      data.metaDescription = content;
      if (name === 'robots')           data.robots = content;
      if (name === 'googlebot')        data.indexability.googlebot = content;
      if (name === 'viewport')         data.viewport = content;
      if (name === 'keywords')         data.keywords = content;
      if (name === 'author')           data.author = content;
      if (name === 'publisher')        data.publisher = content;
      if (charset)                     data.charset = charset;
      if (httpEq === 'content-type' && content.includes('charset=')) {
        data.charset = data.charset || content.split('charset=')[1];
      }
      if (name === 'twitter:card')        data.twitter.card = content;
      if (name === 'twitter:title')       data.twitter.title = content;
      if (name === 'twitter:description') data.twitter.description = content;
      if (name === 'twitter:image')       data.twitter.image = content;
      if (name === 'twitter:site')        data.twitter.site = content;
      if (name === 'twitter:creator')     data.twitter.creator = content;
      if (prop.startsWith('og:')) {
        const key = prop.replace('og:', '');
        data.og[key] = content;
      }
      if (prop.startsWith('article:')) {
        data.og['_' + prop] = content;
      }
    });

    /* ---- PUBLISHER fallback from OG ---- */
    if (!data.publisher && data.og['site_name']) data.publisher = data.og['site_name'];

    /* ---- CHARSET fallback ---- */
    if (!data.charset) {
      const charsetMeta = document.querySelector('meta[charset]');
      if (charsetMeta) data.charset = charsetMeta.getAttribute('charset');
    }

    /* ---- CANONICAL ---- */
    const canon = document.querySelector("link[rel='canonical']");
    data.canonical = canon ? canon.href : '';

    /* ---- HREFLANG ---- */
    document.querySelectorAll("link[rel='alternate'][hreflang]").forEach(l => {
      data.hreflang.push({ lang: l.getAttribute('hreflang'), href: l.href });
    });

    /* ---- HEADINGS H1-H6 ---- */
    ['h1','h2','h3','h4','h5','h6'].forEach(tag => {
      data.headings[tag] = Array.from(document.querySelectorAll(tag))
        .map(el => el.textContent.trim()).filter(Boolean);
    });

    /* ---- WORD COUNT ---- */
    try {
      const bodyText = document.body ? document.body.innerText || '' : '';
      const words = bodyText.split(/\s+/).filter(w => w.length > 1);
      data.wordCount = words.length;
    } catch (e) {}

    /* ---- IMAGES ---- */
    const imgs = document.querySelectorAll('img');
    data.images.total = imgs.length;
    imgs.forEach(img => {
      const src      = img.currentSrc || img.getAttribute('src') || '';
      const alt      = img.getAttribute('alt');
      const title    = img.getAttribute('title') || '';
      const role     = img.getAttribute('role') || '';
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      const fileName = (src.split('/').pop().split('?')[0] || src).slice(0, 80);

      if (!title) data.images.withoutTitle++;

      if (data.images.list.length < 40) {
        data.images.list.push({ src, fileName, alt, title, w, h });
      }

      if (role === 'presentation' || alt === '') {
        if (alt === '' && role !== 'presentation') {
          data.images.emptyAlt.push({ src, w, h });
        } else {
          data.images.decorative++;
          data.images.withAlt++;
        }
      } else if (alt === null) {
        data.images.missingAlt.push({ src, w, h });
      } else {
        data.images.withAlt++;
      }
    });

    /* ---- LINKS ---- */
    const origin    = window.location.origin;
    const seenHrefs = new Set();
    let   rawTotal  = 0;

    document.querySelectorAll('a[href]').forEach(a => {
      rawTotal++;
      const href      = a.href;
      const rawHref   = a.getAttribute('href') || '';
      const linkTitle = a.getAttribute('title') || '';

      if (!href) return;
      if (seenHrefs.has(href)) return;
      seenHrefs.add(href);

      const anchor = (a.textContent || '').trim().slice(0, 80);
      const rel    = (a.getAttribute('rel') || '');
      const target = (a.getAttribute('target') || '');
      const isInt  = href.startsWith(origin) || rawHref.startsWith('/');

      data.links.allLinks.push({ href: href.slice(0, 500), anchor, title: linkTitle, isInternal: isInt });

      if (isInt) {
        data.links.internal.push({ href: href.slice(0, 500), anchor, rel, target });
      } else {
        data.links.external.push({
          href: href.slice(0, 500), anchor,
          nofollow: rel.includes('nofollow'), sponsored: rel.includes('sponsored'),
          ugc: rel.includes('ugc'), newTab: target === '_blank'
        });
      }
    });

    data.links.totalCount          = rawTotal;
    data.links.uniqueCount         = seenHrefs.size;
    data.links.total               = data.links.internal.length + data.links.external.length;

    /* ---- SCHEMA (JSON-LD) ---- */
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const json  = JSON.parse(s.textContent);
        const types = [];
        const extract = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj['@type']) {
            const t = Array.isArray(obj['@type']) ? obj['@type'].join(', ') : obj['@type'];
            types.push(t);
          }
          if (Array.isArray(obj['@graph'])) obj['@graph'].forEach(extract);
          if (Array.isArray(obj['@list']))  obj['@list'].forEach(extract);
        };
        extract(json);
        if (types.length) data.schema.push(...types);
      } catch (e) {}
    });
    data.schema = [...new Set(data.schema)];

    const microdata = [];
    document.querySelectorAll('[itemtype]').forEach(el => {
      const type = el.getAttribute('itemtype') || '';
      if (type.includes('schema.org')) {
        const short = type.split('/').pop();
        if (short) microdata.push(short);
      }
    });
    if (microdata.length) {
      data.schema = [...new Set([...data.schema, ...microdata])];
    }

    /* ---- PERFORMANCE ---- */
    data.performance.domNodes      = document.querySelectorAll('*').length;
    data.performance.scripts       = document.querySelectorAll('script').length;
    data.performance.stylesheets   = document.querySelectorAll('link[rel="stylesheet"]').length;
    data.performance.inlineStyles  = document.querySelectorAll('[style]').length;
    data.performance.iframes       = document.querySelectorAll('iframe').length;
    data.performance.lazyImages    = document.querySelectorAll('img[loading="lazy"]').length;
    try {
      const entries = performance.getEntriesByType('resource');
      let totalBytes = 0;
      entries.forEach(e => { if (e.transferSize) totalBytes += e.transferSize; });
      data.performance.estimatedWeight = totalBytes > 0 ? Math.round(totalBytes / 1024) : null;
      data.performance.resourceCount   = entries.length;
    } catch(e) {
      data.performance.estimatedWeight = null;
      data.performance.resourceCount   = null;
    }

    /* ---- INDEXABILITY ---- */
    const robotsVal    = (data.robots || '').toLowerCase();
    const googlebotVal = (data.indexability.googlebot || '').toLowerCase();
    data.indexability.noindex     = robotsVal.includes('noindex') || googlebotVal.includes('noindex');
    data.indexability.hasViewport = !!data.viewport;
    data.indexability.hasCharset  = !!data.charset;
    data.indexability.isHttps     = window.location.protocol === 'https:';
    data.indexability.lang        = document.documentElement.getAttribute('lang') || '';
    data.indexability.dir         = document.documentElement.getAttribute('dir') || '';

    /* ---- ROBOTS & SITEMAP URLs ---- */
    try {
      const orig = new URL(data.url).origin;
      data.robotsTxtUrl  = orig + '/robots.txt';
      data.sitemapXmlUrl = orig + '/sitemap.xml';
    } catch(e) {}

    return data;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    try {
      if (message.type === 'GET_FULL_SEO') sendResponse(collectFullSEO());
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return true;
  });

})();

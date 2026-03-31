// content.js — U-Scraper Deep Content Script v2.0
(() => {
  if (window.__uScraperContentLoaded) return;
  window.__uScraperContentLoaded = true;

  const CONFIG = {
    SCROLL_DELAY: 300,
    MAX_SCROLLS: 20,
    MIN_TEXT_LENGTH: 3,
    TIMEOUT: 20000,
    MAX_PARAGRAPHS: 1000,
    MAX_HEADINGS: 500,
    MAX_VIDEOS: 100,
    MAX_AUDIOS: 50,
    MAX_TABLES: 20,
    MAX_FORMS: 50,
    MAX_EMAILS: 100,
    EMAIL_SCAN_TEXT_LIMIT: 500000,
    IDLE_WAIT_MS: 2000,
    SPA_MUTATION_WAIT: 1500
  };

  let state = {
    isScraping: false,
    scrolledCount: 0,
    activeIntervals: [],
    activeTimeouts: []
  };

  // ── Utilities ───────────────────────────────────────────────────────────────
  const getText = (el) => {
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value || '';
    if (el.tagName === 'IMG') return el.alt || '';
    return (el.innerText || el.textContent || '')
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const isVisible = (el) => {
    if (!el) return false;
    if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) return false;
    if (el.hasAttribute('hidden')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight * 2;
  };

  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    try { return new URL(url, window.location.href).href; } catch { return url; }
  };

  const reportProgress = (step, percent) => {
    chrome.runtime.sendMessage({
      action: 'scrapingProgress',
      progress: { current: percent, total: 100, step }
    }).catch(() => {});
  };

  // ── SPA: Wait for network/DOM idle ─────────────────────────────────────────
  async function waitForIdle(timeoutMs = CONFIG.IDLE_WAIT_MS) {
    return new Promise((resolve) => {
      let timer;
      let observer;

      const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          observer?.disconnect();
          resolve();
        }, timeoutMs);
      };

      // Watch DOM mutations
      observer = new MutationObserver(reset);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });

      reset();

      // Hard timeout
      setTimeout(() => {
        observer?.disconnect();
        clearTimeout(timer);
        resolve();
      }, timeoutMs * 4);
    });
  }

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  async function autoScroll() {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      let scrolls = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrolls++;

        if (totalHeight >= scrollHeight || scrolls >= CONFIG.MAX_SCROLLS) {
          clearInterval(timer);
          const idx = state.activeIntervals.indexOf(timer);
          if (idx > -1) state.activeIntervals.splice(idx, 1);
          window.scrollTo(0, 0);
          resolve();
        }
      }, CONFIG.SCROLL_DELAY);

      state.activeIntervals.push(timer);
    });
  }

  // ── Pagination Detection ────────────────────────────────────────────────────
  function detectNextPage() {
    const selectors = [
      'a[rel="next"]',
      'a[aria-label="Next page"]',
      'a[aria-label="Next"]',
      '.next a', '.pagination .next a',
      '.pager-next a', '#next-page',
      'a.next', 'a.next-page',
      '[data-testid="pagination-next"]',
      'button[aria-label="Next"]',
      'a:contains("Next")', // handled below
    ];

    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) {
          const href = el.href || el.getAttribute('href');
          if (href && href !== '#' && href !== window.location.href) {
            return getAbsoluteUrl(href);
          }
        }
      } catch {}
    }

    // Text-based search
    const allLinks = Array.from(document.querySelectorAll('a'));
    const nextLink = allLinks.find(a => {
      const txt = a.textContent.trim().toLowerCase();
      return (txt === 'next' || txt === 'next page' || txt === '›' || txt === '»') &&
        isVisible(a) && a.href && a.href !== window.location.href;
    });
    if (nextLink) return getAbsoluteUrl(nextLink.href);

    return null;
  }

  // ── Data Cleaning & Deduplication ──────────────────────────────────────────
  function cleanText(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/\s+/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .normalize('NFC')
      .trim();
  }

  function deduplicateArray(arr) {
    const seen = new Set();
    return arr.filter(item => {
      const key = typeof item === 'object' ? JSON.stringify(item) : item;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function cleanAndNormalize(data) {
    if (Array.isArray(data)) {
      return deduplicateArray(data.map(item => {
        if (typeof item === 'object' && item !== null) {
          const cleaned = {};
          for (const [k, v] of Object.entries(item)) {
            cleaned[k] = Array.isArray(v) ? cleanAndNormalize(v)
              : typeof v === 'string' ? cleanText(v)
              : v;
          }
          return cleaned;
        }
        return typeof item === 'string' ? cleanText(item) : item;
      }));
    }
    return data;
  }

  // ── Extractors ─────────────────────────────────────────────────────────────
  const Extractors = {
    metadata: (doc) => {
      const meta = {
        title: doc.title,
        url: window.location.href,
        domain: window.location.hostname,
        description: '',
        keywords: [],
        author: '',
        openGraph: {},
        twitter: {},
        jsonLd: []
      };

      const descEl = doc.querySelector('meta[name="description"]');
      if (descEl) meta.description = descEl.content;

      const keywordsEl = doc.querySelector('meta[name="keywords"]');
      if (keywordsEl) meta.keywords = keywordsEl.content.split(',').map(k => k.trim());

      const authorEl = doc.querySelector('meta[name="author"]');
      if (authorEl) meta.author = authorEl.content;

      doc.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(tag => {
        const key = tag.getAttribute('property') || tag.getAttribute('name');
        const value = tag.getAttribute('content');
        if (key && value) {
          if (key.startsWith('og:')) meta.openGraph[key.replace('og:', '')] = value;
          if (key.startsWith('twitter:')) meta.twitter[key.replace('twitter:', '')] = value;
        }
      });

      doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try { meta.jsonLd.push(JSON.parse(script.textContent)); } catch {}
      });

      return meta;
    },

    content: (doc) => {
      const candidates = ['article', 'main', '[role="main"]', '#content', '.content', '.post', '.article'];
      let mainEl = null;
      for (const sel of candidates) {
        const el = doc.querySelector(sel);
        if (el && isVisible(el) && (el.innerText || '').length > 200) { mainEl = el; break; }
      }
      const target = mainEl || doc.body;

      const paragraphs = deduplicateArray(
        Array.from(target.querySelectorAll('p'))
          .filter(p => isVisible(p))
          .map(p => cleanText(getText(p)))
          .filter(t => t.length > CONFIG.MIN_TEXT_LENGTH)
          .slice(0, CONFIG.MAX_PARAGRAPHS)
      );

      const headings = Array.from(target.querySelectorAll('h1,h2,h3,h4,h5,h6'))
        .filter(h => isVisible(h))
        .map(h => ({ tag: h.tagName.toLowerCase(), text: cleanText(getText(h)) }))
        .slice(0, CONFIG.MAX_HEADINGS);

      return {
        hasMainContainer: !!mainEl,
        headings,
        paragraphs,
        fullText: cleanText(getText(target)).substring(0, 50000)
      };
    },

    links: (doc) => {
      const origin = window.location.origin;
      const internal = new Set(), external = new Set(), social = new Set();
      const emails = new Set(), phones = new Set();
      const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'pinterest.com', 'tiktok.com', 'reddit.com'];

      Array.from(doc.querySelectorAll('a[href]')).forEach(a => {
        const href = a.href.trim();
        if (!href || href.startsWith('javascript:')) return;
        if (href.startsWith('mailto:')) { emails.add(href.replace('mailto:', '')); return; }
        if (href.startsWith('tel:')) { phones.add(href.replace('tel:', '')); return; }
        try {
          const u = new URL(href);
          if (socialDomains.some(d => u.hostname.includes(d))) social.add(href);
          else if (u.origin === origin) internal.add(href);
          else external.add(href);
        } catch {}
      });

      const bodyText = doc.body.innerText || '';
      if (bodyText.length < CONFIG.EMAIL_SCAN_TEXT_LIMIT) {
        const found = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        found.slice(0, CONFIG.MAX_EMAILS).forEach(e => emails.add(e));
      }

      return {
        internal: Array.from(internal).slice(0, 500),
        external: Array.from(external).slice(0, 500),
        social: Array.from(social),
        emails: Array.from(emails),
        phones: Array.from(phones)
      };
    },

    media: (doc) => {
      const images = Array.from(doc.querySelectorAll('img'))
        .filter(img => isVisible(img) && img.naturalWidth > 50)
        .map(img => ({
          src: getAbsoluteUrl(img.currentSrc || img.src || img.dataset.src || img.dataset.lazySrc || ''),
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight
        })).slice(0, 100);

      const videos = Array.from(doc.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]'))
        .map(v => ({ src: getAbsoluteUrl(v.src || v.currentSrc || ''), type: v.tagName.toLowerCase() }))
        .slice(0, CONFIG.MAX_VIDEOS);

      const audios = Array.from(doc.querySelectorAll('audio'))
        .map(a => ({ src: getAbsoluteUrl(a.src || a.currentSrc || '') }))
        .slice(0, CONFIG.MAX_AUDIOS);

      return { images, videos, audios };
    },

    tables: (doc) => {
      return Array.from(doc.querySelectorAll('table'))
        .slice(0, CONFIG.MAX_TABLES)
        .map(table =>
          Array.from(table.querySelectorAll('tr'))
            .map(row => Array.from(row.querySelectorAll('td,th')).map(cell => cleanText(getText(cell))))
            .filter(row => row.some(c => c))
        ).filter(t => t.length > 0);
    },

    forms: (doc) => {
      return Array.from(doc.querySelectorAll('form'))
        .slice(0, CONFIG.MAX_FORMS)
        .map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input,select,textarea')).map(inp => ({
            name: inp.name || inp.id,
            type: inp.type,
            placeholder: inp.placeholder,
            required: inp.required
          }))
        }));
    },

    // ── Custom field extraction from user-defined selectors ─────────────────
    customFields: (doc, fieldDefs) => {
      if (!fieldDefs || fieldDefs.length === 0) return {};
      const results = {};

      fieldDefs.forEach(field => {
        try {
          const elements = Array.from(doc.querySelectorAll(field.selector));
          const values = elements.map(el => {
            switch (field.type) {
              case 'href': return getAbsoluteUrl(el.getAttribute('href') || '');
              case 'src': return getAbsoluteUrl(el.getAttribute('src') || el.currentSrc || '');
              case 'html': return el.innerHTML.trim();
              case 'attr': return el.getAttribute(field.attribute || 'value') || '';
              default: return cleanText(getText(el));
            }
          }).filter(v => v);

          results[field.name] = field.multiple !== false ? deduplicateArray(values) : values[0] || '';
        } catch (e) {
          results[field.name] = null;
        }
      });

      return results;
    }
  };

  // ── Form-based Scraping ─────────────────────────────────────────────────────
  async function fillAndSubmitForm(formConfig) {
    const form = formConfig.selector
      ? document.querySelector(formConfig.selector)
      : document.querySelector('form');

    if (!form) throw new Error('Form not found');

    for (const [fieldName, value] of Object.entries(formConfig.values || {})) {
      const el = form.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
      if (el) {
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    await new Promise(r => setTimeout(r, 300));

    if (formConfig.submit !== false) {
      const submitBtn = form.querySelector('[type="submit"], button:not([type]), input[type="submit"]');
      if (submitBtn) submitBtn.click();
      else form.submit();
    }
  }

  function pauseAutoChangingSlides() {
    try {
      const style = document.createElement('style');
      style.id = '__uscraper-pause-motion';
      style.textContent = `
        *,
        *::before,
        *::after {
          animation-play-state: paused !important;
          transition-property: none !important;
          scroll-behavior: auto !important;
        }
        video {
          animation-play-state: paused !important;
        }
      `;
      if (!document.getElementById(style.id)) {
        document.documentElement.appendChild(style);
      }
    } catch {}

    try {
      document.querySelectorAll('video').forEach((video) => {
        if (!video.paused) video.pause();
      });
    } catch {}

    try {
      if (window.swiper && Array.isArray(window.swiper)) {
        window.swiper.forEach(instance => instance?.autoplay?.stop?.());
      } else if (window.swiper?.autoplay?.stop) {
        window.swiper.autoplay.stop();
      }
    } catch {}

    try {
      document.querySelectorAll('.swiper, .slick-slider, .glide, .splide, [class*="slider"], [class*="carousel"]').forEach((el) => {
        el.dispatchEvent(new Event('mouseenter', { bubbles: true }));
      });
    } catch {}
  }

  // ── Main Scrape ─────────────────────────────────────────────────────────────
  async function performDeepScrape(settings = {}) {
    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => reject(new Error('Scraping timeout after 20s')), CONFIG.TIMEOUT);
      state.activeTimeouts.push(id);
    });

    const scrapePromise = (async () => {
      reportProgress('Initializing', 5);
      pauseAutoChangingSlides();

      // SPA idle wait
      if (settings.waitIdle) {
        reportProgress('Waiting for page to settle', 15);
        await waitForIdle(CONFIG.SPA_MUTATION_WAIT);
      }

      // Auto-scroll for lazy loaded content
      if (settings.autoscroll) {
        reportProgress('Auto-scrolling for lazy content', 25);
        await autoScroll();
        if (settings.waitIdle) await waitForIdle(500);
      }

      reportProgress('Extracting data', 45);
      const doc = document;

      // Handle form submission if configured
      if (settings.formConfig) {
        reportProgress('Filling form', 35);
        await fillAndSubmitForm(settings.formConfig);
        await waitForIdle(CONFIG.SPA_MUTATION_WAIT);
      }

      // Run all extractors
      const data = {
        ...Extractors.metadata(doc),
        ...Extractors.content(doc),
        links: Extractors.links(doc),
        ...Extractors.media(doc),
        tables: Extractors.tables(doc),
        forms: Extractors.forms(doc),
        scrapedAt: new Date().toISOString(),
        scrapeDuration: 0
      };

      // Custom field extraction
      if (settings.customFields && settings.customFields.length > 0) {
        reportProgress('Extracting custom fields', 65);
        data.customFields = Extractors.customFields(doc, settings.customFields);
      }

      // Detect next page URL
      data.nextPageUrl = detectNextPage();

      reportProgress('Cleaning data', 80);

      // Clean and normalize
      data.paragraphs = cleanAndNormalize(data.paragraphs);
      data.headings = cleanAndNormalize(data.headings);
      if (data.links) {
        data.links.internal = deduplicateArray(data.links.internal);
        data.links.external = deduplicateArray(data.links.external);
        data.links.emails = deduplicateArray(data.links.emails);
      }

      reportProgress('Complete', 100);
      return data;
    })();

    return Promise.race([scrapePromise, timeoutPromise]);
  }

  // ── Visual Selector ────────────────────────────────────────────────────────
  function startVisualSelector() {
    if (window.__uScraperSelectorActive) return;
    window.__uScraperSelectorActive = true;

    let hoveredEl = null;
    const selectedFields = [];

    const overlay = document.createElement('div');
    overlay.id = '__uscraper-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 2147483646; pointer-events: none;
    `;

    const highlight = document.createElement('div');
    highlight.id = '__uscraper-highlight';
    highlight.style.cssText = `
      position: fixed; pointer-events: none;
      background: rgba(0, 137, 123, 0.12);
      border: 2px solid #00897b;
      border-radius: 3px;
      transition: all 0.08s ease;
      z-index: 2147483645;
      display: none;
    `;

    const tooltip = document.createElement('div');
    tooltip.id = '__uscraper-tooltip';
    tooltip.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #1a1a2e; color: #fff; font-family: monospace;
      font-size: 12px; padding: 10px 16px; border-radius: 8px;
      max-width: 600px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      z-index: 2147483647; pointer-events: none; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 1px solid rgba(0, 137, 123, 0.5);
    `;

    const toolbar = document.createElement('div');
    toolbar.id = '__uscraper-toolbar';
    toolbar.style.cssText = `
      position: fixed; top: 16px; right: 16px;
      background: #1a1a2e; color: #fff; border-radius: 10px;
      padding: 12px 16px; z-index: 2147483647; font-family: sans-serif;
      font-size: 13px; display: flex; flex-direction: column; gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5); min-width: 240px;
      border: 1px solid rgba(0,137,123,0.4);
    `;
    toolbar.innerHTML = `
      <div style="font-weight:700;color:#4db6ac;margin-bottom:4px;font-size:14px;">
        🎯 U-Scraper Element Picker
      </div>
      <div style="color:#aaa;font-size:12px;">Click any element to capture its selector</div>
      <div style="color:#aaa;font-size:12px;border-top:1px solid #333;padding-top:8px;">
        <span id="__uscraper-count" style="color:#4db6ac;font-weight:700;">0</span> fields selected
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button id="__uscraper-done" style="flex:1;padding:6px;background:#00897b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Done</button>
        <button id="__uscraper-cancel" style="flex:1;padding:6px;background:#333;color:#aaa;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Cancel</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(tooltip);
    document.body.appendChild(toolbar);

    const generateCSSSelector = (el) => {
      if (!el || el === document.body) return 'body';
      if (el.id && !el.id.includes(' ')) return `#${CSS.escape(el.id)}`;

      const parts = [];
      let current = el;

      while (current && current !== document.body) {
        let part = current.tagName.toLowerCase();

        if (current.classList.length > 0) {
          const classes = Array.from(current.classList)
            .filter(c => !c.startsWith('__uscraper'))
            .slice(0, 2)
            .map(c => `.${CSS.escape(c)}`)
            .join('');
          if (classes) {
            const testSel = parts.length > 0
              ? `${part}${classes} ${parts.join(' > ')}`
              : `${part}${classes}`;
            if (document.querySelectorAll(testSel).length === 1) return testSel;
            part += classes;
          }
        }

        const siblings = Array.from(current.parentElement?.children || [])
          .filter(s => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += `:nth-child(${idx})`;
        }

        parts.unshift(part);
        current = current.parentElement;

        const testSel = parts.join(' > ');
        if (document.querySelectorAll(testSel).length === 1) return testSel;
      }

      return parts.join(' > ');
    };

    const generateXPath = (el) => {
      if (el.id) return `//*[@id="${el.id}"]`;

      const parts = [];
      let current = el;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let part = current.tagName.toLowerCase();
        const siblings = Array.from(current.parentElement?.children || [])
          .filter(s => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += `[${idx}]`;
        }
        parts.unshift(part);
        current = current.parentElement;
      }

      return `/${parts.join('/')}`;
    };

    const countMatches = (selector) => {
      try {
        return document.querySelectorAll(selector).length;
      } catch {
        return 0;
      }
    };

    const extractSample = (el) => {
      if (el.tagName === 'IMG') return el.alt || el.src?.split('/').pop() || '';
      if (el.tagName === 'A') return el.href || el.textContent?.trim() || '';
      return el.textContent?.trim().substring(0, 80) || '';
    };

    const finish = (cancelled = false) => {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      overlay.remove();
      highlight.remove();
      tooltip.remove();
      toolbar.remove();
      window.__uScraperSelectorActive = false;

      chrome.runtime.sendMessage({
        action: 'selectorDone',
        cancelled,
        fields: cancelled ? [] : selectedFields
      }).catch(() => {});
    };

    const onMouseMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el.id?.startsWith('__uscraper') || el.closest('[id^="__uscraper"]')) return;

      if (el !== hoveredEl) {
        hoveredEl = el;
        const rect = el.getBoundingClientRect();
        highlight.style.cssText += `
          display: block;
          top: ${rect.top}px; left: ${rect.left}px;
          width: ${rect.width}px; height: ${rect.height}px;
        `;
        const sel = generateCSSSelector(el);
        const matches = countMatches(sel);
        const sample = extractSample(el);
        tooltip.textContent = `${sel}  ·  ${matches} match${matches !== 1 ? 'es' : ''}  ·  "${sample}"`;
      }
    };

    const onClick = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el.id?.startsWith('__uscraper') || el.closest('[id^="__uscraper"]')) return;

      e.preventDefault();
      e.stopPropagation();

      const cssSelector = generateCSSSelector(el);
      const xpath = generateXPath(el);
      const matches = countMatches(cssSelector);
      const sample = extractSample(el);
      const tagName = el.tagName.toLowerCase();

      let fieldType = 'text';
      if (tagName === 'img') fieldType = 'src';
      else if (tagName === 'a') fieldType = 'href';

      selectedFields.push({
        name: `field_${selectedFields.length + 1}`,
        selector: cssSelector,
        xpath,
        type: fieldType,
        matches,
        sample,
        tag: tagName
      });
      document.getElementById('__uscraper-count').textContent = selectedFields.length;

      highlight.style.background = 'rgba(0, 200, 150, 0.25)';
      highlight.style.border = '2px solid #00c853';
      setTimeout(() => {
        highlight.style.background = 'rgba(0, 137, 123, 0.12)';
        highlight.style.border = '2px solid #00897b';
      }, 400);
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') finish(true);
    };

    document.getElementById('__uscraper-done').addEventListener('click', () => finish(false));
    document.getElementById('__uscraper-cancel').addEventListener('click', () => finish(true));
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeydown, true);
  }

  // ── Message Listener ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'alive' });
      return;
    }

    if (request.action === 'startScraping') {
      if (state.isScraping) { sendResponse({ error: 'Already scraping' }); return; }
      state.isScraping = true;
      const startTime = Date.now();

      performDeepScrape(request.settings || {})
        .then(data => {
          data.scrapeDuration = Date.now() - startTime;
          state.isScraping = false;
          sendResponse({ success: true, data: [data] });
        })
        .catch(err => {
          state.isScraping = false;
          sendResponse({ success: false, error: err.message });
        });

      return true;
    }

    if (request.action === 'stopScraping') {
      state.isScraping = false;
      state.activeIntervals.forEach(clearInterval);
      state.activeTimeouts.forEach(clearTimeout);
      state.activeIntervals = [];
      state.activeTimeouts = [];
      sendResponse({ success: true });
    }

    if (request.action === 'getNextPage') {
      sendResponse({ url: detectNextPage() });
    }

    if (request.action === 'startSelector') {
      startVisualSelector();
      sendResponse({ success: true });
    }
  });

  console.log('U-Scraper v2.0: Content script loaded');
})();

/* =====================================================
   Design Token Extractor Pro — content.js
   Full extraction engine: Colors, Typography, Spacing,
   Shadows, WCAG, Components, CSS Vars, Responsive
   ===================================================== */

(function () {
  'use strict';

  // ─── Utility: RGB string → {r,g,b,a} ────────────────────────────────────────
  function parseRgb(str) {
    if (!str || str === 'transparent') return null;
    const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    return null;
  }

  // ─── Utility: rgb → hex ──────────────────────────────────────────────────────
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ─── Utility: Normalise any color → hex ─────────────────────────────────────
  function normalizeColor(val) {
    if (!val || val === 'transparent' || val === 'none') return null;
    const rgb = parseRgb(val);
    if (rgb) {
      if (rgb.a < 0.05) return null; // effectively transparent
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    // Already hex / keyword — return as-is trimmed
    const t = val.trim().toLowerCase();
    if (t.startsWith('#') || /^[a-z]+$/.test(t)) return t;
    return null;
  }

  // ─── Utility: px → rem ──────────────────────────────────────────────────────
  function pxToRem(px) {
    const n = parseFloat(px);
    if (isNaN(n)) return px;
    return (n / 16).toFixed(4).replace(/\.?0+$/, '') + 'rem';
  }

  // ─── Utility: relative luminance (WCAG) ─────────────────────────────────────
  function luminance(r, g, b) {
    const chan = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  function contrastRatio(hex1, hex2) {
    const toRgb = h => {
      const v = h.replace('#', '');
      const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
      return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16)
      ];
    };
    const [r1, g1, b1] = toRgb(hex1);
    const [r2, g2, b2] = toRgb(hex2);
    const L1 = luminance(r1, g1, b1);
    const L2 = luminance(r2, g2, b2);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
  }

  // ─── Utility: color brightness (0-255) ──────────────────────────────────────
  function colorBrightness(hex) {
    const v = hex.replace('#', '');
    const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // ─── Utility: guess color role ───────────────────────────────────────────────
  function guessColorGroup(hex) {
    const b = colorBrightness(hex);
    const v = hex.replace('#', '');
    const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const bl = parseInt(full.slice(4, 6), 16);
    if (b > 230) return 'neutral';
    if (b < 40) return 'neutral';
    const maxC = Math.max(r, g, bl);
    const minC = Math.min(r, g, bl);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    if (sat < 0.15) return 'neutral';
    if (r > g && r > bl) return r - Math.max(g, bl) > 60 ? 'danger' : 'primary';
    if (g > r && g > bl) return 'success';
    if (bl > r && bl > g) return 'primary';
    if (r > 180 && g > 100 && bl < 80) return 'warning';
    return 'secondary';
  }

  // ─── Main Extractor ──────────────────────────────────────────────────────────
  class DesignTokenExtractorPro {
    constructor() {
      this._cache = null;
    }

    extractAll() {
      if (this._cache) return this._cache;
      const result = {
        colors: this.extractColors(),
        typography: this.extractTypography(),
        spacing: this.extractSpacing(),
        shadows: this.extractShadows(),
        wcag: this.extractWCAG(),
        components: this.extractComponents(),
        cssVars: this.extractCSSVars(),
        gradients: this.extractGradients(),
        responsive: this.extractResponsive(),
        designScore: null
      };
      result.designScore = this.computeDesignScore(result);
      this._cache = result;
      return result;
    }

    // ── Colors ──────────────────────────────────────────────────────────────────
    extractColors() {
      const seen = new Map(); // hex → {count, sources}

      const addColor = (hex, source) => {
        if (!hex) return;
        const k = hex.toLowerCase();
        if (!seen.has(k)) seen.set(k, { value: k, count: 0, sources: new Set() });
        const e = seen.get(k);
        e.count++;
        e.sources.add(source);
      };

      // From stylesheets
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (!rule.style) continue;
            const props = ['color', 'background-color', 'border-color',
              'border-top-color', 'border-right-color', 'border-bottom-color',
              'border-left-color', 'outline-color', 'fill', 'stroke'];
            for (const p of props) {
              const h = normalizeColor(rule.style.getPropertyValue(p));
              if (h) addColor(h, p);
            }
          }
        } catch (_) { /* cross-origin */ }
      }

      // From computed styles of sampled elements
      const els = Array.from(document.querySelectorAll('body *')).slice(0, 200);
      for (const el of els) {
        try {
          const cs = window.getComputedStyle(el);
          const h1 = normalizeColor(cs.color);
          const h2 = normalizeColor(cs.backgroundColor);
          const h3 = normalizeColor(cs.borderColor);
          if (h1) addColor(h1, 'color');
          if (h2) addColor(h2, 'background');
          if (h3) addColor(h3, 'border');
        } catch (_) { }
      }

      // Sort by usage, deduplicate near-similar
      const arr = Array.from(seen.values())
        .filter(c => c.value !== '#000000' || c.count > 5) // suppress stray blacks
        .sort((a, b) => b.count - a.count)
        .slice(0, 60);

      // Annotate group
      return arr.map(c => ({
        value: c.value,
        hex: c.value,
        usage: c.count > 15 ? 'primary' : c.count > 6 ? 'secondary' : 'accent',
        group: guessColorGroup(c.value),
        sources: Array.from(c.sources),
        count: c.count
      }));
    }

    // ── Typography ───────────────────────────────────────────────────────────────
    extractTypography() {
      const seen = new Map();
      const selectors = 'h1,h2,h3,h4,h5,h6,p,a,button,label,span,li,td,th,.text,.heading,.title,.caption,.label,.body';
      const els = Array.from(document.querySelectorAll(selectors)).slice(0, 120);

      for (const el of els) {
        if (!el.textContent.trim()) continue;
        try {
          const cs = window.getComputedStyle(el);
          const family = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          const size = cs.fontSize;
          const weight = cs.fontWeight;
          const lineH = cs.lineHeight;
          const letterS = cs.letterSpacing;
          const key = `${family}|${size}|${weight}`;
          if (!seen.has(key)) {
            seen.set(key, {
              family,
              size,
              sizeRem: pxToRem(size),
              weight,
              lineHeight: lineH,
              letterSpacing: letterS,
              element: el.tagName.toLowerCase(),
              sample: el.textContent.trim().slice(0, 40)
            });
          }
        } catch (_) { }
      }

      return Array.from(seen.values())
        .sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
        .slice(0, 25);
    }

    // ── Spacing ──────────────────────────────────────────────────────────────────
    extractSpacing() {
      const seen = new Set();
      const props = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'gap', 'rowGap', 'columnGap'];
      const els = Array.from(document.querySelectorAll('div,section,article,main,header,footer,nav,aside,p,button,input')).slice(0, 100);

      for (const el of els) {
        try {
          const cs = window.getComputedStyle(el);
          for (const p of props) {
            const v = cs[p];
            if (v && v !== '0px' && v !== 'normal' && !v.includes('auto')) {
              seen.add(v);
            }
          }
        } catch (_) { }
      }

      return Array.from(seen)
        .filter(s => parseFloat(s) > 0)
        .map(s => ({ value: s, rem: pxToRem(s), px: parseFloat(s) }))
        .sort((a, b) => a.px - b.px)
        .slice(0, 30);
    }

    // ── Shadows ──────────────────────────────────────────────────────────────────
    extractShadows() {
      const seen = new Set();
      const els = Array.from(document.querySelectorAll('*')).slice(0, 200);

      for (const el of els) {
        try {
          const cs = window.getComputedStyle(el);
          if (cs.boxShadow && cs.boxShadow !== 'none') seen.add(cs.boxShadow);
        } catch (_) { }
      }

      return Array.from(seen).map((s, i) => ({
        value: s,
        label: i === 0 ? 'sm' : i === 1 ? 'md' : i === 2 ? 'lg' : `shadow-${i + 1}`,
        elevation: i + 1
      })).slice(0, 12);
    }

    // ── WCAG ─────────────────────────────────────────────────────────────────────
    extractWCAG() {
      const pairs = [];
      const textEls = Array.from(document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,a,button,label,span,li')).slice(0, 60);

      for (const el of textEls) {
        if (!el.textContent.trim()) continue;
        try {
          const cs = window.getComputedStyle(el);
          const fgHex = normalizeColor(cs.color);
          const bgHex = normalizeColor(cs.backgroundColor) || '#ffffff';
          if (!fgHex || !fgHex.startsWith('#') || !bgHex.startsWith('#')) continue;

          const ratio = contrastRatio(fgHex, bgHex);
          const fs = parseFloat(cs.fontSize);
          const fw = parseFloat(cs.fontWeight);
          const isLarge = fs >= 18 || (fs >= 14 && fw >= 700);
          const aaNormal = ratio >= 4.5;
          const aaLarge = ratio >= 3;
          const aaaNormal = ratio >= 7;
          const aaaLarge = ratio >= 4.5;

          pairs.push({
            fg: fgHex,
            bg: bgHex,
            ratio,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            isLarge,
            aa: isLarge ? aaLarge : aaNormal,
            aaa: isLarge ? aaaLarge : aaaNormal,
            level: aaaNormal ? 'AAA' : aaNormal ? 'AA' : aaLarge ? 'AA Large' : 'FAIL',
            element: el.tagName.toLowerCase(),
            sample: el.textContent.trim().slice(0, 30)
          });
        } catch (_) { }
      }

      // Deduplicate by fg+bg pair
      const dedupMap = new Map();
      for (const p of pairs) {
        const k = p.fg + '|' + p.bg;
        if (!dedupMap.has(k)) dedupMap.set(k, p);
      }

      return Array.from(dedupMap.values())
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 20);
    }

    // ── Components ───────────────────────────────────────────────────────────────
    extractComponents() {
      const components = [];

      // Buttons
      const buttons = Array.from(document.querySelectorAll('button,[role=button],[class*=btn],[class*=button]')).slice(0, 8);
      for (const el of buttons) {
        if (!el.textContent.trim()) continue;
        try {
          const cs = window.getComputedStyle(el);
          components.push({
            type: 'button',
            label: el.textContent.trim().slice(0, 24),
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            borderRadius: cs.borderRadius,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            bg: normalizeColor(cs.backgroundColor),
            color: normalizeColor(cs.color),
            border: cs.border
          });
        } catch (_) { }
      }

      // Cards / panels
      const cards = Array.from(document.querySelectorAll('[class*=card],[class*=panel],[class*=tile],[class*=box]')).slice(0, 6);
      for (const el of cards) {
        try {
          const cs = window.getComputedStyle(el);
          components.push({
            type: 'card',
            label: 'Card',
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            borderRadius: cs.borderRadius,
            bg: normalizeColor(cs.backgroundColor),
            boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
            border: cs.border
          });
        } catch (_) { }
      }

      // Inputs
      const inputs = Array.from(document.querySelectorAll('input[type=text],input[type=email],input[type=search],textarea')).slice(0, 4);
      for (const el of inputs) {
        try {
          const cs = window.getComputedStyle(el);
          components.push({
            type: 'input',
            label: el.placeholder || 'Input',
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            borderRadius: cs.borderRadius,
            fontSize: cs.fontSize,
            bg: normalizeColor(cs.backgroundColor),
            border: cs.border
          });
        } catch (_) { }
      }

      return components;
    }

    // ── CSS Custom Properties ────────────────────────────────────────────────────
    extractCSSVars() {
      const vars = [];
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules || []) {
              if (rule.selectorText === ':root' || rule.selectorText === 'html') {
                const text = rule.cssText;
                const matches = text.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g);
                for (const m of matches) {
                  vars.push({ name: '--' + m[1], value: m[2].trim() });
                }
              }
            }
          } catch (_) { }
        }
      } catch (_) { }

      return vars.slice(0, 60);
    }

    // ── Gradients ────────────────────────────────────────────────────────────────
    extractGradients() {
      const seen = new Set();
      const els = Array.from(document.querySelectorAll('*')).slice(0, 200);
      for (const el of els) {
        try {
          const cs = window.getComputedStyle(el);
          const bg = cs.backgroundImage;
          if (bg && bg.includes('gradient')) seen.add(bg);
        } catch (_) { }
      }
      return Array.from(seen).slice(0, 10);
    }

    // ── Responsive ───────────────────────────────────────────────────────────────
    extractResponsive() {
      const breakpoints = new Set();
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule instanceof CSSMediaRule) {
              const m = rule.media.mediaText;
              const matches = m.matchAll(/(\d+)px/g);
              for (const px of matches) breakpoints.add(+px[1]);
            }
          }
        } catch (_) { }
      }
      return Array.from(breakpoints).sort((a, b) => a - b).map(bp => ({
        value: bp,
        label: bp < 480 ? 'xs' : bp < 768 ? 'sm' : bp < 1024 ? 'md' : bp < 1280 ? 'lg' : 'xl',
        css: `${bp}px`
      }));
    }

    // ── Design Score ─────────────────────────────────────────────────────────────
    computeDesignScore(tokens) {
      let consistency = 100;
      let accessibility = 100;

      // Consistency: too many unique colors hurts
      const colorCount = tokens.colors.length;
      if (colorCount > 30) consistency -= 20;
      else if (colorCount > 20) consistency -= 10;

      // Consistency: too many font sizes
      const fontCount = tokens.typography.length;
      if (fontCount > 15) consistency -= 15;
      else if (fontCount > 8) consistency -= 8;

      // Accessibility: WCAG failures
      const failures = tokens.wcag.filter(w => w.level === 'FAIL').length;
      const total = tokens.wcag.length;
      if (total > 0) {
        const failRate = failures / total;
        accessibility -= Math.round(failRate * 60);
      }

      // CSS vars bonus
      if (tokens.cssVars.length > 5) consistency += 5;

      return {
        consistency: Math.min(100, Math.max(0, consistency)),
        accessibility: Math.min(100, Math.max(0, accessibility)),
        overall: Math.round((Math.min(100, consistency) + Math.min(100, accessibility)) / 2)
      };
    }
  }

  // ─── Inspect Mode ────────────────────────────────────────────────────────────
  let inspectActive = false;
  let inspectTooltip = null;

  function createInspectTooltip() {
    const el = document.createElement('div');
    el.id = '__dte_inspect_tooltip__';
    el.style.cssText = [
      'position:fixed', 'z-index:2147483647', 'pointer-events:none',
      'background:#111827', 'color:#f9fafb', 'border-radius:8px',
      'padding:10px 14px', 'font:600 12px/1.5 system-ui,sans-serif',
      'box-shadow:0 4px 24px rgba(0,0,0,.4)', 'max-width:260px',
      'display:none', 'border:1px solid rgba(255,255,255,.1)'
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function showInspectData(e) {
    if (!inspectActive || !inspectTooltip) return;
    const el = e.target;
    if (el.id === '__dte_inspect_tooltip__') return;
    try {
      const cs = window.getComputedStyle(el);
      inspectTooltip.textContent = '';
      const parts = [
        el.tagName.toLowerCase(),
        'color: ' + (normalizeColor(cs.color) || cs.color),
        'bg: ' + (normalizeColor(cs.backgroundColor) || 'none'),
        'font: ' + cs.fontSize + ' / ' + cs.fontWeight,
        'pad: ' + cs.padding,
        'radius: ' + cs.borderRadius
      ];
      parts.forEach((p, i) => {
        if (i > 0) inspectTooltip.appendChild(document.createElement('br'));
        if (i === 0) {
          const strong = document.createElement('strong');
          strong.textContent = p;
          inspectTooltip.appendChild(strong);
        } else {
          inspectTooltip.appendChild(document.createTextNode(p));
        }
      });
      const x = Math.min(e.clientX + 16, window.innerWidth - 280);
      const y = Math.min(e.clientY + 16, window.innerHeight - 160);
      inspectTooltip.style.left = x + 'px';
      inspectTooltip.style.top = y + 'px';
      inspectTooltip.style.display = 'block';
    } catch (_) { }
  }

  function hideInspect() {
    if (inspectTooltip) inspectTooltip.style.display = 'none';
  }

  // ─── Message Listener ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'extractTokens') {
      try {
        const extractor = new DesignTokenExtractorPro();
        const tokens = extractor.extractAll();
        sendResponse({ success: true, tokens, url: location.href, title: document.title });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (msg.action === 'toggleInspect') {
      inspectActive = msg.enabled;
      if (inspectActive) {
        if (!inspectTooltip) inspectTooltip = createInspectTooltip();
        document.addEventListener('mousemove', showInspectData);
        document.addEventListener('mouseleave', hideInspect);
      } else {
        document.removeEventListener('mousemove', showInspectData);
        document.removeEventListener('mouseleave', hideInspect);
        if (inspectTooltip) inspectTooltip.style.display = 'none';
      }
      sendResponse({ success: true });
      return true;
    }
  });
})();

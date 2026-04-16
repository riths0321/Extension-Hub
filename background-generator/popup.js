
document.addEventListener('DOMContentLoaded', () => {

  // ============================================
  // STATE
  // ============================================

  const state = {
    activeTab: 'gradient',
    gradient: {
      type: 'linear',
      angle: 135,
      colors: ['#2563EB', '#7C3AED', '#EC4899'],
    },
    solid: {
      color: '#2563EB',
      format: 'hex',
    },
    pattern: {
      type: 'dots',
      fg: '#2563EB',
      bg: '#FFFFFF',
      size: 20,
    },
    outputFormat: 'css',
    currentCSS: '',
    history: [],
    saved: [],
  };

  // ============================================
  // GRADIENT PRESETS
  // ============================================

  const GRADIENT_PRESETS = [
    { name: 'Ocean',   value: 'linear-gradient(135deg, #0ea5e9, #2563EB, #4338CA)' },
    { name: 'Sunset',  value: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)' },
    { name: 'Forest',  value: 'linear-gradient(135deg, #10b981, #059669, #0d9488)' },
    { name: 'Flame',   value: 'linear-gradient(135deg, #ef4444, #f97316, #eab308)' },
    { name: 'Night',   value: 'linear-gradient(135deg, #0f172a, #1e1b4b, #1e3a5f)' },
    { name: 'Rose',    value: 'linear-gradient(135deg, #fda4af, #f9a8d4, #c084fc)' },
    { name: 'Mint',    value: 'linear-gradient(180deg, #a7f3d0, #34d399, #059669)' },
    { name: 'Cosmic',  value: 'conic-gradient(from 0deg, #2563EB, #7C3AED, #EC4899, #2563EB)' },
  ];

  const IMAGE_CATEGORY_KEYWORDS = {
    random: 'wallpaper,background',
    nature: 'nature',
    abstract: 'abstract',
    technology: 'technology',
    minimal: 'minimal',
    architecture: 'architecture',
    travel: 'travel',
  };

  const TRUSTED_IMAGE_HOST = 'loremflickr.com';

  // ============================================
  // DOM HELPERS
  // ============================================

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  const previewBox  = $('preview-box');

  function createIcon(iconId, className = 'ui-icon ui-icon-14') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `icons.svg#${iconId}`);
    svg.appendChild(use);
    return svg;
  }

  function buildImageUrl(category) {
    const safeCategory = Object.prototype.hasOwnProperty.call(IMAGE_CATEGORY_KEYWORDS, category)
      ? category
      : 'random';
    const keyword = IMAGE_CATEGORY_KEYWORDS[safeCategory];
    const lock = Math.floor(Math.random() * 10000).toString();
    const url = new URL(`https://${TRUSTED_IMAGE_HOST}/640/480/${keyword}`);
    url.searchParams.set('lock', lock);
    return url.toString();
  }

  function isTrustedImageUrl(value) {
    if (!value || typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === TRUSTED_IMAGE_HOST;
    } catch {
      return false;
    }
  }

  // ============================================
  // INIT
  // ============================================

  async function init() {
    await loadFromStorage();
    setupTabNav();
    setupGradientControls();
    setupSolidControls();
    setupPatternControls();
    setupImageControls();
    setupOutputControls();
    setupHeaderControls();
    setupHistory();
    renderGradientPresets();
    renderPatternThumbs();
    updateAll();
    renderSaved();
    // Init custom dropdowns (CSP-safe, replaces native <select> elements)
    if (window.BGDropdowns) window.BGDropdowns.init();
  }

  // ============================================
  // TAB NAVIGATION
  // ============================================

  function setupTabNav() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        $(`tab-${state.activeTab}`).classList.add('active');
        updateAll();
      });
    });
  }

  // ============================================
  // GRADIENT TAB
  // ============================================

  function setupGradientControls() {
    // Type segmented
    $$('#gradient-type-seg .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#gradient-type-seg .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.gradient.type = btn.dataset.value;
        $('angle-control').classList.toggle('hidden', state.gradient.type !== 'linear');
        updateGradient();
      });
    });

    // Angle slider
    const angleSlider  = $('angle-slider');
    const angleNumber  = $('angle-number');

    angleSlider.addEventListener('input', () => {
      state.gradient.angle = parseInt(angleSlider.value);
      angleNumber.value = angleSlider.value;
      updateRangeTrack(angleSlider, 0, 360);
      updateGradient();
    });

    angleNumber.addEventListener('input', () => {
      let val = parseInt(angleNumber.value) || 0;
      val = Math.max(0, Math.min(360, val));
      state.gradient.angle = val;
      angleSlider.value = val;
      updateRangeTrack(angleSlider, 0, 360);
      updateGradient();
    });

    // Add / Remove color
    $('add-color').addEventListener('click', () => {
      if (state.gradient.colors.length < 5) {
        state.gradient.colors.push(randomVibrantColor());
        updateColorStops();
        updateGradient();
      }
    });

    $('remove-color').addEventListener('click', () => {
      if (state.gradient.colors.length > 2) {
        state.gradient.colors.pop();
        updateColorStops();
        updateGradient();
      }
    });

    // Randomize
    $('btn-randomize').addEventListener('click', () => {
      state.gradient.colors = state.gradient.colors.map(() => randomVibrantColor());
      state.gradient.angle  = Math.floor(Math.random() * 360);
      angleSlider.value     = state.gradient.angle;
      angleNumber.value     = state.gradient.angle;
      updateRangeTrack(angleSlider, 0, 360);
      updateColorStops();
      updateGradient();
    });

    // Initial render
    updateRangeTrack(angleSlider, 0, 360);
    updateColorStops();
  }

  function updateColorStops() {
    const container = $('color-stops-row');
    container.replaceChildren();

    state.gradient.colors.forEach((color, i) => {
      const item  = document.createElement('div');
      item.className = 'color-stop-item';

      const input = document.createElement('input');
      input.type  = 'color';
      input.value = color;

      const valEl = document.createElement('div');
      valEl.className = 'color-stop-val';
      valEl.textContent = color.toUpperCase();

      input.addEventListener('input', (e) => {
        state.gradient.colors[i] = e.target.value;
        valEl.textContent = e.target.value.toUpperCase();
        updateGradient();
      });

      item.appendChild(input);
      item.appendChild(valEl);
      container.appendChild(item);
    });

    $('color-count').textContent = state.gradient.colors.length;
    $('add-color').disabled    = state.gradient.colors.length >= 5;
    $('remove-color').disabled = state.gradient.colors.length <= 2;
  }

  function buildGradientCSS() {
    const { type, angle, colors } = state.gradient;
    const colorStr = colors.join(', ');
    switch (type) {
      case 'linear': return `linear-gradient(${angle}deg, ${colorStr})`;
      case 'radial':  return `radial-gradient(circle at center, ${colorStr})`;
      case 'conic':   return `conic-gradient(from 0deg at center, ${colorStr})`;
    }
  }

  function updateGradient() {
    const css = buildGradientCSS();
    setPreview({ background: css });
    state.currentCSS = `background: ${css};`;
    updateOutput();
    pushHistory(css);
  }

  function renderGradientPresets() {
    const grid = $('gradient-presets');
    GRADIENT_PRESETS.forEach(preset => {
      const swatch = document.createElement('div');
      swatch.className = 'preset-swatch';
      applyStylesToElement(swatch, { background: preset.value });
      swatch.title = preset.name;

      const lbl = document.createElement('div');
      lbl.className  = 'preset-label';
      lbl.textContent = preset.name;
      swatch.appendChild(lbl);

      swatch.addEventListener('click', () => {
        setPreview({ background: preset.value });
        state.currentCSS = `background: ${preset.value};`;
        $$('.preset-swatch').forEach(s => s.classList.remove('active-preset'));
        swatch.classList.add('active-preset');
        updateOutput();
        pushHistory(preset.value);
      });

      grid.appendChild(swatch);
    });
  }

  // ============================================
  // SOLID TAB
  // ============================================

  function setupSolidControls() {
    $('solid-color-input').addEventListener('input', (e) => {
      state.solid.color = e.target.value;
      updateSolid();
    });

    $$('#color-format-toggle .fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#color-format-toggle .fmt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.solid.format = btn.dataset.fmt;
        updateSolidOutput();
      });
    });

    updateSolid();
  }

  function updateSolid() {
    const hex = state.solid.color;
    setPreview({ background: hex });
    $('solid-preview-swatch').style.background = hex;
    $('solid-color-name').textContent = getColorName(hex);
    updateSolidOutput();
    renderShades();
    renderHarmony();
    pushHistory(hex);
  }

  function updateSolidOutput() {
    const formatted = formatColor(state.solid.color, state.solid.format);
    $('solid-color-value').textContent = formatted;
    state.currentCSS = `background-color: ${formatted};`;
    updateOutput();
  }

  function formatColor(hex, fmt) {
    if (fmt === 'hex') return hex.toUpperCase();
    const { r, g, b } = hexToRgb(hex);
    if (fmt === 'rgb') return `rgb(${r}, ${g}, ${b})`;
    if (fmt === 'hsl') {
      const { h, s, l } = hexToHsl(hex);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return hex;
  }

  function renderShades() {
    const { h, s } = hexToHsl(state.solid.color);
    const row = $('shades-row');
    row.replaceChildren();
    [95, 85, 75, 65, 50, 40, 30, 20, 10].forEach(l => {
      const shadeHex = hslToHex(h, s, l);
      const sw = document.createElement('div');
      sw.className = 'shade-swatch';
      sw.style.background = shadeHex;
      sw.title = shadeHex;
      sw.addEventListener('click', () => {
        state.solid.color = shadeHex;
        $('solid-color-input').value = shadeHex;
        updateSolid();
      });
      row.appendChild(sw);
    });
  }

  function renderHarmony() {
    const { h, s, l } = hexToHsl(state.solid.color);
    const base = state.solid.color;

    renderHarmonyGroup('harmony-comp', [
      base,
      hslToHex((h + 180) % 360, s, l),
    ]);
    renderHarmonyGroup('harmony-anal', [
      hslToHex((h - 30 + 360) % 360, s, l),
      base,
      hslToHex((h + 30) % 360, s, l),
    ]);
    renderHarmonyGroup('harmony-tri', [
      base,
      hslToHex((h + 120) % 360, s, l),
      hslToHex((h + 240) % 360, s, l),
    ]);
  }

  function renderHarmonyGroup(id, colors) {
    const container = $(id);
    container.replaceChildren();
    colors.forEach(color => {
      const sw = document.createElement('div');
      sw.className = 'harmony-swatch';
      sw.style.background = color;
      sw.title = color.toUpperCase();
      sw.addEventListener('click', () => {
        state.solid.color = color;
        $('solid-color-input').value = color;
        updateSolid();
      });
      container.appendChild(sw);
    });
  }

  // ============================================
  // PATTERN TAB
  // ============================================

  function setupPatternControls() {
    $$('.pattern-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.pattern-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.pattern.type = btn.dataset.pattern;
        updatePattern();
      });
    });

    $('pattern-fg').addEventListener('input', (e) => {
      state.pattern.fg = e.target.value;
      $('pattern-fg-val').textContent = e.target.value.toUpperCase();
      updatePattern();
    });

    $('pattern-bg').addEventListener('input', (e) => {
      state.pattern.bg = e.target.value;
      $('pattern-bg-val').textContent = e.target.value.toUpperCase();
      updatePattern();
    });

    const sizeSlider = $('pattern-size');
    sizeSlider.addEventListener('input', (e) => {
      state.pattern.size = parseInt(e.target.value);
      $('pattern-size-val').textContent = `${e.target.value}px`;
      updateRangeTrack(sizeSlider, 8, 60);
      updatePattern();
    });

    updateRangeTrack(sizeSlider, 8, 60);
    updatePattern();
  }

  function buildPatternStyles(type, fg, bg, size) {
    const h = size / 2;
    const dot = Math.max(1.5, size * 0.12);

    switch (type) {
      case 'dots':
        return {
          'background-color': bg,
          'background-image': `radial-gradient(circle, ${fg} ${dot}px, transparent ${dot}px)`,
          'background-size': `${size}px ${size}px`,
          'background-position': '',
        };
      case 'grid':
        return {
          'background-color': bg,
          'background-image': `linear-gradient(${fg} 1px, transparent 1px), linear-gradient(to right, ${fg} 1px, transparent 1px)`,
          'background-size': `${size}px ${size}px`,
          'background-position': '',
        };
      case 'lines':
        return {
          'background-color': bg,
          'background-image': `repeating-linear-gradient(0deg, ${fg}, ${fg} 1px, ${bg} 1px, ${bg} ${size}px)`,
          'background-size': '',
          'background-position': '',
        };
      case 'diagonal':
        return {
          'background-color': bg,
          'background-image': `repeating-linear-gradient(45deg, ${fg} 0, ${fg} 1.5px, ${bg} 0, ${bg} 50%)`,
          'background-size': `${size}px ${size}px`,
          'background-position': '',
        };
      case 'checker':
        return {
          'background-color': bg,
          'background-image': `linear-gradient(45deg, ${fg} 25%, transparent 25%), linear-gradient(-45deg, ${fg} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fg} 75%), linear-gradient(-45deg, transparent 75%, ${fg} 75%)`,
          'background-size': `${size}px ${size}px`,
          'background-position': `0 0, 0 ${h}px, ${h}px -${h}px, -${h}px 0px`,
        };
      case 'zigzag':
        return {
          'background-color': bg,
          'background-image': `linear-gradient(45deg, ${fg} 25%, ${bg} 25%, ${bg} 50%, ${fg} 50%, ${fg} 75%, ${bg} 75%, ${bg} 100%), linear-gradient(-45deg, ${fg} 25%, ${bg} 25%, ${bg} 50%, ${fg} 50%, ${fg} 75%, ${bg} 75%, ${bg} 100%)`,
          'background-size': `${size}px ${size}px`,
          'background-position': `0 0, ${h}px ${h}px`,
        };
      default:
        return { 'background-color': fg, 'background-image': '', 'background-size': '', 'background-position': '' };
    }
  }

  function updatePattern() {
    const { type, fg, bg, size } = state.pattern;
    const styles = buildPatternStyles(type, fg, bg, size);
    setPreview(styles);

    const cssLines = Object.entries(styles)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');

    state.currentCSS = cssLines;
    updateOutput();
    pushHistory(styles['background-color'] || fg);
  }

  function renderPatternThumbs() {
    $$('.pattern-thumb').forEach(thumb => {
      const type = thumb.dataset.preview;
      if (!type) return;
      const styles = buildPatternStyles(type, '#2563EB', '#EFF6FF', 10);
      applyStylesToElement(thumb, styles);
    });
  }

  // ============================================
  // IMAGE TAB
  // ============================================

  function setupImageControls() {
    $('generate-image').addEventListener('click', generateImage);

    $('btn-copy-image-url').addEventListener('click', () => {
      const url = $('image-url-output').textContent;
      if (url && !url.startsWith('Click')) copyText(url);
    });

    $('btn-copy-output-image').addEventListener('click', () => {
      const css = $('output-code-image').textContent;
      if (css && !css.includes('...')) copyText(css);
    });

    $('open-image-tab').addEventListener('click', () => {
      const url = $('image-url-output').textContent;
      if (!isTrustedImageUrl(url)) {
        showToast('Generate a valid image first');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    $('btn-save-image').addEventListener('click', () => {
      const url = $('image-url-output').textContent;
      if (!isTrustedImageUrl(url)) { showToast('Generate an image first'); return; }
      const snapshot = capturePreviewSnapshot();
      const item = {
        id: Date.now(),
        snapshot,
        css: `background-image: url('${url}'); background-size: cover; background-position: center;`,
        label: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      };
      state.saved.unshift(item);
      if (state.saved.length > 12) state.saved.pop();
      persistToStorage();
      renderSaved();
      showToast('Saved ✓');
    });
  }

  function generateImage() {
    const category = $('image-category').value;
    const url = buildImageUrl(category);

    // Show loader, disable button
    $('image-loader').classList.remove('hidden');
    $('generate-image').disabled = true;
    $('image-url-output').textContent = 'Loading...';
    $('output-code-image').textContent = 'Loading...';

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.addEventListener('load', () => {
      // Apply as preview background via the central setPreview helper
      setPreview({
        'background-image':    `url('${url}')`,
        'background-size':     'cover',
        'background-position': 'center',
      });

      const css = `background-image: url('${url}'); background-size: cover; background-position: center;`;
      state.currentCSS = css;
      $('image-url-output').textContent = url;
      $('output-code-image').textContent = css;
      updateOutput();

      $('image-loader').classList.add('hidden');
      $('generate-image').disabled = false;
      showToast('Image loaded ✓');
    });

    img.addEventListener('error', () => {
      $('image-url-output').textContent = 'Error loading image. Try again.';
      $('output-code-image').textContent = 'Error loading image.';
      $('image-loader').classList.add('hidden');
      $('generate-image').disabled = false;
      showToast('Failed to load image');
    });

    img.src = url;
  }

  // ============================================
  // ============================================

  function setupOutputControls() {
    // Handle gradient tab output
    $$('#output-format-toggle .fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => { setOutputFormat(btn.dataset.fmt); });
    });
    $('btn-copy-output').addEventListener('click', () => {
      copyText($('output-code').textContent);
    });

    // Handle solid tab output
    $$('#output-format-toggle-solid .fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => { setOutputFormat(btn.dataset.fmt); });
    });
    $('btn-copy-output-solid').addEventListener('click', () => {
      copyText($('output-code-solid').textContent);
    });

    // Handle pattern tab output
    $$('#output-format-toggle-pattern .fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => { setOutputFormat(btn.dataset.fmt); });
    });
    $('btn-copy-output-pattern').addEventListener('click', () => {
      copyText($('output-code-pattern').textContent);
    });

    // Handle saved tab output
    $$('#output-format-toggle-saved .fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => { setOutputFormat(btn.dataset.fmt); });
    });
    $('btn-copy-output-saved').addEventListener('click', () => {
      copyText($('output-code-saved').textContent);
    });
  }

  function setOutputFormat(format) {
    state.outputFormat = format;
    // Update active state for all toggle groups
    $$('.fmt-toggle .fmt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.fmt === format);
    });
    updateOutput();
  }

  function updateOutput() {
    const css = state.outputFormat === 'tailwind' ? generateTailwind() : state.currentCSS;
    // Update all output code elements
    const ids = ['output-code', 'output-code-solid', 'output-code-pattern', 'output-code-saved', 'output-code-image'];
    ids.forEach(id => { const el = $(id); if (el) el.textContent = css; });
  }

  function generateTailwind() {
    const tab = state.activeTab;

    if (tab === 'solid') {
      const fmt = state.solid.format === 'hex'
        ? state.solid.color.toUpperCase()
        : formatColor(state.solid.color, state.solid.format);
      return `bg-[${fmt}]`;
    }

    if (tab === 'gradient') {
      const { type, angle, colors } = state.gradient;
      if (type !== 'linear') return `/* ${type}-gradient — no Tailwind utility */`;

      const dirMap = { 0: 'to-t', 45: 'to-tr', 90: 'to-r', 135: 'to-br', 180: 'to-b', 225: 'to-bl', 270: 'to-l', 315: 'to-tl', 360: 'to-t' };
      const nearest = Object.keys(dirMap).reduce((a, b) =>
        Math.abs(b - angle) < Math.abs(a - angle) ? b : a
      );
      const dir = dirMap[nearest];

      if (colors.length === 2) {
        return `bg-gradient-${dir} from-[${colors[0]}] to-[${colors[1]}]`;
      }
      return `bg-gradient-${dir} from-[${colors[0]}] via-[${colors[1]}] to-[${colors[colors.length - 1]}]`;
    }

    return `/* CSS pattern — no Tailwind equivalent */`;
  }

  // ============================================
  // HEADER — APPLY TO PAGE
  // ============================================

  function setupHeaderControls() {
    $('btn-apply-page').addEventListener('click', applyToPage);
    // Handle all save buttons (now have unique IDs per tab)
    ['btn-save-gradient', 'btn-save-solid', 'btn-save-pattern'].forEach(id => {
      const btn = $(id);
      if (btn) btn.addEventListener('click', saveCurrentBackground);
    });
  }

  async function applyToPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const { type, fg, bg, size } = state.pattern;
      let cssProps = '';

      if (state.activeTab === 'pattern') {
        const styles = buildPatternStyles(type, fg, bg, size);
        cssProps = Object.entries(styles)
          .filter(([, v]) => v !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
      } else {
        // Read from state, not from element.style
        cssProps = state.currentCSS
          .replace(/;?\s*$/, '')          // trim trailing semicolon
          .replace(/^background-color:/, 'background:'); // normalise
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (css) => {
          const STYLE_ID = '__bg_gen_style__';
          let el = document.getElementById(STYLE_ID);
          if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            document.head.appendChild(el);
          }
          el.textContent = `body { ${css} !important; }`;
        },
        args: [cssProps],
      });

      showToast('Applied to page ✓');
    } catch (err) {
      showToast('Cannot apply to this page');
    }
  }

  // ============================================
  // SAVE & HISTORY
  // ============================================

  function saveCurrentBackground() {
    const snapshot = capturePreviewSnapshot();
    const item = {
      id: Date.now(),
      snapshot,
      css: state.currentCSS,
      label: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    };

    state.saved.unshift(item);
    if (state.saved.length > 12) state.saved.pop();
    persistToStorage();
    renderSaved();
    showToast('Saved ✓');
  }

  function renderSaved() {
    const container = $('saved-container');
    container.replaceChildren();

    if (state.saved.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-saved';

      const icon = createIcon('icon-bookmark', 'ui-icon');
      icon.setAttribute('width', '40');
      icon.setAttribute('height', '40');
      empty.appendChild(icon);

      const title = document.createElement('p');
      title.textContent = 'No saved backgrounds yet';
      empty.appendChild(title);

      const hint = document.createElement('small');
      hint.textContent = 'Use the bookmark icon to save';
      empty.appendChild(hint);

      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'saved-grid';

    state.saved.forEach(item => {
      const el      = document.createElement('div');
      el.className  = 'saved-item';

      const preview = document.createElement('div');
      preview.className = 'saved-item-preview';
      applyStylesToElement(preview, item.snapshot);

      const del = document.createElement('button');
      del.className   = 'saved-item-delete';
      del.textContent = '×';
      del.title = 'Delete';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        state.saved = state.saved.filter(s => s.id !== item.id);
        persistToStorage();
        renderSaved();
        showToast('Removed');
      });

      const lbl       = document.createElement('div');
      lbl.className   = 'saved-item-label';
      lbl.textContent = item.label;

      el.addEventListener('click', () => {
        applyStylesToElement(previewBox, item.snapshot);
        state.currentCSS = item.css;
        updateOutput();
        showToast('Loaded ✓');
      });

      el.addEventListener('mouseenter', () => {
        // Temporarily show this item's CSS in the output
        const originalCSS = state.currentCSS;
        state.currentCSS = item.css;
        updateOutput();
        // Store original for mouseleave
        el._originalCSS = originalCSS;
      });

      el.addEventListener('mouseleave', () => {
        // Restore original CSS
        if (el._originalCSS) {
          state.currentCSS = el._originalCSS;
          updateOutput();
        }
      });

      el.appendChild(preview);
      el.appendChild(del);
      el.appendChild(lbl);
      grid.appendChild(el);
    });

    container.appendChild(grid);
  }

  function capturePreviewSnapshot() {
    return {
      background:         previewBox.style.background,
      'background-image': previewBox.style.backgroundImage,
      'background-color': previewBox.style.backgroundColor,
      'background-size':  previewBox.style.backgroundSize,
      'background-position': previewBox.style.backgroundPosition,
    };
  }

  // History
  function pushHistory(cssValue) {
    if (!cssValue) return;
    if (state.history[0] && state.history[0].value === cssValue) return;

    const snapshot = capturePreviewSnapshot();
    state.history.unshift({ value: cssValue, snapshot });
    if (state.history.length > 8) state.history.pop();

    renderHistory();
    persistToStorage();
  }

  function setupHistory() {
    renderHistory();
  }

  function renderHistory() {
    const row = $('recent-history-row');
    row.replaceChildren();

    if (state.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-recent';

      const icon = createIcon('icon-recent', 'ui-icon');
      icon.setAttribute('width', '40');
      icon.setAttribute('height', '40');
      empty.appendChild(icon);

      const title = document.createElement('p');
      title.textContent = 'No history yet';
      empty.appendChild(title);

      const hint = document.createElement('small');
      hint.textContent = 'Your recent backgrounds will appear here';
      empty.appendChild(hint);

      row.appendChild(empty);
      return;
    }

    state.history.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'history-item';

      const swatch = document.createElement('div');
      swatch.className = 'history-item-swatch';
      applyStylesToElement(swatch, item.snapshot);

      const code = document.createElement('code');
      code.className = 'history-item-code';
      code.textContent = item.value;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'history-item-copy-btn';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.appendChild(createIcon('icon-copy'));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'history-item-remove-btn';
      removeBtn.title = 'Remove recent item';
      removeBtn.appendChild(createIcon('icon-close'));

      const arrow = document.createElement('span');
      arrow.className = 'history-item-arrow';
      arrow.appendChild(createIcon('icon-chevron-right', 'ui-icon ui-icon-12 ui-icon-stroke-25'));

      itemDiv.appendChild(swatch);
      itemDiv.appendChild(code);
      itemDiv.appendChild(copyBtn);
      itemDiv.appendChild(removeBtn);
      itemDiv.appendChild(arrow);

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`background: ${item.value};`).then(() => {
          showToast('Copied ✓');
        });
      });

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.history = state.history.filter(h => h !== item);
        renderHistory();
        persistToStorage();
        showToast('Removed ✓');
      });

      itemDiv.addEventListener('click', () => {
        applyStylesToElement(previewBox, item.snapshot);
        state.currentCSS = `background: ${item.value};`;
        updateOutput();
        showToast('Loaded ✓');
      });

      itemDiv.addEventListener('mouseenter', () => {
        itemDiv.classList.add('history-item--hovered');
      });

      itemDiv.addEventListener('mouseleave', () => {
        itemDiv.classList.remove('history-item--hovered');
      });

      row.appendChild(itemDiv);
    });
  }

  // ============================================
  // STORAGE
  // ============================================

  async function loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(['history', 'saved']);
      if (data.history) state.history = data.history;
      if (data.saved)   state.saved   = data.saved;
    } catch (e) { /* Running outside extension context */ }
  }

  function persistToStorage() {
    try {
      chrome.storage.local.set({ history: state.history, saved: state.saved });
    } catch (e) { /* Running outside extension context */ }
  }

  // ============================================
  // UPDATE ALL
  // ============================================

  function updateAll() {
    switch (state.activeTab) {
      case 'gradient': updateGradient(); break;
      case 'solid':    updateSolid();    break;
      case 'pattern':  updatePattern();  break;
      case 'image':    /* preview stays */ break;
      case 'saved':    /* preview stays */ break;
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  function setPreview(styles) {
    // Clear all bg properties first
    previewBox.style.background         = '';
    previewBox.style.backgroundImage    = '';
    previewBox.style.backgroundColor    = '';
    previewBox.style.backgroundSize     = '';
    previewBox.style.backgroundPosition = '';
    applyStylesToElement(previewBox, styles);
  }

  function applyStylesToElement(el, styles) {
    Object.entries(styles).forEach(([k, v]) => {
      if (v === '' || v === undefined) return;
      // Convert kebab-case to camelCase
      const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.style[camel] = v;
    });
  }

  function updateRangeTrack(input, min, max) {
    const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    // CSS custom property — drives the ::before pseudo fill defined in styles.css
    input.style.setProperty('--track-fill', `${pct}%`);
  }

  function randomVibrantColor() {
    const h = Math.floor(Math.random() * 360);
    const s = 55 + Math.floor(Math.random() * 35);
    const l = 38 + Math.floor(Math.random() * 28);
    return hslToHex(h, s, l);
  }

  // Color name approximation
  function getColorName(hex) {
    const { h, s, l } = hexToHsl(hex);
    if (s < 8) {
      if (l > 92) return 'White';
      if (l < 12) return 'Black';
      return l > 60 ? 'Light Gray' : 'Gray';
    }
    const hues = [
      [10, 'Red'], [20, 'Red-Orange'], [35, 'Orange'], [50, 'Yellow-Orange'],
      [65, 'Yellow'], [80, 'Yellow-Green'], [110, 'Lime'], [150, 'Green'],
      [165, 'Emerald'], [185, 'Cyan'], [205, 'Sky Blue'], [230, 'Blue'],
      [250, 'Royal Blue'], [270, 'Indigo'], [290, 'Violet'], [315, 'Purple'],
      [340, 'Pink'], [360, 'Red'],
    ];
    let name = 'Red';
    for (const [hv, hn] of hues) {
      if (h <= hv) { name = hn; break; }
    }
    if (l > 72) return `Light ${name}`;
    if (l < 28) return `Dark ${name}`;
    return name;
  }

  // Colour conversion functions
  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function hexToHsl(hex) {
    let { r, g, b } = hexToRgb(hex);
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Clipboard & toast
  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied ✓'));
  }

  function showToast(msg) {
    const toast = $('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ============================================
  // GO!
  // ============================================
  init();

});

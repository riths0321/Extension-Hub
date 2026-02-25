/* ─────────────────────────────────────────────
   Just Read - content.js
   CSP-safe reading mode injector
   ───────────────────────────────────────────── */

class ReadingMode {
    constructor() {
        this.isActive = false;
        this.originalBodyHTML = null;
        this.styleEl = null;
        this.settings = {
            darkMode: false,
            serifFont: false,
            fontSize: 'medium',
            lineHeight: '1.6',
            autoDarkMode: false,
            removeImages: false,
            keepLinks: true,
            themeColor: '#4f8ef7'
        };
        this.init();
    }

    async init() {
        const result = await chrome.storage.sync.get([
            'darkMode','serifFont','fontSize','lineHeight','autoDarkMode',
            'removeImages','keepLinks','themeColor'
        ]);
        Object.assign(this.settings, result);

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'enableReadingMode')  this.enable();
            if (request.action === 'disableReadingMode') this.disable();
            if (request.action === 'settingsUpdated')    this.refreshSettings();
            if (request.action === 'toggleReadingMode')  this.isActive ? this.disable() : this.enable();
            sendResponse({ success: true });
            return true;
        });

        chrome.storage.onChanged.addListener((changes, ns) => {
            if (ns !== 'sync') return;
            const keys = ['darkMode','serifFont','fontSize','lineHeight','autoDarkMode','removeImages','keepLinks','themeColor'];
            keys.forEach(k => { if (changes[k]) this.settings[k] = changes[k].newValue; });
            if (this.isActive) this.updateStyles();
        });

        this.addKeyboardShortcuts();
    }

    async refreshSettings() {
        const result = await chrome.storage.sync.get([
            'darkMode','serifFont','fontSize','lineHeight','autoDarkMode',
            'removeImages','keepLinks','themeColor'
        ]);
        Object.assign(this.settings, result);
        if (this.isActive) this.updateStyles();
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.originalBodyHTML = document.body.innerHTML;
        this.buildReadingView();
        this.injectStyles();
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.originalBodyHTML !== null) {
            document.body.innerHTML = this.originalBodyHTML;
        }

        if (this.styleEl && this.styleEl.parentNode) {
            this.styleEl.parentNode.removeChild(this.styleEl);
        }
        this.styleEl = null;
    }

    buildReadingView() {
        const content = this.extractContent();
        const isDark = this.isDarkMode();

        const container = document.createElement('div');
        container.id = 'jr-root';

        const header = document.createElement('div');
        header.id = 'jr-bar';
        header.innerHTML = `
            <div id="jr-brand">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M2 6C2 4.9 2.9 4 4 4h6c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M12 6c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-6c-1.1 0-2-.9-2-2V6z" stroke="currentColor" stroke-width="1.8"/>
                </svg>
                <span>Just Read</span>
            </div>
            <div id="jr-controls">
                <button class="jr-btn" data-action="font-smaller" title="Smaller text">A−</button>
                <button class="jr-btn" data-action="font-larger" title="Larger text">A+</button>
                <button class="jr-btn" data-action="toggle-dark" title="Toggle dark mode" id="jr-dark-btn">
                    ${isDark ? '☀️' : '🌙'}
                </button>
                <button class="jr-btn" data-action="print" title="Print">🖨</button>
                <button class="jr-btn jr-close" data-action="close" title="Exit reading mode (Esc)">✕</button>
            </div>
        `;

        const article = document.createElement('div');
        article.id = 'jr-content';
        article.innerHTML = content;

        // Optionally strip images
        if (this.settings.removeImages) {
            article.querySelectorAll('img, picture, figure').forEach(el => el.remove());
        }

        // Optionally disable links
        if (!this.settings.keepLinks) {
            article.querySelectorAll('a').forEach(a => {
                a.removeAttribute('href');
                a.style.textDecoration = 'none';
                a.style.color = 'inherit';
                a.style.cursor = 'default';
            });
        }

        container.appendChild(header);
        container.appendChild(article);

        document.body.innerHTML = '';
        document.body.appendChild(container);

        // Bind controls
        document.querySelectorAll('.jr-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }

    extractContent() {
        const tempDoc = document.createElement('div');
        tempDoc.innerHTML = document.body.innerHTML;

        // Remove obvious noise
        tempDoc.querySelectorAll(
            'nav, header, footer, aside, .sidebar, .ad, .advertisement, .ads, ' +
            '[class*="sidebar"], [class*="widget"], [class*="banner"], ' +
            'iframe, script, style, noscript, .comments, [class*="social"], ' +
            '[class*="share"], [class*="related"], [class*="newsletter"]'
        ).forEach(el => el.remove());

        // Try smart selectors
        const selectors = [
            'article[class]', 'article',
            '[role="main"]',
            '.post-content', '.article-content', '.entry-content',
            '.article-body', '.story-body', '.content-body',
            '#article-content', '#main-content', '#content',
            'main article', 'main .content', 'main'
        ];

        for (const sel of selectors) {
            const el = tempDoc.querySelector(sel);
            if (el && el.textContent.trim().length > 300) {
                return el.innerHTML;
            }
        }

        return tempDoc.innerHTML;
    }

    isDarkMode() {
        return this.settings.autoDarkMode
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : this.settings.darkMode;
    }

    injectStyles() {
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'jr-styles';
        this.styleEl.textContent = this.buildCSS();
        document.head.appendChild(this.styleEl);
    }

    buildCSS() {
        const fontSizes = { small:'16px', medium:'18px', large:'20px', xlarge:'22px' };
        const fontSize   = fontSizes[this.settings.fontSize] || '18px';
        const lineHeight = this.settings.lineHeight || '1.6';
        const isDark     = this.isDarkMode();
        const serif      = this.settings.serifFont;
        const theme      = this.settings.themeColor || '#4f8ef7';

        const fontFamily = serif
            ? "Georgia, 'Times New Roman', Times, serif"
            : "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

        const colors = isDark ? {
            pageBg:    '#0f1117',
            cardBg:    '#161b27',
            barBg:     '#111520',
            barBorder: '#232c3e',
            text:      '#dde3f0',
            textMuted: '#7d8aa5',
            heading:   '#eef2ff',
            link:      theme,
            codeBg:    '#1d2438',
            codeText:  '#c9d1e9',
            blockBg:   '#131827',
            blockBorder: theme,
            btnBg:     '#1d2438',
            btnColor:  '#c9d1e9',
            tableBorder: '#232c3e',
        } : {
            pageBg:    '#f0f2f5',
            cardBg:    '#ffffff',
            barBg:     '#ffffff',
            barBorder: '#e0e4ed',
            text:      '#1e2433',
            textMuted: '#6b7694',
            heading:   '#0f1525',
            link:      theme,
            codeBg:    '#f0f3ff',
            codeText:  '#3040a0',
            blockBg:   '#f8f9ff',
            blockBorder: theme,
            btnBg:     '#eef0f7',
            btnColor:  '#4a5168',
            tableBorder: '#dde1ef',
        };

        return `
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: ${colors.pageBg} !important;
            }

            #jr-root {
                font-family: ${fontFamily};
                font-size: ${fontSize};
                line-height: ${lineHeight};
                color: ${colors.text};
                background: ${colors.pageBg};
                min-height: 100vh;
            }

            /* ── Toolbar ── */
            #jr-bar {
                position: sticky;
                top: 0;
                z-index: 9999;
                background: ${colors.barBg};
                border-bottom: 1px solid ${colors.barBorder};
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
                height: 48px;
                box-shadow: 0 1px 8px rgba(0,0,0,${isDark ? '0.4' : '0.08'});
            }

            #jr-brand {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
                color: ${theme};
                letter-spacing: -0.2px;
            }

            #jr-controls {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .jr-btn {
                background: ${colors.btnBg};
                color: ${colors.btnColor};
                border: 1px solid ${isDark ? '#1d2438' : '#e0e4ed'};
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s;
                font-family: inherit;
            }

            .jr-btn:hover {
                background: ${theme};
                color: #fff;
                border-color: ${theme};
            }

            .jr-close {
                font-size: 13px;
                padding: 4px 9px;
                margin-left: 4px;
            }

            /* ── Article ── */
            #jr-content {
                max-width: 720px;
                margin: 0 auto;
                padding: 48px 28px 80px;
                background: ${colors.cardBg};
                min-height: calc(100vh - 48px);
                box-shadow: ${isDark ? 'none' : '0 0 40px rgba(0,0,0,0.06)'};
            }

            /* Typography */
            #jr-content h1 {
                font-size: 2em;
                font-weight: 700;
                line-height: 1.2;
                color: ${colors.heading};
                margin: 0 0 0.5em;
                letter-spacing: -0.5px;
            }

            #jr-content h2 {
                font-size: 1.5em;
                font-weight: 600;
                color: ${colors.heading};
                margin: 1.6em 0 0.5em;
                letter-spacing: -0.3px;
            }

            #jr-content h3, #jr-content h4, #jr-content h5, #jr-content h6 {
                font-weight: 600;
                color: ${colors.heading};
                margin: 1.4em 0 0.4em;
            }

            #jr-content p {
                margin: 0 0 1.2em;
                color: ${colors.text};
            }

            #jr-content a {
                color: ${colors.link};
                text-decoration: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: 2px;
            }

            #jr-content a:hover { opacity: 0.8; }

            #jr-content img {
                max-width: 100%;
                height: auto;
                border-radius: 6px;
                margin: 12px 0;
            }

            #jr-content blockquote {
                margin: 1.5em 0;
                padding: 16px 20px;
                background: ${colors.blockBg};
                border-left: 3px solid ${colors.blockBorder};
                color: ${colors.textMuted};
                font-style: italic;
                border-radius: 0 6px 6px 0;
            }

            #jr-content code {
                background: ${colors.codeBg};
                color: ${colors.codeText};
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.88em;
                font-family: 'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
            }

            #jr-content pre {
                background: ${colors.codeBg};
                border: 1px solid ${isDark ? '#232c3e' : '#dde1ef'};
                border-radius: 8px;
                padding: 16px 20px;
                overflow-x: auto;
                margin: 1.5em 0;
            }

            #jr-content pre code {
                background: transparent;
                padding: 0;
                font-size: 0.9em;
                color: ${colors.codeText};
            }

            #jr-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5em 0;
                font-size: 0.92em;
            }

            #jr-content th, #jr-content td {
                border: 1px solid ${colors.tableBorder};
                padding: 10px 14px;
                text-align: left;
            }

            #jr-content th {
                background: ${colors.codeBg};
                font-weight: 600;
                color: ${colors.heading};
            }

            #jr-content ul, #jr-content ol {
                padding-left: 1.6em;
                margin: 0.8em 0 1.2em;
            }

            #jr-content li { margin-bottom: 0.3em; }

            #jr-content hr {
                border: none;
                border-top: 1px solid ${colors.tableBorder};
                margin: 2em 0;
            }

            @media (max-width: 600px) {
                #jr-content { padding: 24px 18px 60px; }
            }

            @media print {
                #jr-bar { display: none !important; }
                #jr-content { box-shadow: none; max-width: 100%; padding: 0; }
            }
        `;
    }

    handleAction(action) {
        switch (action) {
            case 'close':
                this.disable();
                break;
            case 'font-smaller':
                this.adjustFontSize(-1);
                break;
            case 'font-larger':
                this.adjustFontSize(1);
                break;
            case 'toggle-dark':
                this.settings.darkMode = !this.settings.darkMode;
                chrome.storage.sync.set({ darkMode: this.settings.darkMode });
                this.updateStyles();
                // Update emoji on button
                const btn = document.getElementById('jr-dark-btn');
                if (btn) btn.textContent = this.isDarkMode() ? '☀️' : '🌙';
                break;
            case 'print':
                window.print();
                break;
        }
    }

    adjustFontSize(dir) {
        const content = document.getElementById('jr-content');
        if (!content) return;
        const current = parseFloat(window.getComputedStyle(content).fontSize);
        const newSize = Math.max(12, Math.min(28, current + dir * 2));
        content.style.fontSize = newSize + 'px';
    }

    updateStyles() {
        if (this.styleEl) {
            this.styleEl.textContent = this.buildCSS();
        }
    }

    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                e.preventDefault();
                this.disable();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.isActive ? this.disable() : this.enable();
            }
            if (this.isActive) {
                if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                    e.preventDefault();
                    this.adjustFontSize(1);
                }
                if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                    e.preventDefault();
                    this.adjustFontSize(-1);
                }
            }
        });
    }
}

// Initialize
const readingMode = new ReadingMode();

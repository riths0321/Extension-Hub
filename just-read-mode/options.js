/* ─────────────────────────────────────────────
   Just Read - options.js
   CSP-safe: no eval, no inline handlers
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

    // ── Navigation ──
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.section;

            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const section = document.getElementById('section-' + target);
            if (section) section.classList.add('active');
        });
    });

    // ── Elements ──
    const saveBtn         = document.getElementById('saveBtn');
    const resetBtn        = document.getElementById('resetBtn');
    const exportBtn       = document.getElementById('exportBtn');
    const importBtn       = document.getElementById('importBtn');
    const importFile      = document.getElementById('importFile');
    const statusMessage   = document.getElementById('statusMessage');
    const chromeShortcuts = document.getElementById('chromeShortcutsLink');

    // autoDarkMode disables darkMode toggle
    const autoDarkModeEl  = document.getElementById('autoDarkMode');
    const darkModeEl      = document.getElementById('darkMode');

    autoDarkModeEl.addEventListener('change', () => {
        darkModeEl.disabled = autoDarkModeEl.checked;
    });

    // Open chrome shortcuts page
    if (chromeShortcuts) {
        chromeShortcuts.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        });
    }

    // ── Load on init ──
    loadSettings();

    // ── Save ──
    saveBtn.addEventListener('click', saveSettings);

    // ── Reset ──
    resetBtn.addEventListener('click', () => {
        if (window.confirm('Reset all settings to their default values?')) {
            resetToDefaults();
        }
    });

    // ── Export ──
    exportBtn.addEventListener('click', exportSettings);

    // ── Import ──
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importSettings);

    // ── Functions ──

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'darkMode', 'serifFont', 'fontSize', 'lineHeight', 'themeColor',
                'removeImages', 'removeAds', 'removeSidebars', 'keepLinks',
                'autoEnable', 'contentSelectors', 'excludeDomains', 'autoDarkMode'
            ]);

            setVal('autoDarkMode', result.autoDarkMode || false);
            setVal('darkMode',     result.darkMode || false);
            setVal('serifFont',    result.serifFont || false);
            setVal('fontSize',     result.fontSize || 'medium');
            setVal('lineHeight',   result.lineHeight || '1.6');
            setVal('themeColor',   result.themeColor || '#4f8ef7');

            setVal('removeImages',   result.removeImages || false);
            setVal('removeAds',      result.removeAds !== false);
            setVal('removeSidebars', result.removeSidebars !== false);
            setVal('keepLinks',      result.keepLinks !== false);

            setVal('autoEnable',       result.autoEnable || false);
            setVal('contentSelectors', result.contentSelectors || 'article, .post-content, .story, #main-content');
            setVal('excludeDomains',   result.excludeDomains || '');

            // Disable darkMode if auto is on
            darkModeEl.disabled = autoDarkModeEl.checked;

        } catch (err) {
            console.error('Load error:', err);
            showStatus('Error loading settings', 'error');
        }
    }

    async function saveSettings() {
        try {
            const settings = {
                autoDarkMode:     getVal('autoDarkMode'),
                darkMode:         getVal('darkMode'),
                serifFont:        getVal('serifFont'),
                fontSize:         getVal('fontSize'),
                lineHeight:       getVal('lineHeight'),
                themeColor:       getVal('themeColor'),
                removeImages:     getVal('removeImages'),
                removeAds:        getVal('removeAds'),
                removeSidebars:   getVal('removeSidebars'),
                keepLinks:        getVal('keepLinks'),
                autoEnable:       getVal('autoEnable'),
                contentSelectors: getVal('contentSelectors'),
                excludeDomains:   getVal('excludeDomains'),
            };

            await chrome.storage.sync.set(settings);
            showStatus('Settings saved!', 'success');

            // Notify all content scripts
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' }).catch(() => {});
                });
            });

        } catch (err) {
            console.error('Save error:', err);
            showStatus('Error saving settings', 'error');
        }
    }

    async function resetToDefaults() {
        try {
            const defaults = {
                darkMode: false,
                serifFont: false,
                fontSize: 'medium',
                lineHeight: '1.6',
                themeColor: '#4f8ef7',
                removeImages: false,
                removeAds: true,
                removeSidebars: true,
                keepLinks: true,
                autoEnable: false,
                autoDarkMode: false,
                contentSelectors: 'article, .post-content, .story, #main-content',
                excludeDomains: ''
            };

            await chrome.storage.sync.set(defaults);
            await loadSettings();
            showStatus('Settings reset to defaults', 'success');

        } catch (err) {
            showStatus('Error resetting settings', 'error');
        }
    }

    async function exportSettings() {
        try {
            const settings = await chrome.storage.sync.get(null);
            const json = JSON.stringify(settings, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = 'just-read-settings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
            showStatus('Settings exported', 'success');

        } catch (err) {
            showStatus('Error exporting settings', 'error');
        }
    }

    function importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                await chrome.storage.sync.set(settings);
                await loadSettings();
                showStatus('Settings imported successfully', 'success');
                importFile.value = '';
            } catch {
                showStatus('Invalid settings file', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ── Helpers ──

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = Boolean(value);
        } else {
            el.value = value;
        }
    }

    function getVal(id) {
        const el = document.getElementById(id);
        if (!el) return undefined;
        if (el.type === 'checkbox') return el.checked;
        return el.value;
    }

    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = 'status-msg ' + type;

        clearTimeout(showStatus._timer);
        showStatus._timer = setTimeout(() => {
            statusMessage.className = 'status-msg hidden';
        }, 3000);
    }

});

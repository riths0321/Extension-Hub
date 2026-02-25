/* ─────────────────────────────────────────────
   Just Read - popup.js
   CSP-safe: no eval, no inline handlers
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

    // ── Elements ──
    const toggleBtn       = document.getElementById('toggleBtn');
    const toggleLabel     = document.getElementById('toggleLabel');
    const toggleIcon      = document.getElementById('toggleIcon');
    const toggleSpinner   = document.getElementById('toggleSpinner');
    const statusDot       = document.getElementById('statusDot');
    const statusLabel     = document.getElementById('statusLabel');
    const statusPill      = document.getElementById('statusPill');
    const darkModeToggle  = document.getElementById('darkModeToggle');
    const serifToggle     = document.getElementById('serifToggle');
    const fontSizeSeg     = document.getElementById('fontSizeSeg');
    const lineHeightSeg   = document.getElementById('lineHeightSeg');
    const optionsBtn      = document.getElementById('optionsBtn');
    const shortcutsBtn    = document.getElementById('shortcutsBtn');
    const shortcutsOverlay= document.getElementById('shortcutsOverlay');
    const closeShortcuts  = document.getElementById('closeShortcuts');

    let isActive = false;
    let currentTabId = null;

    // ── Init ──
    loadState();

    // ── Segmented control util ──
    function initSeg(container, onChange) {
        container.querySelectorAll('.seg-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.seg-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                onChange(btn.dataset.val);
            });
        });
    }

    function setSegValue(container, value) {
        container.querySelectorAll('.seg-opt').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === value);
        });
    }

    initSeg(fontSizeSeg, async (val) => {
        await chrome.storage.sync.set({ fontSize: val });
        notifyTabs({ action: 'settingsUpdated' });
    });

    initSeg(lineHeightSeg, async (val) => {
        await chrome.storage.sync.set({ lineHeight: val });
        notifyTabs({ action: 'settingsUpdated' });
    });

    // ── Load settings & active state ──
    async function loadState() {
        try {
            // Load settings
            const result = await chrome.storage.sync.get([
                'darkMode', 'serifFont', 'fontSize', 'lineHeight', 'autoDarkMode'
            ]);

            if (result.autoDarkMode) {
                darkModeToggle.disabled = true;
                darkModeToggle.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else {
                darkModeToggle.checked = result.darkMode || false;
            }

            serifToggle.checked = result.serifFont || false;

            if (result.fontSize) setSegValue(fontSizeSeg, result.fontSize);
            if (result.lineHeight) setSegValue(lineHeightSeg, result.lineHeight);

            // Check active tab state
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                currentTabId = tabs[0].id;
                const local = await chrome.storage.local.get(['activeTabs']);
                isActive = !!(local.activeTabs && local.activeTabs[currentTabId]);
                updateUI(isActive);
            }

        } catch (err) {
            console.error('Error loading state:', err);
        }
    }

    // ── Toggle reading mode ──
    toggleBtn.addEventListener('click', async () => {
        if (!currentTabId) return;

        setLoading(true);

        try {
            if (isActive) {
                await sendToTab(currentTabId, { action: 'disableReadingMode' });
                await updateActiveTabStorage(currentTabId, false);
                isActive = false;
            } else {
                await sendToTab(currentTabId, { action: 'enableReadingMode' });
                await updateActiveTabStorage(currentTabId, true);
                isActive = true;
            }

            updateUI(isActive);

            // Close popup after a short delay
            setTimeout(() => window.close(), 250);

        } catch (err) {
            console.error('Error toggling reading mode:', err);
            statusLabel.textContent = 'Error — try reloading page';
            statusDot.style.background = '#f07070';
        } finally {
            setLoading(false);
        }
    });

    // ── Settings toggles ──
    darkModeToggle.addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ darkMode: e.target.checked });
        notifyTabs({ action: 'settingsUpdated' });
    });

    serifToggle.addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ serifFont: e.target.checked });
        notifyTabs({ action: 'settingsUpdated' });
    });

    // ── Options page ──
    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    // ── Shortcuts overlay ──
    shortcutsBtn.addEventListener('click', () => {
        shortcutsOverlay.classList.remove('hidden');
    });

    closeShortcuts.addEventListener('click', () => {
        shortcutsOverlay.classList.add('hidden');
    });

    shortcutsOverlay.addEventListener('click', (e) => {
        if (e.target === shortcutsOverlay) {
            shortcutsOverlay.classList.add('hidden');
        }
    });

    // ── UI helpers ──
    function updateUI(active) {
        if (active) {
            toggleBtn.classList.add('exit-mode');
            toggleLabel.textContent = 'Exit Reading Mode';
            statusPill.classList.add('active');
            statusLabel.textContent = 'Active';
            // Update icon to X/close
            toggleIcon.innerHTML = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
        } else {
            toggleBtn.classList.remove('exit-mode');
            toggleLabel.textContent = 'Enter Reading Mode';
            statusPill.classList.remove('active');
            statusLabel.textContent = 'Off';
            // Restore eye icon
            toggleIcon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>';
        }
    }

    function setLoading(on) {
        toggleBtn.disabled = on;
        toggleSpinner.classList.toggle('hidden', !on);
        toggleIcon.classList.toggle('hidden', on);
    }

    async function sendToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async function updateActiveTabStorage(tabId, active) {
        const local = await chrome.storage.local.get(['activeTabs']);
        const activeTabs = local.activeTabs || {};
        if (active) {
            activeTabs[tabId] = true;
        } else {
            delete activeTabs[tabId];
        }
        await chrome.storage.local.set({ activeTabs });
    }

    function notifyTabs(message) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {});
            });
        });
    }

});

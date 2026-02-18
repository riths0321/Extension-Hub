// Tab Sleep Timer - Popup Script

function initPopup() {
    // DOM Elements
    const totalTabsEl = document.getElementById('totalTabs');
    const sleepingTabsEl = document.getElementById('sleepingTabs');
    const activeTabsEl = document.getElementById('activeTabs');
    const memorySavedEl = document.getElementById('memorySaved');
    const batteryEstimateEl = document.getElementById('batteryEstimate');
    const timerButtons = document.querySelectorAll('.timer-btn');
    const ignorePinnedCheck = document.getElementById('ignorePinned');
    const ignoreAudioCheck = document.getElementById('ignoreAudio');
    const batteryModeCheck = document.getElementById('batteryMode');
    const sleepNowBtn = document.getElementById('sleepNow');
    const wakeAllBtn = document.getElementById('wakeAll');
    const applySettingsBtn = document.getElementById('applySettings');
    const resetSettingsBtn = document.getElementById('resetSettings');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    let currentSettings = {
        sleepTimer: 15,
        ignorePinned: true,
        ignoreAudio: true,
        batteryMode: true
    };
    
    if (!sleepNowBtn || !wakeAllBtn || !applySettingsBtn || !resetSettingsBtn) {
        console.error('Popup controls not found');
        return;
    }

    // Load initial data
    loadStats();
    
    // Timer button click
    timerButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            timerButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.sleepTimer = parseInt(this.dataset.minutes);
        });
    });
    
    // Sleep Now button
    sleepNowBtn.addEventListener('click', async function() {
        showLoading(true);
        try {
            const response = await sendMessage({ action: 'sleepNow' });
            const slept = response?.sleptCount || 0;
            const skipped = response?.skipped || {};
            const activeSkipped = skipped.active_tab || 0;
            const blockedSkipped = skipped.discard_blocked || 0;
            const alreadySleeping = skipped.already_sleeping || 0;
            const ignored = skipped.ignored_by_rules || 0;
            if (slept > 0) {
                const notes = [];
                if (activeSkipped) notes.push(`${activeSkipped} active`);
                if (blockedSkipped) notes.push(`${blockedSkipped} blocked`);
                if (alreadySleeping) notes.push(`${alreadySleeping} already sleeping`);
                if (ignored) notes.push(`${ignored} ignored`);
                showNotification(`Slept ${slept} tab${slept > 1 ? 's' : ''}${notes.length ? `, skipped ${notes.join(', ')}` : ''}`);
            } else {
                const reasons = [];
                if (alreadySleeping) reasons.push(`${alreadySleeping} already sleeping`);
                if (activeSkipped) reasons.push(`${activeSkipped} active`);
                if (ignored) reasons.push(`${ignored} ignored by rules`);
                if (blockedSkipped) reasons.push(`${blockedSkipped} discard-blocked`);
                showNotification(
                    reasons.length
                        ? `No eligible tabs (${reasons.join(', ')})`
                        : 'No tabs were put to sleep',
                    true
                );
            }
            setTimeout(loadStats, 1000);
        } catch (error) {
            console.error('Sleep now failed:', error);
            showNotification('Sleep Now failed', true);
        } finally {
            showLoading(false);
        }
    });
    
    // Wake All button
    wakeAllBtn.addEventListener('click', async function() {
        showLoading(true);
        try {
            const response = await sendMessage({ action: 'wakeAll' });
            const woken = response?.wokenCount || 0;
            if (woken > 0) {
                showNotification(`Woke ${woken} tab${woken > 1 ? 's' : ''}`);
            } else {
                showNotification('No sleeping tabs to wake', true);
            }
            setTimeout(loadStats, 1000);
        } catch (error) {
            console.error('Wake all failed:', error);
            showNotification('Wake All failed', true);
        } finally {
            showLoading(false);
        }
    });
    
    // Apply Settings button
    applySettingsBtn.addEventListener('click', async function() {
        currentSettings.ignorePinned = ignorePinnedCheck.checked;
        currentSettings.ignoreAudio = ignoreAudioCheck.checked;
        currentSettings.batteryMode = batteryModeCheck.checked;
        
        showLoading(true);
        try {
            await sendMessage({
                action: 'updateSettings',
                settings: currentSettings
            });
            showNotification('Settings saved!');
            loadStats();
        } catch (error) {
            console.error('Apply settings failed:', error);
            showNotification('Apply failed', true);
        } finally {
            showLoading(false);
        }
    });
    
    // Reset Settings button
    resetSettingsBtn.addEventListener('click', async function() {
        currentSettings = {
            sleepTimer: 15,
            ignorePinned: true,
            ignoreAudio: true,
            batteryMode: true
        };
        
        // Update UI
        timerButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.minutes == '15') {
                btn.classList.add('active');
            }
        });
        
        ignorePinnedCheck.checked = true;
        ignoreAudioCheck.checked = true;
        batteryModeCheck.checked = true;
        
        showLoading(true);
        try {
            await sendMessage({
                action: 'updateSettings',
                settings: currentSettings
            });
            showNotification('Settings reset!');
            loadStats();
        } catch (error) {
            console.error('Reset failed:', error);
            showNotification('Reset failed', true);
        } finally {
            showLoading(false);
        }
    });
    
    // Load statistics from background
    function loadStats() {
        sendMessage({ action: 'getStats' })
            .then((response) => {
                if (!response) return;

                totalTabsEl.textContent = response.total || 0;
                sleepingTabsEl.textContent = response.sleeping || 0;
                activeTabsEl.textContent = response.active || 0;
                memorySavedEl.textContent = response.memorySaved || 0;

                // Update battery estimate
                const batterySave = response.batterySaved || 0;
                batteryEstimateEl.textContent = `⚡ Estimated battery saving: ${batterySave}%`;

                // Update settings display
                currentSettings = response.settings || currentSettings;

                // Update timer button
                timerButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.minutes == currentSettings.sleepTimer) {
                        btn.classList.add('active');
                    }
                });

                // Update checkboxes
                ignorePinnedCheck.checked = currentSettings.ignorePinned;
                ignoreAudioCheck.checked = currentSettings.ignoreAudio;
                batteryModeCheck.checked = currentSettings.batteryMode;
            })
            .catch((error) => {
                console.error('Error loading stats:', error);
                if (lastUpdateEl) {
                    lastUpdateEl.textContent = 'Service worker unavailable';
                }
            })
            .finally(updateLastUpdateTime);
    }

    function sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (response?.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response);
            });
        });
    }
    
    // Show/hide loading overlay
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    // Update last update time
    function updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        if (lastUpdateEl) {
            lastUpdateEl.textContent = `Updated ${timeString}`;
        }
    }
    
    // Show notification
    function showNotification(message, isError = false) {
        // Create temp notification
        const notification = document.createElement('div');
        notification.className = isError ? 'toast-notification error' : 'toast-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
    
    // Auto-refresh stats every 5 seconds
    setInterval(loadStats, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
} else {
    initPopup();
}

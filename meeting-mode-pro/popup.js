class MeetingMode {
    constructor() {
        this.isActive = false;
        this.hiddenTabs = new Set();
        this.settings = {
            autoHideNotifications: true,
            autoCleanUrls: true,
            timerSound: true,
            actionExtraction: true,
            personalDomains: [
                'facebook.com', 'instagram.com', 'twitter.com',
                'youtube.com', 'netflix.com', 'reddit.com',
                'whatsapp.com', 'tiktok.com', 'pinterest.com'
            ],
            workDomains: [
                'docs.google.com', 'github.com', 'gitlab.com',
                'notion.so', 'figma.com', 'slack.com',
                'teams.microsoft.com', 'zoom.us', 'meet.google.com'
            ]
        };
        this.meetingTimer = {
            active: false,
            remaining: 0,
            interval: null
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadState();
        this.updateUI();
        this.setupEventListeners();
        this.setupModalEvents();
        console.log('Meeting Mode Pro initialized');
    }

    async loadSettings() {
        const saved = await chrome.storage.local.get(['meetingModeSettings']);
        if (saved.meetingModeSettings) {
            this.settings = { ...this.settings, ...saved.meetingModeSettings };
        }
        this.updateSettingsUI();
    }

    async loadState() {
        const saved = await chrome.storage.local.get(['meetingModeActive', 'hiddenTabs']);
        this.isActive = saved.meetingModeActive || false;
        this.hiddenTabs = new Set(saved.hiddenTabs || []);
        this.updateToggleUI();
    }

    updateUI() {
        this.updateTabCounts();
        this.updateTimerUI();
    }

    updateToggleUI() {
        const toggle = document.getElementById('meetingToggle');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (toggle) {
            toggle.checked = this.isActive;
        }
        
        if (statusIndicator) {
            statusIndicator.classList.toggle('active', this.isActive);
            const statusText = statusIndicator.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = this.isActive ? 'Active' : 'Inactive';
            }
        }
    }

    updateSettingsUI() {
        const bind = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.checked = value;
        };
        bind('autoHideNotifications', this.settings.autoHideNotifications);
        bind('autoCleanUrls', this.settings.autoCleanUrls);
        bind('timerSound', this.settings.timerSound);
        bind('actionExtraction', this.settings.actionExtraction);
    }

    setupEventListeners() {
        const add = (id, event, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn);
            else console.warn(`Missing element: #${id}`);
        };

        add('meetingToggle', 'change', (e) => {
            this.toggleMeetingMode(e.target.checked);
        });

        add('hidePersonalBtn', 'click', () => this.hidePersonalTabs());
        add('cleanUrlBtn', 'click', () => this.cleanCurrentUrl());
        add('autoHideNotifications', 'change', (e) =>
            this.updateSetting('autoHideNotifications', e.target.checked)
        );

        add('autoCleanUrls', 'change', (e) =>
            this.updateSetting('autoCleanUrls', e.target.checked)
        );

        add('timerSound', 'change', (e) =>
            this.updateSetting('timerSound', e.target.checked)
        );

        add('actionExtraction', 'change', (e) =>
            this.updateSetting('actionExtraction', e.target.checked)
        );

    }


    setupModalEvents() {
        const agendaModal = document.getElementById('agendaModal');
        const timerModal = document.getElementById('timerModal');
        if (!agendaModal || !timerModal) return;

        const cancelAgenda = document.getElementById('cancelAgenda');
        const saveAgenda = document.getElementById('saveAgenda');
        const clearAgendaBtn = document.getElementById('clearAgendaBtn');
        const agendaTemplateBtn = document.getElementById('agendaTemplateBtn');
        const agendaText = document.getElementById('agendaText');
        const timerBtn = document.getElementById('timerBtn');
        const agendaBtn = document.getElementById('agendaBtn');
        const startTimer = document.getElementById('startTimer');
        const pauseTimer = document.getElementById('pauseTimer');
        const resetTimer = document.getElementById('resetTimer');
        const hoursInput = document.getElementById('hours');
        const minutesInput = document.getElementById('minutes');

        agendaBtn?.addEventListener('click', () => {
            agendaModal.classList.add('active');
            this.loadAgenda();
        });

        cancelAgenda?.addEventListener('click', () => {
            agendaModal.classList.remove('active');
        });

        saveAgenda?.addEventListener('click', () => {
            this.saveAgenda();
            agendaModal.classList.remove('active');
        });
        clearAgendaBtn?.addEventListener('click', () => {
            this.clearAgendaDraft();
        });
        agendaTemplateBtn?.addEventListener('click', () => {
            this.insertAgendaTemplate();
        });
        agendaText?.addEventListener('input', () => {
            this.renderAgendaPreview(agendaText.value);
        });

        timerBtn?.addEventListener('click', () => {
            timerModal.classList.add('active');
        });
        startTimer?.addEventListener('click', () => {
            this.startMeetingTimer(null);
        });
        pauseTimer?.addEventListener('click', () => {
            this.pauseMeetingTimer();
        });
        resetTimer?.addEventListener('click', () => {
            this.resetMeetingTimer();
            this.updateTimeDisplay();
        });
        hoursInput?.addEventListener('input', () => this.updateTimeDisplay());
        minutesInput?.addEventListener('input', () => this.updateTimeDisplay());

        agendaModal.addEventListener('click', (event) => {
            if (event.target === agendaModal) {
                agendaModal.classList.remove('active');
            }
        });
        timerModal.addEventListener('click', (event) => {
            if (event.target === timerModal) {
                timerModal.classList.remove('active');
            }
        });
    }

    async toggleMeetingMode(enable) {
        this.isActive = enable;
        
        await chrome.storage.local.set({ 
            meetingModeActive: this.isActive 
        });

        this.updateToggleUI();

        if (enable) {
            await this.activateMeetingMode();
            this.showNotification('Meeting Mode Activated', 'Personal tabs are now hidden');
        } else {
            await this.deactivateMeetingMode();
            this.showNotification('Meeting Mode Deactivated', 'All tabs restored');
        }

        this.updateTabCounts();
    }

    async activateMeetingMode() {
        // Hide personal tabs
        await this.hidePersonalTabs();
        
        // Hide notifications if enabled
        if (this.settings.autoHideNotifications) {
            await this.hideNotifications();
        }
        
        // Start meeting timer
        this.startMeetingTimer(60); // Default 60 minutes
        
        // Inject sidebar
        await this.injectMeetingSidebar();
        
        // Send message to background
        chrome.runtime.sendMessage({
            action: 'meetingModeActivated',
            data: { active: true }
        });
    }

    async deactivateMeetingMode() {
        // Restore hidden tabs
        await this.restoreHiddenTabs();
        
        // Remove sidebar
        await this.removeMeetingSidebar();
        
        // Stop timer
        this.stopMeetingTimer();
        
        // Send message to background
        chrome.runtime.sendMessage({
            action: 'meetingModeDeactivated',
            data: { active: false }
        });
    }

    async hidePersonalTabs() {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const personalDomains = this.getPersonalDomains();
        const tabsToHide = [];

        for (const tab of tabs) {
            if (tab.url && this.isDomainInList(tab.url, personalDomains)) {
                tabsToHide.push(tab.id);
                this.hiddenTabs.add(tab.id);
            }
        }

        if (tabsToHide.length === 0) return;

        try {
            // 👉 NEW APPROACH: First create a group, then hide it
            const groupId = await chrome.tabs.group({ tabIds: tabsToHide });
            await chrome.tabGroups.update(groupId, { collapsed: true });
            console.log('Personal tabs grouped & collapsed:', groupId);

            await chrome.runtime.sendMessage({
                action: "hidePersonalTabs"
            });

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon48.png",
                title: `${tabsToHide.length} tabs secured`,
                message: "Personal tabs are now grouped and collapsed",
                priority: 2
            });

        } catch (err) {
            console.error('Tab hide/group failed:', err);
        }
    }

    isPersonalTab(url) {
        if (!url) return false;
        
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        return this.settings.personalDomains.some(domain => 
            hostname.includes(domain.toLowerCase())
        );
    }

    isDomainInList(url, domainList) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            return domainList.some(domain => 
                hostname.includes(domain.toLowerCase()) ||
                hostname.endsWith(`.${domain.toLowerCase()}`)
            );
        } catch {
            return false;
        }
    }

    getPersonalDomains() {
        return this.settings.personalDomains || [
            'facebook.com', 'instagram.com', 'twitter.com',
            'youtube.com', 'netflix.com', 'reddit.com',
            'whatsapp.com', 'tiktok.com', 'pinterest.com'
        ];
    }


    isWorkTab(url) {
        if (!url) return false;
        
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        return this.settings.workDomains.some(domain => 
            hostname.includes(domain.toLowerCase())
        );
    }

    async restoreHiddenTabs() {
        try {
            // Ask background to restore (correct place to do it)
            await chrome.runtime.sendMessage({
                action: 'restorePersonalTabs'
            });

            this.hiddenTabs.clear();
            await chrome.storage.local.set({ hiddenTabs: [] });

        } catch (error) {
            console.error('Failed to restore tabs:', error);
        }
    }


    async cleanCurrentUrl() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
            const cleanedUrl = this.cleanUrl(tab.url);
            
            if (cleanedUrl !== tab.url) {
                await chrome.tabs.update(tab.id, { url: cleanedUrl });
                this.showNotification('URL Cleaned', 'Tracking parameters removed');
            }
        }
    }

    cleanUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Remove common tracking parameters
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
                'utm_content', 'fbclid', 'gclid', 'msclkid',
                'ref', 'source', 'campaign', 'medium'
            ];
            
            trackingParams.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            
            // Clean fragment if it contains tracking
            if (urlObj.hash.includes('?')) {
                urlObj.hash = '';
            }
            
            return urlObj.toString();
        } catch (e) {
            return url;
        }
    }

    async updateTabCounts() {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        
        let workCount = 0;
        let personalCount = 0;
        let hiddenCount = this.hiddenTabs.size;
        
        tabs.forEach(tab => {
            if (this.isWorkTab(tab.url)) {
                workCount++;
            } else if (this.isPersonalTab(tab.url)) {
                personalCount++;
            }
        });
        
        // Update UI
        document.getElementById('tabCount').textContent = hiddenCount;
        document.getElementById('workTabCount').textContent = workCount;
        document.getElementById('personalTabCount').textContent = personalCount;
        
        // Calculate time saved (1 minute per hidden tab)
        const timeSaved = hiddenCount;
        document.getElementById('timeSaved').textContent = `${timeSaved}m`;
    }

    async hideNotifications() {
        // This would require additional permissions and implementation
        // For now, we'll just show a notification
        this.showNotification('Notifications Hidden', 'All notifications are temporarily disabled');
    }

    async injectMeetingSidebar() {
        // Inject sidebar into all tabs
        const tabs = await chrome.tabs.query({});
        
        for (const tab of tabs) {
            if (!tab.url || tab.url.startsWith('chrome://')) {
                console.log('Skipping chrome page:', tab.url);
                continue;
            }

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (e) {
                console.log(`Could not inject sidebar into tab ${tab.id}:`, e.message);
            }
        }

    }

    async removeMeetingSidebar() {
        // Send message to all tabs to remove sidebar
        const tabs = await chrome.tabs.query({});
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'removeSidebar'
                });
            } catch (e) {
                // Tab might not have content script
            }
        }
    }

    showTimerModal() {
        document.getElementById('timerModal').classList.add('active');
    }

    updateTimeDisplay() {
        const hoursNode = document.getElementById('hours');
        const minutesNode = document.getElementById('minutes');
        if (!hoursNode || !minutesNode) return;
        const hours = parseInt(hoursNode.value, 10) || 0;
        const minutes = parseInt(minutesNode.value, 10) || 0;
        
        const totalSeconds = (hours * 3600) + (minutes * 60);
        this.meetingTimer.remaining = totalSeconds;
        
        const display = this.formatTime(totalSeconds);
        const remaining = document.getElementById('timeRemaining');
        if (remaining) remaining.textContent = display;
    }

    startMeetingTimer(durationMinutes = null) {
        if (durationMinutes && durationMinutes > 0) {
            this.meetingTimer.remaining = durationMinutes * 60;
        } else if (!this.meetingTimer.remaining) {
            const hours = parseInt(document.getElementById('hours')?.value || '0', 10) || 0;
            const minutes = parseInt(document.getElementById('minutes')?.value || '0', 10) || 0;
            this.meetingTimer.remaining = (hours * 3600) + (minutes * 60);
        }

        if (this.meetingTimer.remaining <= 0) {
            this.showNotification('Invalid Timer', 'Set a timer greater than 0 minutes');
            return;
        }
        
        this.meetingTimer.active = true;
        
        if (this.meetingTimer.interval) {
            clearInterval(this.meetingTimer.interval);
        }
        
        this.meetingTimer.interval = setInterval(() => {
            this.meetingTimer.remaining--;
            
            if (this.meetingTimer.remaining <= 0) {
                this.stopMeetingTimer();
                this.showTimerComplete();
                return;
            }
            
            this.updateTimerUI();
        }, 1000);
        
        this.updateTimerUI();
    }

    pauseMeetingTimer() {
        this.meetingTimer.active = false;
        if (this.meetingTimer.interval) {
            clearInterval(this.meetingTimer.interval);
            this.meetingTimer.interval = null;
        }
        this.updateTimerUI();
    }

    resetMeetingTimer() {
        this.pauseMeetingTimer();
        this.meetingTimer.remaining = 0;
        this.updateTimerUI();
    }

    stopMeetingTimer() {
        this.pauseMeetingTimer();
        this.meetingTimer.remaining = 0;
        this.updateTimerUI();
    }

    updateTimerUI() {
        const remainingNode = document.getElementById('timeRemaining');
        if (remainingNode) {
            remainingNode.textContent = this.meetingTimer.remaining > 0
                ? this.formatTime(this.meetingTimer.remaining)
                : '00:00:00';
        }
    }


    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showTimerComplete() {
        this.showNotification('Meeting Time Complete', 'Your scheduled meeting time has ended');
        
        if (this.settings.timerSound) {
            this.playSound();
        }
    }

    playSound() {
        // Play notification sound
        const audio = new Audio(chrome.runtime.getURL('assets/notification-sound.mp3'));
        audio.play().catch(() => {
            // Fallback to beep if audio file not found
            console.log('\u0007'); // Terminal bell
        });
    }

    showAgendaModal() {
        document.getElementById('agendaModal').classList.add('active');
        this.loadAgenda();
    }

    async loadAgenda() {
        const saved = await chrome.storage.local.get(['meetingAgenda']);
        const agendaText = document.getElementById('agendaText');
        if (!agendaText) return;
        const raw = saved.meetingAgenda;
        const text = typeof raw === 'string' ? raw : (raw?.text || '');
        agendaText.value = text;
        this.renderAgendaPreview(text);
    }

    async saveAgenda() {
        const agendaTextNode = document.getElementById('agendaText');
        if (!agendaTextNode) return;

        const text = agendaTextNode.value.trim();
        const items = this.getAgendaItemsFromText(text);

        await chrome.storage.local.set({
            meetingAgenda: text,
            meetingAgendaMeta: {
                itemCount: items.length,
                updatedAt: new Date().toISOString()
            }
        });
        this.showNotification('Agenda Saved', `${items.length} agenda item(s) saved`);
    }

    getAgendaItemsFromText(text) {
        return String(text || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }

    renderAgendaPreview(text) {
        const preview = document.getElementById('agendaPreview');
        const countNode = document.getElementById('agendaCount');
        if (!preview || !countNode) return;

        const items = this.getAgendaItemsFromText(text);
        countNode.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;

        preview.innerHTML = '';
        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'agenda-preview-empty';
            empty.textContent = 'No agenda items yet.';
            preview.appendChild(empty);
            return;
        }

        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'agenda-preview-item';
            row.textContent = `${index + 1}. ${item}`;
            preview.appendChild(row);
        });
    }

    insertAgendaTemplate() {
        const agendaTextNode = document.getElementById('agendaText');
        if (!agendaTextNode) return;
        if (agendaTextNode.value.trim()) return;

        agendaTextNode.value = [
            'Welcome & introductions',
            'Review previous action items',
            'Project updates',
            'Risks / blockers discussion',
            'Decisions required',
            'New action items and owners'
        ].join('\n');
        this.renderAgendaPreview(agendaTextNode.value);
    }

    clearAgendaDraft() {
        const agendaTextNode = document.getElementById('agendaText');
        if (!agendaTextNode) return;
        agendaTextNode.value = '';
        this.renderAgendaPreview('');
    }

    async updateSetting(key, value) {
        this.settings[key] = value;
        await chrome.storage.local.set({ 
            meetingModeSettings: this.settings 
        });
    }

    openAdvancedSettings() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html')
        });
    }

    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/yourusername/meeting-mode-pro/wiki'
        });
    }

    openFeedback() {
        chrome.tabs.create({
            url: 'https://forms.gle/your-feedback-form'
        });
    }

    showNotification(title, message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title,
            message
        });
    }

    startTabMonitoring() {
        // Monitor tab changes
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (this.isActive && changeInfo.url) {
                this.handleTabUpdate(tabId, changeInfo.url);
            }
        });

        chrome.tabs.onCreated.addListener((tab) => {
            if (this.isActive) {
                this.handleNewTab(tab);
            }
        });
    }

    handleTabUpdate(tabId, newUrl) {
        if (this.isPersonalTab(newUrl)) {
            // Auto-hide new personal tabs
            chrome.tabs.hide(tabId);
            this.hiddenTabs.add(tabId);
            this.updateTabCounts();
        }
    }

    handleNewTab(tab) {
        if (this.isPersonalTab(tab.url)) {
            chrome.tabs.hide(tab.id);
            this.hiddenTabs.add(tab.id);
            this.updateTabCounts();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.meetingMode = new MeetingMode();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetingMode;
}

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const unreadCountEl = document.getElementById('unread-count');
    const totalCountEl = document.getElementById('total-count');
    const priorityCountEl = document.getElementById('priority-count');
    const productivityScoreEl = document.getElementById('productivity-score');
    const emailListEl = document.getElementById('email-list');
    const filterCountEl = document.getElementById('filter-count');
    const emailCountBadge = document.getElementById('email-count-badge');
    const updateInfoEl = document.getElementById('update-info');
    
    let currentFilter = 'all';
    let currentEmails = [];
    let isDarkMode = true;

    function parseEmailDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    // Spam detection keywords
    const spamKeywords = [
        'lottery', 'winner', 'prize', 'congratulations', 'you won', 'free money',
        'viagra', 'cialis', 'pharmacy', 'discount pills', 'cheap meds',
        'bitcoin', 'crypto', 'investment', 'earn money', 'make money fast',
        'work from home', 'get rich', 'passive income', 'financial freedom',
        'urgent reply', 'verify account', 'confirm details', 'account suspended',
        'password reset', 'security alert', 'unauthorized access',
        'paypal', 'bank account', 'credit card', 'ssn', 'social security',
        'nigerian prince', 'inheritance', 'fund transfer',
        'xxx', 'adult', 'dating', 'singles', 'hot girls',
        'click here', 'limited time', 'act now', 'guaranteed',
        'weight loss', 'diet pill', 'free trial', 'no cost', 'risk free'
    ];

    // Theme management
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
        chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    }

    function loadTheme() {
        chrome.storage.local.get(['theme'], (data) => {
            if (data.theme === 'light') {
                isDarkMode = false;
                applyTheme(false);
            } else {
                isDarkMode = true;
                applyTheme(true);
            }
        });
    }

    // Helper functions
    function formatTime(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const diff = Date.now() - date;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return `${Math.floor(mins / 1440)}d ago`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function calculatePriorityScore(email) {
        let score = 0;
        const title = (email.title || '').toLowerCase();
        const summary = (email.summary || '').toLowerCase();
        const urgent = ['urgent', 'asap', 'immediate', 'critical', 'important', 'action required'];
        const medium = ['meeting', 'deadline', 'review', 'approval', 'update', 'follow up'];
        urgent.forEach(w => { if (title.includes(w) || summary.includes(w)) score += 3; });
        medium.forEach(w => { if (title.includes(w) || summary.includes(w)) score += 1; });
        return Math.min(score, 10);
    }

    function isSpam(email) {
        const title = (email.title || '').toLowerCase();
        const summary = (email.summary || '').toLowerCase();
        const sender = (email.authorName || '').toLowerCase();
        
        let spamScore = 0;
        spamKeywords.forEach(keyword => {
            if (title.includes(keyword)) spamScore += 2;
            if (summary.includes(keyword)) spamScore += 1;
            if (sender.includes(keyword)) spamScore += 1;
        });
        
        const capsCount = (title.match(/[A-Z]/g) || []).length;
        if (capsCount > title.length * 0.5 && title.length > 10) spamScore += 2;
        
        if ((title.match(/!/g) || []).length >= 3) spamScore += 2;
        if ((title.match(/\?/g) || []).length >= 3) spamScore += 1;
        
        return spamScore >= 4;
    }

    function categorizeEmail(email) {
        if (isSpam(email)) return 'Spam';
        
        const title = (email.title || '').toLowerCase();
        const summary = (email.summary || '').toLowerCase();
        const sender = (email.authorName || '').toLowerCase();
        
        if (
            title.includes('meeting') ||
            title.includes('project') ||
            title.includes('report') ||
            title.includes('invoice') ||
            summary.includes('deadline') ||
            sender.includes('@') ||
            sender.includes('team') ||
            sender.includes('support')
        ) return 'Work';
        if (title.includes('family') || title.includes('friend') || title.includes('personal') || title.includes('party')) return 'Personal';
        return 'Other';
    }

    function filterEmails(emails, filterType) {
        if (!emails.length) {
            return [];
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
        
        const filtered = emails.filter(email => {
            const date = parseEmailDate(email.issued);
            
            switch(filterType) {
                case 'all':
                    return true;
                case 'unread':
                    return !email.isRead && email.category !== 'Spam';
                case 'priority':
                    return email.priorityScore >= 4 && email.category !== 'Spam';
                case 'today':
                    return date ? date >= today : false;
                case 'week':
                    return date ? date >= weekAgo : false;
                case 'month':
                    return date ? date >= monthAgo : false;
                case 'work':
                    return email.category === 'Work';
                case 'personal':
                    return email.category === 'Personal';
                case 'spam':
                    return email.category === 'Spam';
                default:
                    return true;
            }
        });
        
        return filtered;
    }

    function updateFilteredIndicators(filtered) {
        if (filterCountEl) {
            filterCountEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;
        }

        if (emailCountBadge) {
            emailCountBadge.textContent = `${filtered.length}`;
        }
    }

    function calculateProductivity(emails) {
        const nonSpamEmails = emails.filter(e => e.category !== 'Spam');
        if (!nonSpamEmails.length) return 100;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recent = nonSpamEmails.filter(e => {
            const date = parseEmailDate(e.issued);
            return date ? date >= weekAgo : false;
        });
        let score = Math.max(0, 100 - (recent.length * 2));
        const priority = recent.filter(e => e.priorityScore >= 7).length;
        score -= priority * 3;
        return Math.max(0, Math.min(100, score));
    }

    // Render email list
    function renderEmailList() {
        if (!filterCountEl || !emailListEl) return;
        
        const filtered = filterEmails(currentEmails, currentFilter);
        updateFilteredIndicators(filtered);
        
        if (!filtered.length) {
            emailListEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No emails found</div></div>`;
            return;
        }
        
        const sorted = [...filtered].sort((a, b) => new Date(b.issued) - new Date(a.issued));
        emailListEl.innerHTML = '';
        
        sorted.slice(0, 15).forEach((email, idx) => {
            const div = document.createElement('div');
            div.className = 'email-row';
            
            if (email.category === 'Spam') {
                div.classList.add('spam-email');
            }
            
            let priorityBadge = '';
            if (email.priorityScore >= 8) priorityBadge = '<span class="priority-badge high">🔥 High</span>';
            else if (email.priorityScore >= 5) priorityBadge = '<span class="priority-badge medium">⚠️ Medium</span>';
            else if (email.priorityScore >= 3) priorityBadge = '<span class="priority-badge low">📌 Low</span>';
            
            let categoryBadge = '';
            if (email.category === 'Spam') {
                categoryBadge = '<span class="category-badge spam">🚫 Spam</span>';
            } else {
                categoryBadge = `<span class="category-badge ${email.category?.toLowerCase()}">${email.category || 'Other'}</span>`;
            }
            
            let sender = (email.authorName || 'Unknown').replace(/<[^>]*>/g, '').trim();
            if (sender.length > 25) sender = sender.substring(0, 25);
            
            div.innerHTML = `
                <div class="row-header">
                    <div><span class="sender">${escapeHtml(sender)}</span>${categoryBadge}${priorityBadge}</div>
                    <span class="time">${formatTime(email.issued)}</span>
                </div>
                <div class="subject">${escapeHtml(email.title || 'No subject')}</div>
                <div class="snippet">${escapeHtml((email.summary || '').substring(0, 80))}</div>
                <div class="email-actions">
                    <button class="mark-read-single" data-id="${email.id || idx}">✓ Mark read</button>
                </div>
            `;
            
            const markBtn = div.querySelector('.mark-read-single');
            if (markBtn) {
                markBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const response = await chrome.runtime.sendMessage({
                        type: 'MARK_READ',
                        emailId: email.id
                    });

                    if (response?.success) {
                        await render();
                    } else {
                        alert('Unable to mark this email as read in Gmail.');
                    }
                };
            }
            
            div.onclick = (e) => {
                if (!e.target.classList.contains('mark-read-single')) {
                    chrome.tabs.create({ url: email.link || 'https://mail.google.com/' });
                }
            };
            
            emailListEl.appendChild(div);
        });
    }

    // Update all stats
    async function updateStats() {
        const data = await chrome.storage.local.get(['unreadCount', 'entries', 'todayReceivedCount']);
        const entries = data.entries || [];
        
        currentEmails = entries.map(e => {
            const priority = calculatePriorityScore(e);
            const category = categorizeEmail(e);
            return {
                id: e.id || Math.random(),
                title: e.title || 'No subject',
                authorName: e.authorName || 'Unknown',
                summary: e.summary || '',
                issued: e.issued || '',
                link: e.link || '',
                priorityScore: priority,
                category: category,
                isRead: false
            };
        });
        
        const spamCount = filterEmails(currentEmails, 'spam').length;
        const unreadCount = Number.isFinite(data.unreadCount) ? data.unreadCount : currentEmails.length;
        const nonSpamUnread = currentEmails.filter(e => e.category !== 'Spam').length;
        const todayCount = Number.isFinite(data.todayReceivedCount) ? data.todayReceivedCount : 0;
        const priorityCount = filterEmails(currentEmails, 'priority').length;
        
        if (unreadCountEl) unreadCountEl.textContent = unreadCount;
        if (totalCountEl) totalCountEl.textContent = todayCount;
        if (priorityCountEl) priorityCountEl.textContent = priorityCount;
        if (productivityScoreEl) productivityScoreEl.textContent = calculateProductivity(currentEmails);
        
        const spamFilterBtn = document.querySelector('.filter-btn[data-filter="spam"]');
        if (spamFilterBtn && spamCount > 0) {
            spamFilterBtn.innerHTML = `🚫 Spam (${spamCount})`;
        } else if (spamFilterBtn) {
            spamFilterBtn.innerHTML = `🚫 Spam`;
        }

        const unreadFilterBtn = document.querySelector('.filter-btn[data-filter="unread"]');
        if (unreadFilterBtn && nonSpamUnread > 0) {
            unreadFilterBtn.innerHTML = `Unread (${nonSpamUnread})`;
        } else if (unreadFilterBtn) {
            unreadFilterBtn.innerHTML = 'Unread';
        }
        
        renderEmailList();
    }

    // Main render
    async function render() {
        const data = await chrome.storage.local.get(['loggedIn', 'lastUpdated']);
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('content');
        const notLoggedInEl = document.getElementById('not-logged-in');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (data.loggedIn === false) {
            if (contentEl) contentEl.classList.add('hidden');
            if (notLoggedInEl) notLoggedInEl.classList.remove('hidden');
            return;
        }
        
        if (notLoggedInEl) notLoggedInEl.classList.add('hidden');
        if (contentEl) contentEl.classList.remove('hidden');
        await updateStats();
        
        if (updateInfoEl && data.lastUpdated) {
            updateInfoEl.innerHTML = `<span>🟢 Last updated: ${formatTime(data.lastUpdated)}</span>`;
        }
    }

    function setupFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        
        filterBtns.forEach(btn => {
            const oldHandler = btn._handler;
            if (oldHandler) {
                btn.removeEventListener('click', oldHandler);
            }
            
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const filterValue = btn.getAttribute('data-filter');
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                currentFilter = filterValue;
                renderEmailList();
            };
            
            btn._handler = handler;
            btn.addEventListener('click', handler);
        });
    }

    // Setup dropdowns
    const menuBtn = document.getElementById('menu-btn');
    const exportBtn = document.getElementById('export-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const exportDropdown = document.getElementById('export-dropdown');
    
    if (menuBtn) {
        menuBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if (menuDropdown) menuDropdown.classList.toggle('hidden'); 
            if (exportDropdown) exportDropdown.classList.add('hidden'); 
        };
    }
    
    if (exportBtn) {
        exportBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if (exportDropdown) exportDropdown.classList.toggle('hidden'); 
            if (menuDropdown) menuDropdown.classList.add('hidden'); 
        };
    }
    
    document.onclick = () => { 
        if (menuDropdown) menuDropdown.classList.add('hidden'); 
        if (exportDropdown) exportDropdown.classList.add('hidden'); 
    };
    
    // Export handlers
    document.querySelectorAll('[data-format]').forEach(item => {
        item.onclick = async () => {
            const format = item.dataset.format;
            if (format === 'csv') {
                const headers = ['From', 'Subject', 'Date', 'Priority', 'Category'];
                const rows = currentEmails.map(e => [`"${e.authorName}"`, `"${e.title}"`, e.issued, e.priorityScore, e.category]);
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gmail_analytics_${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                alert('✓ CSV exported successfully!');
            }
            if (format === 'json') {
                const json = JSON.stringify({ 
                    exported: new Date().toISOString(), 
                    total: currentEmails.length,
                    emails: currentEmails 
                }, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gmail_analytics_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert('✓ JSON exported successfully!');
            }
            if (exportDropdown) exportDropdown.classList.add('hidden');
        };
    });
    
    // Menu actions
    document.querySelectorAll('[data-action]').forEach(item => {
        item.onclick = async () => {
            const action = item.dataset.action;
            if (action === 'digest') {
                const spamCount = filterEmails(currentEmails, 'spam').length;
                const nonSpamCount = currentEmails.length - spamCount;
                alert(`📊 Email Digest\n\n` +
                      `📧 Unread: ${nonSpamCount}\n` +
                      `🚫 Spam: ${spamCount}\n` +
                      `⭐ Priority: ${filterEmails(currentEmails, 'priority').length}\n` +
                      `📅 Today: ${filterEmails(currentEmails, 'today').length}\n` +
                      `📈 This Week: ${filterEmails(currentEmails, 'week').length}\n` +
                      `🎯 Productivity: ${calculateProductivity(currentEmails)}/100`);
            }
            if (action === 'backup') {
                const data = await chrome.storage.local.get(null);
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gmail_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert('✓ Backup created successfully!');
            }
            if (action === 'settings') {
                alert('⚙️ Settings\n\nQuick Filters:\n• All - Shows all emails\n• Priority - High importance emails (score >= 7)\n• Today - Emails from today\n• This Week - Last 7 days\n• This Month - Last 30 days\n• Work - Work related emails\n• Personal - Personal emails\n• Spam - Detected spam\n\nSpam Detection: Enabled\nDark/Light Mode: Available');
            }
            if (menuDropdown) menuDropdown.classList.add('hidden');
        };
    });

    // Button handlers
    const inboxBtn = document.getElementById('inbox-btn');
    const loginBtn = document.getElementById('login-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const smartScanBtn = document.getElementById('smart-scan-btn');
    const markReadBtn = document.getElementById('mark-read-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (inboxBtn) inboxBtn.onclick = () => chrome.tabs.create({ url: 'https://mail.google.com/' });
    if (loginBtn) loginBtn.onclick = () => chrome.tabs.create({ url: 'https://mail.google.com/' });
    
    if (refreshBtn) {
        refreshBtn.onclick = async () => {
            await chrome.runtime.sendMessage({ type: 'REFRESH' });
            await render();
        };
    }
    
    if (smartScanBtn) {
        smartScanBtn.onclick = async () => {
            await chrome.runtime.sendMessage({ type: 'REFRESH' });
            await render();
            const priorityCount = filterEmails(currentEmails, 'priority').length;
            const spamCount = filterEmails(currentEmails, 'spam').length;
            const todayCount = filterEmails(currentEmails, 'today').length;
            const weekCount = filterEmails(currentEmails, 'week').length;
            alert(`🔍 Smart Scan Complete!\n\n` +
                  `📊 Priority: ${priorityCount} emails\n` +
                  `🚫 Spam: ${spamCount} emails\n` +
                  `📅 Today: ${todayCount} emails\n` +
                  `📈 This Week: ${weekCount} emails\n` +
                  `📧 Total unread: ${currentEmails.length - spamCount}\n\n` +
                  `💡 Tip: Use the filter buttons above to sort emails!`);
        };
    }
    
    if (markReadBtn) {
        markReadBtn.onclick = async () => {
            const nonSpamEmails = currentEmails.filter(e => e.category !== 'Spam');
            if (!nonSpamEmails.length) return alert('No unread non-spam emails!');
            if (confirm(`Mark all ${nonSpamEmails.length} non-spam emails as read?`)) {
                const response = await chrome.runtime.sendMessage({
                    type: 'MARK_ALL_READ',
                    emailIds: nonSpamEmails.map(email => email.id)
                });

                if (response?.success) {
                    await render();
                    alert('✓ All non-spam emails marked as read!');
                } else {
                    alert(response?.error || 'Unable to mark all emails as read in Gmail.');
                }
            }
        };
    }
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.onclick = () => {
            isDarkMode = !isDarkMode;
            applyTheme(isDarkMode);
        };
    }

    // Initialize
    loadTheme();
    
    // Wait for DOM to be fully ready before setting up filters
    setTimeout(() => {
        setupFilters();
    }, 100);
    
    chrome.storage.onChanged.addListener(() => {
        render();
        setTimeout(() => {
            setupFilters();
        }, 100);
    });
    
    render();
    chrome.runtime.sendMessage({ type: 'REFRESH' });
    setInterval(() => chrome.runtime.sendMessage({ type: 'REFRESH' }), 60000);
});

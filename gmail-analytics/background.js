const GMAIL_URL = "https://mail.google.com/mail/";
const FEED_URL = "https://mail.google.com/mail/feed/atom";
const POLL_INTERVAL = 1;
const OFFSCREEN_PATH = 'offscreen.html';

let lastUnreadCount = 0;
let accessToken = null;
const DEFAULT_ICON_PATH = {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png'
};

function extractThreadId(emailId = '') {
    const match = emailId.match(/:(\d+)$/);
    return match ? match[1] : '';
}

// Get OAuth token
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        accessToken = token;
        resolve(token);
      }
    });
  });
}

async function gmailApiRequest(url, options = {}) {
    if (!accessToken) {
        await getAuthToken();
    }

    let response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        accessToken = null;
        await getAuthToken();
        response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
    }

    return response;
}

function getStartOfTodayForGmailQuery() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const year = startOfDay.getFullYear();
    const month = String(startOfDay.getMonth() + 1).padStart(2, '0');
    const day = String(startOfDay.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

async function getTodayReceivedCount() {
    const afterDate = getStartOfTodayForGmailQuery();
    const query = encodeURIComponent(`after:${afterDate} in:inbox`);
    const response = await gmailApiRequest(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=1`
    );

    if (!response.ok) {
        throw new Error(`Gmail today count failed: ${response.status}`);
    }

    const data = await response.json();
    return data.resultSizeEstimate || 0;
}

async function updateDashboardStats() {
    try {
        const todayReceivedCount = await getTodayReceivedCount();
        await chrome.storage.local.set({
            todayReceivedCount
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
    }
}

// Get unread emails
async function getUnreadCount() {
    try {
        const response = await fetch(FEED_URL + "?zx=" + Date.now() + "-" + Math.random(), {
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                updateIcon('auth_error');
                await chrome.storage.local.set({ loggedIn: false });
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const text = await response.text();
        await ensureOffscreenDocument();

        const responseData = await chrome.runtime.sendMessage({
            type: 'PARSE_XML',
            xmlString: text
        });

        if (responseData && responseData.type === 'PARSE_RESULT') {
            const count = responseData.count;
            const entries = responseData.entries || [];
            
            if (count > lastUnreadCount && count > 0 && lastUnreadCount !== 0) {
                const newEmails = count - lastUnreadCount;
                showNotification(newEmails);
            }
            
            lastUnreadCount = count;
            
            await chrome.storage.local.set({
                unreadCount: count,
                entries: entries,
                lastUpdated: Date.now(),
                loggedIn: true
            });

            await updateDashboardStats();
            
            updateIcon(count);
        }

    } catch (error) {
        console.error('Fetch error:', error);
        updateIcon('error');
    }
}

async function ensureOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ['DOM_PARSER'],
        justification: 'To parse the Gmail Atom feed XML',
    });
}

function showNotification(newEmails) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'New Email Alert',
        message: `You have ${newEmails} new unread email${newEmails > 1 ? 's' : ''}`,
        priority: 2
    });
}

function updateIcon(status) {
    if (status === 'auth_error' || status === 'error') {
        chrome.action.setIcon({ path: DEFAULT_ICON_PATH });
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: [190, 190, 190, 230] });
    } else if (status === 0 || status === "0") {
        chrome.action.setIcon({ path: DEFAULT_ICON_PATH });
        chrome.action.setBadgeText({ text: "" });
    } else {
        chrome.action.setIcon({ path: DEFAULT_ICON_PATH });
        chrome.action.setBadgeBackgroundColor({ color: [208, 0, 24, 255] });
        const badgeText = status > 99 ? "99+" : status.toString();
        chrome.action.setBadgeText({ text: badgeText });
    }
}

async function markAsRead(emailId) {
    try {
        const threadId = extractThreadId(emailId);
        if (!threadId) {
            throw new Error('Missing Gmail thread ID');
        }

        const response = await gmailApiRequest(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`,
            {
                method: 'POST',
                body: JSON.stringify({
                    removeLabelIds: ['UNREAD']
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gmail modify failed: ${response.status}`);
        }

        await getUnreadCount();
        return true;
    } catch (error) {
        console.error('Mark as read error:', error);
        return false;
    }
}

async function markAllAsRead(emailIds) {
    const ids = Array.isArray(emailIds) ? emailIds : [];

    try {
        for (const emailId of ids) {
            const threadId = extractThreadId(emailId);
            if (!threadId) {
                continue;
            }

            const response = await gmailApiRequest(
                `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        removeLabelIds: ['UNREAD']
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Gmail modify failed: ${response.status}`);
            }
        }

        await getUnreadCount();
        return { success: true };
    } catch (error) {
        console.error('Mark all as read error:', error);
        return { success: false, error: error.message };
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'poll') {
        getUnreadCount();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('poll', { periodInMinutes: POLL_INTERVAL });
    getUnreadCount();
});

chrome.runtime.onStartup.addListener(() => {
    getUnreadCount();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REFRESH') {
        getUnreadCount().then(() => {
            sendResponse({ status: 'completed' });
        });
        return true;
    }
    
    if (message.type === 'MARK_READ') {
        markAsRead(message.emailId).then(success => {
            sendResponse({ success });
        });
        return true;
    }

    if (message.type === 'MARK_ALL_READ') {
        markAllAsRead(message.emailIds).then(result => {
            sendResponse(result);
        });
        return true;
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith(GMAIL_URL)) {
        setTimeout(() => getUnreadCount(), 2000);
    }
});

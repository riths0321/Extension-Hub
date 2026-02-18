// Tab Sleep Timer - Content Script
// Adds visual effects when tab sleeps

let isSleeping = false;
let overlay = null;

// Listen for messages from background
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch (message.action) {
        case 'tabSlept':
            showSleepOverlay(message.timestamp);
            break;
        case 'tabWoken':
            removeSleepOverlay();
            break;
    }
});

// Show sleep overlay with blur effect
function showSleepOverlay(timestamp) {
    if (isSleeping) return;
    
    isSleeping = true;
    
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'tab-sleep-timer-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: white;
        font-family: Arial, sans-serif;
        pointer-events: none;
        animation: fadeIn 0.3s ease;
    `;
    
    // Add content
    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const emoji = document.createElement('div');
    emoji.style.cssText = `
        font-size: 64px;
        margin-bottom: 20px;
    `;
    emoji.textContent = '😴';
    
    const title = document.createElement('h2');
    title.style.cssText = `
        font-size: 24px;
        margin-bottom: 10px;
        font-weight: normal;
    `;
    title.textContent = 'Tab Sleeping';
    
    const desc = document.createElement('p');
    desc.style.cssText = `
        font-size: 14px;
        opacity: 0.8;
        margin-bottom: 20px;
    `;
    desc.textContent = 'This tab was automatically slept to save memory';
    
    const time = document.createElement('p');
    time.style.cssText = `
        font-size: 12px;
        opacity: 0.6;
    `;
    
    const date = new Date(timestamp);
    time.textContent = `Slept at ${date.toLocaleTimeString()}`;
    
    content.appendChild(emoji);
    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(time);
    overlay.appendChild(content);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
}

// Remove sleep overlay
function removeSleepOverlay() {
    if (overlay && overlay.parentNode) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            isSleeping = false;
            overlay = null;
        }, 300);
        
        // Add fade out animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        setTimeout(() => style.remove(), 300);
    }
}

// Check initial state (if page was restored from discard)
if (document.visibilityState === 'hidden') {
    // Page might be restored from cache/discard
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'checkSleepState' }, function(response) {
            if (response && response.isSleeping) {
                showSleepOverlay(Date.now());
            }
        });
    }, 1000);
}
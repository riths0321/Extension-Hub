// ── popup.js — Email Extractor Pro ───────────────────────────────
// CSP Safe · No innerHTML · No eval · Premium Features

function createIcon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");

  if (name === "copy") {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x","9"); rect.setAttribute("y","9");
    rect.setAttribute("width","13"); rect.setAttribute("height","13");
    rect.setAttribute("rx","2"); rect.setAttribute("stroke","currentColor");
    rect.setAttribute("stroke-width","2");

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");
    path.setAttribute("stroke","currentColor");
    path.setAttribute("stroke-width","2");

    svg.append(rect,path);
  }

  if (name === "check") {
    const poly = document.createElementNS(ns,"polyline");
    poly.setAttribute("points","20 6 9 17 4 12");
    poly.setAttribute("stroke","currentColor");
    poly.setAttribute("stroke-width","2");
    poly.setAttribute("stroke-linecap","round");
    poly.setAttribute("stroke-linejoin","round");
    svg.appendChild(poly);
  }

  return svg;
}

// DOM elements
const DOM = {
  extractBtn: document.getElementById('extractBtn'),
  copyAllBtn: document.getElementById('copyAllBtn'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  emailList: document.getElementById('emailList'),
  emailCount: document.getElementById('emailCount'),
  domainCount: document.getElementById('domainCount'),
  emailCountBadge: document.getElementById('emailCountBadge'),
  emptyState: document.getElementById('emptyState'),
  toast: document.getElementById('toast')
};

let extractedEmails = [];
let isProcessing = false;
let currentTabId = null;

// Initialize - Get current tab and load ONLY its emails
async function initialize() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      currentTabId = tab.id;
      
      // Load emails for this specific tab only
      const storageKey = `emails_${tab.id}`;
      chrome.storage.local.get([storageKey], (result) => {
        if (result[storageKey] && Array.isArray(result[storageKey])) {
          extractedEmails = result[storageKey];
        } else {
          extractedEmails = [];
        }
        displayEmails();
      });
    }
  } catch (error) {
    console.error('Initialization error:', error);
    extractedEmails = [];
    displayEmails();
  }
}

// Call initialize when popup opens
initialize();

// Extract emails from current page
DOM.extractBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  isProcessing = true;

  // Save original children
  const originalNodes = Array.from(DOM.extractBtn.childNodes);

  // ---- loading UI ----
  DOM.extractBtn.replaceChildren();
  DOM.extractBtn.classList.add('loading');
  DOM.extractBtn.disabled = true;

  const spinner = document.createElementNS("http://www.w3.org/2000/svg","svg");
  spinner.setAttribute("width","20");
  spinner.setAttribute("height","20");
  spinner.setAttribute("viewBox","0 0 24 24");
  spinner.classList.add("btn-icon");

  const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
  circle.setAttribute("cx","12");
  circle.setAttribute("cy","12");
  circle.setAttribute("r","10");
  circle.setAttribute("stroke","currentColor");
  circle.setAttribute("stroke-width","2");
  circle.setAttribute("fill","none");

  spinner.appendChild(circle);

  const label = document.createElement("span");
  label.textContent = "Extracting...";

  DOM.extractBtn.append(spinner, label);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      showToast('No active tab found', 'error');
      return;
    }

    if (!/^https?:/.test(tab.url)) {
      showToast('Cannot extract from browser internal pages', 'error');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractEmailsFromPage,
      world: 'MAIN'
    });

    const newEmails = results?.[0]?.result || [];
    extractedEmails = [...new Set(newEmails)].sort();

    await chrome.storage.local.set({ [`emails_${tab.id}`]: extractedEmails });

    displayEmails();

    showToast(`${extractedEmails.length} email(s) found`, 'success');

  } catch (error) {
    console.error(error);
    showToast('Error extracting emails', 'error');
  } finally {

    // ---- restore original button ----
    DOM.extractBtn.replaceChildren(...originalNodes);
    DOM.extractBtn.classList.remove('loading');
    DOM.extractBtn.disabled = false;
    isProcessing = false;
  }
});

// Extract emails from page (injected function)
function extractEmailsFromPage() {
  // Comprehensive email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Get all text from the page
  const pageText = document.body.innerText || '';
  const pageHTML = document.body.innerHTML || '';
  
  // Get mailto links
  const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
    .map(a => a.getAttribute('href').replace('mailto:', '').split('?')[0].trim())
    .filter(email => email && email.includes('@'));
  
  // Extract from text and HTML
  const textEmails = pageText.match(emailRegex) || [];
  const htmlEmails = pageHTML.match(emailRegex) || [];
  
  // Combine all sources
  const allEmails = [...new Set([...textEmails, ...htmlEmails, ...mailtoLinks])];
  
  // Filter out invalid emails
  return allEmails.filter(email => {
    if (!email || typeof email !== 'string') return false;
    
    email = email.toLowerCase().trim();
    if (email.length < 5 || email.length > 254) return false;
    
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [localPart, domain] = parts;
    if (!localPart || !domain) return false;
    if (localPart.length > 64) return false;
    if (!domain.includes('.') || domain.length < 4) return false;
    
    // Exclude common placeholder domains
    const excludeDomains = [
      'example.com', 'domain.com', 'email.com', 'test.com', 
      'sample.com', 'placeholder.com', 'yourdomain.com', 
      'yoursite.com', 'company.com', 'mysite.com', 'website.com'
    ];
    
    return !excludeDomains.some(excluded => domain === excluded);
  });
}

// Display emails in the list
function displayEmails() {
  // Clear current list
  DOM.emailList.replaceChildren();
  
  // Update counts
  const count = extractedEmails.length;
  DOM.emailCount.textContent = count;
  if (DOM.emailCountBadge) DOM.emailCountBadge.textContent = count;
  
  // Calculate unique domains
  const domains = new Set(extractedEmails.map(email => email.split('@')[1]).filter(Boolean));
  DOM.domainCount.textContent = domains.size;

  // Handle empty state
  if (count === 0) {
    updateEmptyState(true);
    return;
  }

  // Hide empty state, enable buttons
  DOM.emptyState.style.display = 'none';
  DOM.copyAllBtn.disabled = false;
  DOM.exportBtn.disabled = false;
  DOM.clearBtn.disabled = false;

  // Create email items with staggered animation
  extractedEmails.forEach((email, index) => {
    const emailItem = createEmailElement(email, index);
    DOM.emailList.appendChild(emailItem);
  });
}

// Create email element (CSP safe)
function createEmailElement(email, index) {
  const emailItem = document.createElement('div');
  emailItem.className = 'email-item';
  emailItem.style.animationDelay = `${index * 0.05}s`;
  
  // Avatar with first letter
  const avatar = document.createElement('div');
  avatar.className = 'email-avatar';
  avatar.textContent = email.charAt(0).toUpperCase();
  
  // Content container
  const content = document.createElement('div');
  content.className = 'email-content';
  
  // Email text with highlighted domain
  const emailText = document.createElement('div');
  emailText.className = 'email-text';
  
  const [localPart, domain] = email.split('@');
  emailText.textContent = "";
  emailText.append(localPart + "@");

  const span = document.createElement("span");
  span.className = "email-domain";
  span.textContent = domain;

  emailText.appendChild(span);

  
  // Domain meta
  const meta = document.createElement('div');
  meta.className = 'email-meta';
  meta.textContent = domain;
  
  content.appendChild(emailText);
  content.appendChild(meta);
  
  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-copy-single';
  copyBtn.textContent = "";
  copyBtn.appendChild(createIcon("copy"));
  copyBtn.append(" Copy");

  
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(email, copyBtn);
  });
  
  emailItem.appendChild(avatar);
  emailItem.appendChild(content);
  emailItem.appendChild(copyBtn);
  
  return emailItem;
}

// Update empty state
function updateEmptyState(show = true) {
  if (show) {
    DOM.emptyState.style.display = 'flex';
    DOM.copyAllBtn.disabled = true;
    DOM.exportBtn.disabled = true;
    DOM.clearBtn.disabled = true;
  } else {
    DOM.emptyState.style.display = 'none';
  }
}

async function copyToClipboard(email, button) {
  try {
    await navigator.clipboard.writeText(email);

    // Save original child nodes safely
    const originalNodes = Array.from(button.childNodes);

    // Clear button safely
    button.replaceChildren();
    button.appendChild(createIcon("check"));
    button.append(" Copied!");
    button.classList.add('copied');

    showToast(`Copied: ${email}`, 'success');

    setTimeout(() => {
      button.replaceChildren(...originalNodes);
      button.classList.remove('copied');
    }, 2000);

  } catch (error) {
    showToast('Failed to copy to clipboard', 'error');
  }
}

// Copy all emails to clipboard
DOM.copyAllBtn.addEventListener('click', async () => {
  try {
    const emailText = extractedEmails.join('\n');
    await navigator.clipboard.writeText(emailText);
    showToast(`✅ Copied ${extractedEmails.length} email${extractedEmails.length > 1 ? 's' : ''} to clipboard!`, 'success');
  } catch (error) {
    showToast('❌ Failed to copy emails', 'error');
  }
});

// Export emails as CSV
DOM.exportBtn.addEventListener('click', () => {
  try {
    // Create CSV content
    const headers = 'Email Address,Domain\n';
    const rows = extractedEmails.map(email => {
      const domain = email.split('@')[1] || '';
      return `${email},${domain}`;
    }).join('\n');
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `emails-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
    showToast(`✅ Exported ${extractedEmails.length} emails to CSV`, 'success');
  } catch (error) {
    showToast('❌ Failed to export emails', 'error');
  }
});

// Clear all emails for current tab only
DOM.clearBtn.addEventListener('click', () => {
  if (extractedEmails.length === 0) return;
  
  if (confirm('Are you sure you want to clear all emails from this page?')) {
    // Clear from memory
    extractedEmails = [];
    
    // Clear from storage for current tab
    if (currentTabId) {
      const storageKey = `emails_${currentTabId}`;
      chrome.storage.local.remove(storageKey, () => {
        displayEmails();
        showToast('🗑️ All emails cleared for this page', 'info');
      });
    } else {
      displayEmails();
      showToast('🗑️ All emails cleared', 'info');
    }
  }
});

// Show toast notification
function showToast(message, type = 'success') {
  const toast = DOM.toast;
  const toastIcon = toast.querySelector('.toast-icon');
  const toastMessage = toast.querySelector('.toast-message');
  
  // Set icon based on type
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  toastIcon.textContent = icons[type] || 'ℹ️';
  toastMessage.textContent = message.replace(/[✅❌ℹ️🗑️]/g, '').trim();
  
  // Set toast type
  toast.className = `toast ${type}`;
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide after delay
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + E to extract
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    DOM.extractBtn.click();
  }
  // Escape to clear
  if (e.key === 'Escape' && extractedEmails.length > 0) {
    DOM.clearBtn.click();
  }
});

// Error boundary for async operations
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showToast('⚠️ An unexpected error occurred', 'error');
});

// Listen for tab changes (optional - to show warning)
chrome.tabs.onActivated.addListener(() => {
  // We don't auto-clear here because popup might not be open
  // Instead, we'll check when popup opens
});
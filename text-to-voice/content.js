// Content script for page reading with highlighting and auto-scroll
let currentHighlightElement = null;
let isReading = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "readPage") {
    readPageContent();
  } else if (request.action === "readSelection") {
    readSelection();
  }
});

function readPageContent() {
  const mainContent = extractMainContent();
  if (mainContent) {
    // Send to popup or read directly
    chrome.storage.local.set({ selectedText: mainContent }, () => {
      chrome.action.openPopup();
    });
  }
}

function readSelection() {
  const selection = window.getSelection().toString();
  if (selection) {
    chrome.storage.local.set({ selectedText: selection }, () => {
      chrome.action.openPopup();
    });
  }
}

function extractMainContent() {
  const articleSelectors = [
    'article', '[role="main"]', '.post-content', '.article-content',
    '.content', 'main', '.entry-content', '.post-body', '.blog-post'
  ];
  
  for (const selector of articleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.length > 200) {
      return element.innerText.trim();
    }
  }
  
  return document.body.innerText.trim();
}

// Listen for speech events from popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.isSpeaking && changes.isSpeaking.newValue) {
    if (changes.highlightText) {
      highlightText(changes.highlightText.newValue);
    }
  }
});

function highlightText(text) {
  // Remove previous highlights
  if (currentHighlightElement) {
    currentHighlightElement.classList.remove("tts-highlight");
  }
  
  // Find and highlight current sentence
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.textContent.includes(text)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.includes(text)) {
      const span = document.createElement("mark");
      span.className = "tts-highlight";
      span.style.backgroundColor = "#ffeb3b";
      span.style.transition = "background-color 0.3s";
      node.parentNode.replaceChild(span, node);
      span.appendChild(node);
      currentHighlightElement = span;
      
      // Auto-scroll
      span.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
  }
}
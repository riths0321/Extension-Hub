// ===============================
// QuickShot – Content Script (MV3, Reviewer-Safe)
// ===============================

console.log('🚀 QUICKSHOT CONTENT SCRIPT LOADED on page:', window.location.href);

// Listen for message from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received message:', request.action);

  if (request.action === 'QS_START_SELECTION') {
    console.log('✅ Starting selection overlay...');
    startSelectionOverlay();
    sendResponse({ status: 'ok', message: 'Selection started' });
    return true;
  }

  // Add this to handle any other messages
  console.log('⚠️ Unknown action received:', request.action);
  sendResponse({ status: 'error', message: 'Unknown action' });
  return true;
});

function startSelectionOverlay() {
  console.log('🎯 Starting selection overlay...');

  // Remove existing overlay if present
  document.getElementById('qs-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'qs-overlay';

  document.body.appendChild(overlay);

  let startX, startY, isDragging = false;
  const selectionBox = document.createElement('div');
  selectionBox.className = 'qs-selection-box';
  overlay.appendChild(selectionBox);

  // Add instructions
  const instructions = document.createElement('div');
  instructions.className = 'qs-instructions';
  instructions.textContent = 'Drag to select area • Press ESC to cancel';
  overlay.appendChild(instructions);

  // Add cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'qs-cancel-btn';
  cancelBtn.textContent = '✕ Cancel';
  cancelBtn.addEventListener('click', () => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  overlay.appendChild(cancelBtn);

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';

    instructions.textContent = 'Release mouse to capture';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';

    // Update instructions with size
    instructions.textContent = `${width} × ${height} pixels • Release to capture`;
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!isDragging) return;

    isDragging = false;
    const rect = selectionBox.getBoundingClientRect();

    // Remove overlay
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    if (rect.width < 10 || rect.height < 10) {
      console.log('⚠️ Selection too small, ignoring');
      return;
    }

    console.log('📏 Selected area:', rect);

    // Send viewport-relative coordinates for cropping the viewport screenshot
    const coords = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      devicePixelRatio: window.devicePixelRatio,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    console.log('📤 Sending coordinates to background:', coords);

    chrome.runtime.sendMessage({
      action: 'selection_completed',
      coords: coords
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to send selection coords:', chrome.runtime.lastError.message);
      } else {
        console.log('✅ Selection coords sent, response:', response);
      }
    });
  });

  // ESC key to cancel
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.removeEventListener('keydown', handleKeyDown);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
}

console.log('✅ QuickShot content script initialized');
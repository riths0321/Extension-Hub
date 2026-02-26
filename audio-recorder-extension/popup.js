let currentTabId = null;
let recordingStartTime = null;
let timerInterval = null;
let statusInterval = null;

const statusEl = document.getElementById('status');
const statusTextEl = statusEl.querySelector('.status-text');
const timerEl = document.getElementById('timer');
const levelFillEl = document.getElementById('levelFill');
const currentTabEl = document.getElementById('currentTab');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const historyListEl = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const notificationContainer = document.getElementById('notificationContainer');

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initExtension();
});

function setupEventListeners() {
  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  clearHistoryBtn.addEventListener('click', clearHistory);

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'recordingLevel') {
      updateLevelMeter(request.level || 0);
    }

    if (request.action === 'recordingSaved') {
      showNotification(`Saved: ${request.filename}`, 'success');
      loadHistory();
    }

    if (request.action === 'recordingError') {
      showNotification(request.error || 'Recording error', 'error');
      refreshStatus();
    }
  });
}

function initExtension() {
  getCurrentTab();
  loadHistory();
  refreshStatus();

  statusInterval = setInterval(refreshStatus, 1000);
}

async function getCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];

    if (!tab) {
      currentTabEl.textContent = 'No active tab found';
      return;
    }

    currentTabId = tab.id;
    const name = tab.title || tab.url || 'Untitled tab';
    currentTabEl.textContent = name;
  } catch (error) {
    currentTabEl.textContent = 'Unable to read tab details';
    console.error('getCurrentTab failed', error);
  }
}

function refreshStatus() {
  chrome.runtime.sendMessage({ action: 'status' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Status fetch failed', chrome.runtime.lastError.message);
      return;
    }
    applyStatus(response || { recording: false, startedAt: null, level: 0 });
  });
}

function applyStatus(status) {
  const isRecording = Boolean(status.recording);

  if (isRecording) {
    statusEl.classList.add('status-recording');
    statusTextEl.textContent = 'Recording';
    startBtn.disabled = true;
    stopBtn.disabled = false;

    if (status.startedAt && status.startedAt !== recordingStartTime) {
      recordingStartTime = status.startedAt;
      startTimer();
    }

    if (!timerInterval && recordingStartTime) {
      startTimer();
    }

    updateLevelMeter(status.level || 0);
    return;
  }

  statusEl.classList.remove('status-recording');
  statusTextEl.textContent = 'Ready';
  startBtn.disabled = false;
  stopBtn.disabled = true;
  stopTimer();
  updateLevelMeter(0);
}

function startTimer() {
  clearTimerInterval();
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  clearTimerInterval();
  recordingStartTime = null;
  timerEl.textContent = '00:00:00';
}

function clearTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!recordingStartTime) {
    timerEl.textContent = '00:00:00';
    return;
  }

  const elapsed = Date.now() - recordingStartTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function startRecording() {
  if (!currentTabId) {
    showNotification('No active tab available for recording', 'error');
    return;
  }

  try {
    const tab = await chrome.tabs.get(currentTabId);
    if (tab && tab.audible === false) {
      const proceed = confirm('This tab is currently silent. Start recording anyway?');
      if (!proceed) {
        return;
      }
    }
  } catch (error) {
    console.warn('Could not check tab audible state', error);
  }

  startBtn.disabled = true;
  statusTextEl.textContent = 'Starting...';

  chrome.runtime.sendMessage({ action: 'start', tabId: currentTabId }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification(chrome.runtime.lastError.message, 'error');
      refreshStatus();
      return;
    }

    if (response && response.success) {
      showNotification('Recording started', 'success');
      refreshStatus();
      return;
    }

    showNotification(response?.error || 'Unable to start recording', 'error');
    refreshStatus();
  });
}

function stopRecording() {
  stopBtn.disabled = true;
  statusTextEl.textContent = 'Stopping...';

  chrome.runtime.sendMessage({ action: 'stop' }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification(chrome.runtime.lastError.message, 'error');
      refreshStatus();
      return;
    }

    if (response && response.success) {
      showNotification('Recording stopped', 'info');
      refreshStatus();
      return;
    }

    showNotification(response?.error || 'Unable to stop recording', 'error');
    refreshStatus();
  });
}

function loadHistory() {
  chrome.runtime.sendMessage({ action: 'getHistory' }, (recordings) => {
    if (chrome.runtime.lastError) {
      showNotification('Could not load recording history', 'error');
      return;
    }

    renderHistory(recordings || []);
  });
}

function renderHistory(recordings) {
  historyListEl.textContent = '';

  if (!recordings.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-history';
    empty.textContent = 'No recordings yet';
    historyListEl.appendChild(empty);
    return;
  }

  recordings.forEach((recording) => {
    const item = document.createElement('article');
    item.className = 'history-item';
    item.title = recording.filename;

    const file = document.createElement('div');
    file.className = 'history-filename';
    file.textContent = recording.filename;

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const size = document.createElement('span');
    size.textContent = formatSize(recording.size || 0);

    const date = document.createElement('span');
    const timestamp = recording.timestamp ? new Date(recording.timestamp) : new Date();
    date.textContent = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    meta.append(size, date);
    item.append(file, meta);
    historyListEl.appendChild(item);
  });
}

function clearHistory() {
  const accepted = confirm('Clear all recording history?');
  if (!accepted) {
    return;
  }

  chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      showNotification(response?.error || 'Unable to clear history', 'error');
      return;
    }

    renderHistory([]);
    showNotification('History cleared', 'info');
  });
}

function updateLevelMeter(level) {
  const normalized = Math.max(0, Math.min(1, Number(level) || 0));
  levelFillEl.style.width = `${Math.round(normalized * 100)}%`;
}

function showNotification(message, type = 'info') {
  const note = document.createElement('div');
  note.className = `notification notification-${type}`;
  note.textContent = message;
  notificationContainer.appendChild(note);

  setTimeout(() => {
    note.remove();
  }, 2400);
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) {
    return '0 KB';
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

window.addEventListener('beforeunload', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }

  stopTimer();
});

let recordingState = {
  recording: false,
  tabId: null,
  startedAt: null,
  mimeType: null,
  level: 0
};
let hasHydratedState = false;

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['recordings', 'recordingState']);
  if (!Array.isArray(data.recordings)) {
    await chrome.storage.local.set({ recordings: [] });
  }

  if (!data.recordingState) {
    await chrome.storage.local.set({ recordingState });
  }
});

chrome.runtime.onStartup.addListener(() => {
  hydrateState().catch((error) => {
    console.warn('Could not hydrate recording state on startup', error);
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'status':
      getStatus().then(sendResponse);
      return true;

    case 'start':
      startRecording(request.tabId).then(sendResponse);
      return true;

    case 'stop':
      stopRecording().then(sendResponse);
      return true;

    case 'getHistory':
      getHistory().then(sendResponse);
      return true;

    case 'clearHistory':
      clearHistory().then(sendResponse);
      return true;

    case 'recordingComplete':
      saveRecordingFile(request.data, request.mimeType)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'recordingLevel':
      recordingState.level = normalizeLevel(request.level);
      broadcast({ action: 'recordingLevel', level: recordingState.level });
      sendResponse({ success: true });
      return;

    case 'recordingError':
      handleRecordingError(request.error || 'Unknown recording error').then(() => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return;
  }
});

async function hydrateState() {
  if (hasHydratedState) {
    return;
  }

  const data = await chrome.storage.local.get('recordingState');
  if (data.recordingState) {
    recordingState = {
      ...recordingState,
      ...data.recordingState
    };
  }
  hasHydratedState = true;
}

async function persistState() {
  await chrome.storage.local.set({ recordingState });
}

async function getStatus() {
  await hydrateState();
  return {
    recording: recordingState.recording,
    tabId: recordingState.tabId,
    startedAt: recordingState.startedAt,
    mimeType: recordingState.mimeType,
    level: recordingState.level
  };
}

async function startRecording(tabId) {
  await hydrateState();

  if (recordingState.recording) {
    return { success: false, error: 'Recording already in progress' };
  }

  if (!tabId) {
    return { success: false, error: 'Missing tab id' };
  }

  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

    await createOffscreenDocument();

    const response = await chrome.runtime.sendMessage({
      action: 'startRecording',
      streamId
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Could not start offscreen recorder');
    }

    recordingState = {
      recording: true,
      tabId,
      startedAt: Date.now(),
      mimeType: response.mimeType || null,
      level: 0
    };

    await persistState();
    await chrome.action.setBadgeText({ text: 'REC' });
    await chrome.action.setBadgeBackgroundColor({ color: '#d7263d' });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to start recording' };
  }
}

async function stopRecording() {
  await hydrateState();

  if (!recordingState.recording) {
    return { success: false, error: 'No active recording' };
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });
    if (!response?.success) {
      throw new Error(response?.error || 'Could not stop recorder');
    }

    recordingState.recording = false;
    recordingState.tabId = null;
    recordingState.startedAt = null;
    recordingState.level = 0;

    await persistState();
    await chrome.action.setBadgeText({ text: '' });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to stop recording' };
  }
}

async function createOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) {
    return;
  }

  const reasons = [chrome.offscreen.Reason.USER_MEDIA];
  if (chrome.offscreen.Reason.AUDIO_PLAYBACK) {
    reasons.push(chrome.offscreen.Reason.AUDIO_PLAYBACK);
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons,
    justification: 'Capture active tab audio while keeping playback audible'
  });
}

async function saveRecordingFile(base64Data, mimeType) {
  if (!base64Data) {
    return { success: false, error: 'Missing recording data' };
  }

  const normalizedMime = mimeType || 'audio/webm';
  const extension = normalizedMime.includes('mp4') ? 'mp4' : 'webm';
  const filename = buildFilename(extension);
  const dataUrl = `data:${normalizedMime};base64,${base64Data}`;
  const sizeBytes = approximateBase64Bytes(base64Data);

  const firstDownload = await downloadFile({
    url: dataUrl,
    filename,
    saveAs: true,
    conflictAction: 'uniquify'
  });

  let downloadResult = firstDownload;

  if (!firstDownload.success) {
    downloadResult = await downloadFile({
      url: dataUrl,
      filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });
  }

  if (!downloadResult.success) {
    broadcast({ action: 'recordingError', error: downloadResult.error });
    return { success: false, error: downloadResult.error };
  }

  await saveToHistory(filename, sizeBytes, normalizedMime);
  broadcast({ action: 'recordingSaved', filename });

  return { success: true, filename };
}

function downloadFile(options) {
  return new Promise((resolve) => {
    chrome.downloads.download(options, (downloadId) => {
      if (chrome.runtime.lastError || !downloadId) {
        resolve({
          success: false,
          error: chrome.runtime.lastError?.message || 'Download failed'
        });
        return;
      }

      resolve({ success: true, downloadId });
    });
  });
}

async function saveToHistory(filename, size, mimeType) {
  const data = await chrome.storage.local.get('recordings');
  const recordings = Array.isArray(data.recordings) ? data.recordings : [];

  recordings.unshift({
    filename,
    size,
    mimeType,
    timestamp: new Date().toISOString()
  });

  if (recordings.length > 20) {
    recordings.length = 20;
  }

  await chrome.storage.local.set({ recordings });
}

async function getHistory() {
  const data = await chrome.storage.local.get('recordings');
  return Array.isArray(data.recordings) ? data.recordings : [];
}

async function clearHistory() {
  await chrome.storage.local.set({ recordings: [] });
  return { success: true };
}

async function handleRecordingError(errorMessage) {
  recordingState.recording = false;
  recordingState.tabId = null;
  recordingState.startedAt = null;
  recordingState.level = 0;

  await persistState();
  await chrome.action.setBadgeText({ text: '' });
  broadcast({ action: 'recordingError', error: errorMessage });
}

function buildFilename(extension) {
  const now = new Date();
  const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('-');
  return `audio_recording_${date}_${time}.${extension}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function approximateBase64Bytes(base64Text) {
  const clean = String(base64Text || '').replace(/=+$/, '');
  return Math.floor((clean.length * 3) / 4);
}

function normalizeLevel(level) {
  const value = Number(level);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // No popup listener connected.
  });
}

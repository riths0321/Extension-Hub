// background.js — Service Worker (Manifest V3)

let recordingState = {
  recording: false,
  paused: false,
  tabId: null,
  startedAt: null,
  mimeType: null,
  level: 0,
  mode: 'tab'
};

let hasHydratedState = false;

/* ── Formatters (inline — no ES module imports in SW) ─────────────────── */
const Formatters = {
  generateFilename(siteName, mode, format) {
    const d = new Date();
    const dateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    const timeStr = [
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      String(d.getSeconds()).padStart(2, '0')
    ].join('-');
    const site = String(siteName || 'recording')
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 28);
    return `audio_${site}_${mode}_${dateStr}_${timeStr}.${format}`;
  }
};

/* ── Lifecycle ─────────────────────────────────────────────────────────── */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const data = await chrome.storage.local.get(['recordings', 'settings']);
    if (!Array.isArray(data.recordings)) {
      await chrome.storage.local.set({ recordings: [] });
    }
    if (!data.settings) {
      await chrome.storage.local.set({
        settings: { theme: 'light', maxDuration: 0, exportFormat: 'webm' }
      });
    }
  } catch (_) {
    // Ignore install-time storage errors; runtime calls handle defaults.
  }
});

chrome.runtime.onStartup.addListener(() => {
  hydrateState().catch(() => {});
});

/* ── Message Router ────────────────────────────────────────────────────── */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const route = async () => {
    switch (request.action) {
      case 'status':          return getStatus();
      case 'start':           return startRecording(request.tabId, request.mode);
      case 'stop':            return stopRecording();
      case 'pause':           return pauseRecording();
      case 'resume':          return resumeRecording();
      case 'addMarker':       return addMarker(request.label);
      case 'getMarkers':      return getMarkers();
      case 'getHistory':      return getHistory();
      case 'clearHistory':    return clearHistory();
      case 'deleteRecording': return deleteRecording(request.id);
      case 'openRecording':   return openRecording(request.id);
      case 'showRecording':   return showRecording(request.id);
      case 'getSettings':     return getSettings();
      case 'updateSettings':  return updateSettings(request.settings);
      case 'recordingComplete': return saveRecordingFile(request.data, request.mimeType, request.duration, request.markers, request.mode);
      case 'recordingLevel':  return handleLevelUpdate(request.level);
      case 'recordingError':  return handleRecordingError(request.error);
      default: return { success: false, error: 'Unknown action: ' + request.action };
    }
  };
  route().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
  return true; // async
});

/* ── State helpers ─────────────────────────────────────────────────────── */
async function hydrateState() {
  if (hasHydratedState) return;
  const data = await chrome.storage.local.get('recordingState');
  if (data.recordingState) {
    recordingState = { ...recordingState, ...data.recordingState };
  }
  hasHydratedState = true;
}

async function persistState() {
  await chrome.storage.local.set({ recordingState });
}

async function getStatus() {
  await hydrateState();
  return { ...recordingState };
}

/* ── Recording control ─────────────────────────────────────────────────── */
async function startRecording(tabId, mode = 'tab') {
  await hydrateState();

  if (recordingState.recording) {
    return { success: false, error: 'Recording already in progress' };
  }
  if (mode === 'tab' && !tabId) {
    return { success: false, error: 'Missing tab ID' };
  }

  try {
    await createOffscreenDocument();
    let streamId = null;

    if (mode === 'tab') {
      if (!chrome.tabCapture || typeof chrome.tabCapture.getMediaStreamId !== 'function') {
        throw new Error('Tab capture API unavailable. Reload the extension and try again.');
      }
      streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      if (!streamId) {
        throw new Error('Unable to capture tab audio stream');
      }
    }

    const response = await sendToOffscreen({ action: 'startRecording', tabId, mode, streamId });
    if (!response?.success) throw new Error(response?.error || 'Offscreen start failed');

    recordingState = {
      recording: true,
      paused: false,
      tabId: mode === 'tab' ? tabId : null,
      startedAt: Date.now(),
      mimeType: response.mimeType || null,
      level: 0,
      mode
    };

    await persistState();
    await chrome.action.setBadgeText({ text: 'REC' });
    await chrome.action.setBadgeBackgroundColor({ color: '#DC2626' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function stopRecording() {
  await hydrateState();
  if (!recordingState.recording) return { success: false, error: 'No active recording' };

  try {
    const response = await sendToOffscreen({ action: 'stopRecording' });
    if (!response?.success) throw new Error(response?.error || 'Offscreen stop failed');

    recordingState = {
      recording: false, paused: false, tabId: null,
      startedAt: null, mimeType: null, level: 0, mode: 'tab'
    };
    await persistState();
    await chrome.action.setBadgeText({ text: '' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function pauseRecording() {
  if (!recordingState.recording || recordingState.paused) {
    return { success: false, error: 'Cannot pause' };
  }
  try {
    const response = await sendToOffscreen({ action: 'pauseRecording' });
    if (response?.success) {
      recordingState.paused = true;
      await persistState();
      broadcast({ action: 'recordingPaused' });
      return { success: true };
    }
    return { success: false, error: response?.error };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function resumeRecording() {
  if (!recordingState.recording || !recordingState.paused) {
    return { success: false, error: 'Cannot resume' };
  }
  try {
    const response = await sendToOffscreen({ action: 'resumeRecording' });
    if (response?.success) {
      recordingState.paused = false;
      await persistState();
      broadcast({ action: 'recordingResumed' });
      return { success: true };
    }
    return { success: false, error: response?.error };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function addMarker(label) {
  if (!recordingState.recording) return { success: false, error: 'No active recording' };
  try {
    const response = await sendToOffscreen({ action: 'addMarker', label });
    if (response?.success) {
      broadcast({ action: 'markerAdded', marker: response.marker });
      return { success: true, marker: response.marker };
    }
    return { success: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getMarkers() {
  if (!recordingState.recording) return [];
  try {
    const response = await sendToOffscreen({ action: 'getMarkers' });
    return response?.markers || [];
  } catch { return []; }
}

/* ── Level update (hot path — no storage) ─────────────────────────────── */
function handleLevelUpdate(level) {
  const val = Number(level);
  recordingState.level = Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0;
  broadcast({ action: 'recordingLevel', level: recordingState.level });
  return { success: true };
}

/* ── Save recording ────────────────────────────────────────────────────── */
async function saveRecordingFile(base64Data, mimeType, duration, markers, modeOverride) {
  if (!base64Data) return { success: false, error: 'Missing data' };

  const settings = await getSettings();
  const format = settings.exportFormat || 'webm';
  const ext = format === 'wav' ? 'wav' : 'webm';
  const recordingMode = modeOverride === 'mic' ? 'mic' : (modeOverride === 'tab' ? 'tab' : recordingState.mode);

  const filename = await generateFilename(recordingMode, ext);
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  const sizeBytes = Math.floor((base64Data.replace(/=+$/, '').length * 3) / 4);

  const dl = await downloadFile({ url: dataUrl, filename, saveAs: true, conflictAction: 'uniquify' });
  if (!dl.success) {
    broadcast({ action: 'recordingError', error: dl.error });
    return { success: false, error: dl.error };
  }

  await saveToHistory(filename, sizeBytes, mimeType, duration, markers, recordingMode, format, dl.downloadId);
  broadcast({ action: 'recordingSaved', filename, duration, markers });
  return { success: true, filename };
}

function downloadFile(options) {
  return new Promise(resolve => {
    chrome.downloads.download(options, downloadId => {
      if (chrome.runtime.lastError || !downloadId) {
        resolve({ success: false, error: chrome.runtime.lastError?.message || 'Download failed' });
      } else {
        resolve({ success: true, downloadId });
      }
    });
  });
}

async function saveToHistory(filename, size, mimeType, duration, markers, mode, format, downloadId) {
  const data = await chrome.storage.local.get('recordings');
  const recordings = Array.isArray(data.recordings) ? data.recordings : [];
  recordings.unshift({
    id: String(Date.now()),
    filename,
    size: size || 0,
    mimeType,
    duration: duration || 0,
    markers: markers || [],
    mode: mode || 'tab',
    format: format || 'webm',
    downloadId: Number.isInteger(downloadId) ? downloadId : null,
    timestamp: new Date().toISOString()
  });
  if (recordings.length > 50) recordings.length = 50;
  await chrome.storage.local.set({ recordings });
}

/* ── History & Settings ────────────────────────────────────────────────── */
async function getHistory() {
  const data = await chrome.storage.local.get('recordings');
  return Array.isArray(data.recordings) ? data.recordings : [];
}

async function deleteRecording(id) {
  if (!id) return { success: false, error: 'Missing id' };
  const recs = await getHistory();
  const filtered = recs.filter(r => r.id !== id);
  await chrome.storage.local.set({ recordings: filtered });
  return { success: true };
}

async function openRecording(id) {
  const rec = await getRecordingById(id);
  if (!rec) return { success: false, error: 'Recording not found' };

  const downloadId = await findDownloadIdForRecording(rec);
  if (!downloadId) {
    return { success: false, error: 'Downloaded file not found on this device' };
  }

  await openDownload(downloadId);
  return { success: true };
}

async function showRecording(id) {
  const rec = await getRecordingById(id);
  if (!rec) return { success: false, error: 'Recording not found' };

  const downloadId = await findDownloadIdForRecording(rec);
  if (!downloadId) {
    return { success: false, error: 'Downloaded file not found on this device' };
  }

  await showDownload(downloadId);
  return { success: true };
}

async function clearHistory() {
  await chrome.storage.local.set({ recordings: [] });
  return { success: true };
}

async function getSettings() {
  const data = await chrome.storage.local.get('settings');
  return data.settings || { theme: 'light', maxDuration: 0, exportFormat: 'webm' };
}

async function updateSettings(settings) {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ settings: updated });
  return { success: true, settings: updated };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
async function getRecordingById(id) {
  if (!id) return null;
  const history = await getHistory();
  return history.find((rec) => rec.id === id) || null;
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function downloadsSearch(query) {
  return new Promise((resolve) => {
    chrome.downloads.search(query, (items) => {
      if (chrome.runtime.lastError) {
        resolve([]);
      } else {
        resolve(items || []);
      }
    });
  });
}

function openDownload(downloadId) {
  return new Promise((resolve, reject) => {
    chrome.downloads.open(downloadId, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

function showDownload(downloadId) {
  return new Promise((resolve, reject) => {
    chrome.downloads.show(downloadId, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

async function findDownloadIdForRecording(rec) {
  if (Number.isInteger(rec.downloadId)) {
    const byId = await downloadsSearch({ id: rec.downloadId, limit: 1 });
    if (byId.length) return rec.downloadId;
  }

  const filename = String(rec.filename || '').trim();
  if (!filename) return null;

  const filenameRegex = `${escapeRegex(filename)}$`;
  const matches = await downloadsSearch({
    filenameRegex,
    orderBy: ['-startTime'],
    limit: 10
  });
  return matches[0]?.id || null;
}

async function generateFilename(mode, extension) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const title = tabs[0]?.title || 'recording';
    return Formatters.generateFilename(title, mode, extension);
  } catch {
    return Formatters.generateFilename('recording', mode, extension);
  }
}

async function handleRecordingError(errorMessage) {
  recordingState = {
    recording: false, paused: false, tabId: null,
    startedAt: null, mimeType: null, level: 0, mode: 'tab'
  };
  await persistState();
  await chrome.action.setBadgeText({ text: '' });
  broadcast({ action: 'recordingError', error: errorMessage });
  return { success: true };
}

async function createOffscreenDocument() {
  try {
    if (typeof chrome.runtime.getContexts === 'function') {
      const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
      if (contexts.length > 0) return;
    }
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Capture audio from tab or microphone'
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('Only a single offscreen document')) {
      throw error;
    }
  }
}

function sendToOffscreen(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

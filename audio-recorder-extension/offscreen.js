let mediaRecorder = null;
let audioChunks = [];
let currentStream = null;
let audioContext = null;
let sourceNode = null;
let monitorGainNode = null;
let analyserNode = null;
let levelInterval = null;
let recordingMimeType = null;
let stopPromise = null;
let stopResolver = null;
let monitorAudioEl = null;
let isPaused = false;
let markers = [];
let recordingStartTime = null;
let pausedDuration = 0;
let pausedAt = null;
let recordingMode = 'tab';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const handlers = {
    startRecording: () => startRecording(request.tabId, request.mode, request.streamId),
    stopRecording: () => stopRecording(),
    pauseRecording: () => pauseRecording(),
    resumeRecording: () => resumeRecording(),
    addMarker: () => addMarker(request.label),
    getMarkers: () => ({ success: true, markers: [...markers] })
  };

  const handler = handlers[request.action];
  if (!handler) return false;

  Promise.resolve()
    .then(() => handler())
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message || 'Unknown offscreen error' }));

  return true;
});

async function startRecording(tabId, mode, streamId) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    return { success: false, error: 'Recorder already running' };
  }

  try {
    let stream;
    if (mode === 'tab' && tabId) {
      if (!streamId) {
        throw new Error('Missing tab stream ID');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        }
      });
    } else if (mode === 'mic') {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      throw new Error('Invalid mode');
    }

    currentStream = stream;
    await setupLiveAudioRouting(stream);

    recordingMimeType = pickMimeType();
    mediaRecorder = new MediaRecorder(currentStream, {
      mimeType: recordingMimeType,
      audioBitsPerSecond: 128000
    });

    audioChunks = [];
    markers = [];
    isPaused = false;
    pausedDuration = 0;
    pausedAt = null;
    recordingMode = mode;
    recordingStartTime = Date.now();

    stopPromise = new Promise((resolve) => {
      stopResolver = resolve;
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onerror = async (event) => {
      const message = event?.error?.message || 'MediaRecorder error';
      await chrome.runtime.sendMessage({ action: 'recordingError', error: message });
      if (stopResolver) {
        stopResolver();
        stopResolver = null;
      }
      cleanup();
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: recordingMimeType || 'audio/webm' });
      const duration = getElapsedSeconds();

      // Resolve stop request as soon as recorder actually stops.
      if (stopResolver) {
        stopResolver();
        stopResolver = null;
      }

      try {
        await saveRecording(blob, duration);
      } catch (error) {
        await chrome.runtime.sendMessage({
          action: 'recordingError',
          error: error?.message || 'Failed to save recording'
        }).catch(() => {});
      } finally {
        cleanup();
      }
    };

    mediaRecorder.start(1000);

    return {
      success: true,
      mimeType: recordingMimeType
    };
  } catch (error) {
    cleanup();
    return { success: false, error: error.message };
  }
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording' && !isPaused) {
    mediaRecorder.pause();
    isPaused = true;
    pausedAt = Date.now();
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().catch(() => {});
    }
    return { success: true };
  }
  return { success: false, error: 'Cannot pause' };
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused' && isPaused) {
    mediaRecorder.resume();
    if (pausedAt) {
      pausedDuration += Date.now() - pausedAt;
    }
    pausedAt = null;
    isPaused = false;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return { success: true };
  }
  return { success: false, error: 'Cannot resume' };
}

function addMarker(label) {
  if (!recordingStartTime) {
    return { success: false, error: 'No active recording' };
  }

  const elapsed = getElapsedSeconds();
  const marker = {
    timestamp: elapsed,
    label: label || `Marker ${markers.length + 1}`,
    time: new Date().toISOString()
  };
  markers.push(marker);
  return { success: true, marker };
}

async function stopRecording() {
  try {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanup();
      return { success: true };
    }

    mediaRecorder.stop();
    await Promise.race([
      stopPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Stop timed out')), 12000))
    ]);

    return { success: true };
  } catch (error) {
    cleanup();
    return { success: false, error: error.message };
  }
}

async function setupLiveAudioRouting(stream) {
  monitorAudioEl = new Audio();
  monitorAudioEl.autoplay = true;
  monitorAudioEl.muted = false;
  monitorAudioEl.volume = 1;
  monitorAudioEl.srcObject = stream;
  monitorAudioEl.play().catch(() => {});

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(stream);
  monitorGainNode = audioContext.createGain();
  monitorGainNode.gain.value = 1;
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.85;

  sourceNode.connect(analyserNode);
  sourceNode.connect(monitorGainNode);
  monitorGainNode.connect(audioContext.destination);

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const samples = new Uint8Array(analyserNode.frequencyBinCount);

  levelInterval = setInterval(() => {
    if (!analyserNode || isPaused) return;

    analyserNode.getByteFrequencyData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i];
    }
    const avg = sum / samples.length;
    const normalized = Math.max(0, Math.min(1, avg / 255));

    chrome.runtime.sendMessage({
      action: 'recordingLevel',
      level: normalized
    }).catch(() => {});
  }, 100);
}

function pickMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const mime of options) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'audio/webm';
}

async function saveRecording(blob, duration) {
  const exportFormat = await getExportFormat();
  let outputBlob = blob;
  let mimeType = blob.type || recordingMimeType || 'audio/webm';

  if (exportFormat === 'wav') {
    outputBlob = await convertToWav(blob);
    mimeType = 'audio/wav';
  }

  const base64 = await blobToBase64(outputBlob);
  chrome.runtime.sendMessage({
    action: 'recordingComplete',
    data: base64,
    mimeType,
    duration,
    markers,
    mode: recordingMode
  }).catch(() => {});
}

async function getExportFormat() {
  try {
    const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });
    if (settings?.exportFormat === 'wav') {
      return 'wav';
    }
    if (settings?.exportFormat === 'webm') {
      return 'webm';
    }
  } catch (_) {}

  try {
    if (chrome?.storage?.local) {
      const data = await chrome.storage.local.get('settings');
      return data?.settings?.exportFormat === 'wav' ? 'wav' : 'webm';
    }
  } catch (_) {}

  return 'webm';
}

function getElapsedSeconds() {
  if (!recordingStartTime) return 0;
  const currentPause = (isPaused && pausedAt) ? (Date.now() - pausedAt) : 0;
  const elapsedMs = Math.max(0, Date.now() - recordingStartTime - pausedDuration - currentPause);
  return elapsedMs / 1000;
}

async function convertToWav(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    throw new Error('WAV conversion is not supported in this browser');
  }

  const converterContext = new AC();
  try {
    const audioBuffer = await converterContext.decodeAudioData(await blob.arrayBuffer());
    return encodeWavFromAudioBuffer(audioBuffer);
  } finally {
    await converterContext.close().catch(() => {});
  }
}

function encodeWavFromAudioBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samplesPerChannel = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samplesPerChannel * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < samplesPerChannel; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const encoded = value.split(',')[1] || '';
      if (!encoded) {
        reject(new Error('Failed to encode recording'));
        return;
      }
      resolve(encoded);
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function cleanup() {
  if (levelInterval) {
    clearInterval(levelInterval);
    levelInterval = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (_) {}
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (_) {}
  }
  if (monitorGainNode) {
    try { monitorGainNode.disconnect(); } catch (_) {}
  }
  if (analyserNode) {
    try { analyserNode.disconnect(); } catch (_) {}
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
  }
  if (monitorAudioEl) {
    try {
      monitorAudioEl.pause();
      monitorAudioEl.srcObject = null;
    } catch (_) {}
  }

  mediaRecorder = null;
  audioChunks = [];
  currentStream = null;
  audioContext = null;
  sourceNode = null;
  monitorGainNode = null;
  analyserNode = null;
  recordingMimeType = null;
  stopPromise = null;
  stopResolver = null;
  monitorAudioEl = null;
  isPaused = false;
  pausedDuration = 0;
  pausedAt = null;
  recordingStartTime = null;
  markers = [];
  recordingMode = 'tab';
}

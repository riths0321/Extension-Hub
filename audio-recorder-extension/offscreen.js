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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    startRecording(request.streamId).then(sendResponse);
    return true;
  }

  if (request.action === 'stopRecording') {
    stopRecording().then(sendResponse);
    return true;
  }

  return false;
});

async function startRecording(streamId) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    return { success: false, error: 'Recorder already running' };
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        suppressLocalAudio: false,
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    await setupLiveAudioRouting(currentStream);

    recordingMimeType = pickMimeType();
    mediaRecorder = new MediaRecorder(currentStream, {
      mimeType: recordingMimeType,
      audioBitsPerSecond: 128000
    });

    audioChunks = [];
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
      cleanup();
    };

    mediaRecorder.onstop = async () => {
      try {
        await saveRecording();
      } finally {
        cleanup();
        if (stopResolver) {
          stopResolver();
          stopResolver = null;
        }
      }
    };

    mediaRecorder.start(1000);

    return {
      success: true,
      mimeType: recordingMimeType
    };
  } catch (error) {
    cleanup();
    return { success: false, error: error.message || 'Failed to start recording' };
  }
}

async function stopRecording() {
  try {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
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
    return { success: false, error: error.message || 'Failed to stop recording' };
  }
}

async function setupLiveAudioRouting(stream) {
  // Fallback monitor path to keep captured tab audible in case WebAudio output
  // is blocked or suspended in an offscreen context.
  monitorAudioEl = new Audio();
  monitorAudioEl.autoplay = true;
  monitorAudioEl.muted = false;
  monitorAudioEl.volume = 1;
  monitorAudioEl.srcObject = stream;
  monitorAudioEl.play().catch(() => {
    // Ignore if autoplay is blocked; WebAudio route below may still work.
  });

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(stream);

  // Keep tab audio audible while recording by routing captured stream to output.
  monitorGainNode = audioContext.createGain();
  monitorGainNode.gain.value = 1;

  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 512;
  analyserNode.smoothingTimeConstant = 0.85;

  sourceNode.connect(analyserNode);
  sourceNode.connect(monitorGainNode);
  monitorGainNode.connect(audioContext.destination);

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const samples = new Uint8Array(analyserNode.frequencyBinCount);

  levelInterval = setInterval(() => {
    if (!analyserNode) {
      return;
    }

    analyserNode.getByteFrequencyData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i];
    }

    const avg = sum / samples.length;
    const normalized = Math.max(0, Math.min(1, avg / 255));

    chrome.runtime.sendMessage({
      action: 'recordingLevel',
      level: normalized
    }).catch(() => {
      // Ignore when service worker is sleeping; it will wake on next message.
    });
  }, 180);
}

function pickMimeType() {
  const options = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4'
  ];

  for (const mime of options) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return 'audio/webm';
}

async function saveRecording() {
  if (!audioChunks.length) {
    throw new Error('No audio chunks captured');
  }

  const blob = new Blob(audioChunks, { type: recordingMimeType || 'audio/webm' });
  const base64 = await blobToBase64(blob);

  const result = await chrome.runtime.sendMessage({
    action: 'recordingComplete',
    data: base64,
    mimeType: blob.type || recordingMimeType || 'audio/webm'
  });

  if (!result?.success) {
    throw new Error(result?.error || 'Could not save recording');
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

    reader.onerror = () => {
      reject(reader.error || new Error('FileReader failed'));
    };

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
    } catch (_) {
      // Ignore stop errors during cleanup.
    }
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch (_) {}
  }

  if (monitorGainNode) {
    try {
      monitorGainNode.disconnect();
    } catch (_) {}
  }

  if (analyserNode) {
    try {
      analyserNode.disconnect();
    } catch (_) {}
  }

  if (audioContext) {
    audioContext.close().catch(() => {
      // Ignore close failures.
    });
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
}

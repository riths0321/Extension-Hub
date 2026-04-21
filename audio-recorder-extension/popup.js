// popup.js — Main UI controller (no module imports; scripts loaded sequentially)

(function () {
  'use strict';

  /* ============================================================
     State
  ============================================================ */
  let currentTabId = null;
  let currentMode = 'tab';
  let timerInterval = null;
  let recordingStartTime = null;
  let levelThrottleTimer = null;
  let lastLevel = 0;
  let peakLevel = 0;
  let currentBlob = null;
  let currentDuration = 0;
  let currentMarkers = [];
  let audioEl = null;
  let isPlaying = false;
  let maxDurationTimer = null;
  let liveMarkerList = [];
  let audioObjectUrl = null;

  /* ============================================================
     DOM Cache
  ============================================================ */
  const el = {};

  function cacheElements() {
    const ids = [
      'app','statusPill','statusDot','statusLabel',
      'themeToggle','iconMoon','iconSun',
      'timer','timerSub','timerBlock',
      'modeTabBtn','modeMicBtn',
      'levelFill','levelDb',
      'startBtn','pauseBtn','stopBtn','pauseLabel','pauseIconSvg',
      'currentTab','sourceInfo',
      'markerBar','addMarkerBtn','liveMarkers',
      'waveformCard','waveformCanvas','waveformDuration',
      'playbackBtn','playIconSvg','playLabel','pbFill','pbTrack','pbTime',
      'maxDuration','exportFormat',
      'historyList','searchHistory','clearHistoryBtn','exportHistoryBtn',
      'toastContainer'
    ];
    ids.forEach(id => { el[id] = document.getElementById(id); });
    el.timerBlock = document.querySelector('.timer-block');
  }

  /* ============================================================
     Init
  ============================================================ */
  async function init() {
    cacheElements();
    bindEvents();
    await getCurrentTab();
    await loadSettings();
    await loadHistory();
    await refreshStatus();

    // Poll status in background every 2.5s (state sync)
    setInterval(refreshStatus, 2500);

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBgMessage);
  }

  /* ============================================================
     Event Bindings
  ============================================================ */
  function bindEvents() {
    el.startBtn.addEventListener('click', onStartClick);
    el.pauseBtn.addEventListener('click', onPauseClick);
    el.stopBtn.addEventListener('click', onStopClick);
    el.modeTabBtn.addEventListener('click', () => setMode('tab'));
    el.modeMicBtn.addEventListener('click', () => setMode('mic'));
    el.addMarkerBtn.addEventListener('click', () => addMarker());
    el.themeToggle.addEventListener('click', toggleTheme);
    el.playbackBtn.addEventListener('click', togglePlayback);
    el.pbTrack.addEventListener('click', seekPlayback);
    el.clearHistoryBtn.addEventListener('click', clearHistory);
    el.exportHistoryBtn.addEventListener('click', exportHistory);
    el.searchHistory.addEventListener('input', loadHistory);
    el.maxDuration.addEventListener('change', saveSettings);
    el.exportFormat.addEventListener('change', saveSettings);

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'm' || e.key === 'M') addMarker();
    });
  }

  /* ============================================================
     Tab Detection
  ============================================================ */
  async function getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        currentTabId = tab.id;
        el.currentTab.textContent = tab.title || tab.url || 'Unknown tab';
      }
    } catch {
      el.currentTab.textContent = 'Unable to detect tab';
    }
  }

  /* ============================================================
     Status / State Sync
  ============================================================ */
  async function refreshStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ action: 'status' });
      if (status) applyStatus(status);
    } catch { /* popup may be loading */ }
  }

  function applyStatus(status) {
    const { recording, paused, startedAt, mode, level } = status;
    currentMode = mode || currentMode;
    el.modeTabBtn.classList.toggle('active', currentMode === 'tab');
    el.modeMicBtn.classList.toggle('active', currentMode === 'mic');

    if (recording) {
      // Sync recording state
      el.startBtn.disabled = true;
      el.pauseBtn.disabled = false;
      el.stopBtn.disabled = false;
      el.modeTabBtn.disabled = true;
      el.modeMicBtn.disabled = true;

      // Status pill
      el.statusPill.className = 'status-pill ' + (paused ? 'paused' : 'recording');
      el.statusLabel.textContent = paused ? 'Paused' : 'Live';

      // Timer block class
      el.timerBlock.className = 'timer-block ' + (paused ? 'paused' : 'recording');
      el.timerSub.textContent = paused ? 'Recording paused' : 'Recording in progress...';

      // Pause btn label
      el.pauseLabel.textContent = paused ? 'Resume' : 'Pause';
      setPauseIcon(paused);

      // Marker bar
      el.markerBar.style.display = 'flex';

      // Start/resume timer
      if (startedAt && startedAt !== recordingStartTime) {
        recordingStartTime = startedAt;
        startTimer();
      }
      if (paused) {
        renderTimer();
        stopTimer(false);
      } else if (!timerInterval) {
        startTimer();
      }

      // Level
      if (typeof level === 'number') updateLevel(level, false);

      // Update source info
      updateSourceInfo(currentMode);

    } else {
      // Idle
      el.startBtn.disabled = false;
      el.pauseBtn.disabled = true;
      el.stopBtn.disabled = true;
      el.modeTabBtn.disabled = false;
      el.modeMicBtn.disabled = false;

      el.statusPill.className = 'status-pill';
      el.statusLabel.textContent = 'Idle';
      el.timerBlock.className = 'timer-block';
      el.timerSub.textContent = 'Ready to record';
      el.markerBar.style.display = 'none';
      liveMarkerList = [];
      DOMHelpers.clearElement(el.liveMarkers);

      stopTimer();
      updateLevel(0, false);
      updateSourceInfo(currentMode);
    }
  }

  function updateSourceInfo(mode) {
    const isMic = (mode || currentMode) === 'mic';
    const icon = el.sourceInfo.querySelector('svg');
    if (isMic) {
      icon.innerHTML = '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" stroke-width="2"/>';
    } else {
      icon.innerHTML = '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>';
    }
  }

  /* ============================================================
     Recording Controls
  ============================================================ */
  async function onStartClick() {
    if (currentMode === 'tab' && !currentTabId) {
      toast('No active tab found', 'error'); return;
    }
    el.startBtn.disabled = true;
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'start', tabId: currentTabId, mode: currentMode
      });
      if (res?.success) {
        liveMarkerList = [];
        DOMHelpers.clearElement(el.liveMarkers);
        el.waveformCard.style.display = 'none';
        currentBlob = null;
        stopAudio();
        toast(`Recording started (${currentMode === 'tab' ? 'Tab' : 'Mic'})`, 'success');
        await refreshStatus();
        scheduleMaxDuration();
      } else {
        toast(res?.error || 'Failed to start', 'error');
        el.startBtn.disabled = false;
      }
    } catch (e) {
      toast(e.message, 'error');
      el.startBtn.disabled = false;
    }
  }

  async function onPauseClick() {
    const isPaused = el.pauseLabel.textContent === 'Resume';
    const action = isPaused ? 'resume' : 'pause';
    try {
      const res = await chrome.runtime.sendMessage({ action });
      if (res?.success) {
        toast(isPaused ? 'Resumed' : 'Paused', 'info');
        await refreshStatus();
      } else {
        toast(res?.error || 'Failed', 'error');
      }
    } catch (e) { toast(e.message, 'error'); }
  }

  async function onStopClick() {
    el.stopBtn.disabled = true;
    clearMaxDuration();
    try {
      const res = await chrome.runtime.sendMessage({ action: 'stop' });
      if (res?.success) {
        toast('Recording stopped', 'info');
        await refreshStatus();
        await loadHistory();
      } else {
        toast(res?.error || 'Stop failed', 'error');
        el.stopBtn.disabled = false;
      }
    } catch (e) {
      toast(e.message, 'error');
      el.stopBtn.disabled = false;
    }
  }

  /* ============================================================
     Markers
  ============================================================ */
  async function addMarker() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'addMarker' });
      if (res?.success) {
        const label = Formatters.formatDuration(res.marker.timestamp);
        toast(`Marker @ ${label}`, 'info');
      }
    } catch { /* no-op */ }
  }

  /* ============================================================
     Mode
  ============================================================ */
  function setMode(mode) {
    if (el.startBtn.disabled && !el.stopBtn.disabled) return; // recording
    currentMode = mode;
    el.modeTabBtn.classList.toggle('active', mode === 'tab');
    el.modeMicBtn.classList.toggle('active', mode === 'mic');
    updateSourceInfo(mode);
  }

  /* ============================================================
     Level Meter
  ============================================================ */
  function updateLevel(level, throttle = true) {
    if (throttle) {
      if (levelThrottleTimer) return;
      levelThrottleTimer = setTimeout(() => { levelThrottleTimer = null; }, 180);
    }
    lastLevel = level;
    if (level > peakLevel) peakLevel = level;

    const pct = Math.round(level * 100);
    el.levelFill.style.width = pct + '%';
    el.levelFill.className = 'level-fill' + (pct > 90 ? ' hot' : pct > 70 ? ' warn' : '');

    const db = level > 0 ? Math.max(-60, Math.round(20 * Math.log10(level))) : null;
    el.levelDb.textContent = db !== null ? db + ' dB' : '-inf';
  }

  /* ============================================================
     Timer
  ============================================================ */
  function startTimer() {
    stopTimer(false);
    renderTimer();
    timerInterval = setInterval(renderTimer, 1000);
  }

  function stopTimer(reset) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (reset !== false) {
      recordingStartTime = null;
      el.timer.textContent = '00:00:00';
    }
  }

  function renderTimer() {
    if (!recordingStartTime) return;
    const ms = Date.now() - recordingStartTime;
    el.timer.textContent = Formatters.formatTime(ms);
  }

  /* ============================================================
     Max Duration Auto-Stop
  ============================================================ */
  function scheduleMaxDuration() {
    clearMaxDuration();
    const mins = parseInt(el.maxDuration.value) || 0;
    if (mins > 0) {
      maxDurationTimer = setTimeout(() => {
        toast('Max duration reached — stopping', 'warning');
        onStopClick();
      }, mins * 60 * 1000);
    }
  }

  function clearMaxDuration() {
    if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null; }
  }

  /* ============================================================
     Waveform + Playback
  ============================================================ */
  async function showWaveform(blob, duration, markers) {
    currentBlob = blob;
    currentDuration = duration || 0;
    currentMarkers = markers || [];

    el.waveformCard.style.display = 'block';
    el.waveformDuration.textContent = Formatters.formatDuration(currentDuration);

    try {
      await WaveformComponent.createFromBlob(el.waveformCanvas, blob);
    } catch { /* decode may fail on some formats */ }

    resetPlaybackUI();
  }

  function resetPlaybackUI() {
    el.pbFill.style.width = '0%';
    el.pbTime.textContent = '0:00 / ' + Formatters.formatDuration(currentDuration);
    setPauseIcon(false, true);
    el.playLabel.textContent = 'Play';
    isPlaying = false;
  }

  function togglePlayback() {
    if (!currentBlob) return;

    if (!audioEl) {
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
      }
      audioObjectUrl = URL.createObjectURL(currentBlob);
      audioEl = new Audio();
      audioEl.src = audioObjectUrl;
      audioEl.addEventListener('timeupdate', onAudioTimeUpdate);
      audioEl.addEventListener('ended', onAudioEnded);
    }

    if (audioEl.paused) {
      audioEl.play();
      isPlaying = true;
      setPauseIcon(false, true);
      el.playLabel.textContent = 'Pause';
    } else {
      audioEl.pause();
      isPlaying = false;
      setPauseIcon(false, true);
      el.playLabel.textContent = 'Play';
    }
  }

  function seekPlayback(e) {
    if (!audioEl || !currentDuration) return;
    const rect = el.pbTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = ratio * (audioEl.duration || currentDuration);
  }

  function onAudioTimeUpdate() {
    const cur = audioEl.currentTime;
    const total = audioEl.duration || currentDuration;
    const pct = total > 0 ? (cur / total) * 100 : 0;
    el.pbFill.style.width = pct + '%';
    el.pbTime.textContent = Formatters.formatDuration(cur) + ' / ' + Formatters.formatDuration(total);
  }

  function onAudioEnded() {
    isPlaying = false;
    setPauseIcon(false, true);
    el.playLabel.textContent = 'Play';
    el.pbFill.style.width = '0%';
    el.pbTime.textContent = '0:00 / ' + Formatters.formatDuration(currentDuration);
  }

  function stopAudio() {
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      audioEl = null;
      isPlaying = false;
    }
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
      audioObjectUrl = null;
    }
  }

  /* ============================================================
     History
  ============================================================ */
  async function loadHistory() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getHistory' });
      const recordings = Array.isArray(res) ? res : [];
      const term = (el.searchHistory.value || '').toLowerCase().trim();
      const filtered = term
        ? recordings.filter(r => r.filename.toLowerCase().includes(term))
        : recordings;
      renderHistory(filtered);
    } catch {
      renderHistory([]);
    }
  }

  function renderHistory(recordings) {
    DOMHelpers.clearElement(el.historyList);

    if (!recordings.length) {
      const wrap = document.createElement('div');
      wrap.className = 'empty-state';

      const p = document.createElement('p');
      p.textContent = 'No recordings yet';

      const small = document.createElement('small');
      small.textContent = 'Hit Record to get started';

      wrap.appendChild(p);
      wrap.appendChild(small);
      el.historyList.appendChild(wrap);
      return;
    }

    recordings.forEach(rec => {
      const item = document.createElement('div');
      item.className = 'history-item';

      // Top row
      const top = document.createElement('div');
      top.className = 'hi-top';

      const fname = document.createElement('div');
      fname.className = 'hi-filename';
      fname.textContent = SecurityUtils.sanitizeText(rec.filename);

      const acts = document.createElement('div');
      acts.className = 'hi-actions';

      const playBtn = createHistoryBtn('▶', 'Open recording', false, () => playHistoryItem(rec));
      const dlBtn   = createHistoryBtn('↓', 'Show in downloads', false, () => reDownload(rec));
      const delBtn  = createHistoryBtn('✕', 'Delete', true, () => deleteRecording(rec.id));

      acts.appendChild(playBtn);
      acts.appendChild(dlBtn);
      acts.appendChild(delBtn);

      top.appendChild(fname);
      top.appendChild(acts);

      // Meta row
      const meta = document.createElement('div');
      meta.className = 'hi-meta';

      meta.appendChild(makeMetaItem(Formatters.formatDuration(rec.duration || 0), 'clock'));
      meta.appendChild(makeMetaItem(Formatters.formatSize(rec.size || 0), 'disk'));
      meta.appendChild(makeMetaItem(Formatters.formatDate(rec.timestamp), 'cal'));

      if (rec.mode) {
        const badge = document.createElement('span');
        badge.className = 'hi-mode-badge';
        badge.textContent = rec.mode === 'mic' ? 'MIC' : 'TAB';
        meta.appendChild(badge);
      }

      item.appendChild(top);
      item.appendChild(meta);
      el.historyList.appendChild(item);
    });
  }

  function createHistoryBtn(icon, title, isDanger, onClick) {
    const btn = document.createElement('button');
    btn.className = 'hi-btn' + (isDanger ? ' danger' : '');
    btn.title = title;
    btn.textContent = icon;
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }

  function makeMetaItem(text, type) {
    const span = document.createElement('span');
    span.className = 'hi-meta-item';
    span.textContent = text;
    return span;
  }

  async function playHistoryItem(rec) {
    if (!rec?.id) {
      toast('Cannot open this recording', 'error');
      return;
    }
    try {
      const res = await chrome.runtime.sendMessage({ action: 'openRecording', id: rec.id });
      if (!res?.success) {
        toast(res?.error || 'Unable to open recording', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function reDownload(rec) {
    if (!rec?.id) {
      toast('Cannot locate this recording', 'error');
      return;
    }
    try {
      const res = await chrome.runtime.sendMessage({ action: 'showRecording', id: rec.id });
      if (!res?.success) {
        toast(res?.error || 'Unable to find file in downloads', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteRecording(id) {
    if (!id) { toast('Cannot delete: missing ID', 'error'); return; }
    try {
      const res = await chrome.runtime.sendMessage({ action: 'deleteRecording', id });
      if (res?.success) {
        toast('Recording deleted', 'success');
        await loadHistory();
      }
    } catch (e) { toast(e.message, 'error'); }
  }

  async function clearHistory() {
    if (!confirm('Clear all recording history? Files are not deleted from disk.')) return;
    try {
      await chrome.runtime.sendMessage({ action: 'clearHistory' });
      toast('History cleared', 'success');
      await loadHistory();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function exportHistory() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getHistory' });
      const recordings = Array.isArray(res) ? res : [];
      const data = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        count: recordings.length,
        recordings: recordings.map(r => ({
          filename: r.filename,
          duration: r.duration,
          size: r.size,
          mode: r.mode,
          format: r.format,
          timestamp: r.timestamp
        }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({
        url,
        filename: 'audio_recorder_export_' + Date.now() + '.json',
        saveAs: true
      });
      URL.revokeObjectURL(url);
      toast('History exported', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  /* ============================================================
     Settings
  ============================================================ */
  async function loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (res) {
        el.maxDuration.value = res.maxDuration || 0;
        el.exportFormat.value = res.exportFormat || 'webm';
        applyTheme(res.theme || 'light');
      }
    } catch { /* defaults fine */ }
  }

  async function saveSettings() {
    const settings = {
      maxDuration: parseInt(el.maxDuration.value) || 0,
      exportFormat: el.exportFormat.value
    };
    try {
      await chrome.runtime.sendMessage({ action: 'updateSettings', settings });
    } catch { /* non-critical */ }
  }

  /* ============================================================
     Theme
  ============================================================ */
  function toggleTheme() {
    const current = el.app.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.runtime.sendMessage({ action: 'updateSettings', settings: { theme: next } }).catch(() => {});
  }

  function applyTheme(theme) {
    el.app.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    el.app.querySelector('.icon-moon').style.display = isDark ? 'none' : '';
    el.app.querySelector('.icon-sun').style.display = isDark ? '' : 'none';
  }

  /* ============================================================
     Pause icon helper
  ============================================================ */
  function setPauseIcon(isPaused, isPlayBtn) {
    if (isPlayBtn) {
      // play/pause SVG in playback button
      el.playIconSvg.innerHTML = isPlaying
        ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
        : '<polygon points="5 3 19 12 5 21 5 3"/>';
      return;
    }
    el.pauseIconSvg.innerHTML = isPaused
      ? '<polygon points="5 3 19 12 5 21 5 3"/>'
      : '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  }

  /* ============================================================
     Background Message Handler
  ============================================================ */
  function handleBgMessage(msg) {
    switch (msg.action) {
      case 'recordingLevel':
        updateLevel(msg.level, true);
        break;
      case 'recordingSaved':
        toast('Saved: ' + (msg.filename || 'recording'), 'success');
        loadHistory();
        refreshStatus();
        break;
      case 'recordingError':
        toast(msg.error || 'Recording error', 'error');
        refreshStatus();
        break;
      case 'recordingPaused':
        toast('Paused', 'info');
        refreshStatus();
        break;
      case 'recordingResumed':
        toast('Resumed', 'info');
        refreshStatus();
        break;
      case 'markerAdded':
        if (msg.marker) {
          const label = Formatters.formatDuration(msg.marker.timestamp);
          const chip = document.createElement('span');
          chip.className = 'live-marker-chip';
          chip.textContent = label;
          el.liveMarkers.appendChild(chip);
        }
        break;
    }
  }

  /* ============================================================
     Toast
  ============================================================ */
  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;

    const dot = document.createElement('span');
    dot.className = 'toast-dot';

    const txt = document.createElement('span');
    txt.textContent = SecurityUtils.sanitizeText(msg);

    t.appendChild(dot);
    t.appendChild(txt);
    el.toastContainer.appendChild(t);

    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 220);
    }, 2800);
  }

  /* ============================================================
     Boot
  ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

})();

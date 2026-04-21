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
      'currentTab','sourceInfo','sourceIcon',
      'markerBar','addMarkerBtn','liveMarkers',
      'waveformCard','waveformCanvas','waveformDuration',
      'playbackBtn','playIconSvg','playLabel','pbFill','pbTrack','pbTime',
      'maxDuration','exportFormat',
      'historyList','searchHistory','clearHistoryBtn','exportHistoryBtn',
      'toastContainer',
      'confirmModal','confirmMsg','confirmOk','confirmCancel'
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

    setInterval(refreshStatus, 2500);
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
    el.clearHistoryBtn.addEventListener('click', confirmClearHistory);
    el.exportHistoryBtn.addEventListener('click', exportHistory);
    el.searchHistory.addEventListener('input', loadHistory);
    el.maxDuration.addEventListener('change', saveSettings);
    el.exportFormat.addEventListener('change', saveSettings);

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'm' || e.key === 'M') addMarker();
    });
  }

  /* ============================================================
     Tab Detection
  ============================================================ */
  async function getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab) {
        currentTabId = tab.id;
        el.currentTab.textContent = tab.title || tab.url || 'Unknown tab';
      }
    } catch (_) {
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
    } catch (_) { /* popup may be loading */ }
  }

  function applyStatus(status) {
    const recording = status.recording;
    const paused = status.paused;
    const startedAt = status.startedAt;
    const mode = status.mode;
    const level = status.level;

    currentMode = mode || currentMode;
    el.modeTabBtn.classList.toggle('active', currentMode === 'tab');
    el.modeMicBtn.classList.toggle('active', currentMode === 'mic');

    if (recording) {
      el.startBtn.disabled = true;
      el.pauseBtn.disabled = false;
      el.stopBtn.disabled = false;
      el.modeTabBtn.disabled = true;
      el.modeMicBtn.disabled = true;

      el.statusPill.className = 'status-pill ' + (paused ? 'paused' : 'recording');
      el.statusLabel.textContent = paused ? 'Paused' : 'Live';

      el.timerBlock.className = 'timer-block ' + (paused ? 'paused' : 'recording');
      el.timerSub.textContent = paused ? 'Recording paused' : 'Recording in progress...';

      el.pauseLabel.textContent = paused ? 'Resume' : 'Pause';
      setPauseIcon(paused);

      el.markerBar.style.display = 'flex';

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

      if (typeof level === 'number') updateLevel(level, false);
      updateSourceInfo(currentMode);

    } else {
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

  /* FIX: Must NOT use innerHTML — use SVG DOM API instead */
  function updateSourceInfo(mode) {
    var isMic = (mode || currentMode) === 'mic';
    var svg = el.sourceIcon;
    DOMHelpers.clearElement(svg);

    if (isMic) {
      var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p1.setAttribute('d', 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z');
      p1.setAttribute('fill', 'none');
      p1.setAttribute('stroke', 'currentColor');
      p1.setAttribute('stroke-width', '2');
      var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p2.setAttribute('d', 'M19 10v2a7 7 0 0 1-14 0v-2');
      p2.setAttribute('fill', 'none');
      p2.setAttribute('stroke', 'currentColor');
      p2.setAttribute('stroke-width', '2');
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '12'); line.setAttribute('y1', '19');
      line.setAttribute('x2', '12'); line.setAttribute('y2', '22');
      line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-width', '2');
      svg.appendChild(p1); svg.appendChild(p2); svg.appendChild(line);
    } else {
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '2'); rect.setAttribute('y', '4');
      rect.setAttribute('width', '20'); rect.setAttribute('height', '16');
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', '2');
      svg.appendChild(rect);
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
      var res = await chrome.runtime.sendMessage({
        action: 'start', tabId: currentTabId, mode: currentMode
      });
      if (res && res.success) {
        liveMarkerList = [];
        DOMHelpers.clearElement(el.liveMarkers);
        el.waveformCard.style.display = 'none';
        currentBlob = null;
        stopAudio();
        toast('Recording started (' + (currentMode === 'tab' ? 'Tab' : 'Mic') + ')', 'success');
        await refreshStatus();
        scheduleMaxDuration();
      } else {
        toast((res && res.error) || 'Failed to start', 'error');
        el.startBtn.disabled = false;
      }
    } catch (e) {
      toast(e.message, 'error');
      el.startBtn.disabled = false;
    }
  }

  async function onPauseClick() {
    var isPaused = el.pauseLabel.textContent === 'Resume';
    var action = isPaused ? 'resume' : 'pause';
    try {
      var res = await chrome.runtime.sendMessage({ action: action });
      if (res && res.success) {
        toast(isPaused ? 'Resumed' : 'Paused', 'info');
        await refreshStatus();
      } else {
        toast((res && res.error) || 'Failed', 'error');
      }
    } catch (e) { toast(e.message, 'error'); }
  }

  async function onStopClick() {
    el.stopBtn.disabled = true;
    clearMaxDuration();
    try {
      var res = await chrome.runtime.sendMessage({ action: 'stop' });
      if (res && res.success) {
        toast('Recording stopped — saving...', 'info');
        await refreshStatus();
        await loadHistory();
      } else {
        toast((res && res.error) || 'Stop failed', 'error');
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
      var res = await chrome.runtime.sendMessage({ action: 'addMarker' });
      if (res && res.success) {
        var label = Formatters.formatDuration(res.marker.timestamp);
        toast('Marker @ ' + label, 'info');
      }
    } catch (_) { /* no-op */ }
  }

  /* ============================================================
     Mode
  ============================================================ */
  function setMode(mode) {
    if (el.startBtn.disabled && !el.stopBtn.disabled) return;
    currentMode = mode;
    el.modeTabBtn.classList.toggle('active', mode === 'tab');
    el.modeMicBtn.classList.toggle('active', mode === 'mic');
    updateSourceInfo(mode);
  }

  /* ============================================================
     Level Meter
  ============================================================ */
  function updateLevel(level, throttle) {
    if (throttle) {
      if (levelThrottleTimer) return;
      levelThrottleTimer = setTimeout(function() { levelThrottleTimer = null; }, 180);
    }
    lastLevel = level;
    if (level > peakLevel) peakLevel = level;

    var pct = Math.round(level * 100);
    el.levelFill.style.width = pct + '%';
    el.levelFill.className = 'level-fill' + (pct > 90 ? ' hot' : pct > 70 ? ' warn' : '');

    var db = level > 0 ? Math.max(-60, Math.round(20 * Math.log10(level))) : null;
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
    var ms = Date.now() - recordingStartTime;
    el.timer.textContent = Formatters.formatTime(ms);
  }

  /* ============================================================
     Max Duration Auto-Stop
  ============================================================ */
  function scheduleMaxDuration() {
    clearMaxDuration();
    var mins = parseInt(el.maxDuration.value) || 0;
    if (mins > 0) {
      maxDurationTimer = setTimeout(function() {
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
    } catch (_) { /* decode may fail on some formats */ }

    resetPlaybackUI();
  }

  function resetPlaybackUI() {
    el.pbFill.style.width = '0%';
    el.pbTime.textContent = '0:00 / ' + Formatters.formatDuration(currentDuration);
    isPlaying = false;
    setPlayIcon(false);
    el.playLabel.textContent = 'Play';
  }

  function togglePlayback() {
    if (!currentBlob) return;

    if (!audioEl) {
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      audioObjectUrl = URL.createObjectURL(currentBlob);
      audioEl = new Audio();
      audioEl.src = audioObjectUrl;
      audioEl.addEventListener('timeupdate', onAudioTimeUpdate);
      audioEl.addEventListener('ended', onAudioEnded);
    }

    if (audioEl.paused) {
      audioEl.play();
      isPlaying = true;
      setPlayIcon(true);
      el.playLabel.textContent = 'Pause';
    } else {
      audioEl.pause();
      isPlaying = false;
      setPlayIcon(false);
      el.playLabel.textContent = 'Play';
    }
  }

  function seekPlayback(e) {
    if (!audioEl || !currentDuration) return;
    var rect = el.pbTrack.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = ratio * (audioEl.duration || currentDuration);
  }

  function onAudioTimeUpdate() {
    var cur = audioEl.currentTime;
    var total = audioEl.duration || currentDuration;
    var pct = total > 0 ? (cur / total) * 100 : 0;
    el.pbFill.style.width = pct + '%';
    el.pbTime.textContent = Formatters.formatDuration(cur) + ' / ' + Formatters.formatDuration(total);
  }

  function onAudioEnded() {
    isPlaying = false;
    setPlayIcon(false);
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

  /* FIX: setPauseIcon — replaces innerHTML with SVG DOM API */
  function setPauseIcon(isPaused) {
    DOMHelpers.clearElement(el.pauseIconSvg);
    if (isPaused) {
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '5 3 19 12 5 21 5 3');
      el.pauseIconSvg.appendChild(poly);
    } else {
      var r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r1.setAttribute('x', '6'); r1.setAttribute('y', '4');
      r1.setAttribute('width', '4'); r1.setAttribute('height', '16');
      var r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r2.setAttribute('x', '14'); r2.setAttribute('y', '4');
      r2.setAttribute('width', '4'); r2.setAttribute('height', '16');
      el.pauseIconSvg.appendChild(r1);
      el.pauseIconSvg.appendChild(r2);
    }
  }

  /* FIX: setPlayIcon — replaces innerHTML with SVG DOM API */
  function setPlayIcon(playing) {
    DOMHelpers.clearElement(el.playIconSvg);
    if (playing) {
      var r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r1.setAttribute('x', '6'); r1.setAttribute('y', '4');
      r1.setAttribute('width', '4'); r1.setAttribute('height', '16');
      var r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r2.setAttribute('x', '14'); r2.setAttribute('y', '4');
      r2.setAttribute('width', '4'); r2.setAttribute('height', '16');
      el.playIconSvg.appendChild(r1);
      el.playIconSvg.appendChild(r2);
    } else {
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '5 3 19 12 5 21 5 3');
      el.playIconSvg.appendChild(poly);
    }
  }

  /* ============================================================
     History
  ============================================================ */
  async function loadHistory() {
    try {
      var res = await chrome.runtime.sendMessage({ action: 'getHistory' });
      var recordings = Array.isArray(res) ? res : [];
      var term = (el.searchHistory.value || '').toLowerCase().trim();
      var filtered = term
        ? recordings.filter(function(r) { return r.filename.toLowerCase().includes(term); })
        : recordings;
      renderHistory(filtered);
    } catch (_) {
      renderHistory([]);
    }
  }

  function renderHistory(recordings) {
    DOMHelpers.clearElement(el.historyList);

    if (!recordings.length) {
      var wrap = document.createElement('div');
      wrap.className = 'empty-state';
      var p = document.createElement('p');
      p.textContent = 'No recordings yet';
      var small = document.createElement('small');
      small.textContent = 'Hit Record to get started';
      wrap.appendChild(p);
      wrap.appendChild(small);
      el.historyList.appendChild(wrap);
      return;
    }

    recordings.forEach(function(rec) {
      var item = document.createElement('div');
      item.className = 'history-item';

      var top = document.createElement('div');
      top.className = 'hi-top';

      var fname = document.createElement('div');
      fname.className = 'hi-filename';
      fname.textContent = SecurityUtils.sanitizeText(rec.filename);

      var acts = document.createElement('div');
      acts.className = 'hi-actions';

      var dlBtn  = createHistoryBtn('↓', 'Show in Finder/Explorer', false, function() { reDownload(rec); });
      var delBtn = createHistoryBtn('✕', 'Delete', true, function() { deleteRecording(rec.id); });

      acts.appendChild(dlBtn);
      acts.appendChild(delBtn);

      top.appendChild(fname);
      top.appendChild(acts);

      var meta = document.createElement('div');
      meta.className = 'hi-meta';

      meta.appendChild(makeMetaItem(Formatters.formatDuration(rec.duration || 0)));
      meta.appendChild(makeMetaItem(Formatters.formatSize(rec.size || 0)));
      meta.appendChild(makeMetaItem(Formatters.formatDate(rec.timestamp)));

      if (rec.mode) {
        var badge = document.createElement('span');
        badge.className = 'hi-mode-badge';
        badge.textContent = rec.mode === 'mic' ? 'MIC' : 'TAB';
        meta.appendChild(badge);
      }

      if (rec.format && rec.format !== 'webm') {
        var fmtBadge = document.createElement('span');
        fmtBadge.className = 'hi-mode-badge';
        fmtBadge.textContent = rec.format.toUpperCase();
        meta.appendChild(fmtBadge);
      }

      item.appendChild(top);
      item.appendChild(meta);
      el.historyList.appendChild(item);
    });
  }

  function createHistoryBtn(icon, title, isDanger, onClick) {
    var btn = document.createElement('button');
    btn.className = 'hi-btn' + (isDanger ? ' danger' : '');
    btn.title = title;
    btn.textContent = icon;
    btn.addEventListener('click', function(e) { e.stopPropagation(); onClick(); });
    return btn;
  }

  function makeMetaItem(text) {
    var span = document.createElement('span');
    span.className = 'hi-meta-item';
    span.textContent = text;
    return span;
  }

  async function reDownload(rec) {
    if (!rec || !rec.id) {
      toast('Cannot locate this recording', 'error');
      return;
    }
    try {
      var res = await chrome.runtime.sendMessage({ action: 'showRecording', id: rec.id });
      if (!res || !res.success) {
        toast((res && res.error) || 'File not found in downloads', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteRecording(id) {
    if (!id) { toast('Cannot delete: missing ID', 'error'); return; }
    try {
      var res = await chrome.runtime.sendMessage({ action: 'deleteRecording', id: id });
      if (res && res.success) {
        toast('Recording deleted', 'success');
        await loadHistory();
      }
    } catch (e) { toast(e.message, 'error'); }
  }

  /* FIX: replaced confirm() with custom modal */
  function confirmClearHistory() {
    showConfirm(
      'Clear all recording history? Files on disk are not deleted.',
      async function() {
        try {
          await chrome.runtime.sendMessage({ action: 'clearHistory' });
          toast('History cleared', 'success');
          await loadHistory();
        } catch (e) { toast(e.message, 'error'); }
      }
    );
  }

  async function exportHistory() {
    try {
      var res = await chrome.runtime.sendMessage({ action: 'getHistory' });
      var recordings = Array.isArray(res) ? res : [];
      var data = {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        count: recordings.length,
        recordings: recordings.map(function(r) {
          return {
            filename: r.filename,
            duration: r.duration,
            size: r.size,
            mode: r.mode,
            format: r.format,
            timestamp: r.timestamp
          };
        })
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      await chrome.downloads.download({
        url: url,
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
      var res = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (res) {
        el.maxDuration.value = res.maxDuration || 0;
        el.exportFormat.value = res.exportFormat || 'webm';
        applyTheme(res.theme || 'light');
      }
    } catch (_) { /* defaults fine */ }
  }

  async function saveSettings() {
    var settings = {
      maxDuration: parseInt(el.maxDuration.value) || 0,
      exportFormat: el.exportFormat.value
    };
    try {
      await chrome.runtime.sendMessage({ action: 'updateSettings', settings: settings });
    } catch (_) { /* non-critical */ }
  }

  /* ============================================================
     Theme — FIX: use cached el.iconMoon / el.iconSun
  ============================================================ */
  function toggleTheme() {
    var current = el.app.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.runtime.sendMessage({ action: 'updateSettings', settings: { theme: next } }).catch(function(){});
  }

  function applyTheme(theme) {
    el.app.setAttribute('data-theme', theme);
    var isDark = theme === 'dark';
    el.iconMoon.style.display = isDark ? 'none' : '';
    el.iconSun.style.display = isDark ? '' : 'none';
  }

  /* ============================================================
     Confirm Modal (replaces confirm())
  ============================================================ */
  function showConfirm(message, onOk) {
    el.confirmMsg.textContent = message;
    el.confirmModal.style.display = 'flex';

    function cleanup() {
      el.confirmModal.style.display = 'none';
      el.confirmOk.removeEventListener('click', handleOk);
      el.confirmCancel.removeEventListener('click', handleCancel);
    }
    function handleOk() { cleanup(); onOk(); }
    function handleCancel() { cleanup(); }

    el.confirmOk.addEventListener('click', handleOk);
    el.confirmCancel.addEventListener('click', handleCancel);
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
        toast('Saved: ' + SecurityUtils.sanitizeText(msg.filename || 'recording'), 'success');
        currentDuration = msg.duration || 0;
        // Show waveform placeholder since blob is no longer available in popup
        el.waveformCard.style.display = 'block';
        el.waveformDuration.textContent = Formatters.formatDuration(currentDuration);
        WaveformComponent.drawPlaceholder(el.waveformCanvas);
        resetPlaybackUI();
        loadHistory();
        refreshStatus();
        break;

      case 'recordingError':
        toast(msg.error || 'Recording error', 'error');
        refreshStatus();
        break;

      case 'recordingPaused':
        refreshStatus();
        break;

      case 'recordingResumed':
        refreshStatus();
        break;

      case 'markerAdded':
        if (msg.marker) {
          var label = Formatters.formatDuration(msg.marker.timestamp);
          var chip = document.createElement('span');
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
  function toast(msg, type) {
    type = type || 'info';
    var t = document.createElement('div');
    t.className = 'toast ' + type;

    var dot = document.createElement('span');
    dot.className = 'toast-dot';

    var txt = document.createElement('span');
    txt.textContent = SecurityUtils.sanitizeText(String(msg || ''));

    t.appendChild(dot);
    t.appendChild(txt);
    el.toastContainer.appendChild(t);

    setTimeout(function() {
      t.classList.add('fade-out');
      setTimeout(function() { if (t.parentNode) t.remove(); }, 220);
    }, 2800);
  }

  /* ============================================================
     Boot
  ============================================================ */
  document.addEventListener('DOMContentLoaded', init);

})();

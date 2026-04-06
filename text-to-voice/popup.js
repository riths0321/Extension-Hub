document.addEventListener("DOMContentLoaded", () => {
  // ── Theme Toggle ────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Light is default; dark adds .dark class
  chrome.storage.local.get(["theme"], (result) => {
    // If no saved theme or saved as "light", stay light (default)
    if (result.theme === "dark") applyTheme("dark");
    // else light is already default — no class needed
  });

  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
    chrome.storage.local.set({ theme: isDark ? "light" : "dark" });
  });

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      themeToggleBtn.title = "Switch to light mode";
    } else {
      document.documentElement.classList.remove("dark");
      themeToggleBtn.title = "Switch to dark mode";
    }
  }

  // ── DOM Elements ────────────────────────────────────────────────
  const textInput         = document.getElementById("text");
  const voiceSelect       = document.getElementById("voice");
  const voiceSelectWrap   = document.getElementById("voiceSelectWrap");
  const voiceCards        = document.getElementById("voiceCards");
  const languageSelect    = document.getElementById("language");
  const rateInput         = document.getElementById("rate");
  const toneStyle         = document.getElementById("toneStyle");
  const rateVal           = document.getElementById("rateVal");
  const charCount         = document.getElementById("charCount");
  const wordCount         = document.getElementById("wordCount");
  const speakBtn          = document.getElementById("speak");
  const pauseBtn          = document.getElementById("pause");
  const stopBtn           = document.getElementById("stop");
  const readPageBtn       = document.getElementById("readPageBtn");
  const clearTextBtn      = document.getElementById("clearTextBtn");
  const pasteTextBtn      = document.getElementById("pasteTextBtn");
  const statusText        = document.getElementById("statusText");
  const statusDot         = document.getElementById("statusDot");
  const progressContainer = document.getElementById("progressContainer");
  const progressBar       = document.getElementById("progressBar");
  const progressText      = document.getElementById("progressText");
  const progressTime      = document.getElementById("progressTime");
  const playlistContainer = document.getElementById("playlistContainer");
  const clearPlaylistBtn  = document.getElementById("clearPlaylistBtn");
  const summarizeBtn      = document.getElementById("summarizeBtn");
  const addToQueueBtn     = document.getElementById("addToQueueBtn");

  const tabBtns     = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const todayStats      = document.getElementById("todayStats");
  const streakStats     = document.getElementById("streakStats");
  const savedCount      = document.getElementById("savedCount");
  const totalTimeEl     = document.getElementById("totalTime");
  const totalWordsEl    = document.getElementById("totalWords");
  const analyticsStreak = document.getElementById("analyticsStreak");
  const sessionsToday   = document.getElementById("sessionsToday");

  // ── State ───────────────────────────────────────────────────────
  let voices             = [];
  let selectedVoiceIndex = null;
  let activeUtterance    = null;
  let speaking           = false;
  let paused             = false;
  let currentText        = "";
  let totalWordsListened = 0;
  let totalTimeListened  = 0;
  let listeningSessions  = [];
  let playlist           = [];
  let currentProgress    = 0;
  let progressInterval   = null;
  let speakStartTime     = null;

  // ── Voice Avatars ────────────────────────────────────────────────
  const GENDER_EMOJIS = {
    female:  ["👩", "👩🏻", "👩🏽", "👩🏾", "🧑"],
    male:    ["👨", "👨🏻", "👨🏽", "👨🏾", "🧔"],
    neutral: ["🤖", "🎙️", "📢"]
  };

  function voiceAvatar(name) {
    const n = name.toLowerCase();
    if (/female|woman|girl|zira|susan|victoria|samantha|karen|moira|fiona|veena|tessa|alice|anna|emma|kate|lisa|julie|amelie|yelena/.test(n))
      return GENDER_EMOJIS.female[Math.abs(hashStr(name)) % GENDER_EMOJIS.female.length];
    if (/male|man|daniel|david|thomas|jorge|luca|alex|aaron|bruce|fred|lee|mark|rishi|yuri|james/.test(n))
      return GENDER_EMOJIS.male[Math.abs(hashStr(name)) % GENDER_EMOJIS.male.length];
    return GENDER_EMOJIS.neutral[Math.abs(hashStr(name)) % GENDER_EMOJIS.neutral.length];
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  // ── Init ─────────────────────────────────────────────────────────
  loadStats();
  loadPlaylist();
  updateStatsDisplay();
  updateCharAndWordCount();
  loadVoices();
  checkSelectedText();

  // ── Event Listeners ──────────────────────────────────────────────
  textInput.addEventListener("input", updateCharAndWordCount);
  rateInput.addEventListener("input", () => {
    rateVal.textContent = parseFloat(rateInput.value).toFixed(1) + "×";
  });
  languageSelect.addEventListener("change", updateVoicesByLanguage);
  toneStyle.addEventListener("change", applyToneStyle);
  speakBtn.addEventListener("click", speak);
  pauseBtn.addEventListener("click", togglePause);
  stopBtn.addEventListener("click", stop);
  readPageBtn.addEventListener("click", readCurrentPage);
  clearTextBtn.addEventListener("click", () => {
    textInput.value = "";
    updateCharAndWordCount();
    showStatus("Text cleared", "idle");
  });
  pasteTextBtn.addEventListener("click", pasteText);
  clearPlaylistBtn.addEventListener("click", clearPlaylist);
  if (summarizeBtn) summarizeBtn.addEventListener("click", summarizeAndListen);
  if (addToQueueBtn) addToQueueBtn.addEventListener("click", addCurrentTextToQueue);

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(tabId + "Tab").classList.add("active");
      if (tabId === "playlist") renderPlaylist();
      if (tabId === "analytics") updateAnalytics();
    });
  });

  // ── Context Menu Selected Text ───────────────────────────────────
  function checkSelectedText() {
    chrome.storage.local.get(["selectedText"], (result) => {
      if (result.selectedText) {
        textInput.value = result.selectedText;
        updateCharAndWordCount();
        chrome.storage.local.remove("selectedText");
        showStatus("Text loaded from selection", "done");
      }
    });
  }

  // ── Voice Loading ─────────────────────────────────────────────────
  function loadVoices() {
    const load = () => {
      voices = speechSynthesis.getVoices();
      updateVoicesByLanguage();
    };
    speechSynthesis.onvoiceschanged = load;
    load();
  }

  function updateVoicesByLanguage() {
    const selectedLang = languageSelect.value;
    const filtered = voices.filter(v => v.lang.startsWith(selectedLang.split("-")[0]));
    selectedVoiceIndex = filtered.length > 0 ? 0 : null;
    voiceCards.innerHTML = "";

    const CARD_LIMIT = 12;

    if (filtered.length === 0) {
      const noVoiceMsg = document.createElement("span");
      noVoiceMsg.style.fontSize = "12px";
      noVoiceMsg.style.color = "var(--text-3)";
      noVoiceMsg.textContent = "No voices for this language";
      voiceCards.appendChild(noVoiceMsg);
      voiceSelectWrap.classList.add("voice-select-hidden");
      return;
    }

    filtered.slice(0, CARD_LIMIT).forEach((voice, idx) => {
      const card = document.createElement("div");
      card.className = "voice-card" + (idx === 0 ? " active" : "");
      card.dataset.voiceIdx = String(idx);

      const shortName = voice.name
        .replace(/Microsoft|Google|Apple|TTS|Compact|Premium|Enhanced|Natural|Online|Neural/gi, "")
        .replace(/\(.*?\)/g, "")
        .trim()
        .split(" ").slice(0, 2).join(" ");

      // Create avatar div
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "voice-card-avatar";
      avatarDiv.textContent = voiceAvatar(voice.name);

      // Create info div
      const infoDiv = document.createElement("div");
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "voice-card-name";
      nameDiv.title = voice.name;
      nameDiv.textContent = shortName || voice.name;
      
      const langDiv = document.createElement("div");
      langDiv.className = "voice-card-lang";
      langDiv.textContent = voice.lang;
      
      infoDiv.appendChild(nameDiv);
      infoDiv.appendChild(langDiv);

      // Create checkmark SVG
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2.5");
      const polyline = document.createElementNS(svgNS, "polyline");
      polyline.setAttribute("points", "20 6 9 17 4 12");
      svg.appendChild(polyline);
      svg.classList.add("voice-card-check");

      card.appendChild(avatarDiv);
      card.appendChild(infoDiv);
      card.appendChild(svg);

      card.addEventListener("click", () => selectVoiceCard(idx));
      voiceCards.appendChild(card);
    });

    if (filtered.length > CARD_LIMIT) {
      voiceSelectWrap.classList.remove("voice-select-hidden");
      voiceSelect.innerHTML = '<option value="" disabled selected>More voices (' + (filtered.length - CARD_LIMIT) + ')…</option>';
      filtered.slice(CARD_LIMIT).forEach((voice, i) => {
        const opt = document.createElement("option");
        opt.value = String(CARD_LIMIT + i);
        opt.textContent = voice.name + " (" + voice.lang + ")";
        voiceSelect.appendChild(opt);
      });
      voiceSelect.onchange = () => {
        if (voiceSelect.value !== "") {
          selectedVoiceIndex = parseInt(voiceSelect.value);
          document.querySelectorAll(".voice-card").forEach(c => c.classList.remove("active"));
        }
      };
    } else {
      voiceSelectWrap.classList.add("voice-select-hidden");
    }
  }

  function selectVoiceCard(idx) {
    selectedVoiceIndex = idx;
    document.querySelectorAll(".voice-card").forEach((c, i) => {
      c.classList.toggle("active", i === idx);
    });
    if (voiceSelect) voiceSelect.value = "";
    const voice = getFilteredVoices()[idx];
    if (voice) showStatus("Voice: " + voice.name.split(" ").slice(0, 2).join(" "), "idle");
  }

  function getFilteredVoices() {
    return voices.filter(v => v.lang.startsWith(languageSelect.value.split("-")[0]));
  }

  // ── Tone Style ───────────────────────────────────────────────────
  function applyToneStyle() {
    const style = toneStyle.value;
    const rates = { storytelling: "0.9", news: "1.4", calm: "0.7", normal: "1.0" };
    rateInput.value = rates[style] || "1.0";
    rateVal.textContent = parseFloat(rateInput.value).toFixed(1) + "×";
    showStatus(style.charAt(0).toUpperCase() + style.slice(1) + " style applied", "idle");
  }

  // ── Playback ─────────────────────────────────────────────────────
  function speak() {
    const text = textInput.value.trim();
    if (!text) { showStatus("Please enter some text", "idle"); return; }

    currentText = text;
    stop();

    activeUtterance = new SpeechSynthesisUtterance(text);
    const filteredVoices = getFilteredVoices();
    if (selectedVoiceIndex !== null && filteredVoices[selectedVoiceIndex]) {
      activeUtterance.voice = filteredVoices[selectedVoiceIndex];
    }
    activeUtterance.lang  = languageSelect.value;
    activeUtterance.rate  = parseFloat(rateInput.value);
    activeUtterance.pitch = 1.0;

    activeUtterance.onstart = () => {
      speaking = true; paused = false;
      speakStartTime = Date.now();
      showStatus("Speaking…", "speaking");
      updateButtons();
      startProgressTracking(text);
      totalWordsListened += text.trim().split(/\s+/).filter(w => w.length > 0).length;
      saveStats();
    };

    activeUtterance.onend = () => {
      if (speakStartTime) {
        totalTimeListened += (Date.now() - speakStartTime) / 1000;
        speakStartTime = null;
      }
      speaking = false; paused = false; activeUtterance = null;
      showStatus("Finished", "done");
      updateButtons();
      stopProgressTracking();
      saveToHistory(currentText);
    };

    activeUtterance.onerror = (e) => {
      if (e.error === "interrupted") return;
      speaking = false; paused = false; activeUtterance = null;
      showStatus("Error occurred", "error");
      updateButtons();
      stopProgressTracking();
    };

    speechSynthesis.speak(activeUtterance);
  }

  function togglePause() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      paused = true;
      if (speakStartTime) {
        totalTimeListened += (Date.now() - speakStartTime) / 1000;
        speakStartTime = null;
      }
      showStatus("Paused", "idle");
      stopProgressTracking();
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      paused = false;
      speakStartTime = Date.now();
      showStatus("Resumed…", "speaking");
      startProgressTracking(currentText);
    }
    updateButtons();
  }

  function stop() {
    speechSynthesis.cancel();
    if (speakStartTime) {
      totalTimeListened += (Date.now() - speakStartTime) / 1000;
      speakStartTime = null;
    }
    speaking = false; paused = false; activeUtterance = null;
    showStatus("Stopped", "idle");
    updateButtons();
    stopProgressTracking();
  }

  // ── Progress ──────────────────────────────────────────────────────
  function startProgressTracking(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const rate  = parseFloat(rateInput.value);
    const estimatedDuration = (words / 150) * (60 / rate);
    let elapsed = 0;

    progressContainer.classList.remove("progress-hidden");
    if (progressText) progressText.textContent = "Playing…";

    progressInterval = setInterval(() => {
      elapsed += 0.1;
      currentProgress = Math.min((elapsed / estimatedDuration) * 100, 99);
      progressBar.style.width = currentProgress + "%";
      if (progressTime) {
        progressTime.textContent = formatTime(elapsed) + " / " + formatTime(estimatedDuration);
      }
    }, 100);
  }

  function stopProgressTracking() {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    progressBar.style.width = "0%";
    progressContainer.classList.add("progress-hidden");
    currentProgress = 0;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + secs.toString().padStart(2, "0");
  }

  function updateButtons() {
    if (paused) {
      pauseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
      pauseBtn.title = "Resume";
    } else {
      pauseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      pauseBtn.title = "Pause";
    }
  }

  // ── Status ────────────────────────────────────────────────────────
  function showStatus(message, state) {
    state = state || "idle";
    statusText.textContent = message;
    statusDot.className = "status-dot" +
      (state === "speaking" ? " speaking" :
       state === "done"     ? " done"     :
       state === "error"    ? " error"    : "");
    if (state !== "speaking") {
      setTimeout(() => {
        if (statusText.textContent === message) {
          statusText.textContent = "Ready to speak";
          statusDot.className = "status-dot";
        }
      }, 3000);
    }
  }

  // ── Char / Word Count ─────────────────────────────────────────────
  function updateCharAndWordCount() {
    const text = textInput.value;
    charCount.textContent = text.length + " chars";
    wordCount.textContent = text.trim().split(/\s+/).filter(w => w.length > 0).length + " words";
  }

  // ── Summarize ─────────────────────────────────────────────────────
  function summarizeAndListen() {
    const text = textInput.value.trim();
    if (!text) { showStatus("Please enter text to summarize", "idle"); return; }

    showStatus("Summarizing…", "idle");
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const summary = [];
    if (sentences.length > 0) summary.push(sentences[0]);
    if (sentences.length > 2) summary.push(sentences[Math.floor(sentences.length / 2)]);
    if (sentences.length > 1) summary.push(sentences[sentences.length - 1]);

    textInput.value = summary.join(" ");
    updateCharAndWordCount();
    showStatus("Summarized to " + summary.length + " sentences", "done");
    setTimeout(() => speak(), 500);
  }

  // ── Read Current Page ─────────────────────────────────────────────
  async function readCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      showStatus("Extracting page content…", "idle");

      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractMainContent
      });

      if (result && result[0] && result[0].result) {
        textInput.value = result[0].result;
        updateCharAndWordCount();
        showStatus("Page content extracted!", "done");
        if (confirm("Page extracted! Would you like to listen now?")) speak();
      } else {
        showStatus("Could not extract content", "error");
      }
    } catch (error) {
      console.error("Error reading page:", error);
      showStatus("Error reading page", "error");
    }
  }

  function extractMainContent() {
    const selectors = [
      "article", "[role=\"main\"]", ".post-content", ".article-content",
      ".content", "main", ".entry-content", ".post-body"
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.innerText.length > 200) return el.innerText.trim();
    }
    var bodyText = document.body.innerText;
    return bodyText.length > 500 ? bodyText.trim() : "Could not find main content on this page.";
  }

  // ── Paste ─────────────────────────────────────────────────────────
  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { showStatus("Clipboard is empty", "idle"); return; }
      textInput.value = text;
      updateCharAndWordCount();
      showStatus("Pasted from clipboard", "done");
    } catch (e) {
      showStatus("Could not access clipboard", "error");
    }
  }

  // ── History / Stats ───────────────────────────────────────────────
  function saveToHistory(text) {
    const session = {
      id:        Date.now(),
      text:      text.substring(0, 100),
      timestamp: new Date().toISOString(),
      words:     text.trim().split(/\s+/).filter(w => w.length > 0).length
    };
    listeningSessions.unshift(session);
    if (listeningSessions.length > 50) listeningSessions.pop();
    saveStats();
    updateStatsDisplay();
  }

  function saveStats() {
    chrome.storage.local.set({
      voiceStats: {
        totalWords: totalWordsListened,
        totalTime:  totalTimeListened,
        sessions:   listeningSessions,
        lastDate:   new Date().toISOString()
      }
    });
  }

  function loadStats() {
    chrome.storage.local.get(["voiceStats", "playlist"], (result) => {
      if (result.voiceStats) {
        totalWordsListened = result.voiceStats.totalWords || 0;
        totalTimeListened  = result.voiceStats.totalTime  || 0;
        listeningSessions  = result.voiceStats.sessions   || [];
      }
      if (result.playlist) playlist = result.playlist;
      updateStatsDisplay();
    });
  }

  function updateStatsDisplay() {
    const today = new Date().toDateString();
    const todaySessions = listeningSessions.filter(
      s => new Date(s.timestamp).toDateString() === today
    );
    const todayWords   = todaySessions.reduce((sum, s) => sum + s.words, 0);
    const todayMinutes = Math.floor(todayWords / 200);

    if (todayStats)      todayStats.textContent      = todayMinutes + " min";
    if (streakStats)     streakStats.textContent      = calculateStreak();
    if (savedCount)      savedCount.textContent       = playlist.length;
    if (totalTimeEl)     totalTimeEl.textContent      = Math.floor(totalTimeListened / 3600) + " h";
    if (totalWordsEl)    totalWordsEl.textContent     = totalWordsListened.toLocaleString();
    if (analyticsStreak) analyticsStreak.textContent  = calculateStreak();
    if (sessionsToday)   sessionsToday.textContent    = todaySessions.length;
  }

  function calculateStreak() {
    if (!listeningSessions.length) return 0;
    let streak = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    while (true) {
      if (listeningSessions.some(s => new Date(s.timestamp).toDateString() === d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // ── Playlist ──────────────────────────────────────────────────────
  function loadPlaylist() {
    chrome.storage.local.get(["playlist"], (result) => {
      playlist = result.playlist || [];
      renderPlaylist();
    });
  }

  function addCurrentTextToQueue() {
    const text = textInput.value.trim();
    if (!text) { showStatus("Nothing to save", "idle"); return; }
    const title = text.substring(0, 50) + (text.length > 50 ? "…" : "");
    playlist.unshift({
      id: Date.now(),
      text: text,
      title: title,
      timestamp: new Date().toISOString()
    });
    savePlaylist();
    showStatus("Saved to Queue!", "done");
    // Flash button feedback
    if (addToQueueBtn) {
      addToQueueBtn.textContent = "✓ Saved";
      setTimeout(() => { addToQueueBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Save'; }, 1500);
    }
  }

  function savePlaylist() {
    chrome.storage.local.set({ playlist });
    renderPlaylist();
    updateStatsDisplay();
  }

  function renderPlaylist() {
    if (!playlistContainer) return;

    if (playlist.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";
      
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "40");
      svg.setAttribute("height", "40");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.2");
      svg.style.opacity = "0.3";
      
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M9 18V5l12-2v13");
      const circle1 = document.createElementNS(svgNS, "circle");
      circle1.setAttribute("cx", "6");
      circle1.setAttribute("cy", "18");
      circle1.setAttribute("r", "3");
      const circle2 = document.createElementNS(svgNS, "circle");
      circle2.setAttribute("cx", "18");
      circle2.setAttribute("cy", "16");
      circle2.setAttribute("r", "3");
      
      svg.appendChild(path);
      svg.appendChild(circle1);
      svg.appendChild(circle2);
      
      const p = document.createElement("p");
      p.textContent = "No saved items yet.\nRight-click any page to save.";
      
      emptyDiv.appendChild(svg);
      emptyDiv.appendChild(p);
      
      playlistContainer.innerHTML = "";
      playlistContainer.appendChild(emptyDiv);
      return;
    }

    playlistContainer.innerHTML = "";
    
    playlist.forEach((item, i) => {
      const queueItem = document.createElement("div");
      queueItem.className = "queue-item";
      queueItem.dataset.id = item.id;
      
      const numDiv = document.createElement("div");
      numDiv.className = "queue-num";
      numDiv.textContent = i + 1;
      
      const titleDiv = document.createElement("div");
      titleDiv.className = "queue-item-title";
      titleDiv.textContent = escapeHtml(item.title || item.text.substring(0, 50));
      
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "queue-actions";
      
      const playBtn = document.createElement("button");
      playBtn.className = "play-q";
      playBtn.title = "Play";
      playBtn.dataset.id = item.id;
      const playSvgNS = "http://www.w3.org/2000/svg";
      const playSvg = document.createElementNS(playSvgNS, "svg");
      playSvg.setAttribute("width", "12");
      playSvg.setAttribute("height", "12");
      playSvg.setAttribute("viewBox", "0 0 24 24");
      playSvg.setAttribute("fill", "currentColor");
      const playPolygon = document.createElementNS(playSvgNS, "polygon");
      playPolygon.setAttribute("points", "5,3 19,12 5,21");
      playSvg.appendChild(playPolygon);
      playBtn.appendChild(playSvg);
      
      const delBtn = document.createElement("button");
      delBtn.className = "del-q";
      delBtn.title = "Remove";
      delBtn.dataset.id = item.id;
      const delSvgNS = "http://www.w3.org/2000/svg";
      const delSvg = document.createElementNS(delSvgNS, "svg");
      delSvg.setAttribute("width", "12");
      delSvg.setAttribute("height", "12");
      delSvg.setAttribute("viewBox", "0 0 24 24");
      delSvg.setAttribute("fill", "none");
      delSvg.setAttribute("stroke", "currentColor");
      delSvg.setAttribute("stroke-width", "2");
      const delPolyline = document.createElementNS(delSvgNS, "polyline");
      delPolyline.setAttribute("points", "3 6 5 6 21 6");
      const delPath = document.createElementNS(delSvgNS, "path");
      delPath.setAttribute("d", "M19 6l-1 14H6L5 6");
      delSvg.appendChild(delPolyline);
      delSvg.appendChild(delPath);
      delBtn.appendChild(delSvg);
      
      actionsDiv.appendChild(playBtn);
      actionsDiv.appendChild(delBtn);
      
      queueItem.appendChild(numDiv);
      queueItem.appendChild(titleDiv);
      queueItem.appendChild(actionsDiv);
      
      playlistContainer.appendChild(queueItem);
    });

    playlistContainer.querySelectorAll(".play-q").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = playlist.find(p => p.id === parseInt(btn.dataset.id));
        if (item) {
          textInput.value = item.text;
          updateCharAndWordCount();
          // Switch to reader tab
          tabBtns.forEach(b => b.classList.remove("active"));
          tabContents.forEach(c => c.classList.remove("active"));
          const readerBtn = document.querySelector('[data-tab="reader"]');
          if (readerBtn) readerBtn.classList.add("active");
          const readerTab = document.getElementById("readerTab");
          if (readerTab) readerTab.classList.add("active");
          speak();
        }
      });
    });

    playlistContainer.querySelectorAll(".del-q").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        playlist = playlist.filter(p => p.id !== parseInt(btn.dataset.id));
        savePlaylist();
      });
    });
  }

  function clearPlaylist() {
    if (confirm("Clear all saved items?")) {
      playlist = [];
      savePlaylist();
      showStatus("Queue cleared", "idle");
    }
  }

  // ── Analytics & Achievements ──────────────────────────────────────
  function updateAnalytics() {
    updateStatsDisplay();
    const achievements = calculateAchievements();
    const list = document.getElementById("achievementsList");
    if (!list) return;
    list.innerHTML = "";
    achievements.forEach(ach => {
      const achDiv = document.createElement("div");
      achDiv.className = "achievement-item" + (ach.unlocked ? "" : " locked");
      
      const iconSpan = document.createElement("span");
      iconSpan.className = "achievement-icon";
      iconSpan.textContent = ach.icon;
      
      const textDiv = document.createElement("div");
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "achievement-name";
      nameDiv.textContent = ach.name;
      
      const descDiv = document.createElement("div");
      descDiv.className = "achievement-desc";
      descDiv.textContent = ach.description;
      
      textDiv.appendChild(nameDiv);
      textDiv.appendChild(descDiv);
      
      achDiv.appendChild(iconSpan);
      achDiv.appendChild(textDiv);
      
      if (ach.unlocked) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2.5");
        svg.classList.add("achievement-check");
        const polyline = document.createElementNS(svgNS, "polyline");
        polyline.setAttribute("points", "20 6 9 17 4 12");
        svg.appendChild(polyline);
        achDiv.appendChild(svg);
      }
      
      list.appendChild(achDiv);
    });
  }

  function calculateAchievements() {
    const streak = calculateStreak();
    return [
      { name: "First Listen",  description: "Listened to your first text",    icon: "🎯", unlocked: totalWordsListened > 0 },
      { name: "1,000 Words",   description: "Listened to 1,000 words",         icon: "📖", unlocked: totalWordsListened >= 1000 },
      { name: "10K Club",      description: "Listened to 10,000 words",        icon: "🏆", unlocked: totalWordsListened >= 10000 },
      { name: "7-Day Streak",  description: "Listened 7 days in a row",        icon: "🔥", unlocked: streak >= 7 },
      { name: "30-Day Streak", description: "Listened 30 days in a row",       icon: "⭐", unlocked: streak >= 30 }
    ];
  }

  // ── Utils ─────────────────────────────────────────────────────────
  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }
});
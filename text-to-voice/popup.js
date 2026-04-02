document.addEventListener("DOMContentLoaded", () => {
  // ── Theme Toggle ────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Load saved theme
  chrome.storage.local.get(["theme"], (result) => {
    if (result.theme === "light") applyTheme("light");
  });

  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.contains("light");
    applyTheme(isLight ? "dark" : "light");
    chrome.storage.local.set({ theme: isLight ? "dark" : "light" });
  });

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.classList.add("light");
      themeToggleBtn.title = "Switch to dark mode";
    } else {
      document.documentElement.classList.remove("light");
      themeToggleBtn.title = "Switch to light mode";
    }
  }

  // DOM Elements
  const textInput        = document.getElementById("text");
  const voiceSelect      = document.getElementById("voice");
  const voiceSelectWrap  = document.getElementById("voiceSelectWrap");
  const voiceCards       = document.getElementById("voiceCards");
  const languageSelect   = document.getElementById("language");
  const rateInput        = document.getElementById("rate");
  const toneStyle        = document.getElementById("toneStyle");
  const rateVal          = document.getElementById("rateVal");
  const charCount        = document.getElementById("charCount");
  const wordCount        = document.getElementById("wordCount");
  const speakBtn         = document.getElementById("speak");
  const pauseBtn         = document.getElementById("pause");
  const stopBtn          = document.getElementById("stop");
  const summarizeBtn     = document.getElementById("summarizeBtn");
  const readPageBtn      = document.getElementById("readPageBtn");
  const clearTextBtn     = document.getElementById("clearTextBtn");
  const pasteTextBtn     = document.getElementById("pasteTextBtn");
  const enableHighlight  = document.getElementById("enableHighlight");
  const autoScroll       = document.getElementById("autoScroll");
  const statusText       = document.getElementById("statusText");
  const statusDot        = document.getElementById("statusDot");
  const progressContainer= document.getElementById("progressContainer");
  const progressBar      = document.getElementById("progressBar");
  const progressText     = document.getElementById("progressText");
  const progressTime     = document.getElementById("progressTime");
  const playlistContainer= document.getElementById("playlistContainer");
  const clearPlaylistBtn = document.getElementById("clearPlaylistBtn");

  // Tab elements
  const tabBtns     = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Stats elements
  const todayStats      = document.getElementById("todayStats");
  const streakStats     = document.getElementById("streakStats");
  const savedCount      = document.getElementById("savedCount");
  const totalTimeEl     = document.getElementById("totalTime");
  const totalWordsEl    = document.getElementById("totalWords");
  const analyticsStreak = document.getElementById("analyticsStreak");
  const sessionsToday   = document.getElementById("sessionsToday");

  // State
  let voices              = [];
  let selectedVoiceIndex  = null;
  let activeUtterance     = null;
  let speaking            = false;
  let paused              = false;
  let currentText         = "";
  let totalWordsListened  = 0;
  let totalTimeListened   = 0;
  let listeningSessions   = [];
  let playlist            = [];
  let currentProgress     = 0;
  let progressInterval    = null;

  // Voice avatar helpers (gender/type inference from name)
  const GENDER_EMOJIS = {
    female: ["👩", "👩🏻", "👩🏽", "👩🏾", "🧑"],
    male:   ["👨", "👨🏻", "👨🏽", "👨🏾", "🧔"],
    neutral:["🤖", "🎙️", "📢"]
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

  // Init
  loadStats();
  loadPlaylist();
  updateStatsDisplay();
  updateCharAndWordCount();
  loadVoices();

  // Event listeners
  textInput.addEventListener("input", updateCharAndWordCount);
  rateInput.addEventListener("input", () => {
    rateVal.textContent = `${parseFloat(rateInput.value).toFixed(1)}×`;
  });
  languageSelect.addEventListener("change", updateVoicesByLanguage);
  toneStyle.addEventListener("change", applyToneStyle);
  speakBtn.addEventListener("click", speak);
  pauseBtn.addEventListener("click", togglePause);
  stopBtn.addEventListener("click", stop);
  summarizeBtn.addEventListener("click", summarizeAndListen);
  readPageBtn.addEventListener("click", readCurrentPage);
  clearTextBtn.addEventListener("click", () => {
    textInput.value = "";
    updateCharAndWordCount();
    showStatus("Text cleared", "idle");
  });
  pasteTextBtn.addEventListener("click", pasteText);
  clearPlaylistBtn.addEventListener("click", clearPlaylist);

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`${tabId}Tab`).classList.add("active");
      if (tabId === "playlist") renderPlaylist();
      if (tabId === "analytics") updateAnalytics();
    });
  });

  // ── Voice Loading ──────────────────────────────────────────────
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

    // Reset selected voice index
    selectedVoiceIndex = filtered.length > 0 ? 0 : null;

    // Build voice cards (up to 12 shown as cards, rest in fallback select)
    const CARD_LIMIT = 12;
    const cardVoices  = filtered.slice(0, CARD_LIMIT);
    const extraVoices = filtered.slice(CARD_LIMIT);

    voiceCards.innerHTML = "";

    if (filtered.length === 0) {
      voiceCards.innerHTML = `<span style="font-size:12px;color:var(--text-3);">No voices for this language</span>`;
      voiceSelectWrap.style.display = "none";
    } else {
      cardVoices.forEach((voice, idx) => {
        const card = document.createElement("div");
        card.className = "voice-card" + (idx === 0 ? " active" : "");
        card.dataset.voiceIdx = String(idx);

        const shortName = voice.name
          .replace(/Microsoft|Google|Apple|TTS|Compact|Premium|Enhanced|Natural|Online|Neural/gi, "")
          .replace(/\(.*?\)/g, "")
          .trim()
          .split(" ").slice(0, 2).join(" ");

        card.innerHTML = `
          <div class="voice-card-avatar">${voiceAvatar(voice.name)}</div>
          <div>
            <div class="voice-card-name" title="${voice.name}">${shortName || voice.name}</div>
            <div class="voice-card-lang">${voice.lang}</div>
          </div>
          <svg class="voice-card-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        card.addEventListener("click", () => selectVoiceCard(idx));
        voiceCards.appendChild(card);
      });

      // Extra voices in a select dropdown
      if (extraVoices.length > 0) {
        voiceSelectWrap.style.display = "block";
        voiceSelect.innerHTML = `<option value="" disabled selected>More voices (${extraVoices.length})…</option>`;
        extraVoices.forEach((voice, i) => {
          const opt = document.createElement("option");
          opt.value = String(CARD_LIMIT + i);
          opt.textContent = `${voice.name} (${voice.lang})`;
          voiceSelect.appendChild(opt);
        });
        voiceSelect.addEventListener("change", () => {
          if (voiceSelect.value !== "") {
            selectedVoiceIndex = parseInt(voiceSelect.value);
            // Deselect all cards
            document.querySelectorAll(".voice-card").forEach(c => c.classList.remove("active"));
          }
        });
      } else {
        voiceSelectWrap.style.display = "none";
      }
    }
  }

  function selectVoiceCard(idx) {
    selectedVoiceIndex = idx;
    document.querySelectorAll(".voice-card").forEach((c, i) => {
      c.classList.toggle("active", i === idx);
    });
    // Reset dropdown
    if (voiceSelect) voiceSelect.value = "";
    const voice = getFilteredVoices()[idx];
    if (voice) showStatus(`Voice: ${voice.name.split(" ").slice(0,2).join(" ")}`, "idle");
  }

  function getFilteredVoices() {
    const selectedLang = languageSelect.value;
    return voices.filter(v => v.lang.startsWith(selectedLang.split("-")[0]));
  }

  // ── Tone Style ──────────────────────────────────────────────────
  function applyToneStyle() {
    const style = toneStyle.value;
    const rates = { storytelling: "0.9", news: "1.4", calm: "0.7", normal: "1.0" };
    rateInput.value = rates[style] || "1.0";
    rateVal.textContent = `${parseFloat(rateInput.value).toFixed(1)}×`;
    showStatus(`${style.charAt(0).toUpperCase() + style.slice(1)} style applied`, "idle");
  }

  // ── Playback ────────────────────────────────────────────────────
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
      showStatus("Speaking…", "speaking");
      updateButtons();
      startProgressTracking(text);
      totalWordsListened += text.trim().split(/\s+/).length;
      saveStats();
    };

    activeUtterance.onend = () => {
      speaking = false; paused = false; activeUtterance = null;
      showStatus("Finished", "done");
      updateButtons();
      stopProgressTracking();
      saveToHistory(currentText);
    };

    activeUtterance.onerror = () => {
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
      showStatus("Paused", "idle");
      stopProgressTracking();
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      paused = false;
      showStatus("Resumed…", "speaking");
      startProgressTracking(currentText);
    }
    updateButtons();
  }

  function stop() {
    speechSynthesis.cancel();
    speaking = false; paused = false; activeUtterance = null;
    showStatus("Stopped", "idle");
    updateButtons();
    stopProgressTracking();
  }

  function startProgressTracking(text) {
    const words = text.split(/\s+/).length;
    const estimatedDuration = (words / 150) * (1 / parseFloat(rateInput.value));
    let elapsed = 0;
    progressContainer.style.display = "block";
    progressInterval = setInterval(() => {
      elapsed += 0.1;
      currentProgress = Math.min((elapsed / estimatedDuration) * 100, 100);
      progressBar.style.width = `${currentProgress}%`;
      const remaining = Math.max(0, estimatedDuration - elapsed);
      progressTime.textContent = `${formatTime(elapsed)} / ${formatTime(estimatedDuration)}`;
      if (currentProgress >= 100) stopProgressTracking();
    }, 100);
  }

  function stopProgressTracking() {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    progressContainer.style.display = "none";
    progressBar.style.width = "0%";
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function updateButtons() {
    // Pause button icon swap
    if (paused) {
      pauseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
      pauseBtn.title = "Resume";
    } else {
      pauseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
      pauseBtn.title = "Pause";
    }
  }

  // ── Status ──────────────────────────────────────────────────────
  function showStatus(message, state = "idle") {
    statusText.textContent = message;
    statusDot.className = "status-dot " + (state === "speaking" ? "speaking" : state === "done" ? "done" : state === "error" ? "error" : "");
    if (state !== "speaking") {
      setTimeout(() => {
        if (statusText.textContent === message) {
          statusText.textContent = "Ready to speak";
          statusDot.className = "status-dot";
        }
      }, 3000);
    }
  }

  // ── Char/Word count ─────────────────────────────────────────────
  function updateCharAndWordCount() {
    const text = textInput.value;
    charCount.textContent = `${text.length} chars`;
    wordCount.textContent = `${text.trim().split(/\s+/).filter(w => w.length > 0).length} words`;
  }

  // ── Summarize ───────────────────────────────────────────────────
  async function summarizeAndListen() {
    const text = textInput.value.trim();
    if (!text) { showStatus("Please enter text to summarize", "idle"); return; }

    showStatus("Summarizing…", "idle");
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const take = Math.min(5, Math.ceil(sentences.length / 3));
    let summary = [];
    if (sentences.length > 0) summary.push(sentences[0]);
    if (sentences.length > 2 && take > 1) summary.push(sentences[Math.floor(sentences.length / 2)]);
    if (sentences.length > 1 && take > 2) summary.push(sentences[sentences.length - 1]);

    textInput.value = summary.join(" ");
    updateCharAndWordCount();
    showStatus(`Summarized to ${summary.length} sentences`, "done");
    setTimeout(() => speak(), 500);
  }

  // ── Read Page ───────────────────────────────────────────────────
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
    const selectors = ['article','[role="main"]','.post-content','.article-content','.content','main','.entry-content','.post-body'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 200) return el.innerText.trim();
    }
    const bodyText = document.body.innerText;
    return bodyText.length > 500 ? bodyText.trim() : "Could not find main content on this page.";
  }

  // ── Paste ───────────────────────────────────────────────────────
  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      textInput.value = text;
      updateCharAndWordCount();
      showStatus("Pasted from clipboard", "done");
    } catch {
      showStatus("Could not paste", "error");
    }
  }

  // ── History / Stats ─────────────────────────────────────────────
  function saveToHistory(text) {
    const session = {
      id: Date.now(),
      text: text.substring(0, 100),
      timestamp: new Date().toISOString(),
      words: text.trim().split(/\s+/).length
    };
    listeningSessions.unshift(session);
    if (listeningSessions.length > 50) listeningSessions.pop();
    saveStats();
    updateStatsDisplay();
  }

  function saveStats() {
    chrome.storage.local.set({ voiceStats: {
      totalWords: totalWordsListened,
      totalTime:  totalTimeListened,
      sessions:   listeningSessions,
      lastDate:   new Date().toISOString()
    }});
  }

  function loadStats() {
    chrome.storage.local.get(["voiceStats","playlist"], (result) => {
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
    const todaySessions = listeningSessions.filter(s => new Date(s.timestamp).toDateString() === today);
    const todayWords    = todaySessions.reduce((sum, s) => sum + s.words, 0);
    const todayMinutes  = Math.floor(todayWords / 200);

    if (todayStats)      todayStats.textContent      = `${todayMinutes} min`;
    if (streakStats)     streakStats.textContent      = calculateStreak();
    if (savedCount)      savedCount.textContent       = playlist.length;
    if (totalTimeEl)     totalTimeEl.textContent      = `${Math.floor(totalTimeListened / 60)} h`;
    if (totalWordsEl)    totalWordsEl.textContent     = totalWordsListened.toLocaleString();
    if (analyticsStreak) analyticsStreak.textContent  = calculateStreak();
    if (sessionsToday)   sessionsToday.textContent    = todaySessions.length;
  }

  function calculateStreak() {
    if (!listeningSessions.length) return 0;
    let streak = 0;
    let d = new Date(); d.setHours(0,0,0,0);
    while (true) {
      if (listeningSessions.some(s => new Date(s.timestamp).toDateString() === d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // ── Playlist ────────────────────────────────────────────────────
  function loadPlaylist() {
    chrome.storage.local.get(["playlist"], (result) => {
      playlist = result.playlist || [];
      renderPlaylist();
    });
  }

  function savePlaylist() {
    chrome.storage.local.set({ playlist });
    renderPlaylist();
    updateStatsDisplay();
  }

  function renderPlaylist() {
    if (!playlistContainer) return;
    if (playlist.length === 0) {
      playlistContainer.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <p>No saved items yet.<br>Right-click any page to save.</p>
        </div>`;
      return;
    }
    playlistContainer.innerHTML = playlist.map((item, i) => `
      <div class="queue-item" data-id="${item.id}">
        <div class="queue-num">${i + 1}</div>
        <div class="queue-item-title">${escapeHtml(item.title || item.text.substring(0, 50))}</div>
        <div class="queue-actions">
          <button class="play-q" data-id="${item.id}" title="Play">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="del-q" data-id="${item.id}" title="Remove">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".play-q").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = playlist.find(p => p.id === parseInt(btn.dataset.id));
        if (item) { textInput.value = item.text; updateCharAndWordCount(); speak(); }
      });
    });
    document.querySelectorAll(".del-q").forEach(btn => {
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

  // ── Analytics ───────────────────────────────────────────────────
  function updateAnalytics() {
    const achievements = calculateAchievements();
    const list = document.getElementById("achievementsList");
    if (list) {
      list.innerHTML = achievements.map(ach => `
        <div class="achievement-item ${ach.unlocked ? "" : "locked"}">
          <span class="achievement-icon">${ach.icon}</span>
          <div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.description}</div>
          </div>
          ${ach.unlocked ? `<svg class="achievement-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
        </div>
      `).join("");
    }
    updateStatsDisplay();
  }

  function calculateAchievements() {
    const streak = calculateStreak();
    return [
      { name: "First Listen",   description: "Listened to your first text",     icon: "🎯", unlocked: totalWordsListened > 0 },
      { name: "1,000 Words",    description: "Listened to 1,000 words",          icon: "📖", unlocked: totalWordsListened >= 1000 },
      { name: "10K Club",       description: "Listened to 10,000 words",         icon: "🏆", unlocked: totalWordsListened >= 10000 },
      { name: "7-Day Streak",   description: "Listened 7 days in a row",         icon: "🔥", unlocked: streak >= 7 },
      { name: "30-Day Streak",  description: "Listened 30 days in a row",        icon: "⭐", unlocked: streak >= 30 }
    ];
  }

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }
});
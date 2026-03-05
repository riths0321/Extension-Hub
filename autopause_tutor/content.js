(() => {
  if (window.__autoPauseTutorLoaded) return;
  window.__autoPauseTutorLoaded = true;

  const state = {
    video: null,
    enabled: true,
    inactivityLimit: 300,
    inactivitySeconds: 0,
    watchTimeToday: 0,
    watchDate: "",
    wasPausedByExtension: false,
    wasPlayingBeforeHidden: false,
    trackerInterval: null,
    videoLookupInterval: null,
    observer: null,
    activityEvents: ["mousemove", "keydown", "click", "scroll", "touchstart"],
    boundVideoPlay: null,
    boundVideoPause: null,
    lastActivity: Date.now(),
    isHidden: false,
    pendingResume: false
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  function attachVideo() {
    const candidate = document.querySelector("video");
    if (candidate && candidate !== state.video) {
      detachVideoListeners();
      state.video = candidate;
      bindVideoListeners();
      console.log('AutoPause: Video attached');
    }
  }

  function pauseIfPlaying(reason = '') {
    if (!state.video || state.video.paused || !state.enabled) return;
    
    state.video.pause();
    state.wasPausedByExtension = true;
    console.log(`AutoPause: Video paused (${reason})`);
  }

  function resumeIfPausedByExtension() {
    if (!state.video || !state.wasPausedByExtension || !state.enabled) return;
    
    // Don't resume if tab is hidden or user is inactive
    if (document.hidden || state.inactivitySeconds >= state.inactivityLimit) return;
    
    const playPromise = state.video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.then(() => {
        state.wasPausedByExtension = false;
        state.pendingResume = false;
        console.log('AutoPause: Video resumed');
      }).catch((error) => {
        console.log('AutoPause: Resume failed -', error);
        // Keep state.wasPausedByExtension true so we can try again later
      });
    } else {
      state.wasPausedByExtension = false;
      state.pendingResume = false;
    }
  }

  function onActivity() {
    state.lastActivity = Date.now();
    state.inactivitySeconds = 0;
    
    // Only try to resume if:
    // 1. Extension is enabled
    // 2. Tab is visible
    // 3. Video was paused by extension
    // 4. We're not already trying to resume
    if (state.enabled && !document.hidden && state.wasPausedByExtension && !state.pendingResume) {
      state.pendingResume = true;
      // Small delay to ensure video is ready
      setTimeout(resumeIfPausedByExtension, 100);
    }
  }

  function bindActivityListeners() {
    state.activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, onActivity, { passive: true });
    });
    // Also listen for wheel events
    document.addEventListener('wheel', onActivity, { passive: true });
  }

  function bindVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      if (!state.enabled) return;
      
      if (document.hidden) {
        // Tab hidden - pause video
        state.isHidden = true;
        state.wasPlayingBeforeHidden = Boolean(state.video && !state.video.paused);
        pauseIfPlaying('tab hidden');
      } else {
        // Tab visible again - check if we should resume
        state.isHidden = false;
        state.inactivitySeconds = 0;
        
        if (state.wasPlayingBeforeHidden && state.wasPausedByExtension) {
          // Small delay to ensure everything is ready
          setTimeout(() => {
            if (!document.hidden && state.enabled) {
              resumeIfPausedByExtension();
            }
          }, 300);
        }
        state.wasPlayingBeforeHidden = false;
      }
    });
  }

  function bindWindowFocusFallback() {
    window.addEventListener("blur", () => {
      if (!state.enabled || document.hidden) return;
      
      // Window lost focus but tab might still be visible
      // Only pause if there's no activity for a short while
      setTimeout(() => {
        const timeSinceLastActivity = (Date.now() - state.lastActivity) / 1000;
        if (timeSinceLastActivity >= 2 && !document.hidden && state.enabled) {
          state.wasPlayingBeforeHidden = Boolean(state.video && !state.video.paused);
          pauseIfPlaying('window blurred');
        }
      }, 2000);
    });

    window.addEventListener("focus", () => {
      if (!state.enabled) return;
      
      state.inactivitySeconds = 0;
      state.lastActivity = Date.now();
      
      if (state.wasPlayingBeforeHidden && state.wasPausedByExtension && !document.hidden) {
        setTimeout(resumeIfPausedByExtension, 300);
      }
      state.wasPlayingBeforeHidden = false;
    });
  }

  function onVideoPlay() {
    // User manually started video - clear our flags
    state.wasPausedByExtension = false;
    state.pendingResume = false;
    console.log('AutoPause: Video played manually');
  }

  function onVideoPause() {
    // If video is paused while tab is visible, it was likely manual
    if (!document.hidden && !state.wasPausedByExtension) {
      state.wasPausedByExtension = false;
      state.wasPlayingBeforeHidden = false;
      console.log('AutoPause: Video paused manually');
    }
  }

  function bindVideoListeners() {
    if (!state.video) return;
    state.boundVideoPlay = onVideoPlay;
    state.boundVideoPause = onVideoPause;
    state.video.addEventListener("play", state.boundVideoPlay);
    state.video.addEventListener("pause", state.boundVideoPause);
  }

  function detachVideoListeners() {
    if (!state.video) return;
    if (state.boundVideoPlay) {
      state.video.removeEventListener("play", state.boundVideoPlay);
    }
    if (state.boundVideoPause) {
      state.video.removeEventListener("pause", state.boundVideoPause);
    }
    state.boundVideoPlay = null;
    state.boundVideoPause = null;
  }

  function initMutationObserver() {
    state.observer = new MutationObserver(() => {
      if (!state.video || !document.contains(state.video)) {
        attachVideo();
      }
    });

    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function saveWatchTime() {
    chrome.storage.local.set({
      watchDate: state.watchDate,
      watchTimeToday: state.watchTimeToday
    });
  }

  function tick() {
    attachVideo();

    if (!state.video) return;

    const timeSinceLastActivity = (Date.now() - state.lastActivity) / 1000;
    state.inactivitySeconds = Math.min(timeSinceLastActivity, state.inactivityLimit + 1);

    // Track watch time only when video is playing and tab is visible
    if (!document.hidden && !state.video.paused && state.video.readyState > 0) {
      state.watchTimeToday += 1;

      if (state.watchTimeToday % 5 === 0) {
        saveWatchTime();
      }
    }

    // Check for inactivity pause
    if (state.enabled && !document.hidden && !state.video.paused) {
      if (state.inactivitySeconds >= state.inactivityLimit) {
        pauseIfPlaying('inactivity timeout');
      }
    }
  }

  function startIntervals() {
    state.trackerInterval = setInterval(tick, 1000);
    state.videoLookupInterval = setInterval(() => {
      if (!state.video) attachVideo();
    }, 2000);
  }

  function loadSettingsAndState() {
    chrome.storage.local.get([
      "enabled",
      "inactivityLimit",
      "watchTimeToday",
      "watchDate"
    ], (result) => {
      state.enabled = result.enabled ?? true;
      state.inactivityLimit = Number(result.inactivityLimit || 300);

      const currentDate = todayKey();
      const storedDate = result.watchDate || currentDate;
      state.watchDate = currentDate;

      if (storedDate === currentDate) {
        state.watchTimeToday = Number(result.watchTimeToday || 0);
      } else {
        state.watchTimeToday = 0;
        saveWatchTime();
      }
      
      console.log('AutoPause: Settings loaded', { enabled: state.enabled, limit: state.inactivityLimit });
    });
  }

  function bindStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;

      if (changes.enabled) {
        state.enabled = Boolean(changes.enabled.newValue);
        if (!state.enabled) {
          state.wasPausedByExtension = false;
          state.wasPlayingBeforeHidden = false;
          state.pendingResume = false;
          state.inactivitySeconds = 0;
        }
        console.log('AutoPause: Enabled state changed to', state.enabled);
      }

      if (changes.inactivityLimit) {
        const value = Number(changes.inactivityLimit.newValue);
        if (Number.isFinite(value) && value > 0) {
          state.inactivityLimit = value;
          console.log('AutoPause: Inactivity limit changed to', value);
        }
      }
    });
  }

  function init() {
    attachVideo();
    bindActivityListeners();
    bindVisibilityListener();
    bindWindowFocusFallback();
    bindStorageListener();
    loadSettingsAndState();
    initMutationObserver();
    startIntervals();

    window.addEventListener("beforeunload", () => {
      saveWatchTime();
      clearInterval(state.trackerInterval);
      clearInterval(state.videoLookupInterval);
      detachVideoListeners();
      if (state.observer) state.observer.disconnect();
    });
    
    console.log('AutoPause: Initialized');
  }

  init();
})();
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleBtn");
  const statusText = document.getElementById("statusText");
  const watchTimeDisplay = document.getElementById("watchTimeDisplay");
  const inactivitySelect = document.getElementById("inactivitySelect");
  const resetWatchTimeBtn = document.getElementById("resetWatchTimeBtn");

  const today = new Date().toISOString().slice(0, 10);

  // Load initial state
  chrome.storage.local.get(["enabled", "watchTimeToday", "watchDate", "inactivityLimit"], (result) => {
    const enabled = result.enabled ?? true;
    const inactivityLimit = Number(result.inactivityLimit || 300);

    toggleBtn.checked = enabled;
    updateStatusUI(enabled);

    // Set the correct select option
    const validOptions = [60, 180, 300, 600];
    if (validOptions.includes(inactivityLimit)) {
      inactivitySelect.value = String(inactivityLimit);
    } else {
      // If custom value, set to closest or default to 300
      inactivitySelect.value = "300";
    }

    const watchDate = result.watchDate || today;
    const watchTimeToday = watchDate === today ? Number(result.watchTimeToday || 0) : 0;
    displayWatchTime(watchTimeToday);

    // Reset if date changed
    if (watchDate !== today) {
      chrome.storage.local.set({ watchDate: today, watchTimeToday: 0 });
    }
  });

  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    
    if (changes.enabled) {
      updateStatusUI(changes.enabled.newValue);
    }
    
    if (changes.watchTimeToday || changes.watchDate) {
      chrome.storage.local.get(["watchTimeToday", "watchDate"], (result) => {
        const currentDate = today;
        const storedDate = result.watchDate || currentDate;
        const watchTimeToday = storedDate === currentDate ? Number(result.watchTimeToday || 0) : 0;
        displayWatchTime(watchTimeToday);
      });
    }
  });

  toggleBtn.addEventListener("change", () => {
    const enabled = toggleBtn.checked;
    chrome.storage.local.set({ enabled });
    // UI updates via storage listener
  });

  inactivitySelect.addEventListener("change", () => {
    const inactivityLimit = Number(inactivitySelect.value);
    chrome.storage.local.set({ inactivityLimit });
  });

  resetWatchTimeBtn.addEventListener("click", () => {
    chrome.storage.local.set({ 
      watchTimeToday: 0, 
      watchDate: today 
    }, () => {
      displayWatchTime(0);
    });
  });

  function updateStatusUI(enabled) {
    statusText.textContent = enabled ? "ACTIVE" : "INACTIVE";
    statusText.classList.toggle("off", !enabled);
  }

  function displayWatchTime(totalSeconds) {
    const seconds = Number(totalSeconds || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Format with leading zeros for minutes and seconds
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = secs.toString().padStart(2, '0');
    
    watchTimeDisplay.textContent = `Today's Watch Time: ${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`;
  }
});
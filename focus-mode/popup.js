// Status banner sync
function updateStatusBanner(isOn) {
  const banner = document.getElementById("statusBanner");
  const label = document.getElementById("statusLabel");
  if (!banner || !label) return;
  banner.classList.toggle("active", isOn);
  label.textContent = isOn ? "Focus is active" : "Focus is off";
}

// Show current time in status
function tickTime() {
  const el = document.getElementById("statusTime");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

tickTime();
setInterval(tickTime, 10000);

const input = document.getElementById("site");
const list = document.getElementById("list");
const whitelistInput = document.getElementById("whitelist-site");
const whitelistList = document.getElementById("whitelist-list");
const toggle = document.getElementById("focusToggle");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const dailyGoalInput = document.getElementById("dailyGoal");
const newGoalInput = document.getElementById("newGoal");
const goalsList = document.getElementById("goalsList");
const resetStatsBtn = document.getElementById("resetStats");
const blocklistCard = document.getElementById("blocklist-card");
const whitelistCard = document.getElementById("whitelist-card");
const weeklyChallengeEl = document.getElementById("weeklyChallenge");
const goalProgressValue = document.getElementById("goalProgressValue");
const goalProgressPercent = document.getElementById("goalProgressPercent");
const goalProgressBar = document.getElementById("goalProgressBar");
const topSitesList = document.getElementById("topSites");
const achievementsList = document.getElementById("achievements");

let currentMode = "blocklist";

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setEmptyState(container, message, className = "empty-state") {
  clearChildren(container);
  const item = document.createElement("li");
  item.className = `metric-item ${className}`;
  item.textContent = message;
  container.appendChild(item);
}

function createSiteItem(site, badgeText, onRemove) {
  const li = document.createElement("li");
  li.className = "site-item";

  const icon = document.createElement("div");
  icon.className = "site-fav";
  icon.textContent = badgeText;

  const name = document.createElement("span");
  name.className = "site-name";
  name.textContent = site;

  const button = document.createElement("button");
  button.className = "site-del";
  button.title = "Remove";
  button.type = "button";
  button.textContent = "×";
  button.addEventListener("click", () => onRemove(site));

  li.append(icon, name, button);
  return li;
}

function updateModeVisibility(mode) {
  currentMode = mode === "whitelist" ? "whitelist" : "blocklist";
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });

  blocklistCard.hidden = currentMode !== "blocklist";
  whitelistCard.hidden = currentMode !== "whitelist";
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tabName}-tab`).classList.add("active");
    if (tabName === "stats") updateStats();
    if (tabName === "goals") loadGoals();
  });
});

// Mode switching
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    updateModeVisibility(btn.dataset.mode);
    chrome.storage.sync.set({ mode: currentMode });

    if (currentMode === "blocklist") {
      render();
    } else {
      renderWhitelist();
    }
  });
});

// Add to blocklist
document.getElementById("add").addEventListener("click", () => {
  chrome.storage.sync.get(["blocked"], (res) => {
    const blocked = res.blocked || [];
    const site = input.value.trim();
    if (site && !blocked.includes(site)) {
      blocked.push(site);
      chrome.storage.sync.set({ blocked }, render);
    }
    input.value = "";
  });
});

// Add to whitelist
document.getElementById("add-whitelist").addEventListener("click", () => {
  chrome.storage.sync.get(["whitelist"], (res) => {
    const whitelist = res.whitelist || [];
    const site = whitelistInput.value.trim();
    if (site && !whitelist.includes(site)) {
      whitelist.push(site);
      chrome.storage.sync.set({ whitelist }, renderWhitelist);
    }
    whitelistInput.value = "";
  });
});

toggle.addEventListener("change", () => {
  const isEnabled = toggle.checked;
  chrome.storage.sync.set({ focusOn: isEnabled }, () => {
    updateStatusBanner(isEnabled);
  });
});
startTimeInput.addEventListener("change", () => chrome.storage.sync.set({ startTime: startTimeInput.value }));
endTimeInput.addEventListener("change", () => chrome.storage.sync.set({ endTime: endTimeInput.value }));

// Set daily goal
document.getElementById("setGoal").addEventListener("click", () => {
  const goal = parseInt(dailyGoalInput.value, 10);
  if (goal > 0) {
    chrome.storage.sync.set({ dailyGoal: goal });
    updateGoalProgress();
  }
});

// Add daily goal
document.getElementById("addGoal").addEventListener("click", () => {
  if (newGoalInput.value) {
    chrome.storage.sync.get(["dailyGoals"], (res) => {
      const goals = res.dailyGoals || [];
      goals.push({ text: newGoalInput.value, completed: false });
      chrome.storage.sync.set({ dailyGoals: goals }, loadGoals);
      newGoalInput.value = "";
    });
  }
});

// Reset statistics
resetStatsBtn.addEventListener("click", () => {
  if (confirm("Reset all statistics? This cannot be undone.")) {
    chrome.storage.sync.set({
      blockCount: 0,
      dailyFocusTime: 0, 
      focusStreak: 0,
      totalBlocks: 0
    });
    updateStats();
  }
});

// Weekly challenge
document.getElementById("newChallenge").addEventListener("click", () => {
  const challenges = [
    "No social media for 3 days straight",
    "Complete 5 Pomodoro sessions daily",
    "Meditate for 10 minutes before work",
    "Read for 30 minutes instead of scrolling",
    "Achieve 4 hours of deep work daily",
    "Avoid all distractions for 2 days"
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  chrome.storage.sync.set({ weeklyChallenge: challenge });
  weeklyChallengeEl.textContent = challenge;
});

function removeSite(site) {
  chrome.storage.sync.get(["blocked"], (res) => {
    const updated = (res.blocked || []).filter(s => s !== site);
    chrome.storage.sync.set({ blocked: updated }, render);
  });
}

function removeWhitelistSite(site) {
  chrome.storage.sync.get(["whitelist"], (res) => {
    const updated = (res.whitelist || []).filter(s => s !== site);
    chrome.storage.sync.set({ whitelist: updated }, renderWhitelist);
  });
}

function render() {
  chrome.storage.sync.get(["blocked", "focusOn", "startTime", "endTime", "mode", "dailyGoal"], (res) => {
    clearChildren(list);
    const blockedSites = res.blocked || [];

    if (blockedSites.length === 0) {
      setEmptyState(list, "No blocked sites yet.", "empty-state");
    } else {
      blockedSites.forEach((site) => {
        list.appendChild(createSiteItem(site, "BL", removeSite));
      });
    }

    toggle.checked = res.focusOn || false;
    updateStatusBanner(res.focusOn || false);
    startTimeInput.value = res.startTime || "09:00";
    endTimeInput.value = res.endTime || "18:00";
    dailyGoalInput.value = res.dailyGoal || "";
    updateModeVisibility(res.mode);
  });
}

function renderWhitelist() {
  chrome.storage.sync.get(["whitelist"], (res) => {
    clearChildren(whitelistList);
    const whitelistSites = res.whitelist || [];

    if (whitelistSites.length === 0) {
      setEmptyState(whitelistList, "No allowed sites yet.", "empty-state");
      return;
    }

    whitelistSites.forEach((site) => {
      whitelistList.appendChild(createSiteItem(site, "OK", removeWhitelistSite));
    });
  });
}

function updateStats() {
  chrome.storage.sync.get(["blockCount", "dailyFocusTime", "focusStreak", "totalBlocks"], (res) => {
    document.getElementById("blockCount").textContent = res.blockCount || 0;
    document.getElementById("focusTime").textContent = res.dailyFocusTime || 0;
    document.getElementById("streak").textContent = res.focusStreak || 0;
    document.getElementById("totalBlocks").textContent = res.totalBlocks || 0;
  });

  chrome.storage.local.get(["siteAnalytics"], (res) => {
    const analytics = res.siteAnalytics || {};
    const today = new Date().toDateString();
    const todaySites = analytics[today] || {};
    const sorted = Object.entries(todaySites).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (sorted.length === 0) {
      setEmptyState(topSitesList, "No site activity yet.");
      return;
    }

    clearChildren(topSitesList);
    sorted.forEach(([site, count]) => {
      const li = document.createElement("li");
      li.className = "metric-item";

      const name = document.createElement("span");
      name.className = "top-site-name";
      name.textContent = site;

      const visits = document.createElement("span");
      visits.className = "site-visit-count";
      visits.textContent = `${count} visits`;

      li.append(name, visits);
      topSitesList.appendChild(li);
    });
  });

  chrome.storage.sync.get(["focusStreak", "totalBlocks"], (res) => {
    const achievements = [];
    if ((res.focusStreak || 0) >= 7) achievements.push("🔥 7-Day Focus Streak!");
    if ((res.totalBlocks || 0) >= 100) achievements.push("🎯 100 Distractions Blocked!");
    if ((res.focusStreak || 0) >= 30) achievements.push("🏆 Focus Master!");

    clearChildren(achievementsList);
    if (achievements.length === 0) {
      setEmptyState(achievementsList, "Complete goals to earn achievements!");
    } else {
      achievements.forEach((achievement) => {
        const li = document.createElement("li");
        li.className = "metric-item";
        li.textContent = achievement;
        achievementsList.appendChild(li);
      });
    }
  });
}

function updateGoalProgress() {
  chrome.storage.sync.get(["dailyGoal", "dailyFocusTime"], (res) => {
    const goal = res.dailyGoal || 60;
    const current = res.dailyFocusTime || 0;
    const percent = Math.min(100, (current / goal) * 100);

    goalProgressValue.textContent = `${current} / ${goal} min`;
    goalProgressPercent.textContent = `${Math.round(percent)}%`;
    goalProgressBar.value = percent;
  });
}

function loadGoals() {
  chrome.storage.sync.get(["dailyGoals"], (res) => {
    const goals = res.dailyGoals || [];
    clearChildren(goalsList);

    if (goals.length === 0) {
      setEmptyState(goalsList, "Add a goal to start building momentum.");
    } else {
      goals.forEach((goal, index) => {
        const li = document.createElement("li");
        li.className = "goal-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = goal.completed;
        checkbox.addEventListener("change", () => toggleGoal(index));

        const text = document.createElement("span");
        text.className = `goal-text ${goal.completed ? "done" : ""}`;
        text.textContent = goal.text;

        const button = document.createElement("button");
        button.className = "site-del";
        button.title = "Delete";
        button.type = "button";
        button.textContent = "×";
        button.addEventListener("click", () => deleteGoal(index));

        li.append(checkbox, text, button);
        goalsList.appendChild(li);
      });
    }
  });

  chrome.storage.sync.get(["weeklyChallenge"], (res) => {
    if (res.weeklyChallenge) {
      weeklyChallengeEl.textContent = res.weeklyChallenge;
    } else {
      weeklyChallengeEl.textContent = "Click 'New Challenge' to get started!";
    }
  });
}

function toggleGoal(index) {
  chrome.storage.sync.get(["dailyGoals"], (res) => {
    const goals = res.dailyGoals || [];
    if (!goals[index]) return;
    goals[index].completed = !goals[index].completed;
    chrome.storage.sync.set({ dailyGoals: goals }, loadGoals);
  });
}

function deleteGoal(index) {
  chrome.storage.sync.get(["dailyGoals"], (res) => {
    const goals = res.dailyGoals || [];
    if (!goals[index]) return;
    goals.splice(index, 1);
    chrome.storage.sync.set({ dailyGoals: goals }, loadGoals);
  });
}

function attachEnterKey(inputElement, actionButton) {
  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      actionButton.click();
    }
  });
}

attachEnterKey(input, document.getElementById("add"));
attachEnterKey(whitelistInput, document.getElementById("add-whitelist"));
attachEnterKey(newGoalInput, document.getElementById("addGoal"));

// Initialize
render();
renderWhitelist();
updateStats();
updateGoalProgress();
loadGoals();
setInterval(updateStats, 60000); // Update stats every minute

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.siteAnalytics) {
    updateStats();
    return;
  }

  if (areaName !== "sync") return;

  if (changes.focusOn) {
    const isEnabled = Boolean(changes.focusOn.newValue);
    toggle.checked = isEnabled;
    updateStatusBanner(isEnabled);
  }

  if (changes.blocked || changes.startTime || changes.endTime) {
    render();
  }

  if (changes.whitelist) {
    renderWhitelist();
  }

  if (changes.mode) {
    updateModeVisibility(changes.mode.newValue);
  }

  if (changes.dailyGoal || changes.dailyFocusTime) {
    updateGoalProgress();
  }

  if (changes.dailyGoals || changes.weeklyChallenge) {
    loadGoals();
  }

  if (changes.blockCount || changes.focusStreak || changes.totalBlocks || changes.dailyFocusTime) {
    updateStats();
  }
});

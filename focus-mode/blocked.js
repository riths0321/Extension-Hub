const btn = document.getElementById("unlock");
const countdownEl = document.getElementById("countdown");
const unlockLabel = document.getElementById("unlockLabel");
const unlockMeta = document.getElementById("unlockMeta");
const quoteBox = document.getElementById("motivational-quote");
const quoteLoading = document.getElementById("quote-loading");
const streakContainer = document.getElementById("streak-container");
const streakProgress = document.getElementById("streak-progress");
const milestoneText = document.getElementById("milestone-text");
const tipElement = document.getElementById("tip-of-day");
let timeLeft = 0;

// Expanded motivational quotes array with categories
const quotes = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    category: "action",
  },
  {
    text: "Your future is created by what you do today, not tomorrow.",
    author: "Robert Kiyosaki",
    category: "future",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
    category: "discipline",
  },
  {
    text: "The pain of discipline weighs ounces, the pain of regret weighs tons.",
    author: "Unknown",
    category: "discipline",
  },
  {
    text: "Success is nothing more than a few simple disciplines, practiced every day.",
    author: "Jim Rohn",
    category: "success",
  },
  {
    text: "It's not about having time, it's about making time.",
    author: "Unknown",
    category: "time",
  },
  {
    text: "Small disciplines repeated with consistency every day lead to great achievements.",
    author: "John Maxwell",
    category: "consistency",
  },
  {
    text: "The only limit to our realization of tomorrow is our doubts of today.",
    author: "Franklin D. Roosevelt",
    category: "mindset",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    category: "action",
  },
  {
    text: "Focus is a matter of deciding what things you're not going to do.",
    author: "John Carmack",
    category: "focus",
  },
  {
    text: "The ability to concentrate and to use your time well is everything.",
    author: "Lee Iacocca",
    category: "focus",
  },
  {
    text: "Where focus goes, energy flows.",
    author: "Tony Robbins",
    category: "focus",
  },
  {
    text: "Your mind is a powerful thing. When you fill it with positive thoughts, your life will start to change.",
    author: "Unknown",
    category: "mindset",
  },
  {
    text: "The difference between who you are and who you want to be is what you do.",
    author: "Unknown",
    category: "action",
  },
  {
    text: "Stay focused, go after your dreams and keep moving toward your goals.",
    author: "LL Cool J",
    category: "goals",
  },
  {
    text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
    category: "focus",
  },
  {
    text: "You can't depend on your eyes when your imagination is out of focus.",
    author: "Mark Twain",
    category: "mindset",
  },
  {
    text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.",
    author: "Zig Ziglar",
    category: "time",
  },
];

// Daily tips array
const tips = [
  "💡 Tip: Take a deep breath. Your future self will thank you.",
  "💡 Tip: Try the Pomodoro Technique: 25 minutes of focus, 5 minutes break.",
  "💡 Tip: Put your phone in another room while working.",
  "💡 Tip: Drink water to stay hydrated and maintain focus.",
  "💡 Tip: Write down what you want to accomplish today.",
  "💡 Tip: Close unnecessary tabs to reduce digital clutter.",
  "💡 Tip: Your brain needs rest. Take short breaks regularly.",
  "💡 Tip: Exercise can improve your concentration and focus.",
  "💡 Tip: Create a dedicated workspace free from distractions.",
  "💡 Tip: Listen to instrumental music to help maintain focus.",
  "💡 Tip: Set specific goals for each work session.",
  "💡 Tip: Remember why you started this focus session.",
];

// Function to update quote with animation
function updateQuote() {
  if (quoteLoading) quoteLoading.hidden = false;

  const quoteSpan = quoteBox?.querySelector(".quote");
  const authorSpan = quoteBox?.querySelector(".author");

  quoteBox?.classList.add("is-updating");

  setTimeout(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    if (quoteSpan) quoteSpan.textContent = `“${randomQuote.text}”`;
    if (authorSpan) authorSpan.textContent = `— ${randomQuote.author}`;
    if (quoteLoading) quoteLoading.hidden = true;
    quoteBox?.classList.remove("is-updating");
  }, 300);
}

// Update tip of the day
function updateTip() {
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  if (tipElement) {
    tipElement.textContent = randomTip;
  }
}

// Update streak progress (next milestone)
function updateStreakProgress(streak) {
  const milestones = [1, 3, 7, 14, 30, 60, 100];
  let nextMilestone = milestones.find((m) => m > streak) || streak + 10;
  let progress = 0;

  if (streak === 0) {
    progress = 0;
  } else if (streak >= 100) {
    progress = 100;
    nextMilestone = 100;
  } else {
    const previousMilestone = milestones.filter((m) => m <= streak).pop() || 0;
    const milestoneRange = nextMilestone - previousMilestone;
    const streakProgressInMilestone = streak - previousMilestone;
    progress = (streakProgressInMilestone / milestoneRange) * 100;
  }

  if (streakProgress) {
    streakProgress.value = Math.min(100, progress);
    streakProgress.hidden = streak <= 0;
  }

  return nextMilestone;
}

// Load and display focus streak
function loadFocusStreak() {
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(["focusStreak"], (res) => {
      const streak = res.focusStreak || 0;
      const streakCountEl = document.getElementById("streak-count");
      if (streakCountEl) {
        streakCountEl.textContent = streak;
      }

      if (streakContainer) {
        streakContainer.hidden = streak <= 0;
      }

      if (streak > 0) {
        const nextMilestone = updateStreakProgress(streak);
        if (milestoneText) {
          milestoneText.hidden = false;
          milestoneText.textContent = `Next milestone: ${nextMilestone} days`;
        }
      } else if (milestoneText) {
        milestoneText.hidden = true;
      }
    });
  } else {
    if (streakContainer) streakContainer.hidden = true;
    if (streakProgress) streakProgress.hidden = true;
    if (milestoneText) milestoneText.hidden = true;
  }
}

// Emergency access logic
function checkEmergencyState() {
  if (!btn) return;
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(["emergencyUntil"], (res) => {
      const now = Date.now();
      const until = res.emergencyUntil || 0;
      if (now < until) {
        // Access is active, show countdown and disable button
        btn.disabled = true;
        btn.classList.remove("is-ready");
        const secondsLeft = Math.ceil((until - now) / 1000);
        const min = Math.floor(secondsLeft / 60);
        const sec = secondsLeft % 60;
        unlockLabel.textContent = `Emergency access: ${min}:${sec.toString().padStart(2, "0")} left`;
        unlockMeta.textContent = "You can use this again after it expires.";
        // Poll every second
        setTimeout(checkEmergencyState, 1000);
      } else {
        // Access is not active, enable button
        btn.disabled = false;
        btn.classList.add("is-ready");
        unlockLabel.textContent = "Emergency 10-min Access";
        unlockMeta.textContent = "You can use this once every 10 minutes.";
      }
    });
  }
}
checkEmergencyState();

function handleEmergencyAccess() {
  if (!btn) return;
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(["emergencyUntil"], (res) => {
      const now = Date.now();
      const until = res.emergencyUntil || 0;
      if (now < until) {
        // Already active, do nothing
        return;
      }
      chrome.storage.sync.set({ emergencyUntil: now + 10 * 60 * 1000 }, () => {
        window.history.back();
      });
    });
  } else {
    // Fallback for testing
    window.history.back();
  }
}

// Emergency access handler
if (btn) {
  btn.addEventListener("click", handleEmergencyAccess);
}

// Keyboard shortcut: Press 'Escape' to unlock faster (after countdown)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && timeLeft <= 0 && btn && !btn.disabled) {
    btn.click();
  }
});

// Rotate quote every 20 seconds
updateQuote();
setInterval(updateQuote, 20000);

// Update tip every 45 seconds
updateTip();
setInterval(updateTip, 45000);

// Load streak on page load
loadFocusStreak();

// Log focus attempt for analytics
if (chrome?.storage?.sync) {
  chrome.storage.sync.get(["blockCount"], (res) => {
    const currentBlocks = res.blockCount || 0;
    // This is just for tracking, no UI update needed
  });
}

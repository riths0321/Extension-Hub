const el = {
  question: document.getElementById("question"),
  solution: document.getElementById("solution"),
  solutionContainer: document.getElementById("solutionContainer"),
  language: document.getElementById("language"),
  difficulty: document.getElementById("difficulty"),
  difficultyBadge: document.getElementById("difficultyBadge"),
  showSolution: document.getElementById("showSolution"),
  newPuzzle: document.getElementById("newPuzzle"),
  markSolved: document.getElementById("markSolved"),
  copyBtn: document.getElementById("copyBtn"),
  solvedChip: document.getElementById("solvedChip"),
  questionMode: document.getElementById("questionMode"),
  statusBar: document.getElementById("statusBar"),
  streakCount: document.getElementById("streakCount"),
  totalSolved: document.getElementById("totalSolved"),
  easySolved: document.getElementById("easySolved"),
  mediumSolved: document.getElementById("mediumSolved"),
  hardSolved: document.getElementById("hardSolved"),
  bestStreak: document.getElementById("bestStreak")
};

let currentPuzzle = null;
let currentPuzzleId = "";

const DEFAULT_STATS = {
  streak: 0,
  lastSolvedDate: null,
  totalSolved: 0,
  easySolved: 0,
  mediumSolved: 0,
  hardSolved: 0,
  bestStreak: 0,
  solvedPuzzles: []
};

const state = {
  stats: { ...DEFAULT_STATS, solvedPuzzles: new Set() },
  prefs: {
    language: "javascript",
    difficulty: "all"
  }
};

init().catch((error) => {
  setStatus(error.message || "Initialization failed", true);
});

async function init() {
  await loadFromStorage();
  bindEvents();
  updateStatsDisplay();
  loadPuzzle(false);
}

function bindEvents() {
  el.language.addEventListener("change", async () => {
    state.prefs.language = el.language.value;
    await savePrefs();
    loadPuzzle(false);
  });

  el.difficulty.addEventListener("change", async () => {
    state.prefs.difficulty = el.difficulty.value;
    await savePrefs();
    loadPuzzle(false);
  });

  el.newPuzzle.addEventListener("click", () => {
    loadPuzzle(true);
  });

  el.showSolution.addEventListener("click", () => {
    const hidden = el.solutionContainer.classList.contains("hidden");
    if (hidden) {
      el.solutionContainer.classList.remove("hidden");
      el.showSolution.textContent = "Hide Solution";
      if (!isCurrentPuzzleSolved()) {
        el.markSolved.classList.remove("hidden");
      }
    } else {
      el.solutionContainer.classList.add("hidden");
      el.showSolution.textContent = "Show Solution";
      el.markSolved.classList.add("hidden");
    }
  });

  el.markSolved.addEventListener("click", () => {
    markCurrentSolved().catch(() => {
      setStatus("Unable to mark solved right now.", true);
    });
  });

  el.copyBtn.addEventListener("click", () => {
    copySolution().catch(() => {
      setStatus("Copy failed.", true);
    });
  });
}

async function loadFromStorage() {
  const result = await chrome.storage.local.get(["stats", "prefs"]);

  if (result.stats) {
    state.stats = {
      ...DEFAULT_STATS,
      ...result.stats,
      solvedPuzzles: new Set(result.stats.solvedPuzzles || [])
    };
  }

  if (result.prefs) {
    state.prefs = {
      ...state.prefs,
      ...result.prefs
    };
  }

  normalizeStreakForGap();

  el.language.value = state.prefs.language;
  el.difficulty.value = state.prefs.difficulty;
}

function normalizeStreakForGap() {
  if (!state.stats.lastSolvedDate) return;

  const last = toDateOnly(state.stats.lastSolvedDate);
  const today = toDateOnly(new Date());
  const yesterday = toDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (last !== today && last !== yesterday) {
    state.stats.streak = 0;
  }
}

async function saveStats() {
  await chrome.storage.local.set({
    stats: {
      ...state.stats,
      solvedPuzzles: Array.from(state.stats.solvedPuzzles)
    }
  });
}

async function savePrefs() {
  await chrome.storage.local.set({
    prefs: {
      language: state.prefs.language,
      difficulty: state.prefs.difficulty
    }
  });
}

function getAvailablePuzzles() {
  const lang = el.language.value;
  const all = PUZZLES[lang] || [];
  const diff = el.difficulty.value;
  if (diff === "all") return all;
  return all.filter((p) => p.difficulty === diff);
}

function getDailyIndex(total) {
  const seed = `${toDateOnly(new Date())}-${el.language.value}-${el.difficulty.value}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % total;
}

function getPuzzleId(puzzle) {
  const safeQuestion = String(puzzle.question || "").slice(0, 80);
  return `${el.language.value}|${puzzle.difficulty}|${safeQuestion}`;
}

function loadPuzzle(isRandom) {
  const list = getAvailablePuzzles();
  resetPuzzleUI();

  if (!list.length) {
    currentPuzzle = null;
    currentPuzzleId = "";
    el.question.textContent = "No puzzles found for this filter.";
    el.difficultyBadge.textContent = "-";
    el.difficultyBadge.className = "difficulty-badge";
    el.questionMode.textContent = "No Match";
    setStatus("Try a different difficulty filter.");
    return;
  }

  let index = getDailyIndex(list.length);
  if (isRandom) {
    index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && currentPuzzleId === getPuzzleId(list[index])) {
      index = (index + 1) % list.length;
    }
  }

  currentPuzzle = list[index];
  currentPuzzleId = getPuzzleId(currentPuzzle);

  el.question.textContent = currentPuzzle.question;
  el.solution.textContent = currentPuzzle.solution;
  el.questionMode.textContent = isRandom ? "Random Challenge" : "Daily Challenge";
  el.difficultyBadge.textContent = currentPuzzle.difficulty;
  el.difficultyBadge.className = `difficulty-badge difficulty-${currentPuzzle.difficulty}`;

  const solved = isCurrentPuzzleSolved();
  if (solved) {
    el.solvedChip.classList.remove("hidden");
    setStatus("Already solved. Pick random for a new one.");
  } else {
    el.solvedChip.classList.add("hidden");
    setStatus(isRandom ? "Random puzzle loaded." : "Daily puzzle loaded.");
  }
}

function resetPuzzleUI() {
  el.solutionContainer.classList.add("hidden");
  el.showSolution.textContent = "Show Solution";
  el.markSolved.classList.add("hidden");
}

function isCurrentPuzzleSolved() {
  if (!currentPuzzleId) return false;
  return state.stats.solvedPuzzles.has(currentPuzzleId);
}

async function markCurrentSolved() {
  if (!currentPuzzle || !currentPuzzleId) return;
  if (isCurrentPuzzleSolved()) {
    setStatus("Puzzle already marked solved.");
    el.markSolved.classList.add("hidden");
    el.solvedChip.classList.remove("hidden");
    return;
  }

  const today = toDateOnly(new Date());
  const yesterday = toDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const last = state.stats.lastSolvedDate ? toDateOnly(state.stats.lastSolvedDate) : null;

  if (last === today) {
    // Keep streak unchanged when solving multiple puzzles in one day.
  } else if (!last || last === yesterday) {
    state.stats.streak += 1;
  } else {
    state.stats.streak = 1;
  }

  state.stats.lastSolvedDate = new Date().toISOString();
  state.stats.totalSolved += 1;
  state.stats.solvedPuzzles.add(currentPuzzleId);

  if (currentPuzzle.difficulty === "easy") state.stats.easySolved += 1;
  if (currentPuzzle.difficulty === "medium") state.stats.mediumSolved += 1;
  if (currentPuzzle.difficulty === "hard") state.stats.hardSolved += 1;

  if (state.stats.streak > state.stats.bestStreak) {
    state.stats.bestStreak = state.stats.streak;
  }

  await saveStats();
  updateStatsDisplay();

  el.markSolved.classList.add("hidden");
  el.solvedChip.classList.remove("hidden");
  setStatus("Great work. Puzzle marked as solved.");
}

function updateStatsDisplay() {
  el.streakCount.textContent = String(state.stats.streak);
  el.totalSolved.textContent = String(state.stats.totalSolved);
  el.easySolved.textContent = String(state.stats.easySolved);
  el.mediumSolved.textContent = String(state.stats.mediumSolved);
  el.hardSolved.textContent = String(state.stats.hardSolved);
  el.bestStreak.textContent = String(state.stats.bestStreak);
}

async function copySolution() {
  const text = el.solution.textContent;
  const original = el.copyBtn.textContent;

  if (!text) {
    setStatus("No solution to copy.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(temp);
    if (!ok) throw new Error("Copy command failed");
  }

  el.copyBtn.textContent = "Copied";
  setStatus("Solution copied.");
  setTimeout(() => {
    el.copyBtn.textContent = original;
  }, 1200);
}

function setStatus(message, isError = false) {
  el.statusBar.textContent = message || "";
  el.statusBar.style.color = isError ? "#b73440" : "#72657f";
}

function toDateOnly(input) {
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

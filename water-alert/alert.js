'use strict';

const DRINK_AMOUNT = 250;

function createDrops() {
  const container = document.getElementById('drops-container');
  if (!container) return;

  const colors = ['#4fc3f7', '#80deea', '#26c6da', '#b3e5fc'];

  for (let i = 0; i < 12; i++) {
    const drop = document.createElement('div');
    drop.className = 'drop';

    const size = 4 + Math.random() * 7;

    drop.style.left = `${Math.random() * 100}%`;
    drop.style.width = `${size}px`;
    drop.style.height = `${size * 1.4}px`;
    drop.style.background = colors[Math.floor(Math.random() * colors.length)];
    drop.style.opacity = `${0.1 + Math.random() * 0.25}`;
    drop.style.animationDuration = `${5 + Math.random() * 8}s`;
    drop.style.animationDelay = `${Math.random() * 6}s`;

    container.appendChild(drop);
  }
}

function updateUI(consumed, goal, streak) {
  consumed = consumed || 0;
  goal = goal || 3000;
  streak = streak || 0;

  const percent = Math.min(Math.round((consumed / goal) * 100), 100);
  const circumference = 314; // 2 * PI * 50
  const offset = circumference - (percent / 100) * circumference;

  const ringFill = document.getElementById('ring-fill');
  const ringPercent = document.getElementById('ring-percent');
  const statusText = document.getElementById('status-text');
  const progressFill = document.getElementById('progress-fill');
  const streakCount = document.getElementById('streak-count');

  if (ringFill) {
    ringFill.style.strokeDashoffset = offset;
  }
  if (ringPercent) ringPercent.textContent = `${percent}%`;
  if (statusText) statusText.textContent = `${consumed.toLocaleString()} / ${goal.toLocaleString()} ml`;
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
    if (percent > 0) progressFill.classList.add('active');
  }
  if (streakCount) streakCount.textContent = streak;
}

async function init() {
  createDrops();
  const data = await chrome.storage.sync.get(['consumed', 'goal', 'streak']);
  updateUI(data.consumed || 0, data.goal || 3000, data.streak || 0);
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  const drinkBtn = document.getElementById('drink-btn');
  const snoozeBtn = document.getElementById('snooze-btn');

  if (drinkBtn) {
    drinkBtn.addEventListener('click', async () => {
      // Ripple
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.classList.add('ripple-effect');
      drinkBtn.style.position = 'relative';
      drinkBtn.style.overflow = 'hidden';
      drinkBtn.appendChild(ripple);

      const data = await chrome.storage.sync.get(['consumed', 'goal', 'streak']);
      const newConsumed = (data.consumed || 0) + DRINK_AMOUNT;
      await chrome.storage.sync.set({ consumed: newConsumed });
      updateUI(newConsumed, data.goal || 3000, data.streak || 0);

      drinkBtn.textContent = '✓ Logged!';
      drinkBtn.disabled = true;

      setTimeout(() => window.close(), 800);
    });
  }

  if (snoozeBtn) {
    snoozeBtn.addEventListener('click', async () => {
      await chrome.alarms.clear('water');
      chrome.alarms.create('water', { delayInMinutes: 5 });
      window.close();
    });
  }
});

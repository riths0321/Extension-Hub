# 💧 Water Alert v3.0

---

## ✨ What's New in v3.0

- **Glassmorphism UI** — Dark theme with glass cards, blur effects, and gradient accents
- **Animated background** — Floating orbs and rising water drops
- **Progress ring** — Circular progress indicator in the alert popup
- **Better streak logic** — Resets properly at midnight, tracks goal completion
- **Overnight quiet hours** — Works correctly across midnight (e.g. 22:00–07:00)
- **Goal-aware alerts** — No more reminders once you've hit your daily goal
- **CSP compliant** — No inline scripts or styles, safe for Chrome MV3

---

## 🚀 Features

- Set reminder intervals (1–180 min) or enable hourly mode
- Log 250ml per click from either the popup or alert window
- Daily goal tracking with visual progress bar + ring
- Streak counter — earn streaks by hitting your daily goal
- Quiet hours with overnight span support
- Floating water drop animations

---

## 📂 Files

```
water-alert/
├── icons/            # 16, 48, 128px icons
├── manifest.json     # MV3 config
├── background.js     # Alarm scheduler + daily reset
├── popup.html/js     # Extension popup UI
├── alert.html/js     # Reminder popup window
└── style.css         # Shared glassmorphism styles
```

---

## ⚙️ Installation

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `water-alert` folder

---

## 🔐 Permissions

- `alarms` — Schedule recurring reminders
- `storage` — Save your settings and daily progress
- `windows` — Open the reminder popup window

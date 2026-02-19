# 🍅 Focus – Premium Pomodoro Timer
### Made by Saurabh Tiwari

A beautifully crafted Chrome Extension (Manifest V3) with a dark premium UI, session tracking, and proper background timer.

---

## 📂 Final Folder Structure

```
pomodoro/
│
├── icons/
│   ├── icon16.png          ← You already have this ✅
│   ├── icon48.png          ← You already have this ✅
│   ├── icon128.png         ← You already have this ✅
│   └── alarm.mp3           ← 🔔 ADD YOUR ALARM SOUND HERE (see below)
│
├── manifest.json
├── background.js           ← Service Worker (alarm-based timer)
├── popup.html              ← Extension UI
├── popup.js                ← UI logic
├── styles.css              ← Premium dark theme
└── README.md
```

---

## 🔔 How to Add Alarm Sound

Chrome Extensions **cannot play audio from the background service worker** directly.  
The sound must be played from the **popup** (which has access to the Web Audio API).

### Step 1 — Add your audio file
Place your sound file inside the `icons/` folder (or create a new `sounds/` folder):

```
icons/alarm.mp3
```

> ✅ Supported formats: `.mp3`, `.ogg`, `.wav`  
> 🎵 Recommended: a short 1–3 second chime (keep file size small)

### Step 2 — Add this to `manifest.json` under `"web_accessible_resources"`

```json
"web_accessible_resources": [
  {
    "resources": ["icons/alarm.mp3"],
    "matches": ["<all_urls>"]
  }
]
```

### Step 3 — Add this function to `popup.js`

Paste this near the top of `popup.js`:

```js
function playAlarm() {
  const audio = new Audio(chrome.runtime.getURL("icons/alarm.mp3"));
  audio.volume = 0.8;
  audio.play().catch(() => {});
}
```

### Step 4 — Call `playAlarm()` when timer hits zero

Inside the `render()` function in `popup.js`, find the section where `time === 0` and add the call.
Or, listen for a storage change from the background:

```js
chrome.storage.onChanged.addListener((changes) => {
  if (changes.pomodoro) {
    const newVal = changes.pomodoro.newValue;
    const oldVal = changes.pomodoro.oldValue;
    // Play sound when timer just stopped (session ended)
    if (oldVal && oldVal.running && !newVal.running && newVal.time === newVal.totalTime) {
      playAlarm();
    }
    render(newVal);
  }
});
```

---

## ⚙️ Installation (Developer Mode)

1. Download / unzip the `pomodoro/` folder
2. Open Chrome → go to `chrome://extensions`
3. Toggle **Developer Mode** ON (top-right corner)
4. Click **Load unpacked** → select the `pomodoro/` folder
5. Pin it from the Extensions menu 📌

---

## ✨ Features

- ⏱ **3 Timer Modes** — Focus (25m), Short Break (5m), Long Break (15m)
- 🔄 **Auto mode switching** — transitions automatically after each session
- 💾 **Persistent timer** — keeps running in background even when popup is closed
- 📊 **Session stats** — tracks sessions today, total focused minutes, streak
- 🎨 **Premium dark UI** — animated SVG ring, color-coded modes, smooth transitions
- 🔔 **Desktop notifications** — Chrome notification when session ends
- ✅ **100% CSP compliant** — no inline scripts, no external resources, no eval

---

## 🔐 Permissions Explained

| Permission | Why |
|---|---|
| `alarms` | Runs the timer reliably in the background |
| `notifications` | Desktop alert when session ends |
| `storage` | Saves timer state across popup opens/closes |

---

## 🧠 How It Works

1. **Start** → background.js sets a `chrome.alarms` repeating alarm every second
2. **Tick** → alarm fires, calculates elapsed time from `startedAt` timestamp
3. **Popup open** → syncs immediately from storage, then polls every 500ms for smooth display
4. **Session end** → background switches mode, sends Chrome notification
5. **Sound** → played from popup.js on storage change (audio needs popup context)

---

## 📄 License

MIT License — free to use and modify.
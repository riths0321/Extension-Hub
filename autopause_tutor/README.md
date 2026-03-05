# AutoPause Tutor

AutoPause Tutor helps learners avoid passive watching by automatically pausing videos when they switch tabs or stay inactive.

## Features
- Auto pause on tab inactive (`document.hidden`).
- Auto pause after inactivity (configurable: 1/3/5/10 minutes).
- Auto resume when user returns and activity is detected.
- Tracks **today's watch time** in local storage.
- Popup controls for enable/disable, inactivity timer, and watch-time reset.

## Privacy
- No external API calls.
- No account or login.
- All settings and watch time data are local (`chrome.storage.local`).

## Install
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select `autopause_tutor`

const btn = document.getElementById("unlock");
const countdownEl = document.getElementById("countdown");
let timeLeft = 3;

// Impulse Control: Force a 3-second wait before button is active
const timer = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;
    if (timeLeft <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = "Emergency Access (10 min)";
    }
}, 1000);

btn.onclick = () => {
    // Save the timestamp for 10 minutes from now
    chrome.storage.sync.set(
        { emergencyUntil: Date.now() + 10 * 60 * 1000 },
        () => {
            // Go back to the page the user was trying to visit
            window.history.back();
        }
    );
};

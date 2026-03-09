document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("text");
  const voiceSelect = document.getElementById("voice");
  const voiceLabel = document.getElementById("voiceLabel");
  const rateInput = document.getElementById("rate");
  const pitchInput = document.getElementById("pitch");
  const rateVal = document.getElementById("rateVal");
  const pitchVal = document.getElementById("pitchVal");
  const charCount = document.getElementById("charCount");
  const voiceCount = document.getElementById("voiceCount");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const speakBtn = document.getElementById("speak");
  const pauseBtn = document.getElementById("pause");
  const stopBtn = document.getElementById("stop");
  const presetButtons = Array.from(document.querySelectorAll(".preset-btn"));

  let voices = [];
  let activeUtterance = null;
  let speaking = false;
  let paused = false;

  updateSliderLabels();
  updateCharCount();
  updateButtons();
  updateStatus("warning", "Ready to speak");

  textInput.addEventListener("input", updateCharCount);
  rateInput.addEventListener("input", updateSliderLabels);
  pitchInput.addEventListener("input", updateSliderLabels);
  voiceSelect.addEventListener("change", updateVoiceLabel);

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  speakBtn.addEventListener("click", () => {
    const text = textInput.value.trim();
    if (!text) {
      updateStatus("warning", "Add some text first");
      textInput.focus();
      return;
    }

    if (!voices.length) {
      updateStatus("warning", "Voices are still loading");
      return;
    }

    speechSynthesis.cancel();

    activeUtterance = new SpeechSynthesisUtterance(text);
    const voice = voices[Number(voiceSelect.value)];
    if (voice) {
      activeUtterance.voice = voice;
    }

    activeUtterance.rate = parseFloat(rateInput.value);
    activeUtterance.pitch = parseFloat(pitchInput.value);

    activeUtterance.onstart = () => {
      speaking = true;
      paused = false;
      updateButtons();
      updateStatus("success", "Speaking...");
    };

    activeUtterance.onend = () => {
      speaking = false;
      paused = false;
      activeUtterance = null;
      updateButtons();
      updateStatus("warning", "Playback finished");
    };

    activeUtterance.onerror = () => {
      speaking = false;
      paused = false;
      activeUtterance = null;
      updateButtons();
      updateStatus("error", "Speech playback failed");
    };

    speechSynthesis.speak(activeUtterance);
  });

  pauseBtn.addEventListener("click", () => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      paused = true;
      updateButtons();
      updateStatus("warning", "Paused");
      return;
    }

    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      paused = false;
      updateButtons();
      updateStatus("success", "Resumed");
    }
  });

  stopBtn.addEventListener("click", () => {
    speechSynthesis.cancel();
    speaking = false;
    paused = false;
    activeUtterance = null;
    updateButtons();
    updateStatus("warning", "Stopped");
  });

  function loadVoices() {
    voices = speechSynthesis.getVoices().filter((voice) => voice.lang);
    voiceSelect.replaceChildren();

    if (!voices.length) {
      const option = document.createElement("option");
      option.textContent = "No voices available";
      option.value = "";
      voiceSelect.appendChild(option);
      voiceLabel.textContent = "Unavailable";
      voiceCount.textContent = "0 voices";
      return;
    }

    voices.forEach((voice, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    voiceCount.textContent = `${voices.length} voices`;
    updateVoiceLabel();
  }

  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function updateVoiceLabel() {
    const voice = voices[Number(voiceSelect.value)];
    voiceLabel.textContent = voice ? voice.lang : "Loading...";
  }

  function updateSliderLabels() {
    rateVal.textContent = `${parseFloat(rateInput.value).toFixed(1)}x`;
    pitchVal.textContent = parseFloat(pitchInput.value).toFixed(1);
  }

  function updateCharCount() {
    const length = textInput.value.trim().length;
    charCount.textContent = `${length} chars`;
  }

  function updateButtons() {
    speakBtn.disabled = false;
    stopBtn.disabled = !speechSynthesis.speaking && !speaking && !paused;
    pauseBtn.disabled = !speechSynthesis.speaking && !paused;
    pauseBtn.textContent = speechSynthesis.paused || paused ? "Resume" : "Pause";
  }

  function updateStatus(type, message) {
    const colors = {
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#fb7185"
    };

    statusDot.style.background = colors[type] || colors.warning;
    statusDot.style.animation = type === "success" && (speechSynthesis.speaking || speaking) ? "pulse 1s infinite" : "none";
    statusText.textContent = message;
  }

  function applyPreset(preset) {
    if (preset === "clear") {
      textInput.value = "";
      updateCharCount();
      updateStatus("warning", "Cleared");
      return;
    }

    if (preset === "demo") {
      textInput.value = "Welcome to Text to Voice. This premium voice panel is ready to read your message clearly and smoothly.";
      rateInput.value = "1";
      pitchInput.value = "1";
    }

    if (preset === "fast") {
      rateInput.value = "1.6";
      pitchInput.value = "1";
    }

    if (preset === "calm") {
      rateInput.value = "0.8";
      pitchInput.value = "0.9";
    }

    updateSliderLabels();
    updateCharCount();
    updateStatus("warning", "Preset applied");
  }
});

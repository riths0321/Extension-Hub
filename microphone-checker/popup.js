class MicrophoneChecker {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isListening = false;
        this.peakLevel = -Infinity;
        this.averageLevel = -Infinity;
        this.animationId = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordedBlob = null;
        this.recordedUrl = null;

        this.elements = {
            startBtn: document.getElementById("startBtn"),
            stopBtn: document.getElementById("stopBtn"),
            statusIcon: document.getElementById("statusIcon"),
            statusValue: document.getElementById("deviceStatus"),
            meterFill: document.getElementById("meterFill"),
            meterValue: document.getElementById("meterValue"),
            peakLevel: document.getElementById("peakLevel"),
            averageLevel: document.getElementById("averageLevel"),
            diagnosticsList: document.getElementById("diagnosticsList"),
            settingsBtn: document.getElementById("settingsBtn"),
            helpBtn: document.getElementById("helpBtn"),
            frequencyCanvas: document.getElementById("frequencyCanvas"),
            frequencyContainer: document.getElementById("frequencyContainer"),
            downloadBtn: document.getElementById("downloadBtn"),
            playback: document.getElementById("playback")
        };

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.checkMicrophonePermission();
        const showFrequency = localStorage.getItem("showFrequency") === "true";
        document.getElementById("showFrequency").checked = showFrequency;
        this.elements.frequencyContainer.style.display = showFrequency ? "block" : "none";
    }

    attachEventListeners() {
        this.elements.startBtn.addEventListener("click", () => this.startTest());
        this.elements.stopBtn.addEventListener("click", () => this.stopTest());
        this.elements.settingsBtn.addEventListener("click", () => this.openSettings());
        this.elements.helpBtn.addEventListener("click", () => this.openHelp());
        this.elements.downloadBtn.addEventListener("click", () => this.downloadRecording());

        document.getElementById("closeSettingsBtn").addEventListener("click", () => this.closeSettings());
        document.getElementById("closeHelpBtn").addEventListener("click", () => this.closeHelp());
        document.getElementById("showFrequency").addEventListener("change", (event) => this.toggleFrequency(event));

        document.getElementById("settingsModal").addEventListener("click", (event) => {
            if (event.target.id === "settingsModal") this.closeSettings();
        });

        document.getElementById("helpModal").addEventListener("click", (event) => {
            if (event.target.id === "helpModal") this.closeHelp();
        });
    }

    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            this.updateStatus("Ready", "ready");
            this.addDiagnostic("✅ Microphone detected", "success");
        } catch {
            this.updateStatus("Not Permitted", "error");
            this.addDiagnostic("❌ Microphone access denied", "error");
        }
    }

    async startTest() {
        try {
            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.peakLevel = -Infinity;
            this.averageLevel = -Infinity;
            this.elements.peakLevel.textContent = "-∞ dB";
            this.elements.averageLevel.textContent = "-∞ dB";
            this.updateMeter(-96);
            this.clearRecordedAudio();

            this.addDiagnostic("🔍 Requesting microphone access...", "success");

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            this.setupAudioAnalysis();
            this.setupRecorder();
            this.startRecording();
            this.isListening = true;
            this.updateStatus("Recording", "listening");
            this.addDiagnostic("🎤 Microphone recording...", "success");
        } catch (error) {
            this.handleError(error);
            this.elements.startBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
        }
    }

    setupAudioAnalysis() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);

        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
        }

        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyser.minDecibels = -96;
        this.analyser.maxDecibels = -10;

        source.connect(this.analyser);
        this.analyze();
    }

    analyze() {
        if (!this.isListening) return;

        const timeDomainData = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(timeDomainData);

        const rms = this.calculateRMS(timeDomainData);
        const dB = rms > 0 ? 20 * Math.log10(rms) : -96;
        const safeDb = Math.max(dB, -96);

        this.updateMeter(safeDb);

        if (rms > 0) {
            this.peakLevel = Math.max(this.peakLevel, safeDb);
            this.averageLevel = this.averageLevel === -Infinity ? safeDb : (this.averageLevel * 0.9 + safeDb * 0.1);
        }

        this.elements.peakLevel.textContent = this.formatdB(this.peakLevel);
        this.elements.averageLevel.textContent = this.formatdB(this.averageLevel);

        if (this.elements.frequencyContainer.style.display !== "none") {
            const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(frequencyData);
            this.drawFrequency(frequencyData);
        }

        this.animationId = requestAnimationFrame(() => this.analyze());
    }

    calculateRMS(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
            const normalized = (dataArray[i] - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / dataArray.length);
    }

    formatdB(value) {
        if (!Number.isFinite(value) || value < -96) return "-∞ dB";
        return `${value.toFixed(1)} dB`;
    }

    updateMeter(dB) {
        const percentage = Math.max(0, Math.min(100, ((dB + 96) / 96) * 100));
        this.elements.meterFill.style.width = `${percentage}%`;
        this.elements.meterValue.textContent = this.formatdB(dB);
    }

    drawFrequency(dataArray) {
        const canvas = this.elements.frequencyCanvas;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgb(27, 21, 35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;

        ctx.fillStyle = "rgb(255, 122, 24)";

        for (let i = 0; i < dataArray.length; i += 1) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
            if (x > canvas.width) break;
        }
    }

    async stopTest() {
        this.isListening = false;

        await this.stopRecording();

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.updateStatus("Ready", "ready");
        this.addDiagnostic("⏹ Test stopped", "success");
    }

    setupRecorder() {
        this.recordedChunks = [];
        this.recordedBlob = null;

        if (typeof MediaRecorder === "undefined") {
            this.addDiagnostic("⚠️ Recording not supported in this browser.", "warning");
            return;
        }

        let options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
        }

        try {
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
        } catch {
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
        }

        this.mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        });

        this.mediaRecorder.addEventListener("stop", () => {
            if (!this.recordedChunks.length) return;
            this.recordedBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || "audio/webm" });
            this.setRecordedAudio(this.recordedBlob);
            this.addDiagnostic("💾 Recording ready for download.", "success");
        });
    }

    startRecording() {
        if (!this.mediaRecorder) return;
        if (this.mediaRecorder.state === "inactive") {
            this.mediaRecorder.start();
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
                resolve();
                return;
            }

            const handleStop = () => {
                this.mediaRecorder.removeEventListener("stop", handleStop);
                resolve();
            };

            this.mediaRecorder.addEventListener("stop", handleStop);
            this.mediaRecorder.stop();
        });
    }

    setRecordedAudio(blob) {
        if (this.recordedUrl) {
            URL.revokeObjectURL(this.recordedUrl);
        }

        this.recordedUrl = URL.createObjectURL(blob);
        this.elements.playback.src = this.recordedUrl;
        this.elements.playback.style.display = "block";
        this.elements.downloadBtn.disabled = false;
    }

    clearRecordedAudio() {
        this.elements.downloadBtn.disabled = true;
        this.elements.playback.style.display = "none";
        this.elements.playback.removeAttribute("src");
        this.recordedBlob = null;
        this.recordedChunks = [];
        if (this.recordedUrl) {
            URL.revokeObjectURL(this.recordedUrl);
            this.recordedUrl = null;
        }
    }

    downloadRecording() {
        if (!this.recordedBlob) {
            this.addDiagnostic("⚠️ No recording available yet.", "warning");
            return;
        }

        const ext = (this.recordedBlob.type && this.recordedBlob.type.includes("ogg")) ? "ogg" : "webm";
        const url = URL.createObjectURL(this.recordedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `microphone-test-${Date.now()}.${ext}`;
        link.click();
        URL.revokeObjectURL(url);
    }

    updateStatus(text, status) {
        this.elements.statusValue.textContent = text;

        const icons = {
            ready: "🎤",
            listening: "🔴",
            error: "⚠️"
        };

        this.elements.statusIcon.textContent = icons[status] || "🎤";
    }

    addDiagnostic(message, type = "success") {
        const item = document.createElement("p");
        item.className = `diagnostic-item ${type}`;
        item.textContent = message;

        this.elements.diagnosticsList.appendChild(item);
        this.elements.diagnosticsList.scrollTop = this.elements.diagnosticsList.scrollHeight;
    }

    handleError(error) {
        let message = "Unknown error occurred";

        if (error?.name === "NotAllowedError") {
            message = "❌ Microphone access denied by user";
        } else if (error?.name === "NotFoundError") {
            message = "❌ No microphone device found";
        } else if (error?.name === "NotReadableError") {
            message = "❌ Microphone is already in use";
        }

        this.updateStatus("Error", "error");
        this.addDiagnostic(message, "error");
    }

    toggleFrequency(event) {
        const enabled = event.target.checked;
        this.elements.frequencyContainer.style.display = enabled ? "block" : "none";
        localStorage.setItem("showFrequency", String(enabled));
    }

    openSettings() {
        document.getElementById("settingsModal").classList.add("active");
    }

    closeSettings() {
        document.getElementById("settingsModal").classList.remove("active");
    }

    openHelp() {
        document.getElementById("helpModal").classList.add("active");
    }

    closeHelp() {
        document.getElementById("helpModal").classList.remove("active");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new MicrophoneChecker();
});

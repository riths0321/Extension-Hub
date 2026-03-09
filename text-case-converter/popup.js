document.addEventListener("DOMContentLoaded", () => {
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const sourcePill = document.getElementById("source-pill");
  const charCount = document.getElementById("char-count");
  const resultCount = document.getElementById("result-count");
  const scanCount = document.getElementById("scan-count");
  const textPreview = document.getElementById("text-preview");
  const textOutput = document.getElementById("text-output");
  const sourceInfo = document.getElementById("source-info");
  const textItems = document.getElementById("text-items");
  const manualText = document.getElementById("manual-text");
  const autoScanToggle = document.getElementById("auto-scan-toggle");

  const modeTabs = Array.from(document.querySelectorAll(".mode-tab"));
  const caseButtons = Array.from(document.querySelectorAll(".case-btn"));
  const scanBtn = document.getElementById("scan-btn");
  const getSelectionBtn = document.getElementById("get-selection-btn");
  const useTextBtn = document.getElementById("use-text-btn");
  const applyBtn = document.getElementById("apply-btn");
  const copyBtn = document.getElementById("copy-btn");
  const clearBtn = document.getElementById("clear-btn");

  const state = {
    currentText: "",
    currentSource: "",
    convertedText: "",
    activeTabId: null,
    scannedTexts: [],
    autoDetect: true
  };

  const statusColors = {
    idle: "#fbbf24",
    scanning: "#38bdf8",
    success: "#4ade80",
    error: "#fb7185",
    listening: "#c084fc",
    warning: "#f59e0b"
  };

  chrome.storage.local.get(["textCaseAutoDetect"], (result) => {
    state.autoDetect = result.textCaseAutoDetect ?? true;
    autoScanToggle.checked = state.autoDetect;
  });

  autoScanToggle.addEventListener("change", () => {
    state.autoDetect = autoScanToggle.checked;
    chrome.storage.local.set({ textCaseAutoDetect: state.autoDetect });
  });

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });

  scanBtn.addEventListener("click", handleScanPage);
  getSelectionBtn.addEventListener("click", handleGetSelection);
  useTextBtn.addEventListener("click", () => {
    const text = manualText.value.trim();
    if (!text) {
      updateStatus("error", "Enter some text first.");
      manualText.focus();
      return;
    }

    setCurrentText(text, "Manual input");
  });

  manualText.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      useTextBtn.click();
    }
  });

  caseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.currentText) {
        updateStatus("error", "No text to convert.");
        return;
      }

      const converter = caseConverters[button.dataset.case];
      state.convertedText = converter(state.currentText);
      renderOutput(state.convertedText, true);
      setActiveCase(button.dataset.case);
      refreshApplyAvailability();
      resultCount.textContent = `${state.convertedText.length} chars`;
      updateStatus("success", `${button.textContent} ready.`);
    });
  });

  applyBtn.addEventListener("click", async () => {
    if (!state.convertedText) {
      updateStatus("error", "Convert text before applying.");
      return;
    }

    if (!state.activeTabId) {
      updateStatus("error", "No target page available.");
      return;
    }

    updateStatus("scanning", "Applying changes...");
    const response = await sendToContentScript(state.activeTabId, {
      action: "applyText",
      text: state.convertedText
    });

    if (response?.success) {
      state.currentText = state.convertedText;
      renderPreview(state.currentText);
      renderOutput("Applied to original page.", false, "success");
      updateStatus("success", "Text applied.");
      refreshApplyAvailability();
    } else {
      renderOutput(response?.message || "Could not apply to the page. Copy instead.", false, "warning");
      updateStatus("warning", "Auto-apply failed.");
    }
  });

  copyBtn.addEventListener("click", async () => {
    const textToCopy = state.convertedText || state.currentText;
    if (!textToCopy) {
      updateStatus("error", "Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      renderOutput("Copied to clipboard.", false, "success");
      updateStatus("success", "Copied.");
    } catch (_error) {
      updateStatus("error", "Clipboard copy failed.");
    }
  });

  clearBtn.addEventListener("click", resetState);

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action !== "textSelected" || !state.autoDetect || !request.text) {
      return;
    }

    getActiveTab().then((tab) => {
      if (tab?.id) {
        state.activeTabId = tab.id;
      }
    });

    switchMode("selection");
    setCurrentText(request.text, request.source || "Page selection");
    updateStatus("success", "Selection detected.");
  });

  switchMode("manual");
  manualText.value = "Try converting this sample text into title case, camel case, or kebab case.";
  updateStatus("idle", "Choose a mode to begin.");

  async function handleScanPage() {
    updateStatus("scanning", "Scanning page...");
    const tab = await getActiveTab();
    if (!tab?.id) {
      updateStatus("error", "No active tab found.");
      return;
    }

    state.activeTabId = tab.id;
    const response = await sendToContentScript(tab.id, { action: "scanPage" });

    if (!response?.success || !response.data?.items?.length) {
      state.scannedTexts = [];
      renderScanResults([]);
      renderOutput(response?.message || "No useful text found on this page.", false, "warning");
      updateStatus("warning", "No useful text found.");
      return;
    }

    state.scannedTexts = response.data.items;
    renderScanResults(state.scannedTexts);
    scanCount.textContent = `${state.scannedTexts.length} items`;
    updateStatus("success", `Found ${state.scannedTexts.length} text items.`);
    selectScanItem(0);
  }

  async function handleGetSelection() {
    updateStatus("scanning", "Fetching selection...");
    const tab = await getActiveTab();
    if (!tab?.id) {
      updateStatus("error", "No active tab found.");
      return;
    }

    state.activeTabId = tab.id;
    const response = await sendToContentScript(tab.id, { action: "getCurrentSelection" });
    if (!response?.success || !response.text) {
      renderOutput(response?.message || "No selected text available.", false, "warning");
      updateStatus("warning", "No text selected on the page.");
      return;
    }

    setCurrentText(response.text, response.source || "Selected text");
    updateStatus("success", "Selection loaded.");
  }

  function switchMode(mode) {
    modeTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    document.querySelectorAll(".mode-content").forEach((content) => {
      content.classList.toggle("active", content.id === `${mode}-mode`);
    });

    if (mode === "selection") {
      updateStatus("listening", "Select text on the page, then fetch it.");
    } else if (mode === "scan") {
      updateStatus("idle", "Scan the page to capture text blocks.");
    } else {
      updateStatus("idle", "Use manual text input.");
      manualText.focus();
    }
  }

  function setCurrentText(text, source) {
    state.currentText = text;
    state.currentSource = source;
    state.convertedText = "";
    sourcePill.textContent = source;
    charCount.textContent = `${text.length} chars`;
    sourceInfo.textContent = source;
    renderPreview(text);
    renderOutput("Converted text will appear here.", false);
    setActiveCase("");
    refreshApplyAvailability();
    resultCount.textContent = "0 chars";
  }

  function renderPreview(text) {
    textPreview.textContent = text;
  }

  function renderOutput(text, isResult, tone = "") {
    textOutput.textContent = text;
    textOutput.classList.toggle("output", isResult);
    textOutput.classList.toggle("tone-success", tone === "success");
    textOutput.classList.toggle("tone-warning", tone === "warning");
    textOutput.classList.toggle("tone-error", tone === "error");
  }

  function renderScanResults(items) {
    textItems.textContent = "";
    if (!items.length) {
      scanCount.textContent = "0 items";
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No text found yet. Run a scan first.";
      textItems.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-item";
      button.dataset.index = String(index);

      const title = document.createElement("div");
      title.className = "text-item-title";
      title.textContent = truncateText(item.text, 90);

      const meta = document.createElement("div");
      meta.className = "text-item-meta";
      meta.textContent = `${item.source} • ${item.text.length} chars`;

      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", () => selectScanItem(index));
      textItems.appendChild(button);
    });
  }

  function selectScanItem(index) {
    const item = state.scannedTexts[index];
    if (!item) {
      return;
    }

    textItems.querySelectorAll(".text-item").forEach((element) => {
      element.classList.toggle("active", element.dataset.index === String(index));
    });

    setCurrentText(item.text, item.source);
  }

  function setActiveCase(caseType) {
    caseButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.case === caseType);
    });
  }

  function updateStatus(type, message) {
    statusIndicator.style.background = statusColors[type] || statusColors.idle;
    statusIndicator.style.animation = type === "scanning" ? "pulse 1s infinite" : "none";
    statusText.textContent = message;
  }

  function resetState() {
    state.currentText = "";
    state.currentSource = "";
    state.convertedText = "";
    state.scannedTexts = [];
    renderPreview("No text selected. Choose a mode above.");
    renderOutput("Converted text will appear here.", false);
    sourceInfo.textContent = "No source";
    sourcePill.textContent = "Idle";
    charCount.textContent = "0 chars";
    resultCount.textContent = "0 chars";
    scanCount.textContent = "0 items";
    manualText.value = "";
    renderScanResults([]);
    setActiveCase("");
    refreshApplyAvailability();
    updateStatus("idle", "Cleared. Ready for new text.");
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function sendToContentScript(tabId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            message: "Page access unavailable here. Try a normal website tab."
          });
          return;
        }

        resolve(response || { success: false });
      });
    });
  }

  function truncateText(text, maxLength) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  function refreshApplyAvailability() {
    const canApply =
      Boolean(state.convertedText) &&
      Boolean(state.activeTabId) &&
      state.currentSource !== "Manual input";
    applyBtn.disabled = !canApply;
  }

  function splitWords(text) {
    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  const caseConverters = {
    upper: (text) => text.toUpperCase(),
    lower: (text) => text.toLowerCase(),
    title: (text) => splitWords(text).map(capitalize).join(" "),
    sentence: (text) =>
      text
        .toLowerCase()
        .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase()),
    camel: (text) => {
      const words = splitWords(text).map((word) => word.toLowerCase());
      return words.map((word, index) => (index === 0 ? word : capitalize(word))).join("");
    },
    pascal: (text) => splitWords(text).map((word) => capitalize(word.toLowerCase())).join(""),
    snake: (text) => splitWords(text).map((word) => word.toLowerCase()).join("_"),
    kebab: (text) => splitWords(text).map((word) => word.toLowerCase()).join("-")
  };

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
});

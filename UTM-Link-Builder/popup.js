const title = document.getElementById("title");
const urlInput = document.getElementById("url");
const sourceInput = document.getElementById("source");
const mediumInput = document.getElementById("medium");
const campaignInput = document.getElementById("campaign");
const termInput = document.getElementById("term");
const contentInput = document.getElementById("content");
const result = document.getElementById("result");
const copyButton = document.getElementById("copy");
const clearButton = document.getElementById("clear");
const message = document.getElementById("message");
const statusPill = document.getElementById("statusPill");
const lengthMeta = document.getElementById("lengthMeta");

const allInputs = [
  urlInput,
  sourceInput,
  mediumInput,
  campaignInput,
  termInput,
  contentInput
];

document.addEventListener("DOMContentLoaded", () => {
  title.textContent = chrome.i18n.getMessage("appName") || "UTM Link Builder";
  allInputs.forEach((input) => input.addEventListener("input", generate));
  copyButton.addEventListener("click", copyResult);
  clearButton.addEventListener("click", clearFields);
  document.addEventListener("keydown", handleShortcuts);
  generate();
});

function generate() {
  clearMessage();

  const baseUrl = urlInput.value.trim();
  const source = sourceInput.value.trim();
  const medium = mediumInput.value.trim();
  const campaign = campaignInput.value.trim();
  const term = termInput.value.trim();
  const content = contentInput.value.trim();

  if (!baseUrl && !source && !medium && !campaign && !term && !content) {
    result.value = "";
    updateStatus("Waiting", "");
    updateLengthMeta();
    return;
  }

  if (!baseUrl || !source || !medium || !campaign) {
    result.value = "";
    updateStatus("Missing required", "is-error");
    setMessage("Enter Base URL, Source, Medium, and Campaign to generate the link.", "is-error");
    updateLengthMeta();
    return;
  }

  let urlObject;
  try {
    urlObject = new URL(baseUrl);
  } catch (_error) {
    result.value = "";
    updateStatus("Invalid URL", "is-error");
    setMessage(chrome.i18n.getMessage("invalidUrl") || "Please enter a valid URL.", "is-error");
    updateLengthMeta();
    return;
  }

  const params = {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_term: term,
    utm_content: content
  };

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      urlObject.searchParams.set(key, value);
    } else {
      urlObject.searchParams.delete(key);
    }
  });

  result.value = urlObject.toString();
  updateStatus("Ready", "is-success");
  setMessage("UTM link generated successfully.", "is-success");
  updateLengthMeta();
}

async function copyResult() {
  if (!result.value) {
    updateStatus("Nothing to copy", "is-error");
    setMessage("Generate a UTM link before copying.", "is-error");
    return;
  }

  try {
    await navigator.clipboard.writeText(result.value);
    updateStatus("Copied", "is-success");
    setMessage(chrome.i18n.getMessage("copySuccess") || "Copied successfully.", "is-success");
  } catch (_error) {
    updateStatus("Copy failed", "is-error");
    setMessage("Clipboard access failed.", "is-error");
  }
}

function clearFields() {
  allInputs.forEach((input) => {
    input.value = "";
  });
  result.value = "";
  updateStatus("Waiting", "");
  clearMessage();
  updateLengthMeta();
  urlInput.focus();
}

function handleShortcuts(event) {
  if (event.ctrlKey && event.key.toLowerCase() === "u") {
    event.preventDefault();
    urlInput.focus();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === "c" && document.activeElement !== result) {
    event.preventDefault();
    copyResult();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    clearFields();
  }
}

function updateLengthMeta() {
  lengthMeta.textContent = `${result.value.length} characters`;
}

function updateStatus(text, className) {
  statusPill.textContent = text;
  statusPill.className = "status-pill";
  if (className) {
    statusPill.classList.add(className);
  }
}

function setMessage(text, className) {
  message.textContent = text;
  message.className = "message";
  if (className) {
    message.classList.add(className);
  }
}

function clearMessage() {
  setMessage("", "");
}

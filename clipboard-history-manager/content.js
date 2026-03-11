let lastCapturedText = "";

document.addEventListener("copy", captureClipboardEvent, true);
document.addEventListener("cut", captureClipboardEvent, true);

async function captureClipboardEvent() {
  const response = await chrome.runtime.sendMessage({ action: "getSettings" }).catch(() => null);
  if (!response?.success || response.settings?.autoSave === false) {
    return;
  }

  window.setTimeout(() => {
    const copiedText = getCopiedText();
    if (!copiedText || copiedText === lastCapturedText) {
      return;
    }

    lastCapturedText = copiedText;
    chrome.runtime.sendMessage({
      action: "saveClipboard",
      text: copiedText
    });
  }, 50);
}

function getCopiedText() {
  const activeElement = document.activeElement;

  if (
    activeElement &&
    (activeElement.tagName === "TEXTAREA" ||
      (activeElement.tagName === "INPUT" &&
        /^(text|search|url|tel|password|email)$/i.test(activeElement.type || "text")))
  ) {
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    return activeElement.value.slice(start, end).trim();
  }

  return window.getSelection().toString().trim();
}

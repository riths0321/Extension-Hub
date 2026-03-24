let lastSelectionText = "";
let lastSelectionRange = null;
let lastEditableTarget = null;

document.addEventListener("selectionchange", captureSelection);
document.addEventListener("mouseup", () => window.setTimeout(captureSelection, 40));
document.addEventListener("keyup", () => window.setTimeout(captureSelection, 40));

function captureSelection() {
  const activeElement = document.activeElement;
  if (isTextField(activeElement)) {
    const selectedText = getFieldSelection(activeElement);
    if (selectedText) {
      lastSelectionText = selectedText;
      lastEditableTarget = activeElement;
      notifySelection(selectedText, "Input selection");
    }
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : "";
  if (!selectedText) {
    return;
  }

  if (selection.rangeCount > 0) {
    lastSelectionRange = selection.getRangeAt(0).cloneRange();
  }

  const anchorElement = selection.anchorNode?.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : selection.anchorNode;

  if (anchorElement?.closest?.("[contenteditable='true']")) {
    lastEditableTarget = anchorElement.closest("[contenteditable='true']");
  } else {
    lastEditableTarget = null;
  }

  lastSelectionText = selectedText;
  notifySelection(selectedText, "Page selection");
}

function notifySelection(text, source) {
  chrome.runtime.sendMessage({
    action: "textSelected",
    text,
    source
  });
}

function scanPageForText() {
  const results = [];
  const seen = new Set();

  addResult(results, seen, lastSelectionText, "Selected text");

  document.querySelectorAll("textarea, input[type='text'], input[type='search'], input[type='email']").forEach((element) => {
    addResult(results, seen, element.value, element.tagName === "TEXTAREA" ? "Textarea" : "Input field");
  });

  document.querySelectorAll("[contenteditable='true']").forEach((element) => {
    addResult(results, seen, element.innerText || element.textContent, "Editable content");
  });

  const blocks = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption");
  for (const block of blocks) {
    if (results.length >= 18) {
      break;
    }

    addResult(results, seen, block.innerText || block.textContent, block.tagName.toLowerCase());
  }

  return results;
}

function addResult(results, seen, rawText, source) {
  const text = (rawText || "").replace(/\s+/g, " ").trim();
  if (!text || text.length < 2) {
    return;
  }

  const normalized = text.toLowerCase();
  if (seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  results.push({
    text: text.length > 900 ? `${text.slice(0, 900)}...` : text,
    source
  });
}

function applyText(newText) {
  const activeElement = document.activeElement;
  if (isTextField(activeElement) && replaceInField(activeElement, newText)) {
    return { success: true, message: "Applied inside active field." };
  }

  if (lastEditableTarget && isContentEditable(lastEditableTarget) && replaceInEditable(lastEditableTarget, newText)) {
    return { success: true, message: "Applied inside editable content." };
  }

  if (lastSelectionRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(lastSelectionRange);
    lastSelectionRange.deleteContents();
    lastSelectionRange.insertNode(document.createTextNode(newText));
    selection.removeAllRanges();
    lastSelectionText = newText;
    return { success: true, message: "Applied to saved text selection." };
  }

  return {
    success: false,
    message: "No editable selection found. Copy and paste manually."
  };
}

function replaceInField(field, newText) {
  const start = field.selectionStart;
  const end = field.selectionEnd;
  if (typeof start !== "number" || typeof end !== "number" || start === end) {
    return false;
  }

  const previousValue = field.value;
  field.value = `${previousValue.slice(0, start)}${newText}${previousValue.slice(end)}`;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.selectionStart = start;
  field.selectionEnd = start + newText.length;
  lastSelectionText = newText;
  lastEditableTarget = field;
  return true;
}

function replaceInEditable(element, newText) {
  if (lastSelectionRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(lastSelectionRange);
    lastSelectionRange.deleteContents();
    lastSelectionRange.insertNode(document.createTextNode(newText));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    selection.removeAllRanges();
    lastSelectionText = newText;
    return true;
  }

  return false;
}

function getCurrentSelection() {
  const activeElement = document.activeElement;
  if (isTextField(activeElement)) {
    const text = getFieldSelection(activeElement);
    if (text) {
      return { success: true, text, source: "Input selection" };
    }
  }

  const text = window.getSelection()?.toString().trim() || lastSelectionText;
  if (!text) {
    return { success: false, message: "No text selected." };
  }

  return { success: true, text, source: "Page selection" };
}

function getFieldSelection(field) {
  if (!field || typeof field.selectionStart !== "number" || typeof field.selectionEnd !== "number") {
    return "";
  }

  if (field.selectionStart === field.selectionEnd) {
    return "";
  }

  return field.value.slice(field.selectionStart, field.selectionEnd).trim();
}

function isTextField(element) {
  return Boolean(
    element &&
    (element.tagName === "TEXTAREA" ||
      (element.tagName === "INPUT" && ["text", "search", "email", "url", "tel"].includes(element.type)))
  );
}

function isContentEditable(element) {
  return Boolean(element && element.isContentEditable);
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ success: true, alive: true });
    return;
  }

  if (request.action === "scanPage") {
    const items = scanPageForText();
    sendResponse({
      success: items.length > 0,
      data: { items }
    });
    return;
  }

  if (request.action === "getCurrentSelection") {
    sendResponse(getCurrentSelection());
    return;
  }

  if (request.action === "applyText") {
    sendResponse(applyText(request.text || ""));
  }
});

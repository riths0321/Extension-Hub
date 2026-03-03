const HIGHLIGHT_CLASS = "saf-fill-highlight";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg.action === "analyzeFillTargets") {
      const matchCount = countMatchingFields(msg.profile || {});
      sendResponse({ ok: true, matchCount });
      return false;
    }

    if (msg.action === "fill") {
      const filledCount = fillFields(msg.profile || {});
      sendResponse({ ok: true, filledCount });
      return false;
    }
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
    return false;
  }

  return false;
});

function getTargets() {
  return Array.from(document.querySelectorAll("input, textarea, select")).filter((el) => {
    const tag = el.tagName.toLowerCase();
    const inputType = (el.type || "").toLowerCase();
    if (el.disabled || el.readOnly) return false;
    if (inputType === "hidden" || inputType === "password" || inputType === "file") return false;
    if (tag === "input" && ["submit", "button", "reset", "image", "checkbox", "radio"].includes(inputType)) {
      return false;
    }
    return true;
  });
}

function countMatchingFields(profile) {
  const targets = getTargets();
  let count = 0;
  for (const target of targets) {
    const key = detectFieldType(target);
    if (key && profile[key]) count += 1;
  }
  return count;
}

function fillFields(profile) {
  injectHighlightStyle();

  const targets = getTargets();
  let filled = 0;

  for (const target of targets) {
    const key = detectFieldType(target);
    if (!key) continue;

    const value = profile[key];
    if (!value) continue;

    const didFill = fillElement(target, value);
    if (!didFill) continue;

    filled += 1;
    highlightField(target);
  }

  return filled;
}

function detectFieldType(el) {
  const attrs = [
    el.name,
    el.id,
    el.placeholder,
    el.getAttribute("aria-label"),
    getLabelText(el),
    el.getAttribute("autocomplete")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!attrs) return null;

  if (/(full.?name|your.?name|first.?name|last.?name|name)/.test(attrs)) return "name";
  if (/(email|e-mail)/.test(attrs)) return "email";
  if (/(phone|mobile|tel|telephone|contact)/.test(attrs)) return "phone";
  if (/(address|street|city|state|zip|postal|postcode|country)/.test(attrs)) return "address";
  if (/(company|organization|organisation|business|employer)/.test(attrs)) return "company";
  if (/(website|url|site|homepage)/.test(attrs)) return "website";
  if (/(note|comment|remarks|remark|memo|message|description)/.test(attrs)) return "note";

  return null;
}

function getLabelText(el) {
  if (el.labels?.length) {
    return Array.from(el.labels)
      .map((l) => l.textContent || "")
      .join(" ");
  }
  return "";
}

function fillElement(el, value) {
  const tag = el.tagName.toLowerCase();

  if (tag === "select") {
    const normalized = String(value).toLowerCase();
    let matched = false;
    for (const option of Array.from(el.options)) {
      if (String(option.value).toLowerCase() === normalized || String(option.text).toLowerCase() === normalized) {
        el.value = option.value;
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function highlightField(el) {
  el.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    el.classList.remove(HIGHLIGHT_CLASS);
  }, 2200);
}

function injectHighlightStyle() {
  if (document.getElementById("saf-fill-style")) return;

  const style = document.createElement("style");
  style.id = "saf-fill-style";
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #f08449 !important;
      outline-offset: 1px !important;
      transition: outline-color 0.3s ease;
    }
  `;
  document.documentElement.appendChild(style);
}

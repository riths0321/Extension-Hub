let toastEl = null;
let toastTimer = null;

export function mountToast() {
  if (toastEl) return toastEl;
  toastEl = document.createElement("div");
  toastEl.className = "qs-toast";
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");
  toastEl.textContent = "";
  document.body.appendChild(toastEl);
  return toastEl;
}

export function showToast(message, ms = 1800) {
  mountToast();
  toastEl.textContent = message;
  toastEl.dataset.show = "true";
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.dataset.show = "false";
  }, ms);
}


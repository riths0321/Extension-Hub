import { getSettings, setSettings } from "../modules/storage.js";
import { showToast } from "../modules/toast.js";

function qs(id) {
  return document.getElementById(id);
}

function setCaptureStatus(text) {
  const el = qs("capture-status");
  if (el) el.textContent = text;
}

function disableDuringBusy(busy) {
  ["btn-capture-visible", "btn-capture-area"].forEach((id) => {
    const el = qs(id);
    if (el) el.disabled = !!busy;
  });
}

function openPage(page) {
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });
}

async function main() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";

  // --- navigation ---
  qs("btn-history").addEventListener("click", () => openPage("history/history.html"));
  qs("btn-options").addEventListener("click", () => openPage("option/options.html"));

  // --- theme toggle ---
  const themeBtn = qs("btn-theme");
  function updateThemeBtn(theme) {
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    themeBtn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
  updateThemeBtn(settings.theme);

  themeBtn.addEventListener("click", async () => {
    const currentTheme = settings.theme;
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = newTheme;
    await setSettings({ theme: newTheme });
    settings.theme = newTheme;
    updateThemeBtn(newTheme);
    showToast(newTheme === "dark" ? "Dark mode" : "Light mode");
  });

  // --- capture ---
  qs("btn-capture-visible").addEventListener("click", async () => {
    disableDuringBusy(true);
    setCaptureStatus("Capturing…");
    try {
      const res = await chrome.runtime.sendMessage({ action: "QS_CAPTURE_VISIBLE" });
      if (res?.status !== "ok") throw new Error(res?.message || "Capture failed");
      showToast("Captured");
      window.close();
    } catch (e) {
      console.error(e);
      showToast("Capture failed");
      setCaptureStatus("Failed");
      disableDuringBusy(false);
      setTimeout(() => setCaptureStatus("Ready"), 400);
    }
  });

  qs("btn-capture-area").addEventListener("click", async () => {
    setCaptureStatus("Select an area…");
    try {
      const res = await chrome.runtime.sendMessage({ action: "QS_START_AREA_CAPTURE" });
      if (res?.status !== "ok") throw new Error(res?.message || "Area capture failed");
      window.close();
    } catch (e) {
      console.error(e);
      showToast("Area capture failed");
      setCaptureStatus("Ready");
    }
  });
}

main().catch((e) => {
  console.error(e);
  showToast("QuickShot failed to load");
});

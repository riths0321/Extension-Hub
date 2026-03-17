import { getSettings, resetSettings, setSettings } from "../modules/storage.js";
import { showToast } from "../modules/toast.js";

function qs(id) {
  return document.getElementById(id);
}

function openPage(page) {
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });
}

function setSwitch(el, checked) {
  el.setAttribute("aria-checked", checked ? "true" : "false");
}

function getSwitch(el) {
  return el.getAttribute("aria-checked") === "true";
}

async function main() {
  let settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";

  qs("btn-open-history").addEventListener("click", () => openPage("history/history.html"));

  qs("format").value = settings.format;
  qs("theme").value = settings.theme;
  setSwitch(qs("autoCopy"), !!settings.autoCopy);
  setSwitch(qs("includeDate"), !!settings.filenameIncludeDate);
  setSwitch(qs("includeTime"), !!settings.filenameIncludeTime);

  qs("format").addEventListener("change", async (e) => {
    settings = await setSettings({ format: e.target.value });
    showToast("Saved");
  });

  qs("theme").addEventListener("change", async (e) => {
    settings = await setSettings({ theme: e.target.value });
    document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";
    showToast("Saved");
  });

  ["autoCopy", "includeDate", "includeTime"].forEach((id) => {
    const el = qs(id);
    el.addEventListener("click", async () => {
      const next = !getSwitch(el);
      setSwitch(el, next);
      const patch =
        id === "autoCopy"
          ? { autoCopy: next }
          : id === "includeDate"
            ? { filenameIncludeDate: next }
            : { filenameIncludeTime: next };
      settings = await setSettings(patch);
      showToast("Saved");
    });
  });

  qs("reset").addEventListener("click", async () => {
    settings = await resetSettings();
    qs("format").value = settings.format;
    qs("theme").value = settings.theme;
    setSwitch(qs("autoCopy"), !!settings.autoCopy);
    setSwitch(qs("includeDate"), !!settings.filenameIncludeDate);
    setSwitch(qs("includeTime"), !!settings.filenameIncludeTime);
    document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";
    showToast("Reset");
  });
}

main().catch((e) => {
  console.error(e);
  showToast("Options failed to load");
});


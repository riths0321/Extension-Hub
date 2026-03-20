import { defaultSettings, ensureSeedData, getSettings, saveSettings } from "./modules/storage.js";

const els = {};

function $(id) {
    return document.getElementById(id);
}

function bindElements() {
    ["theme", "autoFormat", "autoCopy", "defaultContentType", "requestTimeout", "historyLimit", "safeMode", "allowPrivateNetwork", "enableBackgroundSchedules", "saveSettings", "resetSettings", "openWorkspace"].forEach((id) => {
        els[id] = $(id);
    });
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
}

function loadIntoForm(settings) {
    els.theme.value = settings.theme;
    els.autoFormat.checked = settings.autoFormat;
    els.autoCopy.checked = settings.autoCopy;
    els.defaultContentType.value = settings.defaultContentType;
    els.requestTimeout.value = settings.requestTimeout;
    els.historyLimit.value = settings.historyLimit;
    els.safeMode.checked = Boolean(settings.safeMode);
    els.allowPrivateNetwork.checked = Boolean(settings.allowPrivateNetwork);
    els.enableBackgroundSchedules.checked = Boolean(settings.enableBackgroundSchedules);
    applyTheme(settings.theme);
}

function collectForm() {
    return {
        theme: els.theme.value,
        autoFormat: els.autoFormat.checked,
        autoCopy: els.autoCopy.checked,
        defaultContentType: els.defaultContentType.value,
        requestTimeout: Math.max(5, Number(els.requestTimeout.value || 45)),
        historyLimit: Math.max(10, Number(els.historyLimit.value || 50)),
        safeMode: els.safeMode.checked,
        allowPrivateNetwork: els.allowPrivateNetwork.checked,
        enableBackgroundSchedules: els.enableBackgroundSchedules.checked
    };
}

async function init() {
    bindElements();
    await ensureSeedData();
    let settings = await getSettings();
    loadIntoForm(settings);

    els.theme.addEventListener("change", () => applyTheme(els.theme.value));

    els.saveSettings.addEventListener("click", async () => {
        settings = collectForm();
        await saveSettings(settings);
        applyTheme(settings.theme);
        els.saveSettings.textContent = "Saved";
        window.setTimeout(() => {
            els.saveSettings.textContent = "Save";
        }, 1400);
    });

    els.resetSettings.addEventListener("click", async () => {
        settings = defaultSettings();
        await saveSettings(settings);
        loadIntoForm(settings);
    });

    els.openWorkspace.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("workspace/workspace.html") });
    });
}

init();

import {
    defaultWorkspace,
    ensureSeedData,
    getHistory,
    getSettings,
    saveSettings,
    saveWorkspaceState
} from "./modules/storage.js";

function openPage(path) {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}

function methodClass(method) {
    const m = String(method || "GET").toLowerCase();
    const map = { get: "m-get", post: "m-post", put: "m-put", patch: "m-patch", delete: "m-delete" };
    return map[m] || "m-get";
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    const icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
}

async function main() {
    await ensureSeedData();
    let settings = await getSettings();
    applyTheme(settings.theme);

    // Theme toggle
    document.getElementById("toggleTheme").addEventListener("click", async () => {
        settings = { ...settings, theme: settings.theme === "dark" ? "light" : "dark" };
        await saveSettings(settings);
        applyTheme(settings.theme);
    });

    // Settings
    document.getElementById("openSettings").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    // Open workspace
    document.getElementById("openWorkspace").addEventListener("click", () => {
        openPage("workspace/workspace.html");
        window.close();
    });

    // Load starter
    document.getElementById("loadStarter").addEventListener("click", async () => {
        const starter = defaultWorkspace();
        starter.url = "{{baseUrl}}/posts/1";
        await saveWorkspaceState(starter);
        openPage("workspace/workspace.html");
        window.close();
    });

    // New request
    document.getElementById("newRequest").addEventListener("click", async () => {
        await saveWorkspaceState(defaultWorkspace());
        openPage("workspace/workspace.html");
        window.close();
    });

    // Recent requests
    const history = await getHistory();
    const list = document.getElementById("recentList");
    const countEl = document.getElementById("recentCount");
    list.innerHTML = "";

    if (!history.length) {
        list.innerHTML = '<div class="p-empty">No recent requests yet</div>';
        return;
    }

    const recent = history.slice(0, 6);
    countEl.textContent = recent.length;
    countEl.classList.remove("hidden");

    recent.forEach((item) => {
        const btn = document.createElement("button");
        btn.className = "p-recent-item";
        btn.type = "button";

        const badge = document.createElement("span");
        badge.className = `m-badge ${methodClass(item.method)}`;
        badge.textContent = (item.method || "GET").toUpperCase();

        const name = document.createElement("span");
        name.className = "p-recent-name";
        name.textContent = item.name || item.url || "Untitled";

        const time = document.createElement("span");
        time.className = "p-recent-time";
        time.textContent = timeAgo(item.createdAt);

        btn.appendChild(badge);
        btn.appendChild(name);
        btn.appendChild(time);

        btn.addEventListener("click", async () => {
            await saveWorkspaceState(item.requestSnapshot || defaultWorkspace());
            openPage("workspace/workspace.html");
            window.close();
        });

        list.appendChild(btn);
    });
}

main();

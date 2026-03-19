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

function methodBadgeClass(method) {
    const value = String(method || "GET").toUpperCase();
    return `badge-method-${value.toLowerCase()}`;
}

function createEmptyState(text) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = text;
    return empty;
}

async function main() {
    await ensureSeedData();
    let settings = await getSettings();
    document.body.setAttribute("data-theme", settings.theme);
    document.getElementById("themeIcon").textContent = settings.theme === "dark" ? "☀" : "☾";

    document.getElementById("openWorkspace").addEventListener("click", () => {
        openPage("workspace/workspace.html");
        window.close();
    });

    document.getElementById("openSettings").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    document.getElementById("toggleTheme").addEventListener("click", async () => {
        settings = {
            ...settings,
            theme: settings.theme === "dark" ? "light" : "dark"
        };
        await saveSettings(settings);
        document.body.setAttribute("data-theme", settings.theme);
        document.getElementById("themeIcon").textContent = settings.theme === "dark" ? "☀" : "☾";
    });

    document.getElementById("loadStarter").addEventListener("click", async () => {
        const starter = defaultWorkspace();
        starter.url = "{{baseUrl}}/posts/1";
        await saveWorkspaceState(starter);
        openPage("workspace/workspace.html");
        window.close();
    });

    document.getElementById("newRequest").addEventListener("click", async () => {
        await saveWorkspaceState(defaultWorkspace());
        openPage("workspace/workspace.html");
        window.close();
    });

    const history = await getHistory();
    const list = document.getElementById("recentList");
    list.textContent = "";

    if (!history.length) {
        list.appendChild(createEmptyState("No recent requests yet."));
        return;
    }

    history.slice(0, 5).forEach((item) => {
        const row = document.createElement("button");
        row.className = "list-item";
        row.type = "button";
        const main = document.createElement("div");
        main.className = "list-item-main";

        const title = document.createElement("div");
        title.className = "list-item-title";
        title.textContent = item.name || item.url || "Untitled request";

        const meta = document.createElement("div");
        meta.className = "list-item-meta";
        meta.textContent = `${item.method || "GET"} • ${item.protocol || "rest"} • ${new Date(item.createdAt).toLocaleString()}`;

        const badge = document.createElement("span");
        badge.className = `badge ${methodBadgeClass(item.method)}`;
        badge.textContent = item.method || "GET";

        main.appendChild(title);
        main.appendChild(meta);
        row.appendChild(main);
        row.appendChild(badge);

        row.addEventListener("click", async () => {
            await saveWorkspaceState(item.requestSnapshot || defaultWorkspace());
            openPage("workspace/workspace.html");
            window.close();
        });

        list.appendChild(row);
    });
}

main();

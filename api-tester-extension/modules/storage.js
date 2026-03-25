export const STORAGE_KEYS = {
    settings: "apiTester.settings",
    environments: "apiTester.environments",
    collections: "apiTester.collections",
    history: "apiTester.history",
    favorites: "apiTester.favorites",
    workspace: "apiTester.workspace",
    templates: "apiTester.templates",
    schedules: "apiTester.schedules"
};

export function defaultSettings() {
    return {
        theme: "light",
        autoFormat: true,
        autoCopy: false,
        historyLimit: 50,
        requestTimeout: 45,
        defaultContentType: "application/json"
    };
}

export function defaultWorkspace() {
    return {
        protocol: "rest",
        method: "GET",
        baseUrl: "{{baseUrl}}",
        endpoint: "/posts/1",
        url: "",
        name: "",
        folder: "General",
        environmentId: "default",
        params: [{ key: "", value: "", enabled: true }],
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        bodyType: "json",
        body: "",
        graphqlQuery: "",
        auth: { type: "none" },
        websocketMessage: "",
        assertions: {
            expectedStatus: "",
            bodyIncludes: "",
            requiredJsonKeys: ""
        },
        extractors: [{ source: "body", path: "", variable: "" }]
    };
}

export function defaultEnvironments() {
    return [
        {
            id: "default",
            name: "Default",
            variables: [
                { key: "baseUrl", value: "https://jsonplaceholder.typicode.com" },
                { key: "token", value: "" }
            ]
        }
    ];
}

export function defaultTemplates() {
    return [
        {
            id: "tpl_rest_get",
            name: "REST GET",
            protocol: "rest",
            method: "GET",
            folder: "Starters",
            baseUrl: "{{baseUrl}}",
            endpoint: "/posts/1",
            url: "",
            params: [{ key: "", value: "", enabled: true }],
            headers: [{ key: "Accept", value: "application/json", enabled: true }],
            bodyType: "json",
            body: "",
            auth: { type: "none" }
        },
        {
            id: "tpl_graphql",
            name: "GraphQL Query",
            protocol: "graphql",
            method: "POST",
            folder: "Starters",
            url: "https://countries.trevorblades.com/",
            params: [{ key: "", value: "", enabled: true }],
            headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
            bodyType: "graphql",
            body: "{\n  countries {\n    code\n    name\n  }\n}",
            graphqlQuery: "query {\n  countries {\n    code\n    name\n  }\n}",
            graphqlVariables: "{\n  \n}",
            auth: { type: "none" }
        },
        {
            id: "tpl_webhook",
            name: "Webhook POST",
            protocol: "webhook",
            method: "POST",
            folder: "Starters",
            url: "https://httpbin.org/post",
            params: [{ key: "", value: "", enabled: true }],
            headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
            bodyType: "json",
            body: "{\n  \"event\": \"build.complete\",\n  \"status\": \"success\"\n}",
            auth: { type: "none" }
        }
    ];
}

async function getRaw(keys) {
    return await chrome.storage.local.get(keys);
}

async function setRaw(payload) {
    return await chrome.storage.local.set(payload);
}

export async function ensureSeedData() {
    const result = await getRaw(Object.values(STORAGE_KEYS));
    const payload = {};

    if (!result[STORAGE_KEYS.settings]) payload[STORAGE_KEYS.settings] = defaultSettings();
    if (!result[STORAGE_KEYS.environments]) payload[STORAGE_KEYS.environments] = defaultEnvironments();
    if (!result[STORAGE_KEYS.collections]) payload[STORAGE_KEYS.collections] = [];
    if (!result[STORAGE_KEYS.history]) payload[STORAGE_KEYS.history] = [];
    if (!result[STORAGE_KEYS.favorites]) payload[STORAGE_KEYS.favorites] = [];
    if (!result[STORAGE_KEYS.workspace]) payload[STORAGE_KEYS.workspace] = defaultWorkspace();
    if (!result[STORAGE_KEYS.templates]) payload[STORAGE_KEYS.templates] = defaultTemplates();
    if (!result[STORAGE_KEYS.schedules]) payload[STORAGE_KEYS.schedules] = [];

    if (Object.keys(payload).length) {
        await setRaw(payload);
    }
}

export async function getSettings() {
    const result = await getRaw([STORAGE_KEYS.settings]);
    return { ...defaultSettings(), ...(result[STORAGE_KEYS.settings] || {}) };
}

export async function saveSettings(settings) {
    await setRaw({ [STORAGE_KEYS.settings]: settings });
}

export async function getWorkspaceState() {
    const result = await getRaw([STORAGE_KEYS.workspace]);
    return { ...defaultWorkspace(), ...(result[STORAGE_KEYS.workspace] || {}) };
}

export async function saveWorkspaceState(state) {
    await setRaw({ [STORAGE_KEYS.workspace]: state });
}

export async function getCollections() {
    const result = await getRaw([STORAGE_KEYS.collections]);
    return Array.isArray(result[STORAGE_KEYS.collections]) ? result[STORAGE_KEYS.collections] : [];
}

export async function saveCollections(collections) {
    await setRaw({ [STORAGE_KEYS.collections]: collections });
}

export async function getEnvironments() {
    const result = await getRaw([STORAGE_KEYS.environments]);
    return Array.isArray(result[STORAGE_KEYS.environments]) ? result[STORAGE_KEYS.environments] : defaultEnvironments();
}

export async function saveEnvironments(environments) {
    await setRaw({ [STORAGE_KEYS.environments]: environments });
}

export async function getHistory() {
    const result = await getRaw([STORAGE_KEYS.history]);
    return Array.isArray(result[STORAGE_KEYS.history]) ? result[STORAGE_KEYS.history] : [];
}

export async function saveHistory(history) {
    await setRaw({ [STORAGE_KEYS.history]: history });
}

export async function getFavorites() {
    const result = await getRaw([STORAGE_KEYS.favorites]);
    return Array.isArray(result[STORAGE_KEYS.favorites]) ? result[STORAGE_KEYS.favorites] : [];
}

export async function saveFavorites(favorites) {
    await setRaw({ [STORAGE_KEYS.favorites]: favorites });
}

export async function getTemplates() {
    const result = await getRaw([STORAGE_KEYS.templates]);
    return Array.isArray(result[STORAGE_KEYS.templates]) ? result[STORAGE_KEYS.templates] : defaultTemplates();
}

export async function saveTemplates(templates) {
    await setRaw({ [STORAGE_KEYS.templates]: templates });
}

export async function getSchedules() {
    const result = await getRaw([STORAGE_KEYS.schedules]);
    return Array.isArray(result[STORAGE_KEYS.schedules]) ? result[STORAGE_KEYS.schedules] : [];
}

export async function saveSchedules(schedules) {
    await setRaw({ [STORAGE_KEYS.schedules]: schedules });
}

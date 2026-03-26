import { STORAGE_KEYS, defaultSettings, ensureSeedData } from "./modules/storage.js";
import { buildQueryString, replaceEnvVars } from "./modules/utils.js";

function normalizeEndpoint(endpoint) {
    const value = String(endpoint || "").trim();
    if (!value) return "";
    return value.startsWith("/") ? value : `/${value}`;
}

function joinBaseUrlAndEndpoint(baseUrl, endpoint) {
    const base = String(baseUrl || "").trim().replace(/\/+$/, "");
    const path = normalizeEndpoint(endpoint).replace(/^\/+/, "");
    if (!base) return path ? `/${path}` : "";
    if (!path) return base;
    return `${base}/${path}`;
}

async function getStorage(keys) {
    return await chrome.storage.local.get(keys);
}

async function setStorage(payload) {
    return await chrome.storage.local.set(payload);
}

async function getEnvironmentById(environmentId) {
    const result = await getStorage([STORAGE_KEYS.environments]);
    const environments = result[STORAGE_KEYS.environments] || [];
    return environments.find((env) => env.id === environmentId) || environments[0] || { variables: [] };
}

function applyAuth(request, headers, params) {
    const auth = request.auth || { type: "none" };
    if (auth.type === "bearer" && auth.value) headers.Authorization = `Bearer ${auth.value}`;
    if (auth.type === "basic" && auth.key) headers.Authorization = `Basic ${btoa(`${auth.key}:${auth.value || ""}`)}`;
    if (auth.type === "apiKey" && auth.key) {
        if (auth.placement === "query") params.push({ key: auth.key, value: auth.value || "", enabled: true });
        else headers[auth.key] = auth.value || "";
    }
    if (auth.type === "oauth" && auth.value) headers.Authorization = `Bearer ${auth.value}`;
}

function rowsToHeaders(rows) {
    const headers = {};
    (rows || []).forEach((row) => {
        if (row.key) headers[row.key] = row.value || "";
    });
    return headers;
}

async function executeScheduledRequest(request) {
    const environment = await getEnvironmentById(request.environmentId);
    const protocol = request.protocol || "rest";
    const params = (request.params || []).map((row) => ({
        ...row,
        key: replaceEnvVars(row.key, environment),
        value: replaceEnvVars(row.value, environment)
    }));
    const headers = rowsToHeaders(
        (request.headers || []).map((row) => ({
            ...row,
            key: replaceEnvVars(row.key, environment),
            value: replaceEnvVars(row.value, environment)
        }))
    );
    applyAuth(request, headers, params);

    if (protocol === "websocket") {
        throw new Error("WebSocket requests are not supported in schedules");
    }

    const resolvedUrl = replaceEnvVars(request.url || "", environment);
    const resolvedBaseUrl = replaceEnvVars(request.baseUrl || "", environment);
    const resolvedEndpoint = replaceEnvVars(request.endpoint || "", environment);
    const query = protocol === "rest" ? buildQueryString(params) : "";
    const baseRequestUrl = protocol === "rest" ? joinBaseUrlAndEndpoint(resolvedBaseUrl, resolvedEndpoint) : resolvedUrl;
    const url = query ? `${baseRequestUrl}${baseRequestUrl.includes("?") ? "&" : "?"}${query}` : baseRequestUrl;
    const body = replaceEnvVars(request.body || "", environment);
    const graphqlQuery = replaceEnvVars(request.graphqlQuery || "", environment);

    const options = {
        method: protocol === "graphql" || protocol === "webhook" ? "POST" : request.method,
        headers
    };

    if (protocol === "graphql") {
        options.headers["Content-Type"] = "application/json";
        let variables = {};
        const rawVariables = replaceEnvVars(request.graphqlVariables || "{}", environment) || "{}";
        try {
            variables = JSON.parse(rawVariables);
        } catch (error) {
            throw new Error("Scheduled GraphQL variables must be valid JSON");
        }
        options.body = JSON.stringify({
            query: graphqlQuery,
            variables
        });
    } else if (["POST", "PUT", "PATCH", "DELETE"].includes(options.method) || protocol === "webhook") {
        if (body) options.body = body;
    }

    const startedAt = Date.now();
    const response = await fetch(url, options);
    const text = await response.text();
    const historyResult = await getStorage([STORAGE_KEYS.history, STORAGE_KEYS.settings]);
    const history = historyResult[STORAGE_KEYS.history] || [];
    const settings = { ...defaultSettings(), ...(historyResult[STORAGE_KEYS.settings] || {}) };
    const entry = {
        id: `scheduled_${Date.now()}`,
        createdAt: Date.now(),
        name: request.name || baseRequestUrl,
        url,
        method: options.method,
        protocol,
        statusLabel: `${response.status} ${response.statusText}`,
        requestSnapshot: request,
        responseSnapshot: {
            status: response.status,
            statusLabel: `${response.status} ${response.statusText}`,
            statusClass: response.status >= 200 && response.status < 300 ? "status-success" : "status-danger",
            headersText: Array.from(response.headers.entries()).map(([k, v]) => `${k}: ${v}`).join("\n"),
            body: text,
            raw: text,
            time: Date.now() - startedAt,
            size: new Blob([text]).size,
            format: "Scheduled run"
        },
        source: "schedule"
    };
    const nextHistory = [entry, ...history].slice(0, settings.historyLimit || 50);
    await setStorage({ [STORAGE_KEYS.history]: nextHistory });
    if (chrome.notifications) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon48.png"),
            title: "API Tester Pro",
            message: `Scheduled request completed: ${entry.statusLabel}`
        });
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    await ensureSeedData();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message.action === "saveSchedule") {
            const schedule = message.schedule;
            await chrome.alarms.create(`apiTester.schedule.${schedule.id}`, {
                periodInMinutes: schedule.minutes
            });
            sendResponse({ ok: true });
            return;
        }

        if (message.action === "deleteSchedule") {
            await chrome.alarms.clear(`apiTester.schedule.${message.scheduleId}`);
            sendResponse({ ok: true });
            return;
        }

        sendResponse({ ok: false });
    })();
    return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (!alarm.name.startsWith("apiTester.schedule.")) return;
    const scheduleId = alarm.name.replace("apiTester.schedule.", "");
    const result = await getStorage([STORAGE_KEYS.schedules]);
    const schedules = result[STORAGE_KEYS.schedules] || [];
    const schedule = schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    try {
        await executeScheduledRequest(schedule.request);
    } catch (error) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/icon48.png"),
                title: "API Tester Pro",
                message: `Scheduled request failed: ${error.message}`
            });
        }
    }
});

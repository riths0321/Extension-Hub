import {
    defaultWorkspace,
    ensureSeedData,
    getCollections,
    getEnvironments,
    getFavorites,
    getHistory,
    getSchedules,
    getSettings,
    getTemplates,
    getWorkspaceState,
    saveCollections,
    saveEnvironments,
    saveFavorites,
    saveHistory,
    saveSchedules,
    saveSettings,
    saveWorkspaceState
} from "../modules/storage.js";
import {
    buildQueryString,
    bytesToSize,
    debounce,
    escapeHtml,
    formatTimestamp,
    lineDiff,
    normalizeRows,
    parseJsonSafe,
    prettyPrintPayload,
    replaceEnvVars,
    uid
} from "../modules/utils.js";

const state = {
    settings: null,
    environments: [],
    collections: [],
    history: [],
    favorites: [],
    templates: [],
    schedules: [],
    workspace: defaultWorkspace(),
    currentResponse: null,
    previousResponseText: "",
    batchQueue: [],
    ws: null,
    wsLog: [],
    wsReconnectUrl: ""
};

const els = {};

function $(id) {
    return document.getElementById(id);
}

function showToast(message) {
    const toast = els.toast;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function createEmptyState(text) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = text;
    return empty;
}

function activeEnvironment() {
    return state.environments.find((env) => env.id === state.workspace.environmentId) || state.environments[0];
}

function setHidden(element, hidden) {
    if (element) {
        element.classList.toggle("hidden", hidden);
    }
}

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

function getRequestPrimaryUrl(request) {
    if ((request.protocol || "rest") === "rest") {
        return joinBaseUrlAndEndpoint(request.baseUrl, request.endpoint);
    }
    return request.url || "";
}

function getRequestDisplayUrl(request) {
    return getRequestPrimaryUrl(request) || request.url || "";
}

function resetWebSocketState() {
    if (state.ws) {
        state.ws.close();
        state.ws = null;
    }
    state.wsLog = [];
    state.wsReconnectUrl = "";
}

function appendWebSocketLog(kind, message) {
    const timestamp = new Date().toLocaleTimeString();
    state.wsLog.push(`[${timestamp}] ${kind.toUpperCase()}: ${message}`);
    els.websocketLog.textContent = state.wsLog.join("\n");
}

function setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
}

function createKeyValueRow(row, options = {}) {
    const wrap = document.createElement("div");
    wrap.className = "key-value-row";
    wrap.innerHTML = `
        <input class="input row-key" placeholder="${options.keyPlaceholder || "Key"}" value="${escapeHtml(row.key || "")}">
        <input class="input row-value" placeholder="${options.valuePlaceholder || "Value"}" value="${escapeHtml(row.value || "")}">
        <button class="danger-button row-remove" type="button">Remove</button>
    `;
    return wrap;
}

function createExtractorRow(row) {
    const wrap = document.createElement("div");
    wrap.className = "key-value-row";
    wrap.innerHTML = `
        <input class="input extractor-path" placeholder="response path e.g. data.token" value="${escapeHtml(row.path || "")}">
        <input class="input extractor-variable" placeholder="env variable name" value="${escapeHtml(row.variable || "")}">
        <button class="danger-button extractor-remove" type="button">Remove</button>
    `;
    return wrap;
}

function getRowsFromContainer(container, selectors) {
    return Array.from(container.children).map((row) => ({
        key: row.querySelector(selectors.key)?.value.trim() || "",
        value: row.querySelector(selectors.value)?.value || "",
        enabled: true
    }));
}

function getExtractorRows() {
    return Array.from(els.extractRows.children).map((row) => ({
        source: "body",
        path: row.querySelector(".extractor-path")?.value.trim() || "",
        variable: row.querySelector(".extractor-variable")?.value.trim() || ""
    }));
}

function renderKeyValueRows(container, rows, type) {
    container.innerHTML = "";
    rows.forEach((row) => {
        const element = createKeyValueRow(row, {
            keyPlaceholder: type === "param" ? "Parameter" : type === "env" ? "Variable" : "Header",
            valuePlaceholder: type === "param" ? "Value" : type === "env" ? "Resolved value" : "Header value"
        });
        const removeSelector = type === "env" ? ".row-remove" : ".row-remove";
        element.querySelector(removeSelector).addEventListener("click", () => {
            element.remove();
            persistWorkspaceSoon();
        });
        element.querySelector(".row-key").addEventListener("input", persistWorkspaceSoon);
        element.querySelector(".row-value").addEventListener("input", persistWorkspaceSoon);
        container.appendChild(element);
    });
}

function renderExtractors(rows) {
    els.extractRows.innerHTML = "";
    rows.forEach((row) => {
        const element = createExtractorRow(row);
        element.querySelector(".extractor-remove").addEventListener("click", () => {
            element.remove();
            persistWorkspaceSoon();
        });
        element.querySelector(".extractor-path").addEventListener("input", persistWorkspaceSoon);
        element.querySelector(".extractor-variable").addEventListener("input", persistWorkspaceSoon);
        els.extractRows.appendChild(element);
    });
}

function populateWorkspaceForm() {
    const draft = state.workspace;
    els.requestName.value = draft.name || "";
    els.folderName.value = draft.folder || "General";
    els.method.value = draft.method || "GET";
    els.requestBaseUrl.value = draft.baseUrl || "";
    els.requestEndpoint.value = draft.endpoint || "";
    els.requestUrl.value = draft.url || "";
    els.bodyType.value = draft.bodyType || "json";
    els.requestBody.value = draft.body || "";
    els.graphqlQuery.value = draft.graphqlQuery || "";
    els.graphqlVariables.value = draft.graphqlVariables || "";
    els.websocketMessage.value = draft.websocketMessage || "";
    els.authType.value = draft.auth?.type || "none";
    els.authKey.value = draft.auth?.key || "";
    els.authValue.value = draft.auth?.value || "";
    els.oauthTokenUrl.value = draft.auth?.oauthTokenUrl || "";
    els.apiKeyPlacement.value = draft.auth?.placement || "header";
    els.expectedStatus.value = draft.assertions?.expectedStatus || "";
    els.bodyIncludes.value = draft.assertions?.bodyIncludes || "";
    els.requiredJsonKeys.value = draft.assertions?.requiredJsonKeys || "";
    renderKeyValueRows(els.paramsRows, normalizeRows(draft.params), "param");
    renderKeyValueRows(els.headersRows, normalizeRows(draft.headers), "header");
    renderExtractors(draft.extractors?.length ? draft.extractors : [{ source: "body", path: "", variable: "" }]);
    setProtocol(draft.protocol || "rest");
}

function collectWorkspaceForm() {
    state.workspace = {
        ...state.workspace,
        protocol: state.workspace.protocol || "rest",
        name: els.requestName.value.trim(),
        folder: els.folderName.value.trim() || "General",
        method: els.method.value,
        baseUrl: els.requestBaseUrl.value.trim(),
        endpoint: els.requestEndpoint.value.trim(),
        url: els.requestUrl.value.trim(),
        environmentId: els.environmentSelect.value,
        params: getRowsFromContainer(els.paramsRows, { key: ".row-key", value: ".row-value" }),
        headers: getRowsFromContainer(els.headersRows, { key: ".row-key", value: ".row-value" }),
        bodyType: els.bodyType.value,
        body: els.requestBody.value,
        graphqlQuery: els.graphqlQuery.value,
        graphqlVariables: els.graphqlVariables.value,
        websocketMessage: els.websocketMessage.value,
        auth: {
            type: els.authType.value,
            key: els.authKey.value,
            value: els.authValue.value,
            oauthTokenUrl: els.oauthTokenUrl.value,
            placement: els.apiKeyPlacement.value
        },
        assertions: {
            expectedStatus: els.expectedStatus.value.trim(),
            bodyIncludes: els.bodyIncludes.value.trim(),
            requiredJsonKeys: els.requiredJsonKeys.value.trim()
        },
        extractors: getExtractorRows()
    };

    if (state.workspace.protocol === "graphql" || state.workspace.protocol === "webhook") {
        state.workspace.method = "POST";
    }

    return state.workspace;
}

const persistWorkspaceSoon = debounce(async () => {
    collectWorkspaceForm();
    await saveWorkspaceState(state.workspace);
}, 180);

function renderEnvironmentSelect() {
    els.environmentSelect.innerHTML = "";
    state.environments.forEach((env) => {
        const option = document.createElement("option");
        option.value = env.id;
        option.textContent = env.name;
        els.environmentSelect.appendChild(option);
    });
    els.environmentSelect.value = state.workspace.environmentId || state.environments[0]?.id || "default";
}

function renderEnvironmentRows() {
    const env = activeEnvironment();
    renderKeyValueRows(els.environmentRows, env?.variables?.length ? env.variables : [{ key: "", value: "", enabled: true }], "env");
}

async function saveCurrentEnvironment() {
    const environmentId = els.environmentSelect.value;
    const envIndex = state.environments.findIndex((env) => env.id === environmentId);
    const rows = getRowsFromContainer(els.environmentRows, { key: ".row-key", value: ".row-value" }).filter((row) => row.key);

    if (envIndex >= 0) {
        state.environments[envIndex] = {
            ...state.environments[envIndex],
            variables: rows
        };
    }

    await saveEnvironments(state.environments);
    showToast("Environment saved");
}

function renderCollectionTree(filterText = "") {
    const tree = els.collectionTree;
    tree.textContent = "";
    const query = filterText.trim().toLowerCase();
    const source = [...state.templates, ...state.collections];
    const filtered = source.filter((item) => {
        const haystack = `${item.name || ""} ${getRequestDisplayUrl(item)} ${item.folder || ""}`.toLowerCase();
        return !query || haystack.includes(query);
    });

    if (!filtered.length) {
        tree.appendChild(createEmptyState("No matching requests found."));
        return;
    }

    const grouped = filtered.reduce((acc, item) => {
        const folder = item.folder || "General";
        acc[folder] = acc[folder] || [];
        acc[folder].push(item);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([folder, requests]) => {
        const folderEl = document.createElement("div");
        folderEl.className = "tree-folder";
        const header = document.createElement("div");
        header.className = "tree-folder-header";

        const folderName = document.createElement("span");
        folderName.className = "tree-folder-name";
        folderName.textContent = folder;

        const count = document.createElement("span");
        count.className = "badge";
        count.textContent = String(requests.length);

        const body = document.createElement("div");
        body.className = "tree-folder-body";

        header.appendChild(folderName);
        header.appendChild(count);
        folderEl.appendChild(header);
        folderEl.appendChild(body);
        requests.forEach((request) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tree-request";
            const main = document.createElement("span");
            main.className = "list-item-main";

            const title = document.createElement("span");
            title.className = "list-item-title";
            title.textContent = request.name || getRequestDisplayUrl(request) || "Untitled";

            const meta = document.createElement("span");
            meta.className = "list-item-meta";
            meta.textContent = `${request.method || "GET"} • ${request.protocol || "rest"}`;

            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = request.template ? "Template" : "Saved";

            main.appendChild(title);
            main.appendChild(meta);
            button.appendChild(main);
            button.appendChild(badge);
            button.addEventListener("click", async () => {
                state.workspace = {
                    ...defaultWorkspace(),
                    ...request,
                    params: normalizeRows(request.params),
                    headers: normalizeRows(request.headers),
                    environmentId: state.workspace.environmentId
                };
                populateWorkspaceForm();
                await saveWorkspaceState(state.workspace);
                showToast("Request loaded");
            });
            body.appendChild(button);
        });
        tree.appendChild(folderEl);
    });
}

function renderBatchList() {
    const list = els.batchList;
    list.textContent = "";
    if (!state.batchQueue.length) {
        list.appendChild(createEmptyState("Batch queue is empty."));
        return;
    }

    state.batchQueue.forEach((item) => {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
            <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(item.name || getRequestDisplayUrl(item) || "Queued request")}</div>
                <div class="list-item-meta">${escapeHtml(item.method)} • ${escapeHtml(item.protocol || "rest")}</div>
            </div>
            <button class="danger-button" type="button">Remove</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
            state.batchQueue = state.batchQueue.filter((entry) => entry.id !== item.id);
            renderBatchList();
        });
        list.appendChild(row);
    });
}

function renderScheduleList() {
    const list = els.scheduleList;
    list.textContent = "";
    if (!state.schedules.length) {
        list.appendChild(createEmptyState("No schedules yet."));
        return;
    }

    state.schedules.forEach((item) => {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
            <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(item.name)}</div>
                <div class="list-item-meta">Every ${item.minutes} min • ${escapeHtml(item.request.method || "POST")} ${escapeHtml(getRequestDisplayUrl(item.request))}</div>
            </div>
            <button class="danger-button" type="button">Delete</button>
        `;
        row.querySelector("button").addEventListener("click", async () => {
            state.schedules = state.schedules.filter((entry) => entry.id !== item.id);
            await saveSchedules(state.schedules);
            chrome.runtime.sendMessage({ action: "deleteSchedule", scheduleId: item.id });
            renderScheduleList();
            showToast("Schedule removed");
        });
        list.appendChild(row);
    });
}

function renderHistory(filterText = "") {
    const list = els.historyList;
    list.textContent = "";
    const query = filterText.trim().toLowerCase();
    const items = state.history.filter((item) => {
        const haystack = `${item.name || ""} ${item.url || ""} ${item.method || ""}`.toLowerCase();
        return !query || haystack.includes(query);
    });

    if (!items.length) {
        list.appendChild(createEmptyState("History will appear here after requests run."));
        return;
    }

    items.forEach((item) => {
        const isFavorite = state.favorites.includes(item.id);
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
            <div class="list-item-main">
                <div class="list-item-title">${escapeHtml(item.name || item.url || "Untitled request")}</div>
                <div class="list-item-meta">${escapeHtml(item.method)} • ${escapeHtml(item.statusLabel || "-")} • ${formatTimestamp(item.createdAt)}</div>
            </div>
            <div class="button-row">
                <button class="ghost-button load-btn" type="button">Load</button>
                <button class="secondary-button fav-btn" type="button">${isFavorite ? "Unfavorite" : "Favorite"}</button>
            </div>
        `;

        row.querySelector(".load-btn").addEventListener("click", async () => {
            state.workspace = {
                ...defaultWorkspace(),
                ...(item.requestSnapshot || {})
            };
            populateWorkspaceForm();
            await saveWorkspaceState(state.workspace);
            showToast("Loaded from history");
        });

        row.querySelector(".fav-btn").addEventListener("click", async () => {
            if (isFavorite) {
                state.favorites = state.favorites.filter((entry) => entry !== item.id);
            } else {
                state.favorites = [...state.favorites, item.id];
            }
            await saveFavorites(state.favorites);
            renderHistory(els.historySearch.value);
        });

        list.appendChild(row);
    });
}

function setBuilderPaneVisibility(paneId, visible) {
    const button = document.querySelector(`#builderTabs .pill-tab[data-pane="${paneId}"]`);
    const pane = document.getElementById(paneId);
    setHidden(button, !visible);
    setHidden(pane, !visible);
}

function ensureActiveBuilderPane() {
    const activeButton = document.querySelector("#builderTabs .pill-tab.active:not(.hidden)");
    if (activeButton) return;
    const firstVisibleButton = document.querySelector("#builderTabs .pill-tab:not(.hidden)");
    if (!firstVisibleButton) return;
    document.querySelectorAll("#builderTabs .pill-tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".builder-pane").forEach((pane) => pane.classList.remove("active"));
    firstVisibleButton.classList.add("active");
    const pane = document.getElementById(firstVisibleButton.dataset.pane);
    if (pane) pane.classList.add("active");
}

function applyProtocolUI(protocol) {
    const isRest = protocol === "rest";
    const isGraphql = protocol === "graphql";
    const isWebSocket = protocol === "websocket";
    const isWebhook = protocol === "webhook";

    setHidden(els.methodField, !isRest);
    setHidden(els.restUrlGroup, !isRest);
    setHidden(els.singleUrlGroup, isRest);
    setHidden(els.websocketPanel, !isWebSocket);

    if (!isRest) {
        els.singleUrlLabel.textContent = isGraphql ? "GraphQL endpoint" : isWebSocket ? "WebSocket URL" : "Webhook URL";
    }

    if (isGraphql || isWebhook) {
        els.method.value = "POST";
    }

    setBuilderPaneVisibility("paramsPane", isRest);
    setBuilderPaneVisibility("headersPane", !isWebSocket);
    setBuilderPaneVisibility("bodyPane", !isWebSocket);
    setBuilderPaneVisibility("authPane", isRest || isGraphql);
    setBuilderPaneVisibility("testsPane", !isWebSocket);
    setBuilderPaneVisibility("extractPane", isRest || isGraphql || isWebhook);

    const bodyTypeField = els.bodyType.closest(".field");
    const graphqlQueryField = els.graphqlQuery.closest(".field");
    const graphqlVariablesField = els.graphqlVariablesField;
    const requestBodyField = els.requestBody;

    setHidden(bodyTypeField, isGraphql);
    setHidden(graphqlQueryField, !isGraphql);
    setHidden(graphqlVariablesField, !isGraphql);
    setHidden(requestBodyField, isGraphql);

    els.sendRequest.textContent = isWebSocket ? "Connect" : isGraphql ? "Run Query" : isWebhook ? "Send Webhook" : "Send";
    ensureActiveBuilderPane();
}

function setProtocol(protocol) {
    state.workspace.protocol = protocol;
    document.querySelectorAll("#protocolTabs .pill-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.protocol === protocol);
    });

    if (protocol !== "websocket" && state.ws) {
        resetWebSocketState();
    }

    applyProtocolUI(protocol);
    persistWorkspaceSoon();
}

function setupPaneTabs(containerId) {
    const container = document.getElementById(containerId);
    container.addEventListener("click", (event) => {
        const button = event.target.closest(".pill-tab");
        if (!button) return;
        const paneId = button.dataset.pane;
        container.querySelectorAll(".pill-tab").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        let selector = ".builder-pane";
        if (containerId === "responseTabs") selector = ".response-pane-left";
        if (containerId === "outputTabs") selector = ".response-pane-right";
        document.querySelectorAll(selector).forEach((pane) => {
            pane.classList.toggle("active", pane.id === paneId);
        });
    });
}

function updateMetrics(response) {
    if (!response) {
        els.metricStatus.textContent = "-";
        els.metricTime.textContent = "-";
        els.metricSize.textContent = "-";
        els.metricFormat.textContent = "-";
        return;
    }

    els.metricStatus.textContent = response.statusLabel;
    els.metricStatus.className = `metric-value ${response.statusClass}`;
    els.metricTime.textContent = `${response.time} ms`;
    els.metricSize.textContent = bytesToSize(response.size);
    els.metricFormat.textContent = response.format;
}

function evaluateAssertions(response) {
    const checks = [];
    const { expectedStatus, bodyIncludes, requiredJsonKeys } = state.workspace.assertions;

    if (expectedStatus) {
        const pass = Number(expectedStatus) === response.status;
        checks.push({ label: `Status is ${expectedStatus}`, pass });
    }

    if (bodyIncludes) {
        const pass = String(response.body).includes(bodyIncludes);
        checks.push({ label: `Body contains "${bodyIncludes}"`, pass });
    }

    if (requiredJsonKeys) {
        const parsed = parseJsonSafe(response.body);
        const keys = requiredJsonKeys.split(",").map((item) => item.trim()).filter(Boolean);
        const pass = parsed.ok && keys.every((path) => getValueAtPath(parsed.value, path) !== undefined);
        checks.push({ label: `JSON includes keys: ${keys.join(", ")}`, pass });
    }

    if (!checks.length) {
        els.assertionResults.textContent = "No assertions configured.";
        return;
    }

    els.assertionResults.textContent = "";
    checks.forEach((check) => {
        const item = document.createElement("div");
        item.className = "assertion-item";

        const status = document.createElement("strong");
        status.className = `assertion-status ${check.pass ? "assertion-pass" : "assertion-fail"}`;
        status.textContent = check.pass ? "PASS" : "FAIL";

        item.appendChild(status);
        item.append(` ${check.label}`);
        els.assertionResults.appendChild(item);
    });
}

function getValueAtPath(payload, path) {
    return path.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), payload);
}

async function applyExtractors(response) {
    const parsed = parseJsonSafe(response.body);
    if (!parsed.ok) return;
    const env = activeEnvironment();
    const variables = [...(env?.variables || [])];

    state.workspace.extractors.forEach((extractor) => {
        if (!extractor.path || !extractor.variable) return;
        const value = getValueAtPath(parsed.value, extractor.path);
        const existing = variables.find((item) => item.key === extractor.variable);
        if (existing) {
            existing.value = value === undefined ? "" : String(value);
        } else {
            variables.push({ key: extractor.variable, value: value === undefined ? "" : String(value) });
        }
    });

    const envIndex = state.environments.findIndex((item) => item.id === env.id);
    if (envIndex >= 0) {
        state.environments[envIndex] = { ...env, variables };
        await saveEnvironments(state.environments);
        renderEnvironmentRows();
    }
}

function responseFormat(contentType, body) {
    const lower = String(contentType || "").toLowerCase();
    const trimmed = String(body || "").trim();
    if (lower.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) return "JSON";
    if (lower.includes("xml") || trimmed.startsWith("<")) return "XML / HTML";
    return "Text";
}

function buildResponseSnapshot(response, rawHeaders) {
    const format = responseFormat(response.headers.get("content-type"), response.body);
    const statusClass =
        response.status >= 200 && response.status < 300
            ? "status-success"
            : response.status >= 400
                ? "status-danger"
                : "status-warning";

    return {
        status: response.status,
        statusLabel: `${response.status} ${response.statusText}`,
        statusClass,
        headersText: rawHeaders,
        body: response.body,
        raw: response.body,
        time: response.time,
        size: response.size,
        format
    };
}

function updateOutputPanels() {
    const resolved = buildResolvedRequest();
    const { request } = resolved;
    const curl = generateCurlSnippet(resolved);
    const python = generatePythonSnippet(resolved);
    const js = generateJsSnippet(resolved);
    els.snippetOutput.textContent = curl;

    const response = state.currentResponse;
    els.docsOutput.textContent = generateDocs(resolved, response);
    els.ciOutput.textContent = generateCiSnippet(resolved, response);
    els.mockOutput.textContent = generateMockConfig(resolved, response);

    els.copySnippetCurl.onclick = () => copyText(curl, "Copied cURL snippet");
    els.copySnippetPython.onclick = () => copyText(python, "Copied Python snippet");
    els.copySnippetJs.onclick = () => copyText(js, "Copied JavaScript snippet");
    els.copyDocs.onclick = () => copyText(els.docsOutput.textContent, "Copied docs");
    els.copyCi.onclick = () => copyText(els.ciOutput.textContent, "Copied CI snippet");
    els.copyMock.onclick = () => copyText(els.mockOutput.textContent, "Copied mock config");
}

function updateResponsePanels(response) {
    if (!response) {
        els.responsePretty.textContent = "Send a request to see the response.";
        els.responseHeaders.textContent = "";
        els.responseRaw.textContent = "";
        els.responseDiff.textContent = "Run multiple requests to compare responses.";
        updateMetrics(null);
        return;
    }

    els.responsePretty.textContent = prettyPrintPayload(response.body, response.headersText);
    els.responseHeaders.textContent = response.headersText;
    els.responseRaw.textContent = response.raw;
    els.responseDiff.textContent = state.previousResponseText
        ? lineDiff(state.previousResponseText, response.body)
        : "Run another request to compare the response diff.";
    updateMetrics(response);
    evaluateAssertions(response);
    updateOutputPanels();
}

async function addHistoryEntry(snapshot) {
    const nextHistory = [snapshot, ...state.history].slice(0, state.settings.historyLimit || 50);
    state.history = nextHistory;
    await saveHistory(nextHistory);
    renderHistory(els.historySearch.value);
}

function buildHeadersObject(rows) {
    const headers = {};
    rows.forEach((row) => {
        if (row.key) headers[row.key] = row.value;
    });
    return headers;
}

function buildRequestBodyByType(bodyType, body) {
    if (bodyType === "form") {
        return buildQueryString(
            String(body || "")
                .split("\n")
                .map((line) => {
                    const [key, ...rest] = line.split("=");
                    return { key: key?.trim(), value: rest.join("=").trim(), enabled: true };
                })
        );
    }
    return body || "";
}

function applyAuth(request, headers, params) {
    const auth = request.auth || { type: "none" };

    if (auth.type === "bearer" && auth.value) {
        headers.Authorization = `Bearer ${auth.value}`;
    }

    if (auth.type === "basic" && auth.key) {
        headers.Authorization = `Basic ${btoa(`${auth.key}:${auth.value || ""}`)}`;
    }

    if (auth.type === "apiKey" && auth.key) {
        if (auth.placement === "query") {
            params.push({ key: auth.key, value: auth.value || "", enabled: true });
        } else {
            headers[auth.key] = auth.value || "";
        }
    }

    if (auth.type === "oauth" && auth.value) {
        headers.Authorization = `Bearer ${auth.value}`;
    }
}

function buildResolvedRequest() {
    const request = collectWorkspaceForm();
    const env = activeEnvironment();
    const params = normalizeRows(request.params).map((row) => ({
        ...row,
        key: replaceEnvVars(row.key, env),
        value: replaceEnvVars(row.value, env)
    }));
    const headersRows = normalizeRows(request.headers).map((row) => ({
        ...row,
        key: replaceEnvVars(row.key, env),
        value: replaceEnvVars(row.value, env)
    }));
    const url = replaceEnvVars(request.url, env);
    const baseUrl = replaceEnvVars(request.baseUrl, env);
    const endpoint = replaceEnvVars(request.endpoint, env);
    const body = replaceEnvVars(request.body, env);
    const headers = buildHeadersObject(headersRows);
    applyAuth(request, headers, params);
    const protocol = request.protocol || "rest";
    const finalUrl =
        protocol === "rest"
            ? (() => {
                const restBaseUrl = joinBaseUrlAndEndpoint(baseUrl, endpoint);
                const queryString = buildQueryString(params);
                return queryString ? `${restBaseUrl}${restBaseUrl.includes("?") ? "&" : "?"}${queryString}` : restBaseUrl;
            })()
            : url;

    return {
        request,
        env,
        url,
        baseUrl,
        endpoint,
        finalUrl,
        params,
        headers,
        body,
        graphqlQuery: replaceEnvVars(request.graphqlQuery || "", env),
        graphqlVariables: replaceEnvVars(request.graphqlVariables || "", env)
    };
}

async function executeRequest(snapshot, options = {}) {
    const request = snapshot || buildResolvedRequest();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), (state.settings.requestTimeout || 45) * 1000);
    const startedAt = performance.now();

    try {
        const fetchOptions = {
            method: request.request.protocol === "webhook" ? "POST" : request.request.method,
            headers: request.headers,
            signal: controller.signal
        };

        if (request.request.protocol === "graphql") {
            fetchOptions.method = "POST";
            fetchOptions.headers["Content-Type"] = "application/json";
            const variables = request.graphqlVariables ? parseJsonSafe(request.graphqlVariables) : { ok: true, value: {} };
            if (!variables.ok) {
                throw new Error("GraphQL variables must be valid JSON");
            }
            fetchOptions.body = JSON.stringify({
                query: request.graphqlQuery,
                variables: variables.value || {}
            });
        } else if (["POST", "PUT", "PATCH", "DELETE"].includes(fetchOptions.method) || request.request.protocol === "webhook") {
            if (request.request.bodyType === "form") {
                fetchOptions.body = buildRequestBodyByType(request.request.bodyType, request.body);
                fetchOptions.headers["Content-Type"] ||= "application/x-www-form-urlencoded";
            } else if (request.body) {
                fetchOptions.body = request.body;
                if (request.request.bodyType === "json") {
                    fetchOptions.headers["Content-Type"] ||= "application/json";
                }
            }
        }

        const response = await fetch(request.finalUrl, fetchOptions);
        const body = await response.text();
        const elapsed = Math.round(performance.now() - startedAt);
        const headersText = Array.from(response.headers.entries())
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");

        return buildResponseSnapshot(
            {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body,
                time: elapsed,
                size: new Blob([body]).size
            },
            headersText
        );
    } finally {
        window.clearTimeout(timeout);
    }
}

async function connectWebSocket(url) {
    if (!url.trim()) {
        showToast("Enter a WebSocket URL first");
        return;
    }

    if (state.ws) {
        state.ws.close();
    }

    state.wsLog = [];
    els.websocketLog.textContent = "Connecting...";

    await new Promise((resolve, reject) => {
        const startedAt = performance.now();
        const socket = new WebSocket(url);
        state.ws = socket;
        state.wsReconnectUrl = url;

        socket.addEventListener("open", () => {
            appendWebSocketLog("system", "Connection opened");
            state.currentResponse = {
                status: 101,
                statusLabel: "101 WebSocket Connected",
                statusClass: "status-success",
                headersText: "WebSocket handshake is managed by the browser.",
                body: state.wsLog.join("\n"),
                raw: state.wsLog.join("\n"),
                time: Math.round(performance.now() - startedAt),
                size: new Blob([state.wsLog.join("\n")]).size,
                format: "WebSocket"
            };
            updateResponsePanels(state.currentResponse);
            resolve();
        }, { once: true });

        socket.addEventListener("message", (event) => {
            appendWebSocketLog("incoming", typeof event.data === "string" ? event.data : "[binary]");
            state.currentResponse = {
                ...(state.currentResponse || {
                    status: 101,
                    statusLabel: "101 WebSocket Connected",
                    statusClass: "status-success",
                    headersText: "WebSocket handshake is managed by the browser.",
                    time: 0,
                    size: 0,
                    format: "WebSocket"
                }),
                body: state.wsLog.join("\n"),
                raw: state.wsLog.join("\n"),
                size: new Blob([state.wsLog.join("\n")]).size
            };
            updateResponsePanels(state.currentResponse);
        });

        socket.addEventListener("close", () => {
            appendWebSocketLog("system", "Connection closed");
            state.ws = null;
        });

        socket.addEventListener("error", () => {
            appendWebSocketLog("error", "Connection failed");
            reject(new Error("WebSocket connection failed"));
        }, { once: true });
    });
}

async function sendWebSocketMessage() {
    collectWorkspaceForm();
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        showToast("Connect the WebSocket first");
        return;
    }

    const message = els.websocketMessage.value.trim();
    if (!message) {
        showToast("Enter a WebSocket message");
        return;
    }

    state.ws.send(message);
    appendWebSocketLog("outgoing", message);
    state.currentResponse = {
        ...(state.currentResponse || {
            status: 101,
            statusLabel: "101 WebSocket Connected",
            statusClass: "status-success",
            headersText: "WebSocket handshake is managed by the browser.",
            time: 0,
            size: 0,
            format: "WebSocket"
        }),
        body: state.wsLog.join("\n"),
        raw: state.wsLog.join("\n"),
        size: new Blob([state.wsLog.join("\n")]).size
    };
    updateResponsePanels(state.currentResponse);
}

function disconnectWebSocket() {
    if (!state.ws) {
        showToast("WebSocket is not connected");
        return;
    }
    state.ws.close();
    appendWebSocketLog("system", "Disconnect requested");
    state.currentResponse = {
        ...(state.currentResponse || {}),
        status: 1000,
        statusLabel: "WebSocket Disconnected",
        statusClass: "status-warning",
        headersText: "WebSocket handshake is managed by the browser.",
        body: state.wsLog.join("\n"),
        raw: state.wsLog.join("\n"),
        size: new Blob([state.wsLog.join("\n")]).size,
        format: "WebSocket"
    };
    updateResponsePanels(state.currentResponse);
    showToast("WebSocket disconnected");
}

async function runCurrentRequest() {
    collectWorkspaceForm();
    await saveWorkspaceState(state.workspace);

    if (state.workspace.protocol === "websocket") {
        const targetUrl = state.workspace.url.trim();
        if (!targetUrl) {
            showToast("Enter a WebSocket URL first");
            return;
        }

        try {
            await connectWebSocket(targetUrl);
            await addHistoryEntry({
                id: uid("history"),
                createdAt: Date.now(),
                name: state.workspace.name,
                url: targetUrl,
                method: "WS",
                protocol: state.workspace.protocol,
                statusLabel: "101 WebSocket Connected",
                requestSnapshot: structuredClone(state.workspace),
                responseSnapshot: state.currentResponse
            });
            showToast("WebSocket connected");
        } catch (error) {
            showToast("WebSocket failed");
        }
        return;
    }

    const requiredUrl =
        state.workspace.protocol === "rest"
            ? joinBaseUrlAndEndpoint(state.workspace.baseUrl, state.workspace.endpoint)
            : state.workspace.url.trim();
    if (!requiredUrl) {
        showToast(state.workspace.protocol === "rest" ? "Enter base URL and endpoint" : "Enter a request URL first");
        return;
    }
    if (state.workspace.protocol === "graphql" && !state.workspace.graphqlQuery.trim()) {
        showToast("Enter a GraphQL query");
        return;
    }

    try {
        const requestSnapshot = buildResolvedRequest();
        const response = await executeRequest(requestSnapshot);
        state.previousResponseText = state.currentResponse?.body || "";
        state.currentResponse = response;
        updateResponsePanels(response);
        await applyExtractors(response);

        if (state.settings.autoCopy) {
            await navigator.clipboard.writeText(response.body);
        }

        await addHistoryEntry({
            id: uid("history"),
            createdAt: Date.now(),
            name: state.workspace.name,
            url: requestSnapshot.finalUrl,
            method: state.workspace.method,
            protocol: state.workspace.protocol,
            statusLabel: response.statusLabel,
            requestSnapshot: structuredClone(state.workspace),
            responseSnapshot: response
        });

        showToast("Request completed");
    } catch (error) {
        const failedResponse = {
            status: 0,
            statusLabel: `Error: ${error.message}`,
            statusClass: "status-danger",
            headersText: "",
            body: error.stack || error.message,
            raw: error.stack || error.message,
            time: 0,
            size: 0,
            format: "Error"
        };
        state.currentResponse = failedResponse;
        updateResponsePanels(failedResponse);
        showToast("Request failed");
    }
}

async function runBatchQueue() {
    if (!state.batchQueue.length) {
        showToast("Batch queue is empty");
        return;
    }

    for (const item of state.batchQueue) {
        if (item.protocol === "websocket") {
            continue;
        }
        state.workspace = structuredClone(item);
        populateWorkspaceForm();
        await runCurrentRequest();
    }
}

async function fetchOAuthToken() {
    const tokenUrl = els.oauthTokenUrl.value.trim();
    const clientId = els.authKey.value.trim();
    const clientSecret = els.authValue.value;
    if (!tokenUrl || !clientId) {
        showToast("Add token URL and client ID");
        return;
    }

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret
            })
        });
        const data = await response.json();
        els.authValue.value = data.access_token || "";
        els.authType.value = "oauth";
        collectWorkspaceForm();
        await saveWorkspaceState(state.workspace);
        showToast("OAuth token resolved");
    } catch (error) {
        showToast("OAuth token request failed");
    }
}

async function saveCurrentRequest() {
    collectWorkspaceForm();
    const request = {
        ...structuredClone(state.workspace),
        id: uid("request"),
        template: false
    };
    state.collections = [request, ...state.collections];
    await saveCollections(state.collections);
    renderCollectionTree(els.collectionSearch.value);
    showToast("Request saved to collections");
}

function generateCurlSnippet(request) {
    const resolved = request.request ? request : buildResolvedRequest();
    const headerArgs = Object.entries(resolved.headers)
        .map(([key, value]) => `-H "${key}: ${String(value).replace(/"/g, '\\"')}"`)
        .join(" ");
    if (resolved.request.protocol === "websocket") {
        return `# WebSocket\n# Connect to ${resolved.finalUrl || resolved.url}\n# Send messages from the WebSocket panel in API Tester Pro`;
    }
    if (resolved.request.protocol === "graphql") {
        const graphqlBody = JSON.stringify({
            query: resolved.graphqlQuery,
            variables: resolved.graphqlVariables ? parseJsonSafe(resolved.graphqlVariables).value || {} : {}
        });
        return `curl -X POST "${resolved.finalUrl}" ${headerArgs} -H "Content-Type: application/json" --data '${graphqlBody.replace(/'/g, "'\\''")}'`.trim();
    }
    const method = resolved.request.protocol === "webhook" ? "POST" : resolved.request.method;
    const body = buildRequestBodyByType(resolved.request.bodyType, resolved.body);
    const bodyArg = body ? ` --data '${body.replace(/'/g, "'\\''")}'` : "";
    return `curl -X ${method} "${resolved.finalUrl}" ${headerArgs}${bodyArg}`.trim();
}

function generatePythonSnippet(request) {
    const resolved = request.request ? request : buildResolvedRequest();
    if (resolved.request.protocol === "websocket") {
        return `# WebSocket example\n# Use a WebSocket client library such as websocket-client\nurl = "${resolved.finalUrl || resolved.url}"`;
    }
    if (resolved.request.protocol === "graphql") {
        return `import requests\n\nurl = "${resolved.finalUrl}"\nheaders = ${JSON.stringify({ ...resolved.headers, "Content-Type": "application/json" }, null, 4)}\npayload = ${JSON.stringify({ query: resolved.graphqlQuery, variables: resolved.graphqlVariables ? parseJsonSafe(resolved.graphqlVariables).value || {} : {} }, null, 4)}\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.status_code)\nprint(response.text)`;
    }
    const method = resolved.request.protocol === "webhook" ? "POST" : resolved.request.method;
    const body = buildRequestBodyByType(resolved.request.bodyType, resolved.body);
    return `import requests\n\nurl = "${resolved.finalUrl}"\nheaders = ${JSON.stringify(resolved.headers, null, 4)}\nresponse = requests.request("${method}", url, headers=headers, data=${JSON.stringify(body || "")})\nprint(response.status_code)\nprint(response.text)`;
}

function generateJsSnippet(request) {
    const resolved = request.request ? request : buildResolvedRequest();
    if (resolved.request.protocol === "websocket") {
        return `const socket = new WebSocket("${resolved.finalUrl || resolved.url}");\nsocket.addEventListener("open", () => console.log("connected"));\nsocket.addEventListener("message", (event) => console.log(event.data));`;
    }
    if (resolved.request.protocol === "graphql") {
        return `const response = await fetch("${resolved.finalUrl}", {\n  method: "POST",\n  headers: ${JSON.stringify({ ...resolved.headers, "Content-Type": "application/json" }, null, 2)},\n  body: ${JSON.stringify(JSON.stringify({ query: resolved.graphqlQuery, variables: resolved.graphqlVariables ? parseJsonSafe(resolved.graphqlVariables).value || {} : {} }))}\n});\n\nconsole.log(response.status);\nconsole.log(await response.text());`;
    }
    const method = resolved.request.protocol === "webhook" ? "POST" : resolved.request.method;
    const body = buildRequestBodyByType(resolved.request.bodyType, resolved.body);
    return `const response = await fetch("${resolved.finalUrl}", {\n  method: "${method}",\n  headers: ${JSON.stringify(resolved.headers, null, 2)},\n  body: ${JSON.stringify(body || "")}\n});\n\nconsole.log(response.status);\nconsole.log(await response.text());`;
}

function generateDocs(request, response) {
    const resolved = request.request ? request : buildResolvedRequest();
    const requestBody =
        resolved.request.protocol === "graphql"
            ? JSON.stringify({ query: resolved.graphqlQuery, variables: resolved.graphqlVariables ? parseJsonSafe(resolved.graphqlVariables).value || {} : {} }, null, 2)
            : buildRequestBodyByType(resolved.request.bodyType, resolved.body) || "None";
    return `# ${resolved.request.name || "Untitled request"}\n\n## Request\n- Protocol: ${resolved.request.protocol}\n- Method: ${resolved.request.protocol === "websocket" ? "WS" : resolved.request.protocol === "webhook" ? "POST" : resolved.request.method}\n- URL: ${resolved.finalUrl}\n- Folder: ${resolved.request.folder || "General"}\n\n## Headers\n${JSON.stringify(resolved.headers, null, 2)}\n\n## Body\n${requestBody}\n\n## Latest response\n${response ? `${response.statusLabel}\n\n${prettyPrintPayload(response.body)}` : "No response yet."}`;
}

function generateCiSnippet(request, response) {
    const resolved = request.request ? request : buildResolvedRequest();
    if (resolved.request.protocol === "websocket") {
        return `# WebSocket connections are interactive.\n# Use a dedicated test runner or integration test for ${resolved.finalUrl}.`;
    }
    const method = resolved.request.protocol === "graphql" || resolved.request.protocol === "webhook" ? "POST" : resolved.request.method;
    const body =
        resolved.request.protocol === "graphql"
            ? JSON.stringify({ query: resolved.graphqlQuery, variables: resolved.graphqlVariables ? parseJsonSafe(resolved.graphqlVariables).value || {} : {} })
            : buildRequestBodyByType(resolved.request.bodyType, resolved.body);
    return `name: API smoke test\n\njobs:\n  api-test:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Run request\n        run: |\n          curl --fail -X ${method} "${resolved.finalUrl}" \\\n            -H "Content-Type: application/json" \\\n            --data '${(body || "").replace(/'/g, "'\\''")}'\n      - name: Expected status\n        run: echo "Expected ${response?.status || resolved.request.assertions?.expectedStatus || "200"}"`;
}

function generateMockConfig(request, response) {
    const resolved = request.request ? request : buildResolvedRequest();
    return JSON.stringify(
        {
            route: els.mockPath.value || resolved.finalUrl || "/resource",
            method: resolved.request.protocol === "webhook" ? "POST" : resolved.request.method,
            status: Number(els.mockStatus.value || 200),
            headers: resolved.headers,
            body: response ? parseJsonSafe(response.body).value || response.body : resolved.body || {}
        },
        null,
        2
    );
}

async function copyText(text, successMessage) {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
}

async function exportWorkspaceData() {
    const payload = JSON.stringify(
        {
            settings: state.settings,
            environments: state.environments,
            collections: state.collections,
            history: state.history,
            favorites: state.favorites,
            templates: state.templates,
            schedules: state.schedules
        },
        null,
        2
    );
    await copyText(payload, "Workspace JSON copied");
}

async function importWorkspaceData(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    state.environments = data.environments || state.environments;
    state.collections = data.collections || state.collections;
    state.history = data.history || state.history;
    state.favorites = data.favorites || state.favorites;
    state.templates = data.templates || state.templates;
    state.schedules = data.schedules || state.schedules;
    state.settings = { ...state.settings, ...(data.settings || {}) };
    await Promise.all([
        saveEnvironments(state.environments),
        saveCollections(state.collections),
        saveHistory(state.history),
        saveFavorites(state.favorites),
        saveSchedules(state.schedules),
        saveSettings(state.settings)
    ]);
    setTheme(state.settings.theme);
    renderEnvironmentSelect();
    renderEnvironmentRows();
    renderCollectionTree();
    renderHistory();
    renderScheduleList();
    showToast("Workspace imported");
}

async function exportHistoryOnly() {
    await copyText(JSON.stringify(state.history, null, 2), "History copied");
}

async function clearHistoryAll() {
    state.history = [];
    await saveHistory([]);
    renderHistory();
    showToast("History cleared");
}

async function addCurrentToBatch() {
    collectWorkspaceForm();
    if (state.workspace.protocol === "websocket") {
        showToast("WebSocket requests are not supported in batch mode");
        return;
    }
    state.batchQueue = [...state.batchQueue, { ...structuredClone(state.workspace), id: uid("batch") }];
    renderBatchList();
    showToast("Added to batch");
}

async function scheduleCurrentRequest() {
    collectWorkspaceForm();
    if (state.workspace.protocol === "websocket") {
        showToast("WebSocket requests cannot be scheduled");
        return;
    }
    const name = els.scheduleName.value.trim() || state.workspace.name || "Scheduled request";
    const minutes = Math.max(5, Number(els.scheduleMinutes.value || 30));
    const schedule = {
        id: uid("schedule"),
        name,
        minutes,
        request: structuredClone(state.workspace)
    };

    state.schedules = [schedule, ...state.schedules];
    await saveSchedules(state.schedules);
    chrome.runtime.sendMessage({ action: "saveSchedule", schedule });
    renderScheduleList();
    showToast("Schedule saved");
}

function bindInputPersistence() {
    [
        els.requestName,
        els.folderName,
        els.method,
        els.requestBaseUrl,
        els.requestEndpoint,
        els.requestUrl,
        els.bodyType,
        els.requestBody,
        els.graphqlQuery,
        els.graphqlVariables,
        els.websocketMessage,
        els.authType,
        els.authKey,
        els.authValue,
        els.oauthTokenUrl,
        els.apiKeyPlacement,
        els.expectedStatus,
        els.bodyIncludes,
        els.requiredJsonKeys,
        els.mockPath,
        els.mockStatus
    ].forEach((input) => input.addEventListener("input", persistWorkspaceSoon));
}

function renderInitialOutputs() {
    updateOutputPanels();
    updateResponsePanels(null);
}

function queryElementMap() {
    [
        "toast",
        "openSettings",
        "toggleTheme",
        "globalSearch",
        "exportAll",
        "importAll",
        "importFile",
        "environmentSelect",
        "environmentRows",
        "saveEnvironment",
        "addEnvironmentVar",
        "collectionSearch",
        "collectionTree",
        "saveRequest",
        "requestName",
        "folderName",
        "methodField",
        "method",
        "requestBaseUrl",
        "requestEndpoint",
        "restUrlGroup",
        "singleUrlGroup",
        "singleUrlLabel",
        "requestUrl",
        "sendRequest",
        "connectWebSocket",
        "disconnectWebSocket",
        "reconnectWebSocket",
        "websocketMessage",
        "sendWebSocketMessage",
        "websocketPanel",
        "websocketLog",
        "paramsRows",
        "headersRows",
        "requestBody",
        "graphqlQuery",
        "graphqlVariables",
        "graphqlVariablesField",
        "bodyType",
        "authType",
        "authKey",
        "authValue",
        "oauthTokenUrl",
        "apiKeyPlacement",
        "expectedStatus",
        "bodyIncludes",
        "requiredJsonKeys",
        "extractRows",
        "addParam",
        "addHeader",
        "addExtractor",
        "responsePretty",
        "responseHeaders",
        "responseRaw",
        "responseDiff",
        "assertionResults",
        "metricStatus",
        "metricTime",
        "metricSize",
        "metricFormat",
        "snippetOutput",
        "docsOutput",
        "ciOutput",
        "mockOutput",
        "copySnippetCurl",
        "copySnippetPython",
        "copySnippetJs",
        "copyDocs",
        "copyCi",
        "copyMock",
        "generateMock",
        "mockPath",
        "mockStatus",
        "historySearch",
        "historyList",
        "exportHistory",
        "clearHistory",
        "addToBatch",
        "runBatch",
        "batchList",
        "scheduleName",
        "scheduleMinutes",
        "scheduleCurrent",
        "scheduleList",
        "resolveOAuth"
    ].forEach((id) => {
        els[id] = $(id);
    });
}

async function init() {
    queryElementMap();
    await ensureSeedData();
    const [settings, environments, collections, history, favorites, templates, schedules, workspace] = await Promise.all([
        getSettings(),
        getEnvironments(),
        getCollections(),
        getHistory(),
        getFavorites(),
        getTemplates(),
        getSchedules(),
        getWorkspaceState()
    ]);

    state.settings = settings;
    state.environments = environments;
    state.collections = collections;
    state.history = history;
    state.favorites = favorites;
    state.templates = templates.map((item) => ({ ...item, template: true }));
    state.schedules = schedules;
    state.workspace = { ...defaultWorkspace(), ...workspace };

    setTheme(settings.theme);
    renderEnvironmentSelect();
    renderEnvironmentRows();
    populateWorkspaceForm();
    renderCollectionTree();
    renderBatchList();
    renderScheduleList();
    renderHistory();
    renderInitialOutputs();
    bindInputPersistence();

    document.getElementById("protocolTabs").addEventListener("click", (event) => {
        const button = event.target.closest(".pill-tab");
        if (!button) return;
        setProtocol(button.dataset.protocol);
    });

    setupPaneTabs("builderTabs");
    setupPaneTabs("responseTabs");
    setupPaneTabs("outputTabs");

    els.openSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
    els.toggleTheme.addEventListener("click", async () => {
        state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
        await saveSettings(state.settings);
        setTheme(state.settings.theme);
        showToast(`Theme: ${state.settings.theme}`);
    });

    els.environmentSelect.addEventListener("change", async () => {
        state.workspace.environmentId = els.environmentSelect.value;
        await saveWorkspaceState(state.workspace);
        renderEnvironmentRows();
    });

    els.addEnvironmentVar.addEventListener("click", () => {
        const row = createKeyValueRow({ key: "", value: "" });
        row.querySelector(".row-remove").addEventListener("click", () => row.remove());
        els.environmentRows.appendChild(row);
    });
    els.saveEnvironment.addEventListener("click", saveCurrentEnvironment);

    els.collectionSearch.addEventListener("input", () => renderCollectionTree(els.collectionSearch.value));
    els.globalSearch.addEventListener("input", () => {
        renderCollectionTree(els.globalSearch.value);
        renderHistory(els.globalSearch.value);
    });

    els.saveRequest.addEventListener("click", saveCurrentRequest);
    els.sendRequest.addEventListener("click", runCurrentRequest);
    els.connectWebSocket.addEventListener("click", runCurrentRequest);
    els.disconnectWebSocket.addEventListener("click", disconnectWebSocket);
    els.reconnectWebSocket.addEventListener("click", async () => {
        const targetUrl = state.wsReconnectUrl || els.requestUrl.value.trim();
        if (!targetUrl) {
            showToast("No WebSocket URL to reconnect");
            return;
        }
        try {
            await connectWebSocket(targetUrl);
            showToast("WebSocket reconnected");
        } catch (error) {
            showToast("Reconnect failed");
        }
    });
    els.sendWebSocketMessage.addEventListener("click", sendWebSocketMessage);
    els.addParam.addEventListener("click", () => {
        const row = createKeyValueRow({ key: "", value: "" });
        row.querySelector(".row-remove").addEventListener("click", () => row.remove());
        els.paramsRows.appendChild(row);
    });
    els.addHeader.addEventListener("click", () => {
        const row = createKeyValueRow({ key: "", value: "" });
        row.querySelector(".row-remove").addEventListener("click", () => row.remove());
        els.headersRows.appendChild(row);
    });
    els.addExtractor.addEventListener("click", () => {
        const row = createExtractorRow({ path: "", variable: "" });
        row.querySelector(".extractor-remove").addEventListener("click", () => row.remove());
        els.extractRows.appendChild(row);
    });

    els.generateMock.addEventListener("click", () => {
        els.mockOutput.textContent = generateMockConfig(collectWorkspaceForm(), state.currentResponse);
    });
    els.exportAll.addEventListener("click", exportWorkspaceData);
    els.importAll.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", async (event) => {
        const [file] = event.target.files;
        if (file) await importWorkspaceData(file);
        event.target.value = "";
    });
    els.exportHistory.addEventListener("click", exportHistoryOnly);
    els.clearHistory.addEventListener("click", clearHistoryAll);
    els.historySearch.addEventListener("input", () => renderHistory(els.historySearch.value));
    els.addToBatch.addEventListener("click", addCurrentToBatch);
    els.runBatch.addEventListener("click", runBatchQueue);
    els.scheduleCurrent.addEventListener("click", scheduleCurrentRequest);
    els.resolveOAuth.addEventListener("click", fetchOAuthToken);
}

init();

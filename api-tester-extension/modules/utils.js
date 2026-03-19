export function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 9)}`;
}

export function debounce(fn, wait = 200) {
    let timer = null;
    return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), wait);
    };
}

export function bytesToSize(bytes) {
    if (!bytes && bytes !== 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTimestamp(ts) {
    return new Date(ts).toLocaleString();
}

export function replaceEnvVars(input, environment) {
    const variables = environment?.variables || [];
    return String(input || "").replace(/\{\{(.*?)\}\}/g, (_, key) => {
        const found = variables.find((item) => item.key === key.trim());
        return found ? found.value : `{{${key}}}`;
    });
}

export function parseJsonSafe(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (error) {
        return { ok: false, error };
    }
}

export function prettyPrintPayload(payload, contentType = "") {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const lower = String(contentType).toLowerCase();
    const trimmed = String(raw || "").trim();

    if (!trimmed) return "";

    if (lower.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const parsed = parseJsonSafe(trimmed);
        if (parsed.ok) return JSON.stringify(parsed.value, null, 2);
    }

    if (lower.includes("xml") || trimmed.startsWith("<")) {
        return trimmed.replace(/></g, ">\n<");
    }

    return trimmed;
}

export function buildQueryString(params) {
    const urlParams = new URLSearchParams();
    (params || []).forEach((item) => {
        if (item.enabled !== false && item.key) {
            urlParams.append(item.key, item.value || "");
        }
    });
    return urlParams.toString();
}

export function normalizeRows(rows, fallback = { key: "", value: "", enabled: true }) {
    if (!Array.isArray(rows) || !rows.length) return [{ ...fallback }];
    return rows.map((row) => ({
        key: row.key || "",
        value: row.value || "",
        enabled: row.enabled !== false
    }));
}

export function lineDiff(previousText, currentText) {
    const prevLines = String(previousText || "").split("\n");
    const nextLines = String(currentText || "").split("\n");
    const max = Math.max(prevLines.length, nextLines.length);
    const output = [];

    for (let index = 0; index < max; index += 1) {
        const prev = prevLines[index];
        const next = nextLines[index];
        if (prev === next) {
            output.push(`  ${next || ""}`);
        } else {
            if (typeof prev !== "undefined") output.push(`- ${prev}`);
            if (typeof next !== "undefined") output.push(`+ ${next}`);
        }
    }

    return output.join("\n");
}

export function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

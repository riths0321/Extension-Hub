document.addEventListener("DOMContentLoaded", () => {
    const state = {
        snippets: [],
        currentEditId: null,
        hasChanges: false
    };

    const el = {
        newSnippet: document.getElementById("newSnippet"),
        editorView: document.getElementById("editorView"),
        snippetsList: document.getElementById("snippetsList"),
        noSnippets: document.getElementById("noSnippets"),
        saveSnippet: document.getElementById("saveSnippet"),
        cancelEdit: document.getElementById("cancelEdit"),
        search: document.getElementById("search"),
        filterLanguage: document.getElementById("filterLanguage"),
        snippetTitle: document.getElementById("snippetTitle"),
        snippetLanguage: document.getElementById("snippetLanguage"),
        snippetCode: document.getElementById("snippetCode"),
        createFirstSnippet: document.getElementById("createFirstSnippet"),
        insertToPage: document.getElementById("insertToPage"),
        notification: document.getElementById("notification"),
        exportSnippets: document.getElementById("exportSnippets"),
        importSnippets: document.getElementById("importSnippets"),
        importFile: document.getElementById("importFile")
    };

    init().catch((error) => {
        showNotification(`Initialization failed: ${error.message}`, "error");
    });

    async function init() {
        bindEvents();
        await loadSnippets();
    }

    function bindEvents() {
        el.newSnippet.addEventListener("click", () => showEditor());
        el.createFirstSnippet.addEventListener("click", () => showEditor());
        el.saveSnippet.addEventListener("click", onSaveSnippet);
        el.cancelEdit.addEventListener("click", onCancelEdit);
        el.search.addEventListener("input", renderSnippets);
        el.filterLanguage.addEventListener("change", renderSnippets);
        el.insertToPage.addEventListener("click", onInsertFromEditor);
        el.exportSnippets.addEventListener("click", onExportSnippets);
        el.importSnippets.addEventListener("click", () => el.importFile.click());
        el.importFile.addEventListener("change", onImportSnippets);

        [el.snippetTitle, el.snippetCode, el.snippetLanguage].forEach((node) => {
            node.addEventListener("input", () => {
                state.hasChanges = true;
            });
            node.addEventListener("change", () => {
                state.hasChanges = true;
            });
        });
    }

    async function loadSnippets() {
        const result = await storageManager.loadSnippets();

        if (!result.success) {
            state.snippets = [];
            showNotification(`Error loading snippets: ${result.error}`, "error");
        } else {
            state.snippets = normalizeSnippets(result.snippets || []);
            if (result.source === "local") {
                showNotification("Loaded local backup snippets", "info");
            }
        }

        renderSnippets();
        updateLayoutState();
    }

    function normalizeSnippets(snippets) {
        return snippets
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
                id: String(item.id || Date.now().toString()),
                title: String(item.title || "").trim(),
                language: String(item.language || "plaintext").trim(),
                code: String(item.code || ""),
                date: item.date || new Date().toISOString(),
                updatedAt: item.updatedAt || item.date || new Date().toISOString()
            }))
            .filter((item) => item.title && item.code);
    }

    function getFilteredSnippets() {
        const term = el.search.value.trim().toLowerCase();
        const language = el.filterLanguage.value;

        return state.snippets.filter((snippet) => {
            const matchesTerm =
                !term ||
                snippet.title.toLowerCase().includes(term) ||
                snippet.code.toLowerCase().includes(term);
            const matchesLang = !language || snippet.language === language;
            return matchesTerm && matchesLang;
        });
    }

    function renderSnippets() {
        el.snippetsList.textContent = "";
        const list = getFilteredSnippets();

        if (!list.length) {
            const empty = document.createElement("div");
            empty.className = "snippet-item";

            const title = document.createElement("div");
            title.className = "snippet-title";
            title.textContent = state.snippets.length ? "No snippets found for this filter." : "No snippets yet.";

            const date = document.createElement("div");
            date.className = "snippet-date";
            date.textContent = state.snippets.length ? "Try changing search/filter." : "Create your first snippet to begin.";

            empty.append(title, date);
            el.snippetsList.appendChild(empty);
            updateLayoutState();
            return;
        }

        const sorted = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        sorted.forEach((snippet) => {
            el.snippetsList.appendChild(buildSnippetCard(snippet));
        });

        updateLayoutState();
    }

    function buildSnippetCard(snippet) {
        const card = document.createElement("article");
        card.className = "snippet-item";

        const header = document.createElement("div");
        header.className = "snippet-header";

        const titleSection = document.createElement("div");
        titleSection.className = "snippet-title-section";

        const title = document.createElement("div");
        title.className = "snippet-title";
        title.textContent = snippet.title;

        const date = document.createElement("div");
        date.className = "snippet-date";
        date.textContent = formatDate(snippet.updatedAt || snippet.date);

        titleSection.append(title, date);

        const lang = document.createElement("div");
        lang.className = "snippet-language";
        lang.textContent = snippet.language;

        header.append(titleSection, lang);

        const pre = document.createElement("pre");
        pre.className = "snippet-code";
        pre.textContent = snippet.code;

        const actions = document.createElement("div");
        actions.className = "snippet-actions";

        const editBtn = makeButton("Edit", "btn-primary", () => showEditor(snippet));
        const insertBtn = makeButton("Insert", "btn-success", () => insertSnippetToPage(snippet));
        const copyBtn = makeButton("Copy", "btn-warning", () => copyToClipboard(snippet.code));
        const deleteBtn = makeButton("Delete", "btn-danger", () => onDeleteSnippet(snippet.id));

        actions.append(editBtn, insertBtn, copyBtn, deleteBtn);
        card.append(header, pre, actions);
        return card;
    }

    function makeButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    function showEditor(snippet = null) {
        state.hasChanges = false;
        el.editorView.classList.remove("hidden");
        el.snippetsList.classList.add("hidden");
        el.noSnippets.classList.add("hidden");

        if (snippet) {
            el.snippetTitle.value = snippet.title;
            el.snippetLanguage.value = snippet.language || "javascript";
            el.snippetCode.value = snippet.code;
            state.currentEditId = snippet.id;
            el.saveSnippet.textContent = "Update";
        } else {
            el.snippetTitle.value = "";
            el.snippetLanguage.value = "javascript";
            el.snippetCode.value = "";
            state.currentEditId = null;
            el.saveSnippet.textContent = "Save";
        }

        el.snippetTitle.focus();
    }

    async function onSaveSnippet() {
        const title = el.snippetTitle.value.trim();
        const language = el.snippetLanguage.value;
        const code = el.snippetCode.value.trim();

        const validation = storageManager.validateSnippet({ title, language, code });
        if (!validation.valid) {
            showNotification(validation.error, "error");
            return;
        }

        const now = new Date().toISOString();
        if (state.currentEditId) {
            const idx = state.snippets.findIndex((s) => s.id === state.currentEditId);
            if (idx >= 0) {
                state.snippets[idx] = {
                    ...state.snippets[idx],
                    title,
                    language,
                    code,
                    updatedAt: now
                };
            }
        } else {
            state.snippets.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                title,
                language,
                code,
                date: now,
                updatedAt: now
            });
        }

        await persistSnippets(state.currentEditId ? "Snippet updated" : "Snippet saved");
        onCancelEdit(true);
    }

    async function onDeleteSnippet(id) {
        const confirmed = window.confirm("Delete this snippet?");
        if (!confirmed) return;

        state.snippets = state.snippets.filter((s) => s.id !== id);
        await persistSnippets("Snippet deleted");
    }

    async function persistSnippets(successMessage) {
        const saveResult = await storageManager.saveSnippets(state.snippets);
        if (!saveResult.success) {
            showNotification(`Save failed: ${saveResult.error}`, "error");
            return;
        }
        if (saveResult.warning) {
            showNotification(saveResult.warning, "info");
        } else {
            showNotification(successMessage, "success");
        }
        state.hasChanges = false;
        renderSnippets();
    }

    function onCancelEdit(skipConfirm = false) {
        if (!skipConfirm && state.hasChanges) {
            const shouldDiscard = window.confirm("Discard unsaved changes?");
            if (!shouldDiscard) return;
        }

        state.currentEditId = null;
        state.hasChanges = false;
        el.editorView.classList.add("hidden");
        el.snippetsList.classList.remove("hidden");
        updateLayoutState();
    }

    function updateLayoutState() {
        const listIsVisible = el.editorView.classList.contains("hidden");
        if (!listIsVisible) return;

        const hasAny = state.snippets.length > 0;
        if (hasAny) {
            el.noSnippets.classList.add("hidden");
            el.snippetsList.classList.remove("hidden");
        } else {
            el.snippetsList.classList.add("hidden");
            el.noSnippets.classList.remove("hidden");
        }
    }

    async function insertSnippetToPage(snippet) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            showNotification("No active tab found", "error");
            return;
        }

        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: "insertCode",
                code: snippet.code,
                language: snippet.language
            });
            showNotification("Code inserted to page", "success");
            setTimeout(() => window.close(), 700);
        } catch {
            showNotification("Cannot insert on this page", "error");
        }
    }

    function onInsertFromEditor() {
        const code = el.snippetCode.value;
        if (!code.trim()) {
            showNotification("Add code before inserting", "error");
            return;
        }
        insertSnippetToPage({
            code,
            language: el.snippetLanguage.value
        });
    }

    function onExportSnippets() {
        if (!state.snippets.length) {
            showNotification("No snippets to export", "info");
            return;
        }

        const blob = new Blob([JSON.stringify(state.snippets, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `snippets-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification("Snippets exported", "success");
    }

    async function onImportSnippets(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
                showNotification("Invalid import file format", "error");
                return;
            }

            const imported = normalizeSnippets(parsed);
            if (!imported.length) {
                showNotification("No valid snippets found in file", "error");
                return;
            }

            const merged = mergeById(state.snippets, imported);
            state.snippets = merged;
            await persistSnippets(`Imported ${imported.length} snippets`);
        } catch (error) {
            showNotification(`Import failed: ${error.message}`, "error");
        } finally {
            el.importFile.value = "";
        }
    }

    function mergeById(existing, incoming) {
        const map = new Map();
        existing.forEach((item) => map.set(item.id, item));
        incoming.forEach((item) => {
            const id = item.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
            map.set(id, { ...item, id });
        });
        return Array.from(map.values());
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            if (!ok) {
                showNotification("Copy failed", "error");
                return;
            }
        }
        showNotification("Copied to clipboard", "success");
    }

    function showNotification(message, type = "info") {
        el.notification.textContent = message;
        el.notification.className = `notification show ${type}`;
        window.setTimeout(() => {
            el.notification.classList.remove("show");
        }, 2600);
    }

    function formatDate(isoString) {
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return "Unknown date";
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
});

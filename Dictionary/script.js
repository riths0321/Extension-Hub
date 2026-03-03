const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const wordContent = document.getElementById("wordContent");
const loadingState = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("error");
const clearBtn = document.getElementById("clearBtn");
const statusText = document.getElementById("statusText");

let currentController = null;

setView("empty");

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const term = searchInput.value.trim();
    if (!term) {
        setStatus("Type a word first.", true);
        return;
    }

    lookup(term).catch((error) => {
        renderError(term, error.message || "Lookup failed.");
    });
});

clearBtn.addEventListener("click", () => {
    if (currentController) {
        currentController.abort();
        currentController = null;
    }
    searchInput.value = "";
    wordContent.textContent = "";
    setView("empty");
    setStatus("Cleared");
    searchInput.focus();
});

async function lookup(term) {
    if (currentController) {
        currentController.abort();
    }
    currentController = new AbortController();
    const { signal } = currentController;

    setView("loading");
    setStatus("Searching...");

    if (term.includes(" ")) {
        const translation = await fetchTranslation(term, signal);
        renderSentence(term, translation);
        setStatus("Sentence translated.");
        return;
    }

    const [entry, translation] = await Promise.all([
        fetchDictionaryEntry(term, signal),
        fetchTranslation(term, signal).catch(() => "")
    ]);

    renderWord(entry, translation);
    setStatus("Word found.");
}

async function fetchDictionaryEntry(term, signal) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`, {
        signal
    });

    if (!response.ok) {
        throw new Error("Word not found.");
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data[0]) {
        throw new Error("No dictionary entry.");
    }
    return data[0];
}

async function fetchTranslation(term, signal) {
    const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(term)}&langpair=en|hi`,
        { signal }
    );

    if (!response.ok) {
        throw new Error("Translation unavailable.");
    }

    const data = await response.json();
    const translated = data?.responseData?.translatedText || "";
    return translated.toLowerCase() === term.toLowerCase() ? "" : translated;
}

function renderSentence(term, translation) {
    wordContent.textContent = "";

    const header = createElement("div", "word-header");
    header.appendChild(createElement("h2", "", term));
    header.appendChild(createElement("span", "hindi-translation", translation || "No translation available."));

    const group = createElement("div", "meaning-group");
    group.appendChild(createElement("span", "part-of-speech", "Translation"));
    group.appendChild(createElement("p", "", translation || "Translation not available right now."));

    wordContent.append(header, group);
    setView("result");
}

function renderWord(entry, translation) {
    wordContent.textContent = "";

    const word = entry.word || searchInput.value.trim();
    const phonetic = Array.isArray(entry.phonetics)
        ? (entry.phonetics.find((p) => p?.text)?.text || "")
        : "";

    const header = createElement("div", "word-header");
    header.appendChild(createElement("h2", "", word));
    if (phonetic) header.appendChild(createElement("span", "phonetic", phonetic));
    if (translation) header.appendChild(createElement("span", "hindi-translation", translation));
    wordContent.appendChild(header);

    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    if (!meanings.length) {
        const fallback = createElement("div", "meaning-group");
        fallback.appendChild(createElement("span", "part-of-speech", "Definition"));
        fallback.appendChild(createElement("p", "", "No definitions available."));
        wordContent.appendChild(fallback);
    } else {
        meanings.forEach((meaning) => {
            const group = createElement("div", "meaning-group");
            group.appendChild(createElement("span", "part-of-speech", meaning.partOfSpeech || "Meaning"));

            const list = createElement("ul", "definition-list");
            const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];

            defs.slice(0, 6).forEach((def) => {
                const item = createElement("li", "", def.definition || "");
                if (def.example) {
                    item.appendChild(createElement("span", "example", `"${def.example}"`));
                }
                list.appendChild(item);
            });

            if (!defs.length) {
                list.appendChild(createElement("li", "", "No definition entries."));
            }

            group.appendChild(list);
            wordContent.appendChild(group);
        });
    }

    setView("result");
}

function renderError(term, reason) {
    errorState.textContent = "";
    errorState.appendChild(createElement("p", "", `Could not find result for "${term}".`));
    if (reason) {
        errorState.appendChild(createElement("p", "", reason));
    }
    setView("error");
    setStatus("Lookup failed.", true);
}

function setView(view) {
    wordContent.classList.add("displayNone");
    loadingState.classList.add("displayNone");
    emptyState.classList.add("displayNone");
    errorState.classList.add("displayNone");

    if (view === "result") wordContent.classList.remove("displayNone");
    if (view === "loading") loadingState.classList.remove("displayNone");
    if (view === "empty") emptyState.classList.remove("displayNone");
    if (view === "error") errorState.classList.remove("displayNone");
}

function setStatus(message, isError = false) {
    statusText.textContent = message || "";
    statusText.style.color = isError ? "#8f2c3b" : "#5e7362";
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
}

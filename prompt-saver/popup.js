const state = {
  prompts: [],
  editingId: null
};

const el = {
  promptInput: document.getElementById("prompt"),
  categoryInput: document.getElementById("category"),
  searchInput: document.getElementById("search"),
  list: document.getElementById("list"),
  saveBtn: document.getElementById("save"),
  cancelEditBtn: document.getElementById("cancelEdit"),
  clearAllBtn: document.getElementById("clearAll"),
  status: document.getElementById("status"),
  countBadge: document.getElementById("countBadge")
};

init().catch((error) => {
  setStatus(error.message || "Initialization failed", true);
});

async function init() {
  bindEvents();
  const stored = await chrome.storage.local.get({ prompts: [] });
  state.prompts = normalizePrompts(stored.prompts || []);
  render();
}

function bindEvents() {
  el.saveBtn.addEventListener("click", onSaveOrUpdate);
  el.cancelEditBtn.addEventListener("click", cancelEdit);
  el.searchInput.addEventListener("input", render);
  el.clearAllBtn.addEventListener("click", onClearAll);

  el.list.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const prompt = state.prompts.find((p) => p.id === id);
    if (!prompt) return;

    if (action === "copy") copyPrompt(prompt.text);
    if (action === "edit") startEdit(prompt);
    if (action === "delete") deletePrompt(id);
  });
}

function normalizePrompts(prompts) {
  return prompts
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      text: String(item.text || "").trim(),
      cat: String(item.cat || "General").trim() || "General",
      time: Number(item.time || Date.now())
    }))
    .filter((item) => item.text);
}

function getFormData() {
  return {
    text: el.promptInput.value.trim(),
    cat: el.categoryInput.value.trim() || "General"
  };
}

async function onSaveOrUpdate() {
  const { text, cat } = getFormData();
  if (!text) {
    setStatus("Prompt cannot be empty.", true);
    return;
  }

  if (state.editingId) {
    const idx = state.prompts.findIndex((p) => p.id === state.editingId);
    if (idx >= 0) {
      state.prompts[idx] = {
        ...state.prompts[idx],
        text,
        cat,
        time: Date.now()
      };
    }
    await persist("Prompt updated.");
    cancelEdit();
    return;
  }

  state.prompts.unshift({
    id: crypto.randomUUID(),
    text,
    cat,
    time: Date.now()
  });

  await persist("Prompt saved.");
  clearEditor();
}

function startEdit(prompt) {
  state.editingId = prompt.id;
  el.promptInput.value = prompt.text;
  el.categoryInput.value = prompt.cat;
  el.saveBtn.textContent = "Update Prompt";
  el.cancelEditBtn.classList.remove("hidden");
  el.promptInput.focus();
  setStatus("Editing mode enabled.");
}

function cancelEdit() {
  state.editingId = null;
  el.saveBtn.textContent = "Save Prompt";
  el.cancelEditBtn.classList.add("hidden");
  clearEditor();
  setStatus("Edit canceled.");
}

function clearEditor() {
  el.promptInput.value = "";
  el.categoryInput.value = "";
}

async function deletePrompt(id) {
  const ok = window.confirm("Delete this prompt?");
  if (!ok) return;

  state.prompts = state.prompts.filter((p) => p.id !== id);
  if (state.editingId === id) {
    cancelEdit();
  }
  await persist("Prompt deleted.");
}

async function onClearAll() {
  if (!state.prompts.length) {
    setStatus("No prompts to clear.");
    return;
  }
  const ok = window.confirm("Delete all saved prompts?");
  if (!ok) return;

  state.prompts = [];
  cancelEdit();
  await persist("All prompts cleared.");
}

async function persist(message) {
  await chrome.storage.local.set({ prompts: state.prompts });
  render();
  setStatus(message);
}

function getFilteredPrompts() {
  const query = el.searchInput.value.trim().toLowerCase();
  if (!query) return state.prompts;

  return state.prompts.filter(
    (p) => p.text.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query)
  );
}

function render() {
  const visible = getFilteredPrompts();
  el.list.textContent = "";

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = state.prompts.length
      ? "No matching prompts for your search."
      : "No prompts saved yet.";
    el.list.appendChild(empty);
  } else {
    visible.forEach((item) => {
      el.list.appendChild(buildPromptCard(item));
    });
  }

  el.countBadge.textContent = `${state.prompts.length} prompt${state.prompts.length === 1 ? "" : "s"}`;
}

function buildPromptCard(item) {
  const card = document.createElement("article");
  card.className = "item";

  const header = document.createElement("div");
  header.className = "item-header";

  const cat = document.createElement("span");
  cat.className = "cat";
  cat.textContent = item.cat;

  const actions = document.createElement("div");
  actions.className = "actions-inline";
  actions.append(
    inlineBtn("Copy", "copy", item.id),
    inlineBtn("Edit", "edit", item.id),
    inlineBtn("Delete", "delete", item.id)
  );

  header.append(cat, actions);

  const text = document.createElement("div");
  text.className = "prompt-text";
  text.textContent = item.text;

  card.append(header, text);
  return card;
}

function inlineBtn(label, action, id) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-inline";
  btn.textContent = label;
  btn.dataset.action = action;
  btn.dataset.id = id;
  return btn;
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Prompt copied.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    setStatus(ok ? "Prompt copied." : "Copy failed.", !ok);
  }
}

function setStatus(message, isError = false) {
  el.status.textContent = message || "";
  el.status.style.color = isError ? "#9f3238" : "#756b5d";
}

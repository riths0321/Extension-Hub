document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://api.mail.tm";
  const STORAGE_KEY = "tempMailVaultState";

  const statusBadge = document.getElementById("statusBadge");
  const emailAddress = document.getElementById("emailAddress");
  const domainLabel = document.getElementById("domainLabel");
  const messageCount = document.getElementById("messageCount");
  const lastUpdated = document.getElementById("lastUpdated");
  const messageList = document.getElementById("messageList");
  const previewMeta = document.getElementById("previewMeta");
  const previewSubject = document.getElementById("previewSubject");
  const previewBody = document.getElementById("previewBody");
  const otpPanel = document.getElementById("otpPanel");

  const generateBtn = document.getElementById("generateBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const resetBtn = document.getElementById("resetBtn");
  const newInboxBtn = document.getElementById("newInboxBtn");
  const copyAddressBtn = document.getElementById("copyAddressBtn");

  const state = {
    address: "",
    password: "",
    token: "",
    domain: "",
    messages: [],
    selectedMessageId: ""
  };

  const defaultPreview = {
    meta: "No message selected",
    subject: "No message selected",
    body: "Open an email from the inbox feed to read it here."
  };

  chrome.storage.local.get([STORAGE_KEY], async (result) => {
    Object.assign(state, result[STORAGE_KEY] || {});
    renderInboxState();

    if (state.token) {
      await refreshMessages(false);
    }
  });

  generateBtn.addEventListener("click", () => createInbox());
  newInboxBtn.addEventListener("click", () => createInbox(true));
  refreshBtn.addEventListener("click", () => refreshMessages(true));
  resetBtn.addEventListener("click", burnInbox);
  copyAddressBtn.addEventListener("click", copyAddress);

  async function createInbox(forceNew = false) {
    setStatus(forceNew ? "Creating fresh inbox..." : "Generating inbox...");
    clearPreview();

    try {
      const domain = await getPreferredDomain();
      const account = await createAccountWithRetry(domain);

      state.address = account.address;
      state.password = account.password;
      state.token = account.token;
      state.domain = domain;
      state.messages = [];
      state.selectedMessageId = "";
      persistState();
      renderInboxState();
      await refreshMessages(false);
      setStatus("Inbox ready");
    } catch (error) {
      setStatus(error.message || "Could not create inbox");
    }
  }

  async function refreshMessages(showStatus = true) {
    if (!state.token) {
      renderMessages([]);
      if (showStatus) {
        setStatus("Create an inbox first");
      }
      return;
    }

    if (showStatus) {
      setStatus("Refreshing inbox...");
    }

    try {
      const data = await apiFetch("/messages", {
        headers: authHeaders()
      });

      state.messages = data["hydra:member"] || [];
      persistState();
      renderInboxState();
      renderMessages(state.messages);

      if (state.messages.length && !state.selectedMessageId) {
        await openMessage(state.messages[0].id);
      } else if (state.selectedMessageId) {
        const selected = state.messages.find((item) => item.id === state.selectedMessageId);
        if (selected) {
          await openMessage(selected.id);
        } else {
          clearPreview();
        }
      } else {
        clearPreview();
      }

      lastUpdated.textContent = `Synced ${timeStampLabel(new Date())}`;
      if (showStatus) {
        setStatus("Inbox synced");
      }
    } catch (error) {
      renderMessages([]);
      setStatus(error.message || "Refresh failed");
    }
  }

  async function openMessage(messageId) {
    if (!messageId || !state.token) {
      return;
    }

    try {
      const message = await apiFetch(`/messages/${messageId}`, {
        headers: authHeaders()
      });

      state.selectedMessageId = messageId;
      persistState();
      renderMessages(state.messages);
      renderPreview(message);
    } catch (error) {
      setStatus(error.message || "Could not open message");
    }
  }

  function renderInboxState() {
    emailAddress.textContent = state.address || "No inbox created yet";
    domainLabel.textContent = state.domain ? `Domain: ${state.domain}` : "Domain unavailable";
    messageCount.textContent = `${state.messages.length || 0} messages`;
  }

  function renderMessages(messages) {
    messageList.replaceChildren();

    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = state.token
        ? "Inbox is active but no emails have arrived yet."
        : "Create an inbox to start receiving temporary emails.";
      messageList.appendChild(empty);
      return;
    }

    messages.forEach((message) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "message-item";
      item.classList.toggle("is-active", message.id === state.selectedMessageId);

      const from = document.createElement("div");
      from.className = "message-from";
      from.textContent = message.from?.address || "Unknown sender";

      const subject = document.createElement("div");
      subject.className = "message-subject";
      subject.textContent = message.subject || "(No subject)";

      const time = document.createElement("div");
      time.className = "message-time";
      time.textContent = timeStampLabel(message.createdAt || new Date());

      item.appendChild(from);
      item.appendChild(subject);
      item.appendChild(time);
      item.addEventListener("click", () => openMessage(message.id));
      messageList.appendChild(item);
    });
  }

  function renderPreview(message) {
    previewMeta.textContent = `${message.from?.address || "Unknown sender"} • ${timeStampLabel(message.createdAt || new Date())}`;
    previewSubject.textContent = message.subject || "(No subject)";

    const readableBody = extractReadableBody(message);
    previewBody.textContent = readableBody || "No readable message body found.";

    renderOtpChips(`${message.subject || ""}\n${readableBody}`);
  }

  function clearPreview() {
    previewMeta.textContent = defaultPreview.meta;
    previewSubject.textContent = defaultPreview.subject;
    previewBody.textContent = defaultPreview.body;
    otpPanel.replaceChildren();
    otpPanel.classList.add("hidden");
  }

  function renderOtpChips(text) {
    otpPanel.replaceChildren();
    const matches = Array.from(new Set((text.match(/\b\d{4,8}\b/g) || []).slice(0, 5)));

    if (!matches.length) {
      otpPanel.classList.add("hidden");
      return;
    }

    matches.forEach((code) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "otp-chip";
      chip.textContent = `OTP ${code}`;
      chip.addEventListener("click", async () => {
        await navigator.clipboard.writeText(code);
        setStatus(`Copied code ${code}`);
      });
      otpPanel.appendChild(chip);
    });

    otpPanel.classList.remove("hidden");
  }

  async function copyAddress() {
    if (!state.address) {
      setStatus("No address to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(state.address);
      setStatus("Address copied");
    } catch (_error) {
      setStatus("Copy failed");
    }
  }

  function burnInbox() {
    state.address = "";
    state.password = "";
    state.token = "";
    state.domain = "";
    state.messages = [];
    state.selectedMessageId = "";
    persistState();
    renderInboxState();
    renderMessages([]);
    clearPreview();
    lastUpdated.textContent = "Not synced";
    setStatus("Inbox removed");
  }

  function persistState() {
    chrome.storage.local.set({
      [STORAGE_KEY]: {
        address: state.address,
        password: state.password,
        token: state.token,
        domain: state.domain,
        messages: state.messages,
        selectedMessageId: state.selectedMessageId
      }
    });
  }

  async function getPreferredDomain() {
    const data = await apiFetch("/domains");
    const domains = data["hydra:member"] || [];
    if (!domains.length) {
      throw new Error("No domain available");
    }

    return domains[0].domain;
  }

  async function createAccountWithRetry(domain) {
    let lastError = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const address = `${randomLocalPart()}@${domain}`;
      const password = randomPassword();

      try {
        await apiFetch("/accounts", {
          method: "POST",
          body: JSON.stringify({ address, password })
        });

        const tokenData = await apiFetch("/token", {
          method: "POST",
          body: JSON.stringify({ address, password })
        });

        return {
          address,
          password,
          token: tokenData.token
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Could not create inbox");
  }

  function authHeaders() {
    return {
      Authorization: `Bearer ${state.token}`
    };
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data["hydra:description"] || data.message || "Request failed";
      throw new Error(reason);
    }

    return data;
  }

  function extractReadableBody(message) {
    const htmlSource = Array.isArray(message.html) ? message.html[0] : message.html;
    const source = message.text || stripHtml(htmlSource || "") || message.intro || "";
    return source.replace(/\n{3,}/g, "\n\n").trim();
  }

  function stripHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  function setStatus(text) {
    statusBadge.textContent = text;
  }

  function timeStampLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return `${date.toLocaleDateString([], { day: "2-digit", month: "short" })} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  }

  function randomLocalPart() {
    const seed = Math.random().toString(36).slice(2, 10);
    return `vault${seed}`;
  }

  function randomPassword() {
    return `${Math.random().toString(36).slice(2, 12)}A7!`;
  }
});

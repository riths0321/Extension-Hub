const el = {
  profile: document.getElementById("profile"),
  name: document.getElementById("name"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  address: document.getElementById("address"),
  company: document.getElementById("company"),
  website: document.getElementById("website"),
  note: document.getElementById("note"),
  save: document.getElementById("save"),
  fill: document.getElementById("fill"),
  status: document.getElementById("status")
};

const DEFAULT_PROFILES = {
  work: {
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    website: "",
    note: ""
  },
  personal: {
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    website: "",
    note: ""
  }
};

let profiles = { ...DEFAULT_PROFILES };

initialize().catch((error) => {
  setStatus(error.message || "Initialization failed", true);
});

async function initialize() {
  bindEvents();
  await loadProfiles();
  loadProfileToForm();
}

function bindEvents() {
  el.profile.addEventListener("change", loadProfileToForm);
  el.save.addEventListener("click", onSaveProfile);
  el.fill.addEventListener("click", onAnalyzeAndFill);
}

async function loadProfiles() {
  const data = await chrome.storage.sync.get("profiles");
  const saved = data?.profiles;
  if (!saved || typeof saved !== "object") return;

  profiles = {
    work: { ...DEFAULT_PROFILES.work, ...(saved.work || {}) },
    personal: { ...DEFAULT_PROFILES.personal, ...(saved.personal || {}) }
  };
}

function loadProfileToForm() {
  const current = profiles[el.profile.value] || DEFAULT_PROFILES.work;
  el.name.value = current.name || "";
  el.email.value = current.email || "";
  el.phone.value = current.phone || "";
  el.address.value = current.address || "";
  el.company.value = current.company || "";
  el.website.value = current.website || "";
  el.note.value = current.note || "";
}

function getFormProfileData() {
  return {
    name: el.name.value.trim(),
    email: el.email.value.trim(),
    phone: el.phone.value.trim(),
    address: el.address.value.trim(),
    company: el.company.value.trim(),
    website: el.website.value.trim(),
    note: el.note.value.trim()
  };
}

async function onSaveProfile() {
  const key = el.profile.value;
  profiles[key] = getFormProfileData();
  await chrome.storage.sync.set({ profiles });
  setStatus(`${capitalize(key)} profile saved.`);
}

async function onAnalyzeAndFill() {
  const profileData = getFormProfileData();
  const hasAnyValue = Object.values(profileData).some((v) => Boolean(v));
  if (!hasAnyValue) {
    setStatus("Add at least one field value before filling.", true);
    return;
  }

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus("No active tab found.", true);
    return;
  }
  if (!isTabSupported(tab.url)) {
    setStatus("This tab is restricted. Open a regular website.", true);
    return;
  }

  const analysis = await sendToTab(tab.id, { action: "analyzeFillTargets", profile: profileData });
  if (!analysis?.ok) {
    setStatus("Unable to analyze this page.", true);
    return;
  }

  if (!analysis.matchCount) {
    setStatus("No matching fields found on this page.", true);
    return;
  }

  const proceed = window.confirm(`Detected ${analysis.matchCount} matching fields. Fill now?`);
  if (!proceed) return;

  const fillResult = await sendToTab(tab.id, { action: "fill", profile: profileData });
  if (!fillResult?.ok) {
    setStatus("Fill failed on this page.", true);
    return;
  }

  setStatus(`Filled ${fillResult.filledCount} field(s).`);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function isTabSupported(url = "") {
  return !(
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("chrome-extension://")
  );
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

function setStatus(message, isError = false) {
  el.status.textContent = message || "";
  el.status.style.color = isError ? "#a53846" : "#7b6658";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

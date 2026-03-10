const timezones = [
  { name: "India - Kolkata", zone: "Asia/Kolkata" },
  { name: "USA - New York", zone: "America/New_York" },
  { name: "USA - Los Angeles", zone: "America/Los_Angeles" },
  { name: "UK - London", zone: "Europe/London" },
  { name: "France - Paris", zone: "Europe/Paris" },
  { name: "Germany - Berlin", zone: "Europe/Berlin" },
  { name: "Italy - Rome", zone: "Europe/Rome" },
  { name: "Russia - Moscow", zone: "Europe/Moscow" },
  { name: "UAE - Dubai", zone: "Asia/Dubai" },
  { name: "Saudi Arabia - Riyadh", zone: "Asia/Riyadh" },
  { name: "China - Beijing", zone: "Asia/Shanghai" },
  { name: "Japan - Tokyo", zone: "Asia/Tokyo" },
  { name: "South Korea - Seoul", zone: "Asia/Seoul" },
  { name: "Singapore", zone: "Asia/Singapore" },
  { name: "Australia - Sydney", zone: "Australia/Sydney" },
  { name: "New Zealand - Auckland", zone: "Pacific/Auckland" },
  { name: "Brazil - Sao Paulo", zone: "America/Sao_Paulo" },
  { name: "Canada - Toronto", zone: "America/Toronto" },
  { name: "Mexico - Mexico City", zone: "America/Mexico_City" },
  { name: "South Africa - Johannesburg", zone: "Africa/Johannesburg" },
  { name: "Egypt - Cairo", zone: "Africa/Cairo" }
];

const STORAGE_KEYS = {
  clocks: "clocks",
  dark: "dark",
  is24h: "is24h"
};

const DEFAULT_CLOCKS = [
  { name: "India - Kolkata", zone: "Asia/Kolkata" },
  { name: "UK - London", zone: "Europe/London" },
  { name: "USA - New York", zone: "America/New_York" }
];

const list = document.getElementById("clockList");
const select = document.getElementById("countrySelect");
const timezoneSearch = document.getElementById("timezoneSearch");
const themeToggle = document.getElementById("themeToggle");
const formatToggle = document.getElementById("formatToggle");
const addBtn = document.getElementById("addBtn");
const localTime = document.getElementById("localTime");
const localDate = document.getElementById("localDate");
const clockCount = document.getElementById("clockCount");
const formatLabel = document.getElementById("formatLabel");
const statusBadge = document.getElementById("statusBadge");

let clocks = [];
let is24h = false;
let dark = false;
let filteredTimezones = [...timezones];
let dragIndex = -1;

document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  bindEvents();
  populateSelect();
  renderAll();
  window.setInterval(renderAll, 1000);
});

function bindEvents() {
  addBtn.addEventListener("click", addClock);
  themeToggle.addEventListener("click", toggleTheme);
  formatToggle.addEventListener("click", toggleFormat);
  list.addEventListener("click", handleListClick);
  list.addEventListener("dragstart", handleDragStart);
  list.addEventListener("dragover", handleDragOver);
  list.addEventListener("drop", handleDrop);
  list.addEventListener("dragend", clearDragState);
  timezoneSearch.addEventListener("input", handleSearch);
  select.addEventListener("dblclick", addClock);
}

function populateSelect() {
  select.replaceChildren();

  filteredTimezones.forEach((timezone) => {
    const option = document.createElement("option");
    option.value = timezone.zone;
    option.textContent = timezone.name;
    select.appendChild(option);
  });

  if (!filteredTimezones.length) {
    const option = document.createElement("option");
    option.disabled = true;
    option.textContent = "No matching timezone found";
    select.appendChild(option);
    return;
  }

  select.selectedIndex = 0;
}

async function loadState() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.clocks,
    STORAGE_KEYS.dark,
    STORAGE_KEYS.is24h
  ]);

  clocks = Array.isArray(data[STORAGE_KEYS.clocks]) && data[STORAGE_KEYS.clocks].length
    ? data[STORAGE_KEYS.clocks]
    : [...DEFAULT_CLOCKS];
  is24h = Boolean(data[STORAGE_KEYS.is24h]);
  dark = Boolean(data[STORAGE_KEYS.dark]);
  applyTheme();
  updateFormatButton();
  await saveState();
}

function saveState() {
  return chrome.storage.local.set({
    [STORAGE_KEYS.clocks]: clocks,
    [STORAGE_KEYS.dark]: dark,
    [STORAGE_KEYS.is24h]: is24h
  });
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", dark);
  themeToggle.textContent = dark ? "Atlas" : "Night";
}

function updateFormatButton() {
  const label = is24h ? "24h" : "12h";
  formatToggle.textContent = label;
  formatLabel.textContent = label;
}

function renderAll() {
  renderLocalClock();
  renderClockList();
}

function renderLocalClock() {
  const now = new Date();
  localTime.textContent = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !is24h
  }).format(now);

  localDate.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(now);
}

function renderClockList() {
  list.replaceChildren();
  clockCount.textContent = String(clocks.length);

  if (!clocks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No clocks added yet. Select a country and add your first world time card.";
    list.appendChild(empty);
    return;
  }

  const now = new Date();
  clocks.forEach((clock, index) => {
    list.appendChild(createClockCard(clock, index, now));
  });
}

function createClockCard(clock, index, now) {
  const card = document.createElement("article");
  card.className = "clock-card";
  card.draggable = true;
  card.dataset.index = String(index);

  const analogWrap = document.createElement("div");
  analogWrap.className = "analog-wrap";

  const analogCaption = document.createElement("div");
  analogCaption.className = "analog-caption";
  analogCaption.textContent = "Analog";

  const analogClock = document.createElement("div");
  analogClock.className = "analog-clock";

  const centerDot = document.createElement("div");
  centerDot.className = "clock-face-dot";

  const { hourRotation, minuteRotation, secondRotation } = getRotations(clock.zone, now);
  analogClock.appendChild(createHand("hand hand-hour", hourRotation));
  analogClock.appendChild(createHand("hand hand-minute", minuteRotation));
  analogClock.appendChild(createHand("hand hand-second", secondRotation));
  analogClock.appendChild(centerDot);

  analogWrap.appendChild(analogClock);
  analogWrap.appendChild(analogCaption);

  const body = document.createElement("div");
  body.className = "clock-body";

  const name = document.createElement("h3");
  name.className = "clock-name";
  name.textContent = clock.name;

  const time = document.createElement("div");
  time.className = "clock-time";
  time.textContent = formatDigitalTime(clock.zone, now);

  const meta = document.createElement("div");
  meta.className = "clock-meta";
  meta.textContent = formatMeta(clock.zone, now);

  const offset = document.createElement("div");
  offset.className = "clock-offset";
  offset.textContent = getOffsetLabel(clock.zone, now);

  body.appendChild(name);
  body.appendChild(time);
  body.appendChild(meta);
  body.appendChild(offset);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-btn";
  removeBtn.dataset.index = String(index);
  removeBtn.textContent = "Remove";

  card.appendChild(analogWrap);
  card.appendChild(body);
  card.appendChild(removeBtn);
  return card;
}

function createHand(className, degrees) {
  const hand = document.createElement("div");
  hand.className = className;
  hand.style.transform = `rotate(${degrees}deg)`;
  return hand;
}

function addClock() {
  const zone = select.value;
  const selected = timezones.find((timezone) => timezone.zone === zone);

  if (!selected) {
    setStatus("Select a valid destination");
    return;
  }

  if (clocks.some((clock) => clock.zone === zone)) {
    setStatus("Clock already added");
    return;
  }

  clocks.push({ name: selected.name, zone: selected.zone });
  saveState();
  renderClockList();
  setStatus("Clock added");
}

function handleListClick(event) {
  const removeButton = event.target.closest(".remove-btn");
  if (!removeButton) {
    return;
  }

  const index = Number(removeButton.dataset.index);
  if (!Number.isInteger(index)) {
    return;
  }

  clocks.splice(index, 1);
  saveState();
  renderClockList();
  setStatus("Clock removed");
}

function handleSearch() {
  const query = timezoneSearch.value.trim().toLowerCase();
  filteredTimezones = timezones.filter((timezone) => {
    const haystack = `${timezone.name} ${timezone.zone}`.toLowerCase();
    return haystack.includes(query);
  });
  populateSelect();
  setStatus(filteredTimezones.length ? "Timezone list updated" : "No timezone match");
}

function handleDragStart(event) {
  const card = event.target.closest(".clock-card");
  if (!card) {
    return;
  }

  dragIndex = Number(card.dataset.index);
  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.index);
}

function handleDragOver(event) {
  const card = event.target.closest(".clock-card");
  if (!card) {
    return;
  }

  event.preventDefault();
  clearDropTargets();
  if (!card.classList.contains("is-dragging")) {
    card.classList.add("is-drop-target");
  }
}

function handleDrop(event) {
  event.preventDefault();
  const targetCard = event.target.closest(".clock-card");
  if (!targetCard) {
    clearDragState();
    return;
  }

  const targetIndex = Number(targetCard.dataset.index);
  if (!Number.isInteger(dragIndex) || dragIndex < 0 || dragIndex === targetIndex) {
    clearDragState();
    return;
  }

  const moved = clocks.splice(dragIndex, 1)[0];
  clocks.splice(targetIndex, 0, moved);
  dragIndex = -1;
  saveState();
  renderClockList();
  setStatus("Clock order updated");
}

function clearDragState() {
  dragIndex = -1;
  list.querySelectorAll(".clock-card").forEach((card) => {
    card.classList.remove("is-dragging", "is-drop-target");
  });
}

function clearDropTargets() {
  list.querySelectorAll(".clock-card").forEach((card) => {
    card.classList.remove("is-drop-target");
  });
}

function toggleTheme() {
  dark = !dark;
  applyTheme();
  saveState();
  setStatus(dark ? "Night atlas enabled" : "Atlas theme enabled");
}

function toggleFormat() {
  is24h = !is24h;
  updateFormatButton();
  saveState();
  renderAll();
  setStatus(is24h ? "24-hour format active" : "12-hour format active");
}

function formatDigitalTime(zone, now) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !is24h
  }).format(now);
}

function formatMeta(zone, now) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(now);
}

function getRotations(zone, now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  }).formatToParts(now);

  const hours24 = Number(findPart(parts, "hour"));
  const minutes = Number(findPart(parts, "minute"));
  const seconds = Number(findPart(parts, "second"));
  const hours12 = hours24 % 12;

  return {
    hourRotation: hours12 * 30 + minutes * 0.5,
    minuteRotation: minutes * 6 + seconds * 0.1,
    secondRotation: seconds * 6
  };
}

function findPart(parts, type) {
  return parts.find((part) => part.type === type)?.value || "0";
}

function getOffsetLabel(zone, now) {
  const zoneTime = new Date(now.toLocaleString("en-US", { timeZone: zone }));
  const localTimeValue = new Date(now.toLocaleString("en-US"));
  const diffMinutes = Math.round((zoneTime - localTimeValue) / 60000);
  const sign = diffMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function setStatus(message) {
  statusBadge.textContent = message;
}

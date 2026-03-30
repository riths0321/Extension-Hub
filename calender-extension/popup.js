const timezones = [
  // ── Africa ────────────────────────────────────────────────
  { name: "Algeria - Algiers",              zone: "Africa/Algiers" },
  { name: "Angola - Luanda",                zone: "Africa/Luanda" },
  { name: "Benin - Porto-Novo",             zone: "Africa/Porto-Novo" },
  { name: "Botswana - Gaborone",            zone: "Africa/Gaborone" },
  { name: "Burkina Faso - Ouagadougou",     zone: "Africa/Ouagadougou" },
  { name: "Burundi - Bujumbura",            zone: "Africa/Bujumbura" },
  { name: "Cameroon - Douala",              zone: "Africa/Douala" },
  { name: "Cape Verde - Praia",             zone: "Atlantic/Cape_Verde" },
  { name: "Central African Rep. - Bangui",  zone: "Africa/Bangui" },
  { name: "Chad - N'Djamena",              zone: "Africa/Ndjamena" },
  { name: "Comoros - Moroni",               zone: "Indian/Comoro" },
  { name: "Congo - Brazzaville",            zone: "Africa/Brazzaville" },
  { name: "DR Congo - Kinshasa",            zone: "Africa/Kinshasa" },
  { name: "DR Congo - Lubumbashi",          zone: "Africa/Lubumbashi" },
  { name: "Djibouti - Djibouti",           zone: "Africa/Djibouti" },
  { name: "Egypt - Cairo",                  zone: "Africa/Cairo" },
  { name: "Equatorial Guinea - Malabo",     zone: "Africa/Malabo" },
  { name: "Eritrea - Asmara",               zone: "Africa/Asmara" },
  { name: "Eswatini - Mbabane",             zone: "Africa/Mbabane" },
  { name: "Ethiopia - Addis Ababa",         zone: "Africa/Addis_Ababa" },
  { name: "Gabon - Libreville",             zone: "Africa/Libreville" },
  { name: "Gambia - Banjul",                zone: "Africa/Banjul" },
  { name: "Ghana - Accra",                  zone: "Africa/Accra" },
  { name: "Guinea - Conakry",               zone: "Africa/Conakry" },
  { name: "Guinea-Bissau - Bissau",         zone: "Africa/Bissau" },
  { name: "Ivory Coast - Abidjan",          zone: "Africa/Abidjan" },
  { name: "Kenya - Nairobi",                zone: "Africa/Nairobi" },
  { name: "Lesotho - Maseru",               zone: "Africa/Maseru" },
  { name: "Liberia - Monrovia",             zone: "Africa/Monrovia" },
  { name: "Libya - Tripoli",                zone: "Africa/Tripoli" },
  { name: "Madagascar - Antananarivo",      zone: "Indian/Antananarivo" },
  { name: "Malawi - Blantyre",              zone: "Africa/Blantyre" },
  { name: "Mali - Bamako",                  zone: "Africa/Bamako" },
  { name: "Mauritania - Nouakchott",        zone: "Africa/Nouakchott" },
  { name: "Mauritius - Port Louis",         zone: "Indian/Mauritius" },
  { name: "Morocco - Casablanca",           zone: "Africa/Casablanca" },
  { name: "Mozambique - Maputo",            zone: "Africa/Maputo" },
  { name: "Namibia - Windhoek",             zone: "Africa/Windhoek" },
  { name: "Niger - Niamey",                 zone: "Africa/Niamey" },
  { name: "Nigeria - Lagos",                zone: "Africa/Lagos" },
  { name: "Rwanda - Kigali",                zone: "Africa/Kigali" },
  { name: "Sao Tome & Principe",            zone: "Africa/Sao_Tome" },
  { name: "Senegal - Dakar",                zone: "Africa/Dakar" },
  { name: "Seychelles - Victoria",          zone: "Indian/Mahe" },
  { name: "Sierra Leone - Freetown",        zone: "Africa/Freetown" },
  { name: "Somalia - Mogadishu",            zone: "Africa/Mogadishu" },
  { name: "South Africa - Johannesburg",    zone: "Africa/Johannesburg" },
  { name: "South Sudan - Juba",             zone: "Africa/Juba" },
  { name: "Sudan - Khartoum",               zone: "Africa/Khartoum" },
  { name: "Tanzania - Dar es Salaam",       zone: "Africa/Dar_es_Salaam" },
  { name: "Togo - Lome",                    zone: "Africa/Lome" },
  { name: "Tunisia - Tunis",                zone: "Africa/Tunis" },
  { name: "Uganda - Kampala",               zone: "Africa/Kampala" },
  { name: "Zambia - Lusaka",                zone: "Africa/Lusaka" },
  { name: "Zimbabwe - Harare",              zone: "Africa/Harare" },

  // ── Americas ──────────────────────────────────────────────
  { name: "Antigua & Barbuda",              zone: "America/Antigua" },
  { name: "Argentina - Buenos Aires",       zone: "America/Argentina/Buenos_Aires" },
  { name: "Bahamas - Nassau",               zone: "America/Nassau" },
  { name: "Barbados - Bridgetown",          zone: "America/Barbados" },
  { name: "Belize - Belize City",           zone: "America/Belize" },
  { name: "Bolivia - La Paz",               zone: "America/La_Paz" },
  { name: "Brazil - Brasilia",              zone: "America/Sao_Paulo" },
  { name: "Brazil - Manaus",                zone: "America/Manaus" },
  { name: "Brazil - Fortaleza",             zone: "America/Fortaleza" },
  { name: "Canada - Halifax",               zone: "America/Halifax" },
  { name: "Canada - Toronto",               zone: "America/Toronto" },
  { name: "Canada - Winnipeg",              zone: "America/Winnipeg" },
  { name: "Canada - Calgary",               zone: "America/Edmonton" },
  { name: "Canada - Vancouver",             zone: "America/Vancouver" },
  { name: "Chile - Santiago",               zone: "America/Santiago" },
  { name: "Colombia - Bogota",              zone: "America/Bogota" },
  { name: "Costa Rica - San Jose",          zone: "America/Costa_Rica" },
  { name: "Cuba - Havana",                  zone: "America/Havana" },
  { name: "Dominica - Roseau",              zone: "America/Dominica" },
  { name: "Dominican Republic",             zone: "America/Santo_Domingo" },
  { name: "Ecuador - Quito",                zone: "America/Guayaquil" },
  { name: "El Salvador - San Salvador",     zone: "America/El_Salvador" },
  { name: "Grenada - St. George's",         zone: "America/Grenada" },
  { name: "Guatemala - Guatemala City",     zone: "America/Guatemala" },
  { name: "Guyana - Georgetown",            zone: "America/Guyana" },
  { name: "Haiti - Port-au-Prince",         zone: "America/Port-au-Prince" },
  { name: "Honduras - Tegucigalpa",         zone: "America/Tegucigalpa" },
  { name: "Jamaica - Kingston",             zone: "America/Jamaica" },
  { name: "Mexico - Mexico City",           zone: "America/Mexico_City" },
  { name: "Mexico - Cancun",                zone: "America/Cancun" },
  { name: "Nicaragua - Managua",            zone: "America/Managua" },
  { name: "Panama - Panama City",           zone: "America/Panama" },
  { name: "Paraguay - Asuncion",            zone: "America/Asuncion" },
  { name: "Peru - Lima",                    zone: "America/Lima" },
  { name: "Puerto Rico - San Juan",         zone: "America/Puerto_Rico" },
  { name: "St. Kitts & Nevis",              zone: "America/St_Kitts" },
  { name: "St. Lucia - Castries",           zone: "America/St_Lucia" },
  { name: "St. Vincent & Grenadines",       zone: "America/St_Vincent" },
  { name: "Suriname - Paramaribo",          zone: "America/Paramaribo" },
  { name: "Trinidad & Tobago",              zone: "America/Port_of_Spain" },
  { name: "USA - New York",                 zone: "America/New_York" },
  { name: "USA - Chicago",                  zone: "America/Chicago" },
  { name: "USA - Denver",                   zone: "America/Denver" },
  { name: "USA - Los Angeles",              zone: "America/Los_Angeles" },
  { name: "USA - Phoenix",                  zone: "America/Phoenix" },
  { name: "USA - Anchorage",                zone: "America/Anchorage" },
  { name: "USA - Honolulu",                 zone: "Pacific/Honolulu" },
  { name: "Uruguay - Montevideo",           zone: "America/Montevideo" },
  { name: "Venezuela - Caracas",            zone: "America/Caracas" },

  // ── Asia ──────────────────────────────────────────────────
  { name: "Afghanistan - Kabul",            zone: "Asia/Kabul" },
  { name: "Armenia - Yerevan",              zone: "Asia/Yerevan" },
  { name: "Azerbaijan - Baku",              zone: "Asia/Baku" },
  { name: "Bahrain - Manama",               zone: "Asia/Bahrain" },
  { name: "Bangladesh - Dhaka",             zone: "Asia/Dhaka" },
  { name: "Bhutan - Thimphu",               zone: "Asia/Thimphu" },
  { name: "Brunei - Bandar Seri Begawan",   zone: "Asia/Brunei" },
  { name: "Cambodia - Phnom Penh",          zone: "Asia/Phnom_Penh" },
  { name: "China - Beijing",                zone: "Asia/Shanghai" },
  { name: "China - Urumqi",                 zone: "Asia/Urumqi" },
  { name: "Cyprus - Nicosia",               zone: "Asia/Nicosia" },
  { name: "Georgia - Tbilisi",              zone: "Asia/Tbilisi" },
  { name: "India - Kolkata",                zone: "Asia/Kolkata" },
  { name: "Indonesia - Jakarta",            zone: "Asia/Jakarta" },
  { name: "Indonesia - Makassar",           zone: "Asia/Makassar" },
  { name: "Indonesia - Jayapura",           zone: "Asia/Jayapura" },
  { name: "Iran - Tehran",                  zone: "Asia/Tehran" },
  { name: "Iraq - Baghdad",                 zone: "Asia/Baghdad" },
  { name: "Israel - Jerusalem",             zone: "Asia/Jerusalem" },
  { name: "Japan - Tokyo",                  zone: "Asia/Tokyo" },
  { name: "Jordan - Amman",                 zone: "Asia/Amman" },
  { name: "Kazakhstan - Almaty",            zone: "Asia/Almaty" },
  { name: "Kazakhstan - Nur-Sultan",        zone: "Asia/Qyzylorda" },
  { name: "Kuwait - Kuwait City",           zone: "Asia/Kuwait" },
  { name: "Kyrgyzstan - Bishkek",           zone: "Asia/Bishkek" },
  { name: "Laos - Vientiane",               zone: "Asia/Vientiane" },
  { name: "Lebanon - Beirut",               zone: "Asia/Beirut" },
  { name: "Malaysia - Kuala Lumpur",        zone: "Asia/Kuala_Lumpur" },
  { name: "Maldives - Male",                zone: "Indian/Maldives" },
  { name: "Mongolia - Ulaanbaatar",         zone: "Asia/Ulaanbaatar" },
  { name: "Myanmar - Yangon",               zone: "Asia/Rangoon" },
  { name: "Nepal - Kathmandu",              zone: "Asia/Kathmandu" },
  { name: "North Korea - Pyongyang",        zone: "Asia/Pyongyang" },
  { name: "Oman - Muscat",                  zone: "Asia/Muscat" },
  { name: "Pakistan - Karachi",             zone: "Asia/Karachi" },
  { name: "Palestine - Gaza",               zone: "Asia/Gaza" },
  { name: "Philippines - Manila",           zone: "Asia/Manila" },
  { name: "Qatar - Doha",                   zone: "Asia/Qatar" },
  { name: "Saudi Arabia - Riyadh",          zone: "Asia/Riyadh" },
  { name: "Singapore",                      zone: "Asia/Singapore" },
  { name: "South Korea - Seoul",            zone: "Asia/Seoul" },
  { name: "Sri Lanka - Colombo",            zone: "Asia/Colombo" },
  { name: "Syria - Damascus",               zone: "Asia/Damascus" },
  { name: "Taiwan - Taipei",                zone: "Asia/Taipei" },
  { name: "Tajikistan - Dushanbe",          zone: "Asia/Dushanbe" },
  { name: "Thailand - Bangkok",             zone: "Asia/Bangkok" },
  { name: "Timor-Leste - Dili",             zone: "Asia/Dili" },
  { name: "Turkmenistan - Ashgabat",        zone: "Asia/Ashgabat" },
  { name: "UAE - Dubai",                    zone: "Asia/Dubai" },
  { name: "Uzbekistan - Tashkent",          zone: "Asia/Tashkent" },
  { name: "Vietnam - Hanoi",                zone: "Asia/Ho_Chi_Minh" },
  { name: "Yemen - Sanaa",                  zone: "Asia/Aden" },

  // ── Europe ────────────────────────────────────────────────
  { name: "Albania - Tirana",               zone: "Europe/Tirane" },
  { name: "Andorra - Andorra la Vella",     zone: "Europe/Andorra" },
  { name: "Austria - Vienna",               zone: "Europe/Vienna" },
  { name: "Belarus - Minsk",                zone: "Europe/Minsk" },
  { name: "Belgium - Brussels",             zone: "Europe/Brussels" },
  { name: "Bosnia & Herzegovina - Sarajevo",zone: "Europe/Sarajevo" },
  { name: "Bulgaria - Sofia",               zone: "Europe/Sofia" },
  { name: "Croatia - Zagreb",               zone: "Europe/Zagreb" },
  { name: "Czech Republic - Prague",        zone: "Europe/Prague" },
  { name: "Denmark - Copenhagen",           zone: "Europe/Copenhagen" },
  { name: "Estonia - Tallinn",              zone: "Europe/Tallinn" },
  { name: "Finland - Helsinki",             zone: "Europe/Helsinki" },
  { name: "France - Paris",                 zone: "Europe/Paris" },
  { name: "Germany - Berlin",               zone: "Europe/Berlin" },
  { name: "Greece - Athens",                zone: "Europe/Athens" },
  { name: "Hungary - Budapest",             zone: "Europe/Budapest" },
  { name: "Iceland - Reykjavik",            zone: "Atlantic/Reykjavik" },
  { name: "Ireland - Dublin",               zone: "Europe/Dublin" },
  { name: "Italy - Rome",                   zone: "Europe/Rome" },
  { name: "Kosovo - Pristina",              zone: "Europe/Belgrade" },
  { name: "Latvia - Riga",                  zone: "Europe/Riga" },
  { name: "Liechtenstein - Vaduz",          zone: "Europe/Vaduz" },
  { name: "Lithuania - Vilnius",            zone: "Europe/Vilnius" },
  { name: "Luxembourg - Luxembourg",        zone: "Europe/Luxembourg" },
  { name: "Malta - Valletta",               zone: "Europe/Malta" },
  { name: "Moldova - Chisinau",             zone: "Europe/Chisinau" },
  { name: "Monaco - Monaco",                zone: "Europe/Monaco" },
  { name: "Montenegro - Podgorica",         zone: "Europe/Podgorica" },
  { name: "Netherlands - Amsterdam",        zone: "Europe/Amsterdam" },
  { name: "North Macedonia - Skopje",       zone: "Europe/Skopje" },
  { name: "Norway - Oslo",                  zone: "Europe/Oslo" },
  { name: "Poland - Warsaw",                zone: "Europe/Warsaw" },
  { name: "Portugal - Lisbon",              zone: "Europe/Lisbon" },
  { name: "Romania - Bucharest",            zone: "Europe/Bucharest" },
  { name: "Russia - Moscow",                zone: "Europe/Moscow" },
  { name: "Russia - Kaliningrad",           zone: "Europe/Kaliningrad" },
  { name: "Russia - Samara",                zone: "Europe/Samara" },
  { name: "Russia - Yekaterinburg",         zone: "Asia/Yekaterinburg" },
  { name: "Russia - Novosibirsk",           zone: "Asia/Novosibirsk" },
  { name: "Russia - Krasnoyarsk",           zone: "Asia/Krasnoyarsk" },
  { name: "Russia - Irkutsk",               zone: "Asia/Irkutsk" },
  { name: "Russia - Yakutsk",               zone: "Asia/Yakutsk" },
  { name: "Russia - Vladivostok",           zone: "Asia/Vladivostok" },
  { name: "Russia - Magadan",               zone: "Asia/Magadan" },
  { name: "San Marino",                     zone: "Europe/San_Marino" },
  { name: "Serbia - Belgrade",              zone: "Europe/Belgrade" },
  { name: "Slovakia - Bratislava",          zone: "Europe/Bratislava" },
  { name: "Slovenia - Ljubljana",           zone: "Europe/Ljubljana" },
  { name: "Spain - Madrid",                 zone: "Europe/Madrid" },
  { name: "Spain - Canary Islands",         zone: "Atlantic/Canary" },
  { name: "Sweden - Stockholm",             zone: "Europe/Stockholm" },
  { name: "Switzerland - Zurich",           zone: "Europe/Zurich" },
  { name: "Turkey - Istanbul",              zone: "Europe/Istanbul" },
  { name: "UK - London",                    zone: "Europe/London" },
  { name: "Ukraine - Kyiv",                 zone: "Europe/Kiev" },
  { name: "Vatican City",                   zone: "Europe/Vatican" },

  // ── Oceania ───────────────────────────────────────────────
  { name: "Australia - Sydney",             zone: "Australia/Sydney" },
  { name: "Australia - Melbourne",          zone: "Australia/Melbourne" },
  { name: "Australia - Brisbane",           zone: "Australia/Brisbane" },
  { name: "Australia - Adelaide",           zone: "Australia/Adelaide" },
  { name: "Australia - Perth",              zone: "Australia/Perth" },
  { name: "Australia - Darwin",             zone: "Australia/Darwin" },
  { name: "Australia - Hobart",             zone: "Australia/Hobart" },
  { name: "Fiji - Suva",                    zone: "Pacific/Fiji" },
  { name: "Kiribati - Tarawa",              zone: "Pacific/Tarawa" },
  { name: "Marshall Islands - Majuro",      zone: "Pacific/Majuro" },
  { name: "Micronesia - Pohnpei",           zone: "Pacific/Pohnpei" },
  { name: "Nauru - Yaren",                  zone: "Pacific/Nauru" },
  { name: "New Zealand - Auckland",         zone: "Pacific/Auckland" },
  { name: "New Zealand - Chatham Islands",  zone: "Pacific/Chatham" },
  { name: "Palau - Koror",                  zone: "Pacific/Palau" },
  { name: "Papua New Guinea - Port Moresby",zone: "Pacific/Port_Moresby" },
  { name: "Samoa - Apia",                   zone: "Pacific/Apia" },
  { name: "Solomon Islands - Honiara",      zone: "Pacific/Guadalcanal" },
  { name: "Tonga - Nukualofa",              zone: "Pacific/Tongatapu" },
  { name: "Tuvalu - Funafuti",              zone: "Pacific/Funafuti" },
  { name: "Vanuatu - Port Vila",            zone: "Pacific/Efate" },
];

const STORAGE_KEYS = {
  clocks: "clocks",
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
const formatToggle = document.getElementById("formatToggle");
const addBtn = document.getElementById("addBtn");
const localTime = document.getElementById("localTime");
const localDate = document.getElementById("localDate");
const clockCount = document.getElementById("clockCount");
const formatLabel = document.getElementById("formatLabel");
const statusBadge = document.getElementById("statusBadge");

let clocks = [];
let is24h = false;
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
    STORAGE_KEYS.is24h
  ]);

  clocks = Array.isArray(data[STORAGE_KEYS.clocks]) && data[STORAGE_KEYS.clocks].length
    ? data[STORAGE_KEYS.clocks]
    : [...DEFAULT_CLOCKS];
  is24h = Boolean(data[STORAGE_KEYS.is24h]);
  updateFormatButton();
  await saveState();
}

function saveState() {
  return chrome.storage.local.set({
    [STORAGE_KEYS.clocks]: clocks,
    [STORAGE_KEYS.is24h]: is24h
  });
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

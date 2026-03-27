/* ═══════════════════════════════════════════════════════════════
   Dynamic Calendar Pro  –  script.js  v4.0
   NEW in v4: Search · Print · Month Picker · Drag to Reschedule
              Multi-day Spans · 2027/2028 Holidays · State Filter
              Categories · Duplicate Event · Undo Delete
              Toolbar Badge (today's event count)
═══════════════════════════════════════════════════════════════ */
"use strict";

// Safety check for Chrome API
if (typeof chrome === 'undefined') {
    console.log('Chrome API not available - running in standalone mode');
    window.chrome = {
        storage: {
            sync: null,
            local: {
                set: function(data, cb) { if (cb) cb(); },
                get: function(keys, cb) { cb({}); }
            },
            onChanged: {
                addListener: function() {}
            }
        },
        action: {
            setBadgeText: function() {},
            setBadgeBackgroundColor: function() {}
        },
        runtime: {
            lastError: null
        }
    };
}

// ══════════════════════════════════════════════════════════════
// 1.  INDIA HOLIDAY DATABASE
// ══════════════════════════════════════════════════════════════
const HOLIDAYS = (() => {
    const rows = [
        // ── National (fixed every year) ─────────────────────────
        { key:"01-01", name:"New Year's Day",                    type:"national", flag:"🎉" },
        { key:"01-23", name:"Netaji Subhas Chandra Bose Jayanti",type:"national", flag:"🇮🇳" },
        { key:"01-26", name:"Republic Day",                      type:"national", flag:"🇮🇳" },
        { key:"04-14", name:"Dr. Ambedkar Jayanti",              type:"national", flag:"🇮🇳" },
        { key:"08-15", name:"Independence Day",                  type:"national", flag:"🇮🇳" },
        { key:"10-02", name:"Gandhi Jayanti",                    type:"national", flag:"🇮🇳" },
        // ── 2025 ────────────────────────────────────────────────
        { key:"2025-01-14", name:"Makar Sankranti / Pongal",    type:"state",    flag:"🪁" },
        { key:"2025-01-29", name:"Guru Ravidas Jayanti",         type:"state",    flag:"🙏" },
        { key:"2025-02-19", name:"Shivaji Maharaj Jayanti",      type:"state",    flag:"🏛️" },
        { key:"2025-02-26", name:"Maha Shivaratri",              type:"state",    flag:"🕉️" },
        { key:"2025-03-13", name:"Holika Dahan",                 type:"state",    flag:"🔥" },
        { key:"2025-03-14", name:"Holi",                         type:"state",    flag:"🎨" },
        { key:"2025-03-31", name:"Eid ul-Fitr",                  type:"national", flag:"🌙" },
        { key:"2025-04-06", name:"Ram Navami",                   type:"state",    flag:"🙏" },
        { key:"2025-04-10", name:"Mahavir Jayanti",              type:"national", flag:"🕊️" },
        { key:"2025-04-14", name:"Vaisakh / Tamil New Year",     type:"state",    flag:"🌸" },
        { key:"2025-04-18", name:"Good Friday",                  type:"national", flag:"✝️" },
        { key:"2025-05-12", name:"Buddha Purnima",               type:"national", flag:"☸️" },
        { key:"2025-06-07", name:"Eid ul-Adha (Bakrid)",         type:"national", flag:"🌙" },
        { key:"2025-07-06", name:"Muharram",                     type:"national", flag:"🌙" },
        { key:"2025-08-09", name:"Raksha Bandhan",               type:"state",    flag:"🪢" },
        { key:"2025-08-16", name:"Janmashtami",                  type:"state",    flag:"🙏" },
        { key:"2025-09-05", name:"Milad-un-Nabi",                type:"national", flag:"🌙" },
        { key:"2025-09-22", name:"Ganesh Chaturthi",             type:"state",    flag:"🐘" },
        { key:"2025-10-02", name:"Navratri Begins",              type:"state",    flag:"🎺" },
        { key:"2025-10-20", name:"Dussehra",                     type:"national", flag:"🏹" },
        { key:"2025-10-31", name:"Naraka Chaturdashi",           type:"state",    flag:"🪔" },
        { key:"2025-11-01", name:"Diwali",                       type:"national", flag:"🪔" },
        { key:"2025-11-02", name:"Govardhan Puja",               type:"state",    flag:"🙏" },
        { key:"2025-11-03", name:"Bhai Dooj",                    type:"state",    flag:"🤝" },
        { key:"2025-11-05", name:"Chhath Puja",                  type:"state",    flag:"☀️" },
        { key:"2025-11-24", name:"Guru Nanak Jayanti",           type:"national", flag:"🙏" },
        { key:"2025-12-25", name:"Christmas Day",                type:"national", flag:"🎄" },
        // ── 2026 ────────────────────────────────────────────────
        { key:"2026-01-14", name:"Makar Sankranti / Pongal",    type:"state",    flag:"🪁" },
        { key:"2026-02-15", name:"Maha Shivaratri",              type:"state",    flag:"🕉️" },
        { key:"2026-02-19", name:"Shivaji Maharaj Jayanti",      type:"state",    flag:"🏛️" },
        { key:"2026-03-02", name:"Holika Dahan",                 type:"state",    flag:"🔥" },
        { key:"2026-03-03", name:"Holi",                         type:"state",    flag:"🎨" },
        { key:"2026-03-20", name:"Eid ul-Fitr",                  type:"national", flag:"🌙" },
        { key:"2026-03-26", name:"Ram Navami",                   type:"state",    flag:"🙏" },
        { key:"2026-04-02", name:"Good Friday",                  type:"national", flag:"✝️" },
        { key:"2026-04-14", name:"Vaisakh / Tamil New Year",     type:"state",    flag:"🌸" },
        { key:"2026-04-17", name:"Mahavir Jayanti",              type:"national", flag:"🕊️" },
        { key:"2026-05-01", name:"Buddha Purnima",               type:"national", flag:"☸️" },
        { key:"2026-05-27", name:"Eid ul-Adha (Bakrid)",         type:"national", flag:"🌙" },
        { key:"2026-06-16", name:"Muharram",                     type:"national", flag:"🌙" },
        { key:"2026-07-24", name:"Raksha Bandhan",               type:"state",    flag:"🪢" },
        { key:"2026-08-05", name:"Janmashtami",                  type:"state",    flag:"🙏" },
        { key:"2026-09-04", name:"Ganesh Chaturthi",             type:"state",    flag:"🐘" },
        { key:"2026-09-25", name:"Milad-un-Nabi",                type:"national", flag:"🌙" },
        { key:"2026-10-05", name:"Navratri Begins",              type:"state",    flag:"🎺" },
        { key:"2026-10-14", name:"Dussehra",                     type:"national", flag:"🏹" },
        { key:"2026-10-19", name:"Karva Chauth",                 type:"state",    flag:"🌕" },
        { key:"2026-11-07", name:"Naraka Chaturdashi",           type:"state",    flag:"🪔" },
        { key:"2026-11-08", name:"Diwali",                       type:"national", flag:"🪔" },
        { key:"2026-11-09", name:"Govardhan Puja",               type:"state",    flag:"🙏" },
        { key:"2026-11-10", name:"Bhai Dooj",                    type:"state",    flag:"🤝" },
        { key:"2026-11-13", name:"Guru Nanak Jayanti",           type:"national", flag:"🙏" },
        { key:"2026-12-25", name:"Christmas Day",                type:"national", flag:"🎄" },
        // ── 2027 ────────────────────────────────────────────────
        { key:"2027-01-14", name:"Makar Sankranti / Pongal",    type:"state",    flag:"🪁" },
        { key:"2027-02-04", name:"Maha Shivaratri",              type:"state",    flag:"🕉️" },
        { key:"2027-02-19", name:"Shivaji Maharaj Jayanti",      type:"state",    flag:"🏛️" },
        { key:"2027-03-19", name:"Holika Dahan",                 type:"state",    flag:"🔥" },
        { key:"2027-03-20", name:"Holi",                         type:"state",    flag:"🎨" },
        { key:"2027-03-10", name:"Eid ul-Fitr",                  type:"national", flag:"🌙" },
        { key:"2027-04-01", name:"Ram Navami",                   type:"state",    flag:"🙏" },
        { key:"2027-04-07", name:"Mahavir Jayanti",              type:"national", flag:"🕊️" },
        { key:"2027-04-14", name:"Vaisakh / Tamil New Year",     type:"state",    flag:"🌸" },
        { key:"2027-04-26", name:"Buddha Purnima",               type:"national", flag:"☸️" },
        { key:"2027-05-17", name:"Eid ul-Adha (Bakrid)",         type:"national", flag:"🌙" },
        { key:"2027-06-06", name:"Muharram",                     type:"national", flag:"🌙" },
        { key:"2027-08-24", name:"Janmashtami",                  type:"state",    flag:"🙏" },
        { key:"2027-08-28", name:"Raksha Bandhan",               type:"state",    flag:"🪢" },
        { key:"2027-09-15", name:"Ganesh Chaturthi",             type:"state",    flag:"🐘" },
        { key:"2027-09-15", name:"Milad-un-Nabi",                type:"national", flag:"🌙" },
        { key:"2027-09-21", name:"Navratri Begins",              type:"state",    flag:"🎺" },
        { key:"2027-10-01", name:"Dussehra",                     type:"national", flag:"🏹" },
        { key:"2027-10-20", name:"Diwali",                       type:"national", flag:"🪔" },
        { key:"2027-11-03", name:"Guru Nanak Jayanti",           type:"national", flag:"🙏" },
        { key:"2027-12-25", name:"Christmas Day",                type:"national", flag:"🎄" },
        // ── 2028 ────────────────────────────────────────────────
        { key:"2028-01-14", name:"Makar Sankranti / Pongal",    type:"state",    flag:"🪁" },
        { key:"2028-02-23", name:"Maha Shivaratri",              type:"state",    flag:"🕉️" },
        { key:"2028-02-19", name:"Shivaji Maharaj Jayanti",      type:"state",    flag:"🏛️" },
        { key:"2028-02-27", name:"Eid ul-Fitr",                  type:"national", flag:"🌙" },
        { key:"2028-03-07", name:"Holika Dahan",                 type:"state",    flag:"🔥" },
        { key:"2028-03-08", name:"Holi",                         type:"state",    flag:"🎨" },
        { key:"2028-03-21", name:"Ram Navami",                   type:"state",    flag:"🙏" },
        { key:"2028-03-26", name:"Mahavir Jayanti",              type:"national", flag:"🕊️" },
        { key:"2028-04-14", name:"Vaisakh / Tamil New Year",     type:"state",    flag:"🌸" },
        { key:"2028-05-05", name:"Eid ul-Adha (Bakrid)",         type:"national", flag:"🌙" },
        { key:"2028-05-13", name:"Buddha Purnima",               type:"national", flag:"☸️" },
        { key:"2028-05-25", name:"Muharram",                     type:"national", flag:"🌙" },
        { key:"2028-08-01", name:"Janmashtami",                  type:"state",    flag:"🙏" },
        { key:"2028-08-10", name:"Raksha Bandhan",               type:"state",    flag:"🪢" },
        { key:"2028-09-03", name:"Ganesh Chaturthi",             type:"state",    flag:"🐘" },
        { key:"2028-09-21", name:"Navratri Begins",              type:"state",    flag:"🎺" },
        { key:"2028-10-02", name:"Milad-un-Nabi",                type:"national", flag:"🌙" },
        { key:"2028-10-19", name:"Dussehra",                     type:"national", flag:"🏹" },
        { key:"2028-11-04", name:"Naraka Chaturdashi",           type:"state",    flag:"🪔" },
        { key:"2028-11-05", name:"Diwali",                       type:"national", flag:"🪔" },
        { key:"2028-11-21", name:"Guru Nanak Jayanti",           type:"national", flag:"🙏" },
        { key:"2028-12-25", name:"Christmas Day",                type:"national", flag:"🎄" },
    ];

    const map = {};
    rows.forEach(({ key, name, type, flag }) => {
        if (!map[key]) map[key] = [];
        if (!map[key].some(h => h.name === name)) map[key].push({ name, type, flag });
    });

    return {
        get(dateStr, filterMode = "all") {
            const mmdd  = dateStr.slice(5);
            const exact = map[dateStr] || [];
            const recur = map[mmdd]    || [];
            const seen  = new Set(exact.map(h => h.name));
            const all   = [...exact, ...recur.filter(h => !seen.has(h.name))];
            if (filterMode === "national") return all.filter(h => h.type === "national");
            return all;
        },
        isPublicHoliday(dateStr, filterMode = "all") {
            return this.get(dateStr, filterMode).some(h => h.type === "national");
        },
    };
})();

// ══════════════════════════════════════════════════════════════
// 2.  CONSTANTS + CATEGORY CONFIG
// ══════════════════════════════════════════════════════════════
const MONTHS     = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
const MONTHS_SH  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_2     = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const STORAGE_KEY = "calPro_events_v4";
const PREFS_KEY   = "calPro_prefs";

const CATEGORIES = {
    none:     { label:"None",     icon:"📋", color:null },
    work:     { label:"Work",     icon:"🏢", color:"#3B82F6" },
    personal: { label:"Personal", icon:"👤", color:"#8B5CF6" },
    health:   { label:"Health",   icon:"❤️",  color:"#EF4444" },
    family:   { label:"Family",   icon:"👨‍👩‍👧", color:"#F59E0B" },
    birthday: { label:"Birthday", icon:"🎂", color:"#EC4899" },
};

// ══════════════════════════════════════════════════════════════
// 3.  CHROME.STORAGE.SYNC WRAPPER
// ══════════════════════════════════════════════════════════════
const Store = {
    _hasSync() { 
        try {
            return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;
        } catch(e) {
            return false;
        }
    },
    saveEvents(data, cb) {
        if (this._hasSync()) {
            try {
                chrome.storage.sync.set({ [STORAGE_KEY]: data }, () => {
                    if (chrome.runtime && chrome.runtime.lastError)
                        chrome.storage.local.set({ [STORAGE_KEY]: data }, cb);
                    else if (cb) cb();
                });
            } catch(e) {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e){}
                if (cb) cb();
            }
        } else {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e){}
            if (cb) cb();
        }
    },
    loadEvents(cb) {
        if (this._hasSync()) {
            try {
                chrome.storage.sync.get([STORAGE_KEY], r => cb(r[STORAGE_KEY] || []));
            } catch(e) {
                try { cb(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch(e){ cb([]); }
            }
        } else {
            try { cb(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch(e){ cb([]); }
        }
    },
    savePrefs(prefs) {
        try {
            if (this._hasSync()) chrome.storage.sync.set({ [PREFS_KEY]: prefs });
            else try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch(e){}
        } catch(e) {
            console.warn("Prefs save failed:", e);
        }
    },
    loadPrefs(cb) {
        try {
            if (this._hasSync()) chrome.storage.sync.get([PREFS_KEY], r => cb(r[PREFS_KEY] || {}));
            else { try { cb(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); } catch(e){ cb({}); } }
        } catch(e) {
            cb({});
        }
    },
};

// ══════════════════════════════════════════════════════════════
// 4.  STATE
// ══════════════════════════════════════════════════════════════
const today = new Date();
const state = {
    year: today.getFullYear(), month: today.getMonth(),
    view: "month",
    editingId: null, selectedColor: "#6366F1",
    selectedCategory: "none",
    dayPopupDate: null,
    searchQuery: "",
    isSearching: false,
    holidayFilter: "all",       // "all" | "national"
    mpYear: today.getFullYear(),// month-picker navigator year
    draggedId: null,            // drag-to-reschedule
    undoStack: null,            // last deleted event for undo
};
let events = [];
let undoTimer = null;

// ══════════════════════════════════════════════════════════════
// 5.  HELPERS
// ══════════════════════════════════════════════════════════════
const uid  = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const pad  = n  => String(n).padStart(2,"0");
const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayStr  = toDateStr(today);

function clearNode(node) {
    node.replaceChildren();
}

function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
}

function buildEmptyState(iconType, message, highlight = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "agenda-empty";

    let svg;
    if (iconType === "search") {
        svg = createSvgElement("svg", {
            width: "40",
            height: "40",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "1.5"
        });
        svg.append(
            createSvgElement("circle", { cx: "11", cy: "11", r: "8" }),
            createSvgElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
        );
    } else {
        svg = createSvgElement("svg", {
            width: "40",
            height: "40",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "1.5"
        });
        svg.append(
            createSvgElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
            createSvgElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
            createSvgElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
            createSvgElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
        );
    }

    const text = document.createElement("p");
    text.append(message);
    if (highlight) {
        const strong = document.createElement("strong");
        strong.textContent = highlight;
        text.append(strong);
    }

    wrapper.append(svg, text);
    return wrapper;
}

function getCategoryIcon(ev) {
    const cat = ev.category && CATEGORIES[ev.category] ? CATEGORIES[ev.category] : null;
    return cat && cat.icon && ev.category !== "none" ? cat.icon : "";
}

function appendCategoryIcon(target, ev, className = "ev-cat-icon") {
    const icon = getCategoryIcon(ev);
    if (!icon) return;
    const span = document.createElement("span");
    span.className = className;
    span.textContent = icon;
    target.appendChild(span);
}

function getEventDates(ev) {
    const dates = new Set(), base = new Date(ev.date+"T00:00:00");
    const wEnd = new Date(state.year+2,11,31), wStart = new Date(state.year-1,0,1);
    if (!ev.recur || ev.recur==="none") {
        // If event has endDate, add all dates in range
        if (ev.endDate && ev.endDate > ev.date) {
            let cur = new Date(base);
            const end = new Date(ev.endDate+"T00:00:00");
            while (cur <= end) { dates.add(toDateStr(cur)); cur.setDate(cur.getDate()+1); }
        } else { dates.add(ev.date); }
        return dates;
    }
    let cur = new Date(base), limit = 1000;
    while (cur<=wEnd && limit-->0) {
        if (cur>=wStart) dates.add(toDateStr(cur));
        if      (ev.recur==="daily")   cur.setDate(cur.getDate()+1);
        else if (ev.recur==="weekly")  cur.setDate(cur.getDate()+7);
        else if (ev.recur==="monthly") cur.setMonth(cur.getMonth()+1);
        else if (ev.recur==="yearly")  cur.setFullYear(cur.getFullYear()+1);
        else break;
    }
    return dates;
}

function eventsForDate(ds) {
    return events.filter(ev=>getEventDates(ev).has(ds))
        .sort((a,b)=>{ if(a.allDay&&!b.allDay)return -1; if(!a.allDay&&b.allDay)return 1;
            return(a.time||"").localeCompare(b.time||""); });
}

function formatTime(t) {
    if(!t)return""; const[h,m]=t.split(":").map(Number);
    return `${h%12||12}:${pad(m)} ${h>=12?"PM":"AM"}`;
}

function getWeekStart(year,month,day) {
    const d=new Date(year,month,day); d.setDate(d.getDate()-d.getDay()); return d;
}

function isMultiDayStart(ev, ds) {
    return ev.endDate && ev.endDate > ev.date && ev.date === ds;
}
function isMultiDayCont(ev, ds) {
    return ev.endDate && ev.endDate > ev.date && ds > ev.date && ds <= ev.endDate;
}

// ══════════════════════════════════════════════════════════════
// 6.  TOOLBAR BADGE  (today's event count on extension icon)
// ══════════════════════════════════════════════════════════════
function updateBadge() {
    try {
        if (typeof chrome === "undefined" || !chrome.action) return;
        const count = eventsForDate(todayStr).length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
        chrome.action.setBadgeBackgroundColor({ color: "#6366F1" });
    } catch(e) {
        console.warn("Badge update failed:", e);
    }
}

// ══════════════════════════════════════════════════════════════
// 7.  SEARCH
// ══════════════════════════════════════════════════════════════
function renderSearch() {
    const q = state.searchQuery.toLowerCase().trim();
    const container = document.getElementById("search-results");
    if (!container) {
        console.error("Search results container not found");
        return;
    }

    // Show/hide views - only show search view
    document.querySelectorAll(".view").forEach(v => {
        v.classList.remove("active");
    });
    document.getElementById("view-search").classList.add("active");

    if (!q || q.length < 1) { 
        exitSearch(); 
        return; 
    }

    clearNode(container);

    const matches = events.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        (ev.desc  && ev.desc.toLowerCase().includes(q)) ||
        (ev.date  && ev.date.includes(q))
    );

    if (!matches.length) {
        container.appendChild(buildEmptyState("search", 'No events match "', q));
        return;
    }

    const header = document.createElement("div");
    header.className = "search-header";
    header.append(`Found ${matches.length} result${matches.length!==1?"s":""} for "`);
    const strong = document.createElement("strong");
    strong.textContent = q;
    header.append(strong, '"');
    container.appendChild(header);

    matches.sort((a,b)=>a.date.localeCompare(b.date)).forEach(ev => {
        const d = new Date(ev.date+"T00:00:00");
        const tl = ev.allDay ? "All day" : (ev.time ? formatTime(ev.time) : "");
        const cat = CATEGORIES[ev.category] || CATEGORIES.none;
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.dataset.id = ev.id;
        item.style.borderLeftColor = ev.color;

        const left = document.createElement("div");
        left.className = "sri-left";

        const date = document.createElement("div");
        date.className = "sri-date";
        date.textContent = `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SH[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;

        const title = document.createElement("div");
        title.className = "sri-title";
        appendCategoryIcon(title, ev);
        title.append(ev.title);

        left.append(date, title);

        if (ev.desc) {
            const note = document.createElement("div");
            note.className = "sri-note";
            note.textContent = ev.desc;
            left.appendChild(note);
        }

        const right = document.createElement("div");
        right.className = "sri-right";

        const time = document.createElement("span");
        time.className = "sri-time";
        time.textContent = tl;
        right.appendChild(time);

        if (ev.category && ev.category !== "none") {
            const badge = document.createElement("span");
            badge.className = "sri-cat";
            badge.textContent = cat.icon;
            right.appendChild(badge);
        }

        item.append(left, right);
        item.addEventListener("click", () => openEventModal(ev.id));
        container.appendChild(item);
    });
}

function exitSearch() {
    state.isSearching = false;
    state.searchQuery = "";
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    
    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.classList.add("hidden");
    
    // Restore the active view
    document.querySelectorAll(".view").forEach(v => {
        v.classList.remove("active");
    });
    const currentView = document.getElementById(`view-${state.view}`);
    if (currentView) currentView.classList.add("active");
}

// ══════════════════════════════════════════════════════════════
// 9.  MONTH PICKER
// ══════════════════════════════════════════════════════════════
function openMonthPicker() {
    const picker = document.getElementById("month-picker");
    state.mpYear = state.year;
    renderMonthPicker();
    picker.hidden = false;
}

function renderMonthPicker() {
    document.getElementById("mp-year-label").textContent = state.mpYear;
    const grid = document.getElementById("mp-months");
    clearNode(grid);
    MONTHS_SH.forEach((m, i) => {
        const btn = document.createElement("button");
        btn.className = `mp-month-btn${i === state.month && state.mpYear === state.year ? " mp-active" : ""}`;
        btn.dataset.mi = String(i);
        btn.type = "button";
        btn.textContent = m;
        btn.addEventListener("click", () => {
            state.year  = state.mpYear;
            state.month = i;
            closeMonthPicker();
            render();
        });
        grid.appendChild(btn);
    });
}

function closeMonthPicker() {
    document.getElementById("month-picker").hidden = true;
}

// ══════════════════════════════════════════════════════════════
// 10. RENDER: MONTH VIEW  (with drag-to-reschedule + multi-day)
// ══════════════════════════════════════════════════════════════
function renderMonth() {
    const board = document.getElementById("calendar-board");
    document.querySelector(".month-year").textContent = `${MONTHS[state.month]} ${state.year}`;

    const firstDay = new Date(state.year, state.month, 1);
    const lastDay  = new Date(state.year, state.month+1, 0);
    const prevLast = new Date(state.year, state.month, 0).getDate();
    const startDow = firstDay.getDay(), totalDays = lastDay.getDate();
    const filledCells = startDow + totalDays;
    const totalCells  = filledCells <= 35 ? 35 : 42;
    clearNode(board);
    board.classList.toggle("rows-5", totalCells === 35);
    board.classList.toggle("rows-6", totalCells === 42);

    DAYS_2.forEach((d,i) => {
        const header = document.createElement("div");
        header.className = `weekday-header${i===0||i===6?" weekend":""}`;
        header.textContent = d;
        board.appendChild(header);
    });
    for (let x = startDow-1; x >= 0; x--) {
        const prevCell = document.createElement("div");
        prevCell.className = "day-cell prev-date";
        const dayNum = document.createElement("span");
        dayNum.className = "day-num";
        dayNum.textContent = String(prevLast - x);
        prevCell.appendChild(dayNum);
        board.appendChild(prevCell);
    }

    for (let d = 1; d <= totalDays; d++) {
        const ds = `${state.year}-${pad(state.month+1)}-${pad(d)}`;
        const isToday  = ds === todayStr;
        const dow      = new Date(state.year, state.month, d).getDay();
        const isWE     = dow === 0 || dow === 6;
        const dayEvts  = eventsForDate(ds);
        const holidays = HOLIDAYS.get(ds, state.holidayFilter);
        const isPubHol = HOLIDAYS.isPublicHoliday(ds, state.holidayFilter);

        let cls = "day-cell";
        if (isToday)  cls += " today";
        if (isWE)     cls += " weekend";
        if (isPubHol) cls += " pub-holiday";

        const cell = document.createElement("div");
        cell.className = cls;
        cell.dataset.date = ds;
        cell.dataset.d = String(d);

        const dayNum = document.createElement("span");
        dayNum.className = "day-num";
        dayNum.textContent = String(d);
        cell.appendChild(dayNum);

        if (holidays.length) {
            const h = holidays[0];
            const holidayChip = document.createElement("div");
            holidayChip.className = "holiday-chip";
            holidayChip.dataset.type = h.type;
            holidayChip.title = holidays.map(x => x.name).join(", ");
            holidayChip.textContent = `${h.flag} ${h.name}`;
            cell.appendChild(holidayChip);
        }

        if (dayEvts.length) {
            const eventChips = document.createElement("div");
            eventChips.className = "event-chips";

            dayEvts.slice(0,2).forEach(ev => {
                const isStart = isMultiDayStart(ev, ds);
                const isCont  = isMultiDayCont(ev, ds);
                const spanCls = isStart ? " chip-span-start" : isCont ? " chip-span-cont" : "";

                const chip = document.createElement("div");
                chip.className = `chip${spanCls}`;
                chip.draggable = true;
                chip.dataset.color = ev.color;
                chip.dataset.id = ev.id;
                chip.dataset.date = ds;
                chip.title = ev.title;
                chip.style.background = ev.color;

                appendCategoryIcon(chip, ev);

                if (ev.recur && ev.recur !== "none") {
                    const recurIcon = document.createElement("span");
                    recurIcon.className = "recur-icon";
                    recurIcon.textContent = "↻";
                    chip.appendChild(recurIcon);
                }

                if (!ev.allDay && ev.time) {
                    chip.append(`${formatTime(ev.time)} `);
                }

                chip.append(ev.title);
                eventChips.appendChild(chip);
            });

            if (dayEvts.length > 2) {
                const more = document.createElement("div");
                more.className = "chip-more";
                more.textContent = `+${dayEvts.length-2}`;
                eventChips.appendChild(more);
            }

            cell.appendChild(eventChips);
        }

        board.appendChild(cell);
    }

    for (let j = 1; j <= totalCells-filledCells; j++) {
        const nextCell = document.createElement("div");
        nextCell.className = "day-cell next-date";
        const dayNum = document.createElement("span");
        dayNum.className = "day-num";
        dayNum.textContent = String(j);
        nextCell.appendChild(dayNum);
        board.appendChild(nextCell);
    }

    // Click handlers
    board.querySelectorAll(".day-cell:not(.prev-date):not(.next-date)").forEach(cell => {
        cell.addEventListener("click", e => {
            const chip = e.target.closest(".chip");
            if (chip) { e.stopPropagation(); openEventModal(chip.dataset.id); return; }
            showDayPopup(cell.dataset.date, cell);
        });

        // Drag target: cell accepts drops
        cell.addEventListener("dragover", e => {
            if (state.draggedId) { e.preventDefault(); cell.classList.add("drag-over"); }
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
        cell.addEventListener("drop", e => {
            e.preventDefault();
            cell.classList.remove("drag-over");
            if (!state.draggedId) return;
            const ev = events.find(e => e.id === state.draggedId);
            if (ev && cell.dataset.date) {
                ev.date = cell.dataset.date;
                if (ev.endDate) ev.endDate = ""; // clear multi-day on drag
                Store.saveEvents(events, () => render());
                state.draggedId = null;
            }
        });
    });

    // Drag source: chips
    board.querySelectorAll(".chip[data-id]").forEach(chip => {
        chip.addEventListener("dragstart", e => {
            state.draggedId = chip.dataset.id;
            chip.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        });
        chip.addEventListener("dragend", () => {
            chip.classList.remove("dragging");
            state.draggedId = null;
            document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
        });
    });
}

// ══════════════════════════════════════════════════════════════
// 11. RENDER: WEEK VIEW
// ══════════════════════════════════════════════════════════════
function renderWeek() {
    const board = document.getElementById("week-board");
    document.querySelector(".month-year").textContent = `${MONTHS[state.month]} ${state.year}`;
    const ws = getWeekStart(state.year, state.month, 1);
    clearNode(board);
    for (let i = 0; i < 7; i++) {
        const day = new Date(ws); day.setDate(day.getDate()+i);
        const ds = toDateStr(day), isToday = ds === todayStr;
        const dayEvts = eventsForDate(ds), holidays = HOLIDAYS.get(ds, state.holidayFilter);

        const row = document.createElement("div");
        row.className = `week-day-row${isToday?" today":""}`;
        row.dataset.date = ds;

        const label = document.createElement("div");
        label.className = "week-day-label";
        const dayName = document.createElement("span");
        dayName.className = "week-day-name";
        dayName.textContent = DAYS_SHORT[day.getDay()];
        const dayNum = document.createElement("span");
        dayNum.className = "week-day-num";
        dayNum.textContent = String(day.getDate());
        label.append(dayName, dayNum);

        const eventsWrap = document.createElement("div");
        eventsWrap.className = "week-events";

        if (holidays.length) {
            const hol = document.createElement("div");
            hol.className = "week-holiday";
            hol.textContent = holidays.map(h => `${h.flag} ${h.name}`).join(" · ");
            eventsWrap.appendChild(hol);
        }

        if (!dayEvts.length) {
            const noEvents = document.createElement("div");
            noEvents.className = "week-no-events";
            noEvents.textContent = "No events";
            eventsWrap.appendChild(noEvents);
        } else {
            dayEvts.forEach(ev => {
                const item = document.createElement("div");
                item.className = "week-event-item";
                item.dataset.id = ev.id;
                item.style.background = ev.color;

                const time = document.createElement("span");
                time.className = "week-event-time";
                time.textContent = ev.allDay ? "All day" : (ev.time ? formatTime(ev.time) : "");

                const title = document.createElement("span");
                title.className = "week-event-title";
                appendCategoryIcon(title, ev);
                title.append(ev.title);

                item.append(time, title);
                item.addEventListener("click", () => openEventModal(ev.id));
                eventsWrap.appendChild(item);
            });
        }

        row.append(label, eventsWrap);
        row.addEventListener("click", e => {
            if (!e.target.closest(".week-event-item")) openEventModal(null, ds);
        });
        board.appendChild(row);
    }
}

// ══════════════════════════════════════════════════════════════
// 12. RENDER: AGENDA VIEW
// ══════════════════════════════════════════════════════════════
function renderAgenda() {
    const list   = document.getElementById("agenda-list");
    const wStart = new Date(state.year, state.month-1, 1);
    const wEnd   = new Date(state.year, state.month+3, 0);

    const allItems = [];
    events.forEach(ev => {
        getEventDates(ev).forEach(ds => {
            const d = new Date(ds+"T00:00:00");
            if (d >= wStart && d <= wEnd) allItems.push({dateStr:ds, d, kind:"event", payload:ev});
        });
    });
    let cur = new Date(wStart);
    while (cur <= wEnd) {
        const ds = toDateStr(cur);
        HOLIDAYS.get(ds, state.holidayFilter).forEach(h =>
            allItems.push({dateStr:ds, d:new Date(cur), kind:"holiday", payload:h}));
        cur.setDate(cur.getDate()+1);
    }
    allItems.sort((a,b) => a.dateStr.localeCompare(b.dateStr));

    clearNode(list);

    if (!allItems.length) {
        list.appendChild(buildEmptyState("calendar", "No upcoming events or holidays"));
        return;
    }

    const groups = {};
    allItems.forEach(item => {
        const key = `${item.d.getFullYear()}-${pad(item.d.getMonth()+1)}`;
        if (!groups[key]) groups[key] = { label:`${MONTHS[item.d.getMonth()]} ${item.d.getFullYear()}`, items:[] };
        groups[key].items.push(item);
    });

    Object.values(groups).forEach(g => {
        const group = document.createElement("div");
        group.className = "agenda-month-group";

        const label = document.createElement("div");
        label.className = "agenda-month-label";
        label.textContent = g.label;
        group.appendChild(label);

        g.items.forEach(item => {
            const isToday = item.dateStr === todayStr;
            const agendaItem = document.createElement("div");
            agendaItem.className = `agenda-item${item.kind === "holiday" ? " agenda-holiday-item" : ""}${isToday ? " today" : ""}`;

            const dateCol = document.createElement("div");
            dateCol.className = "agenda-date-col";
            const dayName = document.createElement("div");
            dayName.className = "agenda-day-name";
            dayName.textContent = DAYS_SHORT[item.d.getDay()];
            const dayNum = document.createElement("div");
            dayNum.className = "agenda-day-num";
            dayNum.textContent = String(item.d.getDate());
            dateCol.append(dayName, dayNum);

            const detail = document.createElement("div");
            detail.className = "agenda-event-detail";

            if (item.kind === "holiday") {
                const h = item.payload;
                agendaItem.dataset.date = item.dateStr;
                agendaItem.style.borderLeftColor = "#f59e0b";

                const title = document.createElement("div");
                title.className = "agenda-event-title";
                const flag = document.createElement("span");
                flag.className = "agenda-hol-flag";
                flag.textContent = h.flag;
                title.append(flag, h.name);

                const meta = document.createElement("div");
                meta.className = "agenda-event-meta agenda-hol-type";
                meta.textContent = h.type;

                detail.append(title, meta);
            } else {
                const ev  = item.payload;
                const tl  = ev.allDay ? "All day" : (ev.time ? `${formatTime(ev.time)}${ev.endTime?" – "+formatTime(ev.endTime):""}` : "");
                const rb  = ev.recur && ev.recur!=="none" ? ` · ↻ ${ev.recur}` : "";
                const cat = CATEGORIES[ev.category] || CATEGORIES.none;
                agendaItem.dataset.id = ev.id;
                agendaItem.style.borderLeftColor = ev.color;

                const title = document.createElement("div");
                title.className = "agenda-event-title";
                const dot = document.createElement("span");
                dot.className = "agenda-event-dot";
                dot.style.background = ev.color;
                title.append(dot, ev.title);

                const meta = document.createElement("div");
                meta.className = "agenda-event-meta";
                meta.append(`${tl}${rb}`);

                if (ev.category && ev.category !== "none") {
                    const badge = document.createElement("span");
                    badge.className = "agenda-cat-badge";
                    badge.textContent = `${cat.icon} ${cat.label}`;
                    meta.appendChild(badge);
                }

                detail.append(title, meta);

                if (ev.desc) {
                    const note = document.createElement("span");
                    note.className = "agenda-event-note";
                    note.textContent = ev.desc;
                    detail.appendChild(note);
                }

                agendaItem.addEventListener("click", () => openEventModal(ev.id));
            }

            agendaItem.append(dateCol, detail);
            group.appendChild(agendaItem);
        });

        list.appendChild(group);
    });
}

// ══════════════════════════════════════════════════════════════
// 13. MINI STATS + BADGE
// ══════════════════════════════════════════════════════════════
function renderStats() {
    const statsEl = document.getElementById("mini-stats");
    const mStr = `${state.year}-${pad(state.month+1)}`;
    const days = new Date(state.year, state.month+1, 0).getDate();
    const evCount = events.reduce((acc,ev) =>
        acc + ([...getEventDates(ev)].some(d=>d.startsWith(mStr))?1:0), 0);
    let holCount = 0;
    for (let d = 1; d <= days; d++)
        if (HOLIDAYS.get(`${mStr}-${pad(d)}`, state.holidayFilter).length) holCount++;
    const parts = [];
    if (evCount)  parts.push(`${evCount} event${evCount!==1?"s":""}`);
    if (holCount) parts.push(`${holCount} holiday${holCount!==1?"s":""}`);
    statsEl.textContent = parts.length ? parts.join(" · ") : "Nothing this month";
    updateBadge();
}

// ══════════════════════════════════════════════════════════════
// 14. RENDER DISPATCHER
// ══════════════════════════════════════════════════════════════
function render() {
    try {
        if (state.isSearching) { renderSearch(); renderStats(); return; }
        if (state.view==="month")  renderMonth();
        else if (state.view==="week")   renderWeek();
        else if (state.view==="agenda") renderAgenda();
        renderStats();
    } catch(e) {
        console.error("Render error:", e);
        // Try to recover by switching to month view
        state.view = "month";
        try {
            renderMonth();
            renderStats();
        } catch(e2) {
            console.error("Recovery render failed:", e2);
        }
    }
}

// ══════════════════════════════════════════════════════════════
// 15. DAY POPUP
// ══════════════════════════════════════════════════════════════
function showDayPopup(dateStr, anchorEl) {
    state.dayPopupDate = dateStr;
    const popup = document.getElementById("day-popup");
    const d = new Date(dateStr+"T00:00:00");
    document.getElementById("day-popup-title").textContent =
        `${DAYS_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

    const dayEvts  = eventsForDate(dateStr);
    const holidays = HOLIDAYS.get(dateStr, state.holidayFilter);

    const listEl = document.getElementById("day-popup-list");
    clearNode(listEl);

    if (!dayEvts.length && !holidays.length) {
        const empty = document.createElement("div");
        empty.className = "popup-no-events";
        empty.textContent = "No events or holidays";
        listEl.appendChild(empty);
    } else {
        holidays.forEach(h => {
            const holiday = document.createElement("div");
            holiday.className = "popup-holiday-item";

            const flag = document.createElement("span");
            flag.className = "popup-hol-flag";
            flag.textContent = h.flag;

            const name = document.createElement("span");
            name.className = "popup-hol-name";
            name.textContent = h.name;

            holiday.append(flag, name);
            listEl.appendChild(holiday);
        });

        dayEvts.forEach(ev => {
            const item = document.createElement("div");
            item.className = "popup-event-item";
            item.dataset.id = ev.id;
            item.style.background = ev.color;

            const time = document.createElement("span");
            time.className = "popup-event-time";
            time.textContent = ev.allDay ? "All day" : (ev.time ? formatTime(ev.time) : "");

            const title = document.createElement("span");
            title.className = "popup-event-title";
            appendCategoryIcon(title, ev);
            title.append(ev.title);

            item.append(time, title);
            item.addEventListener("click", () => { hideDayPopup(); openEventModal(ev.id); });
            listEl.appendChild(item);
        });
    }

    const rect = anchorEl.getBoundingClientRect(), bodyR = document.body.getBoundingClientRect();
    const pw = 230, ph = 280;
    let left = rect.left - bodyR.left + rect.width/2 - pw/2;
    let top  = rect.bottom - bodyR.top + 4;
    left = Math.max(4, Math.min(left, bodyR.width-pw-4));
    if (top+ph > bodyR.height) top = rect.top - bodyR.top - ph - 4;
    popup.style.left = left+"px"; popup.style.top = top+"px";
    popup.hidden = false;
}
function hideDayPopup() {
    document.getElementById("day-popup").hidden = true;
    state.dayPopupDate = null;
}

// ══════════════════════════════════════════════════════════════
// 16. EVENT MODAL
// ══════════════════════════════════════════════════════════════
function openEventModal(id, prefillDate) {
    hideDayPopup();
    const modal  = document.getElementById("event-modal");
    const titleEl = document.getElementById("modal-title-text");
    const delBtn  = document.getElementById("modal-delete");
    const dupBtn  = document.getElementById("modal-dup");
    const gcalBtn = document.getElementById("modal-gcal");
    resetModal();

    if (id) {
        const ev = events.find(e => e.id === id); if (!ev) return;
        state.editingId = id;
        titleEl.textContent = "Edit Event";
        if (delBtn) delBtn.classList.remove("hidden");
        if (dupBtn) dupBtn.classList.remove("hidden");
        if (gcalBtn) gcalBtn.classList.remove("hidden");
        document.getElementById("event-title").value    = ev.title;
        document.getElementById("event-date").value     = ev.date;
        document.getElementById("event-end-date").value = ev.endDate  || "";
        document.getElementById("event-time").value     = ev.time     || "";
        document.getElementById("event-end-time").value = ev.endTime  || "";
        document.getElementById("event-allday").checked = !!ev.allDay;
        document.getElementById("event-recur").value    = ev.recur    || "none";
        document.getElementById("event-desc").value     = ev.desc     || "";
        toggleTimeRow(!!ev.allDay);
        setSelectedColor(ev.color || "#6366F1");
        setSelectedCategory(ev.category || "none");
    } else {
        state.editingId = null;
        titleEl.textContent = "New Event";
        if (delBtn) delBtn.classList.add("hidden");
        if (dupBtn) dupBtn.classList.add("hidden");
        if (gcalBtn) gcalBtn.classList.remove("hidden");
        const defaultDate =
            prefillDate ||
            state.dayPopupDate ||
            (state.year === today.getFullYear() && state.month === today.getMonth()
                ? toDateStr(today)
                : toDateStr(new Date(state.year, state.month, 1)));
        document.getElementById("event-date").value = defaultDate;
    }
    modal.hidden = false;
    document.getElementById("event-title").focus();
}

function closeEventModal() {
    document.getElementById("event-modal").hidden = true;
    state.editingId = null;
}

function resetModal() {
    ["event-title","event-date","event-end-date","event-time","event-end-time","event-desc"]
        .forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("event-allday").checked = false;
    document.getElementById("event-recur").value    = "none";
    document.getElementById("modal-gcal").classList.add("hidden");
    const dupBtn = document.getElementById("modal-dup");
    if (dupBtn) dupBtn.classList.add("hidden");
    toggleTimeRow(false);
    setSelectedColor("#6366F1");
    setSelectedCategory("none");
}

function toggleTimeRow(allDay) {
    document.getElementById("time-row").classList.toggle("hidden", allDay);
}

function setSelectedColor(color) {
    state.selectedColor = color;
    document.querySelectorAll(".color-swatch").forEach(sw =>
        sw.classList.toggle("active", sw.dataset.color === color));
}

function setSelectedCategory(cat) {
    state.selectedCategory = cat;
    document.querySelectorAll(".cat-btn").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.cat === cat));
}

function buildEventFromForm() {
    const title   = document.getElementById("event-title").value.trim();
    const dateVal = document.getElementById("event-date").value;
    if (!title) {
        const el = document.getElementById("event-title"); el.focus();
        el.classList.add("field-error");
        setTimeout(() => { el.classList.remove("field-error"); }, 1500);
        return null;
    }
    if (!dateVal) {
        document.getElementById("event-date").focus();
        return null;
    }

    const endDateVal = document.getElementById("event-end-date").value || "";
    if (endDateVal && endDateVal < dateVal) {
        const el = document.getElementById("event-end-date");
        el.focus();
        el.classList.add("field-error");
        setTimeout(() => { el.classList.remove("field-error"); }, 1500);
        return null;
    }

    return {
        id:       state.editingId || uid(), title, date: dateVal,
        endDate:  endDateVal,
        time:     document.getElementById("event-time").value      || "",
        endTime:  document.getElementById("event-end-time").value  || "",
        allDay:   document.getElementById("event-allday").checked,
        recur:    document.getElementById("event-recur").value,
        desc:     document.getElementById("event-desc").value.trim(),
        color:    state.selectedColor,
        category: state.selectedCategory,
    };
}

function upsertEvent(ev) {
    if (state.editingId) {
        const idx = events.findIndex(e => e.id === state.editingId);
        if (idx !== -1) {
            events[idx] = ev;
        } else {
            events.push(ev);
        }
    } else {
        events.push(ev);
        state.editingId = ev.id;
    }
}

function saveEvent(afterSave) {
    const ev = buildEventFromForm();
    if (!ev) return;

    upsertEvent(ev);
    Store.saveEvents(events, () => {
        if (typeof afterSave === "function") {
            afterSave(ev);
            return;
        }
        closeEventModal();
        render();
    });
}

// ══════════════════════════════════════════════════════════════
// 17. DELETE WITH UNDO
// ══════════════════════════════════════════════════════════════
function deleteEvent() {
    if (!state.editingId) return;
    const ev = events.find(e => e.id === state.editingId);
    if (!ev) return;

    // Save for undo
    state.undoStack = { ev: { ...ev }, idx: events.findIndex(e => e.id === state.editingId) };
    events = events.filter(e => e.id !== state.editingId);
    Store.saveEvents(events);
    closeEventModal();
    render();
    showUndoToast(`"${ev.title}" deleted`);
}

function showUndoToast(msg) {
    const toast = document.getElementById("undo-toast");
    document.getElementById("undo-toast-msg").textContent = msg;
    toast.hidden = false;
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        toast.hidden = true;
        state.undoStack = null;
    }, 5000);
}

function undoDelete() {
    if (!state.undoStack) return;
    const { ev, idx } = state.undoStack;
    events.splice(idx, 0, ev);
    Store.saveEvents(events);
    state.undoStack = null;
    document.getElementById("undo-toast").hidden = true;
    clearTimeout(undoTimer);
    render();
}

// ══════════════════════════════════════════════════════════════
// 18. DUPLICATE EVENT
// ══════════════════════════════════════════════════════════════
function duplicateEvent() {
    if (!state.editingId) return;
    const orig = events.find(e => e.id === state.editingId);
    if (!orig) return;
    const copy = { ...orig, id: uid(), title: orig.title + " (copy)" };
    events.push(copy);
    Store.saveEvents(events);
    closeEventModal();
    render();
    // Open the copy for immediate editing
    openEventModal(copy.id);
}

// ══════════════════════════════════════════════════════════════
// 18b. ADD TO GOOGLE CALENDAR
// ══════════════════════════════════════════════════════════════
function buildGCalUrl(ev) {
    // Format: YYYYMMDDTHHMMSS or YYYYMMDD for all-day
    function fmtDate(dateStr, timeStr, allDay) {
        const d = dateStr.replace(/-/g, "");
        if (allDay) return d;
        const t = timeStr ? timeStr.replace(/:/g, "") + "00" : "000000";
        return d + "T" + t;
    }

    const start = fmtDate(ev.date, ev.time, ev.allDay);
    let end = start;
    if (ev.endDate) {
        end = fmtDate(ev.endDate, ev.endTime || ev.time, ev.allDay);
    } else if (!ev.allDay && ev.time) {
        // Default: 1 hour duration
        const [h, m] = ev.time.split(":").map(Number);
        const endH = String(h + 1).padStart(2, "0");
        const endM = String(m).padStart(2, "0");
        end = ev.date.replace(/-/g, "") + "T" + endH + endM + "00";
    }

    const dates = ev.allDay ? `${start}/${end}` : `${start}/${end}`;
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: ev.title,
        dates: dates,
        details: ev.desc || "",
        sf: "true",
        output: "xml"
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addToGoogleCalendar() {
    saveEvent(ev => {
        const url = buildGCalUrl(ev);
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url });
        } else {
            window.open(url, "_blank", "noopener,noreferrer");
        }
        closeEventModal();
        render();
    });
}

// ══════════════════════════════════════════════════════════════
// 19. ICS EXPORT
// ══════════════════════════════════════════════════════════════
function exportICS() {
    if (!events.length) {
        const statsEl = document.getElementById("mini-stats");
        if (statsEl) statsEl.textContent = "Add events before exporting";
        return;
    }
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dynamic Calendar Pro//EN","CALSCALE:GREGORIAN"];
    events.forEach(ev => {
        const ds = ev.allDay ? `DTSTART;VALUE=DATE:${ev.date.replace(/-/g,"")}`
            : `DTSTART:${ev.date.replace(/-/g,"")}T${(ev.time||"000000").replace(/:/g,"")}00`;
        const de = ev.endDate
            ? (ev.allDay ? `DTEND;VALUE=DATE:${ev.endDate.replace(/-/g,"")}`
                : `DTEND:${ev.endDate.replace(/-/g,"")}T${(ev.endTime||ev.time||"000000").replace(/:/g,"")}00`)
            : ds.replace("DTSTART","DTEND");
        lines.push("BEGIN:VEVENT", `UID:${ev.id}@dynCalPro`, ds, de,
            `SUMMARY:${ev.title}`, ev.desc?`DESCRIPTION:${ev.desc}`:"", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")], {type:"text/calendar"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="calendar-export.ics"; a.click();
    URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// 20. THEME - REMOVED (Light mode only)
// ══════════════════════════════════════════════════════════════
// Theme toggle removed - always uses light mode
// No need for toggleTheme() or updateThemeIcon() functions

// ══════════════════════════════════════════════════════════════
// 21. NAVIGATION + VIEW
// ══════════════════════════════════════════════════════════════
function prevPeriod() { state.month--; if(state.month<0){ state.month=11; state.year--; } render(); }
function nextPeriod() { state.month++; if(state.month>11){ state.month=0;  state.year++; } render(); }
function goToday()    { state.year=today.getFullYear(); state.month=today.getMonth(); render(); }

function switchView(view) {
    state.view = view; state.isSearching = false;
    document.querySelectorAll(".view-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.view===view);
        t.setAttribute("aria-selected", t.dataset.view===view);
    });
    document.querySelectorAll(".view").forEach(v =>
        v.classList.toggle("active", v.id===`view-${view}`));
    render();
}

// ══════════════════════════════════════════════════════════════
// 22. KEYBOARD
// ══════════════════════════════════════════════════════════════
function handleKeyDown(e) {
    if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
    if (!document.getElementById("event-modal").hidden) return;
    if (!document.getElementById("month-picker").hidden) {
        if (e.key === "Escape") closeMonthPicker();
        return;
    }
    switch(e.key) {
        case "ArrowLeft":  case "ArrowUp":    e.preventDefault(); prevPeriod(); break;
        case "ArrowRight": case "ArrowDown":  e.preventDefault(); nextPeriod(); break;
        case "t": case "T": goToday(); break;
        case "a": case "A": openEventModal(null); break;

        case "f": case "F": document.getElementById("search-input").focus(); break;
        case "1": switchView("month");  break;
        case "2": switchView("week");   break;
        case "3": switchView("agenda"); break;
        case "Escape": hideDayPopup(); break;
    }
}

// ══════════════════════════════════════════════════════════════
// 23. SYNC LISTENER
// ══════════════════════════════════════════════════════════════
function initSyncListener() {
    try {
        if (typeof chrome === "undefined" || !chrome.storage) return;
        chrome.storage.onChanged.addListener((changes, area) => {
            if ((area==="sync"||area==="local") && changes[STORAGE_KEY]) {
                events = changes[STORAGE_KEY].newValue || [];
                render();
            }
        });
    } catch(e) {
        console.warn("Sync listener setup failed:", e);
    }
}

// ══════════════════════════════════════════════════════════════
// 24. INIT SWATCHES + CATEGORY PICKER
// ══════════════════════════════════════════════════════════════
function initColorSwatches() {
    document.querySelectorAll(".color-swatch[data-color]").forEach(el => {
        el.style.backgroundColor = el.dataset.color;
    });
}

// ══════════════════════════════════════════════════════════════
// 25. BIND ALL UI EVENTS
// ══════════════════════════════════════════════════════════════
function bindCalendarEvents() {
    document.querySelector(".prev").addEventListener("click", prevPeriod);
    document.querySelector(".next").addEventListener("click", nextPeriod);
    document.getElementById("btn-today").addEventListener("click", goToday);
    const addBtn = document.getElementById("btn-add-event");
    if (addBtn) {
        addBtn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            openEventModal(null);
        });
    }
    // Theme toggle removed - no longer functional
    


    // Month picker
    const myBtn = document.getElementById("month-year-btn");
    myBtn.addEventListener("click", () => {
        document.getElementById("month-picker").hidden
            ? openMonthPicker() : closeMonthPicker();
    });
    myBtn.addEventListener("keydown", e => { if(e.key==="Enter"||e.key===" ") openMonthPicker(); });
    document.getElementById("mp-prev-year").addEventListener("click", () => {
        state.mpYear--; renderMonthPicker();
    });
    document.getElementById("mp-next-year").addEventListener("click", () => {
        state.mpYear++; renderMonthPicker();
    });
    document.addEventListener("click", e => {
        const picker = document.getElementById("month-picker");
        if (!picker.hidden && !picker.contains(e.target) && e.target.id !== "month-year-btn")
            closeMonthPicker();
    });

    // Search
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    
    if (searchInput && searchClear) {
        searchInput.addEventListener("input", function() {
            state.searchQuery = this.value;
            state.isSearching = !!state.searchQuery.trim();
            searchClear.classList.toggle("hidden", !state.searchQuery);
            
            if (state.isSearching) {
                renderSearch();
            } else {
                exitSearch();
                render();
            }
        });
        
        searchInput.addEventListener("focus", function() {
            if (this.value && !state.isSearching) {
                state.isSearching = true;
                renderSearch();
            }
        });
        
        searchInput.addEventListener("blur", function() {
            // Keep search active if there's a query
            if (!this.value && state.isSearching) {
                setTimeout(() => {
                    exitSearch();
                    render();
                }, 200);
            }
        });
        
        searchClear.addEventListener("click", function() {
            exitSearch();
            render();
            searchInput.focus();
        });
        
        // Handle Escape key to clear search
        searchInput.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                exitSearch();
                render();
            }
        });
    }

    // State filter
    document.getElementById("state-filter").addEventListener("change", e => {
        state.holidayFilter = e.target.value;
        render();
    });

    // View tabs
    document.querySelectorAll(".view-tab").forEach(tab => {
        tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    // Main tabs
    document.querySelectorAll(".main-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const eventModal = document.getElementById("event-modal");
            if (eventModal && !eventModal.hidden) return;

            document.querySelectorAll(".main-tab-btn").forEach(tabBtn => {
                tabBtn.classList.remove("active");
            });
            document.querySelectorAll(".main-panel").forEach(panel => {
                panel.classList.remove("active");
            });

            btn.classList.add("active");
            const targetPanel = document.getElementById(btn.dataset.target);
            if (targetPanel) targetPanel.classList.add("active");
        });
    });

    // Modal
    document.getElementById("modal-close").addEventListener("click", closeEventModal);
    document.getElementById("modal-cancel").addEventListener("click", closeEventModal);
    document.getElementById("modal-save").addEventListener("click", saveEvent);
    document.getElementById("modal-delete").addEventListener("click", deleteEvent);
    document.getElementById("modal-gcal").addEventListener("click", addToGoogleCalendar);
    const dupBtn = document.getElementById("modal-dup");
    if (dupBtn) {
        dupBtn.addEventListener("click", duplicateEvent);
    }
    document.getElementById("event-modal").addEventListener("click", e => {
        if (e.target === document.getElementById("event-modal")) closeEventModal();
    });
    document.getElementById("color-picker").addEventListener("click", e => {
        const sw = e.target.closest(".color-swatch");
        if (sw) {
            e.preventDefault();
            setSelectedColor(sw.dataset.color);
        }
    });
    document.getElementById("category-picker").addEventListener("click", e => {
        const btn = e.target.closest(".cat-btn");
        if (btn) {
            e.preventDefault();
            setSelectedCategory(btn.dataset.cat);
        }
    });
    document.getElementById("event-allday").addEventListener("change", e =>
        toggleTimeRow(e.target.checked));

    // Day popup
    document.getElementById("day-popup-close").addEventListener("click", hideDayPopup);
    document.getElementById("day-popup-add").addEventListener("click", () => {
        const d = state.dayPopupDate; hideDayPopup(); openEventModal(null, d);
    });
    document.addEventListener("click", e => {
        const popup = document.getElementById("day-popup");
        if (!popup.hidden && !popup.contains(e.target) && !e.target.closest(".day-cell"))
            hideDayPopup();
    });

    // Undo toast
    document.getElementById("undo-btn").addEventListener("click", undoDelete);

    // Keyboard
    document.addEventListener("keydown", handleKeyDown);
    document.getElementById("event-modal").addEventListener("keydown", e => {
        if (e.key==="Enter" && e.target.tagName!=="TEXTAREA") saveEvent();
        if (e.key==="Escape") closeEventModal();
    });
}

// ══════════════════════════════════════════════════════════════
// 26. INIT - Always Light Mode
// ══════════════════════════════════════════════════════════════
function init() {
    try {
        Store.loadEvents(loaded => {
            events = loaded || [];
            initColorSwatches();
            bindCalendarEvents();
            initSyncListener();
            render();
            console.log("Dynamic Calendar Pro initialized");
        });
    } catch(e) {
        console.error("Initialization error:", e);
        events = [];
        bindCalendarEvents();
        render();
    }
}

init();

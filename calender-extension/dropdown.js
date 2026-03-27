(function () {
    "use strict";

    const WRAP = "ca-dropdown";
    const MENU = "ca-menu";
    const ITEM = "ca-item";
    const OPEN = "ca-open";
    const ACT = "ca-active";
    const VISIBLE = "ca-vis";

    function createSvgElement(tag, attrs = {}) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
        return el;
    }

    function createCaret() {
        const span = document.createElement("span");
        span.className = "ca-caret";

        const svg = createSvgElement("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        });
        svg.appendChild(createSvgElement("polyline", { points: "6 9 12 15 18 9" }));
        span.appendChild(svg);
        return span;
    }

    function createSearchIcon() {
        const span = document.createElement("span");
        span.className = "ca-si";

        const svg = createSvgElement("svg", {
            width: "13",
            height: "13",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        });
        svg.append(
            createSvgElement("circle", { cx: "11", cy: "11", r: "8" }),
            createSvgElement("path", { d: "m21 21-4.35-4.35" })
        );
        span.appendChild(svg);
        return span;
    }

    function createCheckIcon() {
        const span = document.createElement("span");
        span.className = "ca-chk";

        const svg = createSvgElement("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        });
        svg.appendChild(createSvgElement("polyline", { points: "20 6 9 17 4 12" }));
        span.appendChild(svg);
        return span;
    }

    function positionMenu(trigger, menu) {
        const rect = trigger.getBoundingClientRect();
        const vp = window.innerHeight || document.documentElement.clientHeight;
        const estimatedHeight = Math.min(menu.scrollHeight || 242, 242);

        menu.style.width = rect.width + "px";
        menu.style.left = rect.left + "px";

        if (rect.bottom + estimatedHeight + 8 <= vp) {
            menu.style.top = rect.bottom + 6 + "px";
            menu.style.bottom = "auto";
            menu.classList.remove("ca-up");
        } else {
            menu.style.bottom = vp - rect.top + 6 + "px";
            menu.style.top = "auto";
            menu.classList.add("ca-up");
        }
    }

    function selectedText(select) {
        const option = select.options[select.selectedIndex];
        return option ? option.text : "";
    }

    function closeAllExcept(currentMenu) {
        document.querySelectorAll("." + MENU + "." + VISIBLE).forEach(menu => {
            if (menu !== currentMenu) {
                menu.classList.remove(VISIBLE);
                if (menu._ownerWrap) {
                    menu._ownerWrap.classList.remove(OPEN);
                    const trigger = menu._ownerWrap.querySelector(".ca-trigger");
                    if (trigger) trigger.setAttribute("aria-expanded", "false");
                }
            }
        });
    }

    function buildDropdown(select) {
        if (!select || select._caBuilt) return null;
        select._caBuilt = true;

        const useSearch = select.options.length >= 8;
        const wrap = document.createElement("div");
        wrap.className = WRAP;

        if (select.classList.contains("state-select")) {
            wrap.classList.add("ca-compact");
        }
        if (select.size && select.size > 1) {
            wrap.classList.add("ca-listbox");
        }

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "ca-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");

        const triggerText = document.createElement("span");
        triggerText.className = "ca-trigger-text";
        triggerText.textContent = selectedText(select);

        trigger.append(triggerText, createCaret());

        const menu = document.createElement("div");
        menu.className = MENU;
        menu.setAttribute("role", "listbox");
        menu._ownerWrap = wrap;
        document.body.appendChild(menu);

        let searchInput = null;
        if (useSearch) {
            const searchWrap = document.createElement("div");
            searchWrap.className = "ca-sw";
            searchInput = document.createElement("input");
            searchInput.type = "text";
            searchInput.className = "ca-search";
            searchInput.placeholder = "Search...";
            searchInput.autocomplete = "off";
            searchInput.spellcheck = false;
            searchWrap.append(createSearchIcon(), searchInput);
            menu.appendChild(searchWrap);
        }

        const listWrap = document.createElement("div");
        listWrap.className = "ca-list";
        menu.appendChild(listWrap);

        let isOpen = false;

        function closeMenu() {
            isOpen = false;
            menu.classList.remove(VISIBLE);
            wrap.classList.remove(OPEN);
            trigger.setAttribute("aria-expanded", "false");
        }

        function openMenu() {
            closeAllExcept(menu);
            isOpen = true;
            positionMenu(trigger, menu);
            menu.classList.add(VISIBLE);
            wrap.classList.add(OPEN);
            trigger.setAttribute("aria-expanded", "true");

            const active = listWrap.querySelector("." + ITEM + "." + ACT);
            if (active) {
                setTimeout(() => active.scrollIntoView({ block: "nearest" }), 20);
            }

            if (searchInput) {
                searchInput.value = "";
                populate("");
                setTimeout(() => searchInput.focus(), 30);
            }
        }

        function populate(filter) {
            listWrap.replaceChildren();
            const query = (filter || "").toLowerCase().trim();
            let count = 0;

            Array.from(select.options).forEach(option => {
                if (query && !option.text.toLowerCase().includes(query)) return;

                const button = document.createElement("button");
                button.type = "button";
                button.className = ITEM;
                button.dataset.val = option.value;
                button.setAttribute("role", "option");

                const label = document.createElement("span");
                label.className = "ca-lbl";
                label.textContent = option.text;

                const check = createCheckIcon();

                if (option.value === select.value) {
                    button.classList.add(ACT);
                }

                button.append(label, check);
                button.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    select.value = option.value;
                    triggerText.textContent = option.text;
                    listWrap.querySelectorAll("." + ITEM).forEach(item => item.classList.remove(ACT));
                    button.classList.add(ACT);
                    closeMenu();
                    select.dispatchEvent(new Event("change", { bubbles: true }));
                });

                listWrap.appendChild(button);
                count++;
            });

            if (count === 0) {
                const empty = document.createElement("div");
                empty.className = "ca-empty";
                empty.textContent = "No results";
                listWrap.appendChild(empty);
            }
        }

        populate("");

        if (searchInput) {
            searchInput.addEventListener("input", () => populate(searchInput.value));
            searchInput.addEventListener("click", e => e.stopPropagation());
        }

        trigger.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            isOpen ? closeMenu() : openMenu();
        });

        document.addEventListener("click", e => {
            if (isOpen && !wrap.contains(e.target) && !menu.contains(e.target)) {
                closeMenu();
            }
        });

        trigger.addEventListener("keydown", e => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isOpen) openMenu();
            } else if (e.key === "Escape") {
                closeMenu();
            }
        });

        window.addEventListener("scroll", () => {
            if (isOpen) positionMenu(trigger, menu);
        }, { passive: true });

        window.addEventListener("resize", () => {
            if (isOpen) positionMenu(trigger, menu);
        }, { passive: true });

        const observer = new MutationObserver(() => {
            populate(searchInput ? searchInput.value : "");
            triggerText.textContent = selectedText(select);
        });
        observer.observe(select, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["value"]
        });

        wrap._sync = function () {
            triggerText.textContent = selectedText(select);
            populate("");
        };

        wrap.appendChild(trigger);
        select.classList.add("ca-native");
        select.setAttribute("tabindex", "-1");
        select.setAttribute("aria-hidden", "true");
        select.parentNode.insertBefore(wrap, select.nextSibling);

        return wrap;
    }

    function init() {
        document.querySelectorAll("select").forEach(select => buildDropdown(select));
    }

    window.CADropdowns = {
        init,
        build: buildDropdown,
        sync(id) {
            const select = document.getElementById(id);
            if (!select) return;
            const wrap = select.nextElementSibling;
            if (wrap && typeof wrap._sync === "function") {
                wrap._sync();
            }
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

document.addEventListener('DOMContentLoaded', function() {

    // DOM Elements
    const linksContainer = document.querySelector('.links-container');
    const emptyState = document.getElementById('emptyState');
    const addCurrentBtn = document.getElementById('addCurrent');
    const openAllBtn = document.getElementById('openAll');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const categoryTags = document.querySelectorAll('.category-tag');
    const totalLinksSpan = document.getElementById('totalLinks');
    const totalCategoriesSpan = document.getElementById('totalCategories');

    let allLinks = [];
    let currentFilter = 'all';
    let currentSearch = '';

    /* ---------------- INIT ---------------- */
    loadLinks();

    function loadLinks() {
        chrome.storage.sync.get(['quickLinks'], function(result) {
            allLinks = result.quickLinks || [];
            updateUI();
        });
    }

    function saveLinks() {
        chrome.storage.sync.set({ quickLinks: allLinks });
        updateUI();
    }

    /* ---------------- UI UPDATE ---------------- */
    function updateUI() {

        let filteredLinks = allLinks;

        if (currentFilter !== 'all') {
            filteredLinks = filteredLinks.filter(link => link.category === currentFilter);
        }

        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            filteredLinks = filteredLinks.filter(link =>
                link.title.toLowerCase().includes(searchLower) ||
                link.url.toLowerCase().includes(searchLower)
            );
        }

        totalLinksSpan.textContent = allLinks.length;
        const uniqueCategories = [...new Set(allLinks.map(link => link.category))];
        totalCategoriesSpan.textContent = uniqueCategories.length;

        // clear container safely
        while (linksContainer.firstChild) {
            linksContainer.removeChild(linksContainer.firstChild);
        }

        if (filteredLinks.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            filteredLinks.forEach((link, index) => {
                linksContainer.appendChild(createLinkElement(link, index));
            });
        }
    }

    /* ---------------- CREATE LINK ELEMENT (CSP SAFE) ---------------- */
    function createLinkElement(link, index) {

        const div = document.createElement('div');
        div.className = 'link-item';
        div.dataset.index = index;

        const domain = getDomainFromUrl(link.url);
        const iconText = getIconForDomain(domain);

        const icon = document.createElement('div');
        icon.className = 'link-icon';
        icon.textContent = iconText;

        const content = document.createElement('div');
        content.className = 'link-content';

        const title = document.createElement('div');
        title.className = 'link-title';
        title.textContent = link.title;

        const url = document.createElement('div');
        url.className = 'link-url';
        url.textContent = domain;

        content.appendChild(title);
        content.appendChild(url);

        const actions = document.createElement('div');
        actions.className = 'link-actions';

        const openBtn = document.createElement('button');
        openBtn.className = 'action-btn open-btn';
        openBtn.title = 'Open Link';
        openBtn.textContent = '↗';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.title = 'Delete Link';
        deleteBtn.textContent = '🗑';

        actions.appendChild(openBtn);
        actions.appendChild(deleteBtn);

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.link-actions')) {
                chrome.tabs.create({ url: link.url, active: false });
            }
        });

        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: link.url, active: true });
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            allLinks.splice(index, 1);
            saveLinks();
        });

        div.appendChild(icon);
        div.appendChild(content);
        div.appendChild(actions);

        return div;
    }

    /* ---------------- ADD CURRENT PAGE ---------------- */
    addCurrentBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {

            const currentTab = tabs[0];
            if (!currentTab || !currentTab.url) return;

            let category = 'general';
            const url = currentTab.url.toLowerCase();

            if (url.includes('mail') || url.includes('docs') || url.includes('calendar') || url.includes('slack')) category = 'work';
            else if (url.includes('facebook') || url.includes('instagram') || url.includes('twitter') || url.includes('linkedin')) category = 'social';
            else if (url.includes('amazon') || url.includes('flipkart') || url.includes('myntra')) category = 'shopping';
            else if (url.includes('youtube') || url.includes('netflix') || url.includes('spotify')) category = 'entertainment';

            const newLink = {
                title: currentTab.title,
                url: currentTab.url,
                category: category,
                dateAdded: new Date().toISOString()
            };

            allLinks.push(newLink);
            saveLinks();

            addCurrentBtn.textContent = "Added!";
            setTimeout(() => addCurrentBtn.textContent = "Add Current Page", 1000);
        });
    });

    /* ---------------- OPEN ALL ---------------- */
    openAllBtn.addEventListener('click', function() {

        const linksToOpen = currentFilter === 'all'
            ? allLinks
            : allLinks.filter(link => link.category === currentFilter);

        linksToOpen.forEach(link => {
            chrome.tabs.create({ url: link.url, active: false });
        });

        openAllBtn.textContent = `Opened ${linksToOpen.length} links`;
        setTimeout(() => openAllBtn.textContent = "Open All", 2000);
    });

    /* ---------------- SEARCH ---------------- */
    searchInput.addEventListener('input', e => {
        currentSearch = e.target.value;
        updateUI();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        updateUI();
    });

    /* ---------------- CATEGORY FILTER ---------------- */
    categoryTags.forEach(tag => {
        tag.addEventListener('click', function() {
            categoryTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.category;
            updateUI();
        });
    });

    /* ---------------- HELPERS ---------------- */
    function getDomainFromUrl(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    function getIconForDomain(domain) {
        const iconMap = {
            'gmail.com': '📧',
            'google.com': '🔍',
            'calendar.google.com': '📅',
            'youtube.com': '🎬',
            'instagram.com': '📷',
            'facebook.com': '👥',
            'twitter.com': '🐦',
            'linkedin.com': '💼',
            'amazon.in': '🛒',
            'flipkart.com': '📦',
            'myntra.com': '👕',
            'netflix.com': '🎥',
            'spotify.com': '🎵',
            'github.com': '💻',
            'notion.so': '📝',
            'slack.com': '💬',
            'whatsapp.com': '💚'
        };
        return iconMap[domain] || '🔗';
    }

});

/* ══════════════════════════════════════════
   Todo Tab — script.js
   CSP-safe: no eval, no inline handlers
   ══════════════════════════════════════════ */

class TodoApp {
    constructor() {
        this.todos         = [];
        this.selectedColor = '#4ade80';
        this.selectedLabel = 'Work';
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.render();
        this.initCatActive();
    }

    // ── Bind all events ──────────────────────────
    bindEvents() {
        // Add task
        document.getElementById('add-btn').addEventListener('click', () => this.addTodo());
        document.getElementById('todo-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Category buttons
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                this.selectCategory(b.dataset.color, b.dataset.label);
            });
        });

        // Filter pills
        document.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });

        // Action buttons
        document.getElementById('clear-completed').addEventListener('click', () => this.clearCompleted());
        document.getElementById('export-btn').addEventListener('click', () => this.exportTodos());
        document.getElementById('import-btn').addEventListener('click', () => this.showImportModal());

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Modal
        document.getElementById('close-modal').addEventListener('click', () => this.hideImportModal());
        document.getElementById('cancel-import').addEventListener('click', () => this.hideImportModal());
        document.getElementById('confirm-import').addEventListener('click', () => this.importTodos());

        // Close modal on backdrop click
        document.getElementById('import-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideImportModal();
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideImportModal();
        });
    }

    // ── Category / Color selection ────────────────
    selectCategory(color, label) {
        this.selectedColor = color;
        this.selectedLabel = label;

        document.getElementById('selected-label').textContent = label;

        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
    }

    initCatActive() {
        // Set first cat button as active visually
        const first = document.querySelector('.cat-btn[data-color="' + this.selectedColor + '"]');
        if (first) first.classList.add('active');
    }

    // ── Add Todo ──────────────────────────────────
    addTodo() {
        const input = document.getElementById('todo-input');
        const text  = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }

        const todo = {
            id:          Date.now().toString(),
            text,
            color:       this.selectedColor,
            label:       this.selectedLabel,
            completed:   false,
            createdAt:   new Date().toISOString(),
            completedAt: null
        };

        this.todos.unshift(todo);
        input.value = '';
        input.focus();

        this.saveData();
        this.render();
    }

    // ── Toggle / Delete ───────────────────────────
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        todo.completed   = !todo.completed;
        todo.completedAt = todo.completed ? new Date().toISOString() : null;
        this.saveData();
        this.render();
    }

    deleteTodo(id) {
        const idx = this.todos.findIndex(t => t.id === id);
        if (idx === -1) return;

        // Animate out
        const el = document.querySelector('[data-todo-id="' + id + '"]');
        if (el) {
            el.style.transition = 'all 0.2s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateX(12px) scale(0.97)';
            setTimeout(() => {
                this.todos.splice(idx, 1);
                this.saveData();
                this.render();
            }, 200);
        } else {
            this.todos.splice(idx, 1);
            this.saveData();
            this.render();
        }
    }

    clearCompleted() {
        const count = this.todos.filter(t => t.completed).length;
        if (count === 0) { this.showToast('No completed tasks to clear'); return; }
        this.todos = this.todos.filter(t => !t.completed);
        this.saveData();
        this.render();
        this.showToast(count + ' task' + (count > 1 ? 's' : '') + ' cleared');
    }

    // ── Filter ────────────────────────────────────
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }

    filteredTodos() {
        const today = new Date().toDateString();
        switch (this.currentFilter) {
            case 'pending':   return this.todos.filter(t => !t.completed);
            case 'completed': return this.todos.filter(t =>  t.completed);
            case 'today':     return this.todos.filter(t => new Date(t.createdAt).toDateString() === today);
            default:          return [...this.todos];
        }
    }

    // ── Stats ─────────────────────────────────────
    updateStats() {
        const today = new Date().toDateString();
        document.getElementById('total-count').textContent   = this.todos.length;
        document.getElementById('pending-count').textContent = this.todos.filter(t => !t.completed).length;
        document.getElementById('today-count').textContent   = this.todos.filter(t => new Date(t.createdAt).toDateString() === today).length;
        document.getElementById('done-count').textContent    = this.todos.filter(t =>  t.completed).length;
    }

    // ── Render ────────────────────────────────────
    render() {
        this.updateStats();
        const list   = document.getElementById('todo-list');
        const todos  = this.filteredTodos();

        if (todos.length === 0) {
            const msgs = {
                all:       ['No tasks yet',         'Add your first task above to get started'],
                pending:   ['All caught up! 🎉',    'No pending tasks remain'],
                completed: ['Nothing completed yet', 'Check off some tasks to see them here'],
                today:     ['No tasks today',        'Add a task for today above'],
            };
            const [title, hint] = msgs[this.currentFilter] || msgs.all;
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-orb">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </div>
                    <p class="empty-title">${title}</p>
                    <p class="empty-hint">${hint}</p>
                </div>
            `;
            return;
        }

        list.innerHTML = todos.map(todo => {
            const tagStyle   = `background:${todo.color}20; color:${todo.color}; border:1px solid ${todo.color}40`;
            const borderColor = todo.color;
            const dateStr    = this.formatDate(todo.createdAt);
            const doneExtra  = todo.completed ? ' completed-item' : '';
            const textClass  = todo.completed ? ' striked' : '';

            return `
                <div class="todo-item${doneExtra}"
                     data-todo-id="${todo.id}"
                     style="border-left-color:${borderColor}; --item-color:${borderColor}">
                    <div class="todo-check-wrap">
                        <input type="checkbox"
                               class="todo-checkbox"
                               data-id="${todo.id}"
                               ${todo.completed ? 'checked' : ''}>
                    </div>
                    <div class="todo-body">
                        <div class="todo-text${textClass}">${this.escapeHtml(todo.text)}</div>
                        <div class="todo-meta">
                            <span class="todo-tag" style="${tagStyle}">${this.escapeHtml(todo.label)}</span>
                            <span class="todo-date">${dateStr}</span>
                        </div>
                    </div>
                    <button class="todo-del" data-id="${todo.id}" title="Delete task">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            `;
        }).join('');

        // Bind events to dynamically created items
        list.querySelectorAll('.todo-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => this.toggleTodo(e.target.dataset.id));
        });

        list.querySelectorAll('.todo-del').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteTodo(e.currentTarget.dataset.id));
        });
    }

    // ── Export / Import ───────────────────────────
    exportTodos() {
        const payload = { todos: this.todos, exportedAt: new Date().toISOString(), app: 'Todo Tab' };
        const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        a.href        = url;
        a.download    = 'todo-tab-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        this.showToast('Tasks exported successfully');
    }

    showImportModal() {
        document.getElementById('import-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('import-data').focus(), 100);
    }

    hideImportModal() {
        document.getElementById('import-modal').classList.add('hidden');
        document.getElementById('import-data').value = '';
    }

    importTodos() {
        const raw = document.getElementById('import-data').value.trim();
        if (!raw) { this.showToast('Please paste JSON data first'); return; }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed.todos || !Array.isArray(parsed.todos)) throw new Error('Invalid format');

            const existingIds = new Set(this.todos.map(t => t.id));
            const fresh = parsed.todos.filter(t => !existingIds.has(t.id));

            this.todos = [...fresh, ...this.todos];
            this.saveData();
            this.hideImportModal();
            this.render();
            this.showToast(fresh.length + ' task' + (fresh.length !== 1 ? 's' : '') + ' imported');
        } catch {
            this.showToast('Invalid JSON — check your data format');
        }
    }

    // ── Theme ─────────────────────────────────────
    toggleTheme() {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next    = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        this.updateThemeIcon(next);
        localStorage.setItem('todo-tab-theme', next);
    }

    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (!icon) return;
        if (theme === 'light') {
            // Moon icon
            icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        } else {
            // Sun icon
            icon.innerHTML = '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
        }
    }

    // ── Storage ───────────────────────────────────
    saveData() {
        try {
            localStorage.setItem('todo-tab-data', JSON.stringify(this.todos));
        } catch (e) {
            console.error('Save failed:', e);
        }
    }

    loadData() {
        try {
            const saved = localStorage.getItem('todo-tab-data');
            if (saved) this.todos = JSON.parse(saved);

            const theme = localStorage.getItem('todo-tab-theme') || 'dark';
            document.body.setAttribute('data-theme', theme);
            this.updateThemeIcon(theme);
        } catch (e) {
            console.error('Load failed:', e);
        }
    }

    // ── Toast ─────────────────────────────────────
    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.remove('hidden');

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2800);
    }

    // ── Helpers ───────────────────────────────────
    formatDate(iso) {
        const date    = new Date(iso);
        const now     = new Date();
        const diffMs  = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1)  return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        if (diffDay === 0) return 'Today';
        if (diffDay === 1) return 'Yesterday';
        if (diffDay < 7)  return diffDay + 'd ago';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

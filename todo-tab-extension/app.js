/* ════════════════════════════════════════════════════
   Todo Tab v2 — app.js
   CSP-safe: no innerHTML, no eval, no inline scripts
   ════════════════════════════════════════════════════ */

const BG_TEMPLATES = [
  { id: 'template-1',  name: 'Template 1',  image: 'url("images/img1.jpg")'  },
  { id: 'template-2',  name: 'Template 2',  image: 'url("images/img2.jpg")'  },
  { id: 'template-3',  name: 'Template 3',  image: 'url("images/img3.jpg")'  },
  { id: 'template-4',  name: 'Template 4',  image: 'url("images/img4.jpg")'  },
  { id: 'template-5',  name: 'Template 5',  image: 'url("images/img5.jpg")'  },
  { id: 'template-6',  name: 'Template 6',  image: 'url("images/img6.jpg")'  },
  { id: 'template-7',  name: 'Template 7',  image: 'url("images/img7.jpg")'  },
  { id: 'template-8',  name: 'Template 8',  image: 'url("images/img8.jpg")'  },
  { id: 'template-9',  name: 'Template 9',  image: 'url("images/img9.jpg")'  },
  { id: 'template-10', name: 'Template 10', image: 'url("images/img10.jpg")' },
];

class TodoApp {
  constructor() {
    this.todos       = [];
    this.settings    = {};
    this.activeTab   = 'tasks';    // tasks | analytics | settings
    this.activeFilter = 'all';    // all | pending | completed | today | high
    this.search      = '';
    this.filterCat   = 'all';
    this.filterPri   = 'all';
    this.selectedCat = 'Work';
    this.expandedId  = null;       // task with expanded notes
    this.editingId   = null;       // task being edited in modal
    this.dragSrc     = null;

    this._toastTimer = null;
    this._searchDebounce = DOM.debounce((v) => { this.search = v; this.renderTaskList(); }, 200);
  }

  /* ── Boot ─────────────────────────────────── */
  init() {
    this.settings = StorageService.loadSettings();
    this.todos    = StorageService.loadTodos();
    this.applyTheme(this.settings.theme);
    this.applyBackgroundSettings();
    this.selectedCat = this.settings.defaultCategory || 'Work';
    this.renderApp();
    this.bindGlobalEvents();
  }

  /* ── Apply theme ──────────────────────────── */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.settings.theme = theme;
    this.applyBackgroundSettings();
  }

  getTemplateById(id) {
    return BG_TEMPLATES.find((t) => t.id === id) || BG_TEMPLATES[0];
  }

  applyBackgroundSettings() {
    const bg = (this.settings && this.settings.background) ? this.settings.background : {};
    const root = document.documentElement;
    const body = document.body;

    let layer = 'none';
    let hasImage = false;
    if (bg.mode === 'template') {
      layer = this.getTemplateById(bg.templateId).image;
      hasImage = true;
    }

    root.style.setProperty('--user-bg-layer', layer);
    if (body) body.classList.toggle('has-user-bg', hasImage);
  }

  setBackgroundMode(mode, templateId) {
    if (!this.settings.background) this.settings.background = StorageService.getDefaultSettings().background;
    this.settings.background.mode = mode;
    if (templateId) this.settings.background.templateId = templateId;
    this.applyBackgroundSettings();
    StorageService.saveSettings(this.settings);
    this.updateBackgroundTemplateButtons();
  }

  resetBackgroundSettings() {
    if (!this.settings.background) this.settings.background = StorageService.getDefaultSettings().background;
    this.settings.background.mode = 'default';
    this.settings.background.customDataUrl = '';
    this.applyBackgroundSettings();
    StorageService.saveSettings(this.settings);
    this.updateBackgroundTemplateButtons();
    const meta = document.getElementById('bg-custom-meta');
    if (meta) meta.textContent = 'Using default background';
    this.showToast('Background reset to default');
  }

  updateBackgroundTemplateButtons() {
    const bg = this.settings.background || {};
    const activeId = bg.templateId || 'template-1';
    document.querySelectorAll('.bg-template-btn').forEach((btn) => {
      const isActive = bg.mode === 'template' && btn.dataset.templateId === activeId;
      btn.classList.toggle('active', isActive);
    });
  }

  /* ── Full app render (called once on boot) ── */
  renderApp() {
    const root = document.getElementById('app');
    DOM.clear(root);
    root.appendChild(this.buildHeader());
    root.appendChild(this.buildTabNav());
    const body = DOM.el('div', { class: 'app-body' });
    body.appendChild(this.buildTasksPanel());
    body.appendChild(this.buildAnalyticsPanel());
    body.appendChild(this.buildSettingsPanel());
    root.appendChild(body);
    root.appendChild(this.buildToast());
    root.appendChild(this.buildImportModal());
    root.appendChild(this.buildAddModal());
    this.switchTab('tasks');

    /* Initialize premium dropdowns after full DOM is ready */
    if (window.TDDropdowns) window.TDDropdowns.init();
  }

  /* ── Header ───────────────────────────────── */
  buildHeader() {
    const brand = DOM.el('div', { class: 'header-brand' }, [
      DOM.el('div', { class: 'brand-icon' }, [ICONS.check()]),
      DOM.el('div', {}, [
        DOM.el('h1', { class: 'brand-title', text: 'Todo Tab' }),
        DOM.el('p',  { class: 'brand-sub',   text: 'Smart Productivity' }),
      ]),
    ]);

    const themeBtn = DOM.el('button', { class: 'icon-btn', id: 'theme-toggle', title: 'Toggle theme' });
    themeBtn.appendChild(ICONS.sun());
    themeBtn.addEventListener('click', () => this.toggleTheme());

    const privacyPill = DOM.el('div', { class: 'privacy-pill' }, [ICONS.shield(), ' Local only']);

    const actions = DOM.el('div', { class: 'header-actions' }, [privacyPill, themeBtn]);
    const header  = DOM.el('header', { class: 'app-header' }, [brand, actions]);
    return header;
  }

  /* ── Tab nav ──────────────────────────────── */
  buildTabNav() {
    const tabs = [
      { id: 'tasks',     label: 'Tasks',     icon: ICONS.list()     },
      { id: 'analytics', label: 'Analytics', icon: ICONS.chart()    },
      { id: 'settings',  label: 'Settings',  icon: ICONS.settings() },
    ];
    const nav = DOM.el('nav', { class: 'tab-nav', id: 'tab-nav' });
    for (const t of tabs) {
      const btn = DOM.el('button', { class: 'tab-btn', 'data-tab': t.id }, [t.icon, t.label]);
      btn.addEventListener('click', () => this.switchTab(t.id));
      nav.appendChild(btn);
    }
    return nav;
  }

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab));
    if (tab === 'analytics')  this.renderAnalytics();
    if (tab === 'tasks')      this.renderTaskList();
  }

  /* ════════════════════════════════════════════
     TASKS PANEL
     ════════════════════════════════════════════ */
  buildTasksPanel() {
    const panel = DOM.el('div', { class: 'tab-panel', 'data-panel': 'tasks' });

    // Stats row
    panel.appendChild(this.buildStatsRow());

    // Search + filter bar
    panel.appendChild(this.buildSearchBar());

    // Filter pills
    panel.appendChild(this.buildFilterPills());

    // Task list
    const listWrap = DOM.el('div', { class: 'task-list-wrap' });
    listWrap.appendChild(DOM.el('div', { class: 'task-list', id: 'task-list' }));
    panel.appendChild(listWrap);

    // Footer actions
    panel.appendChild(this.buildTaskFooter());

    return panel;
  }

  buildStatsRow() {
    const stats = [
      { id: 'stat-total',   label: 'Total',   cls: '' },
      { id: 'stat-pending', label: 'Pending', cls: 'pending' },
      { id: 'stat-today',   label: 'Today',   cls: 'today' },
      { id: 'stat-done',    label: 'Done',    cls: 'done' },
    ];
    const row = DOM.el('div', { class: 'stats-row', id: 'stats-row' });
    for (const s of stats) {
      const card = DOM.el('div', { class: 'stat-card' }, [
        DOM.el('span', { class: `stat-num ${s.cls}`, id: s.id, text: '0' }),
        DOM.el('span', { class: 'stat-label', text: s.label }),
      ]);
      row.appendChild(card);
    }
    return row;
  }

  buildSearchBar() {
    const wrap = DOM.el('div', { class: 'search-bar' });

    const iconWrap = DOM.el('div', { class: 'search-icon' });
    iconWrap.appendChild(ICONS.search());

    const input = DOM.el('input', {
      type: 'text', id: 'search-input',
      placeholder: 'Search tasks...',
      autocomplete: 'off',
    });
    input.addEventListener('input', (e) => this._searchDebounce(e.target.value));

    // Add task button
    const addBtn = DOM.el('button', { class: 'btn-primary', id: 'open-add-modal' });
    addBtn.appendChild(ICONS.plus());
    addBtn.appendChild(document.createTextNode(' Add Task'));
    addBtn.addEventListener('click', () => this.openAddModal());

    wrap.appendChild(iconWrap);
    wrap.appendChild(input);
    wrap.appendChild(addBtn);
    return wrap;
  }

  buildFilterPills() {
    const filters = [
      { id: 'all',       label: 'All' },
      { id: 'pending',   label: 'Active' },
      { id: 'completed', label: 'Done' },
      { id: 'today',     label: 'Today' },
      { id: 'high',      label: 'High' },
    ];
    const row = DOM.el('div', { class: 'filter-row', id: 'filter-row' });

    const pillGroup = DOM.el('div', { class: 'filter-pills' });
    for (const f of filters) {
      const btn = DOM.el('button', {
        class: 'filter-pill' + (f.id === 'all' ? ' active' : ''),
        'data-filter': f.id,
      });
      if (f.id === 'high') {
        btn.appendChild(ICONS.flag());
        btn.appendChild(document.createTextNode(' ' + f.label));
      } else {
        btn.textContent = f.label;
      }
      btn.addEventListener('click', () => this.setFilter(f.id));
      pillGroup.appendChild(btn);
    }

    // Category + Priority dropdowns
    const catSel = this.buildSelect('filter-cat', [
      { v: 'all', l: 'All Categories' },
      ...TodoService.CATEGORIES.map(c => ({ v: c.label, l: c.label, c: c.color })),
    ]);
    catSel.dataset.noSearch = 'true';
    catSel.addEventListener('change', (e) => {
      this.filterCat = e.target.value;
      this.renderTaskList();
    });

    const priSel = this.buildSelect('filter-pri', [
      { v: 'all', l: 'All Priorities' },
      { v: 'high',   l: 'High', c: '#DC2626' },
      { v: 'medium', l: 'Medium', c: '#D97706' },
      { v: 'low',    l: 'Low', c: '#6B7280' },
    ]);
    priSel.addEventListener('change', (e) => { this.filterPri = e.target.value; this.renderTaskList(); });

    row.appendChild(pillGroup);
    row.appendChild(catSel);
    row.appendChild(priSel);
    return row;
  }

  buildSelect(id, options) {
    const sel = DOM.el('select', { class: 'filter-select', id });
    for (const opt of options) {
      const o = DOM.el('option', { value: opt.v, text: opt.l });
      if (opt.c) o.dataset.color = opt.c;
      sel.appendChild(o);
    }
    return sel;
  }

  buildTaskFooter() {
    const footer = DOM.el('div', { class: 'task-footer' });

    const mkBtn = (id, icon, label, handler) => {
      const btn = DOM.el('button', { class: 'ghost-btn', id });
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(' ' + label));
      btn.addEventListener('click', handler);
      return btn;
    };

    footer.appendChild(mkBtn('btn-mark-all',   ICONS.markAll(), 'Mark All Done', () => this.markAllDone()));
    footer.appendChild(mkBtn('btn-clear-done', ICONS.trash(),   'Clear Done',    () => this.clearCompleted()));
    footer.appendChild(mkBtn('btn-export',     ICONS.export(),  'Export',        () => this.exportTodos()));
    footer.appendChild(mkBtn('btn-import',     ICONS.import(),  'Import',        () => this.openImportModal()));
    return footer;
  }

  /* ── Render task list (incremental) ─────── */
  renderTaskList() {
    this.updateStats();
    const list   = document.getElementById('task-list');
    if (!list) return;

    const filtered = TodoService.filter(this.todos, {
      tab:      this.activeFilter,
      search:   this.search,
      category: this.filterCat,
      priority: this.filterPri,
    });

    // Incremental: build a map of existing DOM items
    const existingMap = new Map();
    list.querySelectorAll('.task-item').forEach(el => existingMap.set(el.dataset.id, el));

    // Build new set
    const newIds = new Set(filtered.map(t => t.id));

    // Remove stale
    existingMap.forEach((el, id) => {
      if (!newIds.has(id)) el.remove();
    });

    if (filtered.length === 0) {
      DOM.clear(list);
      list.appendChild(this.buildEmptyState());
      return;
    }

    // Remove empty state if present
    const emptyEl = list.querySelector('.empty-state');
    if (emptyEl) emptyEl.remove();

    // Insert / update / reorder
    filtered.forEach((todo, idx) => {
      const existing = existingMap.get(todo.id);
      if (existing) {
        // Update in-place
        this.updateTaskItem(existing, todo);
        // Ensure correct order
        const currentIdx = Array.from(list.children).indexOf(existing);
        if (currentIdx !== idx) list.insertBefore(existing, list.children[idx] || null);
      } else {
        // Create new
        const el = this.buildTaskItem(todo);
        list.insertBefore(el, list.children[idx] || null);
      }
    });
  }

  buildTaskItem(todo) {
    const catColor = todo.color || '#2563EB';

    const item = DOM.el('div', {
      class: 'task-item' + (todo.completed ? ' completed' : '') + (todo.id === this.expandedId ? ' expanded' : ''),
      'data-id': todo.id,
    });
    item.style.setProperty('--cat-color', catColor);

    // Drag handle
    const drag = DOM.el('div', { class: 'drag-handle' });
    drag.appendChild(ICONS.drag());
    item.appendChild(drag);

    // Checkbox
    const cbxWrap = DOM.el('div', { class: 'task-check-wrap' });
    const cbx = DOM.el('input', { type: 'checkbox', class: 'task-checkbox', 'data-id': todo.id });
    if (todo.completed) cbx.checked = true;
    cbx.addEventListener('change', () => this.toggleTodo(todo.id));
    cbxWrap.appendChild(cbx);
    item.appendChild(cbxWrap);

    // Body
    const body = DOM.el('div', { class: 'task-body' });

    // Text row
    const textRow = DOM.el('div', { class: 'task-text-row' });
    const textEl  = DOM.el('span', { class: 'task-text' + (todo.completed ? ' done-text' : '') });
    textEl.textContent = todo.text; // safe - textContent only
    textRow.appendChild(textEl);
    body.appendChild(textRow);

    // Meta row
    const meta = DOM.el('div', { class: 'task-meta' });

    // Category tag
    const tag = DOM.el('span', { class: 'task-tag' });
    tag.textContent = todo.category;
    tag.style.setProperty('--tag-color', catColor);
    meta.appendChild(tag);

    // Priority badge
    const pri = DOM.el('span', { class: `priority-badge pri-${todo.priority}` });
    pri.appendChild(ICONS.flag());
    pri.appendChild(document.createTextNode(todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)));
    meta.appendChild(pri);

    // Due date
    if (todo.dueDate) {
      const due = DOM.el('span', { class: 'task-due' + (this.isOverdue(todo) ? ' overdue' : '') });
      due.appendChild(ICONS.calendar());
      due.appendChild(document.createTextNode(' ' + this.formatDue(todo.dueDate)));
      meta.appendChild(due);
    }

    // Date added
    const dateEl = DOM.el('span', { class: 'task-date', text: this.formatDate(todo.createdAt) });
    meta.appendChild(dateEl);

    body.appendChild(meta);

    // Notes (expanded)
    if (todo.notes && todo.id === this.expandedId) {
      const notesEl = DOM.el('div', { class: 'task-notes' });
      notesEl.appendChild(ICONS.note());
      notesEl.appendChild(document.createTextNode(' ' + todo.notes));
      body.appendChild(notesEl);
    }

    item.appendChild(body);

    // Actions
    const actions = DOM.el('div', { class: 'task-actions' });

    if (todo.notes) {
      const expandBtn = DOM.el('button', { class: 'task-action-btn', title: 'View notes' });
      expandBtn.appendChild(ICONS.note());
      expandBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleExpand(todo.id); });
      actions.appendChild(expandBtn);
    }

    const editBtn = DOM.el('button', { class: 'task-action-btn', title: 'Edit task' });
    editBtn.appendChild(ICONS.edit());
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openEditModal(todo.id); });
    actions.appendChild(editBtn);

    const delBtn = DOM.el('button', { class: 'task-action-btn delete-btn', title: 'Delete task' });
    delBtn.appendChild(ICONS.trash());
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); this.deleteTodo(todo.id); });
    actions.appendChild(delBtn);

    item.appendChild(actions);

    // Drag events
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', (e) => this.onDragStart(e, todo.id));
    item.addEventListener('dragover',  (e) => this.onDragOver(e));
    item.addEventListener('drop',      (e) => this.onDrop(e, todo.id));
    item.addEventListener('dragend',   ()  => this.onDragEnd());

    return item;
  }

  updateTaskItem(el, todo) {
    // Update completed state
    el.classList.toggle('completed', todo.completed);
    const cb = el.querySelector('.task-checkbox');
    if (cb) cb.checked = todo.completed;
    const textEl = el.querySelector('.task-text');
    if (textEl) {
      textEl.textContent = todo.text;
      textEl.classList.toggle('done-text', todo.completed);
    }
  }

  buildEmptyState() {
    const msgs = {
      all:       ['No tasks yet',           'Add your first task to get started'],
      pending:   ['All caught up',           'No active tasks remaining'],
      completed: ['Nothing completed yet',   'Complete some tasks to see them here'],
      today:     ['No tasks today',          'Add a task for today'],
      high:      ['No high-priority tasks',  'You\'re in great shape'],
    };
    const [title, hint] = msgs[this.activeFilter] || msgs.all;

    return DOM.el('div', { class: 'empty-state' }, [
      DOM.el('div', { class: 'empty-icon' }, [ICONS.markAll()]),
      DOM.el('p',   { class: 'empty-title', text: title }),
      DOM.el('p',   { class: 'empty-hint',  text: hint  }),
    ]);
  }

  /* ── Stats update ─────────────────────────── */
  updateStats() {
    const s = TodoService.getStats(this.todos);
    DOM.setText('stat-total',   s.total);
    DOM.setText('stat-pending', s.pending);
    DOM.setText('stat-today',   s.todayAdded);
    DOM.setText('stat-done',    s.completed);

    // Badge on tab if high priority tasks
    const tasksTab = document.querySelector('.tab-btn[data-tab="tasks"]');
    if (tasksTab) {
      let badge = tasksTab.querySelector('.tab-badge');
      if (s.high > 0) {
        if (!badge) {
          badge = DOM.el('span', { class: 'tab-badge' });
          tasksTab.appendChild(badge);
        }
        badge.textContent = s.high;
      } else if (badge) {
        badge.remove();
      }
    }
  }

  /* ── Add task modal ───────────────────────── */
  buildAddModal() {
    const backdrop = DOM.el('div', { class: 'modal-backdrop hidden', id: 'add-modal' });
    const modal    = DOM.el('div', { class: 'modal' });

    // Header
    const head   = DOM.el('div', { class: 'modal-header' });
    const title  = DOM.el('h3', { class: 'modal-title', id: 'add-modal-title', text: 'Add New Task' });
    const closeBtn = DOM.el('button', { class: 'icon-btn', id: 'close-add-modal' });
    closeBtn.appendChild(ICONS.close());
    closeBtn.addEventListener('click', () => this.closeAddModal());
    head.appendChild(title);
    head.appendChild(closeBtn);

    // Form
    const form = DOM.el('div', { class: 'modal-form' });

    // Task text
    const taskInput = DOM.el('input', {
      type: 'text', id: 'task-input',
      placeholder: 'What needs to be done?',
      class: 'modal-input',
      autocomplete: 'off',
    });
    taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submitAddModal(); });
    form.appendChild(DOM.el('label', { class: 'modal-label', text: 'Task' }));
    form.appendChild(taskInput);

    // Row: Category + Priority
    const row1 = DOM.el('div', { class: 'form-row' });

    const catGroup = DOM.el('div', { class: 'form-group' });
    catGroup.appendChild(DOM.el('label', { class: 'modal-label', text: 'Category' }));
    const catSel = this.buildSelect('add-category', TodoService.CATEGORIES.map(c => ({ v: c.label, l: c.label, c: c.color })));
    catSel.dataset.noSearch = 'true';
    catSel.value = this.selectedCat;
    catGroup.appendChild(catSel);

    const priGroup = DOM.el('div', { class: 'form-group' });
    priGroup.appendChild(DOM.el('label', { class: 'modal-label', text: 'Priority' }));
    const priSel = this.buildSelect('add-priority', [
      { v: 'low',    l: 'Low', c: '#6B7280' },
      { v: 'medium', l: 'Medium', c: '#D97706' },
      { v: 'high',   l: 'High', c: '#DC2626' },
    ]);
    priGroup.appendChild(priSel);

    row1.appendChild(catGroup);
    row1.appendChild(priGroup);
    form.appendChild(row1);

    // Due date
    const dueGroup = DOM.el('div', { class: 'form-group' });
    dueGroup.appendChild(DOM.el('label', { class: 'modal-label', text: 'Due Date (optional)' }));
    const dueInput = DOM.el('input', { type: 'date', id: 'add-due', class: 'modal-input' });
    dueGroup.appendChild(dueInput);
    form.appendChild(dueGroup);

    // Notes
    const notesGroup = DOM.el('div', { class: 'form-group' });
    notesGroup.appendChild(DOM.el('label', { class: 'modal-label', text: 'Notes (optional)' }));
    const notesInput = DOM.el('textarea', { id: 'add-notes', class: 'modal-textarea', placeholder: 'Add extra details...' });
    notesGroup.appendChild(notesInput);
    form.appendChild(notesGroup);

    // Auto-priority hint
    const hint = DOM.el('p', { class: 'form-hint', text: 'Tip: keywords like "urgent" or "today" auto-set high priority' });
    form.appendChild(hint);

    // Actions
    const actions = DOM.el('div', { class: 'modal-actions' });
    const cancelBtn = DOM.el('button', { class: 'btn-ghost', text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.closeAddModal());
    const submitBtn = DOM.el('button', { class: 'btn-primary', id: 'add-modal-submit', text: 'Add Task' });
    submitBtn.addEventListener('click', () => this.submitAddModal());
    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);

    modal.appendChild(head);
    modal.appendChild(form);
    modal.appendChild(actions);
    backdrop.appendChild(modal);

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) this.closeAddModal(); });
    return backdrop;
  }

  openAddModal() {
    this.editingId = null;
    this.setAddModalMode(false);
    this.resetAddModalForm();
    const modal = document.getElementById('add-modal');
    DOM.show(modal);
    setTimeout(() => document.getElementById('task-input').focus(), 50);
  }

  openEditModal(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    this.editingId = id;
    this.setAddModalMode(true);

    const modal = document.getElementById('add-modal');
    DOM.show(modal);

    const taskInput = document.getElementById('task-input');
    const notesInput = document.getElementById('add-notes');
    const dueInput = document.getElementById('add-due');
    const priSelect = document.getElementById('add-priority');
    const catSelect = document.getElementById('add-category');

    if (taskInput) taskInput.value = todo.text || '';
    if (notesInput) notesInput.value = todo.notes || '';
    if (dueInput) dueInput.value = todo.dueDate || '';
    if (priSelect) priSelect.value = todo.priority || 'low';
    if (catSelect) catSelect.value = todo.category || this.selectedCat || 'Work';

    if (window.TDDropdowns) {
      window.TDDropdowns.sync('add-priority');
      window.TDDropdowns.sync('add-category');
    }

    setTimeout(() => document.getElementById('task-input').focus(), 50);
  }

  closeAddModal() {
    DOM.hide(document.getElementById('add-modal'));
    this.editingId = null;
    this.setAddModalMode(false);
    this.resetAddModalForm();
  }

  setAddModalMode(isEditing) {
    const title = document.getElementById('add-modal-title');
    const submit = document.getElementById('add-modal-submit');
    if (title) title.textContent = isEditing ? 'Edit Task' : 'Add New Task';
    if (submit) submit.textContent = isEditing ? 'Save Changes' : 'Add Task';
  }

  resetAddModalForm() {
    const taskInput = document.getElementById('task-input');
    const notesInput = document.getElementById('add-notes');
    const dueInput = document.getElementById('add-due');
    const priSelect = document.getElementById('add-priority');
    const catSelect = document.getElementById('add-category');

    if (taskInput) taskInput.value = '';
    if (notesInput) notesInput.value = '';
    if (dueInput) dueInput.value = '';
    if (priSelect) priSelect.value = 'low';
    if (catSelect) catSelect.value = this.selectedCat || 'Work';

    if (window.TDDropdowns) {
      window.TDDropdowns.sync('add-priority');
      window.TDDropdowns.sync('add-category');
    }
  }

  submitAddModal() {
    const isEditing = Boolean(this.editingId);
    const text     = document.getElementById('task-input').value.trim();
    if (!text) { document.getElementById('task-input').focus(); return; }

    const category = document.getElementById('add-category').value;
    const priority = document.getElementById('add-priority').value;
    const dueDate  = document.getElementById('add-due').value;
    const notes    = document.getElementById('add-notes').value.trim();

    if (isEditing) {
      const idx = this.todos.findIndex(t => t.id === this.editingId);
      if (idx !== -1) {
        const cat = TodoService.CATEGORIES.find(c => c.label === category) || TodoService.CATEGORIES[0];
        const nextPriority = ['low', 'medium', 'high'].includes(priority) ? priority : TodoService.detectPriority(text);
        this.todos[idx] = Object.assign({}, this.todos[idx], {
          text: TodoService.sanitize(text),
          category: cat.label,
          color: cat.color,
          priority: nextPriority,
          dueDate: TodoService.normalizeDueDate(dueDate),
          notes: notes ? TodoService.sanitize(notes) : '',
        });
      }
    } else {
      const todo = TodoService.create(text, category, priority, dueDate, notes);
      this.todos.unshift(todo);
    }

    StorageService.saveTodos(this.todos);
    this.closeAddModal();

    const list = document.getElementById('task-list');
    if (list) DOM.clear(list);
    this.renderTaskList();
    this.showToast(isEditing ? 'Task updated' : 'Task added');
  }

  /* ── Import modal ─────────────────────────── */
  buildImportModal() {
    const backdrop = DOM.el('div', { class: 'modal-backdrop hidden', id: 'import-modal' });
    const modal    = DOM.el('div', { class: 'modal' });

    const head = DOM.el('div', { class: 'modal-header' });
    head.appendChild(DOM.el('h3', { class: 'modal-title', text: 'Import Tasks' }));
    const closeBtn = DOM.el('button', { class: 'icon-btn' });
    closeBtn.appendChild(ICONS.close());
    closeBtn.addEventListener('click', () => this.closeImportModal());
    head.appendChild(closeBtn);

    const textarea = DOM.el('textarea', {
      id: 'import-data',
      class: 'modal-textarea import-textarea',
      placeholder: 'Paste your exported JSON here...',
    });
    const hint = DOM.el('p', { class: 'form-hint', text: 'Paste JSON from a previous Todo Tab export. Duplicate tasks will be skipped.' });

    const actions = DOM.el('div', { class: 'modal-actions' });
    const cancelBtn = DOM.el('button', { class: 'btn-ghost', text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.closeImportModal());
    const confirmBtn = DOM.el('button', { class: 'btn-primary', text: 'Import' });
    confirmBtn.addEventListener('click', () => this.doImport());
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modal.appendChild(head);
    modal.appendChild(textarea);
    modal.appendChild(hint);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) this.closeImportModal(); });
    return backdrop;
  }

  openImportModal()  { DOM.show(document.getElementById('import-modal')); }
  closeImportModal() { DOM.hide(document.getElementById('import-modal')); document.getElementById('import-data').value = ''; }

  doImport() {
    const raw = document.getElementById('import-data').value.trim();
    if (!raw) { this.showToast('Please paste JSON data first'); return; }
    try {
      const data  = JSON.parse(raw);
      const tasks = TodoService.validateImport(data);
      const existing = new Set(this.todos.map(t => t.id));
      const fresh    = tasks.filter(t => !existing.has(t.id));
      this.todos = [...fresh, ...this.todos];
      StorageService.saveTodos(this.todos);
      this.closeImportModal();
      this.renderTaskList();
      this.showToast(`${fresh.length} task${fresh.length !== 1 ? 's' : ''} imported`);
    } catch (e) {
      this.showToast('Invalid JSON — check your data format');
    }
  }

  /* ════════════════════════════════════════════
     ANALYTICS PANEL
     ════════════════════════════════════════════ */
  buildAnalyticsPanel() {
    const panel = DOM.el('div', { class: 'tab-panel hidden', 'data-panel': 'analytics' });
    panel.id = 'analytics-panel';
    return panel;
  }

  renderAnalytics() {
    const panel = document.getElementById('analytics-panel');
    DOM.clear(panel);
    const s = TodoService.getStats(this.todos);

    // Summary cards
    const cards = DOM.el('div', { class: 'analytics-cards' });
    const cardData = [
      { label: 'Completion Rate', value: s.rate + '%',    sub: `${s.completed} of ${s.total} tasks` },
      { label: 'Done Today',      value: s.todayDone,     sub: 'tasks completed today'              },
      { label: 'High Priority',   value: s.high,          sub: 'tasks need attention'               },
      { label: 'Total Tasks',     value: s.total,         sub: 'across all categories'              },
    ];
    for (const c of cardData) {
      cards.appendChild(DOM.el('div', { class: 'analytics-card' }, [
        DOM.el('div', { class: 'analytics-num', text: String(c.value) }),
        DOM.el('div', { class: 'analytics-label', text: c.label }),
        DOM.el('div', { class: 'analytics-sub',   text: c.sub }),
      ]));
    }
    panel.appendChild(cards);

    // Progress bar
    const progSection = DOM.el('div', { class: 'progress-section' });
    progSection.appendChild(DOM.el('h3', { class: 'section-title', text: 'Overall Progress' }));
    const progBar = DOM.el('div', { class: 'progress-bar' });
    const progFill = DOM.el('div', { class: 'progress-fill' });
    progFill.style.width = s.rate + '%';
    progBar.appendChild(progFill);
    progSection.appendChild(progBar);
    progSection.appendChild(DOM.el('p', { class: 'progress-label', text: `${s.rate}% complete` }));
    panel.appendChild(progSection);

    // Weekly chart
    panel.appendChild(this.buildWeeklyChart(s.weekly));

    // Category breakdown
    panel.appendChild(this.buildCategoryBreakdown());
  }

  buildWeeklyChart(weekly) {
    const section = DOM.el('div', { class: 'chart-section' });
    section.appendChild(DOM.el('h3', { class: 'section-title', text: 'Last 7 Days' }));

    const maxVal = Math.max(...weekly.map(d => Math.max(d.added, d.done)), 1);
    const chart  = DOM.el('div', { class: 'bar-chart' });

    for (const day of weekly) {
      const col = DOM.el('div', { class: 'chart-col' });

      const bars = DOM.el('div', { class: 'chart-bars' });
      const addedH = Math.round((day.added / maxVal) * 80);
      const doneH  = Math.round((day.done  / maxVal) * 80);

      const b1 = DOM.el('div', { class: 'bar bar-added', title: `Added: ${day.added}` });
      const b2 = DOM.el('div', { class: 'bar bar-done',  title: `Done: ${day.done}` });
      b1.style.height = addedH + 'px';
      b2.style.height = doneH + 'px';
      bars.appendChild(b1);
      bars.appendChild(b2);
      col.appendChild(bars);
      col.appendChild(DOM.el('div', { class: 'chart-label', text: day.label }));
      chart.appendChild(col);
    }

    // Legend
    const legend = DOM.el('div', { class: 'chart-legend' });
    legend.appendChild(DOM.el('span', { class: 'legend-item legend-added', text: 'Added' }));
    legend.appendChild(DOM.el('span', { class: 'legend-item legend-done',  text: 'Completed' }));

    section.appendChild(chart);
    section.appendChild(legend);
    return section;
  }

  buildCategoryBreakdown() {
    const section = DOM.el('div', { class: 'category-section' });
    section.appendChild(DOM.el('h3', { class: 'section-title', text: 'By Category' }));

    const total = this.todos.length || 1;
    for (const cat of TodoService.CATEGORIES) {
      const count    = this.todos.filter(t => t.category === cat.label).length;
      const done     = this.todos.filter(t => t.category === cat.label && t.completed).length;
      const pct      = Math.round((count / total) * 100);

      const row = DOM.el('div', { class: 'cat-row' });
      const dot = DOM.el('span', { class: 'cat-dot' });
      dot.style.background = cat.color;
      const lbl = DOM.el('span', { class: 'cat-row-label', text: cat.label });
      const bar = DOM.el('div', { class: 'cat-bar' });
      const fill = DOM.el('div', { class: 'cat-bar-fill' });
      fill.style.width = pct + '%';
      fill.style.background = cat.color;
      bar.appendChild(fill);
      const cnt = DOM.el('span', { class: 'cat-count', text: `${done}/${count}` });

      row.appendChild(dot);
      row.appendChild(lbl);
      row.appendChild(bar);
      row.appendChild(cnt);
      section.appendChild(row);
    }
    return section;
  }

  /* ════════════════════════════════════════════
     SETTINGS PANEL
     ════════════════════════════════════════════ */
  buildSettingsPanel() {
    const panel = DOM.el('div', { class: 'tab-panel hidden', 'data-panel': 'settings' });
    panel.appendChild(DOM.el('h2', { class: 'settings-title', text: 'Settings' }));

    // Theme setting
    const themeCard = DOM.el('div', { class: 'settings-card' });
    themeCard.appendChild(DOM.el('div', { class: 'settings-label', text: 'Appearance' }));
    themeCard.appendChild(DOM.el('p', { class: 'settings-desc', text: 'Choose your preferred color theme' }));

    const themeRow = DOM.el('div', { class: 'theme-options' });
    for (const t of [
      { val: 'light', label: 'Light', icon: ICONS.sun },
      { val: 'dark', label: 'Dark', icon: ICONS.moon },
    ]) {
      const btn = DOM.el('button', {
        class: 'theme-option' + (this.settings.theme === t.val ? ' active' : ''),
        'data-theme-val': t.val,
      });
      btn.appendChild(t.icon());
      btn.appendChild(document.createTextNode(' ' + t.label));
      btn.addEventListener('click', () => {
        this.applyTheme(t.val);
        StorageService.saveSettings(this.settings);
        document.querySelectorAll('.theme-option').forEach(b => b.classList.toggle('active', b.dataset.themeVal === t.val));
        this.updateThemeIcon();
      });
      themeRow.appendChild(btn);
    }
    themeCard.appendChild(themeRow);
    panel.appendChild(themeCard);

    // Background templates + custom upload
    const bgCard = DOM.el('div', { class: 'settings-card' });
    bgCard.appendChild(DOM.el('div', { class: 'settings-label', text: 'Background' }));
    bgCard.appendChild(DOM.el('p', { class: 'settings-desc', text: 'Choose from 10 built-in templates or reset to default.' }));

    const grid = DOM.el('div', { class: 'bg-template-grid' });
    BG_TEMPLATES.forEach((tpl) => {
      const btn = DOM.el('button', { class: 'bg-template-btn', 'data-template-id': tpl.id, type: 'button' });
      const preview = DOM.el('div', { class: 'bg-template-preview' });
      preview.style.backgroundImage = tpl.image;
      const lbl = DOM.el('span', { class: 'bg-template-label', text: tpl.name });
      btn.appendChild(preview);
      btn.appendChild(lbl);
      btn.addEventListener('click', () => {
        this.setBackgroundMode('template', tpl.id);
        const meta = document.getElementById('bg-custom-meta');
        if (meta) meta.textContent = `Using ${tpl.name}`;
      });
      grid.appendChild(btn);
    });
    bgCard.appendChild(grid);

    const actionsRow = DOM.el('div', { class: 'bg-actions' });
    const resetBtn = DOM.el('button', { class: 'btn-ghost', type: 'button' });
    resetBtn.appendChild(ICONS.close());
    resetBtn.appendChild(document.createTextNode(' Reset Background'));
    resetBtn.addEventListener('click', () => this.resetBackgroundSettings());

    actionsRow.appendChild(resetBtn);
    bgCard.appendChild(actionsRow);

    const bg = this.settings.background || {};
    const metaText = bg.mode === 'template' ? `Using ${this.getTemplateById(bg.templateId).name}` : 'Using default background';
    bgCard.appendChild(DOM.el('div', { class: 'bg-custom-meta', id: 'bg-custom-meta', text: metaText }));

    panel.appendChild(bgCard);

    // Default category
    const catCard = DOM.el('div', { class: 'settings-card' });
    catCard.appendChild(DOM.el('div', { class: 'settings-label', text: 'Default Category' }));
    catCard.appendChild(DOM.el('p', { class: 'settings-desc', text: 'Pre-selected when adding a new task' }));
    const catSel = this.buildSelect('settings-default-cat', TodoService.CATEGORIES.map(c => ({ v: c.label, l: c.label, c: c.color })));
    catSel.dataset.noSearch = 'true';
    catSel.value = this.settings.defaultCategory;
    catSel.addEventListener('change', (e) => {
      this.settings.defaultCategory = e.target.value;
      this.selectedCat = e.target.value;
      StorageService.saveSettings(this.settings);
      const addCat = document.getElementById('add-category');
      if (addCat) {
        addCat.value = this.selectedCat;
        if (window.TDDropdowns) window.TDDropdowns.sync('add-category');
      }
    });
    catCard.appendChild(catSel);
    panel.appendChild(catCard);

    // Data management
    const dataCard = DOM.el('div', { class: 'settings-card' });
    dataCard.appendChild(DOM.el('div', { class: 'settings-label', text: 'Data Management' }));

    const exportBtn = DOM.el('button', { class: 'btn-outline' });
    exportBtn.appendChild(ICONS.export());
    exportBtn.appendChild(document.createTextNode(' Export All Tasks'));
    exportBtn.addEventListener('click', () => this.exportTodos());
    const importBtn = DOM.el('button', { class: 'btn-outline' });
    importBtn.appendChild(ICONS.import());
    importBtn.appendChild(document.createTextNode(' Import Tasks'));
    importBtn.addEventListener('click', () => this.openImportModal());
    const clearBtn  = DOM.el('button', { class: 'btn-danger' });
    clearBtn.appendChild(ICONS.trash());
    clearBtn.appendChild(document.createTextNode(' Clear All Data'));
    clearBtn.addEventListener('click', () => this.clearAllData());

    dataCard.appendChild(exportBtn);
    dataCard.appendChild(importBtn);
    dataCard.appendChild(clearBtn);
    panel.appendChild(dataCard);

    // Privacy note
    const note = DOM.el('div', { class: 'privacy-note' }, [
      ICONS.shield(),
      DOM.el('span', { text: ' All data is stored locally in your browser — never sent anywhere.' }),
    ]);
    panel.appendChild(note);

    this.updateBackgroundTemplateButtons();

    return panel;
  }

  /* ── Toast ────────────────────────────────── */
  buildToast() {
    return DOM.el('div', { class: 'toast hidden', id: 'toast' });
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    DOM.show(toast);
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => DOM.hide(toast), 3000);
  }

  /* ── Actions ──────────────────────────────── */
  toggleTodo(id) {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.todos[idx] = TodoService.toggle(this.todos[idx]);
    StorageService.saveTodos(this.todos);
    this.renderTaskList();
  }

  deleteTodo(id) {
    const el = document.querySelector(`.task-item[data-id="${id}"]`);
    if (el) {
      el.style.transition = 'opacity 0.15s, transform 0.15s';
      el.style.opacity    = '0';
      el.style.transform  = 'translateX(8px)';
      setTimeout(() => {
        this.todos = this.todos.filter(t => t.id !== id);
        if (this.expandedId === id) this.expandedId = null;
        StorageService.saveTodos(this.todos);
        this.renderTaskList();
      }, 150);
    } else {
      this.todos = this.todos.filter(t => t.id !== id);
      if (this.expandedId === id) this.expandedId = null;
      StorageService.saveTodos(this.todos);
      this.renderTaskList();
    }
  }

  toggleExpand(id) {
    this.expandedId = this.expandedId === id ? null : id;
    this.renderTaskList();
  }

  setFilter(f) {
    this.activeFilter = f;
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    this.renderTaskList();
  }

  markAllDone() {
    const pending = this.todos.filter(t => !t.completed);
    if (!pending.length) { this.showToast('No pending tasks'); return; }
    const now = new Date().toISOString();
    this.todos = this.todos.map(t => t.completed ? t : Object.assign({}, t, { completed: true, completedAt: now }));
    StorageService.saveTodos(this.todos);
    this.renderTaskList();
    this.showToast(`${pending.length} task${pending.length !== 1 ? 's' : ''} completed`);
  }

  clearCompleted() {
    const count = this.todos.filter(t => t.completed).length;
    if (!count) { this.showToast('No completed tasks to clear'); return; }
    this.todos = this.todos.filter(t => !t.completed);
    StorageService.saveTodos(this.todos);
    this.renderTaskList();
    this.showToast(`${count} task${count !== 1 ? 's' : ''} cleared`);
  }

  exportTodos() {
    const payload = { todos: this.todos, exportedAt: new Date().toISOString(), app: 'Todo Tab v2' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `todo-tab-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    this.showToast('Tasks exported');
  }

  clearAllData() {
    if (!confirm('Delete all tasks and settings? This cannot be undone.')) return;
    this.todos = [];
    StorageService.saveTodos(this.todos);
    this.settings = StorageService.getDefaultSettings();
    this.selectedCat = this.settings.defaultCategory;
    StorageService.saveSettings(this.settings);
    this.applyTheme(this.settings.theme);
    this.renderApp();
    this.showToast('All data cleared');
  }

  /* ── Theme ────────────────────────────────── */
  toggleTheme() {
    const next = this.settings.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    StorageService.saveSettings(this.settings);
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    DOM.clear(btn);
    btn.appendChild(this.settings.theme === 'dark' ? ICONS.sun() : ICONS.moon());
  }

  /* ── Drag & Drop ──────────────────────────── */
  onDragStart(e, id) {
    this.dragSrc = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  onDrop(e, targetId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!this.dragSrc || this.dragSrc === targetId) return;

    const srcIdx = this.todos.findIndex(t => t.id === this.dragSrc);
    const tgtIdx = this.todos.findIndex(t => t.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const [moved] = this.todos.splice(srcIdx, 1);
    this.todos.splice(tgtIdx, 0, moved);
    StorageService.saveTodos(this.todos);
    this.renderTaskList();
  }

  onDragEnd() {
    document.querySelectorAll('.task-item').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    this.dragSrc = null;
  }

  /* ── Global key bindings ──────────────────── */
  bindGlobalEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAddModal();
        this.closeImportModal();
      }
      // Ctrl+K or / to focus search
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        const si = document.getElementById('search-input');
        if (si) si.focus();
      }
      // N to open add modal
      if (e.key === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        this.openAddModal();
      }
    });
  }

  /* ── Date helpers ─────────────────────────── */
  formatDate(iso) {
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)  return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const days = Math.floor(diff / 1440);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDue(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isOverdue(todo) {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate + 'T23:59:59') < new Date();
  }
}

/* ── Boot ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const app = new TodoApp();
  app.init();
});

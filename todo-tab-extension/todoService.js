/* ═══════════════════════════════════════════
   todoService.js — Task business logic
   ═══════════════════════════════════════════ */

const PRIORITY_KEYWORDS = {
  high:   ['urgent', 'asap', 'critical', 'important', 'deadline', 'emergency', 'today', 'now'],
  medium: ['soon', 'next', 'this week', 'follow up', 'check', 'review'],
};

const CATEGORIES = [
  { label: 'Work',      color: '#2563EB' },
  { label: 'Personal',  color: '#059669' },
  { label: 'Urgent',    color: '#DC2626' },
  { label: 'Ideas',     color: '#7C3AED' },
  { label: 'Health',    color: '#EA580C' },
  { label: 'General',   color: '#6B7280' },
];

const TodoService = {
  CATEGORIES,

  create(text, category, priority, dueDate, notes) {
    const cleanText = TodoService.sanitize(text);
    const autoPriority = priority || TodoService.detectPriority(cleanText);
    const safeCategory = CATEGORIES.some(c => c.label === category) ? category : 'Work';
    return {
      id:          Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text:        cleanText,
      category:    safeCategory,
      color:       (CATEGORIES.find(c => c.label === safeCategory) || CATEGORIES[0]).color,
      priority:    autoPriority,
      dueDate:     TodoService.normalizeDueDate(dueDate),
      notes:       notes ? TodoService.sanitize(notes) : '',
      completed:   false,
      createdAt:   new Date().toISOString(),
      completedAt: null,
    };
  },

  detectPriority(text) {
    const lower = text.toLowerCase();
    if (PRIORITY_KEYWORDS.high.some(kw => lower.includes(kw)))   return 'high';
    if (PRIORITY_KEYWORDS.medium.some(kw => lower.includes(kw))) return 'medium';
    return 'low';
  },

  toggle(todo) {
    return Object.assign({}, todo, {
      completed:   !todo.completed,
      completedAt: !todo.completed ? new Date().toISOString() : null,
    });
  },

  sanitize(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .slice(0, 500);
  },

  isValidDate(value) {
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  },

  normalizeDueDate(value) {
    if (!value || typeof value !== 'string') return null;
    const v = value.trim();
    if (!v) return null;
    const direct = v.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (direct) return direct[1];
    if (!TodoService.isValidDate(v)) return null;
    return new Date(v).toISOString().slice(0, 10);
  },

  // Fuzzy search — returns true if all query chars found in order
  fuzzyMatch(text, query) {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    let ti = 0;
    for (let qi = 0; qi < q.length; qi++) {
      ti = t.indexOf(q[qi], ti);
      if (ti === -1) return false;
      ti++;
    }
    return true;
  },

  filter(todos, { tab, search, category, priority }) {
    const today = new Date().toDateString();
    let list = todos;

    // Tab filter
    switch (tab) {
      case 'pending':   list = list.filter(t => !t.completed); break;
      case 'completed': list = list.filter(t =>  t.completed); break;
      case 'today':     list = list.filter(t => new Date(t.createdAt).toDateString() === today); break;
      case 'high':      list = list.filter(t => t.priority === 'high' && !t.completed); break;
    }

    // Search
    if (search && search.trim()) {
      const q = search.trim();
      list = list.filter(t => TodoService.fuzzyMatch(t.text, q) || TodoService.fuzzyMatch(t.category, q));
    }

    // Category filter
    if (category && category !== 'all') {
      list = list.filter(t => t.category === category);
    }

    // Priority filter
    if (priority && priority !== 'all') {
      list = list.filter(t => t.priority === priority);
    }

    return list;
  },

  getStats(todos) {
    const today = new Date().toDateString();
    const total     = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending   = total - completed;
    const todayAdded = todos.filter(t => new Date(t.createdAt).toDateString() === today).length;
    const todayDone  = todos.filter(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today).length;
    const high       = todos.filter(t => t.priority === 'high' && !t.completed).length;
    const rate       = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Weekly data (last 7 days)
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      weekly.push({
        label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        added: todos.filter(t => new Date(t.createdAt).toDateString() === ds).length,
        done:  todos.filter(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === ds).length,
      });
    }

    return { total, completed, pending, todayAdded, todayDone, high, rate, weekly };
  },

  validateImport(data) {
    if (!data || typeof data !== 'object') throw new Error('Not a valid object');
    if (!Array.isArray(data.todos))         throw new Error('Missing todos array');

    const normalized = data.todos.map((t) => {
      if (!t || typeof t !== 'object' || !t.id || !t.text) return null;

      const text = TodoService.sanitize(t.text);
      const category = CATEGORIES.some(c => c.label === t.category) ? t.category : 'Work';
      const priority = ['high', 'medium', 'low'].includes(t.priority) ? t.priority : TodoService.detectPriority(text);
      const completed = Boolean(t.completed);
      const createdAt = TodoService.isValidDate(t.createdAt) ? new Date(t.createdAt).toISOString() : new Date().toISOString();
      const completedAt = completed
        ? (TodoService.isValidDate(t.completedAt) ? new Date(t.completedAt).toISOString() : new Date().toISOString())
        : null;

      return {
        id: String(t.id),
        text,
        category,
        color: (CATEGORIES.find(c => c.label === category) || CATEGORIES[0]).color,
        priority,
        dueDate: TodoService.normalizeDueDate(t.dueDate),
        notes: t.notes ? TodoService.sanitize(t.notes) : '',
        completed,
        createdAt,
        completedAt,
      };
    }).filter(Boolean);

    if (!normalized.length) throw new Error('No valid tasks found');
    return normalized;
  },
};

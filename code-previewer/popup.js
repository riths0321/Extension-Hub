/* ================================================================
   CODE PREVIEWER PRO
================================================================ */

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const lineNumbers = document.getElementById('lineNumbers');
const tabs = document.querySelectorAll('.code-tab');
const runBtn = document.getElementById('runBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const formatBtn = document.getElementById('formatBtn');
const copyBtn = document.getElementById('copyBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const autoRunBtn = document.getElementById('autoRunBtn');
const templatesBtn = document.getElementById('templatesBtn');
const templateMenu = document.getElementById('templateMenu');
const lineCount = document.getElementById('lineCount');
const charCount = document.getElementById('charCount');
const saveStatus = document.getElementById('saveStatus');
const langBadge = document.getElementById('langBadge');
const previewWrap = document.getElementById('previewWrap');
const sizeBtns = document.querySelectorAll('.size-btn');
const toast = document.getElementById('toast');

let active = 'html';
let autoRun = true;
let isDark = false;
let saveTimer = null;

const code = {
  html: localStorage.getItem('cp_html') || '',
  css: localStorage.getItem('cp_css') || ''
};

const templates = {
  boilerplate: {
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Project</title>\n</head>\n<body>\n  <h1>Project Title</h1>\n  <p>Start building your layout here.</p>\n</body>\n</html>`,
    css: `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  padding: 2rem;\n  color: #111;\n  background: #fafafa;\n}\n\nh1 {\n  font-size: 2rem;\n  margin-bottom: 0.5rem;\n  color: #2563eb;\n}\n\np {\n  color: #6b7280;\n}`
  },
  card: {
    html: `<div class="card">\n  <div class="card-image"></div>\n  <div class="card-body">\n    <span class="badge">Design</span>\n    <h2>Feature Overview</h2>\n    <p>A clean, minimal card component with hover effects and smooth transitions.</p>\n    <button class="card-btn">Learn More</button>\n  </div>\n</div>`,
    css: `body {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #f0f4ff;\n  font-family: system-ui, sans-serif;\n  margin: 0;\n}\n\n.card {\n  background: #fff;\n  border-radius: 16px;\n  box-shadow: 0 4px 24px rgba(0,0,0,0.08);\n  width: 280px;\n  overflow: hidden;\n  transition: transform 0.25s ease, box-shadow 0.25s ease;\n}\n\n.card:hover {\n  transform: translateY(-6px);\n  box-shadow: 0 12px 40px rgba(37,99,235,0.15);\n}\n\n.card-image {\n  height: 140px;\n  background: linear-gradient(135deg, #2563eb, #7c3aed);\n}\n\n.card-body {\n  padding: 20px;\n}\n\n.badge {\n  display: inline-block;\n  background: #eff6ff;\n  color: #2563eb;\n  font-size: 11px;\n  font-weight: 700;\n  padding: 3px 10px;\n  border-radius: 100px;\n  letter-spacing: 0.5px;\n  text-transform: uppercase;\n  margin-bottom: 10px;\n}\n\nh2 {\n  font-size: 18px;\n  margin-bottom: 8px;\n  color: #111;\n}\n\np {\n  color: #6b7280;\n  font-size: 14px;\n  line-height: 1.6;\n  margin-bottom: 16px;\n}\n\n.card-btn {\n  display: inline-flex;\n  padding: 8px 16px;\n  background: #2563eb;\n  color: #fff;\n  border: none;\n  border-radius: 8px;\n  font-size: 13px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n\n.card-btn:hover {\n  background: #1d4ed8;\n}`
  },
  flexbox: {
    html: `<header class="nav">Flexbox Layout</header>\n<main class="grid">\n  <aside class="sidebar">\n    <h3>Sidebar</h3>\n    <nav>\n      <a href="#">Dashboard</a>\n      <a href="#">Projects</a>\n      <a href="#">Analytics</a>\n      <a href="#">Settings</a>\n    </nav>\n  </aside>\n  <section class="content">\n    <h1>Main Content</h1>\n    <p>A classic sidebar and content layout built with Flexbox.</p>\n    <div class="cards">\n      <div class="mini-card">Revenue</div>\n      <div class="mini-card">Growth</div>\n      <div class="mini-card">Goals</div>\n    </div>\n  </section>\n</main>`,
    css: `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  min-height: 100vh;\n}\n\n.nav {\n  background: #2563eb;\n  color: white;\n  padding: 14px 20px;\n  font-weight: 700;\n  font-size: 15px;\n}\n\n.grid {\n  display: flex;\n  min-height: calc(100vh - 48px);\n}\n\n.sidebar {\n  width: 180px;\n  background: #fff;\n  border-right: 1px solid #e2e8f0;\n  padding: 20px 12px;\n  flex-shrink: 0;\n}\n\n.sidebar h3 {\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 1px;\n  color: #94a3b8;\n  margin-bottom: 12px;\n  padding-left: 8px;\n}\n\n.sidebar nav {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.sidebar a {\n  display: block;\n  padding: 8px;\n  border-radius: 6px;\n  color: #374151;\n  text-decoration: none;\n  font-size: 13px;\n  font-weight: 500;\n  transition: all 0.15s;\n}\n\n.sidebar a:hover {\n  background: #eff6ff;\n  color: #2563eb;\n}\n\n.content {\n  flex: 1;\n  padding: 24px;\n}\n\n.content h1 {\n  font-size: 22px;\n  color: #111;\n  margin-bottom: 8px;\n}\n\n.content p {\n  color: #6b7280;\n  margin-bottom: 20px;\n  font-size: 14px;\n}\n\n.cards {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n\n.mini-card {\n  flex: 1;\n  min-width: 80px;\n  background: #fff;\n  border: 1px solid #e2e8f0;\n  border-radius: 10px;\n  padding: 16px;\n  text-align: center;\n  font-weight: 600;\n  font-size: 14px;\n  box-shadow: 0 2px 8px rgba(0,0,0,0.04);\n}`
  },
  animation: {
    html: `<div class="scene">\n  <div class="orb orb-1"></div>\n  <div class="orb orb-2"></div>\n  <div class="orb orb-3"></div>\n  <div class="label">CSS Animations</div>\n</div>`,
    css: `body {\n  margin: 0;\n  background: #0f172a;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  overflow: hidden;\n  font-family: system-ui, sans-serif;\n}\n\n.scene {\n  position: relative;\n  width: 260px;\n  height: 260px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.orb {\n  position: absolute;\n  border-radius: 50%;\n  filter: blur(2px);\n  opacity: 0.85;\n  animation: float 5s ease-in-out infinite alternate;\n}\n\n.orb-1 {\n  width: 160px;\n  height: 160px;\n  background: radial-gradient(circle at 30% 30%, #60a5fa, #2563eb);\n  top: 10px;\n  left: 20px;\n}\n\n.orb-2 {\n  width: 120px;\n  height: 120px;\n  background: radial-gradient(circle at 30% 30%, #f472b6, #db2777);\n  bottom: 20px;\n  right: 10px;\n  animation-duration: 6.4s;\n}\n\n.orb-3 {\n  width: 90px;\n  height: 90px;\n  background: radial-gradient(circle at 30% 30%, #facc15, #ea580c);\n  top: 40px;\n  right: 30px;\n  animation-duration: 4.4s;\n}\n\n.label {\n  position: relative;\n  z-index: 1;\n  padding: 12px 18px;\n  border-radius: 999px;\n  background: rgba(15, 23, 42, 0.7);\n  border: 1px solid rgba(255,255,255,0.12);\n  color: white;\n  font-weight: 700;\n  letter-spacing: 0.4px;\n  backdrop-filter: blur(10px);\n}\n\n@keyframes float {\n  from {\n    transform: translateY(-10px) scale(1);\n  }\n\n  to {\n    transform: translateY(14px) scale(1.08);\n  }\n}`
  }
};

function showToast(msg = 'Done!') {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function updateStatusBar() {
  const text = editor.value;
  const lines = text.split('\n').length;
  const chars = text.length;
  lineCount.textContent = lines + (lines === 1 ? ' line' : ' lines');
  charCount.textContent = chars + ' chars';
}

function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  const current = lineNumbers.querySelectorAll('span').length;
  if (lines === current) return;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => `<span>${i + 1}</span>`).join('');
}

function autoResizeEditor() {
  editor.style.height = '96px';
  editor.style.height = `${Math.min(editor.scrollHeight, 240)}px`;
  lineNumbers.style.height = editor.style.height;
}

function syncLineScroll() {
  lineNumbers.scrollTop = editor.scrollTop;
}

function markUnsaved() {
  saveStatus.textContent = '● Unsaved';
  saveStatus.className = 'save-dot unsaved';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(markSaved, 800);
}

function markSaved() {
  saveStatus.textContent = '● Saved';
  saveStatus.className = 'save-dot saved';
}

function loadTab(type) {
  active = type;
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.type === type));
  editor.value = code[type];
  langBadge.textContent = type.toUpperCase();
  updateLineNumbers();
  autoResizeEditor();
  updateStatusBar();
  editor.focus();
}

tabs.forEach(tab => tab.addEventListener('click', () => loadTab(tab.dataset.type)));
loadTab('html');

editor.addEventListener('input', () => {
  code[active] = editor.value;
  localStorage.setItem('cp_' + active, editor.value);
  updateLineNumbers();
  autoResizeEditor();
  updateStatusBar();
  markUnsaved();
  if (autoRun) runCode(active);
});

editor.addEventListener('scroll', syncLineScroll);

editor.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    code[active] = editor.value;
    localStorage.setItem('cp_' + active, editor.value);
    updateLineNumbers();
    autoResizeEditor();
    updateStatusBar();
  }

  if (event.ctrlKey && event.key === 'Enter') runCode('all');
});

function buildSrc() {
  const hasHtml = code.html.trim();
  const hasCss = code.css.trim();

  if (hasHtml) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${code.css}</style></head><body>${code.html}</body></html>`;
  }

  if (hasCss) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${code.css}</style></head><body>
      <div style="padding:1rem;font-family:system-ui,sans-serif">
        <h1>Heading 1</h1><h2>Heading 2</h2><p>Paragraph text. <a href="#">A link</a>. <strong>Bold</strong> and <em>italic</em>.</p>
        <button>Button</button>
        <ul><li>List item one</li><li>List item two</li></ul>
        <input type="text" placeholder="Input field">
      </div>
    </body></html>`;
  }

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>';
}

function runCode(changedType) {
  preview.srcdoc = buildSrc();
}

runBtn.addEventListener('click', () => runCode('all'));

exportBtn.addEventListener('click', () => {
  const blob = new Blob([buildSrc()], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'project.html';
  link.click();
  showToast('Exported!');
});

clearBtn.addEventListener('click', () => {
  if (!confirm(`Clear ${active.toUpperCase()} code?`)) return;
  editor.value = '';
  code[active] = '';
  localStorage.removeItem('cp_' + active);
  updateLineNumbers();
  autoResizeEditor();
  updateStatusBar();
  runCode(active);
  showToast('Cleared!');
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(editor.value)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = editor.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copied!');
    });
});

formatBtn.addEventListener('click', () => {
  const raw = editor.value;
  const formatted = active === 'html' ? formatHTML(raw) : formatCSS(raw);
  editor.value = formatted;
  code[active] = formatted;
  localStorage.setItem('cp_' + active, formatted);
  updateLineNumbers();
  autoResizeEditor();
  updateStatusBar();
  runCode(active);
  showToast('Formatted!');
});

function formatHTML(src) {
  const lines = src.split('\n').map(line => line.trim()).filter(Boolean);
  const out = [];
  let indent = 0;
  const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i;
  const openTag = /^<[^/!][^>]*[^/]>$/;
  const closeTag = /^<\//;

  lines.forEach(line => {
    if (closeTag.test(line)) indent = Math.max(0, indent - 1);
    out.push('  '.repeat(indent) + line);
    if (openTag.test(line) && !voidTags.test(line) && !line.endsWith('/>')) indent++;
  });

  return out.join('\n');
}

function formatCSS(src) {
  return src
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

autoRunBtn.addEventListener('click', () => {
  autoRun = !autoRun;
  autoRunBtn.classList.toggle('active', autoRun);
  showToast(autoRun ? 'Auto-run on' : 'Auto-run off');
});

darkModeBtn.addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.querySelector('.sun-icon').style.display = isDark ? 'none' : '';
  document.querySelector('.moon-icon').style.display = isDark ? '' : 'none';
  localStorage.setItem('cp_dark', isDark ? '1' : '0');
});

if (localStorage.getItem('cp_dark') === '1') {
  isDark = true;
  document.documentElement.setAttribute('data-theme', 'dark');
  document.querySelector('.sun-icon').style.display = 'none';
  document.querySelector('.moon-icon').style.display = '';
}

templatesBtn.addEventListener('click', event => {
  event.stopPropagation();
  templateMenu.classList.toggle('open');
});

document.addEventListener('click', () => templateMenu.classList.remove('open'));

document.querySelectorAll('.dropdown-item[data-tpl]').forEach(item => {
  item.addEventListener('click', () => {
    const template = templates[item.dataset.tpl];
    if (!template) return;

    if (Object.keys(template).some(key => code[key]?.trim())) {
      if (!confirm('Load template? This will replace current code.')) return;
    }

    Object.keys(template).forEach(key => {
      code[key] = template[key];
      localStorage.setItem('cp_' + key, template[key]);
    });

    editor.value = code[active];
    updateLineNumbers();
    autoResizeEditor();
    updateStatusBar();
    runCode('all');
    templateMenu.classList.remove('open');
    showToast('Template loaded!');
  });
});

sizeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sizeBtns.forEach(button => button.classList.remove('active'));
    btn.classList.add('active');
    previewWrap.className = 'preview-frame-wrap';
    const size = btn.dataset.size;
    if (size !== 'full') previewWrap.classList.add(size);
  });
});

fullscreenBtn.addEventListener('click', () => {
  const blob = new Blob([buildSrc()], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
});

updateLineNumbers();
autoResizeEditor();
updateStatusBar();

if (code.html || code.css) {
  runCode('all');
}

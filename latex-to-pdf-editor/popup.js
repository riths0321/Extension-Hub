document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════════════════
  // ELEMENTS
  // ═══════════════════════════════════════════════════════════════════
  const previewArea     = document.getElementById('preview-area');
  const generateBtn     = document.getElementById('generate-btn');
  const downloadBtn     = document.getElementById('download-btn');
  const exportBtn       = document.getElementById('export-btn');
  const clearBtn        = document.getElementById('clear-btn');
  const copyBtn         = document.getElementById('copy-btn');
  const statusMsg       = document.getElementById('status-msg');
  const savePill        = document.getElementById('save-pill');
  const templateSelect  = document.getElementById('template-select');
  const wordCountEl     = document.getElementById('word-count');
  const errPill         = document.getElementById('err-pill');
  const errorDrawer     = document.getElementById('error-drawer');
  const errorList       = document.getElementById('error-list');

  const outlineToggle   = document.getElementById('outline-toggle');
  const historyToggle   = document.getElementById('history-toggle');
  const outlinePanel    = document.getElementById('outline-panel');
  const historyPanel    = document.getElementById('history-panel');
  const outlineList     = document.getElementById('outline-list');
  const historyList     = document.getElementById('history-list');
  const closeOutline    = document.getElementById('close-outline');
  const closeHistory    = document.getElementById('close-history');

  const saveVersionBtn  = document.getElementById('save-version-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const zoomInBtn       = document.getElementById('zoom-in');
  const zoomOutBtn      = document.getElementById('zoom-out');
  const zoomLabelEl     = document.getElementById('zoom-label');

  // Editor placeholder
  const editorPlaceholder = document.querySelector('.editor-placeholder');

  let isGenerated = false;
  let zoomLevel   = 1.0;
  let lastHistorySnapshot = localStorage.getItem('latex_last_history_snapshot') || '';

  // ═══════════════════════════════════════════════════════════════════
  // EDITOR
  // ═══════════════════════════════════════════════════════════════════
  const createEditor = (textarea) => {
    const listeners = { change: [] };

    const emit = (name) => {
      if (!listeners[name]) return;
      listeners[name].forEach((listener) => listener(editor));
    };

    // Toggle placeholder visibility
    const togglePlaceholder = () => {
      if (editorPlaceholder) {
        if (textarea.value.trim() === '') {
          editorPlaceholder.classList.remove('hidden');
        } else {
          editorPlaceholder.classList.add('hidden');
        }
      }
    };

    textarea.addEventListener('input', () => {
      togglePlaceholder();
      emit('change');
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = `${value.slice(0, start)}  ${value.slice(end)}`;
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      togglePlaceholder();
      emit('change');
    });

    const editor = {
      getValue: () => textarea.value,
      setValue: (value) => {
        textarea.value = value;
        togglePlaceholder();
        emit('change');
      },
      on: (name, listener) => {
        if (listeners[name]) listeners[name].push(listener);
      },
      focus: () => textarea.focus()
    };

    // Initialize placeholder state
    togglePlaceholder();

    return editor;
  };

  const cm = createEditor(document.getElementById('latex-editor'));

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════
  const templates = {
    blank: '',
    'simple-sample': `\\documentclass{article}
\\usepackage{amsmath}

\\title{Simple Sample}
\\author{My Name}
\\date{January 6, 2017}

\\begin{document}

\\maketitle

\\section{Hello World!}

Hello World! Today I am learning \\LaTeX. \\LaTeX{} is a great program for writing math. I can write in line math such as $a^2 + b^2 = c^2$. I can also give equations their own space:

\\begin{equation}
\\gamma^2 + \\theta^2 = \\omega^2
\\end{equation}

If I do not leave any blank lines \\LaTeX{} will continue this text without making it into a new paragraph. Notice how there was no indentation in the text after equation (1). Also notice how even though I hit enter after that sentence and here \\LaTeX{} formats the sentence without any break. Also look how it doesn't matter how many spaces I put between my words.

For a new paragraph I can leave a blank space in my code.

\\end{document}`,
    article: `\\documentclass{article}
\\usepackage{amsmath}

\\title{My Research Paper}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a standard LaTeX article template with full math support.

\\section{Theory}
The quadratic formula is:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]

Where \\$a\\$, \\$b\\$, and \\$c\\$ are coefficients of \\$ax^2 + bx + c = 0\\$.

\\subsection{Euler's Identity}
Perhaps the most beautiful equation in mathematics:
\\[ e^{i\\pi} + 1 = 0 \\]

\\section{Conclusion}
LaTeX makes beautiful documents.

\\end{document}`,
    homework: `\\documentclass{article}
\\usepackage{amsmath}

\\title{Problem Set 1}
\\author{Student Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section*{Problem 1}
Solve for \\$x\\$:
\\[ x^2 - 5x + 6 = 0 \\]

\\textbf{Solution:} Using the quadratic formula:
\\[ x = \\frac{5 \\pm \\sqrt{25 - 24}}{2} = \\frac{5 \\pm 1}{2} \\]
So \\$x = 3\\$ or \\$x = 2\\$.

\\section*{Problem 2}
Prove that \\$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\\$.

\\end{document}`,
    resume: `\\documentclass{article}

\\begin{document}

\\section*{John Doe}
Software Engineer | john@example.com | github.com/johndoe

\\section*{Experience}

\\resumeSubheading{Senior Developer}{New York, NY}{Acme Corp}{2021 -- Present}
\\resumeItemListStart
  \\resumeItem{Led development of microservices handling 10M+ daily requests}
  \\resumeItem{Reduced deployment time by 40\\% through CI/CD pipeline improvements}
\\resumeItemListEnd

\\resumeSubheading{Junior Developer}{Boston, MA}{StartupXYZ}{2019 -- 2021}
\\resumeItemListStart
  \\resumeItem{Built RESTful APIs using Node.js and PostgreSQL}
  \\resumeItem{Contributed to open-source projects with 500+ GitHub stars}
\\resumeItemListEnd

\\section*{Education}
\\resumeSubheading{B.S. Computer Science}{MIT}{GPA: 3.9}{2015 -- 2019}

\\section*{Skills}
JavaScript, TypeScript, React, Node.js, Python, Docker, Kubernetes

\\end{document}`,
    beamer: `\\documentclass{article}

\\title{My Presentation}
\\author{Speaker Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section*{Introduction}
Welcome to this presentation on modern mathematics.

\\begin{itemize}
  \\item First key point about the topic
  \\item Second important observation
  \\item Third takeaway for the audience
\\end{itemize}

\\section*{Key Result}
The energy-mass equivalence:
\\[ E = mc^2 \\]

Where \\$E\\$ is energy, \\$m\\$ is mass, and \\$c\\$ is the speed of light.

\\section*{Conclusion}
\\begin{center}
\\textbf{Thank you for your attention!}
\\end{center}

\\end{document}`,
    letter: `\\documentclass{article}

\\begin{document}

\\begin{center}
\\textbf{\\Large John Doe}\\\\
123 Main Street, City, State 12345\\\\
john@example.com | (555) 123-4567
\\end{center}

\\today

Hiring Manager\\\\
Company Name

Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position. With over five years of experience in full-stack development, I am confident in my ability to contribute meaningfully to your team.

In my current role, I have led the development of scalable microservices and mentored junior engineers. I am passionate about writing clean, maintainable code and solving complex technical challenges.

I would welcome the opportunity to discuss how my skills align with your needs.

Sincerely,\\\\
\\textbf{John Doe}

\\end{document}`
  };

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════
  const setStatus = (text, type = '') => {
    statusMsg.textContent = text;
    statusMsg.className = 'status-area' + (type ? ` ${type}` : '');
  };

  const escHtml = (t) => t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const sanitizeToBody = (str) => {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    doc.querySelectorAll('script').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase(), v = a.value;
        if (n.startsWith('on') || n==='style' ||
            (n==='href'&&v.startsWith('javascript:')) ||
            (n==='src'&&v.startsWith('javascript:'))) el.removeAttribute(a.name);
      });
    });
    return doc.body;
  };

  const replaceWithSanitizedHtml = (container, html) => {
    const safeBody = sanitizeToBody(html);
    const nodes = [...safeBody.childNodes].map((node) => node.cloneNode(true));
    container.replaceChildren(...nodes);
  };

  const normalizePreviewHtml = (html) => {
    const safeHtml = (html || '').trim();
    if (!safeHtml) {
      return '<p>Nothing to preview yet.</p>';
    }

    if (/<(h[1-6]|div|ul|ol|li|p|blockquote|hr)/i.test(safeHtml)) {
      return safeHtml;
    }

    return safeHtml
      .split(/\n\s*\n/)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('');
  };

  const createDiv = (className, text) => {
    const el = document.createElement('div');
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const setPreviewPlaceholder = () => {
    const wrapper = createDiv('placeholder-msg');
    wrapper.append(
      createDiv('ph-glyph', '∫'),
      createDiv('ph-text', 'Live preview appears here'),
      createDiv('ph-hint', 'Choose a template or start typing in the editor')
    );
    previewArea.replaceChildren(wrapper);
  };

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; };

  // ═══════════════════════════════════════════════════════════════════
  // ZOOM
  // ═══════════════════════════════════════════════════════════════════
  const applyZoom = () => {
    const el = previewArea.querySelector('.paper-preview');
    if (el) el.style.transform = `scale(${zoomLevel})`;
    zoomLabelEl.textContent = `${Math.round(zoomLevel*100)}%`;
  };
  zoomInBtn.addEventListener('click', () => { zoomLevel = Math.min(zoomLevel+0.1, 2.0); applyZoom(); });
  zoomOutBtn.addEventListener('click',() => { zoomLevel = Math.max(zoomLevel-0.1, 0.4); applyZoom(); });

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // ERROR DETECTION
  // ═══════════════════════════════════════════════════════════════════
  const detectErrors = (latex) => {
    const errs = [];
    const begins = [...latex.matchAll(/\\begin\{([^}]+)\}/g)].map(m=>m[1]);
    const ends   = [...latex.matchAll(/\\end\{([^}]+)\}/g)].map(m=>m[1]);
    begins.forEach(env => { if (!ends.includes(env)) errs.push(`\\begin{${env}} missing \\end{${env}}`); });
    let b = 0; for (const c of latex) { if(c==='{')b++; if(c==='}')b--; }
    if (b > 0) errs.push(`${b} unclosed brace${b>1?'s':''} { detected`);
    if (b < 0) errs.push(`${Math.abs(b)} extra closing brace${Math.abs(b)>1?'s':''} } detected`);
    if (!latex.includes('\\begin{document}')) errs.push('Missing \\begin{document}');
    if (!latex.includes('\\end{document}'))   errs.push('Missing \\end{document}');
    const body = latex.replace(/\\begin\{document\}([\s\S]*?)\\end\{document\}/, '$1');
    const dolls = (body.match(/(?<!\\)\$/g)||[]).length;
    if (dolls % 2 !== 0) errs.push('Unmatched $ — possible unclosed inline math');
    return errs;
  };

  const showErrors = (errs) => {
    if (errs.length === 0) {
      errorDrawer.classList.add('hidden');
      errPill.classList.add('hidden');
      errorList.replaceChildren();
      return;
    }
    errorDrawer.classList.remove('hidden');
    errPill.classList.remove('hidden');
    errPill.textContent = `${errs.length} issue${errs.length>1?'s':''}`;
    errorList.replaceChildren(
      ...errs.map((err) => {
        const item = document.createElement('li');
        item.textContent = `▸ ${err}`;
        return item;
      })
    );
  };
  errPill.addEventListener('click', () => errorDrawer.classList.toggle('hidden'));

  // ═══════════════════════════════════════════════════════════════════
  // OUTLINE
  // ═══════════════════════════════════════════════════════════════════
  const buildOutline = (latex) => {
    const all = [];
    const pats = [
      { re: /\\section\*?\{([^}]+)\}/g,        level: 'section',        glyph: '§' },
      { re: /\\subsection\*?\{([^}]+)\}/g,     level: 'subsection',     glyph: '›' },
      { re: /\\subsubsection\*?\{([^}]+)\}/g,  level: 'subsubsection',  glyph: '·' }
    ];
    pats.forEach(({ re, level, glyph }) => {
      let m; const r = new RegExp(re.source, 'g');
      while ((m = r.exec(latex)) !== null) all.push({ level, title: m[1], pos: m.index, glyph });
    });
    all.sort((a,b)=>a.pos-b.pos);
    if (all.length === 0) {
      const empty = createDiv('outline-empty');
      empty.append('No \\section commands found.', document.createElement('br'), 'Add sections and regenerate.');
      outlineList.replaceChildren(empty);
      return;
    }
    outlineList.replaceChildren(
      ...all.map((item) => {
        const row = createDiv(`outline-item level-${item.level}`);
        row.title = item.title;
        const glyph = createDiv('og', item.glyph);
        row.append(glyph, document.createTextNode(item.title));
        return row;
      })
    );
  };

  outlineToggle.addEventListener('click', () => {
    const isHidden = outlinePanel.classList.toggle('hidden');
    outlineToggle.classList.toggle('active', !isHidden);
    if (!isHidden) buildOutline(cm.getValue());
  });
  closeOutline.addEventListener('click', () => { outlinePanel.classList.add('hidden'); outlineToggle.classList.remove('active'); });

  // ═══════════════════════════════════════════════════════════════════
  // VERSION HISTORY
  // ═══════════════════════════════════════════════════════════════════
  const getVersions  = () => JSON.parse(localStorage.getItem('latex_versions') || '[]');
  const saveVersions = (v) => localStorage.setItem('latex_versions', JSON.stringify(v));
  const rememberLatestSnapshot = (content) => {
    lastHistorySnapshot = content;
    localStorage.setItem('latex_last_history_snapshot', content);
  };

  const persistVersion = (content, label, showStatusMessage = true) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    if (trimmed === lastHistorySnapshot) return false;

    const versions = getVersions();
    versions.unshift({
      label,
      date: new Date().toLocaleString(),
      words: trimmed.split(/\s+/).length,
      content: trimmed
    });
    if (versions.length > 20) versions.pop();
    saveVersions(versions);
    rememberLatestSnapshot(trimmed);
    if (!historyPanel.classList.contains('hidden')) renderHistory();
    if (showStatusMessage) setStatus('Version saved!', 'ok');
    return true;
  };

  const renderHistory = () => {
    const versions = getVersions();
    if (versions.length === 0) {
      const empty = createDiv('history-empty');
      empty.append('No saved versions yet.', document.createElement('br'), 'Click "Save Version" to snapshot your work.');
      historyList.replaceChildren(empty);
      return;
    }
    const items = versions.map((v, i) => {
      const wrapper = createDiv('hist-item');
      wrapper.append(
        createDiv('hist-label', v.label),
        createDiv('hist-meta', `${v.date} · ${v.words}w`)
      );

      const actions = createDiv('hist-btns');
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'hist-btn restore';
      restoreBtn.type = 'button';
      restoreBtn.textContent = 'Restore';
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const version = getVersions()[i];
        if (!version) return;
        if (!confirm('Restore this version? Current content will be replaced.')) return;
        cm.setValue(version.content);
        setStatus('Version restored.', 'ok');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'hist-btn del';
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vs = getVersions();
        vs.splice(i, 1);
        saveVersions(vs);
        renderHistory();
      });

      actions.append(restoreBtn, deleteBtn);
      wrapper.append(actions);
      return wrapper;
    });
    historyList.replaceChildren(...items);
  };

  saveVersionBtn.addEventListener('click', () => {
    const content = cm.getValue().trim();
    if (!content) { setStatus('Nothing to save.', 'err'); return; }
    const label = prompt('Label this version:', `v${getVersions().length+1} — ${new Date().toLocaleTimeString()}`);
    if (label === null) return;
    if (!persistVersion(content, label || `Version ${getVersions().length+1}`)) {
      setStatus('No changes since the last saved version.', '');
    }
  });

  clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('Delete all saved versions?')) return;
    localStorage.removeItem('latex_versions');
    localStorage.removeItem('latex_last_history_snapshot');
    lastHistorySnapshot = '';
    renderHistory();
  });

  historyToggle.addEventListener('click', () => {
    const isHidden = historyPanel.classList.toggle('hidden');
    historyToggle.classList.toggle('active', !isHidden);
    if (!isHidden) renderHistory();
  });
  closeHistory.addEventListener('click', () => { historyPanel.classList.add('hidden'); historyToggle.classList.remove('active'); });

  const autoSnapshotHistory = debounce((src) => {
    const trimmed = src.trim();
    if (!trimmed) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    persistVersion(trimmed, `Auto snapshot • ${timestamp}`, false);
  }, 12000);

  // ═══════════════════════════════════════════════════════════════════
  // LATEX → HTML PARSER
  // ═══════════════════════════════════════════════════════════════════
  const replaceMacro = (text, cmd, argc, fn) => {
    let out = '', p = 0;
    while (true) {
      const idx = text.indexOf(cmd, p);
      if (idx === -1) { out += text.slice(p); break; }
      out += text.slice(p, idx);
      let cur = idx + cmd.length, args = [], ok = true;
      for (let i = 0; i < argc; i++) {
        while (cur < text.length && /\s/.test(text[cur])) cur++;
        if (cur >= text.length || text[cur] !== '{') { ok = false; break; }
        let bc = 1, is = cur+1, ie = is;
        while (ie < text.length && bc > 0) { if(text[ie]==='{')bc++; else if(text[ie]==='}')bc--; ie++; }
        if (bc === 0) { args.push(text.slice(is, ie-1)); cur = ie; }
        else { ok = false; break; }
      }
      if (ok) { out += fn(...args.map(a => parseLatexToHtml(a))); p = cur; }
      else { out += text.slice(idx, idx+cmd.length); p = idx+cmd.length; }
    }
    return out;
  };

  const renderKatex = (html) => {
    const formatMathFallback = (expr) => {
      const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ', 'i': 'ⁱ'
      };

      const greekMap = {
        '\\alpha': 'alpha',
        '\\beta': 'beta',
        '\\gamma': 'gamma',
        '\\theta': 'theta',
        '\\omega': 'omega',
        '\\pi': 'pi',
        '\\phi': 'phi',
        '\\lambda': 'lambda',
        '\\mu': 'mu',
        '\\sigma': 'sigma'
      };

      let out = expr.trim();
      Object.entries(greekMap).forEach(([latex, text]) => {
        out = out.replaceAll(latex, text);
      });

      out = out
        .replace(/\\LaTeX\s*\{\}/g, 'LaTeX')
        .replace(/\\LaTeX/g, 'LaTeX')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
        .replace(/\\pm/g, '+/-')
        .replace(/\\cdot/g, '·')
        .replace(/\\sum/g, 'sum')
        .replace(/\\to/g, '->')
        .replace(/\^\{([^}]+)\}/g, (_, value) => value.split('').map((ch) => superscriptMap[ch] || ch).join(''))
        .replace(/\^([A-Za-z0-9+\-=])/g, (_, value) => superscriptMap[value] || value)
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return out;
    };

    if (typeof katex === 'undefined') {
      return html
        .replace(/DMATH_S([\s\S]*?)DMATH_E/g, (_, e) => `<div class="math-display">${escHtml(formatMathFallback(e))}</div>`)
        .replace(/IMATH_S([\s\S]*?)IMATH_E/g, (_, e) => `<span class="math-inline">${escHtml(formatMathFallback(e))}</span>`);
    }
    html = html.replace(/DMATH_S([\s\S]*?)DMATH_E/g, (_, e) => {
      try { return katex.renderToString(e.trim(), { displayMode: true, throwOnError: false }); }
      catch { return `<div style="font-style:italic;text-align:center;padding:10px">${escHtml(e)}</div>`; }
    });
    html = html.replace(/IMATH_S([\s\S]*?)IMATH_E/g, (_, e) => {
      try { return katex.renderToString(e.trim(), { displayMode: false, throwOnError: false }); }
      catch { return `<em>${escHtml(e)}</em>`; }
    });
    return html;
  };

  const parseLatexToHtml = (src) => {
    let title = '', author = '', date = '';
    const tm = src.match(/\\title\{([^}]+)\}/);   if (tm) title  = tm[1];
    const am = src.match(/\\author\{([^}]+)\}/);  if (am) author = am[1];
    const dm = src.match(/\\date\{([^}]+)\}/);    if (dm) { date = dm[1]; if(date==='\\today'){const d=new Date();const M=['January','February','March','April','May','June','July','August','September','October','November','December'];date=`${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;} }

    let body = src;
    const bi = body.indexOf('\\begin{document}');
    if (bi !== -1) body = body.substring(bi + 16);
    const ei = body.lastIndexOf('\\end{document}');
    if (ei !== -1) body = body.substring(0, ei);

    body = body.replace(/\\title\{[^}]*\}/g,'').replace(/\\author\{[^}]*\}/g,'').replace(/\\date\{[^}]*\}/g,'');
    body = body.replace(/%.*$/gm, ''); // strip comments

    if (body.includes('\\maketitle')) {
      let blk = '';
      if (title||author||date) {
        blk = '<div class="title-block">';
        if (title)  blk += `<div class="title-h1">${title}</div>`;
        if (author) blk += `<div class="title-author">${author}</div>`;
        if (date)   blk += `<div class="title-date">${date}</div>`;
        blk += '</div>';
      }
      body = body.replace(/\\maketitle/g, blk);
    }

    // Protect math with placeholders BEFORE any other replacements
    body = body.replace(/\\\[([\s\S]*?)\\\]/g,     (_, e) => `DMATH_S${e}DMATH_E`);
    body = body.replace(/\$\$([\s\S]*?)\$\$/g,     (_, e) => `DMATH_S${e}DMATH_E`);
    body = body.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, e) => `DMATH_S${e}DMATH_E`);
    body = body.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,       (_, e) => `DMATH_S${e}DMATH_E`);
    body = body.replace(/(?<!\\)\$((?:[^$\\]|\\.)*?)(?<!\\)\$/g, (_, e) => `IMATH_S${e}IMATH_E`);

    // Cleanup
    body = body.replace(/\\centering/g, '').replace(/\\hfill/g, '').replace(/\\,/g,' ');
    body = body.replace(/\\vspace\{[^}]*\}/g,'<br>').replace(/\\hspace\{[^}]*\}/g,' ');
    body = body.replace(/\\newline/g,'<br>').replace(/\\pagebreak/g,'<hr style="border:none;border-top:1px dashed #CCC;margin:16px 0">');
    body = body.replace(/\\today/g, new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));

    // Macros
    body = replaceMacro(body,'\\resumeSubheading',4,(a,b,c,d)=>`<div class="resume-subheading"><div class="rs-row"><strong>${a}</strong><span>${b}</span></div><div class="rs-row"><em>${c}</em><em>${d}</em></div></div>`);
    body = replaceMacro(body,'\\resumeProjectHeading',2,(a,b)=>`<div class="resume-project"><div class="rs-row"><span>${a}</span><span>${b}</span></div></div>`);
    body = replaceMacro(body,'\\resumeItem',1, t=>`<li>${t}</li>`);
    body = replaceMacro(body,'\\textbf',  1, t=>`<strong>${t}</strong>`);
    body = replaceMacro(body,'\\textit',  1, t=>`<em>${t}</em>`);
    body = replaceMacro(body,'\\underline',1,t=>`<u>${t}</u>`);
    body = replaceMacro(body,'\\emph',    1, t=>`<em>${t}</em>`);
    body = replaceMacro(body,'\\textsc',  1, t=>`<span class="small-caps">${t}</span>`);
    body = replaceMacro(body,'\\href',    2, (u,t)=>`<a href="${escHtml(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`);
    body = replaceMacro(body,'\\section*',    1, t=>`<h2>${t}</h2>`);
    body = replaceMacro(body,'\\section',     1, t=>`<h2>${t}</h2>`);
    body = replaceMacro(body,'\\subsection*', 1, t=>`<h3>${t}</h3>`);
    body = replaceMacro(body,'\\subsection',  1, t=>`<h3>${t}</h3>`);
    body = replaceMacro(body,'\\subsubsection*',1,t=>`<h4>${t}</h4>`);
    body = replaceMacro(body,'\\subsubsection', 1,t=>`<h4>${t}</h4>`);
    body = replaceMacro(body,'\\textcolor',2,(c,t)=>`<span style="color:${escHtml(c)}">${t}</span>`);

    // Environments
    body = body.replace(/\\begin\{itemize\}(\[.*?\])?/g,'<ul>').replace(/\\end\{itemize\}/g,'</ul>');
    body = body.replace(/\\begin\{enumerate\}(\[.*?\])?/g,'<ol>').replace(/\\end\{enumerate\}/g,'</ol>');
    body = body.replace(/\\resumeSubHeadingListStart/g,'<ul class="resume-list">').replace(/\\resumeSubHeadingListEnd/g,'</ul>');
    body = body.replace(/\\resumeItemListStart/g,'<ul>').replace(/\\resumeItemListEnd/g,'</ul>');
    body = body.replace(/\\item(?![a-zA-Z])/g,'<li>');
    body = body.replace(/\\begin\{center\}/g,'<div class="center-env">').replace(/\\end\{center\}/g,'</div>');
    body = body.replace(/\\begin\{abstract\}/g,'<div class="abstract"><strong>Abstract.</strong> ').replace(/\\end\{abstract\}/g,'</div>');

    // Font sizes
    body = body.replace(/\\Huge\s*/g,'<span class="text-huge">').replace(/\\large\s*/g,'<span class="text-large">').replace(/\\small\s*/g,'<span class="text-small">').replace(/\\scshape\s*/g,'');

    // Cleanup leftovers
    body = body.replace(/\\\\/g,'<br>');
    body = body.replace(/\\(?!DMATH|IMATH)[a-zA-Z]+/g,'');
    body = body.replace(/[{}]/g,'');
    body = body.replace(/\n{3,}/g,'\n\n');
    body = body.replace(/\n\n/g,'</p><p>');

    // Render math
    body = renderKatex(body);
    return body;
  };

  const buildPreviewMarkup = (src) => {
    const parsedHtml = parseLatexToHtml(src);
    return `<div class="paper-preview">${normalizePreviewHtml(parsedHtml)}</div>`;
  };

  const decoratePreviewDocument = (container) => {
    const preview = container.querySelector('.paper-preview');
    if (!preview) return;

    let sectionNumber = 0;
    let equationNumber = 0;

    preview.querySelectorAll('h2').forEach((heading) => {
      if (heading.dataset.numbered === 'true') return;
      sectionNumber += 1;
      heading.dataset.numbered = 'true';
      const label = document.createElement('span');
      label.className = 'section-number';
      label.textContent = `${sectionNumber} `;
      heading.prepend(label);
    });

    preview.querySelectorAll('.math-display').forEach((equation) => {
      if (equation.querySelector('.eq-number')) return;
      equationNumber += 1;
      const number = document.createElement('span');
      number.className = 'eq-number';
      number.textContent = `(${equationNumber})`;
      equation.append(number);
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  const renderLogic = (src) => {
    if (!src.trim()) {
      setPreviewPlaceholder();
      downloadBtn.disabled = true;
      isGenerated = false;
      return;
    }
    try {
      const previewMarkup = buildPreviewMarkup(src);
      replaceWithSanitizedHtml(previewArea, previewMarkup);
      decoratePreviewDocument(previewArea);
      applyZoom();
      downloadBtn.disabled = false;
      isGenerated = true;
      const txt = previewArea.innerText.replace(/\s+/g,' ').trim();
      wordCountEl.textContent = txt ? `${txt.split(' ').filter(w=>w).length}w` : '0w';
      if (!outlinePanel.classList.contains('hidden')) buildOutline(src);
    } catch(e) {
      console.error('Render error:', e);
      setPreviewPlaceholder();
      downloadBtn.disabled = true;
      isGenerated = false;
      setStatus('Preview failed to render. Check your LaTeX and try again.', 'err');
    }
  };

  const handleLivePreview = debounce((src) => {
    renderLogic(src);
    showErrors(detectErrors(src));
  }, 550);

  const handleAutoSave = debounce((src) => {
    localStorage.setItem('latex_autosave', src);
    savePill.classList.add('visible');
    setTimeout(() => savePill.classList.remove('visible'), 1800);
  }, 700);

  cm.on('change', inst => {
    const src = inst.getValue();
    handleLivePreview(src);
    handleAutoSave(src);
    autoSnapshotHistory(src);
    wordCountEl.textContent = src.trim() ? `${src.trim().split(/\s+/).length}w` : '0w';
  });

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE SELECT
  // ═══════════════════════════════════════════════════════════════════
  templateSelect.addEventListener('change', e => {
    const key = e.target.value;
    if (templates[key] !== undefined) {
      if (cm.getValue().trim() && !confirm('Overwrite current content?')) { e.target.value=''; return; }
      cm.setValue(templates[key]);
      localStorage.setItem('latex_autosave', templates[key]);
      e.target.value = '';
      cm.focus();
      setTimeout(() => renderLogic(cm.getValue()), 80);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // BUTTONS
  // ═══════════════════════════════════════════════════════════════════
  generateBtn.addEventListener('click', () => {
    const src = cm.getValue().trim();
    if (!src) { setStatus('Please enter some LaTeX.', 'err'); return; }
    setStatus('Rendering…');
    generateBtn.disabled = true;
    setTimeout(() => {
      try {
        const errs = detectErrors(src);
        showErrors(errs);
        renderLogic(src);
        setStatus(errs.length ? `Preview ready — ${errs.length} issue${errs.length>1?'s':''}` : 'Preview generated.', errs.length ? '' : 'ok');
      } catch(e) { setStatus('Render error.', 'err'); }
      finally { generateBtn.disabled = false; }
    }, 350);
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear everything?')) return;
    cm.setValue('');
    localStorage.removeItem('latex_autosave');
    setPreviewPlaceholder();
    setStatus('Workspace cleared. Start typing to rebuild the preview.');
    downloadBtn.disabled = true;
    isGenerated = false;
    wordCountEl.textContent = '0w';
    errorDrawer.classList.add('hidden');
    errPill.classList.add('hidden');
  });

  exportBtn.addEventListener('click', () => {
    const src = cm.getValue();
    if (!src) { setStatus('Nothing to export.', 'err'); return; }
    const url = URL.createObjectURL(new Blob([src], { type:'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'document.tex' });
    a.click(); URL.revokeObjectURL(url);
    setStatus('Exported document.tex', 'ok');
  });

  copyBtn.addEventListener('click', async () => {
    if (!isGenerated) { setStatus('Generate a preview first.', 'err'); return; }
    const previewNode = previewArea.querySelector('.paper-preview');
    const content = previewNode ? previewNode.outerHTML : previewArea.innerHTML;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':  new Blob([content],            { type:'text/html' }),
        'text/plain': new Blob([previewArea.innerText],{ type:'text/plain' })
      })]);
      setStatus('Copied! Paste into Word or Google Docs.', 'ok');
    } catch { setStatus('Copy failed — try Ctrl+A, Ctrl+C in the preview.', 'err'); }
  });

  downloadBtn.addEventListener('click', () => {
    if (!isGenerated) return;
    const el = previewArea.querySelector('.paper-preview');
    if (!el) return;
    localStorage.setItem('latex_print_content', el.outerHTML);
    const printUrl = chrome.runtime.getURL('print.html');
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: printUrl });
    } else {
      window.open(printUrl, '_blank', 'noopener');
    }
    setStatus('Select "Save as PDF" in the print tab.', 'ok');
  });

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  setStatus('Ready. Type in the editor and the preview updates automatically.');

  const savedContent = localStorage.getItem('latex_autosave');
  if (savedContent) {
    cm.setValue(savedContent);
    setStatus('Last session restored.');
    setTimeout(() => { renderLogic(savedContent); showErrors(detectErrors(savedContent)); }, 300);
  } else {
    setPreviewPlaceholder();
  }

  const existingVersions = getVersions();
  if (existingVersions.length > 0 && !lastHistorySnapshot) {
    rememberLatestSnapshot(existingVersions[0].content || '');
  }

  renderHistory();
});

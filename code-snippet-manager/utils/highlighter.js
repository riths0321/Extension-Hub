/**
 * SnipVault – Lightweight CSP-Safe Syntax Highlighter
 * No innerHTML. Uses DOM API exclusively. No external deps.
 * Supports: JS, Python, HTML, CSS, SQL, Java, C++, PHP, Rust, Go, Bash, JSON
 */

const Highlighter = (() => {
  const LANGUAGES = {
    javascript: {
      keywords: /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|null|true|false|undefined)\b/g,
      strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/g,
      functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    },
    python: {
      keywords: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g,
      strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      comments: /(#[^\n]*)/g,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
    },
    sql: {
      keywords: /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|COLUMN|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|AND|OR|IN|LIKE|BETWEEN|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MAX|MIN|UNION|ALL|EXISTS|CASE|WHEN|THEN|ELSE|END|WITH|RETURNING|TRUNCATE|CASCADE)\b/gi,
      strings: /('(?:[^'\\]|\\.)*')/g,
      comments: /(--[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*)\b/g,
    },
    html: null, // handled separately
    css: null,  // handled separately
    json: null, // handled separately
    bash: {
      keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|readonly|declare|source|echo|exit|break|continue|shift|set|unset|trap|exec|eval|true|false|null)\b/g,
      strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(#[^\n]*)/g,
      numbers: /\b(\d+)\b/g,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\)/g,
    },
    rust: {
      keywords: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
      strings: /(r#?"(?:[^"\\]|\\.)*"#?|'(?:[^'\\]|\\.)*')/g,
      comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*(?:_\d+)*(?:u8|u16|u32|u64|i8|i16|i32|i64|f32|f64|usize|isize)?)\b/g,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
    },
    go: {
      keywords: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|nil|true|false)\b/g,
      strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
    },
    java: {
      keywords: /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|null|true|false)\b/g,
      strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*[LlFf]?)\b/g,
      functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    },
    cpp: {
      keywords: /\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/g,
      strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*(?:f|u|ul|ull|l|ll)?)\b/gi,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
    },
    php: {
      keywords: /\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|null|true|false)\b/gi,
      strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
      comments: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
    },
    plaintext: null
  };

  // Token types in priority order
  const TOKEN_COMMENT = 'comment';
  const TOKEN_STRING = 'string';
  const TOKEN_KEYWORD = 'keyword';
  const TOKEN_NUMBER = 'number';
  const TOKEN_FUNCTION = 'function';
  const TOKEN_PLAIN = 'plain';

  function escapeForDOM(text) {
    // We build DOM nodes directly — no escaping needed for textContent
    return text;
  }

  /**
   * Tokenize code into [{type, value}] array
   */
  function tokenize(code, lang) {
    if (!code) return [{ type: TOKEN_PLAIN, value: '' }];

    const rules = LANGUAGES[lang];
    if (!rules) {
      if (lang === 'html') return tokenizeHTML(code);
      if (lang === 'css') return tokenizeCSS(code);
      if (lang === 'json') return tokenizeJSON(code);
      return [{ type: TOKEN_PLAIN, value: code }];
    }

    const tokens = [];
    let remaining = code;

    while (remaining.length > 0) {
      let earliest = null;
      let earliestType = null;
      let earliestMatch = null;

      const tryRule = (type, regex) => {
        if (!regex) return;
        regex.lastIndex = 0;
        const m = regex.exec(remaining);
        if (m && (earliest === null || m.index < earliest)) {
          earliest = m.index;
          earliestType = type;
          earliestMatch = m[0];
        }
      };

      tryRule(TOKEN_COMMENT, rules.comments);
      tryRule(TOKEN_STRING, rules.strings);
      tryRule(TOKEN_KEYWORD, rules.keywords);
      tryRule(TOKEN_NUMBER, rules.numbers);
      tryRule(TOKEN_FUNCTION, rules.functions);

      if (earliest === null) {
        tokens.push({ type: TOKEN_PLAIN, value: remaining });
        break;
      }

      if (earliest > 0) {
        tokens.push({ type: TOKEN_PLAIN, value: remaining.slice(0, earliest) });
      }

      tokens.push({ type: earliestType, value: earliestMatch });
      remaining = remaining.slice(earliest + earliestMatch.length);
    }

    return tokens.length ? tokens : [{ type: TOKEN_PLAIN, value: code }];
  }

  function tokenizeJSON(code) {
    const tokens = [];
    const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(true|false|null)|\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/g;
    let lastIdx = 0;
    let m;
    while ((m = regex.exec(code)) !== null) {
      if (m.index > lastIdx) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx, m.index) });
      if (m[1]) tokens.push({ type: 'json-key', value: m[1] + code.slice(m.index + m[1].length, regex.lastIndex) });
      else if (m[2]) tokens.push({ type: TOKEN_STRING, value: m[2] });
      else if (m[3]) tokens.push({ type: TOKEN_KEYWORD, value: m[3] });
      else if (m[4]) tokens.push({ type: TOKEN_NUMBER, value: m[4] });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < code.length) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx) });
    return tokens;
  }

  function tokenizeHTML(code) {
    const tokens = [];
    const regex = /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)(\/?>)/g;
    let lastIdx = 0;
    let m;
    while ((m = regex.exec(code)) !== null) {
      if (m.index > lastIdx) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx, m.index) });
      if (m[1]) { tokens.push({ type: TOKEN_COMMENT, value: m[1] }); }
      else {
        tokens.push({ type: TOKEN_PLAIN, value: m[2] });
        tokens.push({ type: TOKEN_KEYWORD, value: m[3] });
        if (m[4]) tokens.push({ type: TOKEN_STRING, value: m[4] });
        tokens.push({ type: TOKEN_PLAIN, value: m[5] });
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < code.length) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx) });
    return tokens;
  }

  function tokenizeCSS(code) {
    const tokens = [];
    const regex = /(\/\*[\s\S]*?\*\/)|(["'])(?:(?!\2)[^\\]|\\.)*\2|([.#]?[a-zA-Z-_][a-zA-Z0-9_-]*)\s*\{|([a-zA-Z-]+)\s*(?=:)|\b(\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg)?)\b/g;
    let lastIdx = 0;
    let m;
    while ((m = regex.exec(code)) !== null) {
      if (m.index > lastIdx) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx, m.index) });
      if (m[1]) tokens.push({ type: TOKEN_COMMENT, value: m[1] });
      else if (m[2]) tokens.push({ type: TOKEN_STRING, value: m[0] });
      else if (m[3]) tokens.push({ type: TOKEN_KEYWORD, value: m[0] });
      else if (m[4]) tokens.push({ type: TOKEN_FUNCTION, value: m[4] });
      else if (m[5]) tokens.push({ type: TOKEN_NUMBER, value: m[5] });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < code.length) tokens.push({ type: TOKEN_PLAIN, value: code.slice(lastIdx) });
    return tokens;
  }

  /**
   * Render highlighted code into a <code> DOM element.
   * Uses only textContent + createElement — fully CSP-safe.
   */
  function render(code, lang, container) {
    container.textContent = '';
    const tokens = tokenize(code, lang || 'plaintext');
    tokens.forEach(tok => {
      if (!tok.value) return;
      if (tok.type === TOKEN_PLAIN) {
        container.appendChild(document.createTextNode(tok.value));
        return;
      }
      const span = document.createElement('span');
      span.className = `hl-${tok.type}`;
      span.textContent = tok.value;
      container.appendChild(span);
    });
  }

  return { render, tokenize, detectLanguage: (code) => SnippetService?.detectLanguage(code) || 'plaintext' };
})();

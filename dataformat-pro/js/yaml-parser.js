/**
 * Minimal YAML Parser/Stringifier
 * Self-contained, no external dependencies, CSP-safe
 */
(function(global) {
  'use strict';

  // ── PARSE ──────────────────────────────────────────────────────────────────

  function parseYAML(text) {
    const lines = text.split('\n');
    const result = parseBlock(lines, 0, 0);
    return result.value;
  }

  function parseBlock(lines, startLine, baseIndent) {
    // Determine if this is a sequence or mapping
    let i = startLine;
    while (i < lines.length && isBlankOrComment(lines[i])) i++;
    if (i >= lines.length) return { value: null, nextLine: i };

    const firstLine = lines[i];
    const indent = getIndent(firstLine);

    if (firstLine.trimStart().startsWith('- ') || firstLine.trim() === '-') {
      return parseSequence(lines, i, indent);
    } else if (firstLine.includes(': ') || firstLine.trimEnd().endsWith(':')) {
      return parseMapping(lines, i, indent);
    } else {
      const val = parseScalar(firstLine.trim());
      return { value: val, nextLine: i + 1 };
    }
  }

  function parseSequence(lines, startLine, indent) {
    const arr = [];
    let i = startLine;

    while (i < lines.length) {
      if (isBlankOrComment(lines[i])) { i++; continue; }
      const currIndent = getIndent(lines[i]);
      if (currIndent < indent) break;
      if (currIndent > indent) { i++; continue; }

      const line = lines[i].trim();
      if (!line.startsWith('- ') && line !== '-') break;

      const valueStr = line.startsWith('- ') ? line.slice(2) : '';
      i++;

      if (!valueStr || valueStr.trim() === '') {
        // Next lines are the value
        const sub = parseBlock(lines, i, indent + 2);
        arr.push(sub.value);
        i = sub.nextLine;
      } else if (valueStr.includes(': ') || valueStr.trimEnd().endsWith(':')) {
        // Inline mapping start
        const subLines = [' '.repeat(indent + 2) + valueStr];
        // Collect continuation
        while (i < lines.length && !isBlankOrComment(lines[i]) && getIndent(lines[i]) > indent) {
          subLines.push(lines[i]);
          i++;
        }
        const sub = parseBlock(subLines, 0, indent + 2);
        arr.push(sub.value);
      } else {
        arr.push(parseScalar(valueStr.trim()));
      }
    }

    return { value: arr, nextLine: i };
  }

  function parseMapping(lines, startLine, indent) {
    const obj = {};
    let i = startLine;

    while (i < lines.length) {
      if (isBlankOrComment(lines[i])) { i++; continue; }
      const currIndent = getIndent(lines[i]);
      if (currIndent < indent) break;
      if (currIndent > indent) { i++; continue; }

      const line = lines[i].trim();
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) { i++; continue; }

      const key = unquote(line.slice(0, colonIdx).trim());
      const rest = line.slice(colonIdx + 1).trim();
      i++;

      if (!rest || rest === '|' || rest === '>') {
        // Block scalar or nested
        if (rest === '|' || rest === '>') {
          // Literal/folded block
          const blockLines = [];
          let blockIndent = -1;
          while (i < lines.length) {
            if (isBlankOrComment(lines[i])) { blockLines.push(''); i++; continue; }
            const bi = getIndent(lines[i]);
            if (blockIndent === -1) blockIndent = bi;
            if (bi < blockIndent) break;
            blockLines.push(lines[i].slice(blockIndent));
            i++;
          }
          obj[key] = blockLines.join(rest === '|' ? '\n' : ' ').trim();
        } else {
          const sub = parseBlock(lines, i, indent + 1);
          obj[key] = sub.value;
          i = sub.nextLine;
        }
      } else if (rest.startsWith('[')) {
        // Inline sequence
        obj[key] = parseInlineSequence(rest);
      } else if (rest.startsWith('{')) {
        // Inline mapping
        obj[key] = parseInlineMapping(rest);
      } else {
        obj[key] = parseScalar(rest);
      }
    }

    return { value: obj, nextLine: i };
  }

  function parseInlineSequence(str) {
    str = str.trim();
    if (str.startsWith('[') && str.endsWith(']')) {
      str = str.slice(1, -1).trim();
    }
    if (!str) return [];
    return str.split(',').map(s => parseScalar(s.trim()));
  }

  function parseInlineMapping(str) {
    str = str.trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      str = str.slice(1, -1).trim();
    }
    if (!str) return {};
    const obj = {};
    const pairs = str.split(',');
    for (const pair of pairs) {
      const ci = pair.indexOf(':');
      if (ci === -1) continue;
      const k = unquote(pair.slice(0, ci).trim());
      const v = parseScalar(pair.slice(ci + 1).trim());
      obj[k] = v;
    }
    return obj;
  }

  function parseScalar(val) {
    if (val === 'null' || val === '~' || val === '') return null;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (/^-?\d+$/.test(val)) return parseInt(val, 10);
    if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
    return unquote(val);
  }

  function unquote(s) {
    if (!s) return s;
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  }

  function getIndent(line) {
    let i = 0;
    while (i < line.length && line[i] === ' ') i++;
    return i;
  }

  function isBlankOrComment(line) {
    const t = line.trim();
    return t === '' || t.startsWith('#');
  }

  // ── STRINGIFY ──────────────────────────────────────────────────────────────

  function stringifyYAML(obj, indent, level) {
    indent = indent || 2;
    level = level || 0;
    const pad = ' '.repeat(indent * level);
    const pad1 = ' '.repeat(indent * (level + 1));

    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') return quoteYAMLString(obj);

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        const val = stringifyYAML(item, indent, level + 1);
        if (typeof item === 'object' && item !== null) {
          const lines = val.split('\n');
          return pad + '- ' + lines[0] + (lines.length > 1 ? '\n' + lines.slice(1).join('\n') : '');
        }
        return pad + '- ' + val;
      }).join('\n');
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      return keys.map(key => {
        const val = obj[key];
        const k = quoteYAMLKey(key);
        if (val === null) return pad + k + ': null';
        if (typeof val === 'object' && val !== null) {
          const nested = stringifyYAML(val, indent, level + 1);
          return pad + k + ':\n' + nested;
        }
        return pad + k + ': ' + stringifyYAML(val, indent, level);
      }).join('\n');
    }

    return String(obj);
  }

  function quoteYAMLString(s) {
    // Quote if needed
    if (/[:#\[\]{},|>&*!?'"%@`]/.test(s) || /^\s|\s$/.test(s) ||
        s === 'true' || s === 'false' || s === 'null' || s === '~' ||
        /^\d+$/.test(s) || /^\d+\.\d+$/.test(s) || s === '') {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function quoteYAMLKey(k) {
    if (/[:#\[\]{},|>&*!?'"%@`\s]/.test(k)) {
      return '"' + k.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return k;
  }

  // ── VALIDATE ──────────────────────────────────────────────────────────────

  function validateYAML(text) {
    try {
      const result = parseYAML(text);
      return { valid: true, value: result };
    } catch(e) {
      return { valid: false, error: e.message };
    }
  }

  // ── DETECT ────────────────────────────────────────────────────────────────

  function isYAML(text) {
    const t = text.trim();
    // YAML documents that start with --- or are clearly key:value pairs
    if (t.startsWith('---')) return true;
    // Has key: value pattern but isn't JSON or XML
    if (!t.startsWith('{') && !t.startsWith('[') && !t.startsWith('<')) {
      if (/^[a-zA-Z_"'][^:]*:\s/m.test(t) || /^- /m.test(t)) return true;
    }
    return false;
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────

  global.YAMLParser = {
    parse: parseYAML,
    stringify: function(obj, indent) { return stringifyYAML(obj, indent || 2, 0); },
    validate: validateYAML,
    isYAML: isYAML
  };

})(window);

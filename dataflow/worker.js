/* ============================================================
   CSV ⇄ JSON Converter — Worker v2
   Handles: CSV→JSON, JSON→CSV, CSV→TSV, JSON→TSV, preview
   Features: proper quoted-field parser, custom delimiter,
             type inference, column select/rename, filter,
             sort, deduplication
   ============================================================ */

self.onmessage = e => {
  const { mode, text, options = {} } = e.data;
  try {
    switch (mode) {
      case "csv2json": {
        const rows = parseCSV(text, options);
        const out  = applyTransforms(rows, options);
        self.postMessage({ type: "done", data: JSON.stringify(out, null, options.jsonIndent ?? 2), rowCount: out.length });
        break;
      }
      case "json2csv": {
        const arr = toArray(JSON.parse(text));
        const out = applyTransforms(arr, options);
        self.postMessage({ type: "done", data: toCsv(out, options), rowCount: out.length });
        break;
      }
      case "csv2tsv": {
        const rows = parseCSV(text, options);
        const out  = applyTransforms(rows, options);
        self.postMessage({ type: "done", data: toCsv(out, { ...options, delimiter: "\t" }), rowCount: out.length });
        break;
      }
      case "json2tsv": {
        const arr = toArray(JSON.parse(text));
        const out = applyTransforms(arr, options);
        self.postMessage({ type: "done", data: toCsv(out, { ...options, delimiter: "\t" }), rowCount: out.length });
        break;
      }
      case "preview": {
        const rows = parseCSV(text, { ...options, maxRows: 10 });
        self.postMessage({ type: "preview", headers: Object.keys(rows[0] || {}), rows });
        break;
      }
      default:
        self.postMessage({ type: "error", data: "Unknown mode: " + mode });
    }
  } catch (err) {
    self.postMessage({ type: "error", data: "Error: " + err.message });
  }
};

/* ── CSV parser with proper quoted-field support ── */
function parseCSV(text, opts = {}) {
  const delim   = opts.delimiter || ",";
  const header  = opts.hasHeader !== false;
  const maxRows = opts.maxRows || Infinity;
  const infer   = opts.inferTypes !== false;
  const selCols = opts.selectedCols || null;
  const renames = opts.colRenames || {};

  const lines = text.trim().split(/\r?\n|\r/).filter(l => l.trim());
  if (!lines.length) return [];

  const rawHeaders = parseRow(lines[0], delim);
  const headers    = header ? rawHeaders : rawHeaders.map((_, i) => "col" + (i + 1));
  const data       = header ? lines.slice(1) : lines;
  const total      = Math.min(data.length, maxRows);
  const result     = [];

  for (let i = 0; i < total; i++) {
    if (!data[i].trim()) continue;
    const vals = parseRow(data[i], delim);
    const obj  = {};
    headers.forEach((h, j) => {
      const key = h.trim();
      if (selCols && !selCols.includes(key)) return;
      const finalKey = renames[key] || key;
      const raw = (vals[j] || "").trim();
      obj[finalKey] = infer ? inferType(raw) : raw;
    });
    result.push(obj);
    if (i % 200 === 0) self.postMessage({ type: "progress", data: Math.floor((i / total) * 80) });
  }
  self.postMessage({ type: "progress", data: 85 });
  return result;
}

/* Parse a single CSV row — handles quoted fields and escaped quotes */
function parseRow(line, delim) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      cells.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/* Convert value string to its inferred JS type */
function inferType(v) {
  if (v === "" || v === null || v === undefined) return "";
  if (v === "true"  || v === "True")  return true;
  if (v === "false" || v === "False") return false;
  if (v === "null"  || v === "NULL")  return null;
  const n = Number(v);
  return isNaN(n) ? v : n;
}

/* Array of objects → CSV/TSV string */
function toCsv(arr, opts = {}) {
  if (!arr.length) return "";
  const delim    = opts.delimiter || ",";
  const selCols  = opts.selectedCols || null;
  const renames  = opts.colRenames || {};
  const quoteAll = opts.csvQuoteAll || false;

  let headers = Object.keys(arr[0]);
  if (selCols) headers = headers.filter(h => selCols.includes(h));
  const outHeaders = headers.map(h => renames[h] || h);

  const esc = v => {
    const s = v === null || v === undefined ? "" : String(v);
    if (quoteAll || s.includes(delim) || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows = arr.map(o => headers.map(h => esc(o[h])).join(delim));
  return [outHeaders.join(delim), ...rows].join("\n");
}

/* Ensure value is an array of objects */
function toArray(json) {
  if (Array.isArray(json)) return json;
  if (typeof json === "object" && json !== null) return [json];
  throw new Error("JSON must be an array or object");
}

/* Apply filter, sort, dedup transforms */
function applyTransforms(rows, opts = {}) {
  let out = rows;

  // Filter
  if (opts.filter && opts.filter.field) {
    const { field, op, value } = opts.filter;
    const v = value.toLowerCase();
    out = out.filter(row => {
      const cell = String(row[field] ?? "").toLowerCase();
      if (op === "contains") return cell.includes(v);
      if (op === "equals")   return cell === v;
      if (op === "starts")   return cell.startsWith(v);
      if (op === "gt")       return Number(row[field]) > Number(value);
      if (op === "lt")       return Number(row[field]) < Number(value);
      return true;
    });
  }

  // Sort
  if (opts.sort && opts.sort.field) {
    const { field, dir } = opts.sort;
    out = [...out].sort((a, b) => {
      const av = a[field], bv = b[field];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = (typeof av === "number" && typeof bv === "number")
        ? av - bv
        : String(av).localeCompare(String(bv));
      return dir === "desc" ? -cmp : cmp;
    });
  }

  // Dedup
  if (opts.dedup) {
    const seen = new Set();
    out = out.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  self.postMessage({ type: "progress", data: 95 });
  return out;
}

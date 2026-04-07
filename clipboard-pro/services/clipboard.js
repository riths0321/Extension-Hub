/**
 * ClipboardService — type detection, history mutation, cleanup.
 * Pure logic; no DOM touches.
 */

import { getHistory, getSettings, setHistory, bumpTotalSaves } from './storage.js';

// ─── Type Detection ──────────────────────────────────────────────────────────

const URL_RE   = /^https?:\/\/[^\s]{3,}/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_SIGNALS = [
  /function\s+\w+\s*\(/,
  /=>\s*[{(]/,
  /^\s*(const|let|var|import|export|class|return|if|for|while)\b/m,
  /[{};]\s*$/m,
  /<\/?[a-z][\w-]*(\s|\/?>)/i,
  /^\s*#(include|define|import|pragma)/m,
  /\b(def |print\(|elif |lambda )/,
];

export function detectType(text) {
  if (!text || text.length < 2) return 'text';
  const t = text.trim();
  if (URL_RE.test(t))   return 'url';
  if (EMAIL_RE.test(t)) return 'email';
  const codeScore = CODE_SIGNALS.reduce((s, re) => s + (re.test(t) ? 1 : 0), 0);
  if (codeScore >= 2)   return 'code';
  return 'text';
}

export function getTypeMeta(type) {
  const map = {
    url:   { label: 'URL',   icon: '🔗', color: 'type-url'   },
    email: { label: 'Email', icon: '✉️', color: 'type-email' },
    code:  { label: 'Code',  icon: '</>', color: 'type-code'  },
    text:  { label: 'Text',  icon: 'Aa', color: 'type-text'  },
  };
  return map[type] || map.text;
}

// ─── History Mutations ────────────────────────────────────────────────────────

export async function addToHistory(rawText, forcedType) {
  const text = (rawText || '').trim();
  if (!text) return null;

  const settings = await getSettings();
  if (!settings.autoSave) return null;

  const history     = await getHistory();
  const dedup_ttl   = 5 * 60 * 1000;
  const now         = Date.now();
  const existingIdx = history.findIndex(
    (i) => i.content === text && (now - i.timestamp) < dedup_ttl
  );

  let next = [...history];

  if (existingIdx >= 0) {
    const item = { ...next[existingIdx], timestamp: now, usageCount: (next[existingIdx].usageCount || 0) + 1 };
    next.splice(existingIdx, 1);
    next.unshift(item);
    await setHistory(trimHistory(next, settings.maxItems));
    return item;
  }

  const item = {
    id:         `${now}_${Math.random().toString(36).slice(2, 7)}`,
    content:    text,
    type:       forcedType || detectType(text),
    tags:       [],
    pinned:     false,
    timestamp:  now,
    usageCount: 1,
    lastUsed:   now,
  };
  next.unshift(item);
  next = trimHistory(next, settings.maxItems);
  await setHistory(next);
  await bumpTotalSaves();
  return item;
}

export async function updateItem(id, patch) {
  const history = await getHistory();
  const next    = history.map((item) => item.id === id ? { ...item, ...patch } : item);
  await setHistory(next);
  return next;
}

export async function removeItem(id) {
  const history = await getHistory();
  await setHistory(history.filter((i) => i.id !== id));
}

export async function togglePin(id) {
  const history = await getHistory();
  const item    = history.find((i) => i.id === id);
  if (!item) return;
  await updateItem(id, { pinned: !item.pinned });
}

export async function bumpUsage(id) {
  await updateItem(id, { usageCount: 0, lastUsed: Date.now() }); // patch done below
  const history = await getHistory();
  const item    = history.find((i) => i.id === id);
  if (!item) return;
  await updateItem(id, { usageCount: (item.usageCount || 0) + 1, lastUsed: Date.now() });
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export async function autoCleanup() {
  const settings = await getSettings();
  const history  = await getHistory();
  const cutoff   = Date.now() - (settings.autoCleanDays || 7) * 86_400_000;
  const next     = history.filter((i) => i.pinned || i.timestamp > cutoff);
  if (next.length !== history.length) await setHistory(next);
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportJSON() {
  const history  = await getHistory();
  const settings = await getSettings();
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), history, settings }, null, 2);
}

export async function importJSON(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed.history)) throw new Error('Invalid backup format');
  const existing = await getHistory();
  const merged   = deduplicateMerge(existing, parsed.history);
  const settings = await getSettings();
  await setHistory(trimHistory(merged, settings.maxItems));
  return merged.length;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trimHistory(items, maxItems) {
  const limit   = Math.min(Math.max(maxItems || 100, 10), 500);
  const pinned  = items.filter((i) => i.pinned);
  const rest    = items.filter((i) => !i.pinned).sort((a, b) => b.timestamp - a.timestamp);
  return [...pinned, ...rest].slice(0, limit);
}

function deduplicateMerge(existing, incoming) {
  const seen = new Set(existing.map((i) => i.content));
  const news = incoming.filter((i) => !seen.has(i.content));
  return [...news, ...existing];
}

/**
 * SnipVault – Helpers
 * Utility functions. No DOM side-effects, no globals.
 */

const Helpers = (() => {

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function langLabel(lang) {
    const MAP = {
      javascript: 'JS', typescript: 'TS', python: 'PY', html: 'HTML',
      css: 'CSS', sql: 'SQL', java: 'JAVA', cpp: 'C++', php: 'PHP',
      rust: 'RS', go: 'GO', bash: 'SH', json: 'JSON', plaintext: 'TXT'
    };
    return MAP[lang] || (lang || 'TXT').toUpperCase().slice(0, 4);
  }

  function langColor(lang) {
    const MAP = {
      javascript: '#f7df1e', typescript: '#3178c6', python: '#3572A5',
      html: '#e34c26', css: '#563d7c', sql: '#e38c00', java: '#b07219',
      cpp: '#f34b7d', php: '#4F5D95', rust: '#dea584', go: '#00ADD8',
      bash: '#89e051', json: '#292929', plaintext: '#aaaaaa'
    };
    return MAP[lang] || '#6B7280';
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { formatDate, debounce, langLabel, langColor, copyToClipboard, downloadJSON };
})();

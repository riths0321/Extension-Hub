// security.js — input sanitization, NO innerHTML, NO eval
var SecurityUtils = {
  sanitizeFilename(filename) {
    if (!filename) return 'recording';
    return String(filename)
      .replace(/[^a-zA-Z0-9\s\-_.()]/g, '')
      .replace(/\.\./g, '')
      .trim()
      .substring(0, 200);
  },

  sanitizeText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.textContent;
  }
};

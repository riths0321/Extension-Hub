/**
 * StorageService — single source of truth for all persistence.
 */

const STORAGE_KEY = 'qlm_links';
const ARCHIVE_KEY = 'qlm_archive';
const READ_LATER_KEY = 'qlm_read_later';
const SETTINGS_KEY = 'qlm_settings';

export const StorageService = {

  async getLinks() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  },

  async setLinks(links) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: links }, resolve);
    });
  },

  async getArchive() {
    return new Promise((resolve) => {
      chrome.storage.local.get([ARCHIVE_KEY], (result) => {
        resolve(result[ARCHIVE_KEY] || []);
      });
    });
  },

  async setArchive(archive) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [ARCHIVE_KEY]: archive }, resolve);
    });
  },

  async archiveLink(link) {
    const links = await this.getLinks();
    const archive = await this.getArchive();
    const filtered = links.filter(l => l.id !== link.id);
    await this.setLinks(filtered);
    await this.setArchive([{ ...link, archivedAt: new Date().toISOString() }, ...archive]);
    return true;
  },

  async unarchiveLink(linkId) {
    const archive = await this.getArchive();
    const links = await this.getLinks();
    const archivedLink = archive.find(l => l.id === linkId);
    if (archivedLink) {
      const newArchive = archive.filter(l => l.id !== linkId);
      await this.setArchive(newArchive);
      await this.setLinks([archivedLink, ...links]);
      return true;
    }
    return false;
  },

  async getReadLater() {
    return new Promise((resolve) => {
      chrome.storage.local.get([READ_LATER_KEY], (result) => {
        resolve(result[READ_LATER_KEY] || []);
      });
    });
  },

  async addToReadLater(link) {
    const readLater = await this.getReadLater();
    if (readLater.some(l => l.url === link.url)) return false;
    await new Promise((resolve) => {
      chrome.storage.local.set({ [READ_LATER_KEY]: [{ ...link, addedAt: new Date().toISOString() }, ...readLater] }, resolve);
    });
    return true;
  },

  async markAsRead(linkId) {
    const readLater = await this.getReadLater();
    const filtered = readLater.filter(l => l.id !== linkId);
    await new Promise((resolve) => {
      chrome.storage.local.set({ [READ_LATER_KEY]: filtered }, resolve);
    });
    return true;
  },

  async addLink(link) {
    const links = await this.getLinks();
    const duplicate = links.some((l) => l.url === link.url);
    if (duplicate) return { success: false, duplicate: true };
    links.unshift(link);
    await this.setLinks(links);
    return { success: true, duplicate: false };
  },

  async updateLink(id, updates) {
    const links = await this.getLinks();
    const idx = links.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    links[idx] = { ...links[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.setLinks(links);
    return true;
  },

  async deleteLink(id) {
    const links = await this.getLinks();
    const filtered = links.filter((l) => l.id !== id);
    if (filtered.length === links.length) return false;
    await this.setLinks(filtered);
    return true;
  },

  async deletePermanently(id) {
    const archive = await this.getArchive();
    const filtered = archive.filter(l => l.id !== id);
    await this.setArchive(filtered);
    return true;
  },

  async toggleFavorite(id) {
    const links = await this.getLinks();
    const idx = links.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    links[idx].favorite = !links[idx].favorite;
    links[idx].updatedAt = new Date().toISOString();
    await this.setLinks(links);
    return links[idx].favorite;
  },

  async recordOpen(id) {
    const links = await this.getLinks();
    const idx = links.findIndex((l) => l.id === id);
    if (idx !== -1) {
      links[idx].lastOpenedAt = new Date().toISOString();
      await this.setLinks(links);
    }
  },

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        resolve(result[SETTINGS_KEY] || { theme: 'light', sortBy: 'date' });
      });
    });
  },

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
    });
  },

  async exportJSON() {
    const links = await this.getLinks();
    const archive = await this.getArchive();
    return JSON.stringify({ version: '2.0', exportedAt: new Date().toISOString(), links, archive }, null, 2);
  },

  async exportMarkdown() {
    const links = await this.getLinks();
    let md = `# Quick Link Manager — Exported Links\n*${new Date().toLocaleDateString()}*\n\n`;
    links.forEach((l) => {
      md += `- [${l.title}](${l.url})`;
      if (l.note) md += ` — ${l.note}`;
      md += '\n';
    });
    return md;
  },

  async exportHTML() {
    const links = await this.getLinks();
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Quick Link Manager Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>`;
    links.forEach((l) => {
      html += `<DT><A HREF="${l.url}" ADD_DATE="${Math.floor(new Date(l.createdAt).getTime() / 1000)}">${this.escapeHtml(l.title)}</A>`;
      if (l.tags && l.tags.length) html += ` <font color="#6B7280">[${l.tags.join(', ')}]</font>`;
      html += '\n';
    });
    html += `</DL><p>`;
    return html;
  },

  escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  },

  async importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    const incoming = Array.isArray(data) ? data : (data.links || []);
    const existing = await this.getLinks();
    const existingUrls = new Set(existing.map((l) => l.url));

    let imported = 0;
    let skipped = 0;
    const toAdd = [];

    incoming.forEach((link) => {
      if (existingUrls.has(link.url)) {
        skipped++;
      } else {
        toAdd.push({ ...link, id: link.id || crypto.randomUUID() });
        imported++;
      }
    });

    await this.setLinks([...toAdd, ...existing]);
    return { imported, skipped };
  },

  async checkDuplicate(url) {
    const links = await this.getLinks();
    return links.some(l => l.url === url);
  },

  async getAllTags() {
    const links = await this.getLinks();
    const tagSet = new Set();
    links.forEach(link => {
      (link.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  },

  async renameTag(oldTag, newTag) {
    if (oldTag === newTag) return false;
    const links = await this.getLinks();
    let modified = false;
    links.forEach(link => {
      if (link.tags && link.tags.includes(oldTag)) {
        link.tags = link.tags.map(t => t === oldTag ? newTag : t);
        modified = true;
      }
    });
    if (modified) await this.setLinks(links);
    return modified;
  },

  async mergeTags(tagToKeep, tagToRemove) {
    if (tagToKeep === tagToRemove) return false;
    const links = await this.getLinks();
    let modified = false;
    links.forEach(link => {
      if (link.tags && link.tags.includes(tagToRemove)) {
        link.tags = [...new Set([
          ...link.tags.filter(t => t !== tagToRemove),
          tagToKeep
        ])];
        modified = true;
      }
    });
    if (modified) await this.setLinks(links);
    return modified;
  }
};
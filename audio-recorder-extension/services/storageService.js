// storageService.js — uses chrome.storage.local; no ES module syntax
var StorageService = {
  async getRecordings() {
    const data = await chrome.storage.local.get('recordings');
    return Array.isArray(data.recordings) ? data.recordings : [];
  },

  async deleteRecording(id) {
    const recs = await this.getRecordings();
    const filtered = recs.filter(r => r.id !== id);
    await chrome.storage.local.set({ recordings: filtered });
    return true;
  },

  async clearHistory() {
    await chrome.storage.local.set({ recordings: [] });
  },

  async getSettings() {
    const data = await chrome.storage.local.get('settings');
    return data.settings || { theme: 'light', maxDuration: 0, exportFormat: 'webm' };
  },

  async updateSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ settings: updated });
    return updated;
  }
};

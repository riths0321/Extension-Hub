const STORAGE_KEYS = {
  favorites: "favorites",
  tags: "tags",
  profiles: "profiles",
  firstSeen: "firstSeen"
};

export class ExtensionStorage {
  async getAll() {
    const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return {
      favorites: Array.isArray(result[STORAGE_KEYS.favorites]) ? result[STORAGE_KEYS.favorites] : [],
      tags: result[STORAGE_KEYS.tags] || {},
      profiles: result[STORAGE_KEYS.profiles] || {},
      firstSeen: result[STORAGE_KEYS.firstSeen] || {}
    };
  }

  async getFavorites() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.favorites);
    return Array.isArray(result[STORAGE_KEYS.favorites]) ? result[STORAGE_KEYS.favorites] : [];
  }

  async toggleFavorite(id) {
    const favorites = await this.getFavorites();
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((favoriteId) => favoriteId !== id)
      : [...favorites, id];

    await chrome.storage.local.set({ [STORAGE_KEYS.favorites]: nextFavorites });
    return nextFavorites.includes(id);
  }

  async getTags() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.tags);
    return result[STORAGE_KEYS.tags] || {};
  }

  async setTags(id, tags) {
    const currentTags = await this.getTags();
    currentTags[id] = tags;
    await chrome.storage.local.set({ [STORAGE_KEYS.tags]: currentTags });
  }

  async mergeFirstSeen(nextValues) {
    const result = await chrome.storage.local.get(STORAGE_KEYS.firstSeen);
    const firstSeen = result[STORAGE_KEYS.firstSeen] || {};
    await chrome.storage.local.set({
      [STORAGE_KEYS.firstSeen]: {
        ...firstSeen,
        ...nextValues
      }
    });
  }

  async importBackup(payload) {
    const favorites = Array.isArray(payload.favorites) ? payload.favorites : [];
    const tags = payload.tags && typeof payload.tags === "object" ? payload.tags : {};
    const profiles = payload.profiles && typeof payload.profiles === "object" ? payload.profiles : {};

    await chrome.storage.local.set({
      [STORAGE_KEYS.favorites]: favorites,
      [STORAGE_KEYS.tags]: tags,
      [STORAGE_KEYS.profiles]: profiles
    });
  }

  async getProfiles() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.profiles);
    return result[STORAGE_KEYS.profiles] || {};
  }

  async saveProfile(name, profile) {
    const profiles = await this.getProfiles();
    profiles[name] = profile;
    await chrome.storage.local.set({ [STORAGE_KEYS.profiles]: profiles });
  }

  async deleteProfile(name) {
    const profiles = await this.getProfiles();
    delete profiles[name];
    await chrome.storage.local.set({ [STORAGE_KEYS.profiles]: profiles });
  }
}

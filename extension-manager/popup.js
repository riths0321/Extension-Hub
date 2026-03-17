import { ExtensionStorage } from "./storage.js";
import { DetailsModal } from "./details-modal.js";
import { SettingsModal } from "./settings-modal.js"; // Add this


const RISKY_PERMISSIONS = ["tabs", "cookies", "history", "webRequest", "webRequestBlocking", "declarativeNetRequest"];

class ExtensionManagerPro {
  constructor() {
    this.storage = new ExtensionStorage();
    this.modal = new DetailsModal({
      root: document.getElementById("modal-root"),
      onSaveTags: async (id, tags) => {
        await this.storage.setTags(id, tags);
        this.metadata.tags[id] = tags;
        this.render();
        this.toast("Tags updated");
      },
      onToggleFavorite: async (id) => {
        const isFavorite = await this.storage.toggleFavorite(id);
        this.metadata.favorites = await this.storage.getFavorites();
        this.render();
        this.toast(isFavorite ? "Added to favorites" : "Removed from favorites");
      }
    });

    // Add settings modal
    this.settingsModal = new SettingsModal({
      root: document.getElementById("modal-root"),
      onSaveProfile: async (profileName) => {
        await this.saveProfile(profileName);
        this.settingsModal.updateProfiles(this.metadata.profiles);
      },
      onApplyProfile: async (profileName) => {
        await this.applyProfile(profileName);
      },
      onDeleteProfile: async (profileName) => {
        await this.deleteProfile(profileName);
        this.settingsModal.updateProfiles(this.metadata.profiles);
      },
      onExport: () => this.exportBackup(),
      onImport: (event) => this.importBackup(event),
      onToggleRiskWarnings: (show) => {
        this.settings.showRiskWarnings = show;
        this.render();
      }
    });

    this.extensions = [];
    this.filteredExtensions = [];
    this.metadata = {
      favorites: [],
      tags: {},
      profiles: {},
      firstSeen: {}
    };
    this.settings = {
      showRiskWarnings: true
    };
    this.state = {
      search: "",
      filter: "all",
      selected: new Set()
    };
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadMetadata();
    await this.loadExtensions();
    this.bindManagementListeners();
  }

   cacheElements() {
  this.elements = {
    // Loading states
    loading: document.getElementById("loading-state"),
    empty: document.getElementById("empty-state"),
    grid: document.getElementById("extension-grid"),
    
    // Search and filter
    searchInput: document.getElementById("search-input"),
    filter: document.getElementById("status-filter"),
    resultsSummary: document.getElementById("results-summary"),
    
    // Settings button
    settingsButton: document.getElementById("settings-button"),

    // Stats elements
    totalCount: document.getElementById("total-count"),
    enabledCount: document.getElementById("enabled-count"),
    disabledCount: document.getElementById("disabled-count"),
    riskCount: document.getElementById("risk-count"),
    
    // Profile elements
    profileSelect: document.getElementById("profile-select"),
    
    // Batch toolbar elements
    selectionCount: document.getElementById("selection-count"),
    batchToolbar: document.getElementById("batch-toolbar"),
    
    // Import/Export
    importFile: document.getElementById("import-file"),
    toastRoot: document.getElementById("toast-root"),
    
    // Buttons - Header
    refreshButton: document.getElementById("refresh-button"),
    exportButton: document.getElementById("export-button"),
    importButton: document.getElementById("import-button"),
    
    // Buttons - Profile controls
    saveProfileButton: document.getElementById("save-profile-button"),
    applyProfileButton: document.getElementById("apply-profile-button"),
    deleteProfileButton: document.getElementById("delete-profile-button"),
    
    // Buttons - Batch operations
    batchEnableButton: document.getElementById("batch-enable-button"),
    batchDisableButton: document.getElementById("batch-disable-button"),
    clearSelectionButton: document.getElementById("clear-selection-button"),
    
    // Buttons - All extensions
    enableAllButton: document.getElementById("enable-all-button"),
    disableAllButton: document.getElementById("disable-all-button")
  };

  // Log which elements are missing (for debugging)
  Object.entries(this.elements).forEach(([key, element]) => {
    if (!element) {
      console.warn(`Element not found: ${key}`);
    }
  });
}

  bindEvents() {
  // Header buttons
  if (this.elements.refreshButton) {
    this.elements.refreshButton.addEventListener("click", () => this.loadExtensions());
  }
  
  if (this.elements.exportButton) {
    this.elements.exportButton.addEventListener("click", () => this.exportBackup());
  }
  
  if (this.elements.importButton) {
    this.elements.importButton.addEventListener("click", () => this.elements.importFile?.click());
  }
  
  // Profile buttons
  if (this.elements.saveProfileButton) {
    this.elements.saveProfileButton.addEventListener("click", () => this.saveProfile());
  }
  
  if (this.elements.applyProfileButton) {
    this.elements.applyProfileButton.addEventListener("click", () => this.applySelectedProfile());
  }
  
  if (this.elements.deleteProfileButton) {
    this.elements.deleteProfileButton.addEventListener("click", () => this.deleteSelectedProfile());
  }
  
  // All extensions buttons
  if (this.elements.enableAllButton) {
    this.elements.enableAllButton.addEventListener("click", () => this.runAllOperation(true));
  }
  
  if (this.elements.disableAllButton) {
    this.elements.disableAllButton.addEventListener("click", () => this.runAllOperation(false));
  }
  
  // Batch operation buttons
  if (this.elements.batchEnableButton) {
    this.elements.batchEnableButton.addEventListener("click", () => this.runBatchOperation(true));
  }
  
  if (this.elements.batchDisableButton) {
    this.elements.batchDisableButton.addEventListener("click", () => this.runBatchOperation(false));
  }
  
  if (this.elements.clearSelectionButton) {
    this.elements.clearSelectionButton.addEventListener("click", () => {
      this.state.selected.clear();
      this.render();
    });
  }

  // Search input
  if (this.elements.searchInput) {
    this.elements.searchInput.addEventListener("input", (event) => {
      this.state.search = event.target.value.trim().toLowerCase();
      this.render();
    });
  }

   // Settings button
  if (this.elements.settingsButton) {
    this.elements.settingsButton.addEventListener("click", () => {
      this.settingsModal.open(this.metadata.profiles, this.settings);
    });
  }

  // Filter select
  if (this.elements.filter) {
    this.elements.filter.addEventListener("change", (event) => {
      this.state.filter = event.target.value;
      this.render();
    });
  }

  // Profile select
  if (this.elements.profileSelect) {
    this.elements.profileSelect.addEventListener("change", () => this.renderProfiles());
  }

  // Import file
  if (this.elements.importFile) {
    this.elements.importFile.addEventListener("change", (event) => this.importBackup(event));
  }

  // Grid events
  if (this.elements.grid) {
    this.elements.grid.addEventListener("click", (event) => this.handleGridClick(event));
    this.elements.grid.addEventListener("change", (event) => this.handleGridChange(event));
    this.elements.grid.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches(".tag-input")) {
        event.preventDefault();
        this.saveTagsFromInput(event.target);
      }
    });
    this.elements.grid.addEventListener("blur", (event) => {
      if (event.target.matches(".tag-input")) {
        this.saveTagsFromInput(event.target);
      }
    }, true);
  }
}

  bindManagementListeners() {
    chrome.management.onEnabled.addListener(() => this.loadExtensions());
    chrome.management.onDisabled.addListener(() => this.loadExtensions());
    chrome.management.onInstalled.addListener(() => this.loadExtensions());
    chrome.management.onUninstalled.addListener((id) => {
      this.state.selected.delete(id);
      this.loadExtensions();
    });
  }

  async loadMetadata() {
    this.metadata = await this.storage.getAll();
  }

  async loadExtensions() {
    this.setLoading(true);

    try {
      const allExtensions = await chrome.management.getAll();
      const selfId = chrome.runtime.id;
      const extensions = allExtensions.filter((extension) => extension.id !== selfId && extension.type === "extension");

      const firstSeenUpdates = {};
      extensions.forEach((extension) => {
        if (!this.metadata.firstSeen[extension.id]) {
          firstSeenUpdates[extension.id] = Date.now();
        }
      });

      if (Object.keys(firstSeenUpdates).length) {
        await this.storage.mergeFirstSeen(firstSeenUpdates);
        this.metadata.firstSeen = {
          ...this.metadata.firstSeen,
          ...firstSeenUpdates
        };
      }

      this.extensions = extensions.map((extension) => this.enrichExtension(extension));
      this.state.selected = new Set([...this.state.selected].filter((id) => this.extensions.some((extension) => extension.id === id)));
      this.render();
    } catch (error) {
      this.showState("Failed to load extensions. Check that the extension has management and storage permissions.");
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  enrichExtension(extension) {
    const permissions = Array.isArray(extension.permissions) ? extension.permissions : [];
    const hostPermissions = Array.isArray(extension.hostPermissions) ? extension.hostPermissions : [];
    const riskyPermissions = permissions.filter((permission) => RISKY_PERMISSIONS.includes(permission));
    const hasBroadHosts = hostPermissions.some((host) => host === "<all_urls>" || host.includes("*://*/*"));
    const warnings = [];

    if (riskyPermissions.length) {
      warnings.push(...riskyPermissions);
    }

    if (hasBroadHosts) {
      warnings.push("broad host access");
    }

    return {
      ...extension,
      developer: this.getDeveloperLabel(extension),
      favorite: this.metadata.favorites.includes(extension.id),
      tags: this.metadata.tags[extension.id] || [],
      firstSeen: this.metadata.firstSeen[extension.id] || Date.now(),
      riskyPermissions,
      hasBroadHosts,
      warnings
    };
  }

  getDeveloperLabel(extension) {
    if (extension.homepageUrl) {
      try {
        return new URL(extension.homepageUrl).hostname.replace(/^www\./, "");
      } catch (error) {
        console.warn("Invalid homepage URL", error);
      }
    }

    const installType = extension.installType || "unknown";
    return installType.charAt(0).toUpperCase() + installType.slice(1);
  }

  getVisibleExtensions() {
    const searchTerm = this.state.search;

    const filtered = this.extensions.filter((extension) => {
      if (this.state.filter === "enabled" && !extension.enabled) {
        return false;
      }

      if (this.state.filter === "disabled" && extension.enabled) {
        return false;
      }

      if (this.state.filter === "favorites" && !extension.favorite) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const searchTarget = [
        extension.name,
        extension.description || "",
        extension.developer || ""
      ].join(" ").toLowerCase();

      return searchTarget.includes(searchTerm);
    });

    return filtered.sort((left, right) => left.name.localeCompare(right.name));
  }

  render() {
    this.filteredExtensions = this.getVisibleExtensions();
    this.updateStats();
    this.renderProfiles();
    this.renderList();
    this.updateBatchToolbar();
  }

  renderProfiles() {
  const profiles = this.metadata.profiles || {};
  const profileNames = Object.keys(profiles).sort((left, right) => left.localeCompare(right));

  if (!this.elements.profileSelect) {
    console.warn('Profile select element not found');
    return;
  }

  const previousValue = this.elements.profileSelect.value;
  
  this.elements.profileSelect.replaceChildren();
  this.elements.profileSelect.appendChild(this.createOption("", "Select a profile"));
  
  profileNames.forEach((name) => {
    this.elements.profileSelect.appendChild(this.createOption(name, name));
  });

  if (profileNames.includes(previousValue)) {
    this.elements.profileSelect.value = previousValue;
  }
}

  renderList() {
    this.elements.grid.replaceChildren();
    const hasResults = this.filteredExtensions.length > 0;

    this.elements.empty.hidden = hasResults;
    this.elements.grid.hidden = !hasResults;

    if (!hasResults) {
      this.elements.resultsSummary.textContent = "0 results";
      return;
    }

    const fragment = document.createDocumentFragment();

    this.filteredExtensions.forEach((extension) => {
      fragment.appendChild(this.createExtensionCard(extension));
    });

    this.elements.resultsSummary.textContent = `${this.filteredExtensions.length} result${this.filteredExtensions.length === 1 ? "" : "s"}`;
    this.elements.grid.appendChild(fragment);
  }

  updateStats() {
    const total = this.extensions.length;
    const enabled = this.extensions.filter((extension) => extension.enabled).length;
    const disabled = total - enabled;
    const risks = this.extensions.filter((extension) => extension.warnings.length > 0).length;

    this.elements.totalCount.textContent = String(total);
    this.elements.enabledCount.textContent = String(enabled);
    this.elements.disabledCount.textContent = String(disabled);
    this.elements.riskCount.textContent = String(risks);
  }

  updateBatchToolbar() {
  const count = this.state.selected.size;
  
  if (this.elements.selectionCount) {
    this.elements.selectionCount.textContent = `${count} selected`;
  }
  
  if (this.elements.batchToolbar) {
    this.elements.batchToolbar.hidden = count === 0;
  }
}

  async handleGridClick(event) {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    const id = button.dataset.id;
    const extension = this.extensions.find((item) => item.id === id);
    if (!extension) {
      return;
    }

    if (button.dataset.role === "favorite-toggle") {
      await this.storage.toggleFavorite(id);
      this.metadata.favorites = await this.storage.getFavorites();
      this.extensions = this.extensions.map((item) => item.id === id ? { ...item, favorite: this.metadata.favorites.includes(id) } : item);
      this.render();
      return;
    }

    if (button.dataset.role === "open-details") {
      this.modal.open(extension);
      return;
    }

    if (button.dataset.role === "open-settings") {
      await this.openExtensionSettings(extension);
      return;
    }

    if (button.dataset.role === "remove-extension") {
      await this.removeExtension(extension);
    }
  }

  async handleGridChange(event) {
    const target = event.target;
    const id = target.dataset.id;

    if (target.dataset.role === "toggle-enabled") {
      await this.setEnabled(id, target.checked);
      return;
    }

    if (target.dataset.role === "select-extension") {
      if (target.checked) {
        this.state.selected.add(id);
      } else {
        this.state.selected.delete(id);
      }
      this.updateBatchToolbar();
    }
  }

  async saveTagsFromInput(input) {
    const id = input.dataset.id;
    const tags = input.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    await this.storage.setTags(id, tags);
    this.metadata.tags[id] = tags;
    this.extensions = this.extensions.map((extension) => extension.id === id ? { ...extension, tags } : extension);
    this.render();
  }

  async setEnabled(id, enabled) {
    try {
      await chrome.management.setEnabled(id, enabled);
      this.extensions = this.extensions.map((extension) => extension.id === id ? { ...extension, enabled } : extension);
      this.render();
      this.toast(enabled ? "Extension enabled" : "Extension disabled");
    } catch (error) {
      console.error(error);
      this.toast("Chrome blocked that change");
      await this.loadExtensions();
    }
  }

  async removeExtension(extension) {
    if (extension.mayDisable === false) {
      this.toast("Chrome blocked removal for this extension");
      return;
    }

    const confirmed = window.confirm(`Remove "${extension.name}"? This will uninstall it from Chrome.`);
    if (!confirmed) {
      return;
    }

    try {
      await chrome.management.uninstall(extension.id, { showConfirmDialog: false });
      this.state.selected.delete(extension.id);
      this.toast(`Removed "${extension.name}"`);
      await this.loadExtensions();
    } catch (error) {
      console.error(error);
      this.toast("Unable to remove extension");
    }
  }

  async openExtensionSettings(extension) {
    const targetUrl = extension.optionsUrl || `chrome://extensions/?id=${extension.id}`;

    try {
      await chrome.tabs.create({ url: targetUrl });
    } catch (error) {
      console.error(error);
      this.toast("Unable to open settings page");
    }
  }

  async runBatchOperation(enabled) {
    const selectedIds = [...this.state.selected];
    const targets = this.extensions.filter((extension) => selectedIds.includes(extension.id) && extension.mayDisable !== false);

    if (!targets.length) {
      this.toast("Select manageable extensions first");
      return;
    }

    await Promise.all(targets.map((extension) => chrome.management.setEnabled(extension.id, enabled)));
    this.toast(`${enabled ? "Enabled" : "Disabled"} ${targets.length} extension${targets.length === 1 ? "" : "s"}`);
    await this.loadExtensions();
  }

  async runAllOperation(enabled) {
    const targets = this.extensions.filter((extension) => extension.mayDisable !== false && extension.enabled !== enabled);

    if (!targets.length) {
      this.toast(`No extensions to ${enabled ? "enable" : "disable"}`);
      return;
    }

    const confirmed = window.confirm(`${enabled ? "Enable" : "Disable"} all available extensions?`);
    if (!confirmed) {
      return;
    }

    await Promise.all(targets.map((extension) => chrome.management.setEnabled(extension.id, enabled)));
    this.toast(`${enabled ? "Enabled" : "Disabled"} ${targets.length} extension${targets.length === 1 ? "" : "s"}`);
    await this.loadExtensions();
  }

  async saveProfile(profileName) {
    if (!profileName) return;

    const profile = {
      enabledIds: this.extensions.filter((extension) => extension.enabled).map((extension) => extension.id),
      createdAt: Date.now()
    };

    await this.storage.saveProfile(profileName.trim(), profile);
    this.metadata.profiles = await this.storage.getProfiles();
    this.renderProfiles();
    this.toast(`Saved profile "${profileName.trim()}"`);
  }

async applyProfile(profileName) {
    if (!profileName) {
      this.toast("Choose a profile first");
      return;
    }

    const profiles = await this.storage.getProfiles();
    const profile = profiles[profileName];
    if (!profile) {
      this.toast("Profile not found");
      return;
    }

    const enabledIds = new Set(profile.enabledIds || []);
    const manageableExtensions = this.extensions.filter((extension) => extension.mayDisable !== false);

    await Promise.all(manageableExtensions.map((extension) => 
      chrome.management.setEnabled(extension.id, enabledIds.has(extension.id))
    ));
    
    this.toast(`Applied profile "${profileName}"`);
    await this.loadExtensions();
  }

  async deleteProfile(profileName) {
    if (!profileName) return;
    
    await this.storage.deleteProfile(profileName);
    this.metadata.profiles = await this.storage.getProfiles();
    this.renderProfiles();
    this.toast(`Deleted profile "${profileName}"`);
  }

  async exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profiles: await this.storage.getProfiles(),
      favorites: await this.storage.getFavorites(),
      tags: await this.storage.getTags(),
      states: this.extensions.map((extension) => ({
        id: extension.id,
        name: extension.name,
        enabled: extension.enabled
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "extension-manager-pro-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    this.toast("Backup exported");
  }

  async importBackup(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      await this.storage.importBackup(payload);

      if (Array.isArray(payload.states)) {
        const desiredStates = new Map(payload.states.map((item) => [item.id, item.enabled]));
        const manageable = this.extensions.filter((extension) => desiredStates.has(extension.id) && extension.mayDisable !== false);
        await Promise.all(manageable.map((extension) => chrome.management.setEnabled(extension.id, Boolean(desiredStates.get(extension.id)))));
      }

      await this.loadMetadata();
      await this.loadExtensions();
      this.toast("Backup imported");
    } catch (error) {
      console.error(error);
      this.toast("Import failed");
    } finally {
      event.target.value = "";
    }
  }

  getIconUrl(extension) {
    const icons = Array.isArray(extension.icons) ? [...extension.icons] : [];
    icons.sort((left, right) => (right.size || 0) - (left.size || 0));
    return icons[0]?.url || "icons/icon48.png";
  }

  setLoading(isLoading) {
    this.elements.loading.hidden = !isLoading;
    if (isLoading) {
      this.elements.grid.hidden = true;
      this.elements.empty.hidden = true;
    }
  }

  showState(message) {
    this.elements.loading.hidden = true;
    this.elements.grid.hidden = true;
    this.elements.empty.hidden = false;
    this.elements.empty.textContent = message;
  }

  toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    this.elements.toastRoot.appendChild(node);
    window.setTimeout(() => {
      node.remove();
    }, 2400);
  }

  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
  }

  createExtensionCard(extension) {
    const card = this.createElement("article", {
      className: `extension-card${extension.enabled ? "" : " disabled"}`,
      dataset: { id: extension.id }
    });

    const cardTop = this.createElement("div", { className: "card-top" });
    const selectionWrap = this.createElement("div", { className: "selection-wrap" });
    const selection = this.createElement("input", {
      className: "selection-checkbox",
      attributes: { type: "checkbox" },
      dataset: { role: "select-extension", id: extension.id }
    });
    selection.checked = this.state.selected.has(extension.id);

    const statusPill = this.createElement("span", {
      className: `status-pill ${extension.enabled ? "enabled" : "disabled"}`,
      text: extension.enabled ? "Enabled" : "Disabled"
    });
    selectionWrap.append(selection, statusPill);

    const favoriteButton = this.createElement("button", {
      className: `favorite-button ${extension.favorite ? "active" : ""}`.trim(),
      text: extension.favorite ? "★ Favorite" : "☆ Favorite",
      attributes: { type: "button", "aria-pressed": String(extension.favorite) },
      dataset: { role: "favorite-toggle", id: extension.id }
    });

    cardTop.append(selectionWrap, favoriteButton);

    const cardMain = this.createElement("div", { className: "card-main" });
    const icon = this.createElement("img", {
      className: "extension-icon",
      attributes: {
        src: this.getIconUrl(extension),
        alt: `${extension.name} icon`
      }
    });
    icon.addEventListener("error", () => {
      icon.src = "icons/icon48.png";
    });

    const infoWrap = document.createElement("div");
    const headline = this.createElement("div", { className: "extension-headline" });
    headline.append(
      this.createElement("h3", { className: "extension-name", text: extension.name }),
      this.createElement("span", { className: "version-pill", text: `v${extension.version || "n/a"}` })
    );
    infoWrap.append(
      headline,
      this.createElement("p", { className: "meta-line", text: `${extension.developer} · ${extension.installType || "unknown"}` }),
      this.createElement("p", { className: "description", text: extension.description || "No description provided." })
    );
    cardMain.append(icon, infoWrap);

    const detailMeta = this.createElement("div", { className: "detail-meta" });
    detailMeta.append(
      this.createElement("span", { className: "meta-pill", text: `${extension.permissions?.length || 0} permissions` }),
      this.createElement("span", { className: "meta-pill", text: `${extension.hostPermissions?.length || 0} host rules` }),
      this.createElement("span", { className: "meta-pill", text: `Seen ${this.formatDate(extension.firstSeen)}` })
    );

    const riskRow = this.createElement("div", { className: "risk-row" });
    const warningCount = extension.warnings.length;
    riskRow.append(
      this.createElement("span", {
        className: `risk-pill ${warningCount ? "" : "safe"}`.trim(),
        text: warningCount ? `${warningCount} warning${warningCount > 1 ? "s" : ""}` : "No high-risk flags"
      })
    );
    extension.warnings.slice(0, 3).forEach((warning) => {
      riskRow.appendChild(this.createElement("span", {
        className: `permission-pill ${RISKY_PERMISSIONS.includes(warning) || warning === "broad host access" ? "risky" : ""}`.trim(),
        text: warning
      }));
    });

    const tagRow = this.createElement("div", { className: "tag-row" });
    if (extension.tags.length) {
      extension.tags.forEach((tag) => {
        tagRow.appendChild(this.createElement("span", { className: "tag-chip", text: tag }));
      });
    } else {
      tagRow.appendChild(this.createElement("span", { className: "tag-empty", text: "No tags yet" }));
    }
    const tagInput = this.createElement("input", {
      className: "tag-input",
      attributes: { type: "text", placeholder: "Add tags, comma separated" },
      dataset: { role: "tag-input", id: extension.id }
    });
    tagInput.value = extension.tags.join(", ");
    tagRow.appendChild(tagInput);

    const cardActions = this.createElement("div", { className: "card-actions" });
    const actionGroup = this.createElement("div", { className: "action-group" });
    actionGroup.append(
      this.createActionButton("details-button", "View details", "open-details", extension.id),
      this.createActionButton("details-button", "Settings", "open-settings", extension.id),
      this.createActionButton("remove-button", "Remove", "remove-extension", extension.id, extension.mayDisable === false)
    );

    const favoriteWrap = this.createElement("div", { className: "favorite-wrap" });
    const toggleLabel = this.createElement("label", { className: "toggle-switch" });
    const toggleInput = this.createElement("input", {
      attributes: { type: "checkbox" },
      dataset: { role: "toggle-enabled", id: extension.id }
    });
    toggleInput.checked = extension.enabled;
    toggleInput.disabled = extension.mayDisable === false;
    toggleLabel.append(toggleInput, this.createElement("span", { className: "toggle-slider" }));
    favoriteWrap.appendChild(toggleLabel);

    cardActions.append(actionGroup, favoriteWrap);
    card.append(cardTop, cardMain, detailMeta, riskRow, tagRow, cardActions);
    return card;
  }

  createActionButton(className, text, role, id, disabled = false) {
    const button = this.createElement("button", {
      className,
      text,
      attributes: { type: "button" },
      dataset: { role, id }
    });
    button.disabled = disabled;
    return button;
  }

  createElement(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) {
      node.className = options.className;
    }
    if (options.text !== undefined) {
      node.textContent = options.text;
    }
    if (options.dataset) {
      Object.entries(options.dataset).forEach(([key, value]) => {
        node.dataset[key] = value;
      });
    }
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        node.setAttribute(key, value);
      });
    }
    return node;
  }

  createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
  }
}

const manager = new ExtensionManagerPro();
manager.init();

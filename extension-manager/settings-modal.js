// settings-modal.js
export class SettingsModal {
  constructor(options = {}) {
    this.root = options.root;
    this.onSaveProfile = options.onSaveProfile || (() => {});
    this.onApplyProfile = options.onApplyProfile || (() => {});
    this.onDeleteProfile = options.onDeleteProfile || (() => {});
    this.onExport = options.onExport || (() => {});
    this.onImport = options.onImport || (() => {});
    this.onToggleRiskWarnings = options.onToggleRiskWarnings || (() => {});
    
    this.isOpen = false;
    this.currentProfiles = {};
    this.template = document.getElementById('settings-modal-template');
    this.modalElement = null;
  }

  open(profiles = {}, settings = {}) {
    if (this.isOpen) return;
    
    this.currentProfiles = profiles;
    this.render(settings);
    this.isOpen = true;
  }

  close() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    this.isOpen = false;
  }

  render(settings = {}) {
    if (!this.root || !this.template) return;

    // Clone template
    const modalContent = this.template.content.cloneNode(true);
    this.modalElement = modalContent.querySelector('.modal-overlay');
    
    // Populate profiles
    const profileSelect = this.modalElement.querySelector('#settings-profile-select');
    this.updateProfileSelect(profileSelect);

    // Set toggle state
    const riskToggle = this.modalElement.querySelector('#show-risk-warnings');
    if (riskToggle) {
      riskToggle.checked = settings.showRiskWarnings !== false;
    }

    // Bind events
    this.bindEvents(modalContent);

    // Append to root
    this.root.innerHTML = '';
    this.root.appendChild(modalContent);
  }

  updateProfileSelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Select a profile</option>';
    
    Object.keys(this.currentProfiles).sort().forEach(profileName => {
      const option = document.createElement('option');
      option.value = profileName;
      option.textContent = profileName;
      selectElement.appendChild(option);
    });
  }

  updateProfiles(profiles) {
    this.currentProfiles = profiles;
    if (this.isOpen && this.modalElement) {
      const profileSelect = this.modalElement.querySelector('#settings-profile-select');
      this.updateProfileSelect(profileSelect);
    }
  }

  bindEvents(content) {
    // Close button
    const closeBtn = content.querySelector('#close-settings-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    const overlay = content.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    // Profile actions
    const saveBtn = content.querySelector('#settings-save-profile');
    const applyBtn = content.querySelector('#settings-apply-profile');
    const deleteBtn = content.querySelector('#settings-delete-profile');
    const profileSelect = content.querySelector('#settings-profile-select');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const profileName = prompt('Enter profile name:');
        if (profileName) {
          this.onSaveProfile(profileName.trim());
        }
      });
    }

    if (applyBtn && profileSelect) {
      applyBtn.addEventListener('click', () => {
        const profileName = profileSelect.value;
        if (profileName) {
          this.onApplyProfile(profileName);
        } else {
          alert('Please select a profile first');
        }
      });
    }

    if (deleteBtn && profileSelect) {
      deleteBtn.addEventListener('click', () => {
        const profileName = profileSelect.value;
        if (profileName && confirm(`Delete profile "${profileName}"?`)) {
          this.onDeleteProfile(profileName);
        } else if (!profileName) {
          alert('Please select a profile first');
        }
      });
    }

    // Backup actions
    const exportBtn = content.querySelector('#settings-export');
    const importBtn = content.querySelector('#settings-import');
    const importFile = content.querySelector('#settings-import-file');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.onExport());
    }

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        this.onImport(e);
        importFile.value = ''; // Reset
      });
    }

    // Display settings
    const riskToggle = content.querySelector('#show-risk-warnings');
    if (riskToggle) {
      riskToggle.addEventListener('change', (e) => {
        this.onToggleRiskWarnings(e.target.checked);
      });
    }
  }
}
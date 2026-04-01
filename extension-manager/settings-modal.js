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

    if (window.CADropdowns && profileSelect) {
      window.CADropdowns.build(profileSelect);
    }
  }

  updateProfileSelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a profile';
    selectElement.appendChild(placeholder);

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
        this.promptModal('Save profile', 'Enter a profile name').then((profileName) => {
          if (profileName) this.onSaveProfile(profileName.trim());
        });
      });
    }

    if (applyBtn && profileSelect) {
      applyBtn.addEventListener('click', () => {
        const profileName = profileSelect.value;
        if (profileName) {
          this.onApplyProfile(profileName);
        } else {
          this.alertModal('Please select a profile first');
        }
      });
    }

    if (deleteBtn && profileSelect) {
      deleteBtn.addEventListener('click', () => {
        const profileName = profileSelect.value;
        if (!profileName) {
          this.alertModal('Please select a profile first');
          return;
        }
        this.confirmModal('Delete profile', `Delete profile "${profileName}"?`).then((ok) => {
          if (ok) this.onDeleteProfile(profileName);
        });
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

  alertModal(message, title = 'Notice') {
    return this.confirmModal(title, message, { confirmText: 'OK', showCancel: false });
  }

  confirmModal(title, message, options = {}) {
    const { confirmText = 'Confirm', showCancel = true } = options;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const card = document.createElement('div');
      card.className = 'modal-card';

      const header = document.createElement('div');
      header.className = 'modal-header';
      const h2 = document.createElement('h2');
      h2.textContent = title;
      const close = document.createElement('button');
      close.className = 'modal-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '✕';
      header.append(h2, close);

      const body = document.createElement('div');
      body.className = 'modal-body';
      const p = document.createElement('p');
      p.className = 'modal-message';
      p.textContent = message;
      body.appendChild(p);

      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const ok = document.createElement('button');
      ok.className = 'primary-button';
      ok.type = 'button';
      ok.textContent = confirmText;
      if (showCancel) {
        const cancel = document.createElement('button');
        cancel.className = 'ghost-button';
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        footer.append(cancel, ok);
        cancel.addEventListener('click', () => cleanup(false));
      } else {
        footer.append(ok);
      }

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };

      ok.addEventListener('click', () => cleanup(true));
      close.addEventListener('click', () => cleanup(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

      card.append(header, body, footer);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    });
  }

  promptModal(title, placeholder) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const card = document.createElement('div');
      card.className = 'modal-card';

      const header = document.createElement('div');
      header.className = 'modal-header';
      const h2 = document.createElement('h2');
      h2.textContent = title;
      const close = document.createElement('button');
      close.className = 'modal-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '✕';
      header.append(h2, close);

      const body = document.createElement('div');
      body.className = 'modal-body';
      const input = document.createElement('input');
      input.className = 'modal-input';
      input.type = 'text';
      input.placeholder = placeholder;
      body.appendChild(input);

      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const cancel = document.createElement('button');
      cancel.className = 'ghost-button';
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      const ok = document.createElement('button');
      ok.className = 'primary-button';
      ok.type = 'button';
      ok.textContent = 'Save';
      footer.append(cancel, ok);

      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };

      cancel.addEventListener('click', () => cleanup(''));
      close.addEventListener('click', () => cleanup(''));
      ok.addEventListener('click', () => cleanup(input.value.trim()));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(''); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') cleanup(input.value.trim());
      });

      card.append(header, body, footer);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      setTimeout(() => input.focus(), 0);
    });
  }
}

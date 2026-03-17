const RISKY_PERMISSIONS = ["tabs", "cookies", "history", "webRequest", "webRequestBlocking", "declarativeNetRequest"];

export class DetailsModal {
  constructor({ root, onSaveTags, onToggleFavorite }) {
    this.root = root;
    this.onSaveTags = onSaveTags;
    this.onToggleFavorite = onToggleFavorite;
  }

  open(extension) {
    this.close();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modalCard = this.createElement("div", {
      className: "modal-card",
      attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "details-title" }
    });

    const modalHeader = this.createElement("div", { className: "modal-header" });
    const headerText = document.createElement("div");
    headerText.append(
      this.createElement("p", { className: "eyebrow", text: "Extension Details" }),
      this.createElement("h2", { text: extension.name, attributes: { id: "details-title" } }),
      this.createElement("p", { className: "subcopy", text: `${extension.developer} · Version ${extension.version || "n/a"}` })
    );
    const closeButton = this.createElement("button", {
      className: "modal-close",
      text: "×",
      attributes: { type: "button", "aria-label": "Close details" },
      dataset: { role: "close-modal" }
    });
    modalHeader.append(headerText, closeButton);

    const metaRow = this.createElement("div", { className: "detail-meta" });
    metaRow.append(
      this.createElement("span", { className: "meta-pill", text: extension.enabled ? "Enabled" : "Disabled" }),
      this.createElement("span", { className: "meta-pill", text: extension.installType || "unknown" }),
      this.createElement("span", { className: "meta-pill", text: extension.homepageUrl || "No homepage URL" })
    );

    const descriptionSection = this.createSection("Description");
    descriptionSection.appendChild(this.createElement("p", { className: "description", text: extension.description || "No description provided." }));

    const permissionsSection = this.createSection("Permissions");
    const permissionList = this.createElement("div", { className: "permission-list" });
    permissionList.appendChild(this.renderPermissions(extension.permissions || []));
    permissionsSection.append(
      permissionList,
      this.createElement("p", {
        className: "permission-empty",
        text: (extension.hostPermissions || []).length
          ? `Host access: ${(extension.hostPermissions || []).join(", ")}`
          : "No host permissions exposed by Chrome."
      })
    );

    const warningsSection = this.createSection("Security Warnings");
    const warningsList = this.createElement("div", { className: "permission-list" });
    warningsList.appendChild(this.renderWarnings(extension));
    warningsSection.appendChild(warningsList);

    const organizationSection = this.createSection("Organization");
    const tagList = this.createElement("div", { className: "modal-tags" });
    if ((extension.tags || []).length) {
      extension.tags.forEach((tag) => {
        tagList.appendChild(this.createElement("span", { className: "tag-chip", text: tag }));
      });
    } else {
      tagList.appendChild(this.createElement("span", { className: "tag-empty", text: "No tags saved" }));
    }
    const field = this.createElement("label", { className: "modal-field" });
    const fieldLabel = document.createElement("span");
    fieldLabel.textContent = "Tags";
    const textarea = this.createElement("textarea", { dataset: { role: "modal-tags-input" } });
    textarea.value = (extension.tags || []).join(", ");
    field.append(fieldLabel, textarea);
    const actions = this.createElement("div", { className: "modal-actions" });
    actions.append(
      this.createElement("button", {
        className: "ghost-button",
        text: extension.favorite ? "Remove Favorite" : "Add Favorite",
        attributes: { type: "button" },
        dataset: { role: "toggle-favorite" }
      }),
      this.createElement("button", {
        className: "primary-button",
        text: "Save Tags",
        attributes: { type: "button" },
        dataset: { role: "save-tags" }
      })
    );
    organizationSection.append(tagList, field, actions);

    modalCard.append(modalHeader, metaRow, descriptionSection, permissionsSection, warningsSection, organizationSection);
    overlay.appendChild(modalCard);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.role === "close-modal") {
        this.close();
      }
    });

    overlay.querySelector('[data-role="toggle-favorite"]').addEventListener("click", async () => {
      await this.onToggleFavorite(extension.id);
      this.close();
    });

    overlay.querySelector('[data-role="save-tags"]').addEventListener("click", async () => {
      const rawValue = overlay.querySelector('[data-role="modal-tags-input"]').value;
      const tags = rawValue.split(",").map((tag) => tag.trim()).filter(Boolean);
      await this.onSaveTags(extension.id, tags);
      this.close();
    });

    this.root.appendChild(overlay);
    this.currentOverlay = overlay;
  }

  close() {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
  }

  renderPermissions(permissions) {
    if (!permissions.length) {
      return this.createElement("span", { className: "permission-empty", text: "No explicit permissions reported." });
    }

    const fragment = document.createDocumentFragment();
    permissions.forEach((permission) => {
      fragment.appendChild(this.createElement("span", {
        className: `permission-pill ${RISKY_PERMISSIONS.includes(permission) ? "risky" : ""}`.trim(),
        text: permission
      }));
    });
    return fragment;
  }

  renderWarnings(extension) {
    const warnings = [...(extension.riskyPermissions || [])];

    if (extension.hasBroadHosts) {
      warnings.push("broad host permissions");
    }

    if (!warnings.length) {
      return this.createElement("span", { className: "permission-pill", text: "No major warnings detected" });
    }

    const fragment = document.createDocumentFragment();
    warnings.forEach((warning) => {
      fragment.appendChild(this.createElement("span", { className: "permission-pill risky", text: warning }));
    });
    return fragment;
  }

  createSection(title) {
    const section = this.createElement("section", { className: "modal-section" });
    section.appendChild(this.createElement("p", { className: "eyebrow", text: title }));
    return section;
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
}

const STORAGE_KEY = 'gitignoreProState';

export async function loadPersistedState() {
  const stored = await chrome.storage.local.get([STORAGE_KEY]);
  return stored[STORAGE_KEY] || null;
}

export async function persistState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export function saveCustomTemplate(existingTemplates, template) {
  const created = {
    ...template,
    id: `user-${Date.now()}`,
    userDefined: true
  };
  return {
    created,
    collection: [created, ...existingTemplates]
  };
}

export function deleteCustomTemplate(existingTemplates, templateId) {
  return existingTemplates.filter(template => template.id !== templateId);
}

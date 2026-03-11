const MAX_VIEW_NOTE_KEY_LENGTH = 180;
export const MAX_VIEW_NOTE_TEMPLATE_LENGTH = 4000;
const MAX_VIEW_NOTES_PER_TAB = 250;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePathSegment(segment) {
  return String(segment || '').trim().toLowerCase();
}

function normalizeDrillPath(drillPath = []) {
  return (Array.isArray(drillPath) ? drillPath : [])
    .map(normalizePathSegment)
    .filter(Boolean);
}

function normalizeScopeKey(scopeKey) {
  return String(scopeKey || '').trim().slice(0, MAX_VIEW_NOTE_KEY_LENGTH);
}

export function buildTabViewNoteScopeKey({ groupId = '', drillPath = [] } = {}) {
  const normalizedGroupId = String(groupId || '').trim();
  if (!normalizedGroupId) {
    return '';
  }

  const normalizedPath = normalizeDrillPath(drillPath);
  const encodedPath = normalizedPath.length ? normalizedPath.join('>') : 'root';

  return normalizeScopeKey(`group:${normalizedGroupId}|path:${encodedPath}`);
}

export function normalizeTabViewNoteTemplate(value) {
  const normalizedTemplate = String(value ?? '').slice(0, MAX_VIEW_NOTE_TEMPLATE_LENGTH);
  return normalizedTemplate.trim() ? normalizedTemplate : '';
}

export function normalizeTabViewNoteShowInMainView(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalizedValue = String(value || '').trim().toLowerCase();
  return normalizedValue === 'true' || normalizedValue === '1';
}

function normalizeNoteEntry(entry) {
  const rawTemplate = typeof entry === 'string'
    ? entry
    : (isPlainObject(entry) ? entry.template : '');
  const template = normalizeTabViewNoteTemplate(rawTemplate);
  if (!template) {
    return null;
  }

  const rawUpdatedAt = isPlainObject(entry) ? entry.updatedAt : '';
  const updatedAt = String(rawUpdatedAt || '').trim();
  const rawShowInMainView = isPlainObject(entry) ? entry.showInMainView : false;
  const showInMainView = normalizeTabViewNoteShowInMainView(rawShowInMainView);

  return updatedAt
    ? { template, showInMainView, updatedAt }
    : { template, showInMainView };
}

export function normalizeTabNotesByView(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalizedEntries = {};
  let count = 0;

  for (const [rawScopeKey, rawEntry] of Object.entries(value)) {
    if (count >= MAX_VIEW_NOTES_PER_TAB) {
      break;
    }

    const scopeKey = normalizeScopeKey(rawScopeKey);
    if (!scopeKey) {
      continue;
    }

    const normalizedEntry = normalizeNoteEntry(rawEntry);
    if (!normalizedEntry) {
      continue;
    }

    normalizedEntries[scopeKey] = normalizedEntry;
    count += 1;
  }

  return normalizedEntries;
}

export function resolveTabViewNoteTemplate(tab = null, scopeKey = '') {
  const normalizedScopeKey = normalizeScopeKey(scopeKey);
  if (!tab || !normalizedScopeKey) {
    return '';
  }

  const notesByView = normalizeTabNotesByView(tab.tabNotesByView);
  return String(notesByView[normalizedScopeKey]?.template || '');
}

export function resolveTabViewNoteShowInMainView(tab = null, scopeKey = '') {
  const normalizedScopeKey = normalizeScopeKey(scopeKey);
  if (!tab || !normalizedScopeKey) {
    return false;
  }

  const notesByView = normalizeTabNotesByView(tab.tabNotesByView);
  return normalizeTabViewNoteShowInMainView(notesByView[normalizedScopeKey]?.showInMainView);
}

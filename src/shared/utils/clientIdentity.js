const CLIENT_ID_STORAGE_KEY = 'tracktabs.client-id';
let cachedClientId = '';

function generateClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientId() {
  if (cachedClientId) {
    return cachedClientId;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    cachedClientId = generateClientId();
    return cachedClientId;
  }

  const stored = String(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '').trim();
  if (stored) {
    cachedClientId = stored;
    return cachedClientId;
  }

  const created = generateClientId();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
  cachedClientId = created;
  return cachedClientId;
}

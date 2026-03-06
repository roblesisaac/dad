import { onBeforeUnmount } from 'vue';
import { useAuth } from '@/shared/composables/useAuth.js';
import { getClientId } from '@/shared/utils/clientIdentity.js';

const DEFAULT_INTERVAL_MS = 15000;

function normalizeSyncPayload(payload = {}) {
  const safeMutations = payload?.mutations && typeof payload.mutations === 'object'
    ? payload.mutations
    : {};

  return {
    appRevision: typeof payload?.appRevision === 'string' ? payload.appRevision : '',
    resources: payload?.resources && typeof payload.resources === 'object'
      ? payload.resources
      : {},
    mutations: safeMutations
  };
}

export function useRemoteSync(options = {}) {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    resourceKeys = [],
    onChange = null
  } = options;

  const { getToken } = useAuth();
  const syncStateUrl = `${window.location.origin}/api/sync/state`;

  let intervalId = null;
  let isStarted = false;
  let isInFlight = false;
  let lastPayload = null;

  function getRelevantRevision(payload) {
    if (!Array.isArray(resourceKeys) || !resourceKeys.length) {
      return payload.appRevision;
    }

    return resourceKeys
      .map(resourceKey => `${resourceKey}:${String(payload.resources?.[resourceKey] || '')}`)
      .join('|');
  }

  function getChangedResourceKeys(currentPayload, previousPayload) {
    const keysToCheck = Array.isArray(resourceKeys) && resourceKeys.length
      ? resourceKeys
      : Array.from(new Set([
        ...Object.keys(previousPayload?.resources || {}),
        ...Object.keys(currentPayload?.resources || {})
      ]));

    return keysToCheck.filter(resourceKey => (
      String(currentPayload?.resources?.[resourceKey] || '')
      !== String(previousPayload?.resources?.[resourceKey] || '')
    ));
  }

  function allChangedResourcesFromCurrentClient(currentPayload, previousPayload) {
    const clientId = getClientId();
    if (!clientId) {
      return false;
    }

    const changedKeys = getChangedResourceKeys(currentPayload, previousPayload);
    if (!changedKeys.length) {
      return false;
    }

    return changedKeys.every((resourceKey) => (
      String(currentPayload?.mutations?.[resourceKey]?.updatedByClientId || '') === clientId
    ));
  }

  async function fetchSyncState() {
    const auth0Token = await getToken();
    const headers = {
      'X-TrackTabs-Client-Id': getClientId()
    };

    if (auth0Token) {
      headers.Authorization = `Bearer ${auth0Token}`;
    }

    const response = await fetch(syncStateUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Sync state request failed with status ${response.status}`);
    }

    return normalizeSyncPayload(await response.json());
  }

  async function checkNow(options = {}) {
    const { force = false } = options;

    if (!isStarted || isInFlight) {
      return;
    }

    if (!force && typeof document !== 'undefined' && document.hidden) {
      return;
    }

    isInFlight = true;

    try {
      const currentPayload = await fetchSyncState();

      if (!lastPayload) {
        lastPayload = currentPayload;
        return;
      }

      const hasRelevantChange = getRelevantRevision(currentPayload) !== getRelevantRevision(lastPayload);
      if (!hasRelevantChange) {
        lastPayload = currentPayload;
        return;
      }

      if (allChangedResourcesFromCurrentClient(currentPayload, lastPayload)) {
        lastPayload = currentPayload;
        return;
      }

      const changeHandled = typeof onChange === 'function'
        ? await onChange(currentPayload, lastPayload)
        : true;

      if (changeHandled === false) {
        return;
      }

      lastPayload = currentPayload;
    } catch (error) {
      console.error('Remote sync polling failed', error);
    } finally {
      isInFlight = false;
    }
  }

  function handleVisibilityChange() {
    if (typeof document !== 'undefined' && !document.hidden) {
      void checkNow({ force: true });
    }
  }

  function start() {
    if (isStarted) {
      return;
    }

    isStarted = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    intervalId = window.setInterval(() => {
      void checkNow();
    }, intervalMs);

    void checkNow({ force: true });
  }

  function stop() {
    if (!isStarted) {
      return;
    }

    isStarted = false;

    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  onBeforeUnmount(() => {
    stop();
  });

  return {
    start,
    stop,
    checkNow: () => checkNow({ force: true })
  };
}

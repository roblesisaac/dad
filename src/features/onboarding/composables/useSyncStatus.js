import { ref, onUnmounted } from 'vue';

export function useSyncStatus(api, state) {
  const syncInterval = ref(null);
  const SYNC_CHECK_INTERVAL = 2000; // 2 seconds
  const MAX_POLL_TIME = 300000; // 5 minutes
  const startTime = ref(null);

  /**
   * Checks sync status for all items or a specific item
   * @param {string} [itemId] - Optional specific item to check
   * @returns {Promise<Object>} Sync status result
   */
  async function checkSyncStatus(itemId = null) {
    try {
      const status = await api.get(`plaid/onboarding/status/${itemId}`);
      
      // Update progress in state
      if (status.progress) {
        state.syncProgress = {
          added: status.progress.added || 0,
          modified: status.progress.modified || 0,
          removed: status.progress.removed || 0,
          status: status.status || 'queued',
          lastSync: status.progress.lastSync,
          nextSync: status.progress.nextSync,
          cursor: status.progress.cursor
        };
      }

      updateUIWithSyncStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking sync status:', error);
      updateStatusBar('Error checking sync status', false);
      return { completed: false, error: error.message };
    }
  }

  /**
   * Updates UI based on sync status
   * @param {Object} status - Current sync status
   */
  function updateUIWithSyncStatus(status) {
    if (status.error) {
      updateStatusBar(`Sync error: ${status.error}`, false);
      return;
    }

    if (status.completed) {
      updateStatusBar('Transactions synced successfully!', false);
      return;
    }

    const progress = status.progress || {};
    updateStatusBar(
      `Syncing transactions... (${progress.added || 0} processed)`,
      true
    );
  }

  /**
   * Starts polling for sync status
   * @param {string} itemId - Specific item to poll
   */
  async function startSyncPolling(itemId) {
    if (!itemId) {
      console.error('No itemId provided for sync polling');
      return { completed: false, error: 'MISSING_ITEM_ID' };
    }

    clearSyncCheck();
    startTime.value = Date.now();
    
    // Set initial state
    state.onboardingStep = 'syncing';
    state.syncProgress = {
      added: 0,
      modified: 0,
      removed: 0,
      status: 'queued'
    };

    const pollStatus = async () => {
      try {
        if (Date.now() - startTime.value > MAX_POLL_TIME) {
          clearSyncCheck();
          updateStatusBar('Sync timed out. Please try again.', false);
          return { completed: false, error: 'SYNC_TIMEOUT' };
        }

        const status = await api.get(`plaid/onboarding/status/${itemId}`);
        console.log('Sync status:', status); // Debug log

        // Update progress in state
        if (status.progress) {
          state.syncProgress = {
            added: status.progress.added || 0,
            modified: status.progress.modified || 0,
            removed: status.progress.removed || 0,
            status: status.status || 'queued',
            lastSync: status.progress.lastSync,
            nextSync: status.progress.nextSync,
            cursor: status.progress.cursor
          };
        }

        updateUIWithSyncStatus(status);

        if (status.error) {
          clearSyncCheck();
          return status;
        }

        if (status.completed) {
          clearSyncCheck();
          state.onboardingStep = 'complete';
          return status;
        }

        // Continue polling
        return new Promise(resolve => {
          syncInterval.value = setTimeout(async () => {
            const result = await pollStatus();
            resolve(result);
          }, SYNC_CHECK_INTERVAL);
        });
      } catch (error) {
        console.error('Error in poll status:', error);
        clearSyncCheck();
        return { completed: false, error: error.message };
      }
    };

    return pollStatus();
  }

  function updateStatusBar(message, loading = false) {
    state.blueBar.message = message;
    state.blueBar.loading = loading;
  }

  function clearSyncCheck() {
    clearTimeout(syncInterval.value);
    syncInterval.value = null;
    startTime.value = null;
  }

  // Clean up on unmount
  onUnmounted(() => {
    clearSyncCheck();
  });

  return {
    checkSyncStatus,
    startSyncPolling,
    clearSyncCheck
  };
} 
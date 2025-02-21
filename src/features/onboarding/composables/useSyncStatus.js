import { ref, onUnmounted } from 'vue';

export function useSyncStatus(api, state) {
  const syncInterval = ref(null);
  const SYNC_CHECK_INTERVAL = 5000; // 5 seconds
  const MAX_RETRIES = 3;

  async function renderSyncStatus(syncCheckId) {
    if (state.syncCheckId !== syncCheckId) {
      return;
    }

    try {
      const items = await api.get('plaid/items');
      
      if (!items?.length) {
        updateStatusBar('No items found', false);
        clearSyncCheck();
        return;
      }

      const itemsSyncing = items.filter(item => 
        item.syncData.status !== 'completed'
      );

      if (!itemsSyncing.length) {
        updateStatusBar('All transactions synced successfully!', false);
        clearSyncCheck();
        return;
      }

      // Update status bar with sync progress
      const s = itemsSyncing.length > 1 ? 's' : '';
      const syncStatus = itemsSyncing.some(item => item.syncData.status === 'queued') 
        ? 'Queued' 
        : itemsSyncing[0].syncData.status;
      
      updateStatusBar(
        `Sync status is '${syncStatus}' across ${itemsSyncing.length} bank${s}.`,
        true
      );

      // Check for failures
      if (itemsSyncing.some(item => item.syncData.status === 'failed')) {
        state.views.push('ItemRepair');
        clearSyncCheck();
        return;
      }

      // Schedule next check
      scheduleNextCheck(syncCheckId);
    } catch (error) {
      console.error('Error checking sync status:', error);
      handleSyncError();
    }
  }

  function updateStatusBar(message, loading = false) {
    state.blueBar.message = message;
    state.blueBar.loading = loading;
  }

  function clearSyncCheck() {
    clearTimeout(syncInterval.value);
    state.syncCheckId = false;
    
    // Clear status bar after delay
    setTimeout(() => {
      state.blueBar.message = false;
      state.blueBar.loading = false;
    }, 3000);
  }

  function scheduleNextCheck(syncCheckId) {
    clearTimeout(syncInterval.value);
    syncInterval.value = setTimeout(
      () => renderSyncStatus(syncCheckId), 
      SYNC_CHECK_INTERVAL
    );
  }

  function handleSyncError() {
    updateStatusBar('Error checking sync status. Retrying...', true);
    
    // Implement retry logic
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      if (retryCount >= MAX_RETRIES) {
        clearInterval(retryInterval);
        updateStatusBar('Failed to check sync status', false);
        clearSyncCheck();
        return;
      }
      
      renderSyncStatus(state.syncCheckId);
      retryCount++;
    }, SYNC_CHECK_INTERVAL);
  }

  async function checkSyncStatus() {
    if (state.syncCheckId !== false) {
      return;
    }

    const syncCheckId = Date.now();
    state.syncCheckId = syncCheckId;
    await renderSyncStatus(syncCheckId);
  }

  // Clean up on unmount
  onUnmounted(() => {
    clearTimeout(syncInterval.value);
  });

  return {
    checkSyncStatus,
    renderSyncStatus
  };
} 
export function useSyncStatus(api, state) {
  async function renderSyncStatus(syncCheckId) {
    if(state.syncCheckId !== syncCheckId) {
      return;
    }

    let itemsSyncing = [];
    const items = await api.get('plaid/items');

    if(!items.length) {
      state.blueBar.message = 'No items found';
      state.blueBar.loading = false;
      setTimeout(() => {
        state.syncCheckId = false;
        state.blueBar.message = false;
      }, 3000);
      return;
    }

    // Rest of existing sync status logic...
  }

  async function checkSyncStatus() {
    if(state.syncCheckId !== false) {
      return;
    }

    const syncCheckId = Date.now();
    state.syncCheckId = syncCheckId;
    await renderSyncStatus(syncCheckId);
  }

  return {
    checkSyncStatus,
    renderSyncStatus
  };
} 
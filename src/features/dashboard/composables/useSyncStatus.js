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

    for (const item of items ) {
      if(item.syncData.status === 'completed') {
        continue;
      }

      itemsSyncing.push(item.syncData.status);
    }

    if(!itemsSyncing.length) {
      state.blueBar.message = `All transactions synced successfully!`;
      state.blueBar.loading = false;
      setTimeout(() => {
        state.syncCheckId = false;
        state.blueBar.message = false;
      }, 3000);

      return;
    }

    const s = itemsSyncing.length > 1 ? 's' : '';
    const syncStatus = itemsSyncing.includes('queued') ? 'Queued' : itemsSyncing[0];
    state.blueBar.message = `Sync status is '${syncStatus}' across ${itemsSyncing.length} bank${s}.`;
    state.blueBar.loading = true;

    if(itemsSyncing.includes('failed')) {
      state.views.push('ItemRepair');
      state.blueBar.loading = false;
      state.syncCheckId = false;
      state.blueBar.message = false;
      state.syncCheckId = false;
      return;
    }

    setTimeout(() => renderSyncStatus(syncCheckId), 5*1000);
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
import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * Composable for handling Plaid transaction sync status on the dashboard
 * @param {Object} api - API instance
 * @param {Object} state - Dashboard state
 * @returns {Object} Sync status methods and properties
 */
export function useSyncStatus(api, state) {
  const isSyncing = ref(false);
  const syncProgress = ref({});
  const syncInterval = ref(null);
  const pollInterval = 10000; // 10 seconds
  const MAX_CONSECUTIVE_BATCHES = 10; // Max batches to process without giving UI a chance to update
  
  /**
   * Start the background sync for all items
   * @returns {Promise<Object>} Sync initiation result
   */
  const startBackgroundSync = async () => {
    try {
      isSyncing.value = true;
      updateStatusBar('Starting transaction sync...', true);
      
      // Get all user items
      const items = await api.get('plaid/items');
      
      if (!items || items.length === 0) {
        updateStatusBar('No connected accounts', false);
        isSyncing.value = false;
        return { error: 'No items found' };
      }
      
      // Process each item's first batch
      const batchResults = await processBatchForAllItems();
      
      if (batchResults.error) {
        updateStatusBar(`Error: ${batchResults.error}`, false);
        isSyncing.value = false;
        return batchResults;
      }
      
      // Check if any items have more batches to process
      const itemsWithMoreBatches = batchResults.items.filter(item => item.hasMore);
      
      if (itemsWithMoreBatches.length > 0) {
        // Start polling to process additional batches
        startPolling();
        updateStatusBar(`Processing transactions (${countTotalProcessed(batchResults.items)} processed)`, true);
      } else {
        // All items completed in first batch
        updateStatusBar('All transactions synced successfully!', false);
        isSyncing.value = false;
      }
      
      return batchResults;
    } catch (error) {
      console.error('Error starting background sync:', error);
      updateStatusBar(`Sync error: ${error.message || 'Unknown error'}`, false);
      isSyncing.value = false;
      return { error: error.message };
    }
  };
  
  /**
   * Process a single batch for all items
   * @returns {Promise<Object>} Batch processing results for all items
   */
  const processBatchForAllItems = async () => {
    try {
      const response = await api.get('plaid/sync/all/transactions');
      return response;
    } catch (error) {
      console.error('Error processing batch for all items:', error);
      return { error: error.message };
    }
  };
  
  /**
   * Process additional batches for items that have more data
   * @param {number} [maxConsecutiveBatches=3] - Maximum batches to process consecutively before returning
   * @returns {Promise<Object>} Results of batch processing
   */
  const processAdditionalBatches = async (maxConsecutiveBatches = MAX_CONSECUTIVE_BATCHES) => {
    try {
      // Get all items
      const items = await api.get('plaid/items');
      
      if (!items || items.length === 0) {
        return { error: 'No items found' };
      }
      
      // Find items that are still in progress
      const inProgressItems = items.filter(item => 
        item.syncData?.status === 'in_progress'
      );
      
      if (inProgressItems.length === 0) {
        // No more items to process
        return { completed: true };
      }
      
      // Process batches for in-progress items (up to maxConsecutiveBatches per item)
      let anyMoreBatches = false;
      let batchesProcessed = 0;
      let totalStats = { added: 0, modified: 0, removed: 0 };
      
      for (const item of inProgressItems) {
        // Process up to maxConsecutiveBatches for this item
        let hasMore = true;
        let itemBatchesProcessed = 0;
        
        while (hasMore && itemBatchesProcessed < maxConsecutiveBatches) {
          const batchResult = await api.post(`plaid/onboarding/sync/${item._id}`);
          itemBatchesProcessed++;
          batchesProcessed++;
          
          // Update totals
          totalStats.added += batchResult.stats?.added || 0;
          totalStats.modified += batchResult.stats?.modified || 0;
          totalStats.removed += batchResult.stats?.removed || 0;
          
          // Check if there are more batches
          hasMore = batchResult.hasMore;
          
          if (!hasMore) {
            break;
          }
        }
        
        // If this item still has more batches, flag that we need to continue
        if (hasMore) {
          anyMoreBatches = true;
        }
      }
      
      return {
        completed: !anyMoreBatches,
        batchesProcessed,
        anyMoreBatches,
        stats: totalStats
      };
    } catch (error) {
      console.error('Error processing additional batches:', error);
      return { error: error.message };
    }
  };
  
  /**
   * Start polling for sync status updates
   */
  const startPolling = () => {
    // Clear any existing interval
    stopPolling();
    
    // Start a new polling interval
    syncInterval.value = setInterval(async () => {
      const result = await processAdditionalBatches();
      
      if (result.error) {
        updateStatusBar(`Error: ${result.error}`, false);
        stopPolling();
        isSyncing.value = false;
        return;
      }
      
      if (result.completed) {
        updateStatusBar('All transactions synced successfully!', false);
        stopPolling();
        isSyncing.value = false;
        return;
      }
      
      // Update progress
      await checkSyncStatus();
    }, pollInterval);
  };
  
  /**
   * Stop polling for sync status
   */
  const stopPolling = () => {
    if (syncInterval.value) {
      clearInterval(syncInterval.value);
      syncInterval.value = null;
    }
  };
  
  /**
   * Count total transactions processed across all items
   * @param {Array} items - Array of item results
   * @returns {number} Total processed transactions
   */
  const countTotalProcessed = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      return total + (item.stats?.totalAdded || 0);
    }, 0);
  };
  
  /**
   * Check sync status for all items
   * @returns {Promise<boolean>} True if any item is still syncing
   */
  const checkSyncStatus = async () => {
    try {
      // Get all items
      const items = await api.get('plaid/items');
      
      if (!items || items.length === 0) {
        updateStatusBar('No connected accounts', false);
        stopPolling();
        isSyncing.value = false;
        return false;
      }
      
      // Check if any item is still syncing
      let anySyncing = false;
      let totalProcessed = 0;
      let allCompleted = true;
      
      for (const item of items) {
        if (item.syncData?.status === 'in_progress') {
          anySyncing = true;
          allCompleted = false;
          
          // If we have stats, add to total
          if (item.syncData?.stats) {
            totalProcessed += item.syncData.stats.added || 0;
          }
        } else if (item.syncData?.status === 'error') {
          allCompleted = false;
        }
      }
      
      // Update UI based on sync status
      if (anySyncing) {
        updateStatusBar(`Syncing transactions... (${totalProcessed} processed)`, true);
        return true;
      } else if (allCompleted) {
        updateStatusBar('All transactions synced successfully!', false);
        isSyncing.value = false;
        stopPolling();
        return false;
      } else {
        // Some items may have errored
        updateStatusBar('Sync completed with some errors', false);
        isSyncing.value = false;
        stopPolling();
        return false;
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
      updateStatusBar('Error checking sync status', false);
      return false;
    }
  };
  
  /**
   * Update the status bar in the dashboard state
   * @param {string} message - Status message
   * @param {boolean} loading - Whether to show loading indicator
   */
  const updateStatusBar = (message, loading = false) => {
    if (state.blueBar) {
      state.blueBar.message = message;
      state.blueBar.loading = loading;
    }
  };
  
  // Computed property to check if all syncs are complete
  const allSyncsComplete = computed(() => {
    if (!syncProgress.value || Object.keys(syncProgress.value).length === 0) {
      return true;
    }
    
    return !Object.values(syncProgress.value).some(
      item => item.status === 'in_progress'
    );
  });
  
  // Initialize sync status check on mount
  onMounted(async () => {
    await checkSyncStatus();
  });
  
  // Clean up on unmount
  onUnmounted(() => {
    stopPolling();
  });
  
  return {
    isSyncing,
    syncProgress,
    allSyncsComplete,
    startBackgroundSync,
    checkSyncStatus,
    startPolling,
    stopPolling,
    processAdditionalBatches
  };
} 
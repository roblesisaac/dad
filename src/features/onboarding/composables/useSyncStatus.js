import { ref, onUnmounted } from 'vue';

export function useSyncStatus(api, state) {
  const syncInterval = ref(null);
  const MAX_POLL_TIME = 300000; // 5 minutes
  const startTime = ref(null);
  const isSyncingBatch = ref(false);

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
          cursor: status.progress.cursor,
          batchNumber: status.progress.batchNumber || 0
        };
      }

      updateUIWithSyncStatus(status);
      return status;
    } catch (error) {
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
    const batchInfo = progress.batchNumber ? ` (Batch ${progress.batchNumber})` : '';
    updateStatusBar(
      `Syncing transactions${batchInfo}... (${progress.added || 0} processed)`,
      true
    );
  }

  /**
   * Process a single batch of transactions
   * @param {string} itemId - Item ID to process
   * @returns {Promise<Object>} Batch processing result
   */
  async function processBatch(itemId) {
    try {
      if (!itemId) {
        throw new Error('No itemId provided for batch processing');
      }
      
      isSyncingBatch.value = true;
      const result = await api.post(`plaid/onboarding/sync/${itemId}`);
      
      // Update progress in state
      if (result) {
        // Make sure we have reasonable values for stats even if API returns unexpected format
        const totalAdded = result.stats?.totalAdded || 0;
        const totalModified = result.stats?.totalModified || 0;
        const totalRemoved = result.stats?.totalRemoved || 0;
        const batchNumber = result.stats?.batchNumber || 0;
        
        state.syncProgress = {
          ...state.syncProgress,
          added: totalAdded,
          modified: totalModified,
          removed: totalRemoved,
          status: result.status || 'in_progress',
          batchNumber: batchNumber
        };
        
        // Update UI
        const batchInfo = batchNumber ? ` (Batch ${batchNumber})` : '';
        updateStatusBar(
          `Syncing transactions${batchInfo}... (${totalAdded} processed)`,
          result.hasMore
        );
      }
      
      return result;
    } catch (error) {
      updateStatusBar(`Error processing batch: ${error.message || 'Unknown error'}`, false);
      throw error;
    } finally {
      isSyncingBatch.value = false;
    }
  }
  
  /**
   * Process all batches until complete
   * @param {string} itemId - Item ID to process
   * @returns {Promise<Object>} Final sync result
   */
  async function processAllBatches(itemId) {
    let hasMore = true;
    let batchCount = 0;
    const MAX_BATCHES = 1000; // Safety limit
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    try {
      clearSyncCheck();
      startTime.value = Date.now();
      
      // Set initial state
      state.onboardingStep = 'syncing';
      state.syncProgress = {
        added: 0,
        modified: 0,
        removed: 0,
        status: 'in_progress',
        batchNumber: 0
      };
      
      updateStatusBar('Starting transaction sync...', true);
      
      while (hasMore && batchCount < MAX_BATCHES) {
        // Check for timeout
        if (Date.now() - startTime.value > MAX_POLL_TIME) {
          updateStatusBar('Sync timed out. Please try again.', false);
          return { completed: false, error: 'SYNC_TIMEOUT' };
        }
        
        try {
          batchCount++;
          const batchResult = await processBatch(itemId);
          hasMore = batchResult.hasMore;
          retryCount = 0; // Reset retry count on success
          
          // Update state based on batch result
          const totalAdded = batchResult.stats?.totalAdded || 0;
          const totalModified = batchResult.stats?.totalModified || 0;
          const totalRemoved = batchResult.stats?.totalRemoved || 0;
          const batchNumber = batchResult.stats?.batchNumber || 0;
          
          state.syncProgress = {
            ...state.syncProgress,
            added: totalAdded,
            modified: totalModified,
            removed: totalRemoved,
            status: batchResult.status || 'in_progress',
            batchNumber: batchNumber
          };
          
          // If there are more batches, add a small delay
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Sync completed
            state.onboardingStep = 'complete';
            updateStatusBar('Transactions synced successfully!', false);
            return { 
              completed: true, 
              stats: {
                added: totalAdded,
                modified: totalModified,
                removed: totalRemoved
              }
            };
          }
        } catch (error) {
          console.error(`Error in batch ${batchCount}:`, error);
          lastError = error;
          retryCount++;
          
          if (retryCount > MAX_RETRIES) {
            updateStatusBar(`Sync failed after ${MAX_RETRIES} retries: ${error.message || 'Unknown error'}`, false);
            throw error;
          }
          
          // Wait before retrying
          updateStatusBar(`Retrying batch... (attempt ${retryCount}/${MAX_RETRIES})`, true);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
      
      // If we reach the batch limit but aren't done
      if (hasMore) {
        updateStatusBar('Sync is taking longer than expected. Please check back later.', false);
        return { completed: false, hasMore: true, batchCount };
      }
      
      return { completed: true };
    } catch (error) {
      updateStatusBar(`Sync error: ${error.message || 'Unknown error'}`, false);
      return { completed: false, error: error.message || 'Unknown error' };
    }
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
    clearSyncCheck,
    processBatch,
    processAllBatches
  };
} 
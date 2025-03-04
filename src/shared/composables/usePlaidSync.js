import { ref, computed, onUnmounted } from 'vue';
import { useApi } from '@/shared/composables/useApi.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

/**
 * Unified composable for handling Plaid transaction sync operations
 * Can be used for both dashboard (multiple items) and onboarding (single item) flows
 * 
 * @param {Object} api - API instance
 * @param {Object} state - Component state to update (can be different for dashboard/onboarding)
 * @returns {Object} Sync methods and properties
 */
export function usePlaidSync() {
  const api = useApi();
  const { state } = useDashboardState();
  const isSyncing = ref(false);
  const syncProgress = ref({});
  const currentBankIndex = ref(0);
  const syncedBanks = ref([]);
  const MAX_RETRIES = 3; // Max retries per sync operation

  /**
   * Sync latest transactions for a single bank/item
   * @param {string} itemId - Item ID to sync
   * @returns {Promise<Object>} Sync result with completion status
   */
  const syncLatestTransactionsForBank = async (itemId) => {
    try {
      if (!itemId) {
        throw new Error('No itemId provided for syncing');
      }

      isSyncing.value = true;
      updateStatusBar(`Syncing transactions for account...`, true);
      
      let hasMore = true;
      let batchCount = 0;
      let retryCount = 0;
      let totalStats = { added: 0, modified: 0, removed: 0 };
      
      // Continue syncing batches until complete
      while (hasMore) {
        try {
          batchCount++;
          
          // Call the backend API to process a single batch
          const result = await api.get(`plaid/sync/latest/transactions/${itemId}`);
          
          if (!result) {
            throw new Error('No response received from sync endpoint');
          }
          
          // Update stats with the latest batch results
          totalStats.added += result.batchResults?.added || 0;
          totalStats.modified += result.batchResults?.modified || 0;
          totalStats.removed += result.batchResults?.removed || 0;
          
          // Update UI with progress
          updateStatusBar(
            `Syncing transactions... (${totalStats.added} processed)`,
            true
          );
          
          // Update progress state
          updateSyncProgress({
            added: totalStats.added,
            modified: totalStats.modified,
            removed: totalStats.removed,
            status: 'in_progress',
            batchNumber: batchCount,
            itemId
          });
          
          // Check if we need to continue syncing
          hasMore = result.hasMore;
          retryCount = 0; // Reset retry count on success
          
          // Add a small delay between batches to avoid overwhelming the API
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error in batch ${batchCount}:`, error);
          retryCount++;
          
          if (retryCount > MAX_RETRIES) {
            throw new Error(`Sync failed after ${MAX_RETRIES} retries: ${error.message || 'Unknown error'}`);
          }
          
          // Add delay before retry
          updateStatusBar(`Retrying batch... (attempt ${retryCount}/${MAX_RETRIES})`, true);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Sync completed for this bank
      updateStatusBar(`Transactions synced successfully!`, false);
      
      // Mark sync as complete in progress state
      updateSyncProgress({
        added: totalStats.added,
        modified: totalStats.modified,
        removed: totalStats.removed,
        status: 'completed',
        batchNumber: batchCount,
        itemId,
        lastSync: new Date().toISOString()
      });

      const finalItem = await api.get(`plaid/items/${itemId}`);
      
      return {
        completed: true,
        itemId,
        stats: totalStats,
        item: finalItem
      };
    } catch (error) {
      console.error('Error syncing transactions for bank:', error);
      updateStatusBar(`Sync error: ${error.message || 'Unknown error'}`, false);
      
      // Mark sync as failed in progress state
      updateSyncProgress({
        status: 'error',
        error: error.message,
        itemId,
        lastSync: new Date().toISOString()
      });
      
      isSyncing.value = false;
      
      return {
        completed: false,
        itemId,
        error: error.message
      };
    }
  };
  
  /**
   * Sync latest transactions for all connected banks/items
   * Processes banks sequentially to avoid overwhelming the API
   * 
   * @returns {Promise<Object>} Overall sync results
   */
  const syncLatestTransactionsForBanks = async () => {
    try {
      // Reset sync state
      isSyncing.value = true;
      syncedBanks.value = [];
      currentBankIndex.value = 0;
      
      // Fetch all connected banks
      const banks = await api.get('plaid/items');
      
      if (!banks || banks.length === 0) {
        updateStatusBar('No connected accounts found', false);
        isSyncing.value = false;
        return { completed: true, message: 'No accounts found' };
      }
      
      updateStatusBar(`Starting to sync transactions for ${banks.length} accounts...`, true);
      
      // Process banks sequentially
      const results = [];
      for (let i = 0; i < banks.length; i++) {
        currentBankIndex.value = i;
        const bank = banks[i];
        
        // Update UI to show which bank is being synced
        updateStatusBar(`Syncing account ${i + 1} of ${banks.length}...`, true);
        
        // Sync this bank's transactions
        const result = await syncLatestTransactionsForBank(bank.itemId);
        results.push(result);
        syncedBanks.value.push({ ...bank, syncResult: result });
        
        // If there was an error with this bank, log it but continue with others
        if (!result.completed) {
          console.warn(`Error syncing bank ${bank._id || bank.itemId}:`, result.error);
        }
      }
      
      // All banks have been processed
      isSyncing.value = false;
      
      // Calculate total stats across all banks
      const totalStats = results.reduce((total, result) => {
        if (result.stats) {
          total.added += result.stats.added || 0;
          total.modified += result.stats.modified || 0;
          total.removed += result.stats.removed || 0;
        }
        return total;
      }, { added: 0, modified: 0, removed: 0 });
      
      // Final UI update
      updateStatusBar(`Sync completed! Added ${totalStats.added} transactions`, false);
      
      return {
        completed: true,
        banks: syncedBanks.value,
        totalStats
      };
    } catch (error) {
      console.error('Error syncing all banks:', error);
      updateStatusBar(`Error: ${error.message || 'Failed to sync accounts'}`, false);
      isSyncing.value = false;
      
      return {
        completed: false,
        error: error.message
      };
    }
  };
  
  /**
   * Updates the sync progress in the state
   * @param {Object} progress - Progress data
   */
  const updateSyncProgress = (progress) => {
    if (!progress) return;
    
    syncProgress.value = progress;
    
    // Update component state if provided
    if (state && state.syncProgress) {
      state.syncProgress = {
        added: progress.added || 0,
        modified: progress.modified || 0,
        removed: progress.removed || 0,
        status: progress.status || 'in_progress',
        lastSync: progress.lastSync,
        nextSync: progress.nextSync,
        cursor: progress.cursor,
        batchNumber: progress.batchNumber || 0
      };
    }
    
    // Update onboarding state if applicable
    if (state && state.onboardingStep === 'syncing' && progress.status === 'completed') {
      state.onboardingStep = 'complete';
    }
  };

  /**
   * Update the status bar in the component state
   * @param {string} message - Status message
   * @param {boolean} loading - Whether to show loading indicator
   */
  const updateStatusBar = (message, loading = false) => {
    if (state && state.blueBar) {
      state.blueBar.message = message;
      state.blueBar.loading = loading;
    }
  };

  // Computed property to check if all syncs are complete
  const allSyncsComplete = computed(() => {
    if (!syncProgress.value || Object.keys(syncProgress.value).length === 0) {
      return true;
    }
    
    return syncProgress.value.status !== 'in_progress';
  });

  // Clean up on unmount
  onUnmounted(() => {
    // Cleanup if needed
    isSyncing.value = false;
  });
  
  return {
    // State
    isSyncing,
    syncProgress,
    allSyncsComplete,
    syncedBanks,
    currentBankIndex,
    
    // Core sync methods
    syncLatestTransactionsForBank,
    syncLatestTransactionsForBanks,
    
    // Status methods
    updateStatusBar
  };
} 
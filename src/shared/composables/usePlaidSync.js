import { ref, computed, onUnmounted } from 'vue';
import { useApi } from '@/shared/composables/useApi.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';

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
  const syncedBanks = ref([]);
  const statusBarTimeout = ref(null); // Add ref to track the timeout ID
  const { concatAndProcessTransactions } = useTabProcessing();

  /**
   * Sync latest transactions for a single bank/item
   * @param {string} itemId - Item ID to sync
   * @returns {Promise<Object>} Sync result with completion status
   */
  const syncLatestTransactionsForBank = async (itemId) => {
    console.log('syncLatestTransactionsForBank', itemId);
    try {
      if (!itemId) {
        throw new Error('No itemId provided for syncing');
      }

      isSyncing.value = true;
      updateStatusBar(`Syncing transactions for account...`, true);
      
      let hasMore = true;
      let batchCount = 0;
      let totalStats = { added: 0, modified: 0, removed: 0 };
      const startTimestamp = Date.now();
      
      // Set initial sync progress
      updateSyncProgress({
        added: 0,
        modified: 0,
        removed: 0,
        status: 'in_progress',
        itemId,
        startTimestamp,
        branchNumber: 1
      });
      
      // Continue syncing batches until complete
      while (hasMore) {
        try {
          batchCount++;
          
          // Call the backend API to process a single batch
          const result = await api.get(`plaid/sync/latest/transactions/${itemId}`);
          
          if (!result) {
            throw new Error('No response received from sync endpoint');
          }

          // Check if batchResults exists before accessing its properties
          const batchResults = result.batchResults || { added: 0, modified: 0, removed: 0 };
          
          // Check if there are any failures in the sync result
          if (result.hasFailures) {
            const failureMessage = result.failureDetails?.message || 'Some transactions failed to process';
            const errorMessage = `Sync failed: ${failureMessage}`;
            
            // Update status bar with failure message
            updateStatusBar(`Sync error: ${failureMessage}`, false);
            
            // Update progress state with error
            updateSyncProgress({
              status: 'error',
              error: errorMessage,
              itemId,
              lastSync: new Date().toISOString()
            });
            
            // Set isSyncing to false
            isSyncing.value = false;
            
            // Return failed result
            return {
              completed: false,
              itemId,
              error: errorMessage,
              failureDetails: result.failureDetails
            };
          }
          
          // Update stats with the latest batch results
          totalStats.added += batchResults.added || 0;
          totalStats.modified += batchResults.modified || 0;
          totalStats.removed += batchResults.removed || 0;
          
          // If there are added transactions in the response and we're in a dashboard view, update visible transactions
          if (result.addedTransactions && result.addedTransactions.length > 0) {
            const addedCount = await concatAndProcessTransactions(result.addedTransactions);
            if (addedCount > 0) {
              updateStatusBar(`Added ${addedCount} new transactions to your current view`, false);
            }
          }
          
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
            branchNumber: batchCount,
            itemId
          });
          
          // Check if we need to continue syncing
          hasMore = result.hasMore;
          
          // Add a small delay between batches to avoid overwhelming the API
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error in batch ${batchCount}:`, error);
          
          // Update status bar with error message
          updateStatusBar(`Sync error: ${error.message || 'Unknown error'}`, false);
          
          // Update progress state with error
          updateSyncProgress({
            status: 'error',
            error: error.message,
            itemId,
            lastSync: new Date().toISOString()
          });
          
          // Set isSyncing to false
          isSyncing.value = false;
          
          // Return error result
          return {
            completed: false,
            itemId,
            error: error.message
          };
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
        branchNumber: batchCount,
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
  const syncLatestTransactionsForAllBanks = async () => {
    try {
      // Reset sync state
      isSyncing.value = true;
      syncedBanks.value = [];
      
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
    
    // Add timestamps if not present
    if (!progress.startTimestamp) {
      progress.startTimestamp = Date.now();
    }
    
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
        branchNumber: progress.branchNumber || 0,
        startTimestamp: progress.startTimestamp,
        message: progress.message
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
      // Clear previous timeout if exists
      if (statusBarTimeout.value) {
        clearTimeout(statusBarTimeout.value);
      }
      
      // Update status bar message and loading state
      state.blueBar.message = message;
      state.blueBar.loading = loading;
      
      // Set new timeout to clear message after 3 seconds
      statusBarTimeout.value = setTimeout(() => {
        state.blueBar.message = null;
        state.blueBar.loading = false;
        statusBarTimeout.value = null;
      }, 3000);
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
    
    // Core sync methods
    syncLatestTransactionsForBank,
    syncLatestTransactionsForAllBanks,
    
    // Status methods
    updateStatusBar
  };
} 
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
  const currentBankIndex = ref(0);
  const syncedBanks = ref([]);
  const MAX_RETRIES = 0; // Max retries per sync operation
  const consecutiveRecoveries = ref({}); // Track consecutive recoveries by itemId
  const statusBarTimeout = ref(null); // Add ref to track the timeout ID
  const { processAllTabsForSelectedGroup } = useTabProcessing();

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
      
      // Initialize consecutive recoveries tracker for this item if it doesn't exist
      if (!consecutiveRecoveries.value[itemId]) {
        consecutiveRecoveries.value[itemId] = 0;
      }
      
      // Continue syncing batches until complete
      while (hasMore) {
        try {
          batchCount++;
          
          // Call the backend API to process a single batch
          const result = await api.get(`plaid/sync/latest/transactions/${itemId}`);
          
          if (!result) {
            throw new Error('No response received from sync endpoint');
          }
          
          // Check if a recovery was performed
          if (result?.recovery?.performed) {
            // Increment the consecutive recovery counter
            consecutiveRecoveries.value[itemId]++;
            
            // Check if we've hit the limit of consecutive recoveries
            if (consecutiveRecoveries.value[itemId] >= 3) {
              throw new Error(`Transaction recovery has been attempted 3 times in a row. Manual intervention may be required.`);
            }
            
            // Update UI with recovery information
            updateStatusBar(
              `Recovery performed: ${result.recovery.removedTransactions || result.recovery.removedCount || 0} transactions removed. Resyncing...`,
              true
            );
            
            // Update progress state for recovery
            updateSyncProgress({
              status: 'recovery',
              recoveryPerformed: true,
              recoveryRemovedCount: result.recovery.removedTransactions || result.recovery.removedCount || 0,
              itemId,
              message: result.message || 'Recovery performed successfully'
            });
            
            // Wait a moment before continuing with the sync
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Since we've performed a recovery, we need to start a new sync
            // The next API call will restart the sync with the reset cursor
            continue;
          }
          
          // If we got here, it means we had a successful sync batch without recovery
          // Reset the consecutive recovery counter
          consecutiveRecoveries.value[itemId] = 0;

          // Check if batchResults exists before accessing its properties
          const batchResults = result.batchResults || { added: 0, modified: 0, removed: 0 };
          
          // Update stats with the latest batch results
          totalStats.added += batchResults.added || 0;
          totalStats.modified += batchResults.modified || 0;
          totalStats.removed += batchResults.removed || 0;
          
          // If there are added transactions in the response and we're in a dashboard view, update visible transactions
          if (result.addedTransactions && result.addedTransactions.length > 0) {
            await updateVisibleTransactions(result.addedTransactions);
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
   * Resets the consecutive recovery counter for an item
   * @param {string} itemId - Item ID to reset counter for
   */
  const resetRecoveryCounter = (itemId) => {
    if (itemId && consecutiveRecoveries.value) {
      consecutiveRecoveries.value[itemId] = 0;
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
        batchNumber: progress.batchNumber || 0,
        // Add recovery information if present
        recoveryPerformed: progress.recoveryPerformed || false,
        recoveryRemovedCount: progress.recoveryRemovedCount || 0,
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
  
  /**
   * Fetches and updates visible transactions after a sync
   * @param {Array} addedTransactions - Newly added transactions from the sync response
   */
  const updateVisibleTransactions = async (addedTransactions) => {
    try {
      // Only proceed if we have state, a selected group, and transactions
      if (!state || !state.selected || !state.selected.group || !addedTransactions || !addedTransactions.length) {
        return;
      }
      
      const selectedGroup = state.selected.group;
      
      // Get date range from state
      let startDate, endDate;
      
      // Convert date range strings to actual dates
      if (state.date.start === 'firstOfMonth') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (state.date.start === 'firstOfYear') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        startDate = new Date(state.date.start);
      }
      
      if (state.date.end === 'today') {
        endDate = new Date();
      } else {
        endDate = new Date(state.date.end);
      }
      
      // Filter transactions by date range
      const dateFilteredTransactions = addedTransactions.filter(transaction => {
        const txDate = new Date(transaction.date);
        return txDate >= startDate && txDate <= endDate;
      });
      
      if (dateFilteredTransactions.length === 0) {
        return;
      }
      
      // Filter transactions for the selected group
      // Groups have accounts associated with them
      const groupAccounts = selectedGroup.accounts || [];
      const groupAccountIds = groupAccounts.map(account => account.account_id);
      
      const matchingTransactions = dateFilteredTransactions.filter(transaction => {
        // Check if transaction's account is in the selected group
        return groupAccountIds.includes(transaction.account_id);
      });
      
      if (matchingTransactions.length === 0) {
        return;
      }
      
      // Add matching transactions to the allGroupTransactions array
      if (!state.selected.allGroupTransactions) {
        state.selected.allGroupTransactions = [];
      }
      
      // Add new transactions to the array (avoid duplicates by checking transaction_id)
      const existingIds = new Set(state.selected.allGroupTransactions.map(t => t.transaction_id));
      const newTransactions = matchingTransactions.filter(t => !existingIds.has(t.transaction_id));
      
      if (newTransactions.length === 0) {
        return;
      }

      state.selected.allGroupTransactions = [...state.selected.allGroupTransactions, ...newTransactions];
      
      processAllTabsForSelectedGroup();

      updateStatusBar(`Added ${newTransactions.length} new transactions to your current view`, false);
    } catch (error) {
      console.error('Error updating visible transactions:', error);
    }
  };
  
  return {
    // State
    isSyncing,
    syncProgress,
    allSyncsComplete,
    syncedBanks,
    currentBankIndex,
    consecutiveRecoveries,
    
    // Core sync methods
    syncLatestTransactionsForBank,
    syncLatestTransactionsForBanks,
    resetRecoveryCounter,
    
    // Status methods
    updateStatusBar
  };
} 
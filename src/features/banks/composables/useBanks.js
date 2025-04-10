import { ref, computed, watch } from 'vue';
import { useApi } from '@/shared/composables/useApi.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync.js';

// --- State moved outside the composable function ---
const banks = ref([]);
const selectedBank = ref(null);
const syncSessions = ref([]);
const syncMetrics = ref({
  lastSyncDuration: null,
  lastSuccessfulSync: null,
  averageSyncDuration: null
});
const loading = ref({
  banks: false,
  syncSessions: false,
  editingBank: false
});
const error = ref({
  banks: null,
  syncSessions: null,
  sync: null,
  revert: null,
  editingBank: null
});
// --- End of moved state ---

/**
 * Composable for managing banks (Plaid items) including fetching, 
 * syncing, and managing sync sessions
 */
export function useBanks() {
  const api = useApi();
  const { 
    syncLatestTransactionsForBank,
    isSyncing, 
    syncProgress,
    resetRecoveryCounter
  } = usePlaidSync();
  
  /**
   * Fetch all banks (Plaid items) for the current user
   */
  const fetchBanks = async () => {
    loading.value.banks = true;
    error.value.banks = null;
    
    try {
      const response = await api.get('plaid/items');
      banks.value = response || [];
      return banks.value;
    } catch (err) {
      console.error('Error fetching banks:', err);
      error.value.banks = err.message || 'Failed to fetch banks';
      return [];
    } finally {
      loading.value.banks = false;
    }
  };
  
  /**
   * Calculate and update sync performance metrics
   */
  const updateSyncMetrics = () => {
    if (!syncSessions.value.length) {
      syncMetrics.value = {
        lastSyncDuration: null,
        lastSuccessfulSync: null,
        averageSyncDuration: null,
      };
      return;
    }

    // Get the most recent session
    const lastSession = syncSessions.value[0]; 
    
    // Get the most recent successful session
    const lastSuccessfulSession = syncSessions.value.find(s => s.status === 'complete');
    
    // Calculate average sync duration from complete sessions with duration data
    const sessionsWithDuration = syncSessions.value
      .filter(s => s.status === 'complete' && s.syncDuration);
    
    const totalDuration = sessionsWithDuration.reduce(
      (sum, session) => sum + session.syncDuration, 0
    );
    
    const averageDuration = sessionsWithDuration.length 
      ? Math.round(totalDuration / sessionsWithDuration.length) 
      : null;
    
    syncMetrics.value = {
      lastSyncDuration: lastSession?.syncDuration || null,
      lastSuccessfulSync: lastSuccessfulSession 
        ? {
            timestamp: lastSuccessfulSession.endTimestamp || lastSuccessfulSession.syncTime,
            duration: lastSuccessfulSession.syncDuration || null,
          }
        : null,
      averageSyncDuration: averageDuration,
      sessionsWithPerformanceData: sessionsWithDuration.length
    };
  };
  
  /**
   * Format duration in milliseconds to human-readable format
   * @param {Number} ms - Duration in milliseconds
   * @returns {String} Formatted duration
   */
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };
  
  /**
   * Fetch sync sessions for a specific bank with updated metrics
   * @param {String} itemId - Item ID
   */
  const fetchSyncSessions = async (itemId) => {
    if (!itemId) return;
    
    loading.value.syncSessions = true;
    error.value.syncSessions = null;
    syncSessions.value = [];
    
    try {
      const response = await api.get(`plaid/items/${itemId}/sync-sessions`);
      syncSessions.value = response.syncSessions || [];
      
      // Calculate metrics after fetching sessions
      updateSyncMetrics();
      
      return syncSessions.value;
    } catch (err) {
      console.error(`Error fetching sync sessions for bank ${itemId}:`, err);
      error.value.syncSessions = err.message || 'Failed to fetch sync sessions';
      return [];
    } finally {
      loading.value.syncSessions = false;
    }
  };
  
  /**
   * Add or update an in-progress session in the syncSessions list
   * @param {String} itemId - Item ID
   * @param {Object} progress - Current sync progress
   */
  const updateInProgressSession = (itemId, progress) => {
    if (!itemId || !progress) return;
    
    const now = Date.now();
    
    // Look for an existing in-progress session
    const existingSessionIndex = syncSessions.value.findIndex(s => 
      s.status === 'in_progress' && s.itemId === itemId
    );
    
    // Create an optimistic session object
    const sessionUpdate = {
      _id: `temp-session-${now}`,
      itemId: itemId,
      status: 'in_progress',
      syncTime: now,
      startTimestamp: progress.startTimestamp || now,
      syncCounts: {
        actual: { 
          added: progress.added || 0, 
          modified: progress.modified || 0, 
          removed: progress.removed || 0 
        },
        expected: { 
          added: 0, 
          modified: 0, 
          removed: 0 
        }
      },
      branchNumber: progress.branchNumber || 1
    };
    
    if (existingSessionIndex !== -1) {
      // Update the existing session
      syncSessions.value[existingSessionIndex] = {
        ...syncSessions.value[existingSessionIndex],
        ...sessionUpdate,
        syncCounts: {
          ...syncSessions.value[existingSessionIndex].syncCounts,
          actual: sessionUpdate.syncCounts.actual
        }
      };
    } else {
      // Add the new session at the top of the list
      syncSessions.value.unshift(sessionUpdate);
    }
  };
  
  /**
   * Select a bank and fetch its sync sessions
   * @param {Object} bank - Bank object
   */
  const selectBank = async (bank) => {
    selectedBank.value = bank;

    if (bank?.itemId) {
      // await fetchSyncSessions(bank.itemId);
    }
  };
  
  /**
   * Sync transactions for a selected bank and update metrics
   */
  const syncSelectedBank = async () => {
    if (!selectedBank.value?.itemId) {
      error.value.sync = 'No bank selected';
      return null;
    }
    
    error.value.sync = null;
    const itemId = selectedBank.value.itemId;
    
    // Ensure we have sync sessions loaded first
    if (syncSessions.value.length === 0) {
      await fetchSyncSessions(itemId);
    }
    
    try {
      // Reset recovery counter to ensure we can attempt the sync
      resetRecoveryCounter(itemId);
      
      // Create a listener for sync progress updates
      const unsubscribe = watch(syncProgress, (newProgress) => {
        if (newProgress && newProgress.itemId === itemId && newProgress.status === 'in_progress') {
          updateInProgressSession(itemId, newProgress);
        }
      });
      
      // Perform the sync
      const result = await syncLatestTransactionsForBank(itemId);
      
      // Cleanup the watcher
      unsubscribe();
      
      // If sync was successful, refresh the bank data and sync sessions
      if (result.completed) {
        console.log('sync completed');
        await fetchBanks();
        await fetchSyncSessions(itemId);
        
        // Display performance metrics in console for debugging
        if (result.performanceMetrics || result.syncDuration) {
          console.log('Sync performance metrics:', 
            result.performanceMetrics || { syncDuration: result.syncDuration }
          );
        }
        
        isSyncing.value = false;
      } else {
        // Handle error case
        if (result.error) {
          // Set a user-friendly error message
          error.value.sync = result.error;
        }
        
        // If we have failure details, add them to the error message
        if (result.failureDetails) {
          const { addedFailures, modifiedFailures, removedFailures } = result.failureDetails;
          const totalFailures = (addedFailures || 0) + (modifiedFailures || 0) + (removedFailures || 0);
          
          if (totalFailures > 0) {
            error.value.sync = `Sync stopped: ${totalFailures} transactions failed to process. Please check the sync history for details.`;
          }
        }
        
        // Refresh the sync sessions to show the latest status
        await fetchSyncSessions(itemId);
      }
      
      return result;
    } catch (err) {
      console.error('Error syncing bank:', err);
      error.value.sync = err.message || 'Failed to sync bank';
      return {
        completed: false,
        error: err.message
      };
    }
  };
  
  /**
   * Continue without recovery for a session
   * @param {Object} session - Session object
   */
  const continueWithoutRecovery = async (session) => {
    if (!session || !session._id || !selectedBank.value?.itemId) {
      error.value.sync = 'Invalid session or no bank selected';
      return null;
    }
    
    error.value.sync = null;
    
    try {
      // Call the API to continue without recovery
      const result = await api.post(
        `plaid/items/${selectedBank.value.itemId}/continue-without-recovery/${session._id}`
      );
      
      if (result.success) {
        // Refresh the sync sessions after continuing
        await fetchSyncSessions(selectedBank.value.itemId);
        return result;
      } else if (result.error) {
        error.value.sync = result.error;
        return null;
      }
      
      return result;
    } catch (err) {
      console.error('Error continuing without recovery:', err);
      error.value.sync = err.message || 'Failed to continue without recovery';
      return null;
    }
  };
  
  /**
   * Revert to a previous sync session
   * @param {Object} session - Session to revert to
   */
  const revertToSession = async (session) => {
    if (!selectedBank.value?.itemId || !session?._id) {
      error.value.revert = 'Invalid bank or session';
      return null;
    }
    
    error.value.revert = null;
    
    try {
      const result = await api.post(
        `plaid/items/${selectedBank.value.itemId}/revert/${session._id}`
      );
      
      // If reversion was successful, refresh the bank data and sync sessions
      if (result.success) {
        await fetchBanks();
        await fetchSyncSessions(selectedBank.value.itemId);
      } else if (result.error) {
        error.value.revert = result.error;
      }
      
      return result;
    } catch (err) {
      console.error('Error reverting to session:', err);
      error.value.revert = err.message || 'Failed to revert to session';
      return null;
    }
  };
  
  /**
   * Format the sync session date
   * @param {Number} timestamp - Sync time timestamp
   * @returns {String} Formatted date string
   */
  const formatSyncDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  };
  
  /**
   * Get status class for a bank based on its status
   * @param {Object} bank - Bank object
   * @returns {String} CSS class name
   */
  const getBankStatusClass = (bank) => {
    if (!bank) return 'bg-gray-200';
    
    switch (bank.status) {
      case 'error':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'complete':
        return 'bg-green-500';
      default:
        return 'bg-gray-200';
    }
  };
  
  /**
   * Get status text for a bank based on its status
   * @param {Object} bank - Bank object
   * @returns {String} Status text
   */
  const getBankStatusText = (bank) => {
    if (!bank) return 'Unknown';
    
    switch (bank.status) {
      case 'error':
        return 'Error';
      case 'in_progress':
        return 'In Progress';
      case 'complete':
        return 'Connected';
      default:
        return bank.status || 'Unknown';
    }
  };
  
  /**
   * Update bank name (institutionName)
   * @param {Object} bank - Bank object with updated institutionName
   * @returns {Object} Updated bank
   */
  const updateBankName = async (bank) => {
    if (!bank?.itemId) {
      error.value.editingBank = 'Invalid bank';
      return null;
    }
    
    loading.value.editingBank = true;
    error.value.editingBank = null;
    
    try {
      const response = await api.put(`plaid/items/${bank.itemId}`, {
        institutionName: bank.institutionName
      });
      
      // Update the bank in the banks array
      const index = banks.value.findIndex(b => b.itemId === bank.itemId);
      if (index !== -1) {
        banks.value[index] = { ...banks.value[index], ...response };
      }
      
      // If this is the selected bank, update it as well
      if (selectedBank.value?.itemId === bank.itemId) {
        selectedBank.value = { ...selectedBank.value, ...response };
      }
      
      return response;
    } catch (err) {
      console.error('Error updating bank name:', err);
      error.value.editingBank = err.message || 'Failed to update bank name';
      return null;
    } finally {
      loading.value.editingBank = false;
    }
  };
  
  /**
   * Add a transaction from error data
   * @param {Object} transaction - Transaction data from error
   * @param {String} sessionId - Optional sync session ID for direct update
   * @returns {Promise<Object>} Result of the operation
   */
  const addTransactionFromError = async (transaction, sessionId = null) => {
    if (!transaction) {
      return { success: false, error: 'No transaction data provided' };
    }
    
    try {
      const result = await api.post('plaid/transactions/add-from-error', {
        transaction,
        sessionId
      });
      
      if (result.success) {
        // If the current bank is selected, refresh the sync sessions to show the update
        // if (selectedBank.value?.itemId) {
        //   await fetchSyncSessions(selectedBank.value.itemId);
        // }
        
        return { 
          success: true, 
          transaction: result.transaction 
        };
      } else {
        return { 
          success: false, 
          error: result.error || 'Failed to add transaction' 
        };
      }
    } catch (err) {
      console.error('Error adding transaction from error:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to add transaction' 
      };
    }
  };
  
  // Computed properties
  const isLoading = computed(() => 
    loading.value.banks || loading.value.syncSessions || isSyncing.value
  );
  
  const hasBanks = computed(() => banks.value.length > 0);
  
  const bankById = computed(() => (itemId) => {
    return banks.value.find(bank => bank.itemId === itemId) || null;
  });
  
  return {
    // State
    banks,
    selectedBank,
    syncSessions,
    syncMetrics,
    loading,
    error,
    isSyncing,
    syncProgress,
    
    // Computed
    isLoading,
    hasBanks,
    bankById,
    
    // Methods
    fetchBanks,
    fetchSyncSessions,
    selectBank,
    syncSelectedBank,
    continueWithoutRecovery,
    revertToSession,
    updateSyncMetrics,
    addTransactionFromError,
    
    // Utilities
    formatSyncDate,
    formatDuration,
    getBankStatusClass,
    getBankStatusText,
    updateBankName
  };
} 
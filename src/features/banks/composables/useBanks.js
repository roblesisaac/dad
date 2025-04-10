import { ref, computed, onUnmounted } from 'vue';
import { useApi } from '@/shared/composables/useApi.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync.js';
import { usePlaidLink } from '@/features/onboarding/composables/usePlaidLink.js';

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
const requiresReconnect = ref(false);

export function useBanks() {
  const api = useApi();
  const { 
    syncLatestTransactionsForBank,
    isSyncing, 
    syncProgress,
    resetRecoveryCounter
  } = usePlaidSync();
  
  // Get functionality from plaid link composable
  const { 
    createLinkToken, 
    openPlaidLink, 
    exchangePublicToken 
  } = usePlaidLink();
  
  // Local state for reconnection
  const currentPlaidHandler = ref(null);

  // Method to clean up any Plaid handler
  const cleanupPlaidHandler = () => {
    if (currentPlaidHandler.value) {
      try {
        currentPlaidHandler.value.destroy();
        currentPlaidHandler.value = null;
      } catch (e) {
        console.error('Error destroying Plaid Link handler:', e);
      }
    }
  };
  
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
   * Select a bank and fetch its sync sessions
   * @param {Object} bank - Bank object
   */
  const selectBank = async (bank) => {
    selectedBank.value = bank;
  };
  
  /**
   * Sync the selected bank
   * @returns {Promise<Object>} Sync result
   */
  const syncSelectedBank = async () => {
    try {
      // Reset reconnect flag
      requiresReconnect.value = false;
      error.value.sync = null;
      
      if (!selectedBank.value?.itemId) {
        throw new Error('No bank selected for sync');
      }
      
      const result = await syncLatestTransactionsForBank(selectedBank.value.itemId);
      
      // Refetch the sync sessions to show the updates
      await fetchSyncSessions(selectedBank.value.itemId);
      
      // Set isSyncing to false when sync is complete - this will stop polling
      if (!result.hasMore) {
        isSyncing.value = false;
      }
      
      return result;
    } catch (err) {
      console.error('Error syncing selected bank:', err);
      
      // Handle special case for login required error
      if (err.response?.data?.error === 'ITEM_LOGIN_REQUIRED' || 
          err.response?.data?.requiresReconnect ||
          ['INVALID_CREDENTIALS', 'INVALID_MFA', 'ITEM_LOCKED', 'USER_SETUP_REQUIRED']
            .includes(err.response?.data?.error)) {
        
        requiresReconnect.value = true;
        error.value.sync = err.response?.data?.message || 
                          'This bank connection requires reauthentication. Please reconnect your bank.';
        
        return { 
          completed: false, 
          requiresReconnect: true,
          itemId: err.response?.data?.itemId || selectedBank.value.itemId,
          error: error.value.sync,
          errorCode: err.response?.data?.error,
          errorDetails: err.response?.data?.plaidErrorDetails
        };
      }
      
      error.value.sync = err.message || 'Failed to sync bank';
      return { completed: false, error: error.value.sync };
    }
  };
  
  /**
   * Handle Plaid Link success callback
   */
  const handlePlaidSuccess = async (publicToken, metadata) => {
    try {
      if (!publicToken) {
        throw new Error('No public token received from Plaid');
      }
      
      // Exchange the public token for an access token
      await exchangePublicToken({ 
        publicToken, 
        metadata,
        itemId: selectedBank.value?.itemId
      });
      
      // Reset reconnect flag
      requiresReconnect.value = false;
      
      // Refresh the banks list
      await fetchBanks();
      
      // If there was a selected bank, refresh its sync sessions
      if (selectedBank.value?.itemId) {
        await fetchSyncSessions(selectedBank.value.itemId);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error exchanging token:', err);
      return { success: false, error: err.message };
    } finally {
      cleanupPlaidHandler();
    }
  };
  
  /**
   * Handle Plaid Link exit
   */
  const handlePlaidExit = (err, metadata) => {
    cleanupPlaidHandler();
    return { cancelled: true };
  };
  
  /**
   * Handle Plaid Link error
   */
  const handlePlaidError = (error) => {
    console.error('Plaid error:', error);
    cleanupPlaidHandler();
    return { success: false, error };
  };
  
  /**
   * Reconnect a bank that requires login
   */
  const handleReconnectBank = async () => {
    if (!selectedBank.value?.itemId) {
      console.error('No bank selected for reconnection');
      return { success: false, error: 'No bank selected' };
    }
    
    try {
      // Clean up any existing handler
      cleanupPlaidHandler();
      
      // Get link token for reconnection
      const token = await createLinkToken(selectedBank.value.itemId);
      
      // Open Plaid Link for reconnection
      currentPlaidHandler.value = await openPlaidLink(token, {
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
        onError: handlePlaidError
      });
      
      return { success: true };
    } catch (err) {
      console.error('Error reconnecting bank:', err);
      return { success: false, error: err.message };
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
      case 'login_required':
        return 'bg-yellow-500';
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
      case 'login_required':
        return 'Reconnection Required';
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
  
  // Clean up on unmount
  onUnmounted(() => {
    cleanupPlaidHandler();
  });
  
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
    requiresReconnect,
    
    // Computed
    isLoading,
    hasBanks,
    bankById,
    
    // Methods
    fetchBanks,
    selectBank,
    syncSelectedBank,
    fetchSyncSessions,
    continueWithoutRecovery,
    revertToSession,
    formatSyncDate,
    getBankStatusClass,
    getBankStatusText,
    updateBankName,
    addTransactionFromError,
    updateSyncMetrics,
    formatDuration,
    
    // Plaid Link
    createLinkToken,
    openPlaidLink,
    exchangePublicToken,
    currentPlaidHandler,
    cleanupPlaidHandler,
    handleReconnectBank,
    handlePlaidSuccess,
    handlePlaidExit,
    handlePlaidError
  };
} 
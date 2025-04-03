import { ref, computed } from 'vue';
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
    
    try {
      // Reset recovery counter to ensure we can attempt the sync
      resetRecoveryCounter(selectedBank.value.itemId);
      
      // Perform the sync
      const result = await syncLatestTransactionsForBank(selectedBank.value.itemId, {
        fullSync: false
      });
      
      // If sync was successful, refresh the bank data and sync sessions
      if (result.completed) {
        console.log('sync completed');
        await fetchBanks();
        await fetchSyncSessions(selectedBank.value.itemId);
        
        // Display performance metrics in console for debugging
        if (result.performanceMetrics || result.syncDuration) {
          console.log('Sync performance metrics:', 
            result.performanceMetrics || { syncDuration: result.syncDuration }
          );
        }
        
        isSyncing.value = false;
      } else if (result.error) {
        error.value.sync = result.error;
      }
      
      return result;
    } catch (err) {
      console.error('Error syncing bank:', err);
      error.value.sync = err.message || 'Failed to sync bank';
      return null;
    }
  };
  
  /**
   * Revert to a specific sync session
   * @param {Object} session - Sync session to revert to
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
    revertToSession,
    updateSyncMetrics,
    
    // Utilities
    formatSyncDate,
    formatDuration,
    getBankStatusClass,
    getBankStatusText,
    updateBankName
  };
} 
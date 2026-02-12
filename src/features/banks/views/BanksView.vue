<template>
  <div class="banks-view">
    <div class="px-4 py-2">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Connected Banks</h1>
        <button 
          @click="handleConnectBank"
          class="inline-flex items-center px-4 py-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none"
        >
          Connect a Bank
        </button>
      </div>
      
      <!-- Main content -->
      <BankList
          :banks="banks"
          :selected-bank="selectedBank"
          :loading="loading.banks"
          :error="error.banks"
          :is-syncing="isSyncing"
          :get-bank-status-class="getBankStatusClass"
          :get-bank-status-text="getBankStatusText"
          @select-bank="handleSelectBank"
          @sync-bank="handleSyncBank"
          @refresh="fetchBanks"
          @connect-bank="handleConnectBank"
          @edit-bank-name="handleEditBankName"
      />
    </div>
    
    <!-- Sync Sessions Modal -->
    <SyncSessionsModal
      :is-open="isSyncSessionsModalOpen"
      :bank="selectedBank"
      @close="closeSyncSessionsModal"
      @data-changed="fetchBanks"
    />
    
    <!-- Edit Bank Name Modal -->
    <EditBankNameModal
      :is-open="isEditBankNameModalOpen"
      :bank="bankToEdit"
      :is-saving="loading.editBankName"
      :is-reconnecting="loading.reconnectBank"
      :is-encrypting="loading.encryptAccessToken"
      :is-downloading="loading.downloadAllData"
      :download-status="downloadStatus"
      :is-deleting="loading.deleteSelectedData"
      :delete-status="deleteStatus"
      :is-resetting="loading.resetCursor"
      :download-summary="downloadSummary"
      :delete-summary="deleteSummary"
      @close="closeEditBankNameModal"
      @save="saveBankName"
      @reconnect="reconnectBank"
      @encrypt-access-token="encryptBankAccessToken"
      @download-all-data="downloadAllData"
      @delete-selected-data="deleteSelectedData"
      @reset-cursor="resetCursor"
    />
    
    <!-- Success notification -->
    <div 
      v-if="notification.show" 
      :class="[
        'fixed bottom-4 right-4 p-4 rounded-md shadow-lg max-w-xs z-50',
        `bg-${notification.type}-100 border border-${notification.type}-200 text-${notification.type}-800`
      ]"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <CheckCircle v-if="notification.type === 'success'" class="h-5 w-5 text-green-400" />
          <AlertCircle v-else-if="notification.type === 'error'" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">
            {{ notification.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import { useApi } from '@/shared/composables/useApi.js';
import loadScript from '@/shared/utils/loadScript.js';
import BankList from '../components/BankList.vue';
import SyncSessionsModal from '../components/SyncSessionsModal.vue';
import EditBankNameModal from '../components/EditBankNameModal.vue';
import { CheckCircle, AlertCircle } from 'lucide-vue-next';

const emit = defineEmits(['connect-bank-complete']);
const api = useApi();

// Setup composable
const {
  banks,
  selectedBank,
  loading,
  error,
  isSyncing,
  fetchBanks,
  selectBank,
  getBankStatusClass,
  getBankStatusText,
  updateBankName
} = useBanks();

// Local state
const notification = ref({
  show: false,
  message: '',
  type: 'success', // 'success' or 'error'
  timeout: null
});

const isSyncSessionsModalOpen = ref(false);
const isEditBankNameModalOpen = ref(false);
const bankToEdit = ref(null);
const downloadStatus = ref('');
const deleteStatus = ref('');
const downloadSummary = ref(null);
const deleteSummary = ref(null);
let reconnectPlaidHandler = null;

const PLAID_SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

// Initialize loading state for reconnect bank
loading.value = {
  ...loading.value,
  reconnectBank: false,
  encryptAccessToken: false,
  downloadAllData: false,
  deleteSelectedData: false,
  resetCursor: false
};

// Initialize error state for reconnect bank
error.value = {
  ...error.value,
  reconnectBank: null,
  encryptAccessToken: null,
  downloadAllData: null,
  deleteSelectedData: null,
  resetCursor: null
};

// Initialize data
onMounted(async () => {
  await fetchBanks();
});

// Show notification helper
const showNotification = (message, type = 'success') => {
  // Clear any existing timeout
  if (notification.value.timeout) {
    clearTimeout(notification.value.timeout);
  }
  
  // Set notification
  notification.value = {
    show: true,
    message,
    type,
    timeout: setTimeout(() => {
      notification.value.show = false;
    }, 5000)
  };
};

// Event handlers
const handleSelectBank = async (bank) => {
  selectBank(bank);
  isSyncSessionsModalOpen.value = true;
};

const closeSyncSessionsModal = () => {
  isSyncSessionsModalOpen.value = false;
};

const handleConnectBank = () => {
  // TODO: Implement bank connection flow
  showNotification('Bank connection feature is not implemented yet', 'error');
  // Signal to parent component that bank connection was attempted
  emit('connect-bank-complete');
};

const handleSyncBank = async () => {
  isSyncSessionsModalOpen.value = true;
};

const handleEditBankName = (bank) => {
  bankToEdit.value = bank;
  isEditBankNameModalOpen.value = true;
};

const closeEditBankNameModal = () => {
  isEditBankNameModalOpen.value = false;
};

const saveBankName = async (bank) => {
  if (!bank) return;
  
  try {
    const result = await updateBankName(bank);
    
    if (result) {
      showNotification(`Bank name updated to "${bank.institutionName}"`);
      closeEditBankNameModal();
    } else if (error.value.editBankName) {
      showNotification(`Failed to update bank name: ${error.value.editBankName}`, 'error');
    }
  } catch (err) {
    console.error('Error saving bank name:', err);
    showNotification(`Error: ${err.message || 'Unknown error'}`, 'error');
  }
};

const reconnectBank = async (bank) => {
  if (!bank?.itemId) return;
  
  try {
    loading.value.reconnectBank = true;
    error.value.reconnectBank = null;

    await loadScript(PLAID_SCRIPT_URL);

    if (!window?.Plaid?.create) {
      throw new Error('Plaid Link failed to load');
    }
    
    // Get link token for reconnection
    const { link_token } = await api.post(`plaid/connect/link/${bank.itemId}`);
    
    if (!link_token) {
      throw new Error('No link token received from server');
    }

    if (reconnectPlaidHandler?.destroy) {
      reconnectPlaidHandler.destroy();
      reconnectPlaidHandler = null;
    }

    reconnectPlaidHandler = window.Plaid.create({
      token: link_token,
      onSuccess: async (publicToken) => {
        try {
          await api.post('plaid/exchange/token', { publicToken });
          await fetchBanks();
          showNotification('Bank successfully reconnected!', 'success');
          closeEditBankNameModal();
        } catch (exchangeError) {
          console.error('Error finalizing bank reconnection:', exchangeError);
          error.value.reconnectBank = exchangeError.message || 'Failed to finalize bank reconnection';
          showNotification(`Error reconnecting bank: ${error.value.reconnectBank}`, 'error');
        } finally {
          loading.value.reconnectBank = false;
          if (reconnectPlaidHandler?.destroy) {
            reconnectPlaidHandler.destroy();
          }
          reconnectPlaidHandler = null;
        }
      },
      onExit: (err) => {
        if (err) {
          const message = err.display_message || err.error_message || err.error_code || 'Reconnection process was interrupted';
          error.value.reconnectBank = message;
          showNotification(`Error reconnecting bank: ${message}`, 'error');
        }

        loading.value.reconnectBank = false;
        if (reconnectPlaidHandler?.destroy) {
          reconnectPlaidHandler.destroy();
        }
        reconnectPlaidHandler = null;
      }
    });

    reconnectPlaidHandler.open();
  } catch (err) {
    console.error('Error reconnecting bank:', err);
    error.value.reconnectBank = err.message || 'Failed to reconnect bank';
    showNotification(`Error reconnecting bank: ${error.value.reconnectBank}`, 'error');
    loading.value.reconnectBank = false;
  }
};

const encryptBankAccessToken = async (bank) => {
  if (!bank?.itemId) {
    return;
  }

  try {
    loading.value.encryptAccessToken = true;
    error.value.encryptAccessToken = null;

    const response = await api.post(`plaid/items/${bank.itemId}/encrypt-access-token`);
    await fetchBanks();

    if (response?.alreadyEncrypted) {
      showNotification('Access token was already encrypted. No changes were needed.');
      return;
    }

    showNotification('Access token encryption fix completed successfully.');
  } catch (err) {
    console.error('Error encrypting bank access token:', err);
    error.value.encryptAccessToken = err.message || 'Failed to encrypt access token';
    showNotification(`Error encrypting access token: ${error.value.encryptAccessToken}`, 'error');
  } finally {
    loading.value.encryptAccessToken = false;
  }
};

const DOWNLOAD_BATCH_SIZE = 1000;
const MAX_DOWNLOAD_BATCH_REQUESTS = 2000;

const buildDownloadSelection = (selectedData = {}) => ({
  transactions: selectedData.transactions !== undefined ? Boolean(selectedData.transactions) : true,
  items: selectedData.items !== undefined ? Boolean(selectedData.items) : false,
  accounts: selectedData.accounts !== undefined ? Boolean(selectedData.accounts) : false,
  accountGroups: selectedData.accountGroups !== undefined ? Boolean(selectedData.accountGroups) : false,
  syncSessions: selectedData.syncSessions !== undefined ? Boolean(selectedData.syncSessions) : false
});

const downloadAllData = async (selectedData) => {
  try {
    const downloadSelection = buildDownloadSelection(selectedData);
    const selectedTypes = Object.entries(downloadSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);

    if (selectedTypes.length === 0) {
      showNotification('Select at least one data type to download.', 'error');
      return;
    }

    loading.value.downloadAllData = true;
    error.value.downloadAllData = null;
    downloadStatus.value = 'Preparing export...';
    downloadSummary.value = null;

    const exportData = {
      generatedAt: new Date().toISOString(),
      userId: null,
      includes: downloadSelection,
      counts: {
        items: 0,
        transactions: 0,
        accounts: 0,
        accountGroups: 0,
        syncSessions: 0
      },
      items: [],
      transactions: [],
      accounts: [],
      accountGroups: [],
      syncSessions: []
    };

    let pagination = {
      itemsStart: null,
      transactionsStart: null,
      accountsStart: null,
      accountGroupsStart: null,
      syncSessionsStart: null,
      hasMore: true
    };
    let batchRequests = 0;
    let lastCursorSignature = null;

    while (pagination.hasMore) {
      if (batchRequests >= MAX_DOWNLOAD_BATCH_REQUESTS) {
        throw new Error('Exceeded maximum batch requests while downloading data');
      }

      const queryParams = new URLSearchParams({
        batchSize: String(DOWNLOAD_BATCH_SIZE),
        includeItems: String(downloadSelection.items),
        includeTransactions: String(downloadSelection.transactions),
        includeAccounts: String(downloadSelection.accounts),
        includeAccountGroups: String(downloadSelection.accountGroups),
        includeSyncSessions: String(downloadSelection.syncSessions)
      });

      if (pagination.itemsStart) {
        queryParams.set('itemsStart', pagination.itemsStart);
      }
      if (pagination.transactionsStart) {
        queryParams.set('transactionsStart', pagination.transactionsStart);
      }
      if (pagination.accountsStart) {
        queryParams.set('accountsStart', pagination.accountsStart);
      }
      if (pagination.accountGroupsStart) {
        queryParams.set('accountGroupsStart', pagination.accountGroupsStart);
      }
      if (pagination.syncSessionsStart) {
        queryParams.set('syncSessionsStart', pagination.syncSessionsStart);
      }

      downloadStatus.value = `Downloading batch ${batchRequests + 1} for ${selectedTypes.join(', ')}...`;
      const batchResponse = await api.get(`plaid/download/all-data?${queryParams.toString()}`);

      if (!exportData.userId && batchResponse?.userId) {
        exportData.userId = batchResponse.userId;
      }

      if (downloadSelection.items && Array.isArray(batchResponse?.items)) {
        exportData.items.push(...batchResponse.items);
      }
      if (downloadSelection.transactions && Array.isArray(batchResponse?.transactions)) {
        exportData.transactions.push(...batchResponse.transactions);
      }
      if (downloadSelection.accounts && Array.isArray(batchResponse?.accounts)) {
        exportData.accounts.push(...batchResponse.accounts);
      }
      if (downloadSelection.accountGroups && Array.isArray(batchResponse?.accountGroups)) {
        exportData.accountGroups.push(...batchResponse.accountGroups);
      }
      if (downloadSelection.syncSessions && Array.isArray(batchResponse?.syncSessions)) {
        exportData.syncSessions.push(...batchResponse.syncSessions);
      }

      pagination = {
        itemsStart: batchResponse?.pagination?.itemsStart || null,
        transactionsStart: batchResponse?.pagination?.transactionsStart || null,
        accountsStart: batchResponse?.pagination?.accountsStart || null,
        accountGroupsStart: batchResponse?.pagination?.accountGroupsStart || null,
        syncSessionsStart: batchResponse?.pagination?.syncSessionsStart || null,
        hasMore: Boolean(batchResponse?.pagination?.hasMore)
      };

      const currentCursorSignature = JSON.stringify({
        itemsStart: pagination.itemsStart,
        transactionsStart: pagination.transactionsStart,
        accountsStart: pagination.accountsStart,
        accountGroupsStart: pagination.accountGroupsStart,
        syncSessionsStart: pagination.syncSessionsStart
      });

      if (pagination.hasMore && currentCursorSignature === lastCursorSignature) {
        throw new Error('Export pagination stalled. Please try again.');
      }
      lastCursorSignature = currentCursorSignature;

      batchRequests++;
      downloadStatus.value = `Downloaded ${batchRequests} batches (${exportData.items.length} items, ${exportData.transactions.length} transactions, ${exportData.accounts.length} accounts, ${exportData.accountGroups.length} groups, ${exportData.syncSessions.length} sync sessions)...`;
    }

    exportData.counts = {
      items: exportData.items.length,
      transactions: exportData.transactions.length,
      accounts: exportData.accounts.length,
      accountGroups: exportData.accountGroups.length,
      syncSessions: exportData.syncSessions.length
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `plaid-data-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);

    downloadSummary.value = {
      completedAt: new Date().toISOString(),
      selectedTypes,
      counts: { ...exportData.counts },
      batches: batchRequests,
      fileName
    };

    showNotification('Downloaded all Plaid data successfully.');
  } catch (err) {
    console.error('Error downloading all Plaid data:', err);
    error.value.downloadAllData = err.message || 'Failed to download all data';
    showNotification(`Error downloading data: ${error.value.downloadAllData}`, 'error');
  } finally {
    loading.value.downloadAllData = false;
    downloadStatus.value = '';
  }
};

const DELETE_BATCH_SIZE = 1000;
const MAX_DELETE_BATCH_REQUESTS = 2000;

const buildDeleteSelection = (selectedData = {}) => ({
  transactions: selectedData.transactions !== undefined ? Boolean(selectedData.transactions) : true,
  items: selectedData.items !== undefined ? Boolean(selectedData.items) : false,
  accounts: selectedData.accounts !== undefined ? Boolean(selectedData.accounts) : false,
  accountGroups: selectedData.accountGroups !== undefined ? Boolean(selectedData.accountGroups) : false,
  syncSessions: selectedData.syncSessions !== undefined ? Boolean(selectedData.syncSessions) : false
});

const deleteSelectedData = async (selectedData) => {
  try {
    const deleteSelection = buildDeleteSelection(selectedData);
    const selectedTypes = Object.entries(deleteSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);

    if (selectedTypes.length === 0) {
      showNotification('Select at least one data type to delete.', 'error');
      return;
    }

    loading.value.deleteSelectedData = true;
    error.value.deleteSelectedData = null;
    deleteStatus.value = 'Preparing deletion...';
    deleteSummary.value = null;

    const deletedTotals = {
      items: 0,
      transactions: 0,
      accounts: 0,
      accountGroups: 0,
      syncSessions: 0
    };

    let batchRequests = 0;
    let hasMore = true;

    while (hasMore) {
      if (batchRequests >= MAX_DELETE_BATCH_REQUESTS) {
        throw new Error('Exceeded maximum batch requests while deleting data');
      }

      deleteStatus.value = `Deleting batch ${batchRequests + 1} for ${selectedTypes.join(', ')}...`;
      const batchResponse = await api.post('plaid/delete/data', {
        batchSize: DELETE_BATCH_SIZE,
        includeItems: deleteSelection.items,
        includeTransactions: deleteSelection.transactions,
        includeAccounts: deleteSelection.accounts,
        includeAccountGroups: deleteSelection.accountGroups,
        includeSyncSessions: deleteSelection.syncSessions
      });

      const deletedThisBatch = batchResponse?.deleted || {};

      deletedTotals.items += Number(deletedThisBatch.items || 0);
      deletedTotals.transactions += Number(deletedThisBatch.transactions || 0);
      deletedTotals.accounts += Number(deletedThisBatch.accounts || 0);
      deletedTotals.accountGroups += Number(deletedThisBatch.accountGroups || 0);
      deletedTotals.syncSessions += Number(deletedThisBatch.syncSessions || 0);

      hasMore = Boolean(batchResponse?.hasMore);
      batchRequests++;

      const deletedCountThisBatch =
        Number(deletedThisBatch.items || 0) +
        Number(deletedThisBatch.transactions || 0) +
        Number(deletedThisBatch.accounts || 0) +
        Number(deletedThisBatch.accountGroups || 0) +
        Number(deletedThisBatch.syncSessions || 0);

      if (hasMore && deletedCountThisBatch === 0) {
        throw new Error('Deletion stalled. Please try again.');
      }

      deleteStatus.value = `Deleted ${batchRequests} batches (${deletedTotals.items} items, ${deletedTotals.transactions} transactions, ${deletedTotals.accounts} accounts, ${deletedTotals.accountGroups} groups, ${deletedTotals.syncSessions} sync sessions)...`;
    }

    await fetchBanks();
    deleteSummary.value = {
      completedAt: new Date().toISOString(),
      selectedTypes,
      deleted: { ...deletedTotals },
      batches: batchRequests
    };
    showNotification(
      `Deleted data successfully: ${deletedTotals.transactions} transactions, ${deletedTotals.items} items, ${deletedTotals.accounts} accounts, ${deletedTotals.accountGroups} groups, ${deletedTotals.syncSessions} sync sessions.`
    );
  } catch (err) {
    console.error('Error deleting selected Plaid data:', err);
    error.value.deleteSelectedData = err.message || 'Failed to delete selected data';
    showNotification(`Error deleting data: ${error.value.deleteSelectedData}`, 'error');
  } finally {
    loading.value.deleteSelectedData = false;
    deleteStatus.value = '';
  }
};

const resetCursor = async (bank) => {
  if (!bank?.itemId) {
    return;
  }

  try {
    loading.value.resetCursor = true;
    error.value.resetCursor = null;

    await api.post(`plaid/items/${bank.itemId}/reset-cursor`);
    await fetchBanks();

    showNotification('Cursor reset successfully. Next sync will start from an empty cursor.');
  } catch (err) {
    console.error('Error resetting item cursor:', err);
    error.value.resetCursor = err.message || 'Failed to reset cursor';
    showNotification(`Error resetting cursor: ${error.value.resetCursor}`, 'error');
  } finally {
    loading.value.resetCursor = false;
  }
};

// Clean up on unmount
watch(() => notification.value.timeout, (newTimeout, oldTimeout) => {
  if (oldTimeout) {
    clearTimeout(oldTimeout);
  }
});

onUnmounted(() => {
  if (notification.value.timeout) {
    clearTimeout(notification.value.timeout);
  }

  if (reconnectPlaidHandler?.destroy) {
    reconnectPlaidHandler.destroy();
  }
  reconnectPlaidHandler = null;
});
</script> 

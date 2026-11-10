<template>
  <div class="banks-view w-full flex flex-col">
    <div class="w-full">
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
    
    <!-- Available even after the last Plaid Item is disconnected. -->
    <div class="p-6 bg-[var(--theme-browser-chrome)] border-t border-[var(--theme-border)]">
      <p class="text-xs text-[var(--theme-text-soft)] mb-3">
        Before taking the app offline, save a financial backup for this signed-in user.
        Sign in to each of your two user accounts and download one backup per user.
        This includes transactions, accounts, groups, customizations, tabs, rules and reports.
        Store the JSON file somewhere secure and verify it before disconnecting any banks.
      </p>
      <button
        @click="downloadAllData(COMPLETE_FINANCE_BACKUP_SELECTION)"
        :disabled="loading.downloadAllData"
        class="w-full py-3 bg-[var(--theme-text)] text-[var(--theme-browser-chrome)] text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
      >
        {{ loading.downloadAllData ? 'Preparing Backup...' : 'Download Complete Financial Backup' }}
      </button>
      <p v-if="loading.downloadAllData" class="text-xs text-[var(--theme-text-soft)] mt-2">
        {{ downloadStatus }}
      </p>
      <p v-if="downloadSummary?.fileName" class="text-xs text-[var(--theme-text-soft)] mt-2">
        Last download: {{ downloadSummary.fileName }}
      </p>
    </div>

    <!-- Connect bank button -->
    <div class="p-6 bg-[var(--theme-browser-chrome)] border-t-1 border-[var(--theme-border)] mt-auto">
      <button 
        @click="handleConnectBank" 
        :disabled="loading.connectBank"
        class="w-full py-4 bg-[var(--theme-text)] hover:opacity-80 text-[var(--theme-browser-chrome)] border-1 border-[var(--theme-border)] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
      >
        <template v-if="loading.connectBank">
          <span>Connecting...</span>
        </template>
        <template v-else>
          <span>+</span>
          Connect New Bank
        </template>
      </button>
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
      :is-disconnecting="loading.disconnectBank"
      :is-encrypting="loading.encryptAccessToken"
      :is-downloading="loading.downloadAllData"
      :download-status="downloadStatus"
      :is-deleting="loading.deleteSelectedData"
      :delete-status="deleteStatus"
      :is-deleting-bank="loading.deleteBank"
      :delete-bank-status="deleteBankStatus"
      :is-resetting="loading.resetCursor"
      :download-summary="downloadSummary"
      :delete-summary="deleteSummary"
      :delete-bank-summary="deleteBankSummary"
      @close="closeEditBankNameModal"
      @save="saveBankName"
      @reconnect="reconnectBank"
      @encrypt-access-token="encryptBankAccessToken"
      @download-all-data="downloadAllData"
      @delete-selected-data="deleteSelectedData"
      @delete-bank="deleteBank"
      @disconnect="disconnectBank"
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
          <AlertCircle v-else-if="notification.type === 'error'" class="h-5 w-5 text-black-400" />
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
import { usePlaidSync } from '@/shared/composables/usePlaidSync.js';
import { useApi } from '@/shared/composables/useApi.js';
import loadScript from '@/shared/utils/loadScript.js';
import BankList from '../components/BankList.vue';
import SyncSessionsModal from '../components/SyncSessionsModal.vue';
import EditBankNameModal from '../components/EditBankNameModal.vue';
import { CheckCircle, AlertCircle } from 'lucide-vue-next';

const emit = defineEmits(['connect-bank-complete', 'banks-data-changed']);
const api = useApi();
const { syncLatestTransactionsForBank } = usePlaidSync();

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
const deleteBankStatus = ref('');
const downloadSummary = ref(null);
const deleteSummary = ref(null);
const deleteBankSummary = ref(null);
let connectPlaidHandler = null;
let reconnectPlaidHandler = null;

const PLAID_SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

// Initialize loading state for reconnect bank
loading.value = {
  ...loading.value,
  connectBank: false,
  reconnectBank: false,
  encryptAccessToken: false,
  downloadAllData: false,
  deleteSelectedData: false,
  deleteBank: false,
  disconnectBank: false,
  resetCursor: false
};

// Initialize error state for reconnect bank
error.value = {
  ...error.value,
  connectBank: null,
  reconnectBank: null,
  encryptAccessToken: null,
  downloadAllData: null,
  deleteSelectedData: null,
  deleteBank: null,
  disconnectBank: null,
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

const clearConnectPlaidHandler = () => {
  if (connectPlaidHandler?.destroy) {
    connectPlaidHandler.destroy();
  }
  connectPlaidHandler = null;
};

const handleConnectBank = async () => {
  if (loading.value.connectBank) {
    return;
  }

  try {
    loading.value.connectBank = true;
    error.value.connectBank = null;

    await loadScript(PLAID_SCRIPT_URL);

    if (!window?.Plaid?.create) {
      throw new Error('Plaid Link failed to load');
    }

    const { link_token } = await api.post('plaid/connect/link');
    if (!link_token) {
      throw new Error('No link token received from server');
    }

    clearConnectPlaidHandler();
    connectPlaidHandler = window.Plaid.create({
      token: link_token,
      onSuccess: async (publicToken) => {
        try {
          const response = await api.post('plaid/exchange/token', { publicToken });
          const itemId = response?.data?.itemId || response?.itemId;

          if (!itemId) {
            throw new Error('Bank connected but missing item ID from server response');
          }

          const syncResult = await syncLatestTransactionsForBank(itemId);
          await fetchBanks();

          emit('banks-data-changed', {
            action: 'connected',
            itemId,
            syncResult
          });
          emit('connect-bank-complete');

          if (syncResult?.completed === false) {
            showNotification('Bank connected, but initial transaction sync failed. You can retry from Sync History.', 'error');
          } else {
            showNotification('Bank connected successfully!', 'success');
          }
        } catch (exchangeError) {
          console.error('Error finalizing bank connection:', exchangeError);
          error.value.connectBank = exchangeError.message || 'Failed to finalize bank connection';
          showNotification(`Error connecting bank: ${error.value.connectBank}`, 'error');
        } finally {
          loading.value.connectBank = false;
          clearConnectPlaidHandler();
        }
      },
      onExit: (err) => {
        if (err) {
          const message = err.display_message || err.error_message || err.error_code || 'Connection process was interrupted';
          error.value.connectBank = message;
          showNotification(`Error connecting bank: ${message}`, 'error');
        }

        loading.value.connectBank = false;
        clearConnectPlaidHandler();
      }
    });

    connectPlaidHandler.open();
  } catch (err) {
    console.error('Error connecting bank:', err);
    error.value.connectBank = err.message || 'Failed to connect bank';
    showNotification(`Error connecting bank: ${error.value.connectBank}`, 'error');
    loading.value.connectBank = false;
    clearConnectPlaidHandler();
  }
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
  if (bank?.disconnectedAt || bank?.status === 'disconnected') {
    showNotification('This connection was removed. Use Add Bank to connect again.', 'error');
    return;
  }
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
const DOWNLOAD_COLLECTIONS = [
  {
    "key": "items",
    "flag": "includeItems",
    "cursor": "itemsStart"
  },
  {
    "key": "transactions",
    "flag": "includeTransactions",
    "cursor": "transactionsStart"
  },
  {
    "key": "accounts",
    "flag": "includeAccounts",
    "cursor": "accountsStart"
  },
  {
    "key": "accountGroups",
    "flag": "includeAccountGroups",
    "cursor": "accountGroupsStart"
  },
  {
    "key": "syncSessions",
    "flag": "includeSyncSessions",
    "cursor": "syncSessionsStart"
  },
  {
    "key": "transactionCustomizations",
    "flag": "includeTransactionCustomizations",
    "cursor": "customizationsStart"
  },
  {
    "key": "tabs",
    "flag": "includeTabs",
    "cursor": "tabsStart"
  },
  {
    "key": "rules",
    "flag": "includeRules",
    "cursor": "rulesStart"
  },
  {
    "key": "reports",
    "flag": "includeReports",
    "cursor": "reportsStart"
  }
];

// The full backup includes all signed-in user's finance-owned records.
// The existing selective bank-modal export retains its previous defaults.
const COMPLETE_FINANCE_BACKUP_SELECTION = Object.fromEntries(
  DOWNLOAD_COLLECTIONS.map(({ key }) => [key, true])
);

const buildDownloadSelection = (selectedData = {}) => Object.fromEntries(
  DOWNLOAD_COLLECTIONS.map(({ key }) => [
    key, selectedData[key] === undefined ? key === 'transactions' : Boolean(selectedData[key])
  ])
);

const downloadAllData = async (selectedData = {}) => {
  if (loading.value.downloadAllData) return;

  const downloadSelection = buildDownloadSelection(selectedData);
  const selectedTypes = DOWNLOAD_COLLECTIONS
    .filter(({ key }) => downloadSelection[key])
    .map(({ key }) => key);

  if (!selectedTypes.length) {
    showNotification('Select at least one data type to download.', 'error');
    return;
  }

  try {
    loading.value.downloadAllData = true;
    error.value.downloadAllData = null;
    downloadStatus.value = 'Preparing backup for the signed-in user...';
    downloadSummary.value = null;

    const exportData = {
      generatedAt: new Date().toISOString(),
      format: 'dad-finance-backup-v1',
      userId: null,
      includes: downloadSelection,
      counts: {},
      ...Object.fromEntries(DOWNLOAD_COLLECTIONS.map(({ key }) => [key, []]))
    };

    let pagination = { hasMore: true };
    let batchRequests = 0;
    let lastCursorSignature = null;

    while (pagination.hasMore) {
      if (batchRequests >= MAX_DOWNLOAD_BATCH_REQUESTS) {
        throw new Error('Exceeded maximum batch requests while downloading data');
      }

      const queryParams = new URLSearchParams({ batchSize: String(DOWNLOAD_BATCH_SIZE) });
      DOWNLOAD_COLLECTIONS.forEach(({ key, flag, cursor }) => {
        queryParams.set(flag, String(downloadSelection[key]));
        if (pagination[cursor] && pagination[cursor] !== '__complete__') {
          queryParams.set(cursor, pagination[cursor]);
        }
      });

      downloadStatus.value = `Downloading backup batch ${batchRequests + 1}...`;
      const response = await api.get(`plaid/download/all-data?${queryParams.toString()}`);
      if (!response || !response.pagination || typeof response.pagination.hasMore !== 'boolean' || !response.userId) {
        throw new Error('Server returned an incomplete backup response; no download was saved');
      }
      if (exportData.userId && exportData.userId !== response.userId) {
        throw new Error('Backup user changed during export; no download was saved');
      }
      exportData.userId = response.userId;

      for (const { key } of DOWNLOAD_COLLECTIONS) {
        if (!downloadSelection[key]) continue;
        if (!Array.isArray(response[key])) {
          throw new Error(`Backup batch is missing ${key}; no download was saved`);
        }
        exportData[key].push(...response[key]);
      }

      pagination = response.pagination;
      const cursorSignature = JSON.stringify(
        DOWNLOAD_COLLECTIONS.map(({ cursor }) => pagination[cursor])
      );
      if (pagination.hasMore && cursorSignature === lastCursorSignature) {
        throw new Error('Backup pagination stalled; no download was saved');
      }
      lastCursorSignature = cursorSignature;
      batchRequests += 1;
      downloadStatus.value = `Downloaded ${batchRequests} backup batches...`;
    }

    for (const { key } of DOWNLOAD_COLLECTIONS) {
      exportData.counts[key] = exportData[key].length;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeUserId = String(exportData.userId).replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `dad-finance-backup-${safeUserId}-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Defer revocation so the browser can finish resolving the download.
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60000);

    downloadSummary.value = {
      completedAt: new Date().toISOString(),
      selectedTypes,
      counts: { ...exportData.counts },
      batches: batchRequests,
      fileName
    };
    showNotification('Financial backup downloaded. Verify the file before disconnecting banks.');
  } catch (err) {
    console.error('Error downloading financial backup:', err);
    error.value.downloadAllData = err.message || 'Failed to download data';
    showNotification(`Backup failed: ${error.value.downloadAllData}`, 'error');
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

const disconnectBank = async (bank) => {
  if (!bank?.itemId || loading.value.disconnectBank) return;

  try {
    loading.value.disconnectBank = true;
    error.value.disconnectBank = null;
    const result = await api.post(`plaid/items/${bank.itemId}/disconnect`);
    await fetchBanks();
    closeEditBankNameModal();
    emit('banks-data-changed', result);
    showNotification('Bank disconnected from Plaid. Your financial history was preserved.');
  } catch (err) {
    error.value.disconnectBank = err.message || 'Failed to disconnect bank';
    showNotification(`Bank not disconnected: ${error.value.disconnectBank}`, 'error');
  } finally {
    loading.value.disconnectBank = false;
  }
};

const deleteBank = async (bank) => {
  if (!bank?.itemId) {
    return;
  }

  try {
    loading.value.deleteBank = true;
    error.value.deleteBank = null;
    deleteBankStatus.value = 'Deleting connected bank and related data...';
    deleteBankSummary.value = null;

    const response = await api.delete(`plaid/items/${bank.itemId}`, {
      revokeAtPlaid: true
    });

    await fetchBanks();

    if (selectedBank.value?.itemId === bank.itemId) {
      selectedBank.value = null;
    }

    deleteBankSummary.value = {
      ...response,
      completedAt: new Date().toISOString()
    };

    closeEditBankNameModal();
    emit('banks-data-changed', response);

    if (response?.deleted === false && response?.reason === 'not_found') {
      showNotification('This bank was already removed.');
      return;
    }

    const counts = response?.counts || {};
    const warningsCount = Array.isArray(response?.warnings) ? response.warnings.length : 0;
    showNotification(
      `Bank deleted: ${counts.transactions || 0} transactions, ${counts.accounts || 0} accounts, ${counts.syncSessions || 0} sync sessions, ${counts.groupsUpdated || 0} groups updated, ${counts.groupsDeleted || 0} groups deleted${warningsCount ? ` (${warningsCount} warnings)` : ''}.`
    );
  } catch (err) {
    console.error('Error deleting connected bank:', err);
    error.value.deleteBank = err.message || 'Failed to delete connected bank';
    showNotification(`Error deleting connected bank: ${error.value.deleteBank}`, 'error');
  } finally {
    loading.value.deleteBank = false;
    deleteBankStatus.value = '';
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

  if (connectPlaidHandler?.destroy) {
    connectPlaidHandler.destroy();
  }
  connectPlaidHandler = null;

  if (reconnectPlaidHandler?.destroy) {
    reconnectPlaidHandler.destroy();
  }
  reconnectPlaidHandler = null;
});
</script> 

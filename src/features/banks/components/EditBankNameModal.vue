<template>
  <BaseModal 
    :is-open="isOpen" 
    :title="modalTitle"
    @close="$emit('close')"
  >
    <template #header>
      <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">{{ modalTitle }}</h3>
    </template>

    <template #content>
      <div class="p-4">
        <div class="mb-4">
          <label for="bank-name" class="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
          <input 
            type="text" 
            id="bank-name" 
            v-model="bankName" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bank name"
          />
        </div>
        
        <!-- Bank status info -->
        <div v-if="bank && bank.status === 'error'" class="my-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-black-800 font-medium text-sm mb-2 flex items-center">
            <AlertCircle class="h-4 w-4 mr-2" />
            Connection Update Required
          </p>
          <p class="text-sm text-black-700">
            Your login credentials might have changed or additional authentication may be required.
          </p>
        </div>
        
        <div class="flex flex-col space-y-4 mt-6">
          <!-- Save name button -->
          <button 
            @click="saveBankName" 
            class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            :disabled="!bankName.trim() || isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save Name' }}
          </button>
          
          <!-- Reconnect bank button -->
          <button 
            @click="reconnectBank" 
            class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            :disabled="isReconnecting"
          >
            <RefreshCcw v-if="!isReconnecting" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isReconnecting ? 'Reconnecting...' : 'Reconnect Bank' }}
          </button>

          <!-- Download all data button -->
          <button
            @click="toggleDownloadOptions"
            class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            :disabled="isDownloading"
          >
            <Download v-if="!isDownloading" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isDownloading ? 'Downloading...' : (showDownloadOptions ? 'Hide Download Options' : 'Download Data') }}
          </button>

          <div
            v-if="showDownloadOptions"
            class="w-full p-3 border border-gray-200 rounded-md bg-white text-sm text-gray-700"
          >
            <p class="font-medium mb-2 text-gray-900">Select data to download</p>
            <label class="flex items-center mb-2">
              <input v-model="downloadSelection.transactions" type="checkbox" class="mr-2" :disabled="isDownloading">
              Transactions
            </label>
            <label class="flex items-center mb-2">
              <input v-model="downloadSelection.items" type="checkbox" class="mr-2" :disabled="isDownloading">
              Plaid Items
            </label>
            <label class="flex items-center mb-2">
              <input v-model="downloadSelection.accounts" type="checkbox" class="mr-2" :disabled="isDownloading">
              Accounts
            </label>
            <label class="flex items-center mb-3">
              <input v-model="downloadSelection.accountGroups" type="checkbox" class="mr-2" :disabled="isDownloading">
              Account Groups
            </label>
            <label class="flex items-center mb-3">
              <input v-model="downloadSelection.syncSessions" type="checkbox" class="mr-2" :disabled="isDownloading">
              Sync Sessions
            </label>
            <button
              @click="downloadAllData"
              class="w-full px-4 py-2 border-2 border-black rounded-none text-white bg-black hover:bg-gray-800 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              :disabled="isDownloading || !hasSelectedDownloadType"
            >
              {{ isDownloading ? 'Downloading...' : 'Download Selected Data' }}
            </button>
          </div>

          <div
            v-if="isDownloading && downloadStatus"
            class="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm text-gray-700"
          >
            {{ downloadStatus }}
          </div>

          <div
            v-if="downloadSummary"
            class="w-full p-3 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700"
          >
            <p class="font-medium mb-2 text-gray-900">Last Download Summary</p>
            <p class="mb-1">Completed: {{ formatSummaryTime(downloadSummary.completedAt) }}</p>
            <p class="mb-1">Batches: {{ downloadSummary.batches }}</p>
            <p v-if="downloadSummary.fileName" class="mb-1">File: {{ downloadSummary.fileName }}</p>
            <p class="mb-1">Selected: {{ (downloadSummary.selectedTypes || []).join(', ') }}</p>
            <p class="mb-1">Transactions: {{ downloadSummary.counts?.transactions || 0 }}</p>
            <p class="mb-1">Items: {{ downloadSummary.counts?.items || 0 }}</p>
            <p class="mb-1">Accounts: {{ downloadSummary.counts?.accounts || 0 }}</p>
            <p class="mb-1">Groups: {{ downloadSummary.counts?.accountGroups || 0 }}</p>
            <p>Sync Sessions: {{ downloadSummary.counts?.syncSessions || 0 }}</p>
          </div>

          <button
            @click="toggleDeleteOptions"
            class="w-full flex items-center justify-center px-4 py-2 border border-red-200 rounded-md shadow-sm text-sm font-medium text-black-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            :disabled="isDeleting"
          >
            <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isDeleting ? 'Deleting...' : (showDeleteOptions ? 'Hide Delete Options' : 'Delete Data') }}
          </button>

          <div
            v-if="showDeleteOptions"
            class="w-full p-3 border border-red-200 rounded-md bg-white text-sm text-gray-700"
          >
            <p class="font-medium mb-2 text-gray-900 text-black-700">Select data to delete</p>
            <p class="mb-2 text-xs text-black-600">This action is destructive and cannot be undone.</p>
            <label class="flex items-center mb-2">
              <input v-model="deleteSelection.transactions" type="checkbox" class="mr-2" :disabled="isDeleting">
              Transactions
            </label>
            <label class="flex items-center mb-2">
              <input v-model="deleteSelection.items" type="checkbox" class="mr-2" :disabled="isDeleting">
              Plaid Items
            </label>
            <label class="flex items-center mb-2">
              <input v-model="deleteSelection.accounts" type="checkbox" class="mr-2" :disabled="isDeleting">
              Accounts
            </label>
            <label class="flex items-center mb-3">
              <input v-model="deleteSelection.accountGroups" type="checkbox" class="mr-2" :disabled="isDeleting">
              Account Groups
            </label>
            <label class="flex items-center mb-3">
              <input v-model="deleteSelection.syncSessions" type="checkbox" class="mr-2" :disabled="isDeleting">
              Sync Sessions
            </label>
            <button
              @click="deleteSelectedData"
              class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :disabled="isDeleting || !hasSelectedDeleteType"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete Selected Data' }}
            </button>
          </div>

          <div
            v-if="isDeleting && deleteStatus"
            class="w-full px-3 py-2 border border-red-200 rounded-md bg-red-50 text-sm text-black-700"
          >
            {{ deleteStatus }}
          </div>

          <div
            v-if="deleteSummary"
            class="w-full p-3 border border-red-200 rounded-md bg-red-50 text-sm text-black-700"
          >
            <p class="font-medium mb-2 text-gray-900">Last Delete Summary</p>
            <p class="mb-1">Completed: {{ formatSummaryTime(deleteSummary.completedAt) }}</p>
            <p class="mb-1">Batches: {{ deleteSummary.batches }}</p>
            <p class="mb-1">Selected: {{ (deleteSummary.selectedTypes || []).join(', ') }}</p>
            <p class="mb-1">Transactions: {{ deleteSummary.deleted?.transactions || 0 }}</p>
            <p class="mb-1">Items: {{ deleteSummary.deleted?.items || 0 }}</p>
            <p class="mb-1">Accounts: {{ deleteSummary.deleted?.accounts || 0 }}</p>
            <p class="mb-1">Groups: {{ deleteSummary.deleted?.accountGroups || 0 }}</p>
            <p>Sync Sessions: {{ deleteSummary.deleted?.syncSessions || 0 }}</p>
          </div>

          <button
            @click="toggleDeleteBankOptions"
            class="w-full flex items-center justify-center px-4 py-2 border border-red-200 rounded-md shadow-sm text-sm font-medium text-black-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            :disabled="isDeletingBank || !bank?.itemId"
          >
            <Trash2 v-if="!isDeletingBank" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isDeletingBank ? 'Deleting Bank...' : (showDeleteBankOptions ? 'Hide Delete Bank' : 'Delete Connected Bank') }}
          </button>

          <div
            v-if="showDeleteBankOptions"
            class="w-full p-3 border border-red-200 rounded-md bg-white text-sm text-gray-700"
          >
            <p class="font-medium mb-2 text-gray-900 text-black-800">Delete This Connected Bank</p>
            <p class="mb-2 text-xs text-black-700">
              This removes this bank and its related item, accounts, transactions, sync sessions, and linked customizations.
            </p>
            <p class="mb-2 text-xs text-black-700">
              Type <span class="font-bold">DELETE</span> to confirm.
            </p>
            <input
              v-model="deleteBankConfirmation"
              type="text"
              class="w-full px-3 py-2 mb-3 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
              placeholder="TYPE DELETE"
              :disabled="isDeletingBank"
            >
            <button
              @click="deleteBank"
              class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :disabled="isDeletingBank || !hasDeleteBankConfirmation"
            >
              {{ isDeletingBank ? 'Deleting Bank...' : 'Delete Connected Bank Now' }}
            </button>
          </div>

          <div
            v-if="isDeletingBank && deleteBankStatus"
            class="w-full px-3 py-2 border border-red-200 rounded-md bg-red-50 text-sm text-black-700"
          >
            {{ deleteBankStatus }}
          </div>

          <div
            v-if="deleteBankSummary"
            class="w-full p-3 border border-red-200 rounded-md bg-red-50 text-sm text-black-700"
          >
            <p class="font-medium mb-2 text-gray-900">Last Delete Bank Summary</p>
            <p class="mb-1">Completed: {{ formatSummaryTime(deleteBankSummary.completedAt) }}</p>
            <p class="mb-1">Item: {{ deleteBankSummary.itemId || 'Unknown' }}</p>
            <p class="mb-1">Plaid Revoke: {{ deleteBankSummary.plaidRevoke?.succeeded ? 'Succeeded' : (deleteBankSummary.plaidRevoke?.attempted ? 'Failed' : 'Skipped') }}</p>
            <p class="mb-1">Transactions: {{ deleteBankSummary.counts?.transactions || 0 }}</p>
            <p class="mb-1">Accounts: {{ deleteBankSummary.counts?.accounts || 0 }}</p>
            <p class="mb-1">Sync Sessions: {{ deleteBankSummary.counts?.syncSessions || 0 }}</p>
            <p class="mb-1">Customizations: {{ deleteBankSummary.counts?.customizations || 0 }}</p>
            <p class="mb-1">Groups Updated: {{ deleteBankSummary.counts?.groupsUpdated || 0 }}</p>
            <p class="mb-1">Groups Deleted: {{ deleteBankSummary.counts?.groupsDeleted || 0 }}</p>
            <p>Warnings: {{ (deleteBankSummary.warnings || []).length }}</p>
          </div>

          <button
            @click="resetCursor"
            class="w-full flex items-center justify-center px-4 py-2 border border-amber-200 rounded-md shadow-sm text-sm font-medium text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
            :disabled="isResetting || !bank?.itemId"
          >
            <Loader v-if="isResetting" class="h-4 w-4 mr-2 animate-spin" />
            <RefreshCcw v-else class="h-4 w-4 mr-2" />
            {{
              isResetting
                ? 'Resetting Cursor...'
                : (isResetCursorConfirming ? 'Click again to confirm reset cursor' : 'Reset Cursor')
            }}
          </button>

          <button
            @click="encryptAccessToken"
            class="w-full flex items-center justify-center px-4 py-2 border border-indigo-200 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            :disabled="isEncrypting || !bank?.itemId"
          >
            <Loader v-if="isEncrypting" class="h-4 w-4 mr-2 animate-spin" />
            <Lock v-else class="h-4 w-4 mr-2" />
            {{ isEncrypting ? 'Encrypting Token...' : 'One-Time Token Encryption Fix' }}
          </button>

          <button
            @click="togglePlaidItemJson"
            class="w-full flex items-center justify-center px-4 py-2 border border-emerald-200 rounded-md shadow-sm text-sm font-medium text-black-600 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
          >
            {{ showPlaidItemJson ? 'Hide Plaid Item JSON' : 'Show Plaid Item JSON' }}
          </button>

          <div
            v-if="showPlaidItemJson"
            class="w-full p-3 border border-emerald-200 rounded-md bg-emerald-50 text-xs text-black-900 overflow-x-auto"
          >
            <p class="font-medium mb-2 text-gray-900 text-sm">Plaid Item JSON</p>
            <pre class="whitespace-pre-wrap break-words">{{ plaidItemJson }}</pre>
          </div>
          
          <!-- Disconnect bank button - commented out for future implementation -->
          <!-- <button 
            @click="disconnectBank" 
            class="w-full px-4 py-2 border border-red-300 rounded-md text-black-700 bg-white hover:bg-red-50 focus:outline-none"
          >
            Disconnect Bank
          </button> -->
          
          <!-- Cancel button -->
          <button 
            @click="$emit('close')" 
            class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { RefreshCcw, AlertCircle, Loader, Download, Trash2, Lock } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  bank: {
    type: Object,
    default: () => ({})
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  isReconnecting: {
    type: Boolean,
    default: false
  },
  isDownloading: {
    type: Boolean,
    default: false
  },
  downloadStatus: {
    type: String,
    default: ''
  },
  isDeleting: {
    type: Boolean,
    default: false
  },
  isDeletingBank: {
    type: Boolean,
    default: false
  },
  deleteStatus: {
    type: String,
    default: ''
  },
  deleteBankStatus: {
    type: String,
    default: ''
  },
  isResetting: {
    type: Boolean,
    default: false
  },
  isEncrypting: {
    type: Boolean,
    default: false
  },
  downloadSummary: {
    type: Object,
    default: null
  },
  deleteSummary: {
    type: Object,
    default: null
  },
  deleteBankSummary: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'save', 'reconnect', 'download-all-data', 'delete-selected-data', 'delete-bank', 'reset-cursor', 'encrypt-access-token']);

const bankName = ref('');
const showDownloadOptions = ref(false);
const downloadSelection = ref({
  transactions: true,
  items: false,
  accounts: false,
  accountGroups: false,
  syncSessions: false
});
const showDeleteOptions = ref(false);
const deleteSelection = ref({
  transactions: true,
  items: false,
  accounts: false,
  accountGroups: false,
  syncSessions: false
});
const showDeleteBankOptions = ref(false);
const deleteBankConfirmation = ref('');
const showPlaidItemJson = ref(false);
const isResetCursorConfirming = ref(false);
let resetCursorConfirmTimeout = null;
const modalTitle = computed(() => {
  if (props.bank?.status === 'error') {
    return 'BANK CONNECTION ISSUE';
  }
  return 'EDIT BANK DETAILS';
});
const hasSelectedDownloadType = computed(() => {
  return Object.values(downloadSelection.value).some(Boolean);
});
const hasSelectedDeleteType = computed(() => {
  return Object.values(deleteSelection.value).some(Boolean);
});
const hasDeleteBankConfirmation = computed(() => deleteBankConfirmation.value === 'DELETE');
const plaidItemJson = computed(() => {
  const currentItem = { ...(props.bank || {}) };
  delete currentItem.accessToken;

  return JSON.stringify(currentItem, null, 2);
});

const formatSummaryTime = (value) => {
  if (!value) {
    return 'Unknown';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const clearResetCursorConfirmation = () => {
  isResetCursorConfirming.value = false;
  if (resetCursorConfirmTimeout) {
    clearTimeout(resetCursorConfirmTimeout);
    resetCursorConfirmTimeout = null;
  }
};

// Initialize bank name when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.bank) {
    bankName.value = props.bank.institutionName || '';
    showDownloadOptions.value = false;
    downloadSelection.value = {
      transactions: true,
      items: false,
      accounts: false,
      accountGroups: false,
      syncSessions: false
    };
    showDeleteOptions.value = false;
    deleteSelection.value = {
      transactions: true,
      items: false,
      accounts: false,
      accountGroups: false,
      syncSessions: false
    };
    showDeleteBankOptions.value = false;
    deleteBankConfirmation.value = '';
    showPlaidItemJson.value = false;
    clearResetCursorConfirmation();
  }
}, { immediate: true });

// Watch for bank changes and update name
watch(() => props.bank, (bank) => {
  if (bank && props.isOpen) {
    bankName.value = bank.institutionName || '';
  }
});

const saveBankName = () => {
  if (bankName.value.trim()) {
    emit('save', {
      ...props.bank,
      institutionName: bankName.value.trim()
    });
  }
};

const reconnectBank = () => {
  if (props.bank?.itemId) {
    emit('reconnect', props.bank);
  }
};

const toggleDownloadOptions = () => {
  showDownloadOptions.value = !showDownloadOptions.value;
};

const toggleDeleteOptions = () => {
  showDeleteOptions.value = !showDeleteOptions.value;
};

const toggleDeleteBankOptions = () => {
  showDeleteBankOptions.value = !showDeleteBankOptions.value;
};

const downloadAllData = () => {
  emit('download-all-data', { ...downloadSelection.value });
};

const deleteSelectedData = () => {
  emit('delete-selected-data', { ...deleteSelection.value });
};

const deleteBank = () => {
  if (!props.bank?.itemId || !hasDeleteBankConfirmation.value || props.isDeletingBank) {
    return;
  }

  emit('delete-bank', props.bank);
};

const resetCursor = () => {
  if (!props.bank?.itemId || props.isResetting) {
    return;
  }

  if (!isResetCursorConfirming.value) {
    isResetCursorConfirming.value = true;
    resetCursorConfirmTimeout = setTimeout(() => {
      clearResetCursorConfirmation();
    }, 6000);
    return;
  }

  clearResetCursorConfirmation();
  emit('reset-cursor', props.bank);
};

const encryptAccessToken = () => {
  if (!props.bank?.itemId || props.isEncrypting) {
    return;
  }

  emit('encrypt-access-token', props.bank);
};

const togglePlaidItemJson = () => {
  showPlaidItemJson.value = !showPlaidItemJson.value;
};

onUnmounted(() => {
  clearResetCursorConfirmation();
});

// Placeholder for future implementation
// const disconnectBank = () => {
//   if (props.bank?.itemId) {
//     emit('disconnect', props.bank);
//   }
// };
</script> 

<template>
  <BaseModal 
    :is-open="isOpen" 
    :title="modalTitle"
    @close="$emit('close')"
  >
    <template #header>
      <h3 class="text-lg font-bold text-black uppercase tracking-wider border-b-2 border-black pb-2">{{ modalTitle }}</h3>
    </template>

    <template #content>
      <div class="p-4">
        <div class="mb-4">
          <label for="bank-name" class="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
          <input 
            type="text" 
            id="bank-name" 
            v-model="bankName" 
            class="w-full px-3 py-2 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono"
            placeholder="ENTER BANK NAME"
          />
        </div>
        
        <!-- Bank status info -->
        <div v-if="bank && bank.status === 'error'" class="my-4 p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p class="text-black font-bold text-sm mb-2 uppercase flex items-center">
            <AlertCircle class="h-4 w-4 mr-2" />
            Connection Update Required
          </p>
          <p class="text-sm text-black font-mono">
            Your login credentials might have changed or additional authentication may be required.
          </p>
        </div>
        
        <div class="flex flex-col space-y-4 mt-6">
          <!-- Save name button -->
          <button 
            @click="saveBankName" 
            class="w-full px-4 py-2 border-2 border-black rounded-none text-white bg-black hover:bg-gray-800 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase font-bold tracking-wide"
            :disabled="!bankName.trim() || isSaving"
          >
            {{ isSaving ? 'SAVING...' : 'SAVE NAME' }}
          </button>
          
          <!-- Reconnect bank button -->
          <button 
            @click="reconnectBank" 
            class="w-full flex items-center justify-center px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold rounded-none text-black bg-white hover:bg-gray-50 focus:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wide"
            :disabled="isReconnecting"
          >
            <RefreshCcw v-if="!isReconnecting" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isReconnecting ? 'RECONNECTING...' : 'RECONNECT BANK' }}
          </button>

          <!-- Download all data button -->
          <button
            @click="toggleDownloadOptions"
            class="w-full flex items-center justify-center px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold rounded-none text-black bg-white hover:bg-gray-50 focus:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wide"
            :disabled="isDownloading"
          >
            <Download v-if="!isDownloading" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isDownloading ? 'DOWNLOADING...' : (showDownloadOptions ? 'HIDE DOWNLOAD OPTIONS' : 'DOWNLOAD DATA') }}
          </button>

          <div
            v-if="showDownloadOptions"
            class="w-full p-3 border-2 border-black rounded-none bg-white text-sm text-black font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <p class="font-bold uppercase mb-2">Select data to download</p>
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
              class="w-full px-4 py-2 border-2 border-black rounded-none text-white bg-black hover:bg-gray-800 focus:outline-none disabled:bg-gray-500 uppercase font-bold tracking-wide"
              :disabled="isDownloading || !hasSelectedDownloadType"
            >
              {{ isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD SELECTED DATA' }}
            </button>
          </div>

          <div
            v-if="isDownloading && downloadStatus"
            class="w-full px-3 py-2 border-2 border-black rounded-none bg-white text-sm text-black font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {{ downloadStatus }}
          </div>

          <div
            v-if="downloadSummary"
            class="w-full p-3 border-2 border-black rounded-none bg-gray-50 text-sm text-black font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <p class="font-bold uppercase mb-2">Last Download Summary</p>
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
            class="w-full flex items-center justify-center px-4 py-2 border-2 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] font-bold rounded-none text-red-700 bg-white hover:bg-red-50 focus:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all uppercase tracking-wide"
            :disabled="isDeleting"
          >
            <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isDeleting ? 'DELETING...' : (showDeleteOptions ? 'HIDE DELETE OPTIONS' : 'DELETE DATA') }}
          </button>

          <div
            v-if="showDeleteOptions"
            class="w-full p-3 border-2 border-red-600 rounded-none bg-white text-sm text-black font-mono shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
          >
            <p class="font-bold uppercase mb-2 text-red-700">Select data to delete</p>
            <p class="mb-2 text-xs text-red-600">This action is destructive and cannot be undone.</p>
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
              class="w-full px-4 py-2 border-2 border-red-700 rounded-none text-white bg-red-700 hover:bg-red-800 focus:outline-none disabled:bg-red-300 uppercase font-bold tracking-wide"
              :disabled="isDeleting || !hasSelectedDeleteType"
            >
              {{ isDeleting ? 'DELETING...' : 'DELETE SELECTED DATA' }}
            </button>
          </div>

          <div
            v-if="isDeleting && deleteStatus"
            class="w-full px-3 py-2 border-2 border-red-600 rounded-none bg-white text-sm text-red-700 font-mono shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
          >
            {{ deleteStatus }}
          </div>

          <div
            v-if="deleteSummary"
            class="w-full p-3 border-2 border-red-600 rounded-none bg-red-50 text-sm text-red-700 font-mono shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
          >
            <p class="font-bold uppercase mb-2">Last Delete Summary</p>
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
            @click="resetCursor"
            class="w-full flex items-center justify-center px-4 py-2 border-2 border-amber-600 shadow-[4px_4px_0px_0px_rgba(217,119,6,1)] font-bold rounded-none text-amber-800 bg-white hover:bg-amber-50 focus:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] transition-all uppercase tracking-wide"
            :disabled="isResetting || !bank?.itemId"
          >
            <Loader v-if="isResetting" class="h-4 w-4 mr-2 animate-spin" />
            <RefreshCcw v-else class="h-4 w-4 mr-2" />
            {{
              isResetting
                ? 'RESETTING CURSOR...'
                : (isResetCursorConfirming ? 'CLICK AGAIN TO CONFIRM RESET CURSOR' : 'RESET CURSOR')
            }}
          </button>
          
          <!-- Disconnect bank button - commented out for future implementation -->
          <!-- <button 
            @click="disconnectBank" 
            class="w-full px-4 py-2 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
          >
            Disconnect Bank
          </button> -->
          
          <!-- Cancel button -->
          <button 
            @click="$emit('close')" 
            class="w-full px-4 py-2 border-2 border-black rounded-none text-black bg-white hover:bg-gray-50 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase font-bold tracking-wide"
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
import { RefreshCcw, AlertCircle, Loader, Download, Trash2 } from 'lucide-vue-next';

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
  deleteStatus: {
    type: String,
    default: ''
  },
  isResetting: {
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
  }
});

const emit = defineEmits(['close', 'save', 'reconnect', 'download-all-data', 'delete-selected-data', 'reset-cursor']);

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

const downloadAllData = () => {
  emit('download-all-data', { ...downloadSelection.value });
};

const deleteSelectedData = () => {
  emit('delete-selected-data', { ...deleteSelection.value });
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

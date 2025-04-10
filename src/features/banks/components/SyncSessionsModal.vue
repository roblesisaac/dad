<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Sync History"
    size="lg"
    @close="closeModal"
  >
    <template #header>
      <div class="flex items-center justify-between flex-1">
        <h3 class="text-xl font-semibold">{{ bank.institutionName || 'Bank Details' }}</h3>
        <button 
          @click="handleSync"
          :disabled="isSyncing"
          :class="[
            'inline-flex items-center px-4 py-2 border rounded-md font-medium focus:outline-none',
            isSyncing ? 
              'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed' : 
              'border-blue-500 text-white bg-blue-500 hover:bg-blue-600'
          ]"
        >
          <span v-if="isSyncing">Syncing...</span>
          <span v-else>Sync Now</span>
        </button>
      </div>
    </template>
    
    <template #content>
      <!-- Show sync error notification if present -->
      <div v-if="error.sync" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div class="flex items-start">
          <div class="flex-shrink-0 mt-0.5">
            <AlertTriangle class="h-5 w-5 text-red-500" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Sync Error</h3>
            <div class="mt-1 text-sm text-red-700">
              <p>{{ error.sync }}</p>
            </div>
            <div class="mt-2">
              <button 
                v-if="!requiresReconnect"
                @click="handleSync" 
                class="inline-flex items-center px-2 py-1 border border-red-600 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none"
              >
                Retry Sync
              </button>
              <button 
                v-else
                @click="handleReconnectBank" 
                class="inline-flex items-center px-2 py-1 border border-black text-xs font-medium rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-gray-50 focus:outline-none"
              >
                <RefreshCw class="h-3 w-3 mr-1" />
                Reconnect Bank
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Show special login required notification -->
      <div v-if="requiresReconnect && !error.sync" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div class="flex items-start">
          <div class="flex-shrink-0 mt-0.5">
            <AlertTriangle class="h-5 w-5 text-yellow-500" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Reconnection Required</h3>
            <div class="mt-1 text-sm text-yellow-700">
              <p v-if="syncProgress?.errorCode === 'INVALID_CREDENTIALS'">
                Your login credentials may have changed. Please reconnect your bank account with your updated credentials.
              </p>
              <p v-else-if="syncProgress?.errorCode === 'INVALID_MFA'">
                Additional authentication is required by your bank. Please reconnect to complete the authentication process.
              </p>
              <p v-else-if="syncProgress?.errorCode === 'ITEM_LOCKED'">
                Your account is temporarily locked. Please reconnect your bank to resolve this issue.
              </p>
              <p v-else-if="syncProgress?.errorCode === 'USER_SETUP_REQUIRED'">
                Your bank requires additional setup for this account. Please reconnect to complete the setup process.
              </p>
              <p v-else>
                Your bank connection needs to be updated. This usually happens when your credentials have changed or additional authentication is required.
              </p>
            </div>
            <div class="mt-2">
              <button 
                @click="handleReconnectBank" 
                class="inline-flex items-center px-2 py-1 border border-black text-xs font-medium rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-gray-50 focus:outline-none"
              >
                <RefreshCw class="h-3 w-3 mr-1" />
                Reconnect Bank
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Show sync progress if syncing -->
      <div v-if="isSyncing && syncProgress" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div class="flex items-start">
          <div class="flex-shrink-0 mt-0.5">
            <RefreshCw class="h-5 w-5 text-blue-500 animate-spin" />
          </div>
          <div class="ml-3 w-full">
            <h3 class="text-sm font-medium text-blue-800">Sync in Progress</h3>
            <div class="mt-1 text-sm text-blue-700">
              <p>Added: {{ syncProgress.added || 0 }} | Modified: {{ syncProgress.modified || 0 }} | Removed: {{ syncProgress.removed || 0 }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <SyncSessionList
        :sync-sessions="syncSessions"
        :current-sync-id="bank.sync_id"
        :loading="loading.syncSessions"
        :error="error.syncSessions"
        :format-sync-date="formatSyncDate"
        @refresh="handleRefresh"
        @sync="handleSync"
        @revert-to-session="handleRevertToSession"
        @continue-without-recovery="handleContinueWithoutRecovery"
      />
    </template>
  </BaseModal>
</template>

<script setup>
import { watch, ref, onUnmounted } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import BaseModal from '@/shared/components/BaseModal.vue';
import SyncSessionList from './SyncSessionList.vue';
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  bank: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close']);

// Use the banks composable for all functionality
const {
  syncSessions,
  loading,
  error,
  isSyncing,
  syncProgress,
  fetchSyncSessions,
  syncSelectedBank,
  revertToSession,
  formatSyncDate,
  continueWithoutRecovery,
  requiresReconnect,
  handleReconnectBank,
} = useBanks();

// Setup polling for updates during sync
const pollingInterval = ref(null);
const POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds

// Watch for sync status changes
watch(isSyncing, (newVal) => {
  if (newVal) {
    // Start polling when syncing begins
    startPolling();
  } else {
    // Stop polling when sync finishes
    stopPolling();
  }
});

// Start polling for sync session updates
const startPolling = () => {
  if (!pollingInterval.value) {
    pollingInterval.value = setInterval(() => {
      if (props.bank?.itemId) {
        fetchSyncSessions(props.bank.itemId);
      }
    }, POLLING_INTERVAL_MS);
  }
};

// Stop polling
const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
    pollingInterval.value = null;
  }
};

// Watch for bank changes or modal opening to fetch sessions
watch(() => [props.isOpen, props.bank], async ([isOpen, bank]) => {
  if (isOpen && bank?.itemId) {
    await fetchSyncSessions(bank.itemId);
    
    // If already syncing, start polling
    if (isSyncing.value) {
      startPolling();
    }
  } else {
    // Stop polling when modal closes
    stopPolling();
  }
}, { immediate: true });

// Clean up on unmount
onUnmounted(() => {
  stopPolling();
});

const closeModal = () => {
  stopPolling();
  emit('close');
};

/**
 * Handle sync action
 */
const handleSync = async () => {
  // Start polling immediately when sync is triggered
  startPolling();
  
  const result = await syncSelectedBank();
  
  // If sync completed or errored, we'll get fresh sessions in syncSelectedBank
  // so no need to fetch sessions again
  
  // If sync failed, stop polling
  if (result && !result.completed) {
    stopPolling();
  }
};

/**
 * Handle refresh action
 */
const handleRefresh = async () => {
  if (props.bank?.itemId) {
    await fetchSyncSessions(props.bank.itemId);
  }
};

/**
 * Handle revert to session action
 */
const handleRevertToSession = async (session) => {
  await revertToSession(session);
};

/**
 * Handle continue without recovery action
 */
const handleContinueWithoutRecovery = async (session) => {
  await continueWithoutRecovery(session);
};
</script> 
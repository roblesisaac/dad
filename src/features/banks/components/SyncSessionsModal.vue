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
                @click="handleSync" 
                class="inline-flex items-center px-2 py-1 border border-red-600 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none"
              >
                Retry Sync
              </button>
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
import { watch } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import BaseModal from '@/shared/components/BaseModal.vue';
import SyncSessionList from './SyncSessionList.vue';
import { AlertTriangle } from 'lucide-vue-next';

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
  fetchSyncSessions,
  syncSelectedBank,
  revertToSession,
  formatSyncDate,
  continueWithoutRecovery,
} = useBanks();

// Watch for bank changes or modal opening to fetch sessions
watch(() => [props.isOpen, props.bank], async ([isOpen, bank]) => {
  if (isOpen && bank?.itemId) {
    await fetchSyncSessions(bank.itemId);
  }
}, { immediate: true });

const closeModal = () => {
  emit('close');
};

/**
 * Handle sync action
 */
const handleSync = async () => {
  const result = await syncSelectedBank();
  
  // If sync completed successfully, refresh sessions list
  if (result && result.completed) {
    await fetchSyncSessions(props.bank.itemId);
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
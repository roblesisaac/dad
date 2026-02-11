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
      <SyncSessionList
        :sync-sessions="syncSessions"
        :current-sync-id="bank.sync_id"
        :loading="loading.syncSessions"
        :error="error.syncSessions"
        :format-sync-date="formatSyncDate"
        :loading-more="loadingMoreSessions"
        :has-more="hasMoreSyncSessions"
        @refresh="handleRefresh"
        @sync="handleSync"
        @revert-to-session="handleRevertToSession"
        @load-more="handleLoadMore"
      />
    </template>
  </BaseModal>
</template>

<script setup>
import { watch } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import BaseModal from '@/shared/components/BaseModal.vue';
import SyncSessionList from './SyncSessionList.vue';

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

const emit = defineEmits(['close', 'data-changed']);

// Use the banks composable for all functionality
const {
  syncSessions,
  loading,
  error,
  isSyncing,
  loadingMoreSessions,
  hasMoreSyncSessions,
  fetchSyncSessions,
  fetchMoreSyncSessions,
  syncSelectedBank,
  revertToSession,
  formatSyncDate,
  selectBank
} = useBanks();

// Watch for bank changes or modal opening to fetch sessions
watch(() => [props.isOpen, props.bank], async ([isOpen, bank]) => {
  if (isOpen && bank?.itemId) {
    // Set the selected bank in the useBanks composable
    await selectBank(bank);
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
  if (result?.completed) {
    emit('data-changed');
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
  const result = await revertToSession(session);
  if (result?.success) {
    emit('data-changed');
  }
};

/**
 * Handle load more sessions (infinite scroll)
 */
const handleLoadMore = async () => {
  if (props.bank?.itemId) {
    await fetchMoreSyncSessions(props.bank.itemId);
  }
};
</script> 
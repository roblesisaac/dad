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
        :loading="loading"
        :error="error"
        :format-sync-date="formatSyncDate"
        @refresh="handleRefresh"
        @sync="handleSync"
        @revert-to-session="handleRevertToSession"
      />
    </template>
  </BaseModal>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
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
  },
  syncSessions: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  isSyncing: {
    type: Boolean,
    default: false
  },
  formatSyncDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['close', 'sync', 'refresh', 'revert-to-session']);

const closeModal = () => {
  emit('close');
};

const handleSync = () => {
  emit('sync');
};

const handleRefresh = () => {
  emit('refresh');
};

const handleRevertToSession = (session) => {
  emit('revert-to-session', session);
};
</script> 
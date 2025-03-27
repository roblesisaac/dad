<template>
  <div class="bank-detail">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">{{ selectedBank.institutionName }}</h2>
      
      <div class="flex space-x-2">
        <button 
          @click="syncSelectedBank"
          class="px-3 py-1 bg-blue-600 text-white rounded flex items-center space-x-1"
          :disabled="isSyncing"
          :class="{ 'opacity-70 cursor-not-allowed': isSyncing }"
        >
          <span v-if="isSyncing">
            <span class="spinner"></span>
            Syncing... {{ formatSyncProgress }}
          </span>
          <span v-else>Sync Transactions</span>
        </button>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <h3 class="text-lg font-medium mb-3">Bank Information</h3>
        
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-500">Status:</span>
            <span :class="getBankStatusClass(selectedBank)">
              {{ getBankStatusText(selectedBank) }}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-500">Plaid Item ID:</span>
            <span class="font-mono text-sm">{{ selectedBank.itemId.substring(0, 12) }}...</span>
          </div>
        </div>
      </div>
      
      <!-- New Performance Metrics Component -->
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <SyncPerformanceMetrics 
          :syncMetrics="syncMetrics"
          :formatDuration="formatDuration"
        />
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
      <h3 class="text-lg font-medium mb-3">Sync Sessions</h3>
      
      <SyncSessionList
        :syncSessions="syncSessions"
        :loading="loading.syncSessions"
        :error="error.syncSessions"
        :formatSyncDate="formatSyncDate"
        :formatDuration="formatDuration"
        @revert="revertToSession"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBanks } from '../composables/useBanks';
import SyncPerformanceMetrics from './SyncPerformanceMetrics.vue';
import SyncSessionList from './SyncSessionList.vue';

const {
  selectedBank,
  syncSessions,
  syncMetrics,
  loading,
  error,
  isSyncing,
  syncProgress,
  
  formatSyncDate,
  formatDuration,
  getBankStatusClass,
  getBankStatusText,
  syncSelectedBank,
  revertToSession
} = useBanks();

const formatSyncProgress = computed(() => {
  if (!syncProgress.value) return '';
  return `${Math.round(syncProgress.value * 100)}%`;
});
</script> 
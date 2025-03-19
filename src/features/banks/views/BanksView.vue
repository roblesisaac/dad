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
      <div class="bg-white rounded-md shadow-md border border-gray-200 p-4">
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
        />
      </div>
    </div>
    
    <!-- Sync Sessions Modal -->
    <SyncSessionsModal
      :is-open="isSyncSessionsModalOpen"
      :bank="selectedBank"
      :sync-sessions="syncSessions"
      :loading="loading.syncSessions"
      :error="error.syncSessions"
      :is-syncing="isSyncing"
      :format-sync-date="formatSyncDate"
      @close="closeSyncSessionsModal"
      @sync="handleSyncSelectedBank"
      @refresh="handleRefreshSyncSessions"
      @revert-to-session="handleRevertToSession"
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
import { ref, onMounted, watch } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import BankList from '../components/BankList.vue';
import SyncSessionsModal from '../components/SyncSessionsModal.vue';
import { CheckCircle, AlertCircle } from 'lucide-vue-next';

const emit = defineEmits(['connect-bank-complete']);

// Setup composable
const {
  banks,
  selectedBank,
  syncSessions,
  loading,
  error,
  isSyncing,
  fetchBanks,
  fetchSyncSessions,
  selectBank,
  syncSelectedBank,
  revertToSession,
  formatSyncDate,
  getBankStatusClass,
  getBankStatusText
} = useBanks();

// Local state
const notification = ref({
  show: false,
  message: '',
  type: 'success', // 'success' or 'error'
  timeout: null
});

const isSyncSessionsModalOpen = ref(false);

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
  await selectBank(bank);
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

const handleSyncBank = async (bank) => {
  await selectBank(bank);
  isSyncSessionsModalOpen.value = true;
  await handleSyncSelectedBank();
};

const handleSyncSelectedBank = async () => {
  const result = await syncSelectedBank();
  
  if (result && result.completed) {
    showNotification(`Sync completed successfully. Added ${result.stats.added} transactions.`);
  } else if (result && result.error) {
    showNotification(`Sync failed: ${result.error}`, 'error');
  }
};

const handleRefreshSyncSessions = async () => {
  if (selectedBank.value && selectedBank.value.itemId) {
    await fetchSyncSessions(selectedBank.value.itemId);
  }
};

const handleRevertToSession = async (session) => {
  const result = await revertToSession(session);
  
  if (result && result.success) {
    showNotification(`Successfully reverted to previous sync. ${result.removedCount} transactions removed.`);
  } else if (result && result.error) {
    showNotification(`Reversion failed: ${result.error}`, 'error');
  }
};

// Clean up on unmount
watch(() => notification.value.timeout, (newTimeout, oldTimeout) => {
  if (oldTimeout) {
    clearTimeout(oldTimeout);
  }
});
</script> 
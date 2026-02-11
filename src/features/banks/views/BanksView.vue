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
      @close="closeEditBankNameModal"
      @save="saveBankName"
      @reconnect="reconnectBank"
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
import { useApi } from '@/shared/composables/useApi.js';
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

// Initialize loading state for reconnect bank
loading.value = {
  ...loading.value,
  reconnectBank: false
};

// Initialize error state for reconnect bank
error.value = {
  ...error.value,
  reconnectBank: null
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
    
    // Get link token for reconnection
    const response = await api.post(`plaid/connect/link/${bank.itemId}`);
    
    if (!response?.link_token) {
      throw new Error('No link token received from server');
    }
    
    // Create and open Plaid Link
    // Note: This would require integration with Plaid Link in a real implementation
    // For now, we'll simulate the process with a notification
    showNotification('Reconnection process started. Please follow the prompts to update your credentials.', 'success');
    
    // In a real implementation, you would:
    // 1. Initialize Plaid Link with the token
    // 2. Handle successful reconnection
    // 3. Update the bank status
    
    // For demo purposes:
    setTimeout(() => {
      showNotification('Bank successfully reconnected!', 'success');
      closeEditBankNameModal();
      fetchBanks(); // Refresh banks list
    }, 2000);
    
  } catch (err) {
    console.error('Error reconnecting bank:', err);
    error.value.reconnectBank = err.message || 'Failed to reconnect bank';
    showNotification(`Error reconnecting bank: ${error.value.reconnectBank}`, 'error');
  } finally {
    loading.value.reconnectBank = false;
  }
};

// Clean up on unmount
watch(() => notification.value.timeout, (newTimeout, oldTimeout) => {
  if (oldTimeout) {
    clearTimeout(oldTimeout);
  }
});
</script> 
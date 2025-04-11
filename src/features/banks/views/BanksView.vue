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
    />
    
    <!-- Edit Bank Name Modal -->
    <EditBank
      :is-open="isEditBankNameModalOpen"
      :bank="bankToEdit"
      :is-saving="loading.editingBank"
      :is-reconnecting="loading.isReconnectingBank"
      :is-rotating-token="loading.isRotatingToken"
      @close="closeEditBankNameModal"
      @save="saveBankName"
      @reconnect="handleReconnectBank"
      @rotate-token="handleRotateToken"
    />
    
    <!-- Loading Indicator (only for link token creation) -->
    <div v-if="loading.linkToken" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white p-6 rounded-md shadow-lg flex flex-col items-center">
        <div class="loader mb-4"></div>
        <p class="text-gray-700">Connecting to your bank...</p>
      </div>
    </div>
    
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
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useBanks } from '../composables/useBanks.js';
import { usePlaidLink } from '@/features/onboarding/composables/usePlaidLink.js';
import BankList from '../components/BankList.vue';
import SyncSessionsModal from '../components/SyncSessionsModal.vue';
import EditBank from '../components/EditBank.vue';
import { CheckCircle, AlertCircle } from 'lucide-vue-next';

const emit = defineEmits(['connect-bank-complete']);
const { createLinkToken, exchangePublicToken, openPlaidLink, loading: plaidLoading, error: plaidError } = usePlaidLink();

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
  handleReconnectBank,
  updateBankName,
  rotateAccessToken
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
const currentPlaidHandler = ref(null);
const reconnectingItemId = ref(null);

// Initialize loading state
loading.value = {
  ...loading.value,
  isReconnectingBank: false,
  linkToken: false,
  isRotatingToken: false
};

// Initialize error state
error.value = {
  ...error.value,
  isReconnectingBank: null,
  linkToken: null,
  rotateToken: null
};

// Watch for changes in plaid loading and error states
watch(() => plaidLoading.value, (newVal) => {
  loading.value.linkToken = newVal;
});

watch(() => plaidError.value, (newVal) => {
  if (newVal) {
    error.value.linkToken = newVal;
    showNotification(`Error: ${newVal}`, 'error');
  }
});

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

// Clean up Plaid Link handler if it exists
const cleanupPlaidHandler = () => {
  if (currentPlaidHandler.value) {
    try {
      currentPlaidHandler.value.destroy();
      currentPlaidHandler.value = null;
    } catch (e) {
      console.error('Error destroying Plaid Link handler:', e);
    }
  }
};

// Event handlers
const handleSelectBank = async (bank) => {
  selectBank(bank);
  isSyncSessionsModalOpen.value = true;
};

const closeSyncSessionsModal = () => {
  isSyncSessionsModalOpen.value = false;
};

const handleConnectBank = async () => {
  try {
    // Cleanup any existing Plaid handler
    cleanupPlaidHandler();
    
    // Get a new link token for bank connection
    const token = await createLinkToken();
    
    // Open Plaid Link directly
    currentPlaidHandler.value = await openPlaidLink(token, {
      onSuccess: handlePlaidSuccess,
      onExit: handlePlaidExit,
      onError: handlePlaidError
    });
    
  } catch (err) {
    console.error('Error initiating bank connection:', err);
    showNotification(`Error: ${err.message || 'Failed to start bank connection'}`, 'error');
    emit('connect-bank-complete', { success: false });
  }
};

const handlePlaidSuccess = async (publicToken, metadata) => {
  try {    
    if (!publicToken) {
      throw new Error('No public token received from Plaid');
    }
    
    // Exchange the public token for an access token
    await exchangePublicToken({ 
      publicToken, 
      metadata,
      itemId: reconnectingItemId.value
    });
    
    // Refresh the banks list
    await fetchBanks();
    
    // Close edit modal if it was open (for reconnection flow)
    if (isEditBankNameModalOpen.value) {
      closeEditBankNameModal();
    }
    
    // Show success notification
    const actionType = reconnectingItemId.value ? 'reconnected' : 'connected';
    showNotification(`Bank successfully ${actionType}!`, 'success');
    
    // Reset reconnection state
    reconnectingItemId.value = null;
    
    emit('connect-bank-complete', { success: true });
  } catch (err) {
    console.error('Error exchanging token:', err);
    showNotification(`Failed to complete bank connection: ${err.message || 'Unknown error'}`, 'error');
    emit('connect-bank-complete', { success: false, error: err });
  } finally {
    cleanupPlaidHandler();
  }
};

const handlePlaidExit = (metadata) => {
  console.log('Plaid connection exited:', metadata);
  cleanupPlaidHandler();
  emit('connect-bank-complete', { success: false, cancelled: true });
};

const handlePlaidError = (error) => {
  console.error('Plaid error:', error);
  showNotification(`Error connecting to bank: ${error.error_message || error.message || 'Unknown error'}`, 'error');
  cleanupPlaidHandler();
  emit('connect-bank-complete', { success: false, error });
};

const handleSyncBank = async () => {
  isSyncSessionsModalOpen.value = true;
};

const handleEditBankName = (bank) => {
  selectBank(bank);
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
    } else if (error.value.editingBank) {
      showNotification(`Failed to update bank name: ${error.value.editingBank}`, 'error');
    }
  } catch (err) {
    console.error('Error saving bank name:', err);
    showNotification(`Error: ${err.message || 'Unknown error'}`, 'error');
  }
};

const handleRotateToken = async (bank) => {
  if (!bank?.itemId) return;
  
  loading.value.isRotatingToken = true;
  error.value.rotateToken = null;
  
  try {
    const result = await rotateAccessToken(bank);
    
    if (result.success) {
      showNotification('Access token successfully renewed');
      closeEditBankNameModal();
    } else {
      error.value.rotateToken = result.error;
      showNotification(`Failed to renew access token: ${result.error}`, 'error');
    }
  } catch (err) {
    console.error('Error rotating token:', err);
    error.value.rotateToken = err.message;
    showNotification(`Error: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    loading.value.isRotatingToken = false;
  }
};

// Clean up on unmount
watch(() => notification.value.timeout, (_, oldTimeout) => {
  if (oldTimeout) {
    clearTimeout(oldTimeout);
  }
});

onBeforeUnmount(() => {
  cleanupPlaidHandler();
  reconnectingItemId.value = null;
});
</script>

<style scoped>
.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #3498db;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 
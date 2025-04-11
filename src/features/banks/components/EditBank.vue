<template>
  <BaseModal 
    :is-open="isOpen" 
    :title="modalTitle"
    @close="$emit('close')"
  >
    <template #content>
      <div class="p-4">
        <div class="mb-4">
          <label for="bank-name" class="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
          <input 
            type="text" 
            id="bank-name" 
            v-model="bankName" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bank name"
          />
        </div>
        
        <!-- Bank status info -->
        <div v-if="bank && bank.status === 'error'" class="my-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-red-700 text-sm mb-2">
            <AlertCircle class="h-4 w-4 inline mr-1" />
            This bank connection needs to be updated.
          </p>
          <p class="text-sm text-gray-700">
            Your login credentials might have changed or additional authentication may be required.
          </p>
        </div>
        
        <div class="flex flex-col space-y-4 mt-6">
          <!-- Save name button -->
          <button 
            @click="saveBankName" 
            class="w-full px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            :disabled="!bankName.trim() || isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save Name' }}
          </button>
          
          <!-- Reconnect bank button -->
          <button 
            @click="handleReconnectBank" 
            class="w-full flex items-center justify-center px-4 py-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none"
            :disabled="isReconnecting"
          >
            <RefreshCcw v-if="!isReconnecting" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isReconnecting ? 'Reconnecting...' : 'Reconnect Bank' }}
          </button>
          
          <!-- Rotate access token button -->
          <button 
            @click="showRotateConfirm = true" 
            class="w-full flex items-center justify-center px-4 py-2 border border-orange-400 rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none"
            :disabled="isRotatingToken"
          >
            <KeySquare v-if="!isRotatingToken" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isRotatingToken ? 'Renewing...' : 'Renew Access Token' }}
          </button>
          
          <!-- Confirmation dialog for token rotation -->
          <dialog 
            :open="showRotateConfirm" 
            class="fixed inset-0 z-10 overflow-y-auto"
          >
            <div class="fixed inset-0 bg-black bg-opacity-30" @click="showRotateConfirm = false"></div>
            <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-md mx-auto shadow-xl z-20">
              <h3 class="text-lg font-medium text-gray-900">Confirm Token Renewal</h3>
              <p class="mt-2 mb-4 text-sm text-gray-500">
                This will invalidate the current access token and create a new one. This action is useful if you suspect the token has been compromised.
              </p>
              <div class="mt-4 flex space-x-3 justify-end">
                <button 
                  @click="showRotateConfirm = false" 
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button 
                  @click="handleRotateToken" 
                  class="px-4 py-2 border border-transparent rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                >
                  Confirm Renewal
                </button>
              </div>
            </div>
          </dialog>
          
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
            class="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { RefreshCcw, AlertCircle, Loader, KeySquare } from 'lucide-vue-next';

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
  isRotatingToken: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save', 'reconnect', 'rotate-token']);

const bankName = ref('');
const showRotateConfirm = ref(false);
const modalTitle = computed(() => {
  if (props.bank?.status === 'error') {
    return 'Bank Connection Issue';
  }
  return 'Edit Bank Details';
});

// Initialize bank name when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.bank) {
    bankName.value = props.bank.institutionName || '';
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

const handleReconnectBank = () => {
  if (props.bank?.itemId) {
    emit('reconnect', props.bank);
  }
};

// Handle token rotation with confirmation
const handleRotateToken = () => {
  if (props.bank?.itemId) {
    showRotateConfirm.value = false;
    emit('rotate-token', props.bank);
  }
};

// Placeholder for future implementation
// const disconnectBank = () => {
//   if (props.bank?.itemId) {
//     emit('disconnect', props.bank);
//   }
// };
</script> 
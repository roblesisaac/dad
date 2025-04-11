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
        
        <!-- Username change info box -->
        <div v-if="showUsernameChangeInfo" class="my-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-blue-700 text-sm mb-2">
            <InfoIcon class="h-4 w-4 inline mr-1" />
            Need to update your username?
          </p>
          <p class="text-sm text-gray-700 mb-2">
            If you've changed your username at the bank, you'll need to remove and re-link your account to update it.
          </p>
          <p class="text-xs text-gray-600">
            Don't worry - we'll preserve your transaction history and sync position.
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
          
          <!-- Remove and Re-link button for username changes -->
          <button 
            @click="handleRemoveAndRelink" 
            class="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
            :disabled="isUnlinking"
          >
            <KeyIcon v-if="!isUnlinking" class="h-4 w-4 mr-2" />
            <Loader v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isUnlinking ? 'Processing...' : 'Update Username (Remove & Re-link)' }}
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
import { RefreshCcw, AlertCircle, Loader, Key as KeyIcon, Info as InfoIcon } from 'lucide-vue-next';

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
  isUnlinking: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save', 'reconnect', 'unlink-relink']);

const bankName = ref('');
const showUsernameChangeInfo = ref(true);

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

const handleRemoveAndRelink = () => {
  if (props.bank?.itemId) {
    emit('unlink-relink', props.bank);
  }
};

// Placeholder for future implementation
// const disconnectBank = () => {
//   if (props.bank?.itemId) {
//     emit('disconnect', props.bank);
//   }
// };
</script> 
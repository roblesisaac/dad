<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Edit Bank Name"
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
        
        <div class="flex justify-end space-x-2 mt-6">
          <button 
            @click="$emit('close')" 
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button 
            @click="saveBankName" 
            class="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            :disabled="!bankName.trim() || isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';

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
  }
});

const emit = defineEmits(['close', 'save']);

const bankName = ref('');

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
</script> 
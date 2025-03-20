<template>
  <BaseModal 
    :is-open="isOpen"
    title="Confirm Reversion"
    @close="cancel"
  >
    <template #content>
      <div class="p-4">
        <div class="text-red-500 mb-4">
          <AlertTriangle class="h-12 w-12 mx-auto mb-2" />
          <p class="text-center text-xl font-bold">Warning: This action cannot be undone</p>
        </div>
        
        <p class="mb-4">
          You are about to revert to the sync session from 
          <strong>{{ formatSyncDate(session?.syncTime) }}</strong>.
        </p>
        
        <p class="mb-4">
          This will remove all transactions that were added after this session. 
          Any transactions that were modified or categorized after this point 
          will be reverted to their previous state.
        </p>
        
        <div class="flex justify-end space-x-2 mt-6">
          <button 
            @click="cancel" 
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button 
            @click="confirm" 
            class="px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
          >
            Revert
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  session: {
    type: Object,
    default: null
  },
  formatSyncDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const cancel = () => {
  emit('cancel');
};

const confirm = () => {
  emit('confirm', props.session);
};
</script> 
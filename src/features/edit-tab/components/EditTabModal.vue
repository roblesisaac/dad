<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Edit Tab"
    @close="closeModal"
  >
    <template #header>
      <h3 class="text-lg font-semibold text-gray-800">Edit Tab</h3>
    </template>
    
    <EditTab />
  </BaseModal>
</template>

<script setup>
import { defineEmits } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import EditTab from '@/features/edit-tab/views/EditTab.vue';

const emit = defineEmits(['close']);

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

// Close modal handler
const closeModal = () => {
  emit('close');
};
</script> 
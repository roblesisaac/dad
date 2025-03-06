<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Manage Tabs"
    @close="closeModal"
  >
    <template #header>
      <h3 class="text-lg font-semibold text-gray-800">Manage Tabs</h3>
    </template>
    
    <AllTabs 
      :in-modal="true"
      @tab-selected="handleTabSelected"
    />
  </BaseModal>
</template>

<style scoped>
/* Fix iOS Safari 100vh issues */
@supports (-webkit-touch-callout: none) {
  .fixed {
    height: -webkit-fill-available;
  }
}
</style>

<script setup>
import AllTabs from './AllTabs.vue';
import BaseModal from '@/shared/components/BaseModal.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'tab-selected']);

// Close modal handler
const closeModal = () => {
  emit('close');
};

// Handle tab selection and close modal
const handleTabSelected = (tab) => {
  emit('tab-selected', tab);
  closeModal();
};
</script> 
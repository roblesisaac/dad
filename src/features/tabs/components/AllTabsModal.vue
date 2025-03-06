<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Manage Tabs"
    @close="closeModal"
  >
    <template #header>
      <div class="flex items-center justify-between flex-1">
        <h3 class="text-lg font-semibold text-gray-800">Manage Tabs</h3>
        <button 
          @click="toggleEditMode" 
          class="p-1.5 rounded-md transition-colors"
          :class="isEditMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600'"
        >
          <Settings size="18" />
        </button>
      </div>
    </template>
    
    <AllTabs 
      :in-modal="true"
      :is-edit-mode="isEditMode"
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
import { ref } from 'vue';
import AllTabs from './AllTabs.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { Settings } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'tab-selected']);
const isEditMode = ref(false);

// Close modal handler
const closeModal = () => {
  // Reset edit mode when closing
  isEditMode.value = false;
  emit('close');
};

// Toggle edit mode
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

// Handle tab selection and close modal
const handleTabSelected = (tab) => {
  emit('tab-selected', tab);
  closeModal();
};
</script> 
<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Select Tab"
    @close="closeModal"
  >
    <template #header>
      <div class="flex items-center justify-between flex-1">
        <h3 class="text-lg font-semibold text-gray-800">Manage Tabs</h3>
        <button 
          @click="toggleEditMode" 
          class="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
          :class="isEditMode 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        >
          <Edit2 v-if="isEditMode" size="16" />
          <Settings v-else size="16" />
          {{ isEditMode ? 'Exit Edit Mode' : 'Edit Tabs' }}
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
import { Settings, Edit2 } from 'lucide-vue-next';

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
<template>
  <BaseModal 
    :is-open="isOpen" 
    :contentPadding="false"
    title="Select Tab"
    @close="closeModal"
  >
    <template #header>
      <div class="flex items-center justify-between flex-1 pr-2">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-black">Manage Tabs</h3>
        <button 
          @click="toggleEditMode" 
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border-2"
          :class="isEditMode 
            ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]' 
            : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-black hover:text-black'"
        >
          <Settings v-if="!isEditMode" size="14" />
          <Edit2 v-else size="14" />
          {{ isEditMode ? 'Exit Edit' : 'Edit' }}
        </button>
      </div>
    </template>
    
    <AllTabs 
      variant="modal"
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

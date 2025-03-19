<template>
  <BaseModal 
    :is-open="isOpen" 
    title="Select Group"
    @close="closeModal"
    :content-padding="false"
  >
    <template #header>
      <div class="flex items-center justify-between flex-1">
        <h3 class="text-lg font-semibold text-gray-800">Select Account</h3>
        <button 
          @click="toggleEditMode" 
          class="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-sm"
          :class="isEditMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600'"
        >
          <Settings size="18" /> 
          <span>{{ isEditMode ? 'Finished Reordering' : 'Reorder' }}</span>
        </button>
      </div>
    </template>
    
    <template #content>
      <SelectGroup @close="closeModal" :editMode="isEditMode" />
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import SelectGroup from '../views/SelectGroup.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { Settings } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const { state } = useDashboardState();
const isEditMode = ref(false);

// Close modal handler
const closeModal = () => {
  // Reset edit mode when closing
  isEditMode.value = false;
  emit('close');
};

// Toggle edit mode through the settings button
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

watch(() => state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});
</script> 
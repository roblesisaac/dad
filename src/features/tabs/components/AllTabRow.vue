<template>
  <div 
    class="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
    @click="selectTabAndGoBack(element)"
  >
    <div class="flex items-center justify-between px-4 py-3">
      <!-- Tab Info with Conditional Drag Handle -->
      <div class="flex items-center">
        <!-- Only show grip handles in edit mode -->
        <div v-if="isEnabled && isEditMode" class="handler-tab cursor-grab text-gray-400 mr-3" @mousedown.stop>
          <GripVertical size="16" />
        </div>
        
        <!-- Tab Info -->
        <div class="flex flex-col">
          <div class="flex items-center">
            <span class="font-medium text-gray-800">{{ element.tabName }}</span>
            <span v-if="element.total !== undefined" class="ml-2 text-sm" :class="fontColor(element.total)">
              {{ formatPrice(element.total, { toFixed: 2 }) }}
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {{ element.description || 'No description' }}
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center space-x-4">
        <!-- Only show edit button in edit mode -->
        <button 
          v-if="isEditMode"
          @click.stop="editTab(element._id)" 
          class="text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          <Edit2 size="16" />
        </button>
        
        <!-- Toggle Switch - always visible -->
        <div class="relative inline-block w-10 mr-2 align-middle select-none cursor-pointer" @click.stop>
          <input 
            :id="`toggle-${element._id}`" 
            type="checkbox" 
            :checked="isEnabled"
            @change="toggleTabVisibility(element._id)" 
            class="sr-only"
          />
          <label 
            :for="`toggle-${element._id}`" 
            class="block h-6 overflow-hidden rounded-full bg-gray-300 cursor-pointer"
          >
            <span 
              :class="isEnabled ? 'translate-x-4 bg-blue-600' : 'translate-x-0 bg-white'"
              class="absolute block w-6 h-6 rounded-full border border-gray-300 shadow transform transition-transform duration-200 ease-in"
            ></span>
          </label>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Edit Tab Modal -->
  <EditTabModal
    :is-open="showEditTabModal"
    @close="showEditTabModal = false"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { GripVertical, Edit2 } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '../composables/useTabs';
import EditTabModal from '@/features/edit-tab/components/EditTabModal.vue';

const router = useRouter();
const { fontColor, formatPrice } = useUtils();
const { state } = useDashboardState();
const { toggleTabForGroup, selectTab, updateTabSort } = useTabs();

// Add ref for edit tab modal
const showEditTabModal = ref(false);
const currentTabToEdit = ref(null);

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['tab-selected']);

// Determine if this tab is enabled for the current group
const isEnabled = computed(() => {
  const currentGroupId = state.selected.group?._id;
  if (!currentGroupId) return false;
  
  return props.element.showForGroup.includes(currentGroupId);
});

// Edit tab function - now opens modal instead of navigating
async function editTab(tabId) {
  // Handle tab selection before opening modal
  if (isEnabled.value) {
    // If tab is enabled, just select it
    await selectTab(props.element);
  } else {
    // If the tab is disabled, toggle it on first, then select it
    const currentGroupId = state.selected.group?._id;
    if (currentGroupId) {
      toggleTabForGroup(tabId, currentGroupId);
      
      // Short delay to allow the toggle to complete before selecting
      setTimeout(() => {
        selectTab(props.element);
      }, 100);
    }
  }
  
  // Open edit modal
  currentTabToEdit.value = props.element;
  showEditTabModal.value = true;
}

// Select the tab and go back to dashboard
function selectTabAndGoBack(tab) {
  if (isEnabled.value) {
    selectTab(tab);
    emit('tab-selected', tab);
  } else {
    // If the tab is disabled, toggle it on first, then select it
    const currentGroupId = state.selected.group?._id;
    if (currentGroupId) {
      toggleTabForGroup(tab._id, currentGroupId);
      // Short delay to allow the toggle to complete before selecting
      setTimeout(() => {
        selectTab(tab);
        emit('tab-selected', tab);
      }, 100);
    }
  }
}

// Toggle tab for current group
function toggleTabVisibility(tabId) {
  const currentGroupId = state.selected.group?._id;
  if (!currentGroupId) return;
  
  // Call the toggleTabForGroup function from useTabs composable
  toggleTabForGroup(tabId, currentGroupId);
}

watch(() => props.element.sort, (newSort) => {
  updateTabSort(props.element._id, newSort);
});
</script>
<template>
<div 
  class="relative bg-white transition-all duration-300 w-full group shrink-0"
  @click.stop="!isEditMode && isEnabled && selectTabAndGoBack(element)"
  :class="[
    !isEditMode && isEnabled ? 'cursor-pointer hover:bg-gray-50/50' : 'opacity-60 grayscale',
    isActiveTab && !isEditMode ? 'bg-gray-50/30 active-z-index' : ''
  ]"
>
  <!-- Active Tab Indicator (Left Bar) -->
  <div v-if="isActiveTab && !isEditMode" class="absolute top-0 bottom-0 bg-black"></div>

  <div class="flex items-center justify-between py-5 w-full">
    <div class="flex items-center min-w-0 flex-1">
      <!-- Drag Handle -->
      <div v-if="isEditMode && isEnabled" class="handler-tab cursor-grab text-black mr-4" @mousedown.stop>
        <GripVertical size="18" />
      </div>
      
      <!-- Tab Info -->
      <div class="flex flex-col min-w-0">
        <h3 class="text-base font-black text-gray-900 truncate uppercase tracking-tight">
          {{ element.tabName }}
        </h3>
        <div v-if="element.description" class="text-[10px] font-black text-black uppercase tracking-widest mt-1 truncate">
          {{ element.description }}
        </div>
      </div>
    </div>
    
    <!-- Right side: Total & Actions -->
    <div class="flex items-center gap-4 ml-4 shrink-0">
      <!-- Total Display -->
      <div v-if="element.total !== undefined && !isEditMode" class="text-right">
        <span class="text-base font-black tracking-tight" :class="fontColor(element.total)">
          {{ formatPrice(element.total, { toFixed: 0 }) }}
        </span>
      </div>

      <!-- Edit/Toggle (Edit Mode) -->
      <div v-if="isEditMode || !isEnabled" class="flex items-center gap-3">
        <button 
          v-if="isEnabled"
          @click.stop="editTab(element._id)" 
          class="p-2 rounded-xl text-black hover:text-black hover:bg-gray-50 transition-colors"
          title="Edit tab rules"
        >
          <Settings size="16" />
        </button>
        
        <div @click.stop>
          <Switch 
            :model-value="isEnabled"
            :id="`toggle-${element._id}`"
            @update:model-value="toggleTabVisibility(element._id)"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Rule Manager Modal -->
  <RuleManagerModal
    :is-open="showRuleManagerModal"
    @close="showRuleManagerModal = false"
  />
</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { GripVertical, Edit2, ChevronRight, Settings } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '../composables/useTabs';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';
import Switch from '@/shared/components/Switch.vue';

const { fontColor, formatPrice } = useUtils();
const { state } = useDashboardState();
const { toggleTabForGroup, selectTab, updateTabSort } = useTabs();

// Add ref for rule manager modal
const showRuleManagerModal = ref(false);
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

// Determine if this is the active tab
const isActiveTab = computed(() => {
  return state.selected.tab?._id === props.element._id;
});

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
  
  // Open rule manager modal
  currentTabToEdit.value = props.element;
  showRuleManagerModal.value = true;
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
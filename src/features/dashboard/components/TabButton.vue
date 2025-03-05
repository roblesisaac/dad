<template>
  <button 
    @click="selectTab(tab)" 
    :class="[
      'flex justify-between items-center h-10 px-3 text-left transition-all font-mono border-t border-l border-r',
      uniqueTabClassName,
      tabShouldExpand ? 'w-full' : 'min-w-[120px]',
      isSelected 
        ? 'bg-white border-gray-400 text-gray-800' 
        : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600',
    ]"
  >
    <!-- Title & Total -->
    <div class="flex flex-col overflow-hidden">
      <div class="flex items-center">
        <span class="uppercase text-xs text-gray-900 font-bold tracking-wide truncate max-w-[100px]">{{ tab.tabName }}</span>
      </div>
      <LoadingDots v-if="state.isLoading" />
      <span v-else class="text-xs truncate" :class="[isSelected ? 'font-bold' : 'font-normal', fontColor(tab.total)]">{{ tabTotal }}</span>
    </div>

    <!-- Right side controls -->
    <div class="flex items-center ml-1.5">
      <!-- More Options -->
      <MoreVertical 
        v-if="isSelected" 
        @click.stop="editTab()" 
        class="w-4 h-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
      />
      
      <!-- Drag Handle -->
      <GripVertical 
        v-if="isSelected && shouldShowDragHandle" 
        class="w-4 h-4 text-gray-400 cursor-grab handleTab ml-1" 
      />
    </div>
  </button>
</template>

<script setup>
import { computed, watch } from 'vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { MoreVertical, GripVertical } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardTabs } from '../composables/useDashboardTabs';
import { useDashboardState } from '../composables/useDashboardState';

const { fontColor, formatPrice } = useUtils();
const props = defineProps({
  tab: {
    type: Object,
    required: true
  }
});

const { state } = useDashboardState();

// Get tab functionality from our new composable
const { 
  selectTab, 
  editTab, 
  isTabShared, 
  getUniqueTabClassName,
  updateTabSort 
} = useDashboardTabs();

// Get computed values
const uniqueTabClassName = computed(() => getUniqueTabClassName(props.tab._id));
const tabsForGroup = computed(() => state.selected.tabsForGroup);
const shouldShowDragHandle = computed(() => tabsForGroup.value.length > 1);
const tabShouldExpand = !shouldShowDragHandle.value;

const isSelected = computed(() => props.tab.isSelected);

const tabTotal = computed(() => {
  const total = props.tab.total || 0;
  const toFixed = isSelected.value ? 2 : 0;

  return formatPrice(total, { toFixed });
});

// Watch for sort changes and update via the composable
watch(() => props.tab.sort, (newSort) => {
  updateTabSort(props.tab._id, newSort);
});
</script>
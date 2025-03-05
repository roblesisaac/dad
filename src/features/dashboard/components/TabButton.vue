<template>
  <button 
    @click="selectTab(tab)" 
    :class="[
      'flex justify-between font-bold items-center h-[50px] pr-2.5 pl-0 text-left border-t border-r border-l border-gray-500 shadow-sm',
      fontColor(tab.total),
      uniqueTabClassName,
      tabShouldExpand ? 'w-full' : '',
      isSelected ? 'bg-white border-b-0 font-semibold rounded-t-md' : 'bg-gray-50 border-b border-gray-900 hover:bg-gray-100 transition-colors duration-200',
    ]"
  >
    <!-- More Options -->
    <MoreVertical v-if="isSelected" @click.stop="editTab()" class="ml-auto text-gray-500 hover:text-blue-600" />

    <!-- Title & Total -->
    <div :class="['flex flex-col pl-2.5 pr-[50px]', tabShouldExpand ? 'w-full' : '']">
      <div class="flex items-center">
        <span v-if="isTabShared(tab)" class="text-blue-600 mr-1">*</span>
        <span class="uppercase text-sm" :class="isSelected ? 'text-blue-800' : 'text-gray-700'">{{ tab.tabName }}</span>
      </div>
      <LoadingDots v-if="state.isLoading" />
      <span v-else class="font-normal" :class="isSelected ? 'text-gray-800' : 'text-gray-600'">{{ tabTotal }}</span>
    </div>

    <!-- Drag Handle -->
    <GripVertical v-if="isSelected && shouldShowDragHandle" class="mr-2 text-gray-400 handleTab" />
  </button>
</template>

<script setup>
import { computed, watch } from 'vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { MoreVertical, GripVertical } from 'lucide-vue-next';
import { fontColor, formatPrice } from '@/utils';
import { useDashboardTabs } from '../composables/useDashboardTabs';
import { useDashboardState } from '../composables/useDashboardState';

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
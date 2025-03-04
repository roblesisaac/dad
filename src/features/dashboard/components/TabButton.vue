<template>
  <button 
    @click="selectTab(props.tab)" 
    :class="['tab-button', fontColor(props.tab.total), uniqueTabClassName, borders, isSelectedClass, tabShouldExpand ? 'expandTab' : '']"
  >
    <!-- Dots -->
    <MoreVertical v-if="props.tab.isSelected" @click.stop="editTab()" />
  
    <!-- Title & Total -->
    <div :class="['title-total', tabShouldExpand ? 'expandTab' : '']">
      <small class="section-title bold"><b v-if="isTabShared(props.tab)">*</b>{{ props.tab.tabName }}</small>
      <LoadingDots v-if="state.isLoading" />
      <span v-else class="section-content">{{ tabTotal }}</span>
    </div>

    <!-- Drag Handle -->
    <GripVertical v-if="props.tab.isSelected && shouldShowDragHandle" class="handleTab" />    
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
const tabIndex = computed(() => tabsForGroup.value.findIndex(t => t._id === props.tab._id));
const shouldShowDragHandle = computed(() => tabsForGroup.value.length > 1);
const tabShouldExpand = !shouldShowDragHandle.value;

const isSelected = computed(() => props.tab.isSelected);
const isSelectedClass = computed(() => isSelected.value ? 'selected' : '');

const borders = computed(() => {
  const rightBorder = isLastInArray.value || isSelected.value ? '' : 'b-right';
  const bottomBorder = isSelected.value ? 'b-bottom-none' : 'b-bottom';
  const borderLeft = isPreviousTabSelected.value ? 'b-left' : '';

  return [bottomBorder, rightBorder, borderLeft];
});

const tabTotal = computed(() => {
  const total = props.tab.total || 0;
  const toFixed = isSelected.value ? 2 : 0;

  return formatPrice(total, { toFixed });
});

const isLastInArray = computed(() => tabIndex.value === tabsForGroup.value.length - 1);

const isPreviousTabSelected = computed(() => {
  const previousTab = tabsForGroup.value[tabIndex.value-1];
  return previousTab?.isSelected;
});

// Watch for sort changes and update via the composable
watch(() => props.tab.sort, (newSort) => {
  updateTabSort(props.tab._id, newSort);
});
</script>

<style>
.expandTab {
  width: 100%;
}

.tab-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
  padding: 0 10px 0 0;
  text-align: left;
  border-radius: 0 0 3px 3px;
}

.tab-button:hover,
.tab-button:active,
.tab-button:focus {
  outline: none;
}

.title-total {
  display: flex;
  flex-direction: column;
  padding-left: 10px;
  padding-right: 50px;
}

.section-title {
  text-transform: uppercase;
  font-weight: 900;
  color: #000
}

.handleTab {
  margin-right: auto;
}

.MoreVertical {
  margin-left: auto;
}
</style>
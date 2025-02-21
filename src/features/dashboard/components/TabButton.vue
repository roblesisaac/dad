<template>
  <button @click="selectTab(props.tab)" :class="['tab-button', fontColor(props.tab.total), uniqueTabClassName, borders, isSelectedClass, tabShouldExpand ? 'expandTab' : '']">
    <!-- Dots -->
    <MoreVertical v-if="tab.isSelected" @click="editTab()" />
  
    <!-- Title & Total -->
    <div :class="['title-total', tabShouldExpand ? 'expandTab' : '']">
      <small class="section-title bold"><b v-if="tabIsShared(tab)">*</b>{{ props.tab.tabName }}</small>
      <LoadingDots v-if="props.state.isLoading" />
      <span v-else class="section-content">{{ tabTotal }}</span>
    </div>

    <!-- Drag Handle -->
    <GripVertical v-if="tab.isSelected && shouldShowDragHandle" class="handleTab" />    
  </button>
</template>

<script setup>
import { computed, nextTick, watch } from 'vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { MoreVertical, GripVertical } from 'lucide-vue-next';
import { fontColor, formatPrice } from '@/utils';
import { useApi } from '@/shared/composables/useApi';

const api = useApi();
const props = defineProps({
  tab: 'object',
  state: 'object'
});

function validIdString(inputString) {
  return inputString.replace(/[:\-]/g, '_');
}

const uniqueTabClassName = computed(() => validIdString(props.tab._id));
const tabsForGroup = computed(() => props.state.selected.tabsForGroup);
const tabIndex = computed(() => tabsForGroup.value.findIndex(tab => tab._id === props.tab._id));
const shouldShowDragHandle = computed(() => tabsForGroup.value.length > 1);
const tabShouldExpand = !shouldShowDragHandle.value;

const isSelected = computed(() => {
  return props.tab.isSelected;
});

const isSelectedClass = computed(() => {
  return isSelected.value ? 'selected' : '';
});

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

function editTab() {
  props.state.views.push('EditTab');
}

function selectTab(tabToSelect) {
  if(tabToSelect.isSelected) {
    return 
  }

  const currentlySelectedTab = props.state.selected.tab;

  if(currentlySelectedTab) {
    currentlySelectedTab.isSelected = false;
    api.put(`tabs/${currentlySelectedTab._id}`, { isSelected: false });
  }

  nextTick(() => {
    tabToSelect.isSelected = true;
    api.put(`tabs/${tabToSelect._id}`, { isSelected: true });
  });
}

function tabIsShared(tab) {
  return tab.showForGroup.length > 1 || tab.showForGroup.includes('_GLOBAL')
}

watch(() => props.tab.sort, (newSort) => {
  api.put(`tabs/${props.tab._id}`, { sort: newSort });
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
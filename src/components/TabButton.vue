<template>
<div @click="selectTab(props.tab)" :class="borders" class="container">
  <div class="dots-container">
    <DotsVerticalCircleOutline v-if="tab.isSelected" class="dots" />
  </div>
  <div class="content text-left">
    <small class="section-title">{{ props.tab.tabName }}<span v-if="props.tab.showForGroup.length > 1">*</span></small>
    <br /><LoadingDots v-if="props.state.isLoading" />
    <a v-else href="#" class="section-content">{{ tabTotal }}</a>
  </div>
</div>
</template>

<script setup>
import { computed, nextTick } from 'vue';
import LoadingDots from './LoadingDots.vue';
import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
import { formatPrice } from '../utils';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();
const props = defineProps({
  tab: 'object',
  state: 'object',
  tabIndex: Number
});

const tabsForGroup = computed(() => props.state.selected.tabsForGroup);

const isSelected = computed(() => {
  return props.tab.isSelected;
});

const borders = computed(() => {
  const rightBorder = isLastInArray.value || isSelected.value ? '' : 'b-right';
  const bottomBorder = isSelected.value ? 'b-bottom-none' : 'b-bottom';
  const borderLeft = isPreviousTabSelected.value ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

const tabTotal = computed(() => {
  const total = props.tab.total || 0;
  const toFixed = isSelected.value ? 2 : 0;

  return formatPrice(total, { toFixed });
});

const isLastInArray = computed(() => props.tabIndex === tabsForGroup.value.length - 1);

const isPreviousTabSelected = computed(() => {
  const previousTab = tabsForGroup.value[props.tabIndex-1];

  return previousTab?.isSelected;
});

function selectTab(tabToSelect) {
  if(tabToSelect.isSelected) {
    return props.state.views.push('EditTab');
  }

  const currentlySelectedTab = props.state.selected.tab;

  if(currentlySelectedTab) {
    currentlySelectedTab.isSelected = false;
    api.put(`api/tabs/${currentlySelectedTab._id}`, { isSelected: false });
  }

  nextTick(() => {
    tabToSelect.isSelected = true;
    api.put(`api/tabs/${tabToSelect._id}`, { isSelected: true });
  });
}

</script>

<style>
.container {
  display: flex;
  align-items: center;
}

.dots-container {
  margin-right: 5px; /* Optional margin for space between dots and text */
}

.dots {
  float: left; /* Align the dots to the left */
}
/* .section {
  height: 50px;
} */

.section-title {
  padding-left: 5px;
  text-transform: uppercase;
  font-weight: 900;
}
.section-content {
  padding-left: 5px;
  color: blue;
  font-weight: 900;
}
</style>
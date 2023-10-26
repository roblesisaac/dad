<template>
  <div @click="selectTab(tab)" :class="['grid middle', borders]">
    <div v-if="tab.isSelected" class="cell-1-5">
      <DotsVerticalCircleOutline />
    </div>
    <div class="cell auto">
      <div class="relative pointer">
        <small class="section-title">
          {{ tab.tabName }}
        </small>
        <br/>
        <LoadingDots v-if="state.isLoading" />
        <span v-else href="#" class="section-content">{{ tabTotal }}</span>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, nextTick } from 'vue';
import LoadingDots from './LoadingDots.vue';
import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
import { formatPrice } from '../utils';

const { state, tab } = defineProps({
  tab: 'object',
  state: 'object'
});

const { selected } = state;
const { tabs } = selected.group;
const tabIndex = getIndex(tabs, { tabName: tab.tabName });

const borders = computed(() => {
  const rightBorder = isLastInArray() || isSelected(tab) ? '' : 'b-right';
  const bottomBorder = isSelected(tab) ? 'b-bottom-dashed' : 'b-bottom';
  const borderLeft = isPreviousSelected() ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

const tabTotal = computed(() => {
  const total = tab.total || 0;
  const toFixed = tab.isSelected ? 2 : 0;

  return formatPrice(total, { toFixed });
});

function editTab() {
  state.view = 'EditTab';
}

function isLastInArray() {
  return tabIndex === tabs.length - 1;
}

function isSelected(tab) {
  return selected.tab.tabName === tab.tabName;
}

function isPreviousSelected() {
  const previous = tabs[tabIndex-1];

  return previous && isSelected(previous);
}

function getIndex(array, criteria) {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    let isMatch = true;

    for (const key in criteria) {
      if (criteria.hasOwnProperty(key)) {
        if (item[key] !== criteria[key]) {
          isMatch = false;
          break;
        }
      }
    }

    if (isMatch) {
      return i;
    }
  }

  return -1;
}

function selectTab(tab) {
  if(tab.isSelected) {
    editTab();
    return;
  }

  state.selected.tab.isSelected = false;

  nextTick(() => {
    tab.isSelected = true;
    state.selected.tab = tab;
  });
}
</script>
<template>
  <div @click="selectTab(tab)" @dblclick="editTab()" class="relative pointer" :class="borders">
    <small class="section-title">
      {{ tab.tabName }}
    </small>
    <br/>
    <a href="#" class="section-content">{{ formatPrice(tabTotal) }}</a>
  </div>
</template>

<script setup>
import { computed, nextTick } from 'vue';
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
  return tab.total || 0;
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
  state.selected.tab.isSelected = false;

  nextTick(() => {
    tab.isSelected = true;
    state.selected.tab = tab;
  });
}
</script>
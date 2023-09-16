<template>
  <div @click="state.selectedTab.tabName=tabName" class="relative pointer" :class="borders">
    <small :class="[underline,'section-title']">
      {{ tabName }}
    </small>
    <br/>
    <a href="#" class="section-content">{{ tabTotal }}</a>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatPrice } from '../utils';

const { state, tabName } = defineProps({
  state: 'object',
  tabName: 'string'
});

const tabs = ['income', 'expenses', 'net'];

const borders = computed(() => {
  const rightBorder = isLastInArray(tabName) || isSelected(tabName) ? '' : 'b-right';
  const bottomBorder = isSelected(tabName) ? 'b-bottom-dashed' : 'b-bottom';
  const borderLeft = isPreviousSelected(tabName) ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

const tabTotal = computed(() => {
  return formatPrice(state.totals[tabName], {
    thousands: true,
    toFixed: 0
  });
});

const underline = computed(() => {
  return isSelected(tabName) ? 'underline' : '';
});

function isLastInArray(tabName) {
  return tabs.indexOf(tabName) === tabs.length - 1;
}

function isSelected(tabName) {
  return state.selectedTab.tabName === tabName;
}

function isPreviousSelected(tabName) {
  const currentIndex = tabs.indexOf(tabName);

  if(!currentIndex) {
    return;
  }

  const previous = tabs[currentIndex-1];

  return isSelected(previous);
}
</script>
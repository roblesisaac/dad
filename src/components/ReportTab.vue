<template>
  <div @click="state.selected.tab=name" class="relative pointer" :class="borders">
    <small :class="[underline,'section-title']">
      {{ name }}
    </small>
    <br/>
    <a href="#" class="section-content">$0.00</a>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const { state, name } = defineProps({
  state: 'object',
  name: 'string'
});

const tabs = ['income', 'expenses', 'net'];

const borders = computed(() => {
  const rightBorder = isLastInArray(name) || isSelected(name) ? '' : 'b-right';
  const bottomBorder = isSelected(name) ? '' : 'b-bottom';
  const borderLeft = isPreviousSelected(name) ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

const underline = computed(() => {
  return isSelected(name) ? 'underline' : '';
});

function isLastInArray(tabName) {
  return tabs.indexOf(tabName) === tabs.length - 1;
}

function isSelected(tabName) {
  return state.selected.tab === tabName;
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
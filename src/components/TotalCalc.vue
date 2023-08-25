<template>
  <div class="relative" :class="borders">
    <small class="section-title">
      {{ name }}
    </small>
    <br/>
    <a @click="state.selectedCalc=name" href="#" class="section-content">$0.00</a>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const { state, name } = defineProps({
  state: 'object',
  name: 'string'
});

const calcs = ['income', 'expenses', 'net'];

const borders = computed(() => {
  const rightBorder = isLastInArray(name) || isSelected(name) ? '' : 'b-right';
  const bottomBorder = isSelected(name) ? '' : 'b-bottom';
  const borderLeft = isPreviousSelected(name) ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

function isLastInArray(calcName) {
  return calcs.indexOf(calcName) === calcs.length - 1;
}

function isSelected(calcName) {
  return state.selectedCalc === calcName;
}

function isPreviousSelected(calcName) {
  const currentIndex = calcs.indexOf(calcName);

  if(!currentIndex) {
    return;
  }

  const previous = calcs[currentIndex-1];

  return isSelected(previous);
}
</script>
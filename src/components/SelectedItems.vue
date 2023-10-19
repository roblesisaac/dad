<template>
<div v-if="items.length" class="grid items">
  <div class="cell-1">
    <div class="grid bottom p10b" v-for="(item, i) in items">
      <div class="cell-19-24 left dottedBottom">
        <small class="colorDarkGreen">#{{ i+1 }}. {{ item.date }}</small>
        <br>{{  item.name }}  <span v-if="item.check_number?.length">#{{ item.check_number }}</span>
      </div>
      <div class="cell-5-24 p10l colorBlue right">
        {{ formatPrice(item.amount) }}
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { computed, defineProps } from 'vue';
import { formatPrice } from '../utils';

const { categoryName, state } = defineProps({
  categoryName: String,
  state: Object
});

const items = computed(() => {
  return state.selectedTab.items;
});
</script>

<style>
.items {
  font-weight: normal;
}
.dottedBottom {
  border-bottom: 1px dotted lightblue;
}
</style>
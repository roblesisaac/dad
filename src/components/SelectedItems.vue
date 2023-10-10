<template>
<div v-if="items.length" class="grid items">
  <div class="cell-1">
    <div class="grid p10b" v-for="item in items">
      <small class="cell-5-24">
        {{  item.date }}
      </small>
      <div class="cell-14-24 p10l">
        {{  item.name }}
      </div>
      <div class="cell-5-24 p10l">
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
  padding: 10px;
}
</style>
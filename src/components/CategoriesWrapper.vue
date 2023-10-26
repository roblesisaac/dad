<template>
  <CategoryDetails v-for="([categoryName, categoryItems, categoryTotal]) in tab.categorizedItems"
    :state="state"
    :categoryName="categoryName"
    :categoryItems="categoryItems"
    :categoryTotal="categoryTotal"
    :key="categoryName+tab.tabName"  
  />
</template>

<script setup>

import { computed, defineProps } from 'vue';
import CategoryDetails from './CategoryDetails.vue';

const { state } = defineProps({ state: Object });
const tab = computed(() => state.selected.tab);

</script>
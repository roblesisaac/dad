<template>
  <CategoryDetails v-for="(category, categoryName) in tab.categorizedItems"
    :state="state" 
    :category="category"
    :categoryName="categoryName"
    :key="categoryName+tab.tabName"  
  />
</template>

<script setup>

import { computed, defineProps } from 'vue';
import CategoryDetails from './CategoryDetails.vue';

const { state } = defineProps({ state: Object });
const tab = computed(() => state.selected.tab);

</script>
<template>
  <CategoryDetails v-for="([categoryName, categoryItems, categoryTotal]) in selectedTab.categorizedItems"
    :state="state"
    :categoryName="categoryName"
    :categoryItems="categoryItems"
    :categoryTotal="categoryTotal"
    :key="categoryName"  
  />
</template>

<script setup>
import CategoryDetails from './CategoryDetails.vue';
import { useDashboardState } from '../composables/useDashboardState';

const { state } = useDashboardState();
const selectedTab = state.selected.tab;

</script>
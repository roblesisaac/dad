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

import { defineProps } from 'vue';
import CategoryDetails from './CategoryDetails.vue';

const { state } = defineProps({ state: Object });
const selectedTab = state.selected.tab;

</script>
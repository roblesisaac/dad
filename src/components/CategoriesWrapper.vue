<template>
  <CategoryDetails v-for="(category, categoryName) in state.selected.tab.categorizedItems"
    :state="state" 
    :category="category"
    :categoryName="categoryName"
    :key="categoryName+state.selected.tab.tabName"  
  />
</template>

<script setup>
import { defineProps } from 'vue';
import CategoryDetails from './CategoryDetails.vue';

const { state } = defineProps({
  state: Object
});
</script>
<template>
  <div class="divide-y divide-gray-200">
    <CategoryDetails 
      v-for="([categoryName, categoryItems, categoryTotal]) in selectedTab.categorizedItems"
      :state="state"
      :categoryName="categoryName"
      :categoryItems="categoryItems"
      :categoryTotal="categoryTotal"
      :key="categoryName"  
    />
  </div>
</template>

<script setup>
import CategoryDetails from './CategoryDetails.vue';

const { state } = defineProps({ state: Object });
const selectedTab = state.selected.tab;
</script>
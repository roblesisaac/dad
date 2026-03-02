<template>
  <div class="w-full bg-white">
    <CategoryDetails
      v-for="[categoryName, categoryItems, categoryTotal] in categorizedItems"
      :key="categoryName"
      :category-name="categoryName"
      :category-items="categoryItems"
      :category-total="categoryTotal"
      @category-selected="handleCategorySelected"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CategoryDetails from './CategoryDetails.vue';
import { useDashboardState } from '../composables/useDashboardState';

const emit = defineEmits(['category-selected']);
const { state } = useDashboardState();

const categorizedItems = computed(() => state.selected.tab?.categorizedItems || []);

function handleCategorySelected(categoryName) {
  emit('category-selected', categoryName);
}
</script>

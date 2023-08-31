<template>
  <AccountCategory :state="state" :category="category" :categoryName="categoryName" v-for="(category, categoryName) in selectedTabData" :key="categoryName+state.selected.tab" />
</template>

<script setup>
import { computed, defineProps } from 'vue';
import AccountCategory from './AccountCategory.vue';

const { state } = defineProps({
  state: Object
});

const selectedTabData = computed(() => {
  return state.sorted[state.selected.tab];
});
</script>

<style>
</style>
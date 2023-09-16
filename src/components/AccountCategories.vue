<template>
  <AccountCategory :state="state" :category="category" :categoryName="categoryName" v-for="(category, categoryName) in selectedTabData" :key="categoryName+state.selectedTab.tabName" />
</template>

<script setup>
import { computed, defineProps } from 'vue';
import AccountCategory from './AccountCategory.vue';

const { state } = defineProps({
  state: Object
});

const selectedTabData = computed(() => {
  return state.sorted[state.selectedTab.tabName];
});
</script>

<style>
</style>
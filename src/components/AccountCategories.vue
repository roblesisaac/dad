<template>
  <AccountCategory :state="state" :category="category" :categoryName="categoryName" :key="categoryName+state.selectedTab.tabName" v-for="(category, categoryName) in selectedTabData" />
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
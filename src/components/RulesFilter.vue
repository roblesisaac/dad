<template>
  <div class="grid">
    <div v-for="(ruleConfig, index) in filterState.filters" :key="'ruleConfig'+index" class="cell-1">
      <div class="grid">
        <div class="cell-1">
          {{ ruleConfig }}
          <!-- <EditRule :ruleConfig="ruleConfig" :tab="tab" :state="state" /> -->
        </div>
      </div>
    </div>
  </div>
  </template>
  
  <script setup>
  import { reactive, defineProps } from 'vue';
  
  const { selectedTab, state } = defineProps({
    selectedTab: Object,
    state: Object
  });
  
  const filterState = reactive({
    filters: []
  });
  
  const app = function() {
    function filterOutFilters(rules) {
      const filters = [];
  
      rules.forEach((ruleConfig) => {
        const [ruleType] = ruleConfig.rule;
  
        if(ruleType === 'filter') {
          filters.push(ruleConfig);
        }
      });
  
      return filters;
    }
  
    return {
      init: () => {
        filterState.filters = filterOutFilters(selectedTab.rules);
      }
    }
  }();
  
  app.init();
  
  </script>
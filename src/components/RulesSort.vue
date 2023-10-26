<template>
  <div class="grid">
    <div v-for="(ruleConfig, index) in sortState.sorters" :key="'ruleConfig'+index" class="cell-1">
      <div class="grid">
        <div class="cell-1">
          {{  ruleConfig }}
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
  
  const sortState = reactive({
    sorters: []
  });
  
  const app = function() {
    function filterOutSorters(rules) {
      const sorters = [];
  
      rules.forEach((ruleConfig) => {
        const [ruleType] = ruleConfig.rule;
  
        if(ruleType === 'sort') {
          sorters.push(ruleConfig);
        }
      });
  
      return sorters;
    }
  
    return {
      init: () => {
        sortState.sorters = filterOutSorters(selectedTab.rules);
      }
    }
  }();
  
  app.init();
  
  </script>
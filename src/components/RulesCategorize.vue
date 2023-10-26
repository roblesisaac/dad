<template>
<div class="grid">
  <div v-for="(ruleConfig, index) in catState.categorizers" :key="'ruleConfig'+index" class="cell-1">
    <div class="grid">
      <div class="cell-1">
        <EditRule :ruleConfig="ruleConfig" :tab="tab" :state="state" />
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { reactive, defineProps } from 'vue';
import EditRule from './EditRule.vue';

const { selectedTab, state } = defineProps({
  selectedTab: Object,
  state: Object
});

const catState = reactive({
  categorizers: []
});

const app = function() {
  function filterOutCategorizers(rules) {
    const categorizers = [];

    rules.forEach((ruleConfig) => {
      const [ruleType] = ruleConfig.rule;

      if(ruleType === 'categorize') {
        categorizers.push(ruleConfig);
      }
    });

    return categorizers;
  }

  return {
    init: () => {
      catState.categorizers = filterOutCategorizers(selectedTab.rules);
    }
  }
}();

app.init();

</script>
<template>
<div class="grid">
  <div class="cell-1">
    <Draggable
      v-if="filteredRulesByType.length"
      class="draggable" 
      v-model="filteredRulesByType" 
      group="rules" 
      handle=".handle"
      v-bind="dragOptions" 
      item-key="_id">

        <template #item="{element}">
          <EditRule :ruleConfig="element" :state="state" :showReorder="showReorder" />
        </template>
        
    </Draggable>
  </div>

  <div class="cell-1">
    <hr>
    <EditRule :ruleConfig="newRule" :state="state" :showReorder="showReorder" />
    <button @click="state.showReorder=!state.showReorder" class="button bgBlack">
      <span v-if="!state.showReorder">Reorder</span>
      <span v-else>Cancel</span>
    </button>
  </div>
</div>
</template>

<script setup>
import { computed, defineProps, ref, watch } from 'vue';
import EditRule from './EditRule.vue';
import Draggable from 'vuedraggable';

state.showReorder = false;

const { ruleType, state } = defineProps({
  ruleType: String,
  state: Object
});

const selectedTab = state.selected.tab;

const dragOptions = ref({
  touchStartThreshold: 100,
  animation: 200
});

const allRulesForTab = computed(() => {
  const tabId = selectedTab._id;

  return state.allUserRules.filter(ruleItem => {
    const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
    const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

    return applyForTabsIsGlobal || applyForTabMatchesTabId
  });
});

const filteredRulesByType = ref(setFilteredRulesByType());

function setFilteredRulesByType() {
  return allRulesForTab.value.filter(ruleConfig => ruleType === ruleConfig.rule[0]).sort(byOrderOfExecution);
}

const newRule = ref({
  rule: [ruleType, '', '', '', '']
});

function byOrderOfExecution(a, b) {
  return a.orderOfExecution - b.orderOfExecution;
}

watch(() => state.allUserRules.length, () => filteredRulesByType.value = setFilteredRulesByType());
watch(filteredRulesByType, (newRules) => {
  newRules.forEach((rule, ruleIndex) => rule.orderOfExecution = ruleIndex);
}, { deep: true });


</script>
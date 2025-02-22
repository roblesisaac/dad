<template>
<div class="x-grid p20x">
  <div v-if="filteredRulesByType.length > 1" class="cell-1 p15t">
    <div class="underline bold colorBlue">
      <span @click="state.showReorder=true" v-if="!state.showReorder">Reorder</span>
      <span v-else @click="state.showReorder=false">Done</span>
    </div>
  </div>
  
  <div class="cell-1 p15b">
    <Draggable
      v-if="filteredRulesByType.length"
      class="draggable" 
      v-model="filteredRulesByType" 
      group="rules" 
      handle=".handle"
      v-bind="state.dragOptions()" 
      item-key="_id">
      <template #item="{element}">
        <EditRule :ruleConfig="element" :state="state" :showReorder="showReorder" />
      </template>
    </Draggable>
  </div>

  <div class="cell-1 p20b">
    <hr v-if="filteredRulesByType.length">
    <div class="x-grid" v-if="filteredRulesByType.length">
      <div class="cell-1 proper p10t">
        New {{ ruleType }} Rule ↓
      </div>
    </div>

    <EditRule :ruleConfig="newRule" :state="state" :showReorder="showReorder" />
  </div>
</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import EditRule from './EditRule.vue';
import Draggable from 'vuedraggable';

const props = defineProps({
  ruleType: String,
  state: Object
});

const selectedTab = props.state.selected.tab;

const allRulesForTab = computed(() => {
  const tabId = selectedTab._id;

  return props.state.allUserRules.filter(ruleItem => {
    const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
    const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

    return applyForTabsIsGlobal || applyForTabMatchesTabId;
  });
});

const filteredRulesByType = ref(setFilteredRulesByType());

function setFilteredRulesByType() {
  return allRulesForTab.value
    .filter(ruleConfig => props.ruleType === ruleConfig.rule[0])
    .sort(byOrderOfExecution);
}

const newRule = ref({
  rule: [props.ruleType, '', '', '', '']
});

function byOrderOfExecution(a, b) {
  return a.orderOfExecution - b.orderOfExecution;
}

watch(() => props.state.allUserRules.length, () => {
  filteredRulesByType.value = setFilteredRulesByType();
});

watch(filteredRulesByType, (newRules) => {
  newRules.forEach((rule, ruleIndex) => rule.orderOfExecution = ruleIndex);
}, { deep: true });
</script> 
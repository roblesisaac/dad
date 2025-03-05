<template>
<div class="grid grid-cols-1 px-5">
  <div v-if="filteredRulesByType.length > 1" class="col-span-1 pt-4">
    <div class="underline font-bold text-blue-700 cursor-pointer hover:text-blue-900">
      <span @click="state.showReorder=true" v-if="!state.showReorder">Reorder</span>
      <span v-else @click="state.showReorder=false">Done</span>
    </div>
  </div>
  
  <div class="col-span-1 pb-4">
    <Draggable
      v-if="filteredRulesByType.length"
      class="space-y-3" 
      v-model="filteredRulesByType" 
      group="rules" 
      handle=".handle"
      v-bind="dragOptions(1)" 
      item-key="_id">
      <template #item="{element}">
        <EditRule :ruleConfig="element" :state="state" :showReorder="showReorder" />
      </template>
    </Draggable>
  </div>

  <div class="col-span-1 pb-5">
    <hr v-if="filteredRulesByType.length" class="border-t border-gray-300 my-3">
    <div class="grid grid-cols-1" v-if="filteredRulesByType.length">
      <div class="col-span-1 pt-2.5 mb-3">
        <span class="text-indigo-700 font-bold" :class="{
          'text-teal-700': ruleType === 'categorize',
          'text-cyan-700': ruleType === 'sort',
          'text-amber-700': ruleType === 'filter'
        }">New {{ ruleType }} Rule ↓</span>
      </div>
    </div>

    <EditRule :ruleConfig="newRule" :state="state" :showReorder="showReorder" />
  </div>
</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import EditRule from './EditRule.vue';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();

const props = defineProps({
  ruleType: String
});

const { state } = useDashboardState();
const selectedTab = state.selected.tab;

const allRulesForTab = computed(() => {
  const tabId = selectedTab._id;

  return state.allUserRules.filter(ruleItem => {
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

watch(() => state.allUserRules.length, () => {
  filteredRulesByType.value = setFilteredRulesByType();
});

watch(filteredRulesByType, (newRules) => {
  newRules.forEach((rule, ruleIndex) => rule.orderOfExecution = ruleIndex);
}, { deep: true });
</script> 
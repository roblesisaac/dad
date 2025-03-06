<template>
<div class="grid grid-cols-1 px-5">
  <div class="col-span-1 flex justify-between items-center py-4">
    <h3 class="text-lg font-medium" :class="{
      'text-indigo-700': ruleType === 'categorize',
      'text-teal-700': ruleType === 'categorize',
      'text-cyan-700': ruleType === 'sort',
      'text-amber-700': ruleType === 'filter'
    }">{{ ruleType.charAt(0).toUpperCase() + ruleType.slice(1) }} Rules</h3>
    
    <button v-if="filteredRulesByType.length > 1" 
      @click="showReorder = !showReorder"
      class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
      :class="showReorder ? 
        'bg-gray-100 text-gray-700 hover:bg-gray-200' : 
        'bg-blue-50 text-blue-700 hover:bg-blue-100'">
      <MoveVertical v-if="!showReorder" class="h-4 w-4 mr-1.5" />
      <ChevronRight v-else class="h-4 w-4 mr-1.5" />
      {{ showReorder ? 'Done' : 'Reorder' }}
    </button>
  </div>
  
  <div class="col-span-1 pb-4">
    <Draggable
      v-if="filteredRulesByType.length"
      class="space-y-3" 
      v-model="filteredRulesByType" 
      group="rules" 
      handle=".sort-rule"
      v-bind="dragOptions(1)" 
      item-key="_id">
      <template #item="{element}">
        <EditRule :ruleConfig="element" :showReorder="showReorder" />
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

    <EditRule :ruleConfig="newRule" :showReorder="showReorder" />
  </div>
</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { MoveVertical, ChevronRight } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import EditRule from './EditRule.vue';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();

const props = defineProps({
  ruleType: String
});

const { state } = useDashboardState();
const selectedTab = state.selected.tab;
const showReorder = ref(false);
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

watch(() => filteredRulesByType.value, (newRules) => {
  newRules.forEach((rule, ruleIndex) => rule.orderOfExecution = ruleIndex);
}, { deep: true });
</script> 
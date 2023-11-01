<template>
<draggable class="grid draggable" v-model="filteredRulesByType" v-bind="dragOptions" handle=".handle" itemKey="dragRules">
  <EditRule v-for="(ruleConfig, index) in filteredRulesByType" :filteredRulesByType="filteredRulesByType" :ruleConfig="ruleConfig" :state="state" :key="index" :ruleType="ruleType" />
</draggable>
</template>

<script setup>
import { computed, defineProps, ref, watch } from 'vue';
import EditRule from './EditRule.vue';
import { VueDraggableNext as Draggable } from 'vue-draggable-next';

const { ruleType, state } = defineProps({
  ruleType: String,
  state: Object
});

const selectedGroup = state.selected.group;
const selectedTab = state.selected.tab;

const allRulesForTab = computed(() => {
  return [
    ...filterRulesForTab(),
    ...filterGlobalRules()
  ];
});

function filterGlobalRules() {
  return state.allUserRules.filter(ruleItem => {
    const accountIsGlobal = ruleItem.applyForGroups.includes('_GLOBAL');
    const tabIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');

    return accountIsGlobal && tabIsGlobal;
  });
}

function filterRulesForTab() {
  const groupId = selectedGroup._id;
  const tabId = selectedTab._id;

  return state.allUserRules.filter(ruleItem => {
    const groupIdMatches = ruleItem.applyForGroups.includes(groupId);

    if(!groupIdMatches) {
      return false;
    }

    const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
    const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

    return groupIdMatches && (applyForTabsIsGlobal || applyForTabMatchesTabId)
  });
}

function byOrderOfExecution(a, b) {
  return a.orderOfExecution - b.orderOfExecution;
}

function filterByRuleType() {
  const filteredRules = allRulesForTab.value.filter(ruleConfig => ruleType === ruleConfig.rule[0]);
  const newRule = {
    applyForGroups: [selectedGroup._id], 
    applyForTabs: [selectedTab._id], 
    orderOfExecution: filteredRules.length, 
    rule: [ruleType, '', '', '', '']
  };

  return [...filteredRules, newRule].sort(byOrderOfExecution);
}

const filteredRulesByType = ref(filterByRuleType());

const dragOptions = {
  animation: 200
}

watch(filteredRulesByType, (newRules) => {
  newRules.forEach((rule, ruleIndex) => rule.orderOfExecution = ruleIndex);
}, { deep: true });

</script>
<template>
  <div class="grid middle left p30">
    <!-- Rule Rendered -->
    <!-- <div class="cell-1">      
      <div class="grid">
        <EditRule :filteredRulesByType="filteredRulesByType" :ruleConfig="ruleConfig" :state="state" :key="index" :ruleType="ruleType" />
      </div>
    </div> -->

        <!-- Tabs -->
    <div class="cell-1">
      <div class="grid">

        <div class="cell-1">
          <b>Tabs Shared With:</b>
          <div class="dropHere">
            <span v-if="!ruleConfig.applyForTabs.length">Drag and drop tabs here.</span>
            <Draggable class="draggable" group="tabDragger" v-model="ruleConfig.applyForTabs" v-bind="dragOptions">
              <button v-for="tabId in ruleConfig.applyForTabs" class="button sharedWith proper">{{ getTabName(tabId) }}</button>
            </Draggable>
          </div>
        </div>

        <div class="cell-1">
          <ScrollingContent class="p30y">
          <Draggable class="draggable" group="tabDragger" v-model="unselectedTabsInRule" v-bind="dragOptions">
            <button v-for="tabId in unselectedTabsInRule" class="button sharedWith proper">{{ getTabName(tabId) }}</button>
          </Draggable>
          </ScrollingContent>
        </div>

      </div>
    </div>

    <!-- Groups -->
    <!-- <div class="cell-1">
      <div class="grid">

        <div class="cell-1">
          <b>Groups Shared With:</b>
          <div class="dropHere">
            <span v-if="!ruleConfig.applyForGroups.length">Drag and drop groups here.</span>
            <Draggable class="draggable" group="groupDragger" v-model="ruleConfig.applyForGroups" v-bind="dragOptions">
              <button v-for="groupId in ruleConfig.applyForGroups" class="sharedWith">{{ getGroupName(groupId) }}</button>
            </Draggable>
          </div>
        </div>

        <div class="cell-1">
          <ScrollingContent class="p30y">
          <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInRule" v-bind="dragOptions">
            <button v-for="groupId in unselectedGroupsInRule" class="button sharedWith">{{ getGroupName(groupId) }}</button>
          </Draggable>
          </ScrollingContent>
        </div>

      </div>
    </div> -->

    <div class="cell-1">
      <button @click="removeRule" class="button transparent colorDarkRed expanded">Delete Rule</button>
    </div>

  </div>
</template>

<script setup>
import { computed, defineProps, nextTick, watch } from 'vue';
import ScrollingContent from './ScrollingContent.vue';
import { VueDraggableNext as Draggable } from 'vue-draggable-next';
// import EditRule from './EditRule.vue';

import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const props = defineProps({
  editState: Object,
  ruleConfig: Object,
  state: Object
});

const dragOptions = {
  animation: 200,
  touchStartThreshold: 100
};

function getGroupName(groupId) {
  return props.state.allUserGroups.find(group => group._id === groupId)?.name;
}

function getTabName(tabId) {
  return props.state.allUserTabs.find(tab => tab._id === tabId)?.tabName;
}

function removeRule() {
  if(!confirm('Delete rule?')) {
    return;
  }

  const { _id } = props.ruleConfig;
  const ruleIndex = props.state.allUserRules.findIndex(rule => rule._id === _id);

  props.state.allUserRules.splice(ruleIndex, 1);
  api.delete(`api/rules/${_id}`);

  nextTick(() => {
    props.editState.ruleSharer = null;
  });
}

function updateRule() {
  const { _id } = props.ruleConfig;

  api.put(`api/rules/${_id}`, {
    applyForGroups: props.ruleConfig.applyForGroups,
    applyForTabs: props.ruleConfig.applyForTabs
  });
}

const unselectedGroupsInRule = computed(() => {
  return props.state.allUserGroups.filter(group => !props.ruleConfig.applyForGroups.includes(group._id))
    .map(group => group._id);
});

const unselectedTabsInRule = computed(() => {
  return props.state.selected.tabsForGroup.filter(tab => !props.ruleConfig.applyForTabs.includes(tab._id))
    .map(tab => tab._id);
});

watch(() => props.ruleConfig, updateRule, { deep: true });

</script>
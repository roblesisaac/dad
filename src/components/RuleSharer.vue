<template>
  <div class="grid middle left p30">
    <!-- Rule Rendered -->
    <div class="cell-1 p30b">      
      <div class="grid">
        <h4 class="proper">{{ ruleType }}</h4>
        <div class="cell-1">
          <EditRule :ruleConfig="props.ruleConfig" :state="props.state" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="cell-1">
      <div class="grid">

        <div class="cell-1">
          <b>Tabs Shared With:</b>
          <div class="dropHere">
            <span v-if="!ruleConfig.applyForTabs.length">Drag and drop tabs here.</span>
            <Draggable class="draggable" group="tabDragger" v-model="ruleConfig.applyForTabs" v-bind="dragOptions">
              <template #item="{element}">
                <button class="button sharedWith proper">{{ getTabName(element) }}</button>
              </template>
            </Draggable>
          </div>
        </div>

        <div class="cell-1">
          <ScrollingContent class="p30y">
          <Draggable class="draggable" group="tabDragger" v-model="unselectedTabsInRule" v-bind="dragOptions">
            <template #item="{element}">
              <button class="button sharedWith proper">{{ getTabName(element) }}</button>
            </template>
          </Draggable>
          </ScrollingContent>
        </div>

      </div>
    </div>

    <div class="cell-1">
      <button @click="removeRule" class="button transparent colorDarkRed expanded">Delete Rule</button>
    </div>

  </div>
</template>

<script setup>
import { computed, defineProps, nextTick, watch } from 'vue';
import ScrollingContent from './ScrollingContent.vue';
import Draggable from 'vuedraggable';
import EditRule from './EditRule.vue';

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

const ruleType = props.ruleConfig.rule[0];

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
    applyForTabs: props.ruleConfig.applyForTabs
  });
}

const unselectedTabsInRule = computed(() => {
  return props.state.selected.tabsForGroup.filter(tab => !props.ruleConfig.applyForTabs.includes(tab._id))
    .map(tab => tab._id);
});

watch(() => props.ruleConfig, updateRule, { deep: true });

</script>
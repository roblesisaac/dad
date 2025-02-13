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
            <Draggable class="draggable" group="tabDragger" v-model="ruleConfig.applyForTabs" v-bind="props.state.dragOptions(100)">
              <template #item="{element}">
                <button class="button sharedWith proper">{{ getTabName(element) }}</button>
              </template>
            </Draggable>
          </div>
        </div>

        <div class="cell-1">
          <ScrollingContent class="p30y">
          <Draggable class="draggable" group="tabDragger" v-model="unselectedTabsInRule" v-bind="props.state.dragOptions(100)">
            <template #item="{element}">
              <button class="button sharedWith proper">{{ getTabName(element) }}</button>
            </template>
          </Draggable>
          </ScrollingContent>
        </div>

      </div>
    </div>

    <!-- Make Global-->
    <div class="cell-1 p30b">
      <div class="grid">
        <div class="cell shrink bold p20r">Global?</div>
        <div class="cell auto"><Switch v-model="isGlobal" /></div>
      </div>
    </div>

    <div class="cell-1">
      <button @click="removeRule" class="button bgDarkRed expanded">Delete Rule</button>
    </div>

  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import Switch from '@/shared/components/Switch.vue';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';
import Draggable from 'vuedraggable';
import EditRule from '../../edit-tab/components/EditRule.vue';

import { useApi } from '@/shared/composables/useApi';

const { api } = useApi();

const props = defineProps({
  ruleConfig: Object,
  state: Object
});

const isGlobal = ref(props.ruleConfig.applyForTabs.includes('_GLOBAL'));

const ruleType = props.ruleConfig.rule[0];

function getTabName(tabId) {
  return props.state.allUserTabs.find(tab => tab._id === tabId)?.tabName || tabId;
}

function removeRule() {
  if(!confirm('Delete rule?')) {
    return;
  }

  const { _id } = props.ruleConfig;
  const ruleIndex = props.state.allUserRules.findIndex(rule => rule._id === _id);

  api.delete(`api/rules/${_id}`);

  nextTick(() => {
    props.state.views.pop();
    props.state.allUserRules.splice(ruleIndex, 1);
    props.state.editingRule = null;
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

watch(isGlobal, () => {
  if(isGlobal.value) {
    props.ruleConfig.applyForTabs = ['_GLOBAL'];
    return;
  }

  const index = props.ruleConfig.applyForTabs.indexOf('_GLOBAL');
  if (index !== -1) {
    props.ruleConfig.applyForTabs.splice(index, 1);
  }
});

watch(() => props.ruleConfig, updateRule, { deep: true });

</script>
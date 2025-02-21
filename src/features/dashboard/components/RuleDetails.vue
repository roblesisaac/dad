<template>
  <div class="x-grid middle left p30">
    <!-- Rule Rendered -->
    <div class="cell-1 p30b">      
      <div class="x-grid">
        <h4 class="proper">{{ ruleType }}</h4>
        <div class="cell-1">
          <EditRule :ruleConfig="props.ruleConfig" :state="state" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="cell-1">
      <div class="x-grid">

        <div class="cell-1">
          <b>Tabs Shared With:</b>
          <div class="dropHere">
            <span v-if="!ruleConfig.applyForTabs.length">Drag and drop tabs here.</span>
            <Draggable class="draggable" group="tabDragger" v-model="ruleConfig.applyForTabs" v-bind="dragOptions()">
              <template #item="{element}">
                <button class="button sharedWith proper">{{ getTabName(element) }}</button>
              </template>
            </Draggable>
          </div>
        </div>

        <div class="cell-1">
          <ScrollingContent class="p30y">
          <Draggable class="draggable" group="tabDragger" v-model="unselectedTabsInRule" v-bind="dragOptions()">
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
      <div class="x-grid">
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
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import Switch from '@/shared/components/Switch.vue';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';
import EditRule from '@/features/edit-tab/components/EditRule.vue';
import { useApi } from '@/shared/composables/useApi';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const router = useRouter();
const api = useApi();
const { state } = useDashboardState();

const props = defineProps({
  ruleConfig: Object
});

const ruleType = computed(() => props.ruleConfig.rule[0]);
const isGlobal = ref(props.ruleConfig.applyForTabs.includes('_GLOBAL'));

function getTabName(tabId) {
  return state.allUserTabs.find(tab => tab._id === tabId)?.tabName || tabId;
}

function removeRule() {
  if(!confirm('Delete rule?')) {
    return;
  }

  const { _id } = props.ruleConfig;
  const ruleIndex = state.allUserRules.findIndex(rule => rule._id === _id);

  api.delete(`rules/${_id}`);

  nextTick(() => {
    router.back();
    state.allUserRules.splice(ruleIndex, 1);
    state.editingRule = null;
  });
}

function updateRule() {
  const { _id } = props.ruleConfig;
  api.put(`rules/${_id}`, {
    applyForTabs: props.ruleConfig.applyForTabs
  });
}

const unselectedTabsInRule = computed(() => {
  return state.selected.tabsForGroup
    .filter(tab => !props.ruleConfig.applyForTabs.includes(tab._id))
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
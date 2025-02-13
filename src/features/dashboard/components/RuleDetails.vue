<template>
  <div class="p-8 space-y-6">
    <!-- Rule Header -->
    <div class="space-y-4">
      <h4 class="text-lg font-medium capitalize">{{ ruleType }}</h4>
      <div>
        <EditRule :ruleConfig="props.ruleConfig" :state="props.state" />
      </div>
    </div>

    <!-- Tabs Section -->
    <div class="space-y-4">
      <div>
        <h3 class="font-medium mb-2">Tabs Shared With:</h3>
        <div class="min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <span v-if="!ruleConfig.applyForTabs.length" class="text-gray-500">
            Drag and drop tabs here.
          </span>
          <Draggable 
            class="space-y-2" 
            group="tabDragger" 
            v-model="ruleConfig.applyForTabs" 
            v-bind="props.state.dragOptions(100)"
          >
            <template #item="{element}">
              <div class="inline-block px-3 py-1 m-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {{ getTabName(element) }}
              </div>
            </template>
          </Draggable>
        </div>
      </div>

      <div class="mt-4">
        <ScrollingContent class="py-4">
          <Draggable 
            class="space-x-2" 
            group="tabDragger" 
            v-model="unselectedTabsInRule" 
            v-bind="props.state.dragOptions(100)"
          >
            <template #item="{element}">
              <div class="inline-block px-3 py-1 m-1 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200">
                {{ getTabName(element) }}
              </div>
            </template>
          </Draggable>
        </ScrollingContent>
      </div>
    </div>

    <!-- Global Toggle -->
    <div class="flex items-center space-x-4">
      <span class="font-medium">Global?</span>
      <Switch v-model="isGlobal" />
    </div>

    <!-- Delete Button -->
    <button 
      @click="removeRule" 
      class="w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
    >
      Delete Rule
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import Switch from '@/shared/components/Switch.vue';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';
import Draggable from 'vuedraggable';
import EditRule from '../../edit-tab/components/EditRule.vue';

import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

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
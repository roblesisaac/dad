<template>
  <div class="grid items-center text-left p-7">
    <!-- Rule Rendered -->
    <div class="w-full pb-7">      
      <div class="grid">
        <h4>{{ ruleType }}</h4>
        <div class="w-full">
          <EditRule :ruleConfig="state.editingRule" :state="state" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="w-full">
      <div class="grid">

        <div class="w-full">
          <b>Tabs Shared With:</b>
          <div class="border border-dashed border-gray-300 p-2 min-h-[50px]">
            <span v-if="!ruleConfig.applyForTabs.length">Drag and drop tabs here.</span>
            <Draggable class="flex flex-wrap" group="tabDragger" v-model="ruleConfig.applyForTabs" v-bind="dragOptions()">
              <template #item="{element}">
                <button class="m-1 px-2 py-1 border border-gray-300 rounded">{{ getTabName(element) }}</button>
              </template>
            </Draggable>
          </div>
        </div>

        <div class="w-full">
          <ScrollingContent class="py-7">
          <Draggable class="flex flex-wrap" group="tabDragger" v-model="unselectedTabsInRule" v-bind="dragOptions()">
            <template #item="{element}">
              <button class="m-1 px-2 py-1 border border-gray-300 rounded">{{ getTabName(element) }}</button>
            </template>
          </Draggable>
          </ScrollingContent>
        </div>

      </div>
    </div>

    <!-- Make Global-->
    <div class="w-full pb-7">
      <div class="grid grid-cols-12">
        <div class="col-span-2 font-bold pr-5">Global?</div>
        <div class="col-span-10"><Switch v-model="isGlobal" /></div>
      </div>
    </div>

    <div class="w-full">
      <button @click="removeRule" class="w-full bg-red-700 text-white py-2 px-4 rounded">Delete Rule</button>
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

const ruleConfig = computed(() => state.editingRule);
const ruleType = computed(() => state.editingRule.rule[0]);
const isGlobal = ref(state.editingRule.applyForTabs.includes('_GLOBAL'));

function getTabName(tabId) {
  return state.allUserTabs.find(tab => tab._id === tabId)?.tabName || tabId;
}

function removeRule() {
  if(!confirm('Delete rule?')) {
    return;
  }

  const { _id } = state.editingRule;
  const ruleIndex = state.allUserRules.findIndex(rule => rule._id === _id);

  api.delete(`rules/${_id}`);

  nextTick(() => {
    router.back();
    state.allUserRules.splice(ruleIndex, 1);
    state.editingRule = null;
  });
}

function updateRule() {
  const { _id } = state.editingRule;
  api.put(`rules/${_id}`, {
    applyForTabs: state.editingRule.applyForTabs
  });
}

const unselectedTabsInRule = computed(() => {
  return state.selected.tabsForGroup
    .filter(tab => !state.editingRule.applyForTabs.includes(tab._id))
    .map(tab => tab._id);
});

watch(isGlobal, () => {
  if(isGlobal.value) {
    state.editingRule.applyForTabs = ['_GLOBAL'];
    return;
  }

  const index = state.editingRule.applyForTabs.indexOf('_GLOBAL');
  if (index !== -1) {
    state.editingRule.applyForTabs.splice(index, 1);
  }
});

watch(() => state.editingRule, updateRule, { deep: true });
</script>
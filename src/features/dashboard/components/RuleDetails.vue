<template>
  <div class="grid items-center text-left p-7">
    <!-- Rule Rendered -->
    <div class="w-full pb-7">      
      <div class="grid">
        <h4>{{ ruleType }}</h4>
        <div class="w-full">
          <EditRule :ruleConfig="props.ruleConfig" :state="state" />
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
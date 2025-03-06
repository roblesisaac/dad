<template>
<div class="grid grid-cols-1">
  <div class="col-span-1">
  <ScrollingContent>
    <!-- Draggable Grip -->
    <Transition>
      <div v-if="props.ruleConfig._id && showReorder" class="flex-none py-2.5 pr-1.5 font-bold cursor-grab sort-rule">
        <span class="text-sm"><GripHorizontal /></span>
      </div>
    </Transition>

    <!-- Categorize -->
    <div v-if="ruleType === 'categorize'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm text-teal-700">As</span>
    </div>

    <!-- Sort -->
    <div v-if="ruleType === 'sort'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm text-cyan-700">By</span>
    </div>

    <!-- Filter -->
    <div v-if="ruleType === 'filter'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm text-amber-700">Show if</span>
    </div>

    <!-- Categorize As -->
    <div v-if="app.shouldShow('categorizeAs')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthInput type="text" :state="props.ruleConfig.rule" propToUpdate="4" class="dynamic-input" placeholder="something" />
    </div>

    <!-- Categorize If -->
    <div v-if="ruleType === 'categorize'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm text-indigo-700">If</span>
    </div>

    <!-- Categorize Item Prop -->
    <div v-if="app.shouldShow('itemProp')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].itemProps" title="something" :data="props.ruleConfig.rule" :prop="1" class="dynamic-select" />
    </div>

    <!-- Categorize Condition -->
    <div v-if="app.shouldShow('ruleMethodName')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].ruleMethodNames" title="does" :data="props.ruleConfig.rule" :prop="2" class="dynamic-select" />
    </div>

    <!-- Criterion -->
    <div v-if="app.shouldShow('criterion') && route.name === 'edit-tab' || route.name === 'dashboard'" class="flex-none py-2.5 px-2.5">
      <DynamicWidthInput type="text" :state="props.ruleConfig.rule" propToUpdate="3" class="dynamic-input" placeholder="something" />
    </div>

    <!-- Edit Rule -->
    <div v-if="props.ruleConfig._id && route.name === 'edit-tab'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm">
        <Settings2 @click="app.editRule" class="cursor-pointer hover:text-blue-600" />
      </span>
    </div>
    
  </ScrollingContent>
  </div>
  <div v-if="app.shouldShow('criterion') && route.name === 'rule-details'" class="col-span-1">
    <DynamicTextArea :data="props.ruleConfig.rule" prop="3" class="code-editor" />
  </div>
</div>
</template>
    
<script setup>
  import { useRoute } from 'vue-router';
  import { Settings2, GripHorizontal } from 'lucide-vue-next';
  import DynamicWidthInput from './DynamicWidthInput.vue';
  import DynamicWidthSelect from './DynamicWidthSelect.vue';
  import DynamicTextArea from './DynamicTextArea.vue';
  import ScrollingContent from '@/shared/components/ScrollingContent.vue';
  import { useEditRule } from '../composables/useEditRule.js';

  const route = useRoute();
  const props = defineProps({
    ruleConfig: Object,
    showReorder: Boolean
  });

  const { 
    ruleType, 
    editRuleState, 
    // ruleIsShared, 
    // ruleIsGlobal, 
    editRule, 
    saveRule, 
    shouldShow 
  } = useEditRule(props.ruleConfig);

  // Create an app object that matches the original component's API
  const app = {
    editRule,
    saveRule,
    shouldShow
  };
</script>
    
<style>
select.editRule, input.editRule {
  @apply appearance-none font-bold text-blue-700 p-0 bg-transparent border-b-2 border-blue-600 border-x-0 border-t-0 rounded-none shadow-none;
}

.dynamic-input, .dynamic-select {
  @apply bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 p-0 outline-none;
}

.dynamic-input:focus, .dynamic-select:focus {
  @apply border-blue-800 outline-none;
}

.code-editor {
  @apply font-mono text-sm font-bold p-2.5 bg-gray-900 text-gray-300 border border-gray-700 rounded shadow-[2px_2px_0px_#6366f1] w-full;
}

.code-editor:focus {
  @apply outline-none border-blue-500 shadow-[0_0_5px_rgba(30,144,255,0.5)];
}
</style>
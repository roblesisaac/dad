<template>
<div class="grid grid-cols-1">
  <div class="col-span-1">
  <ScrollingContent>
    <Transition>
      <div v-if="ruleConfig._id && state.showReorder" class="flex-none py-2.5 pr-1.5 font-bold cursor-grab">
        <span class="text-sm"><GripHorizontal /></span>
      </div>
    </Transition>
    <div v-if="ruleIsGlobal" class="flex-none py-2.5 font-bold text-indigo-700">*</div>
    <div v-if="ruleIsShared" class="flex-none py-2.5 font-bold text-purple-700">**</div>
    <div v-if="ruleType === 'categorize'" class="flex-none py-2.5 px-2.5 font-bold"><span class="text-sm text-teal-700">As</span></div>
    <div v-if="ruleType === 'sort'" class="flex-none py-2.5 px-2.5 font-bold"><span class="text-sm text-cyan-700">By</span></div>
    <div v-if="ruleType === 'filter'" class="flex-none py-2.5 px-2.5 font-bold"><span class="text-sm text-amber-700">Show if</span></div>
    <div v-if="app.shouldShow('categorizeAs')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="4" class="bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800 px-0 py-0" placeholder="something" />
    </div>
    <div v-if="ruleType === 'categorize'" class="flex-none py-2.5 px-2.5 font-bold"><span class="text-sm text-indigo-700">If</span></div>
    <div v-if="app.shouldShow('itemProp')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].itemProps" title="something" :data="ruleConfig.rule" :prop="1" class="bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800" />
    </div>
    <div v-if="app.shouldShow('ruleMethodName')" class="flex-none py-2.5 px-2.5">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].ruleMethodNames" title="does" :data="ruleConfig.rule" :prop="2" class="bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800" />
    </div>
    <div v-if="app.shouldShow('testStandard') && route.name === 'edit-tab' || route.name === 'dashboard'" class="flex-none py-2.5 px-2.5">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="3" class="bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800 px-0 py-0" placeholder="something" />
    </div>
    <div v-if="ruleConfig._id && route.name === 'edit-tab'" class="flex-none py-2.5 px-2.5 font-bold">
      <span class="text-sm">
        <Settings2 @click="app.editRule" class="cursor-pointer hover:text-blue-600" />
      </span>
    </div>
  </ScrollingContent>
  </div>
  <div v-if="app.shouldShow('testStandard') && route.name === 'rule-details'" class="col-span-1">
    <DynamicTextArea :data="ruleConfig.rule" prop="3" class="font-mono text-sm font-bold p-2.5 bg-gray-900 text-gray-300 border border-gray-700 rounded shadow-[2px_2px_0px_#6366f1] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_5px_rgba(30,144,255,0.5)] w-full" />
  </div>
</div>
</template>
    
<script setup>
  import { computed, reactive, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { Settings2, GripHorizontal } from 'lucide-vue-next';
  import DynamicWidthInput from './DynamicWidthInput.vue';
  import DynamicWidthSelect from './DynamicWidthSelect.vue';
  import DynamicTextArea from './DynamicTextArea.vue';
  import ScrollingContent from '@/shared/components/ScrollingContent.vue';
  import { useApi } from '@/shared/composables/useApi';
  import { useUtils } from '@/shared/composables/useUtils';
  
  const api = useApi();
  const route = useRoute();
  const router = useRouter();
  const { waitUntilTypingStops } = useUtils();
  const { ruleConfig, state } = defineProps({
    ruleConfig: Object,
    state: Object
  });

  const ruleType = ruleConfig.rule[0];
  const allMethods = ['>=', '>', '=', 'is not', '<=', '<', 'includes', 'excludes', 'startsWith', 'endsWith' ];
  const allProps = ['amount', 'category', 'date', 'name', 'notes'];

  const ruleIsShared = computed(() => {
    return ruleConfig?.applyForTabs?.length > 1;
  });
  const ruleIsGlobal = computed(() => {
    return ruleConfig?.applyForTabs?.includes('_GLOBAL');
  });

  const editRuleState = reactive({
    ruleTypes: {
      categorize: {
        propNamesToSave: ['ruleType', 'itemProp', 'ruleMethodName', 'testStandard', 'categorizeAs'],
        itemProps: allProps,
        ruleMethodNames: allMethods
      },
      sort: {
        propNamesToSave: ['ruleType', 'itemProp'],
        itemProps: [
          'amount', '-amount',
          'date', '-date',
          'name', '-name',
          'category', '-category',
        ]
      },
      filter: {
        propNamesToSave: ['ruleType', 'itemProp', 'ruleMethodName', 'testStandard'],
        itemProps: allProps,
        ruleMethodNames: allMethods
      },
      groupBy: {
        propNamesToSave: ['ruleType', 'itemProp'],
        itemProps: ['category', 'year', 'month', 'year_month', 'day', 'weekday']
      }
    },
    typingTimer: 0
  });

  const app = function() {
    function meetsTypeRequirements(propNamesToSave, rulesToSave) {
      let fillCount = 0;

      rulesToSave.forEach(rule => {
        if(rule.length) fillCount++;
      });

      return propNamesToSave.length === fillCount;
    }

    return {
      editRule: () => {
        state.editingRule = ruleConfig;
        router.push({ name: 'rule-details' });
      },
      saveRule: async function() {
        const { propNamesToSave } = editRuleState.ruleTypes[ruleType];

        if(!meetsTypeRequirements(propNamesToSave, ruleConfig.rule)) {
          return;
        }

        if(['filter', 'categorize'].includes(ruleType)) {
          await waitUntilTypingStops();
        }

        if(ruleConfig._id) {
          await api.put(`rules/${ruleConfig._id}`, ruleConfig);
          return;
        }
        
        const newRule = {
          ...ruleConfig,
          applyForTabs: ruleType === 'categorize' ? ['_GLOBAL'] : [state.selected.tab._id],
          orderOfExecution: state.allUserRules.length
        };

        const newRuleSaved = await api.post('rules', newRule);

        state.allUserRules.push(newRuleSaved);

        ruleConfig.rule = [ruleType, '', '', '', ''];
      },
      shouldShow: function(propName) {
        return editRuleState.ruleTypes[ruleType].propNamesToSave.includes(propName);
      }
    }
  }();

  watch(
    () => ruleConfig, 
    app.saveRule,
    { deep: true }
  );

</script>
    
<style>
select.editRule, input.editRule {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  box-shadow: none;
  font-weight: bold;
  color: #2400FF;
  padding: 0;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  border-bottom: 2px solid blue;
  border-radius: 0;
}

.code-editor {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: bold;
  padding: 10px;
  background-color: #282c34;
  color: #abb2bf;
  border: 1px solid #3e4451;
  border-radius: 5px;
  transition: border-color 0.3s ease-in-out;
}

textarea:focus {
  outline: none;
  border-color: dodgerblue;
  box-shadow: 0 0 5px rgba(30, 144, 255, 0.5);
}
</style>
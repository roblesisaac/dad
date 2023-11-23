<template>
<div class="grid">
  <div class="cell-1">
  <ScrollingContent>
    <Transition>
      <div v-if="ruleConfig._id && state.showReorder" class="cell shrink p10y p5r bold handle">
        <small><DragHorizontalVariant /></small>
      </div>
    </Transition>
    <div v-if="ruleIsShared" class="cell shrink p10y bold">*</div>
    <div v-if="ruleType === 'categorize'" class="cell shrink p10y p10r bold"><small>As</small></div>
    <div v-if="ruleType === 'sort'" class="cell shrink p10y p10r bold"><small>By</small></div>
    <div v-if="ruleType === 'filter'" class="cell shrink p10y p10r bold"><small>Show if</small></div>
    <div v-if="app.shouldShow('categorizeAs')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="4" class="editRule" placeholder="something" />
    </div>
    <div v-if="ruleType === 'categorize'" class="cell shrink p10y p10r bold"><small>If</small></div>
    <div v-if="app.shouldShow('itemProp')" class="cell shrink p10y p10r">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].itemProps" title="something" :data="ruleConfig.rule" :prop="1" />
    </div>
    <div v-if="app.shouldShow('ruleMethodName')" class="cell shrink p10y p10r">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].ruleMethodNames" title="does" :data="ruleConfig.rule" :prop="2" />
    </div>
    <div v-if="app.shouldShow('testStandard') && state.is('EditTab')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="3" class="editRule" placeholder="something" />
    </div>
    <div v-if="ruleConfig._id && state.is('EditTab')" class="cell shrink p10y p10r bold">
      <small>
        <DotsVerticalCircleOutline @click="app.editRule" />
      </small>
    </div>
  </ScrollingContent>
  </div>
  <div v-if="app.shouldShow('testStandard') && state.is('RuleSharer')" class="cell-1">
    <DynamicTextArea :data="ruleConfig.rule" prop="3" class="code-editor" />
  </div>
</div>
</template>
    
<script setup>
  import { computed, defineProps, reactive, watch } from 'vue';
  import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
  import DragHorizontalVariant from 'vue-material-design-icons/DragHorizontalVariant.vue';
  import ScrollingContent from './ScrollingContent.vue';
  import DynamicWidthInput from './DynamicWidthInput.vue';
  import DynamicWidthSelect from './DynamicWidthSelect.vue';
  import DynamicTextArea from './DynamicTextArea.vue';
  import { useAppStore } from '../stores/state';
  
  const { api } = useAppStore();
  const { ruleConfig, state } = defineProps({
    ruleConfig: Object,
    state: Object
  });

  const ruleType = ruleConfig.rule[0];
  const allMethods = ['>=', '>', '=', 'is not', '<=', '<', 'includes', 'excludes', 'startsWith', 'endsWith' ];
  const allProps = ['amount', 'category', 'date', 'name'];

  const ruleIsShared = computed(() => {
    return ruleConfig?.applyForTabs?.includes('_GLOBAL') || ruleConfig?.applyForTabs?.length > 1;
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
          'category', '-category'
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

    function waitUntilTypingStops(ms=500) {
      return new Promise((resolve) => {
        clearTimeout(editRuleState.typingTimer);
        editRuleState.typingTimer = setTimeout(resolve, ms);
      });
    }

    return {
      editRule: () => {
        state.editingRule=ruleConfig;
        state.views.push('RuleSharer');
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
          await api.put(`api/rules/${ruleConfig._id}`, ruleConfig);
          return;
        }
        
        const newRule = {
          ...ruleConfig,
          applyForTabs: ruleType === 'categorize' ? ['_GLOBAL'] : [state.selected.tab._id],
          orderOfExecution: state.allUserRules.length
        };

        const newRuleSaved = await api.post('api/rules', newRule);

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
  text-decoration: underline;
  box-shadow: none;
  font-weight: bold;
  color: #2400FF;
  padding: 0;
  background: transparent;
  border: none;
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
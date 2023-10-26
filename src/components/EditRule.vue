<template>
<ScrollingContent>
  <div class="cell auto">
    <select v-model="editRuleState.ruleBody.itemProp" class="bold editRule">
      <option v-for="(itemProp, index) in editRuleState.valid.itemProps"
        :key="index"
        :value="itemProp"
      >
        {{ itemProp }}
      </option>
    </select>
  </div>
  <div class="cell auto p10">
    <select v-model="editRuleState.ruleBody.ruleMethodName" class="bold colorBlue editRule">
      <option v-for="(ruleMethodName, index) in editRuleState.valid.ruleMethodNames"
        :key="index"
        :value="ruleMethodName"
      >
        {{ ruleMethodName }}
      </option>
    </select>
  </div>
  <div class="cell auto p10">
    <DynamicWidthInput type="text" :state="editRuleState.ruleBody" propToUpdate="testStandard" class="editRule" />
  </div>
  <div class="cell auto p10">
    <DynamicWidthInput type="text" :state="editRuleState.ruleBody" propToUpdate="categorizeAs" class="editRule" />
  </div>
</ScrollingContent>
</template>

<script setup>
  import { defineProps, reactive, watch } from 'vue';
  import ScrollingContent from './ScrollingContent.vue';
  import DynamicWidthInput from './DynamicWidthInput.vue';
  import { useAppStore } from '../stores/app';
  
  const { api } = useAppStore();
  const { ruleConfig, tab, state } = defineProps({
    ruleConfig: Object,
    tab: Object,
    state: Object
  });

  const editRuleState = reactive({
    ruleBody: {
      ruleType: '',
      itemProp: '',
      ruleMethodName: '',
      testStandard: '',
      categorizeAs: ''
    },
    valid: {
      ruleTypes: ['categorize', 'sort', 'filter'],
      itemProps: ['amount', 'date', 'name', 'category'],
      ruleMethodNames: [
        '>=',
        '>',
        '=',
        '<=',
        '<',
        'includes',
        'excludes',
        'startsWith',
        'endsWith'
      ]
    }
  });

  const app = function() {
    function setProps(rule) {
      const { ruleBody } = editRuleState;
      const [ruleType, itemProp, ruleMethodName, testStandard, categorizeAs] = rule;

      ruleBody.ruleType = ruleType;
      ruleBody.itemProp = itemProp;
      ruleBody.ruleMethodName = ruleMethodName;
      ruleBody.testStandard = testStandard;
      ruleBody.categorizeAs = categorizeAs;
    }

    return {
      init: function() {
        setProps(ruleConfig.rule);
      },
      saveRule: async function() {
        const { ruleBody } = editRuleState;
        const rule = [];

        for(const prop in ruleBody) {
          rule.push(ruleBody[prop]);
        }

        ruleConfig.rule = rule;

        if(ruleConfig._id) {
          await api.put(`api/rules/${ruleConfig._id}`, ruleConfig);
          return;
        }

        const savedRule = await api.post('api/rules', ruleConfig);
        ruleConfig._id = savedRule._id;
      }
    }
  }();

  app.init();

  watch(
    () => editRuleState.ruleBody, 
    app.saveRule,
    { deep: true }
  );

</script>

<style>
.editRule {
  height: 40px !important;
}
select.editRule {
  box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
}
</style>
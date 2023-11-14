<template>
  <ScrollingContent>
    <div class="cell shrink p10y p5r bold handle">
      <small>
        <DragVertical />
      </small>
    </div>
    <div v-if="ruleType === 'categorize'" class="cell shrink p10y p10r bold handle"><small>As</small></div>
    <div v-if="ruleType === 'sort'" class="cell shrink p10y p10r bold handle"><small>By</small></div>
    <div v-if="ruleType === 'filter'" class="cell shrink p10y p10r bold handle"><small>Show if</small></div>
    <div v-if="app.shouldShow('categorizeAs')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="4" class="editRule" placeholder="something" />
    </div>
    <div v-if="ruleType === 'categorize'" class="cell shrink p10y p10r bold handle"><small>If</small></div>
    <div v-if="app.shouldShow('itemProp')" class="cell shrink p10y p10r">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].itemProps" title="something" :data="ruleConfig.rule" :prop="1" />
    </div>
    <div v-if="app.shouldShow('ruleMethodName')" class="cell shrink p10y p10r">
      <DynamicWidthSelect :options="editRuleState.ruleTypes[ruleType].ruleMethodNames" title="does" :data="ruleConfig.rule" :prop="2" />
    </div>
    <div v-if="app.shouldShow('testStandard')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="3" class="editRule" placeholder="something" />
    </div>
    <!-- <div v-if="app.shouldShow('categorizeAs')" class="cell shrink p10y p10r bold"><small>Categorize As</small></div> -->
    <div v-if="!editRuleState.showDeleteButton && ruleConfig._id" class="cell shrink p10y p10r bold">
      <small>
        <DotsVerticalCircleOutline @click="editState.ruleSharer=ruleConfig" />
      </small>
    </div>
  </ScrollingContent>
  </template>
    
  <script setup>
    import { defineProps, reactive, watch } from 'vue';
    import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
    import DragVertical from 'vue-material-design-icons/DragVertical.vue';
    import ScrollingContent from './ScrollingContent.vue';
    import DynamicWidthInput from './DynamicWidthInput.vue';
    import DynamicWidthSelect from './DynamicWidthSelect.vue';
    import { useAppStore } from '../stores/state';
    
    const { api } = useAppStore();
    const { editState, filteredRulesByType, ruleConfig, ruleType, state, key } = defineProps({
      editState: Object,
      filteredRulesByType: Array,
      ruleType: String,
      ruleConfig: Object,
      state: Object,
      key: Number
    });
  
    const allMethods = ['>=', '>', '=', 'is not', '<=', '<', 'includes', 'excludes', 'startsWith', 'endsWith' ];
    const allProps = ['amount', 'category', 'date', 'name'];

    const selectedGroup = state.selected.group;
    const selectedTab = state.selected.tab;
  
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
      showDeleteButton: false,
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

      function findRuleIndex(arrayOfRules, _id) {
        return arrayOfRules.findIndex(rule => rule._id === _id);
      }

      function updateAllUserRules(filteredRulesByType, updatedRule) {
        const existingRuleIndex = findRuleIndex(filteredRulesByType, updatedRule._id);

        if (existingRuleIndex !== -1) {
          filteredRulesByType[existingRuleIndex] = { ...filteredRulesByType[existingRuleIndex], ...updatedRule };
        }
      }

      function waitUntilTypingStops(ms=500) {
        return new Promise((resolve) => {
          clearTimeout(editRuleState.typingTimer);
          editRuleState.typingTimer = setTimeout(resolve, ms);
        });
      }
  
      return {
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
            updateAllUserRules(state.allUserRules, ruleConfig);
            return;
          }
  
          const newRuleSaved = await api.post('api/rules', ruleConfig);
          ruleConfig._id = newRuleSaved._id;

          const emptyRule = {
            applyForGroups: [selectedGroup._id], 
            applyForTabs: [selectedTab._id], 
            orderOfExecution: filteredRulesByType.length, 
            rule: [ruleType, '', '', '', ''] 
          };

          filteredRulesByType.push(emptyRule);
          state.allUserRules.push(newRuleSaved);
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
  </style>
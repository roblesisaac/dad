<template>
  <ScrollingContent>
    <div class="cell shrink p10y p10r bold handle">
      <small>
        <DragVertical />
      </small>
    </div>
    <div v-if="ruleType === 'categorize'" class="cell shrink p10y p10r bold handle"><small>If</small></div>
    <div v-if="ruleType === 'sort'" class="cell shrink p10y p10r bold handle"><small>By</small></div>
    <div v-if="ruleType === 'filter'" class="cell shrink p10y p10r bold handle"><small>Show if</small></div>
    <div v-if="app.shouldShow('itemProp')" class="cell shrink p10y p10r">
      <select v-model="ruleConfig.rule[1]" class="bold editRule">
        <option value="">Field Name</option>
        <option v-for="(itemProp, index) in editRuleState.ruleTypes[ruleType].itemProps"
          :key="index"
          :value="itemProp"
        >
          {{ itemProp }}
        </option>
      </select>
    </div>
    <div v-if="app.shouldShow('ruleMethodName')" class="cell shrink p10y p10r">
      <select v-model="ruleConfig.rule[2]" class="bold colorBlue editRule">
        <option value="">Rule Type</option>
        <option v-for="(ruleMethodName, index) in editRuleState.ruleTypes[ruleType].ruleMethodNames"
          :key="index"
          :value="ruleMethodName"
        >
          {{ ruleMethodName }}
        </option>
      </select>
    </div>
    <div v-if="app.shouldShow('testStandard')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="3" class="editRule" />
    </div>
    <div v-if="app.shouldShow('categorizeAs')" class="cell shrink p10y p10r bold"><small>Categorize As</small></div>
    <div v-if="app.shouldShow('categorizeAs')" class="cell shrink p10y p10r">
      <DynamicWidthInput type="text" :state="ruleConfig.rule" propToUpdate="4" class="editRule" />
    </div>
    <div v-if="!editRuleState.showDeleteButton && ruleConfig._id" class="cell shrink p10y p10r bold">
      <small>
        <DotsVerticalCircleOutline
          @click="editRuleState.showDeleteButton=!editRuleState.showDeleteButton" 
        />
      </small>
    </div>
    <Transition>
    <div v-if="editRuleState.showDeleteButton && ruleConfig._id"  class="cell shrink p10y p10r bold">
      <TrashCan @click="app.removeRule(ruleConfig)" class="colorRed" />
    </div>
    </Transition>
  </ScrollingContent>
  </template>
    
  <script setup>
    import { defineProps, reactive, watch } from 'vue';
    import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
    import DragVertical from 'vue-material-design-icons/DragVertical.vue';
    import TrashCan from 'vue-material-design-icons/TrashCan.vue';
    import ScrollingContent from './ScrollingContent.vue';
    import DynamicWidthInput from './DynamicWidthInput.vue';
    import { useAppStore } from '../stores/app';
    
    const { api } = useAppStore();
    const { filteredRulesByType, ruleConfig, ruleType, state, key } = defineProps({
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

      function removeFromAllUserRules(_idToRemove) {
        const existingRuleIndex = findRuleIndex(state.allUserRules, _idToRemove);

        if (existingRuleIndex !== -1) {
          state.allUserRules.splice(existingRuleIndex, 1);
        }
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
        removeRule: async function(ruleConfig) {
          const { _id } = ruleConfig;

          removeFromAllUserRules(_id);

          if(!_id) {
            return;
          }

          await api.delete('api/rules/'+_id);
          filteredRulesByType.splice(key, 1);
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
  .editRule {
    height: 40px !important;
  }
  select.editRule {
    box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
    text-align: center;
    font-weight: bold;
  }
  </style>
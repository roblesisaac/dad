import { computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '@/shared/composables/useApi';
import { useUtils } from '@/shared/composables/useUtils';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRulesAPI } from '@/features/dashboard/composables/useRulesAPI.js';

export function useEditRule(ruleConfig) {
  const api = useApi();
  const rulesAPI = useRulesAPI(api);
  const { state } = useDashboardState();
  const router = useRouter();
  const { waitUntilTypingStops } = useUtils();

  // Always get the current rule type
  const ruleType = computed(() => ruleConfig.rule[0]);
  
  // Define constants
  const allMethods = ['>=', '>', '=', 'is not', '<=', '<', 'includes', 'excludes', 'startsWith', 'endsWith'];
  const allProps = ['amount', 'category', 'date', 'name', 'notes'];

  // Computed properties
  const ruleIsShared = computed(() => {
    return ruleConfig?.applyForTabs?.length > 1;
  });
  
  const ruleIsGlobal = computed(() => {
    return ruleConfig?.applyForTabs?.includes('_GLOBAL');
  });

  // Reactive state
  const editRuleState = reactive({
    ruleTypes: {
      categorize: {
        propNamesToSave: ['ruleType', 'itemProp', 'ruleMethodName', 'criterion', 'categorizeAs'],
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
        propNamesToSave: ['ruleType', 'itemProp', 'ruleMethodName', 'criterion'],
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

  // Helper functions
  function meetsTypeRequirements(propNamesToSave, rulesToSave) {
    let fillCount = 0;

    rulesToSave.forEach(rule => {
      if(rule.length) fillCount++;
    });

    return propNamesToSave.length === fillCount;
  }

  // Main functionality
  const editRule = () => {
    state.editingRule = ruleConfig;
    router.push({ name: 'rule-details' });
  };

  const saveRule = async () => {
    console.log('saveRule', ruleConfig);
    
    // Always get the current rule type
    const currentRuleType = ruleType.value;
    
    const { propNamesToSave } = editRuleState.ruleTypes[currentRuleType];

    if(!meetsTypeRequirements(propNamesToSave, ruleConfig.rule)) {
      return;
    }

    if(['filter', 'categorize'].includes(currentRuleType)) {
      await waitUntilTypingStops();
    }

    if(ruleConfig._id) {
      await rulesAPI.updateRule(ruleConfig._id, ruleConfig);
      return;
    }
    
    const newRule = {
      ...ruleConfig,
      applyForTabs: currentRuleType === 'categorize' ? ['_GLOBAL'] : [state.selected.tab._id],
      orderOfExecution: state.allUserRules.length
    };

    const newRuleSaved = await rulesAPI.createRule(newRule);
    state.allUserRules.push(newRuleSaved);

    ruleConfig.rule = [currentRuleType, '', '', '', ''];
  };

  const shouldShow = (propName) => {
    return editRuleState.ruleTypes[ruleType.value].propNamesToSave.includes(propName);
  };

  // Setup watchers
  watch(() => ruleConfig.orderOfExecution, (newOrderOfExecution) => {
    rulesAPI.updateRuleOrder(ruleConfig._id, newOrderOfExecution);
  });

  watch(
    () => ruleConfig.rule, 
    async () => {
      saveRule();
    },
    { deep: true }
  );

  // Return public API
  return {
    ruleType,
    editRuleState,
    ruleIsShared,
    ruleIsGlobal,
    editRule,
    saveRule,
    shouldShow
  };
} 
import { useUtils } from '@/shared/composables/useUtils.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

export function useRules() {
  const { lowercase, makeArray } = useUtils();
  const { state } = useDashboardState();
  const ruleMethods = {
    '>=': (itemValue, valueToCheck) => parseFloat(itemValue) >= parseFloat(valueToCheck),
    '>': (itemValue, valueToCheck) => parseFloat(itemValue) > parseFloat(valueToCheck),
    '=': equals,
    'is not': (itemValue, valueToCheck) => !equals(itemValue, valueToCheck),
    '<=': (itemValue, valueToCheck) => parseFloat(itemValue) <= parseFloat(valueToCheck),
    '<': (itemValue, valueToCheck) => parseFloat(itemValue) < parseFloat(valueToCheck),
    includes,
    excludes: (itemValue, valueToCheck) => !includes(itemValue, valueToCheck)
  };

  function equals(itemValue, valueToCheck) {
    if(isNaN(itemValue)) {
      return lowercase(itemValue) == lowercase(valueToCheck);
    }
    return parseFloat(itemValue) == parseFloat(valueToCheck);
  }

  function includes(itemValue, valueToCheck) {
    itemValue = String(itemValue || '').toLowerCase();
    valueToCheck = String(valueToCheck || '').toLowerCase();
    
    return makeArray(valueToCheck.split(',')).some(valueToCheckItem => 
      itemValue.includes(valueToCheckItem)
    );
  }

  function filterGlobalRules() {
    const allRules = state.allUserRules;

    return allRules.filter(ruleItem => {
      return ruleItem.applyForTabs.includes('_GLOBAL');
    });
  }

  function filterRulesForTab(tabId) {
    const allRules = state.allUserRules;

    return allRules.filter(ruleItem => {
      const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
      const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

      return applyForTabsIsGlobal || applyForTabMatchesTabId;
    });
  }

  function combinedRulesForTab(tabId) {
    return [
      ...filterRulesForTab(tabId),
      ...filterGlobalRules()
    ];
  }

  return {
    ruleMethods,
    filterGlobalRules,
    filterRulesForTab,
    combinedRulesForTab
  };
} 
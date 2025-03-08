import { useUtils } from '@/shared/composables/useUtils.js';

export function useRules() {
  const { lowercase, makeArray } = useUtils();

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

  function filterGlobalRules(allRules) {
    return allRules.filter(ruleItem => {
      return ruleItem.applyForTabs.includes('_GLOBAL');
    });
  }

  function filterRulesForTab(allRules, tabId) {
    return allRules.filter(ruleItem => {
      const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
      const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

      return applyForTabsIsGlobal || applyForTabMatchesTabId;
    });
  }

  function combineRulesForTab(allRules, tabId) {
    return [
      ...filterRulesForTab(allRules, tabId),
      ...filterGlobalRules(allRules)
    ];
  }

  return {
    ruleMethods,
    filterGlobalRules,
    filterRulesForTab,
    combineRulesForTab
  };
} 
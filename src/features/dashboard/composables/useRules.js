export function useRules() {
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

  function lowercase(string) {
    if(typeof string === 'string') {
      return string.toLowerCase();
    }
    return string;
  }

  function makeArray(value) {
    return Array.isArray(value) ? value : [value];
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

  return {
    ruleMethods,
    filterGlobalRules,
    filterRulesForTab
  };
} 
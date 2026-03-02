import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { buildDefaultRuleMethods } from '@/features/tabs/utils/tabEvaluator.js';

export function useTabRules() {
  const { state } = useDashboardState();
  const ruleMethods = buildDefaultRuleMethods();

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

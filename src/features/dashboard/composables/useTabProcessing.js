import { useRules } from './useRules';

export function useTabProcessing() {
  const { ruleMethods, filterGlobalRules, filterRulesForTab } = useRules();
  const months = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function buildRuleMethods(tabRules) {
    const [sorters, categorizers, filters, propToGroupBy] = extractAndSortRuleTypes(tabRules);

    return {
      sort: buildSortMethod(sorters),
      categorize: buildCategorizeMethod(categorizers),
      filter: buildFilterMethod(filters),
      groupBy: buildGroupByMethod(propToGroupBy),
      propToGroupBy: propToGroupBy || 'category'
    };
  }

  function processTabData(data, tab, allRules) {
    const tabRules = [
      ...filterRulesForTab(allRules, tab._id),
      ...filterGlobalRules(allRules)
    ];

    const { filter, sort, categorize, groupBy, propToGroupBy } = buildRuleMethods(tabRules);

    const dataCopy = sort(data);
    const categorizedItems = [];
    let tabTotal = 0;

    // Process items...
    // (keeping existing processing logic)

    return { tabTotal, categorizedItems };
  }

  // Helper functions...
  // (move existing helper functions here)

  return {
    processTabData,
    buildRuleMethods
  };
} 
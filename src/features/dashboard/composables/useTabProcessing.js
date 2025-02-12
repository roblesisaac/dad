import { useRules } from './useRules';
import { useUtils } from './useUtils';

export function useTabProcessing() {
  const { ruleMethods, filterGlobalRules, filterRulesForTab } = useRules();
  const { getDayOfWeekPST } = useUtils();
  const months = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function extractAndSortRuleTypes(tabRules) {
    const sorters = [], categorizers = [], filters = [], propToGroupBy = [];

    for(const ruleConfig of tabRules) {
      const [ruleType, itemPropName, ruleMethodName, testStandard, categorizeAs] = ruleConfig.rule;

      const ruleMethod = (item) => {
        const itemValue = getItemValue(item, itemPropName);
        return ruleMethods[ruleMethodName]?.(itemValue, testStandard);
      };

      const { orderOfExecution, _isImportant } = ruleConfig;

      if(ruleType === 'groupBy') {
        propToGroupBy.push(itemPropName);
      }

      if(ruleType === 'sort') {
        sorters.push({ itemPropName, orderOfExecution });
      }

      if(ruleType === 'categorize') {
        categorizers.push({
          _id: ruleConfig._id,
          method: ruleMethod,
          categorizeAs,
          itemPropName, ruleMethodName, testStandard,
          orderOfExecution,
          _isImportant
        });
      }

      if(ruleType === 'filter') {
        filters.push({
          method: ruleMethod,
          orderOfExecution,
          _isImportant
        });
      }
    }

    return [
      sorters.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      categorizers.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      filters.sort((a,b) => a.orderOfExecution - b.orderOfExecution),
      propToGroupBy
    ];
  }

  function getItemValue(item, propName) {
    return propName === 'category'
      ? item.personal_finance_category.primary
      : item[propName];
  }

  function formatPersonalFinanceCategory(item) {
    const { primary } = item.personal_finance_category;
    if(!primary) return 'misc';
    
    const lower = primary.toLowerCase();
    item.personal_finance_category.primary = lower.split('_').join(' ');
  }

  function processTabData(data, tab, allRules) {
    if (!data || !tab) return null;

    const tabRules = [
      ...filterRulesForTab(allRules, tab._id),
      ...filterGlobalRules(allRules)
    ];

    const { filter, sort, categorize, groupBy, propToGroupBy } = buildRuleMethods(tabRules);

    const dataCopy = sort(data);
    const categorizedItems = [];
    let tabTotal = 0;

    for(const item of dataCopy) {
      item.amount *= -1;
      formatPersonalFinanceCategory(item);
      
      const typeToGroupBy = groupBy(item);

      if(!filter(item)) continue;

      const amt = parseFloat(item.amount);
      tabTotal += amt;

      if(!tab.isSelected) continue;

      const storedCategory = categorizedItems.find(([storedGroupByName]) => 
        storedGroupByName === typeToGroupBy
      );

      if(storedCategory) {
        let [_, storedTransactions, storedTotal] = storedCategory;
        storedTransactions.push(item);
        storedCategory[2] = storedTotal + amt;
      } else {
        categorizedItems.push([typeToGroupBy, [item], amt]);
      }
    }

    // Sort grouped items
    if(!['year', 'month', 'day', 'year_month'].includes(propToGroupBy)) {
      if(tabTotal > 0) {
        categorizedItems.sort((a, b) => b[2] - a[2]);
      } else {
        categorizedItems.sort((a, b) => a[2] - b[2]);
      }
    } else {
      categorizedItems.sort(groupByDate);
    }

    return { tabTotal, categorizedItems };
  }

  function groupByDate(a, b) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const [yearA, monthA] = a[0].split(' ');
    const [yearB, monthB] = b[0].split(' ');

    if (yearA !== yearB) {
      return yearB - yearA;
    } else {
      return months[monthB] - months[monthA];
    }
  }

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

  function buildSortMethod(sorters) {
    return (arrayToSort) => {
      const arrayCopy = arrayToSort.map(item => (JSON.parse(JSON.stringify(item))));

      if(!sorters.length) sorters.push({ itemPropName: '-date' });

      for(const { itemPropName } of sorters) {
        const isInReverse = itemPropName.startsWith('-');
        const propName = isInReverse ? itemPropName.slice(1) : itemPropName;
        
        arrayCopy.sort((a, b) => {
          const valueA = propName === 'date' ? new Date(a[propName]) : a[propName];
          const valueB = propName === 'date' ? new Date(b[propName]) : b[propName];

          return isInReverse ? valueB - valueA : valueA - valueB;
        });
      }

      return arrayCopy;
    };
  }

  function buildCategorizeMethod(categorizers) {
    return (item) => {
      if(item.recategorizeAs) {
        let recategory = String(item.recategorizeAs).trim().toLowerCase();
        item.personal_finance_category.primary = recategory;
        return;
      }

      formatPersonalFinanceCategory(item);

      if(!categorizers.length) {
        return item.personal_finance_category.primary;
      }

      let _important;

      for(const categorizeConfig of categorizers) {
        if(!categorizeConfig.method || _important) continue;

        const conditionMet = categorizeConfig.method(item);

        if(conditionMet) {
          const categoryName = categorizeConfig.categorizeAs;
          if(categorizeConfig._isImportant) _important = categorizeConfig.categorizeAs;

          item.rulesApplied = item.rulesApplied || new Set();

          if(!item.rulesApplied.has(categorizeConfig._id)) {
            item.rulesApplied.add(categorizeConfig._id);
          }

          item.personal_finance_category.primary = (_important || categoryName).toLowerCase();
        }
      }
    };
  }

  function buildFilterMethod(filters) {
    return (item) => {
      if(!filters.length) return true;

      let _isImportant = false;

      const itemPassesEveryFilter = filters.every(filterConfig => {
        const filterConditionMet = filterConfig.method(item);
        if(!filterConditionMet) return false;
        _isImportant = filterConfig._isImportant;
        return true;
      });

      return itemPassesEveryFilter || _isImportant;
    };
  }

  function buildGroupByMethod(propToGroupBy) {
    return (item) => {
      return {
        category: () => item.personal_finance_category.primary,
        year: () => {
          const [year] = item.authorized_date.split('-');
          return year;
        },
        month: () => {
          const [_, month] = item.authorized_date.split('-');
          return months[Number(month-1)];
        },
        year_month: () => {
          const [year, month] = item.authorized_date.split('-');
          return `${year} ${months[Number(month-1)]}`;
        },
        day: () => {
          const [_, month, day] = item.authorized_date.split('-');
          return `${months[Number(month-1)]}, ${day}`;
        },
        weekday: () => getDayOfWeekPST(item.authorized_date)
      }[propToGroupBy[0] || 'category']();
    };
  }

  // Helper functions...
  // (move existing helper functions here)

  return {
    processTabData,
    buildRuleMethods
  };
} 
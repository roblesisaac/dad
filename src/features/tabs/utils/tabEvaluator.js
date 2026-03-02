const DEFAULT_MONTHS = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];

function defaultGetDayOfWeekPST(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/Los_Angeles'
  });
}

function makeArray(value) {
  return Array.isArray(value) ? value : [value];
}

function lowercase(string) {
  return typeof string === 'string' ? string.toLowerCase() : string;
}

function equals(itemValue, valueToCheck) {
  if (isNaN(itemValue)) {
    return lowercase(itemValue) == lowercase(valueToCheck);
  }

  return parseFloat(itemValue) == parseFloat(valueToCheck);
}

function includes(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  valueToCheck = String(valueToCheck || '').toLowerCase();

  return makeArray(valueToCheck.split(','))
    .some(valueToCheckItem => itemValue.includes(valueToCheckItem));
}

function startsWith(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  valueToCheck = String(valueToCheck || '').toLowerCase();

  return makeArray(valueToCheck.split(','))
    .some(valueToCheckItem => itemValue.startsWith(valueToCheckItem.trim()));
}

function endsWith(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  valueToCheck = String(valueToCheck || '').toLowerCase();

  return makeArray(valueToCheck.split(','))
    .some(valueToCheckItem => itemValue.endsWith(valueToCheckItem.trim()));
}

export function buildDefaultRuleMethods() {
  return {
    '>=': (itemValue, valueToCheck) => parseFloat(itemValue) >= parseFloat(valueToCheck),
    '>': (itemValue, valueToCheck) => parseFloat(itemValue) > parseFloat(valueToCheck),
    '=': equals,
    'is not': (itemValue, valueToCheck) => !equals(itemValue, valueToCheck),
    '<=': (itemValue, valueToCheck) => parseFloat(itemValue) <= parseFloat(valueToCheck),
    '<': (itemValue, valueToCheck) => parseFloat(itemValue) < parseFloat(valueToCheck),
    includes,
    excludes: (itemValue, valueToCheck) => !includes(itemValue, valueToCheck),
    contains: includes,
    startsWith,
    endsWith
  };
}

export function buildTabRulesForId(allRules = [], tabId) {
  const rulesForTab = allRules.filter(ruleItem => {
    const applyForTabs = Array.isArray(ruleItem?.applyForTabs) ? ruleItem.applyForTabs : [];
    const applyForTabsIsGlobal = applyForTabs.includes('_GLOBAL');
    const applyForTabMatchesTabId = applyForTabs.includes(tabId);

    return applyForTabsIsGlobal || applyForTabMatchesTabId;
  });

  const globalRules = allRules.filter(ruleItem => {
    const applyForTabs = Array.isArray(ruleItem?.applyForTabs) ? ruleItem.applyForTabs : [];
    return applyForTabs.includes('_GLOBAL');
  });

  return [
    ...rulesForTab,
    ...globalRules
  ];
}

function getItemValue(item, propName) {
  if (propName === 'category') {
    return item.personal_finance_category?.primary;
  }

  return item[propName];
}

function formatPersonalFinanceCategory(item) {
  if (!item.personal_finance_category || typeof item.personal_finance_category !== 'object') {
    item.personal_finance_category = { primary: 'misc' };
    return;
  }

  const { primary } = item.personal_finance_category;
  if (!primary) {
    item.personal_finance_category.primary = 'misc';
    return;
  }

  const lower = String(primary).toLowerCase();
  item.personal_finance_category.primary = lower.split('_').join(' ');
}

function groupByDate(a, b) {
  const months = {
    jan: 0, feb: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const [yearA, monthA] = String(a?.[0] || '').split(' ');
  const [yearB, monthB] = String(b?.[0] || '').split(' ');

  if (yearA !== yearB) {
    return yearB - yearA;
  }

  return (months[monthB] || 0) - (months[monthA] || 0);
}

function extractRuleConditions(rule) {
  const conditions = [{
    combinator: 'and',
    itemPropName: rule[1],
    ruleMethodName: rule[2],
    criterion: rule[3]
  }];

  for (let i = 5; i < rule.length; i += 4) {
    const combinator = normalizeConditionCombinator(rule[i]);
    const itemPropName = rule[i + 1];
    const ruleMethodName = rule[i + 2];
    const criterion = rule[i + 3];

    conditions.push({ combinator, itemPropName, ruleMethodName, criterion });
  }

  return conditions;
}

function buildConditionMethod(itemPropName, ruleMethodName, criterion, ruleMethods) {
  if (!itemPropName || !ruleMethodName) {
    return null;
  }

  return (item) => {
    const itemValue = getItemValue(item, itemPropName);
    const method = ruleMethods[ruleMethodName];

    if (!method) {
      return false;
    }

    return method(itemValue, criterion);
  };
}

function buildRuleMethod(ruleConditions, ruleMethods) {
  const resolvedConditions = ruleConditions
    .map(({ combinator, itemPropName, ruleMethodName, criterion }) => ({
      combinator: normalizeConditionCombinator(combinator),
      method: buildConditionMethod(itemPropName, ruleMethodName, criterion, ruleMethods)
    }))
    .filter(({ method }) => !!method);

  if (!resolvedConditions.length) {
    return () => false;
  }

  const groupedConditions = [];
  let currentGroup = [];

  resolvedConditions.forEach(({ combinator, method }, index) => {
    const joinOperator = index === 0
      ? 'and'
      : normalizeConditionCombinator(combinator);

    if (joinOperator === 'or' && currentGroup.length) {
      groupedConditions.push(currentGroup);
      currentGroup = [method];
      return;
    }

    currentGroup.push(method);
  });

  if (currentGroup.length) {
    groupedConditions.push(currentGroup);
  }

  return (item) => groupedConditions.some(conditionGroup =>
    conditionGroup.every(conditionMethod => conditionMethod(item))
  );
}

function normalizeConditionCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function extractRules(tabRules, ruleMethods) {
  const sorters = [];
  const categorizers = [];
  const filters = [];
  const propToGroupBy = [];

  for (const ruleConfig of tabRules) {
    const rule = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];
    const [ruleType, itemPropName, , , categorizeAs] = rule;

    const ruleConditions = extractRuleConditions(rule);
    const ruleMethod = buildRuleMethod(ruleConditions, ruleMethods);

    const { orderOfExecution, _isImportant } = ruleConfig || {};

    if (ruleType === 'groupBy') {
      propToGroupBy.push(itemPropName);
    }

    if (ruleType === 'sort') {
      sorters.push({ itemPropName, orderOfExecution });
    }

    if (ruleType === 'categorize') {
      categorizers.push({
        _id: ruleConfig?._id,
        method: ruleMethod,
        categorizeAs,
        orderOfExecution,
        _isImportant
      });
    }

    if (ruleType === 'filter') {
      filters.push({
        method: ruleMethod,
        filterJoinOperator: normalizeFilterJoinOperator(ruleConfig?.filterJoinOperator),
        orderOfExecution
      });
    }
  }

  return [
    sorters.sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0)),
    categorizers.sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0)),
    filters.sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0)),
    propToGroupBy
  ];
}

function normalizeFilterJoinOperator(filterJoinOperator) {
  return String(filterJoinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function buildSortMethod(sorters) {
  return (arrayToSort) => {
    const arrayCopy = arrayToSort.map(item => JSON.parse(JSON.stringify(item)));

    if (!sorters.length) {
      sorters.push({ itemPropName: '-date' });
    }

    for (const { itemPropName } of sorters) {
      if (!itemPropName) {
        continue;
      }

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
    if (item.recategorizeAs) {
      item.personal_finance_category.primary = String(item.recategorizeAs).trim().toLowerCase();
      return item.personal_finance_category.primary;
    }

    formatPersonalFinanceCategory(item);

    if (!categorizers.length) {
      return item.personal_finance_category.primary;
    }

    let importantCategory = null;

    for (const categorizeConfig of categorizers) {
      if (!categorizeConfig.method) continue;

      const conditionMet = categorizeConfig.method(item);

      if (conditionMet) {
        const categoryName = String(categorizeConfig.categorizeAs || 'misc').toLowerCase();

        if (categorizeConfig._isImportant) {
          importantCategory = categoryName;
        }

        item.rulesApplied = item.rulesApplied || new Set();
        if (!item.rulesApplied.has(categorizeConfig._id)) {
          item.rulesApplied.add(categorizeConfig._id);
        }

        item.personal_finance_category.primary = importantCategory || categoryName;
      }
    }

    return item.personal_finance_category.primary;
  };
}

function buildFilterMethod(filters) {
  const filterGroups = groupFiltersByOr(filters);

  return (item) => {
    if (!filters.length) return true;

    return filterGroups.some(filterGroup =>
      filterGroup.every(filterConfig => filterConfig.method(item))
    );
  };
}

function groupFiltersByOr(filters) {
  if (!filters.length) {
    return [];
  }

  const groupedFilters = [];
  let currentGroup = [];

  filters.forEach((filterConfig, index) => {
    const joinOperator = index === 0
      ? 'and'
      : normalizeFilterJoinOperator(filterConfig.filterJoinOperator);

    if (joinOperator === 'or' && currentGroup.length) {
      groupedFilters.push(currentGroup);
      currentGroup = [filterConfig];
      return;
    }

    currentGroup.push(filterConfig);
  });

  if (currentGroup.length) {
    groupedFilters.push(currentGroup);
  }

  return groupedFilters;
}

function buildGroupByMethod(propToGroupByArray, months, getDayOfWeekPST) {
  const groupByMethods = {
    category: (item) => item.personal_finance_category?.primary || 'misc',
    year: (item) => {
      const [year] = String(item.authorized_date || item.date || '').split('-');
      return year;
    },
    month: (item) => {
      const [, month] = String(item.authorized_date || item.date || '').split('-');
      return months[Number(month) - 1] || 'misc';
    },
    year_month: (item) => {
      const [year, month] = String(item.authorized_date || item.date || '').split('-');
      return `${year} ${months[Number(month) - 1] || 'misc'}`;
    },
    day: (item) => {
      const [, month, day] = String(item.authorized_date || item.date || '').split('-');
      return `${months[Number(month) - 1] || 'misc'}, ${day}`;
    },
    date: (item) => {
      const [, month, day] = String(item.authorized_date || item.date || '').split('-');
      return `${months[Number(month) - 1] || 'misc'}, ${day}`;
    },
    weekday: (item) => getDayOfWeekPST(item.authorized_date || item.date)
  };

  const propToGroupBy = propToGroupByArray[0];
  const groupByMethod = groupByMethods[propToGroupBy];

  if (!groupByMethod) {
    return (item) => groupByMethods.category(item);
  }

  return (item) => groupByMethod(item);
}

function buildRuleMethods(tabRules, options) {
  const [sorters, categorizers, filters, propToGroupBy] = extractRules(tabRules, options.ruleMethods);

  return {
    sort: buildSortMethod(sorters),
    categorize: buildCategorizeMethod(categorizers),
    filter: buildFilterMethod(filters),
    groupBy: buildGroupByMethod(propToGroupBy, options.months, options.getDayOfWeekPST),
    propToGroupBy: propToGroupBy[0] || 'category'
  };
}

export function evaluateTabData({
  tab,
  transactions,
  tabRules = [],
  ruleMethods = buildDefaultRuleMethods(),
  getDayOfWeekPST = defaultGetDayOfWeekPST,
  months = DEFAULT_MONTHS
}) {
  if (!tab || !Array.isArray(transactions) || !transactions.length) {
    return {
      tabTotal: 0,
      categorizedItems: []
    };
  }

  const { filter, sort, categorize, groupBy, propToGroupBy } = buildRuleMethods(tabRules, {
    ruleMethods,
    getDayOfWeekPST,
    months
  });

  const dataCopy = sort(transactions);
  const categorizedItems = [];
  let tabTotal = 0;

  for (const item of dataCopy) {
    item.amount *= -1;

    categorize(item);

    const typeToGroupBy = groupBy(item);

    if (!filter(item)) continue;

    const amount = parseFloat(item.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    tabTotal += safeAmount;

    if (!tab.isSelected) continue;

    const storedCategory = categorizedItems.find(([storedGroupByName]) =>
      storedGroupByName === typeToGroupBy
    );

    if (storedCategory) {
      storedCategory[1].push(item);
      storedCategory[2] = storedCategory[2] + safeAmount;
    } else {
      categorizedItems.push([typeToGroupBy, [item], safeAmount]);
    }
  }

  if (!['year', 'month', 'day', 'year_month'].includes(propToGroupBy)) {
    if (tabTotal > 0) {
      categorizedItems.sort((a, b) => b[2] - a[2]);
    } else {
      categorizedItems.sort((a, b) => a[2] - b[2]);
    }
  } else {
    categorizedItems.sort(groupByDate);
  }

  return {
    tabTotal,
    categorizedItems
  };
}

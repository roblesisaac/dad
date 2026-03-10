const DEFAULT_MONTHS = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const NO_GROUPING_RULE_VALUE = 'none';
export const NO_GROUPING_CATEGORY_NAME = 'all transactions';
const WEEKDAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function defaultGetDayOfWeekPST(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/Los_Angeles'
  });
}

function lowercase(string) {
  return typeof string === 'string' ? string.toLowerCase() : string;
}

function parseTextMatchTerms(valueToCheck) {
  return String(valueToCheck || '')
    .toLowerCase()
    .split(/[\n,]/)
    .map(term => term.trim())
    .filter(Boolean);
}

function isAccountProperty(propName) {
  return String(propName || '').trim().toLowerCase() === 'account';
}

function normalizeAccountIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function itemAccountIdentifiers(item) {
  const candidates = [
    item?.account_id,
    item?.accountId,
    item?.id,
    item?._id
  ];

  if (item?.account && typeof item.account === 'object') {
    candidates.push(
      item.account?.account_id,
      item.account?.accountId,
      item.account?.id,
      item.account?._id
    );
  } else {
    candidates.push(item?.account);
  }

  return [...new Set(
    candidates
      .map(normalizeAccountIdentifier)
      .filter(Boolean)
  )];
}

function accountCriterionMatchesItem(item, criterion) {
  const criterionTerms = parseTextMatchTerms(criterion).map(normalizeAccountIdentifier);
  if (!criterionTerms.length) {
    return false;
  }

  const criterionSet = new Set(criterionTerms);
  return itemAccountIdentifiers(item).some(identifier => criterionSet.has(identifier));
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUtcDateStamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  if (typeof value === 'number') {
    return null;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (normalized === 'today') {
    return Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  }

  if (normalized === 'yesterday') {
    currentDate.setDate(currentDate.getDate() - 1);
    return Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  }

  if (normalized === 'tomorrow') {
    currentDate.setDate(currentDate.getDate() + 1);
    return Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  }

  if (normalized === 'firstofmonth') {
    return Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  if (normalized === 'firstofyear') {
    return Date.UTC(currentDate.getFullYear(), 0, 1);
  }

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const dateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[t\s].+$/);
  if (dateTimeMatch) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  }

  return null;
}

function compareDates(itemValue, valueToCheck, comparator) {
  const leftDateStamp = toUtcDateStamp(itemValue);
  const rightDateStamp = toUtcDateStamp(valueToCheck);

  if (leftDateStamp === null || rightDateStamp === null) {
    return null;
  }

  return comparator(leftDateStamp, rightDateStamp);
}

function compareNumbersOrDates(itemValue, valueToCheck, comparator) {
  const dateComparisonResult = compareDates(itemValue, valueToCheck, comparator);
  if (dateComparisonResult !== null) {
    return dateComparisonResult;
  }

  const leftNumber = toFiniteNumber(itemValue);
  const rightNumber = toFiniteNumber(valueToCheck);

  if (leftNumber === null || rightNumber === null) {
    return false;
  }

  return comparator(leftNumber, rightNumber);
}

function equals(itemValue, valueToCheck) {
  const dateComparisonResult = compareDates(itemValue, valueToCheck, (left, right) => left === right);
  if (dateComparisonResult !== null) {
    return dateComparisonResult;
  }

  const leftNumber = toFiniteNumber(itemValue);
  const rightNumber = toFiniteNumber(valueToCheck);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber === rightNumber;
  }

  return lowercase(itemValue) == lowercase(valueToCheck);
}

function includes(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  const valueTerms = parseTextMatchTerms(valueToCheck);
  if (!valueTerms.length) {
    return false;
  }

  return valueTerms.some(valueToCheckItem => itemValue.includes(valueToCheckItem));
}

function startsWith(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  const valueTerms = parseTextMatchTerms(valueToCheck);
  if (!valueTerms.length) {
    return false;
  }

  return valueTerms.some(valueToCheckItem => itemValue.startsWith(valueToCheckItem));
}

function endsWith(itemValue, valueToCheck) {
  itemValue = String(itemValue || '').toLowerCase();
  const valueTerms = parseTextMatchTerms(valueToCheck);
  if (!valueTerms.length) {
    return false;
  }

  return valueTerms.some(valueToCheckItem => itemValue.endsWith(valueToCheckItem));
}

export function buildDefaultRuleMethods() {
  return {
    '>=': (itemValue, valueToCheck) => compareNumbersOrDates(itemValue, valueToCheck, (left, right) => left >= right),
    '>': (itemValue, valueToCheck) => compareNumbersOrDates(itemValue, valueToCheck, (left, right) => left > right),
    '=': equals,
    'is not': (itemValue, valueToCheck) => !equals(itemValue, valueToCheck),
    '<=': (itemValue, valueToCheck) => compareNumbersOrDates(itemValue, valueToCheck, (left, right) => left <= right),
    '<': (itemValue, valueToCheck) => compareNumbersOrDates(itemValue, valueToCheck, (left, right) => left < right),
    'is before': (itemValue, valueToCheck) => compareDates(itemValue, valueToCheck, (left, right) => left < right) === true,
    'is after': (itemValue, valueToCheck) => compareDates(itemValue, valueToCheck, (left, right) => left > right) === true,
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
  if (isGlobalCategoryProperty(propName)) {
    return item._globalCategory || item.personal_finance_category?.primary;
  }

  if (propName === 'category') {
    return item.personal_finance_category?.primary;
  }

  if (isAccountProperty(propName)) {
    return item?.account_id || item?.accountId || item?.account || '';
  }

  if (propName === 'date') {
    return item.authorized_date || item.date;
  }

  return item[propName];
}

function isGlobalCategoryProperty(propName) {
  const normalizedPropName = String(propName || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return normalizedPropName === 'globalcategory';
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

function parseMonthIndex(rawMonthValue) {
  const monthValue = String(rawMonthValue || '').toLowerCase().trim().replace(',', '');
  const monthMap = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  return Number.isFinite(monthMap[monthValue])
    ? monthMap[monthValue]
    : null;
}

function compareGroupLabelsByDateMode(labelA, labelB, groupByMode) {
  if (groupByMode === 'year') {
    const yearA = Number(String(labelA || '').trim());
    const yearB = Number(String(labelB || '').trim());

    if (Number.isFinite(yearA) && Number.isFinite(yearB)) {
      return yearA - yearB;
    }

    return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
  }

  if (groupByMode === 'month') {
    const monthA = parseMonthIndex(labelA);
    const monthB = parseMonthIndex(labelB);

    if (monthA !== null && monthB !== null) {
      return monthA - monthB;
    }

    return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
  }

  if (groupByMode === 'year_month') {
    const [yearA, monthNameA] = String(labelA || '').trim().split(/\s+/);
    const [yearB, monthNameB] = String(labelB || '').trim().split(/\s+/);
    const parsedYearA = Number(yearA);
    const parsedYearB = Number(yearB);

    if (Number.isFinite(parsedYearA) && Number.isFinite(parsedYearB) && parsedYearA !== parsedYearB) {
      return parsedYearA - parsedYearB;
    }

    const monthA = parseMonthIndex(monthNameA);
    const monthB = parseMonthIndex(monthNameB);
    if (monthA !== null && monthB !== null) {
      return monthA - monthB;
    }

    return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
  }

  if (groupByMode === 'date' || groupByMode === 'day') {
    const [monthNameA, dayRawA] = String(labelA || '').split(',');
    const [monthNameB, dayRawB] = String(labelB || '').split(',');
    const monthA = parseMonthIndex(monthNameA);
    const monthB = parseMonthIndex(monthNameB);
    const dayA = Number(String(dayRawA || '').trim());
    const dayB = Number(String(dayRawB || '').trim());

    if (monthA !== null && monthB !== null && monthA !== monthB) {
      return monthA - monthB;
    }

    if (Number.isFinite(dayA) && Number.isFinite(dayB)) {
      return dayA - dayB;
    }

    return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
  }

  if (groupByMode === 'weekday') {
    const weekdayA = String(labelA || '').toLowerCase().trim();
    const weekdayB = String(labelB || '').toLowerCase().trim();
    const weekdayIndexA = WEEKDAY_ORDER.indexOf(weekdayA);
    const weekdayIndexB = WEEKDAY_ORDER.indexOf(weekdayB);

    if (weekdayIndexA !== -1 && weekdayIndexB !== -1) {
      return weekdayIndexA - weekdayIndexB;
    }

    return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
  }

  return String(labelA || '').localeCompare(String(labelB || ''), undefined, { sensitivity: 'base' });
}

function resolvePrimarySort(sorters) {
  const [primarySorter] = Array.isArray(sorters) ? sorters : [];
  const sortKey = String(primarySorter?.itemPropName || '').trim();

  if (!sortKey) {
    return { propName: 'date', direction: 'desc' };
  }

  const direction = sortKey.startsWith('-') ? 'desc' : 'asc';
  const propName = normalizeSortPropertyName(sortKey) || 'date';

  return { propName, direction };
}

function shouldSortGroupsBySelectedSort(groupByMode, sortPropName) {
  if (!groupByMode || groupByMode === NO_GROUPING_RULE_VALUE) {
    return false;
  }

  if (groupByMode === 'category') {
    return sortPropName === 'category';
  }

  if (groupByMode === 'name') {
    return sortPropName === 'name';
  }

  if (['year', 'month', 'year_month', 'day', 'date', 'weekday'].includes(groupByMode)) {
    return sortPropName === 'date';
  }

  return false;
}

function shouldSortGroupsByAmount(groupByMode, sortPropName) {
  return Boolean(groupByMode)
    && groupByMode !== NO_GROUPING_RULE_VALUE
    && sortPropName === 'amount';
}

function isCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  return normalizedTarget === 'category' || normalizedTarget === 'name' || normalizedTarget === 'tag';
}

function normalizeCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  if (normalizedTarget === 'name') {
    return 'name';
  }

  if (normalizedTarget === 'tag') {
    return 'tag';
  }

  return 'category';
}

function usesCategorizeSetTargetFormat(rule = []) {
  return Array.isArray(rule)
    && rule[0] === 'categorize'
    && rule.length >= 6
    && (rule.length - 6) % 4 === 0
    && isCategorizeSetTarget(rule[4]);
}

function getCategorizeConditionStartIndex(rule = []) {
  return usesCategorizeSetTargetFormat(rule) ? 6 : 5;
}

function extractCategorizeAssignment(rule = []) {
  if (usesCategorizeSetTargetFormat(rule)) {
    return {
      setTarget: normalizeCategorizeSetTarget(rule[4]),
      setValue: rule[5] ?? ''
    };
  }

  return {
    setTarget: 'category',
    setValue: rule[4] ?? ''
  };
}

function extractRuleConditions(rule) {
  const conditions = [{
    combinator: 'and',
    itemPropName: rule[1],
    ruleMethodName: rule[2],
    criterion: rule[3]
  }];
  const conditionStartIndex = getCategorizeConditionStartIndex(rule);

  for (let i = conditionStartIndex; i < rule.length; i += 4) {
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
    if (isAccountProperty(itemPropName) && (ruleMethodName === '=' || ruleMethodName === 'is not')) {
      const accountMatch = accountCriterionMatchesItem(item, criterion);
      return ruleMethodName === '='
        ? accountMatch
        : !accountMatch;
    }

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

function normalizeSortPropertyName(itemPropName) {
  return String(itemPropName || '').trim().replace(/^-/, '');
}

function buildSortPropertyName(itemPropName, sortDirection) {
  const rawSortPropertyName = String(itemPropName || '').trim();
  const normalizedSortPropertyName = normalizeSortPropertyName(rawSortPropertyName);
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();

  if (!normalizedSortPropertyName) {
    return '';
  }

  const sortDescending = normalizedSortDirection === 'desc'
    || (normalizedSortDirection !== 'asc' && rawSortPropertyName.startsWith('-'));

  return sortDescending
    ? `-${normalizedSortPropertyName}`
    : normalizedSortPropertyName;
}

function extractRules(tabRules, ruleMethods) {
  const sorters = [];
  const categorizers = [];
  const filters = [];
  const propToGroupBy = [];

  for (const ruleConfig of tabRules) {
    const rule = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];
    const [ruleType, itemPropName, ruleMethodName] = rule;
    const categorizeAssignment = extractCategorizeAssignment(rule);

    const ruleConditions = extractRuleConditions(rule);
    const ruleMethod = buildRuleMethod(ruleConditions, ruleMethods);

    const { orderOfExecution, _isImportant } = ruleConfig || {};

    if (ruleType === 'groupBy') {
      propToGroupBy.push(itemPropName);
    }

    if (ruleType === 'sort') {
      sorters.push({
        itemPropName: buildSortPropertyName(itemPropName, ruleMethodName),
        orderOfExecution
      });
    }

    if (ruleType === 'categorize') {
      categorizers.push({
        _id: ruleConfig?._id,
        method: ruleMethod,
        categorizeAs: categorizeAssignment.setValue,
        setTarget: categorizeAssignment.setTarget,
        setValue: categorizeAssignment.setValue,
        orderOfExecution,
        _isImportant,
        _isGlobalCategorizeRule: Boolean(ruleConfig?._isGlobalCategorizeRule)
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
    dedupeCategorizersById(categorizers.sort((a, b) => {
      if (a._isGlobalCategorizeRule !== b._isGlobalCategorizeRule) {
        return a._isGlobalCategorizeRule ? -1 : 1;
      }

      return (a.orderOfExecution || 0) - (b.orderOfExecution || 0);
    })),
    filters.sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0)),
    propToGroupBy
  ];
}

function dedupeCategorizersById(categorizers = []) {
  const deduped = [];
  const seenRuleIds = new Set();

  for (const categorizeConfig of Array.isArray(categorizers) ? categorizers : []) {
    const ruleId = String(categorizeConfig?._id || '').trim();
    if (ruleId && seenRuleIds.has(ruleId)) {
      continue;
    }

    if (ruleId) {
      seenRuleIds.add(ruleId);
    }

    deduped.push(categorizeConfig);
  }

  return deduped;
}

function normalizeFilterJoinOperator(filterJoinOperator) {
  return String(filterJoinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function compareSortValues(valueA, valueB) {
  const aDateStamp = toUtcDateStamp(valueA);
  const bDateStamp = toUtcDateStamp(valueB);
  if (aDateStamp !== null && bDateStamp !== null) {
    return aDateStamp - bDateStamp;
  }

  const aNumber = toFiniteNumber(valueA);
  const bNumber = toFiniteNumber(valueB);
  if (aNumber !== null && bNumber !== null) {
    return aNumber - bNumber;
  }

  return String(valueA ?? '').toLowerCase().localeCompare(String(valueB ?? '').toLowerCase());
}

function buildSortMethod(sorters) {
  return (arrayToSort) => {
    const arrayCopy = Array.isArray(arrayToSort) ? [...arrayToSort] : [];
    const sortersToApply = sorters.length
      ? sorters
      : [{ itemPropName: '-date' }];

    for (const { itemPropName } of sortersToApply) {
      if (!itemPropName) {
        continue;
      }

      const isInReverse = itemPropName.startsWith('-');
      const propName = isInReverse ? itemPropName.slice(1) : itemPropName;

      arrayCopy.sort((a, b) => {
        const valueA = getItemValue(a, propName);
        const valueB = getItemValue(b, propName);
        const sortResult = compareSortValues(valueA, valueB);

        return isInReverse ? -sortResult : sortResult;
      });
    }

    return arrayCopy;
  };
}

function parseTransactionAmount(value) {
  const directNumber = Number(value);
  if (Number.isFinite(directNumber)) {
    return directNumber;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const isAccountingNegative = /^\(.*\)$/.test(trimmed);

    let normalized = trimmed
      .replace(/\u2212/g, '-')
      .replace(/[$,\s]/g, '');

    if (isAccountingNegative) {
      normalized = `-${normalized.slice(1, -1)}`;
    }

    if (normalized.endsWith('-')) {
      normalized = `-${normalized.slice(0, -1)}`;
    }

    const normalizedNumber = Number(normalized);
    if (Number.isFinite(normalizedNumber)) {
      return normalizedNumber;
    }

    const numericMatch = normalized.match(/-?\d+(?:\.\d+)?/);
    if (numericMatch) {
      const parsedMatch = Number(numericMatch[0]);
      if (Number.isFinite(parsedMatch)) {
        return isAccountingNegative ? parsedMatch * -1 : parsedMatch;
      }
    }

    const parsedFloat = parseFloat(
      normalized.replace(/[^0-9.+-]/g, '')
    );
    if (Number.isFinite(parsedFloat)) {
      return parsedFloat;
    }
  }

  return 0;
}

function createEvaluationItem(item) {
  const normalizedAmount = parseTransactionAmount(item?.amount) * -1;
  const personalFinanceCategory = item?.personal_finance_category;

  return {
    ...item,
    amount: normalizedAmount,
    personal_finance_category: personalFinanceCategory && typeof personalFinanceCategory === 'object'
      ? { ...personalFinanceCategory }
      : personalFinanceCategory
  };
}

function applyCategorizerScope(item, categorizers = []) {
  if (!Array.isArray(categorizers) || !categorizers.length) {
    return item.personal_finance_category.primary;
  }

  let importantCategory = null;

  for (const categorizeConfig of categorizers) {
    if (!categorizeConfig?.method) {
      continue;
    }

    const conditionMet = categorizeConfig.method(item);
    if (!conditionMet) {
      continue;
    }

    item.rulesApplied = item.rulesApplied || new Set();
    if (!item.rulesApplied.has(categorizeConfig._id)) {
      item.rulesApplied.add(categorizeConfig._id);
    }

    const setTarget = normalizeCategorizeSetTarget(categorizeConfig?.setTarget);
    const setValue = categorizeConfig?.setValue ?? categorizeConfig?.categorizeAs ?? '';

    if (setTarget === 'name') {
      const nextName = String(setValue || '').trim();
      if (nextName) {
        item.name = nextName;
      }
      continue;
    }

    if (setTarget === 'tag') {
      const nextTag = String(setValue || '').trim();
      if (nextTag) {
        item.tags = [nextTag];
      }
      continue;
    }

    const categoryName = String(setValue || 'misc').toLowerCase();
    if (categorizeConfig._isImportant) {
      importantCategory = categoryName;
    }

    item.personal_finance_category.primary = importantCategory || categoryName;
  }

  return item.personal_finance_category.primary;
}

function buildCategorizeMethod(categorizers, options = {}) {
  const honorRecategorizeAs = Boolean(options.honorRecategorizeAs);
  const globalCategorizers = categorizers.filter(categorizeConfig => Boolean(categorizeConfig?._isGlobalCategorizeRule));
  const localCategorizers = categorizers.filter(categorizeConfig => !categorizeConfig?._isGlobalCategorizeRule);

  return (item) => {
    formatPersonalFinanceCategory(item);

    // 1) Apply global rules first.
    applyCategorizerScope(item, globalCategorizers);
    item._globalCategory = String(item.personal_finance_category?.primary || '').trim().toLowerCase();

    // 2) Apply recategorizeAs next.
    const recategorizeAs = String(item?.recategorizeAs || '').trim().toLowerCase();
    const hasRecategorizeAs = Boolean(recategorizeAs);
    if (hasRecategorizeAs) {
      item.personal_finance_category.primary = recategorizeAs;
      if (honorRecategorizeAs) {
        return item.personal_finance_category.primary;
      }
    }

    // 3) Apply local/tab categorizers last so they can override recategorizeAs.
    const categoryBeforeLocalRules = String(item.personal_finance_category.primary || '').trim().toLowerCase();
    applyCategorizerScope(item, localCategorizers);

    if (hasRecategorizeAs && categoryBeforeLocalRules === recategorizeAs) {
      const categoryAfterLocalRules = String(item.personal_finance_category.primary || '').trim().toLowerCase();
      if (categoryAfterLocalRules && categoryAfterLocalRules !== recategorizeAs) {
        item._tabRuleOverrodeRecategorizeAs = true;
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
    [NO_GROUPING_RULE_VALUE]: () => NO_GROUPING_CATEGORY_NAME,
    category: (item) => item.personal_finance_category?.primary || 'misc',
    name: (item) => String(item?.name || '').trim() || 'unnamed transaction',
    tag: (item) => {
      const rawTags = item?.tags;
      if (Array.isArray(rawTags)) {
        const firstTag = rawTags
          .map(tag => String(tag || '').trim())
          .find(Boolean);
        return firstTag || 'untagged';
      }

      if (typeof rawTags === 'string') {
        const tag = rawTags.trim();
        return tag || 'untagged';
      }

      return 'untagged';
    },
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
    categorize: buildCategorizeMethod(categorizers, {
      honorRecategorizeAs: options.honorRecategorizeAs
    }),
    filter: buildFilterMethod(filters),
    groupBy: buildGroupByMethod(propToGroupBy, options.months, options.getDayOfWeekPST),
    propToGroupBy: propToGroupBy[0] || 'category',
    sorters
  };
}

export function evaluateTabData({
  tab,
  transactions,
  tabRules = [],
  ruleMethods = buildDefaultRuleMethods(),
  honorRecategorizeAs,
  getDayOfWeekPST = defaultGetDayOfWeekPST,
  months = DEFAULT_MONTHS
}) {
  if (!tab || !Array.isArray(transactions) || !transactions.length) {
    return {
      tabTotal: 0,
      categorizedItems: [],
      hiddenItems: [],
      groupByMode: 'category',
      overriddenRecategorizeCount: 0
    };
  }

  const { filter, sort, categorize, groupBy, propToGroupBy, sorters } = buildRuleMethods(tabRules, {
    ruleMethods,
    getDayOfWeekPST,
    months,
    honorRecategorizeAs: typeof honorRecategorizeAs === 'boolean'
      ? honorRecategorizeAs
      : Boolean(tab?.honorRecategorizeAs)
  });

  const dataCopy = sort(transactions);
  const categorizedItems = [];
  const categorizedItemsByGroup = new Map();
  const hiddenItems = [];
  let tabTotal = 0;
  let overriddenRecategorizeCount = 0;

  for (const sourceItem of dataCopy) {
    const item = createEvaluationItem(sourceItem);

    categorize(item);
    if (item._tabRuleOverrodeRecategorizeAs) {
      overriddenRecategorizeCount += 1;
    }

    const typeToGroupBy = groupBy(item);

    const passesFilter = filter(item);
    if (!passesFilter) {
      if (tab.isSelected) {
        hiddenItems.push(item);
      }
      continue;
    }

    const amount = parseFloat(item.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    tabTotal += safeAmount;

    if (!tab.isSelected) continue;

    const storedCategory = categorizedItemsByGroup.get(typeToGroupBy);

    if (storedCategory) {
      storedCategory[1].push(item);
      storedCategory[2] = storedCategory[2] + safeAmount;
    } else {
      const nextCategory = [typeToGroupBy, [item], safeAmount];
      categorizedItems.push(nextCategory);
      categorizedItemsByGroup.set(typeToGroupBy, nextCategory);
    }
  }

  const primarySort = resolvePrimarySort(sorters);

  if (shouldSortGroupsByAmount(propToGroupBy, primarySort.propName)) {
    categorizedItems.sort((a, b) => {
      const totalA = Number(a?.[2] || 0);
      const totalB = Number(b?.[2] || 0);
      const amountSortResult = totalA - totalB;

      if (amountSortResult !== 0) {
        return primarySort.direction === 'desc'
          ? -amountSortResult
          : amountSortResult;
      }

      return compareGroupLabelsByDateMode(a?.[0], b?.[0], propToGroupBy);
    });
  } else if (shouldSortGroupsBySelectedSort(propToGroupBy, primarySort.propName)) {
    categorizedItems.sort((a, b) => {
      const labelSortResult = compareGroupLabelsByDateMode(a?.[0], b?.[0], propToGroupBy);
      return primarySort.direction === 'desc'
        ? -labelSortResult
        : labelSortResult;
    });
  } else if (['year', 'month', 'day', 'date', 'year_month'].includes(propToGroupBy)) {
    categorizedItems.sort((a, b) => compareGroupLabelsByDateMode(a?.[0], b?.[0], propToGroupBy) * -1);
  } else {
    if (tabTotal > 0) {
      categorizedItems.sort((a, b) => b[2] - a[2]);
    } else {
      categorizedItems.sort((a, b) => a[2] - b[2]);
    }
  }

  return {
    tabTotal,
    categorizedItems,
    hiddenItems,
    groupByMode: propToGroupBy || 'category',
    overriddenRecategorizeCount
  };
}

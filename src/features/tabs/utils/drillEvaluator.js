import { evaluateTabData, buildDefaultRuleMethods } from '@/features/tabs/utils/tabEvaluator.js';
import {
  globalCategorizeRules,
  levelRulesForDepth,
  normalizeTabWithDrillSchema
} from '@/features/tabs/utils/drillSchema.js';

function defaultGetDayOfWeekPST(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/Los_Angeles'
  });
}

const DEFAULT_MONTHS = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NO_GROUPING_RULE_VALUE = 'none';
const DEFAULT_SORT_PROPERTY = 'date';
const DEFAULT_SORT_DIRECTION = 'desc';

function normalizeSortPropertyName(rawSortPropertyName) {
  return String(rawSortPropertyName || '').trim().replace(/^-/, '').toLowerCase();
}

function normalizeSortDirection(sortDirection, rawSortPropertyName = '') {
  const normalizedSortDirection = String(sortDirection || '').trim().toLowerCase();
  if (normalizedSortDirection === 'asc' || normalizedSortDirection === 'desc') {
    return normalizedSortDirection;
  }

  return String(rawSortPropertyName || '').trim().startsWith('-')
    ? 'desc'
    : DEFAULT_SORT_DIRECTION;
}

function resolvePrimarySort(levelRuleConfigs = []) {
  const sortRuleConfigs = (Array.isArray(levelRuleConfigs) ? levelRuleConfigs : [])
    .filter(ruleConfig => Array.isArray(ruleConfig?.rule) && ruleConfig.rule[0] === 'sort')
    .sort((a, b) => Number(a?.orderOfExecution || 0) - Number(b?.orderOfExecution || 0));
  const [primarySortRule] = sortRuleConfigs;
  const rawSortProperty = String(primarySortRule?.rule?.[1] || '').trim();
  const sortProperty = normalizeSortPropertyName(rawSortProperty) || DEFAULT_SORT_PROPERTY;
  const sortDirection = normalizeSortDirection(primarySortRule?.rule?.[2], rawSortProperty);

  return {
    sortProperty,
    sortDirection
  };
}

function primaryTag(item) {
  const normalizeTagValue = (rawValue) => {
    if (Array.isArray(rawValue)) {
      return rawValue
        .map(tag => String(tag || '').trim())
        .find(Boolean) || '';
    }

    if (typeof rawValue === 'string') {
      return rawValue.trim();
    }

    return '';
  };

  const tagsValue = normalizeTagValue(item?.tags);
  if (tagsValue) {
    return tagsValue;
  }

  return normalizeTagValue(item?.tag);
}

function compareTextValues(valueA, valueB) {
  return String(valueA || '').toLowerCase().localeCompare(String(valueB || '').toLowerCase());
}

function resolveGroupSortTag(groupItems = [], sortDirection = DEFAULT_SORT_DIRECTION) {
  const items = Array.isArray(groupItems) ? groupItems : [];
  if (!items.length) {
    return '';
  }

  const prefersHigherValues = String(sortDirection || '').toLowerCase() === 'desc';
  let selectedTag = primaryTag(items[0]) || 'untagged';

  for (let index = 1; index < items.length; index += 1) {
    const nextTag = primaryTag(items[index]) || 'untagged';
    const comparison = compareTextValues(nextTag, selectedTag);
    if ((prefersHigherValues && comparison > 0) || (!prefersHigherValues && comparison < 0)) {
      selectedTag = nextTag;
    }
  }

  return selectedTag;
}

function normalizeRecategorizeBehaviorDecision(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'honor' || normalizedValue === 'override') {
    return normalizedValue;
  }

  return '';
}

function resolveRecategorizeBehaviorState({ tab, level, depth = 0 } = {}) {
  const levelDecision = normalizeRecategorizeBehaviorDecision(level?.recategorizeBehaviorDecision);
  if (levelDecision) {
    return {
      decision: levelDecision,
      hasDecision: true,
      honorRecategorizeAs: levelDecision === 'honor'
    };
  }

  if (level?.honorRecategorizeAs === true) {
    return {
      decision: 'honor',
      hasDecision: true,
      honorRecategorizeAs: true
    };
  }

  if (Number(depth) !== 0) {
    return {
      decision: '',
      hasDecision: false,
      honorRecategorizeAs: false
    };
  }

  const tabDecision = normalizeRecategorizeBehaviorDecision(tab?.recategorizeBehaviorDecision);
  if (tabDecision) {
    return {
      decision: tabDecision,
      hasDecision: true,
      honorRecategorizeAs: tabDecision === 'honor'
    };
  }

  if (tab?.honorRecategorizeAs === true) {
    return {
      decision: 'honor',
      hasDecision: true,
      honorRecategorizeAs: true
    };
  }

  return {
    decision: '',
    hasDecision: false,
    honorRecategorizeAs: false
  };
}

export function getTransactionKey(transaction) {
  if (!transaction) {
    return '';
  }

  return String(
    transaction.transaction_id
      || transaction._id
      || `${transaction.account_id || ''}-${transaction.authorized_date || transaction.date || ''}-${transaction.amount || ''}-${transaction.name || ''}`
  );
}

function normalizePath(path = []) {
  return (Array.isArray(path) ? path : [])
    .map((segment) => String(segment || '').trim())
    .filter(Boolean);
}

function buildOriginalLookup(transactions = []) {
  const lookup = new Map();

  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    const key = getTransactionKey(transaction);
    if (!key) {
      continue;
    }

    if (!lookup.has(key)) {
      lookup.set(key, []);
    }

    lookup.get(key).push(transaction);
  }

  return lookup;
}

function extractOriginalItemsFromProcessed(processedItems = [], originalLookup) {
  const originals = [];

  for (const processedItem of processedItems) {
    const key = getTransactionKey(processedItem);
    if (!key || !originalLookup.has(key)) {
      continue;
    }

    const originalCandidates = originalLookup.get(key);
    const [matchedOriginal] = originalCandidates;

    if (!matchedOriginal) {
      continue;
    }

    originals.push(matchedOriginal);
    originalCandidates.shift();
  }

  return originals;
}

function evaluateLevel({
  tab,
  transactions,
  levelRuleConfigs,
  honorRecategorizeAs,
  sharedGlobalCategorizeRules,
  ruleMethods,
  getDayOfWeekPST,
  months
}) {
  const globalCategorizeRuleConfigs = (Array.isArray(sharedGlobalCategorizeRules) ? sharedGlobalCategorizeRules : [])
    .map(ruleConfig => ({
      ...ruleConfig,
      _isGlobalCategorizeRule: true
    }));
  const combinedRules = [
    ...globalCategorizeRuleConfigs,
    ...(Array.isArray(levelRuleConfigs) ? levelRuleConfigs : [])
  ];
  const sourceTransactions = Array.isArray(transactions) ? transactions : [];
  const originalLookup = buildOriginalLookup(sourceTransactions);
  const primarySort = resolvePrimarySort(levelRuleConfigs);

  const evaluation = evaluateTabData({
    tab: {
      ...tab,
      isSelected: true
    },
    transactions: sourceTransactions,
    tabRules: combinedRules,
    honorRecategorizeAs: Boolean(honorRecategorizeAs),
    ruleMethods,
    getDayOfWeekPST,
    months
  });
  const groups = (evaluation.categorizedItems || []).map(([label, items, total]) => {
    const groupItems = Array.isArray(items) ? items : [];
    const originalItems = extractOriginalItemsFromProcessed(groupItems, originalLookup);
    const key = String(label || '').trim().toLowerCase();
    const sortTag = primarySort.sortProperty === 'tag'
      ? resolveGroupSortTag(groupItems, primarySort.sortDirection)
      : '';

    return {
      key,
      label: String(label || ''),
      total: Number.isFinite(Number(total)) ? Number(total) : 0,
      count: originalItems.length,
      sortTag,
      items: groupItems,
      originalItems
    };
  });

  return {
    tabTotal: Number.isFinite(Number(evaluation.tabTotal)) ? Number(evaluation.tabTotal) : 0,
    groupByMode: String(evaluation.groupByMode || 'category'),
    sortProperty: primarySort.sortProperty,
    sortDirection: primarySort.sortDirection,
    hiddenItems: Array.isArray(evaluation.hiddenItems) ? evaluation.hiddenItems : [],
    overriddenRecategorizeCount: Number.isFinite(Number(evaluation.overriddenRecategorizeCount))
      ? Number(evaluation.overriddenRecategorizeCount)
      : 0,
    groups,
    transactions: groups.flatMap((group) => group.items)
  };
}

function findGroupByPathKey(groups = [], pathKey = '') {
  const normalizedPathKey = String(pathKey || '').trim().toLowerCase();
  if (!normalizedPathKey) {
    return null;
  }

  return groups.find((group) => group.key === normalizedPathKey) || null;
}

export function resolveDrillState({
  tab,
  transactions,
  allRules = [],
  drillPath = [],
  ruleMethods = buildDefaultRuleMethods(),
  getDayOfWeekPST = defaultGetDayOfWeekPST,
  months = DEFAULT_MONTHS
}) {
  if (!tab) {
    return {
      tabTotal: 0,
      currentLevelTotal: 0,
      depth: 0,
      validPath: [],
      breadcrumbs: [],
      groups: [],
      transactions: [],
      hiddenItems: [],
      groupByMode: NO_GROUPING_RULE_VALUE,
      sortProperty: DEFAULT_SORT_PROPERTY,
      sortDirection: DEFAULT_SORT_DIRECTION,
      isLeaf: true,
      overriddenRecategorizeCount: 0,
      honorRecategorizeAs: false,
      hasRecategorizeBehaviorDecision: false,
      recategorizeBehaviorDecision: ''
    };
  }

  const normalizedTab = normalizeTabWithDrillSchema(tab, allRules);
  const sharedGlobalCategorizeRules = globalCategorizeRules(allRules);
  const normalizedPath = normalizePath(drillPath);

  let rootTabTotal = 0;
  let currentSubset = Array.isArray(transactions) ? transactions : [];
  const validPath = [];
  const breadcrumbs = [];

  for (let depth = 0; depth <= normalizedPath.length; depth += 1) {
    const { level, ruleConfigs } = levelRulesForDepth(normalizedTab.drillSchema, depth, validPath);
    const recategorizeBehaviorState = resolveRecategorizeBehaviorState({
      tab: normalizedTab,
      level,
      depth
    });

    const levelResult = evaluateLevel({
      tab: normalizedTab,
      transactions: currentSubset,
      levelRuleConfigs: ruleConfigs,
      honorRecategorizeAs: recategorizeBehaviorState.honorRecategorizeAs,
      sharedGlobalCategorizeRules,
      ruleMethods,
      getDayOfWeekPST,
      months
    });

    if (depth === 0) {
      rootTabTotal = levelResult.tabTotal;
    }

    const requestedPathKey = normalizedPath[depth];

    if (requestedPathKey) {
      const matchedGroup = findGroupByPathKey(levelResult.groups, requestedPathKey);
      if (!matchedGroup) {
        return {
          tabTotal: rootTabTotal,
          currentLevelTotal: levelResult.tabTotal,
          depth,
          validPath,
          breadcrumbs,
          groups: levelResult.groups,
          transactions: levelResult.transactions,
          hiddenItems: levelResult.hiddenItems,
          groupByMode: levelResult.groupByMode,
          sortProperty: levelResult.sortProperty,
          sortDirection: levelResult.sortDirection,
          isLeaf: levelResult.groupByMode === NO_GROUPING_RULE_VALUE,
          overriddenRecategorizeCount: levelResult.overriddenRecategorizeCount,
          honorRecategorizeAs: recategorizeBehaviorState.honorRecategorizeAs,
          hasRecategorizeBehaviorDecision: recategorizeBehaviorState.hasDecision,
          recategorizeBehaviorDecision: recategorizeBehaviorState.decision
        };
      }

      validPath.push(matchedGroup.key);
      breadcrumbs.push({
        key: matchedGroup.key,
        label: matchedGroup.label,
        depth,
        total: matchedGroup.total,
        count: matchedGroup.count
      });
      currentSubset = matchedGroup.originalItems;
      continue;
    }

    return {
      tabTotal: rootTabTotal,
      currentLevelTotal: levelResult.tabTotal,
      depth,
      validPath,
      breadcrumbs,
      groups: levelResult.groups,
      transactions: levelResult.transactions,
      hiddenItems: levelResult.hiddenItems,
      groupByMode: levelResult.groupByMode,
      sortProperty: levelResult.sortProperty,
      sortDirection: levelResult.sortDirection,
      isLeaf: levelResult.groupByMode === NO_GROUPING_RULE_VALUE,
      overriddenRecategorizeCount: levelResult.overriddenRecategorizeCount,
      honorRecategorizeAs: recategorizeBehaviorState.honorRecategorizeAs,
      hasRecategorizeBehaviorDecision: recategorizeBehaviorState.hasDecision,
      recategorizeBehaviorDecision: recategorizeBehaviorState.decision
    };
  }

  const fallbackDepth = validPath.length;
  const { level: fallbackLevel, ruleConfigs } = levelRulesForDepth(normalizedTab.drillSchema, fallbackDepth, validPath);
  const fallbackRecategorizeBehaviorState = resolveRecategorizeBehaviorState({
    tab: normalizedTab,
    level: fallbackLevel,
    depth: fallbackDepth
  });
  const fallbackResult = evaluateLevel({
    tab: normalizedTab,
    transactions: currentSubset,
    levelRuleConfigs: ruleConfigs,
    honorRecategorizeAs: fallbackRecategorizeBehaviorState.honorRecategorizeAs,
    sharedGlobalCategorizeRules,
    ruleMethods,
    getDayOfWeekPST,
    months
  });

  return {
    tabTotal: rootTabTotal,
    currentLevelTotal: fallbackResult.tabTotal,
    depth: fallbackDepth,
    validPath,
    breadcrumbs,
    groups: fallbackResult.groups,
    transactions: fallbackResult.transactions,
    hiddenItems: fallbackResult.hiddenItems,
    groupByMode: fallbackResult.groupByMode,
    sortProperty: fallbackResult.sortProperty,
    sortDirection: fallbackResult.sortDirection,
    isLeaf: fallbackResult.groupByMode === NO_GROUPING_RULE_VALUE,
    overriddenRecategorizeCount: fallbackResult.overriddenRecategorizeCount,
    honorRecategorizeAs: fallbackRecategorizeBehaviorState.honorRecategorizeAs,
    hasRecategorizeBehaviorDecision: fallbackRecategorizeBehaviorState.hasDecision,
    recategorizeBehaviorDecision: fallbackRecategorizeBehaviorState.decision
  };
}

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

  const evaluation = evaluateTabData({
    tab: {
      ...tab,
      isSelected: true
    },
    transactions: sourceTransactions,
    tabRules: combinedRules,
    ruleMethods,
    getDayOfWeekPST,
    months
  });
  const groups = (evaluation.categorizedItems || []).map(([label, items, total]) => {
    const groupItems = Array.isArray(items) ? items : [];
    const originalItems = extractOriginalItemsFromProcessed(groupItems, originalLookup);
    const key = String(label || '').trim().toLowerCase();

    return {
      key,
      label: String(label || ''),
      total: Number.isFinite(Number(total)) ? Number(total) : 0,
      count: originalItems.length,
      items: groupItems,
      originalItems
    };
  });

  return {
    tabTotal: Number.isFinite(Number(evaluation.tabTotal)) ? Number(evaluation.tabTotal) : 0,
    groupByMode: String(evaluation.groupByMode || 'category'),
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
      depth: 0,
      validPath: [],
      breadcrumbs: [],
      groups: [],
      transactions: [],
      hiddenItems: [],
      groupByMode: NO_GROUPING_RULE_VALUE,
      isLeaf: true,
      overriddenRecategorizeCount: 0
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
    const { ruleConfigs } = levelRulesForDepth(normalizedTab.drillSchema, depth, validPath);

    const levelResult = evaluateLevel({
      tab: normalizedTab,
      transactions: currentSubset,
      levelRuleConfigs: ruleConfigs,
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
          depth,
          validPath,
          breadcrumbs,
          groups: levelResult.groups,
          transactions: levelResult.transactions,
          hiddenItems: levelResult.hiddenItems,
          groupByMode: levelResult.groupByMode,
          isLeaf: levelResult.groupByMode === NO_GROUPING_RULE_VALUE,
          overriddenRecategorizeCount: levelResult.overriddenRecategorizeCount
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
      depth,
      validPath,
      breadcrumbs,
      groups: levelResult.groups,
      transactions: levelResult.transactions,
      hiddenItems: levelResult.hiddenItems,
      groupByMode: levelResult.groupByMode,
      isLeaf: levelResult.groupByMode === NO_GROUPING_RULE_VALUE,
      overriddenRecategorizeCount: levelResult.overriddenRecategorizeCount
    };
  }

  const fallbackDepth = validPath.length;
  const { ruleConfigs } = levelRulesForDepth(normalizedTab.drillSchema, fallbackDepth, validPath);
  const fallbackResult = evaluateLevel({
    tab: normalizedTab,
    transactions: currentSubset,
    levelRuleConfigs: ruleConfigs,
    sharedGlobalCategorizeRules,
    ruleMethods,
    getDayOfWeekPST,
    months
  });

  return {
    tabTotal: rootTabTotal,
    depth: fallbackDepth,
    validPath,
    breadcrumbs,
    groups: fallbackResult.groups,
    transactions: fallbackResult.transactions,
    hiddenItems: fallbackResult.hiddenItems,
    groupByMode: fallbackResult.groupByMode,
    isLeaf: fallbackResult.groupByMode === NO_GROUPING_RULE_VALUE,
    overriddenRecategorizeCount: fallbackResult.overriddenRecategorizeCount
  };
}

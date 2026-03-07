const DRILL_SCHEMA_VERSION = 1;
const DEFAULT_LEVEL_GROUP_BY_RULE = ['groupBy', 'none', '', '', ''];
const RECAT_BEHAVIOR_RULE_MARKER_PREFIX = '__recat_behavior:';

export function normalizeDrillPath(path = []) {
  return (Array.isArray(path) ? path : [])
    .map((segment) => String(segment || '').trim().toLowerCase())
    .filter(Boolean);
}

function drillPathKey(path = []) {
  return normalizeDrillPath(path).join('>');
}

function sameDrillPath(pathA = [], pathB = []) {
  return drillPathKey(pathA) === drillPathKey(pathB);
}

function normalizeRuleArray(rule) {
  return Array.isArray(rule)
    ? rule.map((part) => String(part ?? ''))
    : [];
}

function normalizeRuleConfig(ruleConfig, fallbackType = '') {
  const normalizedRule = normalizeRuleArray(ruleConfig?.rule);
  const ruleType = normalizedRule[0] || fallbackType;

  if (!ruleType) {
    return null;
  }

  return {
    _id: String(ruleConfig?._id || `${ruleType}-${Math.random().toString(36).slice(2, 10)}`),
    rule: normalizedRule,
    filterJoinOperator: String(ruleConfig?.filterJoinOperator || '').toLowerCase() === 'or' ? 'or' : 'and',
    _isImportant: Boolean(ruleConfig?._isImportant),
    orderOfExecution: Number.isFinite(Number(ruleConfig?.orderOfExecution))
      ? Number(ruleConfig.orderOfExecution)
      : 0
  };
}

function normalizeRuleList(rules = [], fallbackType = '') {
  return (Array.isArray(rules) ? rules : [])
    .map((ruleConfig) => normalizeRuleConfig(ruleConfig, fallbackType))
    .filter(Boolean)
    .sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0));
}

function normalizeRecategorizeBehaviorDecision(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'honor' || normalizedValue === 'override') {
    return normalizedValue;
  }

  return '';
}

function recategorizeDecisionFromRuleMarker(ruleValue) {
  const normalizedRuleValue = String(ruleValue || '').trim().toLowerCase();
  if (!normalizedRuleValue) {
    return '';
  }

  if (normalizedRuleValue.startsWith(RECAT_BEHAVIOR_RULE_MARKER_PREFIX)) {
    return normalizeRecategorizeBehaviorDecision(
      normalizedRuleValue.slice(RECAT_BEHAVIOR_RULE_MARKER_PREFIX.length)
    );
  }

  return normalizeRecategorizeBehaviorDecision(normalizedRuleValue);
}

function firstRuleForType(rules = [], ruleType) {
  const normalized = normalizeRuleList(rules, ruleType)
    .filter((ruleConfig) => ruleConfig.rule?.[0] === ruleType);

  return normalized[0] || null;
}

function normalizeDrillLevel(level = {}, fallbackIndex = 0) {
  const normalizedSortRules = normalizeRuleList(level?.sortRules, 'sort');
  const normalizedCategorizeRules = normalizeRuleList(level?.categorizeRules, 'categorize');
  const normalizedFilterRules = normalizeRuleList(level?.filterRules, 'filter');
  const groupByRule = firstRuleForType(level?.groupByRules, 'groupBy');
  const recategorizeBehaviorDecisionFromRule = recategorizeDecisionFromRuleMarker(groupByRule?.rule?.[4]);
  const explicitRecategorizeBehaviorDecision = normalizeRecategorizeBehaviorDecision(level?.recategorizeBehaviorDecision)
    || recategorizeBehaviorDecisionFromRule;
  const fallbackHonorRecategorizeAs = Boolean(level?.honorRecategorizeAs);
  const honorRecategorizeAs = explicitRecategorizeBehaviorDecision
    ? explicitRecategorizeBehaviorDecision === 'honor'
    : fallbackHonorRecategorizeAs;
  const recategorizeBehaviorDecision = explicitRecategorizeBehaviorDecision
    || (fallbackHonorRecategorizeAs ? 'honor' : '');

  return {
    id: String(level?.id || `level-${fallbackIndex + 1}`),
    sortRules: normalizedSortRules,
    categorizeRules: normalizedCategorizeRules,
    filterRules: normalizedFilterRules,
    honorRecategorizeAs,
    recategorizeBehaviorDecision,
    groupByRules: groupByRule
      ? [groupByRule]
      : [{
          _id: `groupBy-${fallbackIndex + 1}`,
          rule: [...DEFAULT_LEVEL_GROUP_BY_RULE],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
  };
}

function normalizePathLevel(pathLevel = {}, fallbackIndex = 0) {
  const normalizedLevel = normalizeDrillLevel(pathLevel, fallbackIndex);
  return {
    ...normalizedLevel,
    path: normalizeDrillPath(pathLevel?.path)
  };
}

function dedupePathLevels(pathLevels = []) {
  const byPath = new Map();

  for (const pathLevel of pathLevels) {
    const pathKey = drillPathKey(pathLevel?.path);
    if (!pathKey) {
      continue;
    }

    byPath.set(pathKey, pathLevel);
  }

  return [...byPath.values()]
    .sort((a, b) => {
      const pathA = normalizeDrillPath(a?.path);
      const pathB = normalizeDrillPath(b?.path);
      if (pathA.length !== pathB.length) {
        return pathA.length - pathB.length;
      }

      return drillPathKey(pathA).localeCompare(drillPathKey(pathB));
    });
}

export function normalizeDrillSchema(rawSchema = {}) {
  const levels = Array.isArray(rawSchema?.levels)
    ? rawSchema.levels
    : [];
  const pathLevels = Array.isArray(rawSchema?.pathLevels)
    ? rawSchema.pathLevels
    : [];

  const normalizedLevels = levels.map((level, index) => normalizeDrillLevel(level, index));
  const normalizedPathLevels = dedupePathLevels(
    pathLevels.map((pathLevel, index) => normalizePathLevel(pathLevel, index))
  );

  if (!normalizedLevels.length) {
    normalizedLevels.push(normalizeDrillLevel({}, 0));
  }

  return {
    version: DRILL_SCHEMA_VERSION,
    levels: normalizedLevels,
    pathLevels: normalizedPathLevels
  };
}

function normalizeApplyForTabs(ruleConfig) {
  return Array.isArray(ruleConfig?.applyForTabs)
    ? ruleConfig.applyForTabs.map((tabId) => String(tabId || '')).filter(Boolean)
    : [];
}

function isRuleType(ruleConfig, expectedType) {
  const ruleType = Array.isArray(ruleConfig?.rule) ? String(ruleConfig.rule[0] || '') : '';
  return ruleType === expectedType;
}

function isGlobalRule(ruleConfig) {
  return normalizeApplyForTabs(ruleConfig).includes('_GLOBAL');
}

function isTabRule(ruleConfig, tabId) {
  if (!tabId) {
    return false;
  }

  return normalizeApplyForTabs(ruleConfig).includes(tabId);
}

function ruleType(ruleConfig) {
  return Array.isArray(ruleConfig?.rule)
    ? String(ruleConfig.rule[0] || '')
    : '';
}

function createNormalizedLegacyRule(ruleConfig) {
  return normalizeRuleConfig(ruleConfig, ruleType(ruleConfig));
}

function dedupeRulesById(rules = []) {
  const seen = new Set();
  const deduped = [];

  for (const ruleConfig of rules) {
    const ruleId = String(ruleConfig?._id || '');
    if (ruleId && seen.has(ruleId)) {
      continue;
    }

    if (ruleId) {
      seen.add(ruleId);
    }

    deduped.push(ruleConfig);
  }

  return deduped;
}

function extractLegacyLevelRulesForTab(tab, allRules = []) {
  const tabId = String(tab?._id || '');

  const tabScopedRules = allRules
    .filter((ruleConfig) => isTabRule(ruleConfig, tabId))
    .map(createNormalizedLegacyRule)
    .filter(Boolean);

  const globalNonCategorizeRules = allRules
    .filter((ruleConfig) => {
      if (!isGlobalRule(ruleConfig)) {
        return false;
      }

      return !isRuleType(ruleConfig, 'categorize');
    })
    .map(createNormalizedLegacyRule)
    .filter(Boolean);

  const mergedRules = dedupeRulesById([
    ...tabScopedRules,
    ...globalNonCategorizeRules
  ]);

  return {
    sortRules: normalizeRuleList(mergedRules.filter((ruleConfig) => ruleType(ruleConfig) === 'sort'), 'sort'),
    categorizeRules: normalizeRuleList(mergedRules.filter((ruleConfig) => ruleType(ruleConfig) === 'categorize'), 'categorize'),
    filterRules: normalizeRuleList(mergedRules.filter((ruleConfig) => ruleType(ruleConfig) === 'filter'), 'filter'),
    groupByRules: normalizeRuleList(mergedRules.filter((ruleConfig) => ruleType(ruleConfig) === 'groupBy'), 'groupBy')
  };
}

export function buildDrillSchemaFromLegacyRules(tab, allRules = []) {
  const levelZero = extractLegacyLevelRulesForTab(tab, allRules);
  return normalizeDrillSchema({
    version: DRILL_SCHEMA_VERSION,
    levels: [{
      id: 'level-1',
      ...levelZero
    }]
  });
}

export function normalizeTabWithDrillSchema(tab = {}, allRules = []) {
  const hasValidSchema = Boolean(tab?.drillSchema && Array.isArray(tab?.drillSchema?.levels));
  const drillSchema = hasValidSchema
    ? normalizeDrillSchema(tab.drillSchema)
    : buildDrillSchemaFromLegacyRules(tab, allRules);

  return {
    ...tab,
    drillSchema
  };
}

export function levelRulesForDepth(drillSchema, depth = 0, path = []) {
  const normalizedSchema = normalizeDrillSchema(drillSchema);
  const safeDepth = Number.isFinite(Number(depth)) && Number(depth) >= 0
    ? Number(depth)
    : 0;
  const normalizedPath = normalizeDrillPath(path);

  const pathLevel = normalizedPath.length === safeDepth
    ? (normalizedSchema.pathLevels.find((entry) => sameDrillPath(entry?.path, normalizedPath)) || null)
    : null;

  const level = pathLevel
    || normalizedSchema.levels[safeDepth]
    || normalizeDrillLevel({}, safeDepth);

  return {
    level,
    source: pathLevel ? 'path' : (normalizedSchema.levels[safeDepth] ? 'depth' : 'default'),
    ruleConfigs: [
      ...level.sortRules,
      ...level.categorizeRules,
      ...level.filterRules,
      ...level.groupByRules
    ]
  };
}

export function ensureDrillLevel(drillSchema, depth = 0) {
  const normalizedSchema = normalizeDrillSchema(drillSchema);
  const safeDepth = Number.isFinite(Number(depth)) && Number(depth) >= 0
    ? Number(depth)
    : 0;

  for (let i = normalizedSchema.levels.length; i <= safeDepth; i += 1) {
    normalizedSchema.levels.push(normalizeDrillLevel({}, i));
  }

  return normalizedSchema;
}

export function replaceRulesAtDepth(drillSchema, depth = 0, replacement = {}) {
  const schemaWithDepth = ensureDrillLevel(drillSchema, depth);

  schemaWithDepth.levels[depth] = normalizeDrillLevel({
    ...schemaWithDepth.levels[depth],
    ...replacement
  }, depth);

  return schemaWithDepth;
}

export function replaceRulesAtPath(drillSchema, path = [], replacement = {}) {
  const normalizedSchema = normalizeDrillSchema(drillSchema);
  const normalizedPath = normalizeDrillPath(path);

  if (!normalizedPath.length) {
    return replaceRulesAtDepth(normalizedSchema, 0, replacement);
  }

  const existingIndex = normalizedSchema.pathLevels.findIndex((entry) => sameDrillPath(entry?.path, normalizedPath));
  const existingLevel = existingIndex >= 0
    ? normalizedSchema.pathLevels[existingIndex]
    : null;

  const nextLevel = normalizePathLevel({
    ...existingLevel,
    ...replacement,
    path: normalizedPath,
    id: String(existingLevel?.id || `path-level-${normalizedPath.join('-')}`)
  }, normalizedPath.length);

  if (existingIndex >= 0) {
    normalizedSchema.pathLevels[existingIndex] = nextLevel;
  } else {
    normalizedSchema.pathLevels.push(nextLevel);
  }

  normalizedSchema.pathLevels = dedupePathLevels(normalizedSchema.pathLevels);
  return normalizedSchema;
}

export function globalCategorizeRules(allRules = []) {
  return allRules
    .filter((ruleConfig) => isGlobalRule(ruleConfig) && isRuleType(ruleConfig, 'categorize'))
    .map((ruleConfig) => createNormalizedLegacyRule(ruleConfig))
    .filter(Boolean)
    .sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0));
}

export const DRILL_SCHEMA_CONSTANTS = {
  VERSION: DRILL_SCHEMA_VERSION,
  DEFAULT_LEVEL_GROUP_BY_RULE
};

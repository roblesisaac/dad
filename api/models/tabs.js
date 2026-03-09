import AmptModel from '../utils/amptModel';

function normalizeSortByGroup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [scopeId, rawSort]) => {
    const normalizedScopeId = String(scopeId || '').trim();
    const normalizedSort = Number(rawSort);

    if (!normalizedScopeId || !Number.isFinite(normalizedSort)) {
      return acc;
    }

    acc[normalizedScopeId] = normalizedSort;
    return acc;
  }, {});
}

const MAX_TAB_NOTE_SCOPE_KEY_LENGTH = 180;
const MAX_TAB_NOTE_TEMPLATE_LENGTH = 4000;
const MAX_TAB_NOTES_PER_VIEW = 250;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTabNoteScopeKey(scopeKey) {
  return String(scopeKey || '').trim().slice(0, MAX_TAB_NOTE_SCOPE_KEY_LENGTH);
}

function normalizeTabNoteTemplate(template) {
  const normalizedTemplate = String(template ?? '').slice(0, MAX_TAB_NOTE_TEMPLATE_LENGTH);
  return normalizedTemplate.trim() ? normalizedTemplate : '';
}

function normalizeTabNotesByView(value, context = {}) {
  const item = context?.item;
  const hasFieldInPayload = item && Object.prototype.hasOwnProperty.call(item, 'tabNotesByView');
  const missingValue = value === undefined || value === null;

  if (!hasFieldInPayload && missingValue) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    return {};
  }

  const normalizedEntries = {};
  let count = 0;

  for (const [rawScopeKey, rawEntry] of Object.entries(value)) {
    if (count >= MAX_TAB_NOTES_PER_VIEW) {
      break;
    }

    const scopeKey = normalizeTabNoteScopeKey(rawScopeKey);
    if (!scopeKey) {
      continue;
    }

    const rawTemplate = typeof rawEntry === 'string'
      ? rawEntry
      : (isPlainObject(rawEntry) ? rawEntry.template : '');
    const template = normalizeTabNoteTemplate(rawTemplate);
    if (!template) {
      continue;
    }

    const rawUpdatedAt = isPlainObject(rawEntry) ? rawEntry.updatedAt : '';
    const updatedAt = String(rawUpdatedAt || '').trim();

    normalizedEntries[scopeKey] = updatedAt
      ? { template, updatedAt }
      : { template };
    count += 1;
  }

  return normalizedEntries;
}

const DEFAULT_GROUP_BY_RULE = ['groupBy', 'none', '', '', ''];
const RECAT_BEHAVIOR_RULE_MARKER_PREFIX = '__recat_behavior:';

function normalizeDrillPath(path = []) {
  return (Array.isArray(path) ? path : [])
    .map((segment) => String(segment || '').trim().toLowerCase())
    .filter(Boolean);
}

function drillPathKey(path = []) {
  return normalizeDrillPath(path).join('>');
}

function normalizeRuleArray(rule) {
  if (!Array.isArray(rule)) {
    return [];
  }

  return rule.map((part) => String(part ?? ''));
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

function normalizeLevel(level = {}, fallbackIndex = 0) {
  const sortRules = normalizeRuleList(level?.sortRules, 'sort');
  const categorizeRules = normalizeRuleList(level?.categorizeRules, 'categorize');
  const filterRules = normalizeRuleList(level?.filterRules, 'filter');
  const groupByRule = normalizeRuleList(level?.groupByRules, 'groupBy')
    .find(ruleConfig => ruleConfig.rule?.[0] === 'groupBy');
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
    sortRules,
    categorizeRules,
    filterRules,
    honorRecategorizeAs,
    recategorizeBehaviorDecision,
    groupByRules: groupByRule
      ? [groupByRule]
      : [{
          _id: `groupBy-${fallbackIndex + 1}`,
          rule: [...DEFAULT_GROUP_BY_RULE],
          filterJoinOperator: 'and',
          _isImportant: false,
          orderOfExecution: 0
        }]
  };
}

function normalizePathLevel(pathLevel = {}, fallbackIndex = 0) {
  const normalizedLevel = normalizeLevel(pathLevel, fallbackIndex);
  return {
    ...normalizedLevel,
    path: normalizeDrillPath(pathLevel?.path)
  };
}

function dedupePathLevels(pathLevels = []) {
  const byPath = new Map();

  for (const pathLevel of pathLevels) {
    const key = drillPathKey(pathLevel?.path);
    if (!key) {
      continue;
    }

    byPath.set(key, pathLevel);
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

function normalizeDrillSchema(value, context = {}) {
  const item = context?.item;
  const hasFieldInPayload = item && Object.prototype.hasOwnProperty.call(item, 'drillSchema');
  const missingValue = value === undefined || value === null;

  if (!hasFieldInPayload && missingValue) {
    return undefined;
  }

  const levels = Array.isArray(value?.levels)
    ? value.levels
    : [];
  const pathLevels = Array.isArray(value?.pathLevels)
    ? value.pathLevels
    : [];
  const normalizedLevels = levels.map((level, index) => normalizeLevel(level, index));
  const normalizedPathLevels = dedupePathLevels(
    pathLevels.map((pathLevel, index) => normalizePathLevel(pathLevel, index))
  );

  if (!normalizedLevels.length) {
    normalizedLevels.push(normalizeLevel({}, 0));
  }

  return {
    version: 1,
    levels: normalizedLevels,
    pathLevels: normalizedPathLevels
  };
}

const tabSchema = {
  userId: String,
  tabName: String,
  showForGroup: [String],
  isSelected: Boolean,
  sort: Number,
  sortByGroup: normalizeSortByGroup,
  heading: {
    type: 'String',
    default: 'sum',
    enum: ['sum', 'average', 'min', 'max', 'count']
  },
  tabNotesByView: normalizeTabNotesByView,
  drillSchema: normalizeDrillSchema,
  label1: 'userId'
};

export default AmptModel(['tabs', 'userId'], tabSchema);

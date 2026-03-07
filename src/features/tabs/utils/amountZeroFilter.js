const SIGN_POSITIVE = 'positive';
const SIGN_NEGATIVE = 'negative';
const SIGN_ZERO = 'zero';
const ALL_SIGNS = [SIGN_POSITIVE, SIGN_NEGATIVE, SIGN_ZERO];

function createSignSet(values = []) {
  return new Set(values);
}

function unionSignSets(leftSet, rightSet) {
  const unionSet = createSignSet(leftSet);
  rightSet.forEach(value => unionSet.add(value));
  return unionSet;
}

function intersectSignSets(leftSet, rightSet) {
  const intersectionSet = createSignSet();

  leftSet.forEach((value) => {
    if (rightSet.has(value)) {
      intersectionSet.add(value);
    }
  });

  return intersectionSet;
}

function normalizeConditionCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function normalizeFilterJoinOperator(filterJoinOperator) {
  return String(filterJoinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function hasZeroCriterion(criterion) {
  const parsed = Number(criterion);
  return Number.isFinite(parsed) && parsed === 0;
}

function normalizeMethodName(methodName) {
  return String(methodName || '').trim().toLowerCase();
}

function signSetForAmountZeroCondition({ itemPropName, ruleMethodName, criterion }) {
  if (itemPropName !== 'amount' || !hasZeroCriterion(criterion)) {
    return null;
  }

  switch (normalizeMethodName(ruleMethodName)) {
    case '>':
      return createSignSet([SIGN_POSITIVE]);
    case '>=':
      return createSignSet([SIGN_POSITIVE, SIGN_ZERO]);
    case '<':
      return createSignSet([SIGN_NEGATIVE]);
    case '<=':
      return createSignSet([SIGN_NEGATIVE, SIGN_ZERO]);
    case '=':
      return createSignSet([SIGN_ZERO]);
    case 'is not':
      return createSignSet([SIGN_POSITIVE, SIGN_NEGATIVE]);
    default:
      return null;
  }
}

function extractRuleConditions(rule) {
  const conditions = [{
    combinator: 'and',
    itemPropName: rule?.[1],
    ruleMethodName: rule?.[2],
    criterion: rule?.[3]
  }];

  for (let index = 5; index < rule.length; index += 4) {
    const combinator = normalizeConditionCombinator(rule[index]);
    const itemPropName = rule[index + 1];
    const ruleMethodName = rule[index + 2];
    const criterion = rule[index + 3];
    conditions.push({ combinator, itemPropName, ruleMethodName, criterion });
  }

  return conditions;
}

function groupConditionsByOr(conditions = []) {
  if (!conditions.length) {
    return [];
  }

  const groupedConditions = [];
  let currentGroup = [];

  conditions.forEach((condition, index) => {
    const joinOperator = index === 0
      ? 'and'
      : normalizeConditionCombinator(condition.combinator);

    if (joinOperator === 'or' && currentGroup.length) {
      groupedConditions.push(currentGroup);
      currentGroup = [condition];
      return;
    }

    currentGroup.push(condition);
  });

  if (currentGroup.length) {
    groupedConditions.push(currentGroup);
  }

  return groupedConditions;
}

function evaluateFilterRuleAmountZeroSignSet(filterRuleConfig) {
  const rule = Array.isArray(filterRuleConfig?.rule) ? filterRuleConfig.rule : [];
  const conditions = extractRuleConditions(rule);
  const groupedConditions = groupConditionsByOr(conditions);
  let hasAmountZeroConstraint = false;

  let ruleSignSet = createSignSet();

  groupedConditions.forEach((conditionGroup) => {
    let groupSignSet = createSignSet(ALL_SIGNS);
    let groupHasAmountZeroConstraint = false;

    conditionGroup.forEach((condition) => {
      const conditionSignSet = signSetForAmountZeroCondition(condition);
      if (!conditionSignSet) {
        return;
      }

      groupHasAmountZeroConstraint = true;
      hasAmountZeroConstraint = true;
      groupSignSet = intersectSignSets(groupSignSet, conditionSignSet);
    });

    if (!groupHasAmountZeroConstraint) {
      groupSignSet = createSignSet(ALL_SIGNS);
    }

    ruleSignSet = unionSignSets(ruleSignSet, groupSignSet);
  });

  if (!groupedConditions.length) {
    ruleSignSet = createSignSet(ALL_SIGNS);
  }

  return {
    hasAmountZeroConstraint,
    signSet: ruleSignSet
  };
}

function groupFilterRulesByOr(filterRules = []) {
  if (!filterRules.length) {
    return [];
  }

  const groupedFilterRules = [];
  let currentGroup = [];

  filterRules.forEach((filterRuleConfig, index) => {
    const joinOperator = index === 0
      ? 'and'
      : normalizeFilterJoinOperator(filterRuleConfig?.filterJoinOperator);

    if (joinOperator === 'or' && currentGroup.length) {
      groupedFilterRules.push(currentGroup);
      currentGroup = [filterRuleConfig];
      return;
    }

    currentGroup.push(filterRuleConfig);
  });

  if (currentGroup.length) {
    groupedFilterRules.push(currentGroup);
  }

  return groupedFilterRules;
}

function normalizeFilterRules(tabRules = []) {
  return tabRules
    .filter((ruleConfig) => {
      const rule = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];
      return rule[0] === 'filter';
    })
    .sort((leftRule, rightRule) => {
      const leftOrder = Number(leftRule?.orderOfExecution);
      const rightOrder = Number(rightRule?.orderOfExecution);
      return (Number.isFinite(leftOrder) ? leftOrder : 0)
        - (Number.isFinite(rightOrder) ? rightOrder : 0);
    });
}

function setEquals(signSet, expectedSigns = []) {
  if (signSet.size !== expectedSigns.length) {
    return false;
  }

  return expectedSigns.every(sign => signSet.has(sign));
}

function resolveAmountZeroFilterMode(signSet) {
  if (setEquals(signSet, [SIGN_POSITIVE])) {
    return {
      mode: 'positive-only',
      predicate: (amount) => Number(amount) > 0
    };
  }

  if (setEquals(signSet, [SIGN_NEGATIVE])) {
    return {
      mode: 'negative-only',
      predicate: (amount) => Number(amount) < 0
    };
  }

  if (setEquals(signSet, [SIGN_POSITIVE, SIGN_ZERO])) {
    return {
      mode: 'non-negative',
      predicate: (amount) => Number(amount) >= 0
    };
  }

  if (setEquals(signSet, [SIGN_NEGATIVE, SIGN_ZERO])) {
    return {
      mode: 'non-positive',
      predicate: (amount) => Number(amount) <= 0
    };
  }

  if (setEquals(signSet, [SIGN_ZERO])) {
    return {
      mode: 'zero-only',
      predicate: (amount) => Number(amount) === 0
    };
  }

  return null;
}

export function resolveAmountZeroHiddenFilter(tabRules = []) {
  const filterRules = normalizeFilterRules(tabRules);
  if (!filterRules.length) {
    return null;
  }

  const groupedFilterRules = groupFilterRulesByOr(filterRules);
  if (!groupedFilterRules.length) {
    return null;
  }

  let hasAmountZeroConstraint = false;
  let overallSignSet = createSignSet();

  groupedFilterRules.forEach((filterGroup) => {
    let groupSignSet = createSignSet(ALL_SIGNS);

    filterGroup.forEach((filterRuleConfig) => {
      const ruleEvaluation = evaluateFilterRuleAmountZeroSignSet(filterRuleConfig);
      if (ruleEvaluation.hasAmountZeroConstraint) {
        hasAmountZeroConstraint = true;
      }

      groupSignSet = intersectSignSets(groupSignSet, ruleEvaluation.signSet);
    });

    overallSignSet = unionSignSets(overallSignSet, groupSignSet);
  });

  if (!hasAmountZeroConstraint) {
    return null;
  }

  return resolveAmountZeroFilterMode(overallSignSet);
}

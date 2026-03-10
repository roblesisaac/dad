<template>
  <div 
    class="rule-syntax" 
    :class="{ 'flex items-center flex-wrap': !compact, 'inline': compact }"
  >
    <!-- Sort Rules -->
    <template v-if="rule.rule[0] === 'sort'">
      <span class="font-medium mr-1">Sort by</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="font-medium mr-1">using</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="font-medium mr-1">with value</span>
      <span v-if="rule.rule[3]" class="rule-part mr-1">{{ formatConditionValue(rule.rule[3], rule.rule[1]) }}</span>
    </template>
    
    <!-- Filter Rules -->
    <template v-else-if="rule.rule[0] === 'filter'">
      <span class="font-medium mr-1">Show if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ formatConditionValue(rule.rule[3], rule.rule[1]) }}</span>
      <template v-for="(condition, index) in getAdditionalConditions(rule)" :key="`filter-condition-${index}`">
        <span class="font-medium mx-1">{{ formatCombinator(condition.combinator) }}</span>
        <span class="rule-part mr-1">{{ formatPropName(condition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(condition.method, condition.property) }}</span>
        <span class="rule-part">{{ formatConditionValue(condition.value, condition.property) }}</span>
      </template>
    </template>
    
    <!-- Categorize Rules -->
    <template v-else-if="rule.rule[0] === 'categorize'">
      <span class="font-medium mr-1">Set</span>
      <span class="rule-part mr-1">{{ getCategorizeAssignmentTarget(rule) }}</span>
      <span class="font-medium mr-1">to</span>
      <span class="rule-part mr-1">{{ getCategorizeAssignmentValue(rule) || '(not set)' }}</span>
      <span class="font-medium mr-1">if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ formatConditionValue(rule.rule[3], rule.rule[1]) }}</span>
      <template v-for="(condition, index) in getAdditionalConditions(rule)" :key="`categorize-condition-${index}`">
        <span class="font-medium mx-1">{{ formatCombinator(condition.combinator) }}</span>
        <span class="rule-part mr-1">{{ formatPropName(condition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(condition.method, condition.property) }}</span>
        <span class="rule-part">{{ formatConditionValue(condition.value, condition.property) }}</span>
      </template>
    </template>
    
    <!-- Group By Rules -->
    <template v-else-if="rule.rule[0] === 'groupBy'">
      <span class="font-medium mr-1">Group by</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span v-if="rule.rule[2]" class="font-medium mr-1">where</span>
      <span v-if="rule.rule[2]" class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ formatConditionValue(rule.rule[3], rule.rule[1]) }}</span>
    </template>
    
    <!-- Unknown Rule Type -->
    <template v-else>
      <span class="font-medium mr-1">{{ rule.rule[0] }}</span>
      <span class="rule-part mr-1">{{ rule.rule[1] }}</span>
      <span class="rule-part mr-1">{{ rule.rule[2] }}</span>
      <span class="rule-part mr-1">{{ rule.rule[3] }}</span>
      <span class="rule-part">{{ rule.rule[4] }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const { state } = useDashboardState();

const accountLabelByIdentifier = computed(() => {
  const map = new Map();
  const allUserAccounts = Array.isArray(state.allUserAccounts) ? state.allUserAccounts : [];

  for (const account of allUserAccounts) {
    const accountLabel = accountDisplayLabel(account);
    for (const identifier of accountIdentifiers(account)) {
      map.set(normalizedAccountText(identifier), accountLabel);
    }
  }

  const allUserGroups = Array.isArray(state.allUserGroups) ? state.allUserGroups : [];
  for (const group of allUserGroups) {
    if (group?.isLabel !== false) {
      continue;
    }

    const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
    if (groupAccounts.length !== 1) {
      continue;
    }

    const groupAccount = groupAccounts[0];
    const groupName = sanitizeAccountText(group?.name || '');
    const identifiers = accountIdentifiers(groupAccount);
    if (!identifiers.length || !groupName) {
      continue;
    }

    const allMappedToDefault = identifiers.every((identifier) => {
      const normalizedIdentifier = normalizedAccountText(identifier);
      const mappedLabel = map.get(normalizedIdentifier);
      return !mappedLabel || mappedLabel === accountDefaultLabel(resolveAccount(groupAccount) || groupAccount);
    });

    if (!allMappedToDefault) {
      continue;
    }

    for (const identifier of identifiers) {
      map.set(normalizedAccountText(identifier), groupName);
    }
  }

  return map;
});

function accountIdentifiers(account) {
  if (!account) {
    return [];
  }

  if (typeof account === 'string') {
    const identifier = String(account).trim();
    return identifier ? [identifier] : [];
  }

  return [
    account._id,
    account.account_id,
    account.accountId,
    account.id
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

function accountsMatch(accountA, accountB) {
  const idsA = accountIdentifiers(accountA);
  const idsB = new Set(accountIdentifiers(accountB));
  return idsA.some(id => idsB.has(id));
}

function resolveAccount(account) {
  if (!account) {
    return null;
  }

  const allUserAccounts = Array.isArray(state.allUserAccounts) ? state.allUserAccounts : [];
  return allUserAccounts.find((userAccount) => accountsMatch(userAccount, account)) || null;
}

function sanitizeAccountText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\uFFFD+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedAccountText(value) {
  return sanitizeAccountText(String(value || '')).toLowerCase();
}

function accountDefaultLabel(account) {
  const resolved = resolveAccount(account) || account;
  const officialName = sanitizeAccountText(resolved?.official_name || resolved?.officialName || '');
  const accountName = sanitizeAccountText(resolved?.name || '');
  const mask = resolved?.mask !== undefined && resolved?.mask !== null
    ? sanitizeAccountText(String(resolved.mask))
    : '';
  const baseLabel = officialName || accountName || (mask ? `Account ${mask}` : 'Account');

  if (mask && !baseLabel.toLowerCase().includes(mask.toLowerCase())) {
    return `${baseLabel} (${mask})`;
  }

  return baseLabel;
}

function getAccountContextGroup(account) {
  const allUserGroups = Array.isArray(state.allUserGroups) ? state.allUserGroups : [];
  return allUserGroups.find((group) => {
    if (group?.isLabel !== false) {
      return false;
    }

    const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
    if (groupAccounts.length !== 1) {
      return false;
    }

    return groupAccounts.some(groupAccount => accountsMatch(groupAccount, account));
  }) || null;
}

function accountDisplayLabel(account) {
  const defaultLabel = accountDefaultLabel(account);
  const contextGroupName = sanitizeAccountText(getAccountContextGroup(account)?.name || '');

  if (!contextGroupName) {
    return defaultLabel;
  }

  const resolved = resolveAccount(account) || account;
  const officialName = sanitizeAccountText(resolved?.official_name || resolved?.officialName || '');
  const accountName = sanitizeAccountText(resolved?.name || '');
  const mask = resolved?.mask !== undefined && resolved?.mask !== null
    ? sanitizeAccountText(String(resolved.mask))
    : '';

  const defaultNameCandidates = new Set(
    ['Account', officialName, accountName, mask]
      .map(normalizedAccountText)
      .filter(Boolean)
  );

  if (defaultNameCandidates.has(normalizedAccountText(contextGroupName))) {
    return defaultLabel;
  }

  return contextGroupName;
}

function isAccountProperty(propName) {
  return String(propName || '').trim().toLowerCase() === 'account';
}

function parseCriterionTerms(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map(term => term.trim())
    .filter(Boolean);
}

function formatAccountCriterionValue(value) {
  const criterionTerms = parseCriterionTerms(value);
  if (!criterionTerms.length) {
    return '';
  }

  return criterionTerms
    .map((term) => {
      const accountLabel = accountLabelByIdentifier.value.get(normalizedAccountText(term));
      return accountLabel || term;
    })
    .join(', ');
}

function formatConditionValue(value, propName) {
  if (!value) {
    return '';
  }

  if (isAccountProperty(propName)) {
    return formatAccountCriterionValue(value);
  }

  return String(value);
}

// Format property names for better readability
function formatPropName(propName) {
  if (!propName) return '(not set)';

  const normalizedPropName = String(propName).replace(/^-/, '');
  
  // Handle special cases
  if (normalizedPropName === 'amount') return 'amount';
  if (normalizedPropName === 'date') return 'date';
  if (normalizedPropName === 'name') return 'name';
  if (normalizedPropName === 'category') return 'category';
  if (normalizedPropName === 'account') return 'account';
  if (isGlobalCategoryProperty(normalizedPropName)) return 'global category';
  if (normalizedPropName === 'none') return 'no grouping';
  
  // General case: convert camelCase to words
  return normalizedPropName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function isGlobalCategoryProperty(propName) {
  const normalizedPropName = String(propName || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return normalizedPropName === 'globalcategory';
}

// Format method names for better readability
function formatMethodName(methodName, propName = '') {
  if (!methodName) return '(not set)';

  const normalizedMethodName = String(methodName).toLowerCase();
  if (normalizedMethodName === 'asc' || normalizedMethodName === 'desc') {
    return formatSortDirectionLabel(propName, normalizedMethodName);
  }

  const normalizedProperty = String(propName || '').toLowerCase();

  if (normalizedProperty === 'date') {
    if (methodName === '<' || methodName === 'is before') return 'is before';
    if (methodName === '>' || methodName === 'is after') return 'is after';
    if (methodName === '=') return 'is equal to';
  }
  
  // Handle special cases
  const methodMap = {
    'is': 'is',
    'contains': 'contains',
    'startsWith': 'starts with',
    'endsWith': 'ends with',
    '>=': 'is greater than or equal to',
    '>': 'is greater than',
    '=': 'is equal to',
    'is not': 'is not',
    '<=': 'is less than or equal to',
    '<': 'is less than',
    'is before': 'is before',
    'is after': 'is after',
    'includes': 'includes',
    'excludes': 'excludes'
  };
  
  return methodMap[methodName] || methodName;
}

function formatSortDirectionLabel(sortPropertyName, sortDirection) {
  const normalizedSortPropertyName = String(sortPropertyName || '').replace(/^-/, '').toLowerCase();

  if (normalizedSortPropertyName === 'date') {
    return sortDirection === 'asc'
      ? 'oldest to newest'
      : 'newest to oldest';
  }

  if (normalizedSortPropertyName === 'amount') {
    return sortDirection === 'asc'
      ? 'low to high'
      : 'high to low';
  }

  if (normalizedSortPropertyName === 'name' || normalizedSortPropertyName === 'category') {
    return sortDirection === 'asc'
      ? 'A to Z'
      : 'Z to A';
  }

  return sortDirection === 'asc'
    ? 'ascending'
    : 'descending';
}

function getAdditionalConditions(rule) {
  const conditions = [];
  const ruleValues = rule.rule || [];
  const conditionStartIndex = getAdditionalConditionsStartIndex(ruleValues);

  for (let i = conditionStartIndex; i < ruleValues.length; i += 4) {
    conditions.push({
      combinator: normalizeCombinator(ruleValues[i]),
      property: ruleValues[i + 1] || '',
      method: ruleValues[i + 2] || '',
      value: ruleValues[i + 3] || ''
    });
  }

  return conditions;
}

function normalizeCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function formatCombinator(combinator) {
  return normalizeCombinator(combinator).toUpperCase();
}

function isCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  return normalizedTarget === 'category' || normalizedTarget === 'name' || normalizedTarget === 'label';
}

function normalizeCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  if (normalizedTarget === 'name') {
    return 'name';
  }

  if (normalizedTarget === 'label') {
    return 'label';
  }

  return 'category';
}

function usesCategorizeSetTargetFormat(ruleValues = []) {
  return Array.isArray(ruleValues)
    && ruleValues[0] === 'categorize'
    && ruleValues.length >= 6
    && (ruleValues.length - 6) % 4 === 0
    && isCategorizeSetTarget(ruleValues[4]);
}

function getCategorizeAssignmentTarget(ruleConfig = {}) {
  const ruleValues = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];

  return usesCategorizeSetTargetFormat(ruleValues)
    ? normalizeCategorizeSetTarget(ruleValues[4])
    : 'category';
}

function getCategorizeAssignmentValue(ruleConfig = {}) {
  const ruleValues = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];

  return usesCategorizeSetTargetFormat(ruleValues)
    ? String(ruleValues[5] ?? '')
    : String(ruleValues[4] ?? '');
}

function getAdditionalConditionsStartIndex(ruleValues = []) {
  return usesCategorizeSetTargetFormat(ruleValues) ? 6 : 5;
}
</script>

<style scoped>
.rule-part {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--theme-rule-part-bg);
  color: var(--theme-rule-part-text);
  font-weight: 500;
  transition: all 0.3s ease;
}

.group:hover .rule-part {
  color: var(--theme-text);
}

.rule-syntax {
  cursor: pointer;
}

.rule-syntax.inline .rule-part {
  display: inline-flex;
  align-items: center;
}

.compact .rule-part {
  font-size: 0.75rem;
  line-height: 1rem;
}
</style> 

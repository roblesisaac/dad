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
      <span v-if="rule.rule[3]" class="rule-part mr-1">{{ rule.rule[3] }}</span>
    </template>
    
    <!-- Filter Rules -->
    <template v-else-if="rule.rule[0] === 'filter'">
      <span class="font-medium mr-1">Show if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ rule.rule[3] }}</span>
      <template v-for="(condition, index) in getAdditionalConditions(rule)" :key="`filter-condition-${index}`">
        <span class="font-medium mx-1">{{ formatCombinator(condition.combinator) }}</span>
        <span class="rule-part mr-1">{{ formatPropName(condition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(condition.method, condition.property) }}</span>
        <span class="rule-part">{{ condition.value }}</span>
      </template>
    </template>
    
    <!-- Categorize Rules -->
    <template v-else-if="rule.rule[0] === 'categorize'">
      <span class="font-medium mr-1">Categorize as</span>
      <span class="rule-part mr-1">{{ rule.rule[4] || '(not set)' }}</span>
      <span class="font-medium mr-1">if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ rule.rule[3] }}</span>
      <template v-for="(condition, index) in getAdditionalConditions(rule)" :key="`categorize-condition-${index}`">
        <span class="font-medium mx-1">{{ formatCombinator(condition.combinator) }}</span>
        <span class="rule-part mr-1">{{ formatPropName(condition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(condition.method, condition.property) }}</span>
        <span class="rule-part">{{ condition.value }}</span>
      </template>
    </template>
    
    <!-- Group By Rules -->
    <template v-else-if="rule.rule[0] === 'groupBy'">
      <span class="font-medium mr-1">Group by</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span v-if="rule.rule[2]" class="font-medium mr-1">where</span>
      <span v-if="rule.rule[2]" class="rule-part mr-1">{{ formatMethodName(rule.rule[2], rule.rule[1]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ rule.rule[3] }}</span>
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

// Format property names for better readability
function formatPropName(propName) {
  if (!propName) return '(not set)';

  const normalizedPropName = String(propName).replace(/^-/, '');
  
  // Handle special cases
  if (normalizedPropName === 'amount') return 'amount';
  if (normalizedPropName === 'date') return 'date';
  if (normalizedPropName === 'name') return 'name';
  if (normalizedPropName === 'category') return 'category';
  if (normalizedPropName === 'none') return 'no grouping';
  
  // General case: convert camelCase to words
  return normalizedPropName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
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

  for (let i = 5; i < ruleValues.length; i += 4) {
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
</script>

<style scoped>
.rule-part {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--theme-rule-part-bg);
  color: var(--theme-rule-part-text);
  border: 1px solid var(--theme-rule-part-border);
  font-weight: 500;
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

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
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2]) }}</span>
      <span v-if="rule.rule[3]" class="font-medium mr-1">with value</span>
      <span v-if="rule.rule[3]" class="rule-part mr-1">{{ rule.rule[3] }}</span>
    </template>
    
    <!-- Filter Rules -->
    <template v-else-if="rule.rule[0] === 'filter'">
      <span class="font-medium mr-1">Show if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ rule.rule[3] }}</span>
      <template v-for="(andCondition, index) in getAndConditions(rule)" :key="`filter-and-${index}`">
        <span class="font-medium mx-1">AND</span>
        <span class="rule-part mr-1">{{ formatPropName(andCondition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(andCondition.method) }}</span>
        <span class="rule-part">{{ andCondition.value }}</span>
      </template>
    </template>
    
    <!-- Categorize Rules -->
    <template v-else-if="rule.rule[0] === 'categorize'">
      <span class="font-medium mr-1">Categorize as</span>
      <span class="rule-part mr-1">{{ rule.rule[4] || '(not set)' }}</span>
      <span class="font-medium mr-1">if</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span class="rule-part mr-1">{{ formatMethodName(rule.rule[2]) }}</span>
      <span v-if="rule.rule[3]" class="rule-part">{{ rule.rule[3] }}</span>
      <template v-for="(andCondition, index) in getAndConditions(rule)" :key="`categorize-and-${index}`">
        <span class="font-medium mx-1">AND</span>
        <span class="rule-part mr-1">{{ formatPropName(andCondition.property) }}</span>
        <span class="rule-part mr-1">{{ formatMethodName(andCondition.method) }}</span>
        <span class="rule-part">{{ andCondition.value }}</span>
      </template>
    </template>
    
    <!-- Group By Rules -->
    <template v-else-if="rule.rule[0] === 'groupBy'">
      <span class="font-medium mr-1">Group by</span>
      <span class="rule-part mr-1">{{ formatPropName(rule.rule[1]) }}</span>
      <span v-if="rule.rule[2]" class="font-medium mr-1">where</span>
      <span v-if="rule.rule[2]" class="rule-part mr-1">{{ formatMethodName(rule.rule[2]) }}</span>
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
  
  // Handle special cases
  if (propName === 'amount') return 'amount';
  if (propName === 'date') return 'date';
  if (propName === 'name') return 'name';
  if (propName === 'category') return 'category';
  
  // General case: convert camelCase to words
  return propName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Format method names for better readability
function formatMethodName(methodName) {
  if (!methodName) return '(not set)';
  
  // Handle special cases
  const methodMap = {
    'is': 'is',
    'contains': 'contains',
    'startsWith': 'starts with',
    'endsWith': 'ends with',
    '>=': 'is greater than or equal to',
    '>': 'is greater than',
    '=': 'equals',
    'is not': 'is not',
    '<=': 'is less than or equal to',
    '<': 'is less than',
    'includes': 'includes',
    'excludes': 'excludes'
  };
  
  return methodMap[methodName] || methodName;
}

function getAndConditions(rule) {
  const conditions = [];
  const ruleValues = rule.rule || [];

  for (let i = 5; i < ruleValues.length; i += 4) {
    const combinator = String(ruleValues[i] || '').toLowerCase();

    if (combinator !== 'and') {
      continue;
    }

    conditions.push({
      property: ruleValues[i + 1] || '',
      method: ruleValues[i + 2] || '',
      value: ruleValues[i + 3] || ''
    });
  }

  return conditions;
}
</script>

<style scoped>
.rule-part {
  @apply px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium;
}

.rule-syntax.inline .rule-part {
  @apply inline-flex items-center;
}

.compact .rule-part {
  @apply text-xs;
}
</style> 

<template>
  <div 
    class="rule-card bg-white rounded-2xl border-2 transition-all duration-300 relative group overflow-hidden"
    :class="[
      isEnabledForCurrentTab 
        ? 'border-gray-100 hover:border-black' 
        : 'border-gray-50 opacity-60 grayscale bg-gray-50/30'
    ]"
  >
    <!-- Compact Header: Rule Summary -->
    <div 
      class="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center min-w-0">
        <!-- Summary String with Highlights -->
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <div class="text-[13px] leading-tight tracking-tight truncate flex items-center flex-wrap gap-x-1 gap-y-0.5">
              <template v-for="(part, idx) in ruleSummaryParts" :key="idx">
                <span 
                  :class="[
                    part.highlight 
                      ? 'bg-gray-100/80 px-1 py-px rounded text-black font-black' 
                      : 'text-gray-400 font-medium'
                  ]"
                >
                  {{ part.text }}
                </span>
              </template>
            </div>
            <span v-if="rule._isImportant" class="text-[8px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md shrink-0">Priority</span>
            <span v-if="isGlobalRule" class="text-[8px] font-black uppercase tracking-tighter bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md shrink-0">Global</span>
          </div>
          <!-- <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
            {{ ruleType.name.replace(' Rules', '') }}
          </p> -->
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <!-- Reorder Handle -->
        <div 
          v-if="isReordering"
          class="drag-handle p-2 text-black hover:bg-gray-100 rounded-lg transition-colors cursor-move"
          title="Drag to reorder"
          @click.stop
        >
          <GripVertical class="w-4 h-4" />
        </div>

        <!-- Expansion Toggle -->
        <div 
          v-else
          class="p-2 text-black group-hover:text-black transition-all"
          :class="{ 'rotate-180': isExpanded }"
        >
          <ChevronDown class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Expanded Body: Actions -->
    <Transition name="expand">
      <div v-if="isExpanded && !isReordering" class="border-t-2 border-gray-50 bg-gray-50/30">
        <div class="p-4 flex items-center justify-between gap-4">
          <!-- Main Actions -->
          <div class="flex items-center gap-2">
            <button 
              @click.stop="$emit('edit', rule)"
              class="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-white border-2 border-transparent hover:border-gray-100 rounded-xl transition-all flex items-center gap-2"
            >
              <Edit class="w-3.5 h-3.5" />
              Edit
            </button>
            <button 
              @click.stop="$emit('delete', rule)"
              class="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 border-2 border-transparent hover:border-red-100 rounded-xl transition-all flex items-center gap-2"
            >
              <Trash class="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          <!-- Quick Toggle -->
          <div class="flex items-center gap-3 px-2 border-l-2 border-gray-100">
             <span class="text-[10px] font-black uppercase tracking-widest text-black">
               {{ isEnabledForCurrentTab ? 'Active' : 'Disabled' }}
             </span>
             <Switch 
               :model-value="isEnabledForCurrentTab" 
               @update:model-value="$emit('toggle', rule)" 
             />
          </div>
        </div>

        <!-- Multi-condition visibility (Optional indicator if multi-filter) -->
        <div v-if="hasAdditionalConditions" class="px-6 pb-4">
          <div class="text-[9px] font-black text-black uppercase tracking-widest mb-2">Conditions</div>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <template v-for="(cond, idx) in additionalConditions" :key="idx">
              <span class="text-[11px] font-bold text-gray-400">
                 <span class="uppercase text-[9px] text-black mr-1">{{ formatCombinator(cond.combinator) }}</span>
                 {{ formatPropertyLabel(cond.property) }} <span class="uppercase text-[9px] text-black">{{ getOperatorDisplay(cond.method) }}</span> {{ cond.value }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { 
  Edit, Trash, GripVertical, ChevronDown
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import Switch from '@/shared/components/Switch.vue';

const { state } = useDashboardState();

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  ruleType: {
    type: Object,
    required: true
  },
  isReordering: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit', 'toggle', 'delete']);

const isExpanded = ref(false);

// Determine if rule is global or tab-specific
const isGlobalRule = computed(() => props.rule.applyForTabs.includes('_GLOBAL'));

// Check if rule is enabled for current tab
const isEnabledForCurrentTab = computed(() => {
  const tabId = state.selected.tab?._id;
  return props.rule.applyForTabs.includes('_GLOBAL') || props.rule.applyForTabs.includes(tabId);
});

// Generate structured summary segments for the rule
const ruleSummaryParts = computed(() => {
  const r = props.rule.rule;
  const type = props.ruleType.id;
  const parts = [];

  if (type === 'sort') {
    const sortPropertyName = normalizeSortPropertyName(r[1]);
    const sortDirection = getSortDirection(r);

    parts.push({ text: 'sort by' });
    parts.push({ text: sortPropertyName || 'property', highlight: true });
    parts.push({ text: '(' });
    parts.push({ text: getSortDirectionLabel(sortPropertyName, sortDirection), highlight: true });
    parts.push({ text: ')' });
  } 
  
  else if (type === 'filter') {
    parts.push({ text: 'filter where' });
    parts.push({ text: formatPropertyLabel(r[1]) || 'field', highlight: true });
    parts.push({ text: getOperatorDisplay(r[2]), highlight: true });
    parts.push({ text: r[3] || 'value', highlight: true });
    
    const extra = additionalConditions.value.length;
    if (extra > 0) {
      parts.push({ text: `(+${extra} more)` });
    }
  } 
  
  else if (type === 'categorize' || type === 'custom') {
    parts.push({ text: 'set' });
    parts.push({ text: getCategorizeAssignmentTarget(r), highlight: true });
    parts.push({ text: 'to' });
    parts.push({ text: getCategorizeAssignmentValue(r) || 'value', highlight: true });
    parts.push({ text: 'if' });
    parts.push({ text: formatPropertyLabel(r[1]) || 'field', highlight: true });
    parts.push({ text: getOperatorDisplay(r[2]), highlight: true });
    parts.push({ text: r[3] || 'value', highlight: true });
  } 
  
  else if (type === 'groupBy') {
    parts.push({ text: 'group by' });
    parts.push({ text: formatGroupByTarget(r[1]), highlight: true });
  }

  return parts.length > 0 ? parts : [{ text: 'Untitled Rule' }];
});

// Filter conditions
const additionalConditions = computed(() => {
  const conditions = [];
  const ruleValues = props.rule.rule || [];
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
});

const hasAdditionalConditions = computed(() => additionalConditions.value.length > 0);

// Get operator display text
function getOperatorDisplay(operator) {
  const operators = {
    '=': 'is',
    'is not': 'is not',
    '>': 'is greater than',
    '<': 'is less than',
    '>=': 'is at least',
    '<=': 'is at most',
    'contains': 'contains',
    'includes': 'includes',
    'excludes': 'excludes',
    'startsWith': 'starts with',
    'endsWith': 'ends with'
  };
  return operators[operator] || operator;
}

function normalizeSortPropertyName(rawSortPropertyName) {
  return String(rawSortPropertyName || '').trim().replace(/^-/, '');
}

function getSortDirection(ruleArray = []) {
  const rawSortDirection = String(ruleArray[2] || '').toLowerCase();
  if (rawSortDirection === 'asc' || rawSortDirection === 'desc') {
    return rawSortDirection;
  }

  return String(ruleArray[1] || '').trim().startsWith('-')
    ? 'desc'
    : 'asc';
}

function formatGroupByTarget(target) {
  if (target === 'none') {
    return 'no grouping';
  }

  return target || 'property';
}

function formatPropertyLabel(propertyName) {
  const normalizedPropertyName = String(propertyName || '').trim();
  if (!normalizedPropertyName) {
    return '';
  }

  if (isGlobalCategoryProperty(normalizedPropertyName)) {
    return 'global rule';
  }

  return normalizedPropertyName;
}

function isGlobalCategoryProperty(propertyName) {
  const normalizedPropertyName = String(propertyName || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return normalizedPropertyName === 'globalcategory';
}

function normalizeCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function getSortDirectionLabel(sortPropertyName, sortDirection) {
  const normalizedSortPropertyName = String(sortPropertyName || '').toLowerCase();
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();

  if (normalizedSortPropertyName === 'date') {
    return normalizedSortDirection === 'asc'
      ? 'oldest to newest'
      : 'newest to oldest';
  }

  if (normalizedSortPropertyName === 'amount') {
    return normalizedSortDirection === 'asc'
      ? 'low to high'
      : 'high to low';
  }

  if (
    normalizedSortPropertyName === 'name'
    || normalizedSortPropertyName === 'tag'
    || normalizedSortPropertyName === 'category'
  ) {
    return normalizedSortDirection === 'asc'
      ? 'A to Z'
      : 'Z to A';
  }

  return normalizedSortDirection === 'asc'
    ? 'ascending'
    : 'descending';
}

function formatCombinator(combinator) {
  return normalizeCombinator(combinator).toUpperCase();
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

function usesCategorizeSetTargetFormat(ruleValues = []) {
  return Array.isArray(ruleValues)
    && ruleValues[0] === 'categorize'
    && ruleValues.length >= 6
    && (ruleValues.length - 6) % 4 === 0
    && isCategorizeSetTarget(ruleValues[4]);
}

function getCategorizeAssignmentTarget(ruleValues = []) {
  return usesCategorizeSetTargetFormat(ruleValues)
    ? normalizeCategorizeSetTarget(ruleValues[4])
    : 'category';
}

function getCategorizeAssignmentValue(ruleValues = []) {
  return usesCategorizeSetTargetFormat(ruleValues)
    ? String(ruleValues[5] ?? '')
    : String(ruleValues[4] ?? '');
}

function getAdditionalConditionsStartIndex(ruleValues = []) {
  return usesCategorizeSetTargetFormat(ruleValues) ? 6 : 5;
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 200px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style> 

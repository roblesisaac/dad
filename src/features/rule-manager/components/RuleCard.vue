<template>
  <div 
    class="rule-card bg-white rounded-2xl border-2 transition-all duration-300 relative group"
    :class="[
      isEnabledForCurrentTab 
        ? 'border-gray-100 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]' 
        : 'border-gray-50 opacity-60 grayscale'
    ]"
  >
    <!-- Combined Header & Info -->
    <div class="p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-grow min-w-0">
          <!-- Rule Type Icon -->
          <div 
            class="mt-0.5 p-2 rounded-xl transition-colors border-2 flex-shrink-0"
            :class="`bg-${ruleType.color}-50/50 border-${ruleType.color}-100 text-${ruleType.color}-600`"
          >
            <component :is="getRuleTypeIcon()" class="w-4 h-4" />
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h4 class="text-base font-black text-gray-900 tracking-tight leading-none group-hover:text-black transition-colors truncate">
                {{ getRuleDisplayName() }}
              </h4>
              <!-- Indicators -->
              <span v-if="rule._isImportant" class="text-[8px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Priority</span>
              <span v-if="isGlobalRule" class="text-[8px] font-black uppercase tracking-tighter bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">Global</span>
            </div>
            <p class="text-xs text-gray-400 font-medium truncate">{{ getRuleDescription() }}</p>
          </div>
        </div>

        <div class="flex flex-col items-end gap-3 flex-shrink-0">
          <Switch 
            :model-value="isEnabledForCurrentTab" 
            @update:model-value="$emit('toggle', rule)" 
          />
          <div class="drag-handle cursor-move p-1 text-gray-100 group-hover:text-gray-300 hover:text-black transition-colors" title="Drag to reorder">
            <GripVertical class="w-4 h-4" />
          </div>
        </div>
      </div>

      <!-- Simplified Logic Visualization -->
      <div 
        v-if="rule.rule.length > 1"
        class="mt-4 pt-4 border-t-2 border-gray-50 group-hover:border-gray-100 transition-colors"
      >
        <!-- Sort Rule -->
        <div v-if="ruleType.id === 'sort'" class="flex items-center gap-2 text-xs">
          <span class="text-gray-400 font-black uppercase text-[9px] tracking-widest">Order by</span>
          <span class="font-black text-gray-800">{{ rule.rule[1] }}</span>
          <span class="text-gray-300">/</span>
          <span class="font-black text-gray-800 uppercase text-[10px]">{{ rule.rule[2] === 'desc' ? 'Desc' : 'Asc' }}</span>
        </div>
        
        <!-- Filter Rule -->
        <div v-else-if="ruleType.id === 'filter'" class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-black text-gray-800">{{ rule.rule[1] }}</span>
          <span class="text-[10px] font-bold text-gray-400 uppercase">{{ getOperatorDisplay(rule.rule[2]) }}</span>
          <span class="font-black text-black">{{ rule.rule[3] }}</span>
          <template v-for="(andCondition, index) in getAndConditions(rule)" :key="index">
            <span class="text-[9px] font-black uppercase text-gray-300">AND</span>
            <span class="font-black text-gray-800">{{ andCondition.property }}</span>
            <span class="text-[10px] font-bold text-gray-400 uppercase">{{ getOperatorDisplay(andCondition.method) }}</span>
            <span class="font-black text-black">{{ andCondition.value }}</span>
          </template>
        </div>
        
        <!-- Categorize Rule -->
        <div v-else-if="ruleType.id === 'categorize'" class="flex flex-wrap items-center gap-2 text-xs">
          <span class="text-gray-400 font-black uppercase text-[9px] tracking-widest">If</span>
          <span class="font-black text-gray-800">{{ rule.rule[1] }}</span>
          <span class="text-[9px] font-black text-gray-400 uppercase">{{ getOperatorDisplay(rule.rule[2]) }}</span>
          <span class="font-black text-gray-800">{{ rule.rule[3] }}</span>
          <span class="text-black inline-flex items-center gap-1">
            <span class="w-2 h-px bg-gray-300"></span>
            <span class="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-lg ml-1">{{ rule.rule[4] }}</span>
          </span>
        </div>
        
        <!-- Group By Rule -->
        <div v-else-if="ruleType.id === 'groupBy'" class="flex items-center gap-2 text-xs">
          <span class="text-gray-400 font-black uppercase text-[9px] tracking-widest">Aggregate by</span>
          <span class="font-black text-gray-800">{{ rule.rule[1] }}</span>
        </div>
      </div>
    </div>
    
    <!-- Discreet Hover Action Bar -->
    <div class="flex border-t-2 border-gray-50 bg-gray-50/20 transition-opacity">
      <button 
        @click="$emit('edit', rule)"
        class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black hover:bg-white transition-all border-r-2 border-gray-50 flex items-center justify-center gap-2"
      >
        <Edit class="w-3.5 h-3.5" />
        Edit
      </button>
      <button 
        @click="$emit('delete', rule)"
        class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all flex items-center justify-center gap-2"
      >
        <Trash class="w-3.5 h-3.5" />
        Remove
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  ArrowUp, ArrowDown, Edit, Trash, GripVertical,
  SortAsc, Filter, Tags, Group // Additional icons for rule types
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
  }
});

defineEmits(['edit', 'toggle', 'delete']);

// Determine if rule is global or tab-specific
const isGlobalRule = computed(() => props.rule.applyForTabs.includes('_GLOBAL'));
const isTabSpecificRule = computed(() => {
  const tabId = state.selected.tab?._id;
  return tabId && props.rule.applyForTabs.includes(tabId) && !isGlobalRule.value;
});

// Check if rule is enabled for current tab
const isEnabledForCurrentTab = computed(() => {
  const tabId = state.selected.tab?._id;
  return props.rule.applyForTabs.includes('_GLOBAL') || props.rule.applyForTabs.includes(tabId);
});

// Get the appropriate icon for the rule type
function getRuleTypeIcon() {
  const iconMap = {
    'sort': SortAsc,
    'filter': Filter,
    'categorize': Tags,
    'groupBy': Group
  };
  
  return iconMap[props.ruleType.id] || Filter;
}

// Get operator display text
function getOperatorDisplay(operator) {
  const operators = {
    '=': 'equals',
    'is not': 'does not equal',
    '>': 'is greater than',
    '<': 'is less than',
    '>=': 'is greater than or equal to',
    '<=': 'is less than or equal to',
    'contains': 'contains',
    'includes': 'includes',
    'excludes': 'does not include',
    'startsWith': 'starts with',
    'endsWith': 'ends with'
  };
  
  return operators[operator] || operator;
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

// Generate a readable name for the rule
function getRuleDisplayName() {
  if (props.ruleType.id === 'sort') {
    return `Sort by ${props.rule.rule[1] || 'property'}`;
  } else if (props.ruleType.id === 'filter') {
    return `Filter ${props.rule.rule[1] || 'items'}`;
  } else if (props.ruleType.id === 'categorize') {
    // Fixed to use rule[4] for category name
    return `Categorize as ${props.rule.rule[4] || 'category'}`;
  } else if (props.ruleType.id === 'groupBy') {
    return `Group by ${props.rule.rule[1] || 'property'}`;
  }
  return `${props.ruleType.name.replace(' Rules', '')} Rule`;
}

// Generate a description for the rule
function getRuleDescription() {
  return props.ruleType.description || 'Custom rule';
}
</script>

<style scoped>
.rule-card {
  display: flex;
  flex-direction: column;
}
</style> 

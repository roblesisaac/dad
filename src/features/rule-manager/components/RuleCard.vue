<template>
  <div 
    class="relative p-4 rounded-lg border transition-all hover:shadow-sm"
    :class="[
      isGlobalRule || isTabSpecificRule
        ? `border-${ruleType.color}-200 bg-${ruleType.color}-50/70`
        : 'border-gray-200 bg-gray-50/70'
    ]"
  >
    <!-- Rule Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <!-- Drag Handle -->
        <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600 transition-colors">
          <GripVertical class="w-4 h-4" />
        </div>
        
        <h4 class="font-medium text-gray-900">{{ getRuleDisplayName() }}</h4>
        
        <!-- Important indicator -->
        <Star v-if="rule._isImportant" class="w-4 h-4 text-amber-500" title="Important rule" />
      </div>

      <!-- Rule scope badges -->
      <div class="flex gap-2">
        <span
          v-if="isGlobalRule"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
        >
          Global
        </span>
        <span
          v-if="isTabSpecificRule"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
        >
          Tab
        </span>
      </div>
    </div>

    <!-- Rule Description -->
    <p class="text-sm text-gray-600 mb-3">{{ getRuleDescription() }}</p>
    
    <!-- Rule Criteria Visualization - simplified -->
    <div 
      v-if="rule.rule.length > 1"
      class="text-sm bg-white rounded-md border border-gray-200 p-2.5 mb-3 font-mono"
    >
      <div v-if="ruleType.id === 'sort'" class="flex items-center">
        <span>
          Sort by <strong>{{ rule.rule[1] || 'Property' }}</strong>
          <ArrowDown v-if="rule.rule[2] === 'desc'" class="w-4 h-4 ml-1 inline" />
          <ArrowUp v-else class="w-4 h-4 ml-1 inline" />
        </span>
      </div>
      
      <div v-else-if="ruleType.id === 'filter'">
        <span>
          <strong>{{ rule.rule[1] || 'property' }}</strong>
          {{ getOperatorDisplay(rule.rule[2]) }}
          <strong>{{ rule.rule[3] || 'value' }}</strong>
        </span>
      </div>
      
      <div v-else-if="ruleType.id === 'categorize'">
        <span>
          <strong>{{ rule.rule[1] || 'property' }}</strong>
          {{ getOperatorDisplay(rule.rule[2]) }} 
          <strong>{{ rule.rule[3] || 'value' }}</strong>
          → category: <strong>{{ rule.rule[4] || 'category' }}</strong>
        </span>
      </div>
      
      <div v-else-if="ruleType.id === 'groupBy'">
        <span>
          Group by <strong>{{ rule.rule[1] || 'property' }}</strong>
        </span>
      </div>
    </div>
    
    <!-- Rule Footer -->
    <div class="flex justify-between items-center">
      <!-- Rule metadata -->
      <div class="text-xs text-gray-500">
        <span>Order: {{ rule.orderOfExecution || 0 }}</span>
      </div>
      
      <!-- Rule Actions -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <span class="text-xs text-gray-600">{{ isEnabledForCurrentTab ? 'Enabled' : 'Disabled' }}</span>
          <Switch 
            :model-value="isEnabledForCurrentTab" 
            @update:model-value="$emit('toggle', rule)" 
          />
        </div>
        
        <div class="flex">
          <button 
            @click="$emit('edit', rule)"
            class="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
            title="Edit rule"
          >
            <Edit class="w-4 h-4" />
          </button>
          
          <button 
            @click="$emit('delete', rule)"
            class="p-1.5 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Delete rule"
          >
            <Trash class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  ArrowUp, ArrowDown, Edit, Trash, Star, GripVertical
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

// Get operator display text
function getOperatorDisplay(operator) {
  const operators = {
    '===': 'equals',
    '!==': 'does not equal',
    '>': 'is greater than',
    '<': 'is less than',
    '>=': 'is greater than or equal to',
    '<=': 'is less than or equal to',
    'includes': 'includes',
    '!includes': 'does not include',
    'startsWith': 'starts with',
    'endsWith': 'ends with',
    'regex': 'matches pattern',
    'exists': 'exists',
    '!exists': 'does not exist'
  };
  
  return operators[operator] || operator;
}

// Generate a readable name for the rule
function getRuleDisplayName() {
  if (props.ruleType.id === 'sort') {
    return `Sort by ${props.rule.rule[1] || 'property'}`;
  } else if (props.ruleType.id === 'filter') {
    return `Filter ${props.rule.rule[1] || 'items'}`;
  } else if (props.ruleType.id === 'categorize') {
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
/* Ensure toggle appears properly */
input:checked + label span {
  transform: translateX(100%);
}
</style> 
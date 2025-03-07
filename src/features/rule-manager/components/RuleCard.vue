<template>
  <div 
    class="p-4 rounded-md border relative"
    :class="[
      isGlobalRule || isTabSpecificRule
        ? `border-${ruleType.color}-200 bg-${ruleType.color}-50`
        : 'border-gray-200 bg-gray-50 opacity-75'
    ]"
  >
    <!-- Global/Tab Badge -->
    <div class="absolute top-2 right-2 flex space-x-1">
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

    <!-- Drag Handle for reordering -->
    <div class="absolute top-2 left-2 drag-handle cursor-move opacity-30 hover:opacity-100">
      <GripVertical class="w-4 h-4 text-gray-400" />
    </div>

    <!-- Rule Content -->
    <div class="flex items-start pl-4"> <!-- Added left padding for drag handle -->
      
      <div class="flex-1">
        <!-- Rule info -->
        <div class="mb-2">
          <h4 class="font-medium text-gray-900 mb-1">{{ getRuleDisplayName() }}</h4>
          <p class="text-sm text-gray-500">{{ getRuleDescription() }}</p>
        </div>
        
        <!-- Rule criteria visualization -->
        <div 
          v-if="rule.rule.length > 1"
          class="text-sm bg-white rounded-md border border-gray-200 p-2 mb-3"
        >
          <div v-if="ruleType.id === 'sort'" class="flex items-center">
            <span>Sort by <span class="font-medium">{{ rule.rule[1] || 'Property' }}</span></span>
            <ArrowDown v-if="rule.rule[2] === 'desc'" class="w-4 h-4 ml-1 text-gray-500" />
            <ArrowUp v-else class="w-4 h-4 ml-1 text-gray-500" />
          </div>
          
          <div v-else-if="ruleType.id === 'filter'" class="flex items-center">
            <span>
              Filter where <span class="font-medium">{{ rule.rule[1] || 'property' }}</span>
              {{ getOperatorDisplay(rule.rule[2]) }}
              <span class="font-medium">{{ rule.rule[3] || 'value' }}</span>
            </span>
          </div>
          
          <div v-else-if="ruleType.id === 'categorize'" class="flex items-center">
            <span>
              Categorize as <span class="font-medium">{{ rule.rule[3] || 'category' }}</span>
              where <span class="font-medium">{{ rule.rule[1] || 'property' }}</span>
              {{ getOperatorDisplay(rule.rule[2]) }}
              <span class="font-medium">{{ rule.rule[4] || 'value' }}</span>
            </span>
          </div>
          
          <div v-else-if="ruleType.id === 'groupBy'" class="flex items-center">
            <span>
              Group by <span class="font-medium">{{ rule.rule[1] || 'property' }}</span>
            </span>
          </div>
        </div>
        
        <!-- Rule Actions -->
        <div class="flex justify-between items-center mt-2">
          <div class="text-xs text-gray-500">
            <span v-if="rule._isImportant" class="mr-2">
              <Star class="w-3 h-3 inline-block text-amber-500" /> Important
            </span>
            <span>Order: {{ rule.orderOfExecution || 0 }}</span>
          </div>
          
          <div class="flex space-x-2 items-center">
            <!-- Global Switch component -->
            <Switch 
              :model-value="isEnabledForCurrentTab" 
              @update:model-value="$emit('toggle', rule)" 
            />
            
            <button 
              @click="$emit('edit', rule)"
              class="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              title="Edit rule"
            >
              <Edit class="w-4 h-4" />
            </button>
            
            <button 
              @click="$emit('delete', rule)"
              class="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              title="Delete rule"
            >
              <Trash class="w-4 h-4" />
            </button>
          </div>
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
    return `Categorize as ${props.rule.rule[3] || 'category'}`;
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
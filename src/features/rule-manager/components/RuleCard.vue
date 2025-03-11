<template>
  <div 
    class="rule-card bg-white rounded-lg shadow-sm border-l-4 transition-all hover:shadow"
    :class="[
      isGlobalRule || isTabSpecificRule 
        ? `border-l-${ruleType.color}-500` 
        : 'border-l-gray-300',
      isEnabledForCurrentTab ? 'opacity-100' : 'opacity-60'
    ]"
  >
    <!-- Rule Type Indicator and Actions Row -->
    <div class="flex items-center justify-between p-3 border-b border-gray-100">
      <!-- Left side with rule type and scope -->
      <div class="flex items-center gap-2">
        <!-- Rule type icon -->
        <div 
          class="p-1.5 rounded-md"
          :class="`bg-${ruleType.color}-100 text-${ruleType.color}-700`"
        >
          <component 
            :is="getRuleTypeIcon()" 
            class="w-4 h-4" 
          />
        </div>
        
        <!-- Badge indicators -->
        <div class="flex gap-1">
          <span 
            v-if="rule._isImportant" 
            class="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 text-xs font-medium"
            title="Important rule"
          >
            Priority
          </span>
          <span
            v-if="isGlobalRule"
            class="px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800 text-xs font-medium"
          >
            Global
          </span>
          <span
            v-if="isTabSpecificRule"
            class="px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 text-xs font-medium"
          >
            Tab
          </span>
        </div>
      </div>
      
      <!-- Right side with toggle switch -->
      <div class="flex items-center">
        <div 
          class="px-1.5 rounded text-xs font-medium mr-1"
          :class="isEnabledForCurrentTab 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-500'"
        >
          {{ isEnabledForCurrentTab ? 'Active' : 'Inactive' }}
        </div>
        <Switch 
          :model-value="isEnabledForCurrentTab" 
          @update:model-value="$emit('toggle', rule)" 
        />
      </div>
    </div>
    
    <!-- Rule Content -->
    <div class="p-3">
      <!-- Rule Name and Order -->
      <div class="flex justify-between items-center mb-2">
        <h4 class="font-medium text-gray-900">{{ getRuleDisplayName() }}</h4>
        <span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          Order: {{ rule.orderOfExecution || 0 }}
        </span>
      </div>
      
      <!-- Rule Description -->
      <p class="text-sm text-gray-600 mb-2">{{ getRuleDescription() }}</p>
      
      <!-- Rule Criteria -->
      <div 
        v-if="rule.rule.length > 1"
        class="text-sm border-l-2 pl-2 mb-2 py-1"
        :class="`border-l-${ruleType.color}-300`"
      >
        <!-- Sort Rule -->
        <div v-if="ruleType.id === 'sort'" class="flex items-center gap-1">
          <span class="text-gray-600">Sort by:</span>
          <span class="font-semibold">{{ rule.rule[1] || 'Property' }}</span>
          <ArrowDown v-if="rule.rule[2] === 'desc'" class="w-3.5 h-3.5 text-gray-500" title="Descending" />
          <ArrowUp v-else class="w-3.5 h-3.5 text-gray-500" title="Ascending" />
        </div>
        
        <!-- Filter Rule -->
        <div v-else-if="ruleType.id === 'filter'" class="flex flex-wrap items-center gap-1">
          <span class="font-semibold">{{ rule.rule[1] || 'property' }}</span>
          <span class="text-gray-600">{{ getOperatorDisplay(rule.rule[2]) }}</span>
          <span class="font-semibold">{{ rule.rule[3] || 'value' }}</span>
        </div>
        
        <!-- Categorize Rule - Fixed array indices -->
        <div v-else-if="ruleType.id === 'categorize'" class="flex flex-col gap-1">
          <div class="flex items-center gap-1">
            <span class="text-gray-600">Category:</span>
            <span class="font-semibold">{{ rule.rule[4] || 'category' }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-gray-600">When:</span>
            <span class="font-semibold">{{ rule.rule[1] || 'property' }}</span>
            <span class="text-gray-600">{{ getOperatorDisplay(rule.rule[2]) }}</span>
            <span class="font-semibold">{{ rule.rule[3] || 'value' }}</span>
          </div>
        </div>
        
        <!-- Group By Rule -->
        <div v-else-if="ruleType.id === 'groupBy'" class="flex items-center gap-1">
          <span class="text-gray-600">Group by:</span>
          <span class="font-semibold">{{ rule.rule[1] || 'property' }}</span>
        </div>
      </div>
    </div>
    
    <!-- Action Bar -->
    <div class="flex border-t border-gray-100">
      <!-- Drag Handle -->
      <div 
        class="drag-handle cursor-move p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        title="Drag to reorder"
      >
        <GripVertical class="w-4 h-4" />
      </div>
      
      <div class="flex-grow"></div>
      
      <!-- Edit button -->
      <button 
        @click="$emit('edit', rule)"
        class="p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        title="Edit rule"
      >
        <Edit class="w-4 h-4" />
      </button>
      
      <!-- Delete button -->
      <button 
        @click="$emit('delete', rule)"
        class="p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600 transition-colors rounded-br-lg"
        title="Delete rule"
      >
        <Trash class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  ArrowUp, ArrowDown, Edit, Trash, Star, GripVertical,
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
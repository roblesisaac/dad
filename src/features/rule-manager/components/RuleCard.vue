<template>
  <div 
    class="rule-card bg-white rounded-lg shadow-sm border-l-4 transition-all hover:shadow"
    :class="[
      isGlobalRule || isTabSpecificRule 
        ? getBorderLeftClass() 
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
          :class="getIconBackgroundClass()"
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
      <!-- Rule Name -->
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center">
          <h4 class="font-medium text-gray-900">{{ getDisplayTitle() }}</h4>
          
          <!-- Sort direction indicators -->
          <div v-if="ruleType.id === 'sort'" class="ml-2 flex items-center">
            <ArrowDown v-if="rule.rule[2] === 'desc'" class="w-3.5 h-3.5 text-gray-500" title="Descending" />
            <ArrowUp v-else class="w-3.5 h-3.5 text-gray-500" title="Ascending" />
          </div>
        </div>
        
        <!-- Info tooltip -->
        <div class="flex items-center">
          <div 
            class="relative inline-block cursor-pointer tooltip-container"
            :class="getTooltipTextColorClass()"
          >
            <Info class="w-4 h-4" />
            <div class="tooltip absolute z-10 invisible opacity-0 bg-gray-800 text-white text-xs rounded py-1 px-2 right-0 bottom-full mb-1 w-48 transition-opacity duration-150">
              {{ getRuleDescription() }}
              <div class="tooltip-arrow"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Rule Criteria (simplified) -->
      <div 
        v-if="rule.rule.length > 1 && shouldShowCriteria()"
        :class="['text-sm border-l-2 pl-2 mb-0 py-1', getBorderColorClass()]"
      >
        <!-- Filter Rule -->
        <div v-if="ruleType.id === 'filter'" class="flex flex-col">
          <div class="flex items-center gap-1">
            <span class="text-gray-600">When</span>
            <span class="font-semibold">{{ rule.rule[1] || 'property' }}</span>
            <span class="text-gray-600">{{ getOperatorDisplay(rule.rule[2]) }}</span>
          </div>
          <!-- Filter Keywords as Tags -->
          <div class="mt-1.5">
            <TagList 
              :tag-string="rule.rule[3]" 
              color="amber"
            />
          </div>
        </div>
        
        <!-- Categorize Rule - Fixed array indices -->
        <div v-else-if="ruleType.id === 'categorize'" class="flex flex-col">
          <div class="flex items-center gap-1">
            <span class="text-gray-600">When</span>
            <span class="font-semibold">{{ rule.rule[1] || 'property' }}</span>
            <span class="text-gray-600">{{ getOperatorDisplay(rule.rule[2]) }}</span>
          </div>
          <!-- Category Keywords as Tags -->
          <div class="mt-1.5 pl-4">
            <TagList 
              :tag-string="rule.rule[3]" 
              color="teal"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Action Bar -->
    <div class="flex border-t border-gray-100">
      <!-- Drag Handle and Order -->
      <div class="flex items-center">
        <div 
          class="drag-handle cursor-move p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical class="w-4 h-4" />
        </div>
        <span 
          class="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"
          title="Execution order - lower numbers run first"
        >
          #{{ rule.orderOfExecution || 0 }}
        </span>
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
  SortAsc, Filter, Tags, Group, Info // Additional icons for rule types
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import Switch from '@/shared/components/Switch.vue';
import TagList from '@/shared/components/TagList.vue';

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

// Border color map
const borderColorMap = {
  sort: 'border-l-cyan-300',
  categorize: 'border-l-teal-300',
  filter: 'border-l-amber-300',
  groupBy: 'border-l-indigo-300'
};

// Border left color classes for the main card
const borderLeftMap = {
  sort: 'border-l-cyan-500',
  categorize: 'border-l-teal-500',
  filter: 'border-l-amber-500',
  groupBy: 'border-l-indigo-500'
};

// Icon background color classes
const iconBgMap = {
  sort: 'bg-cyan-100 text-cyan-700',
  categorize: 'bg-teal-100 text-teal-700',
  filter: 'bg-amber-100 text-amber-700',
  groupBy: 'bg-indigo-100 text-indigo-700'
};

// Icon text color classes for tooltip
const tooltipTextColorMap = {
  sort: 'text-cyan-600',
  categorize: 'text-teal-600',
  filter: 'text-amber-600',
  groupBy: 'text-indigo-600'
};

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

// Generate a concise but descriptive title for the rule
function getDisplayTitle() {
  if (props.ruleType.id === 'sort') {
    return `Sort by ${props.rule.rule[1] || 'property'}`;
  } else if (props.ruleType.id === 'filter') {
    return `Filter ${props.rule.rule[1] || 'items'}`;
  } else if (props.ruleType.id === 'categorize') {
    return `Categorize as "${props.rule.rule[4] || 'category'}"`;
  } else if (props.ruleType.id === 'groupBy') {
    return `Group by ${props.rule.rule[1] || 'property'}`;
  }
  return `${props.ruleType.name.replace(' Rules', '')} Rule`;
}

// Generate a description for the rule
function getRuleDescription() {
  return props.ruleType.description || 'Custom rule';
}

// Get the appropriate border color class for this rule type
function getBorderColorClass() {
  return borderColorMap[props.ruleType.id] || 'border-l-gray-300';
}

// Get the appropriate border-left color class for the card
function getBorderLeftClass() {
  return borderLeftMap[props.ruleType.id] || 'border-l-gray-500';
}

// Get the appropriate icon background color class
function getIconBackgroundClass() {
  return iconBgMap[props.ruleType.id] || 'bg-gray-100 text-gray-700';
}

// Get the appropriate text color class for the tooltip container
function getTooltipTextColorClass() {
  return tooltipTextColorMap[props.ruleType.id] || 'text-blue-600';
}

// Determine if we should show the detailed criteria section
function shouldShowCriteria() {
  // For sort rules, the criteria is already shown in the title with the arrow
  if (props.ruleType.id === 'sort') return false;
  
  // For groupBy rules, the criteria is basically the same as the title
  if (props.ruleType.id === 'groupBy') return false;
  
  // For filter and categorize rules, show the criteria details
  return true;
}
</script>

<style scoped>
.rule-card {
  display: flex;
  flex-direction: column;
}

.tooltip-container:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 5px 5px 0 5px;
  border-color: #1f2937 transparent transparent transparent;
  bottom: -5px;
  right: 5px;
}
</style> 
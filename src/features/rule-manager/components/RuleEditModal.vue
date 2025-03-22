<template>
  <BaseModal 
    :is-open="true" 
    size="md"
    @close="$emit('close')"
    :show-close-button="true"
    :hide-header="true"
  >
    <template #content>
      <div>
        <!-- Modal header -->
        <div 
          class="px-4 py-3 border-b flex justify-between items-center"
          :class="{
            [`bg-${currentRuleConfig.color}-100 border-${currentRuleConfig.color}-200`]: true
          }"
        >
          <h3 
            class="text-lg font-medium"
            :class="{
              [`text-${currentRuleConfig.color}-800`]: true
            }"
          >
            {{ isNew ? 'Create New' : 'Edit' }} {{ capitalizeFirstLetter(ruleData.rule[0]) }} Rule
          </h3>
          <button 
            @click="$emit('close')" 
            class="rounded-full p-1 hover:bg-gray-200 transition-colors"
          >
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <!-- Modal body -->
        <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <form @submit.prevent="saveRule">
            <!-- Rule Type -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
              <select 
                v-model="ruleData.rule[0]" 
                class="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                @change="updateRuleType"
              >
                <option value="categorize">Categorize</option>
                <option value="sort">Sort</option>
                <option value="filter">Filter</option>
                <option value="groupBy">Group By</option>
              </select>
            </div>
            
            <!-- Dynamic fields based on rule type and field order -->
            <template v-for="(fieldType, index) in currentRuleConfig.fieldOrder" :key="index">
              <!-- Property field -->
              <div v-if="fieldType === 'property'" class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ currentRuleConfig.propertyLabel }}
                </label>
                <select 
                  v-model="ruleData.rule[1]" 
                  class="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option v-for="option in propertyOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <!-- Method field -->
              <div v-if="fieldType === 'method' && currentRuleConfig.requiresMethod" class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ currentRuleConfig.methodLabel }}
                </label>
                <select 
                  v-model="ruleData.rule[2]" 
                  class="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option v-for="option in methodOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <!-- Criterion field -->
              <div v-if="fieldType === 'criterion'" class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ currentRuleConfig.criterionLabel }}
                </label>
                <textarea 
                  v-model="ruleData.rule[3]" 
                  rows="2"
                  class="form-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  :placeholder="criterionPlaceholder"
                ></textarea>
              </div>
              
              <!-- Additional fields -->
              <template v-if="fieldType === 'additional'">
                <div v-for="field in currentRuleConfig.additionalFields" :key="field.name" class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ field.label }}
                  </label>
                  <input 
                    v-model="ruleData.rule[field.index]" 
                    type="text" 
                    class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    :placeholder="field.placeholder"
                  />
                </div>
              </template>
            </template>
            
            <!-- Rule scope -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Rule Scope
              </label>
              <div class="mt-2 space-y-2">
                <div class="flex items-center">
                  <input 
                    id="scope-global" 
                    v-model="isGlobalRule" 
                    name="scope" 
                    type="radio" 
                    :value="true"
                    class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label for="scope-global" class="ml-2 block text-sm text-gray-700">
                    Global (applies to all tabs)
                  </label>
                </div>
                <div class="flex items-center">
                  <input 
                    id="scope-tab" 
                    v-model="isGlobalRule" 
                    name="scope" 
                    type="radio" 
                    :value="false"
                    class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label for="scope-tab" class="ml-2 block text-sm text-gray-700">
                    Tab-specific (only for "{{ state.selected.tab?.tabName || 'Current Tab' }}")
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <!-- Modal footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            @click="saveRule" 
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            {{ isNew ? 'Create' : 'Save' }}
          </button>
          <button 
            @click="$emit('close')" 
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import ToggleSwitch from '@/shared/components/ToggleSwitch.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';

const { state } = useDashboardState();

const props = defineProps({
  rule: {
    type: Object,
    default: () => ({
      rule: ['categorize', '', '', '', ''],
      applyForTabs: ['_GLOBAL'],
      orderOfExecution: 0
    })
  },
  isNew: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save']);

// Create a deep copy of the rule to avoid mutating props directly
const ruleData = ref(JSON.parse(JSON.stringify(props.rule)));

// Initialize global setting based on rule type for new rules
if (props.isNew && ruleData.value.rule[0] === 'categorize') {
  if (!ruleData.value.applyForTabs.includes('_GLOBAL')) {
    ruleData.value.applyForTabs.push('_GLOBAL');
  }
}

// Track whether this is a global or tab-specific rule
const isGlobalRule = computed({
  get: () => ruleData.value.applyForTabs.includes('_GLOBAL'),
  set: (value) => {
    if (value) {
      // Add _GLOBAL if it's not already there
      if (!ruleData.value.applyForTabs.includes('_GLOBAL')) {
        ruleData.value.applyForTabs.push('_GLOBAL');
      }
    } else {
      // Remove _GLOBAL
      ruleData.value.applyForTabs = ruleData.value.applyForTabs.filter(id => id !== '_GLOBAL');
      
      // Ensure the current tab ID is included
      const tabId = state.selected.tab?._id;
      if (tabId && !ruleData.value.applyForTabs.includes(tabId)) {
        ruleData.value.applyForTabs.push(tabId);
      }
    }
  }
});

// Set global to true when rule type changes to categorize
watch(() => ruleData.value.rule[0], (newRuleType) => {
  if (newRuleType === 'categorize' && props.isNew) {
    if (!ruleData.value.applyForTabs.includes('_GLOBAL')) {
      ruleData.value.applyForTabs.push('_GLOBAL');
    }
  }
});

// Define rule type configurations for dynamic UI
const ruleTypeConfigs = {
  categorize: {
    color: 'teal',
    propertyLabel: 'When',
    methodLabel: 'is',
    criterionLabel: 'this value',
    requiresMethod: true,
    requiresCriterion: true,
    additionalFields: [{
      name: 'categoryName',
      label: 'Categorize as',
      placeholder: 'Enter category name',
      index: 4
    }],
    fieldOrder: ['additional', 'property', 'method', 'criterion']
  },
  sort: {
    color: 'cyan',
    propertyLabel: 'Sort by',
    methodLabel: 'Direction',
    criterionLabel: 'Custom Value (Optional)',
    requiresMethod: true,
    requiresCriterion: false,
    additionalFields: [],
    fieldOrder: ['property', 'method']
  },
  filter: {
    color: 'amber',
    propertyLabel: 'Keep items where',
    methodLabel: 'is',
    criterionLabel: 'this value',
    requiresMethod: true,
    requiresCriterion: true,
    additionalFields: [],
    fieldOrder: ['property', 'method', 'criterion']
  },
  groupBy: {
    color: 'indigo',
    propertyLabel: 'Group items by',
    methodLabel: '',
    criterionLabel: '',
    requiresMethod: false,
    requiresCriterion: false,
    additionalFields: [],
    fieldOrder: ['property']
  }
};

// Get current rule type configuration
const currentRuleConfig = computed(() => {
  return ruleTypeConfigs[ruleData.value.rule[0]];
});

// Property options mapping
const propertyOptions = [
  { value: 'amount', label: 'Amount', type: 'numeric' },
  { value: 'date', label: 'Date', type: 'date' },
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'category', label: 'Category', type: 'text' }
];

// Method options computed based on property type and rule type
const methodOptions = computed(() => {
  const ruleType = ruleData.value.rule[0];
  const propType = propertyOptions.find(p => p.value === ruleData.value.rule[1])?.type || 'text';
  
  // Special case for sort rule - only show ascending/descending
  if (ruleType === 'sort') {
    return [
      { value: 'asc', label: 'Ascending (A-Z, 0-9)' },
      { value: 'desc', label: 'Descending (Z-A, 9-0)' }
    ];
  }
  
  const options = [];
  
  if (propType === 'numeric' || propType === 'date') {
    options.push(
      { value: '>', label: 'greater than' },
      { value: '>=', label: 'greater than or equal to' },
      { value: '<', label: 'less than' },
      { value: '<=', label: 'less than or equal to' }
    );
  }
  
  // Common options for all types
  options.push(
    { value: '=', label: 'equals' },
    { value: 'is not', label: 'not equals' }
  );
  
  if (propType === 'text') {
    options.push(
      { value: 'contains', label: 'contains' },
      { value: 'startsWith', label: 'starts with' },
      { value: 'endsWith', label: 'ends with' },
      { value: 'includes', label: 'includes' },
      { value: 'excludes', label: 'excludes' }
    );
  }
  
  return options;
});

// Criterion visibility computed based on rule type
const showCriterionField = computed(() => {
  return currentRuleConfig.value.fieldOrder.includes('criterion');
});

// Criterion placeholder based on property type
const criterionPlaceholder = computed(() => {
  const ruleType = ruleData.value.rule[0];
  const propValue = ruleData.value.rule[1];
  const propType = propertyOptions.find(p => p.value === propValue)?.type || 'text';
  
  if (ruleType === 'sort') {
    return 'Leave empty for default';
  }
  
  if (propType === 'numeric') {
    return 'Enter numeric value';
  } else if (propType === 'date') {
    return 'YYYY-MM-DD or relative date';
  } else {
    return 'Enter text value';
  }
});

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Handle rule type changes with proper initialization
function updateRuleType() {
  const newRuleType = ruleData.value.rule[0];
  
  // Reset rule properties when type changes
  ruleData.value.rule[1] = '';
  ruleData.value.rule[2] = '';
  ruleData.value.rule[3] = '';
  
  // Initialize appropriate defaults based on rule type
  if (newRuleType === 'categorize') {
    ruleData.value.rule[4] = '';
    
    // Set global by default for categorize rules if it's a new rule
    if (props.isNew && !ruleData.value.applyForTabs.includes('_GLOBAL')) {
      ruleData.value.applyForTabs.push('_GLOBAL');
    }
  } else if (newRuleType === 'sort') {
    // Default sort direction to ascending
    ruleData.value.rule[2] = 'asc';
  }
}

// Save the rule
function saveRule() {
  // Ensure all required fields are filled
  if (!validateRule()) {
    return;
  }
  
  // If not a global rule, ensure current tab ID is in applyForTabs
  if (!isGlobalRule.value) {
    const tabId = state.selected.tab?._id;
    if (tabId && !ruleData.value.applyForTabs.includes(tabId)) {
      ruleData.value.applyForTabs.push(tabId);
    }
  }
  
  emit('save', ruleData.value);
}

// Validate the rule before saving
function validateRule() {
  const rule = ruleData.value.rule;
  const config = currentRuleConfig.value;
  
  // Basic validation for all rule types
  if (!rule[0] || !rule[1]) {
    alert('Please fill out all required fields');
    return false;
  }
  
  // Validate method if required
  if (config.requiresMethod && !rule[2]) {
    alert('Please select a comparison method');
    return false;
  }
  
  // Validate criterion if required
  if (config.requiresCriterion && !rule[3]) {
    alert('Please provide a value to compare');
    return false;
  }
  
  // Validate additional fields
  for (const field of config.additionalFields) {
    if (!rule[field.index]) {
      alert(`Please provide a ${field.label.toLowerCase()}`);
      return false;
    }
  }
  
  return true;
}
</script> 
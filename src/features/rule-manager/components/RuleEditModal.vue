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
            'bg-teal-100 border-teal-200': ruleData.rule[0] === 'categorize',
            'bg-cyan-100 border-cyan-200': ruleData.rule[0] === 'sort',
            'bg-amber-100 border-amber-200': ruleData.rule[0] === 'filter',
            'bg-indigo-100 border-indigo-200': ruleData.rule[0] === 'groupBy'
          }"
        >
          <h3 
            class="text-lg font-medium"
            :class="{
              'text-teal-800': ruleData.rule[0] === 'categorize',
              'text-cyan-800': ruleData.rule[0] === 'sort',
              'text-amber-800': ruleData.rule[0] === 'filter',
              'text-indigo-800': ruleData.rule[0] === 'groupBy'
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
            
            <!-- Property to check/sort/group by -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ getPropertyLabel() }}
              </label>
              <select 
                v-model="ruleData.rule[1]" 
                class="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="amount">Amount</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
            </div>
            
            <!-- Method (except for GroupBy where it might be optional) -->
            <div v-if="ruleData.rule[0] !== 'groupBy'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ getMethodLabel() }}
              </label>
              <select 
                v-model="ruleData.rule[2]" 
                class="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option v-if="isNumericProperty(ruleData.rule[1])" value=">">is greater than</option>
                <option v-if="isNumericProperty(ruleData.rule[1])" value=">=">is greater than or equal to</option>
                <option v-if="isNumericProperty(ruleData.rule[1])" value="<">is less than</option>
                <option v-if="isNumericProperty(ruleData.rule[1])" value="<=">is less than or equal to</option>
                <option value="=">equals</option>
                <option value="is not">is not</option>
                <option v-if="isTextProperty(ruleData.rule[1])" value="contains">contains</option>
                <option v-if="isTextProperty(ruleData.rule[1])" value="startsWith">starts with</option>
                <option v-if="isTextProperty(ruleData.rule[1])" value="endsWith">ends with</option>
                <option v-if="isTextProperty(ruleData.rule[1])" value="includes">includes</option>
                <option v-if="isTextProperty(ruleData.rule[1])" value="excludes">excludes</option>
              </select>
            </div>
            
            <!-- Criterion/Value -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ getCriterionLabel() }}
              </label>
              <input 
                v-model="ruleData.rule[3]" 
                type="text" 
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                :placeholder="getCriterionPlaceholder()"
              />
            </div>
            
            <!-- Category Name (only for categorize rules) -->
            <div v-if="ruleData.rule[0] === 'categorize'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input 
                v-model="ruleData.rule[4]" 
                type="text" 
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter category name"
              />
            </div>
            
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
            
            <!-- Rule is important -->
            <div class="mb-4">
              <ToggleSwitch 
                v-model="ruleData._isImportant"
                label="Mark as important"
                description="Important rules take precedence over non-important rules"
              />
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
import { ref, computed } from 'vue';
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
      _isImportant: false,
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

// Set default values when creating a new rule
if (props.isNew) {
  // Nothing to do here now
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Handle rule type changes
function updateRuleType() {
  // Reset other rule properties when type changes
  ruleData.value.rule[1] = '';
  ruleData.value.rule[2] = '';
  ruleData.value.rule[3] = '';
  
  if (ruleData.value.rule[0] === 'categorize') {
    ruleData.value.rule[4] = '';
  }
}

// Get appropriate property label based on rule type
function getPropertyLabel() {
  const ruleType = ruleData.value.rule[0];
  
  switch(ruleType) {
    case 'sort':
      return 'Sort by Property';
    case 'filter':
      return 'Filter by Property';
    case 'categorize':
      return 'Property to Check';
    case 'groupBy':
      return 'Group by Property';
    default:
      return 'Property';
  }
}

// Get appropriate method label based on rule type
function getMethodLabel() {
  const ruleType = ruleData.value.rule[0];
  
  switch(ruleType) {
    case 'sort':
      return 'Sort Direction';
    case 'filter':
      return 'Condition';
    case 'categorize':
      return 'Comparison';
    default:
      return 'Method';
  }
}

// Get appropriate criterion label based on rule type
function getCriterionLabel() {
  const ruleType = ruleData.value.rule[0];
  
  switch(ruleType) {
    case 'sort':
      return 'Custom Value (Optional)';
    case 'filter':
      return 'Value to Compare';
    case 'categorize':
      return 'Value to Compare';
    case 'groupBy':
      return 'Group Format (Optional)';
    default:
      return 'Value';
  }
}

// Get placeholder text for criterion field
function getCriterionPlaceholder() {
  const ruleType = ruleData.value.rule[0];
  const propType = ruleData.value.rule[1];
  
  if (ruleType === 'sort') {
    return 'Leave empty for default';
  }
  
  if (propType === 'amount') {
    return 'Enter numeric value';
  } else if (propType === 'date') {
    return 'YYYY-MM-DD or relative date';
  } else {
    return 'Enter text value';
  }
}

// Check if property is numeric
function isNumericProperty(propName) {
  return propName === 'amount';
}

// Check if property is text-based
function isTextProperty(propName) {
  return propName === 'name' || propName === 'category';
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
  
  // Basic validation for all rule types
  if (!rule[0] || !rule[1]) {
    alert('Please fill out all required fields');
    return false;
  }
  
  // Specific validation for categorize rules
  if (rule[0] === 'categorize' && !rule[4]) {
    alert('Please provide a category name');
    return false;
  }
  
  // Make sure the rule has a method (except for groupBy)
  if (rule[0] !== 'groupBy' && !rule[2]) {
    alert('Please select a comparison method');
    return false;
  }
  
  return true;
}
</script> 
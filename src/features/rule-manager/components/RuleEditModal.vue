<template>
  <BaseModal 
    :is-open="true" 
    size="md"
    :content-padding="false"
    :show-close-button="false"
    :hide-header="true"
    @close="$emit('close')"
  >
    <template #content>
      <div class="flex flex-col bg-white min-h-screen">
        <div class="max-w-3xl mx-auto w-full flex flex-col min-h-screen">
          <!-- Modal header -->
          <div class="px-6 py-8 border-b-2 border-gray-100 flex justify-between items-center bg-white">
            <div>
              <h3 class="text-2xl font-black text-gray-900 tracking-tight">
                {{ isNew ? 'Create Automation Rule' : 'Edit Automation Rule' }}
              </h3>
              <p class="text-sm text-gray-400 mt-1 font-medium">
                {{ isNew ? 'Set up a new rule' : 'Modify your existing rule' }} to automatically process transactions.
              </p>
            </div>
            <button 
              @click="$emit('close')" 
              class="p-2 text-black hover:text-black hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
          
          <!-- Modal body -->
          <div class="p-6 pb-24">
            <form @submit.prevent="saveRule" class="space-y-10">
              
              <!-- Rule Action -->
              <div class="space-y-4">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Rule Action</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button
                    v-for="t in ['categorize', 'sort', 'filter', 'groupBy']"
                    :key="t"
                    type="button"
                    @click="ruleData.rule[0] = t; updateRuleType()"
                    class="px-4 py-4 rounded-xl text-base font-bold transition-all border-2 text-center flex justify-center items-center"
                    :class="ruleData.rule[0] === t 
                      ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]' 
                      : 'bg-white text-gray-500 border-gray-100 hover:border-black hover:text-black hover:bg-gray-50'"
                  >
                    {{ t === 'groupBy' ? 'Group By' : capitalizeFirstLetter(t) }}
                  </button>
                </div>
              </div>

              <!-- Condition Builder -->
              <div class="space-y-4">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                  {{
                    ruleData.rule[0] === 'groupBy'
                      ? 'Group Transactions By'
                      : ruleData.rule[0] === 'sort'
                        ? 'Sort Transactions By'
                        : 'When Transaction Matches'
                  }}
                </label>
                
                <div class="bg-gray-50/50 rounded-2xl border-2 border-gray-100 p-6">
                  <template v-if="ruleData.rule[0] === 'groupBy'">
                    <select
                      v-model="ruleData.rule[1]"
                      class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                    >
                      <option value="" disabled>Select group option...</option>
                      <option
                        v-for="groupByOption in GROUP_BY_OPTIONS"
                        :key="`group-by-option-${groupByOption.value}`"
                        :value="groupByOption.value"
                      >
                        {{ groupByOption.label }}
                      </option>
                    </select>
                  </template>

                  <template v-else-if="ruleData.rule[0] === 'sort'">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <select
                        v-model="ruleData.rule[1]"
                        class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                      >
                        <option value="" disabled>Select sort key...</option>
                        <option
                          v-for="sortPropertyOption in SORT_PROPERTY_OPTIONS"
                          :key="`sort-property-option-${sortPropertyOption.value}`"
                          :value="sortPropertyOption.value"
                        >
                          {{ sortPropertyOption.label }}
                        </option>
                      </select>

                      <select
                        v-model="ruleData.rule[2]"
                        class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                      >
                        <option value="" disabled>Select direction...</option>
                        <option
                          v-for="sortDirectionOption in SORT_DIRECTION_OPTIONS"
                          :key="`sort-direction-option-${sortDirectionOption.value}`"
                          :value="sortDirectionOption.value"
                        >
                          {{ sortDirectionOption.label }}
                        </option>
                      </select>
                    </div>
                  </template>

                  <template v-else>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <select 
                        v-model="ruleData.rule[1]" 
                        class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                      >
                        <option value="" disabled selected>Select property...</option>
                        <option value="amount">Amount</option>
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="category">Category</option>
                      </select>
                      
                      <select
                        v-model="ruleData.rule[2]" 
                        class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                      >
                        <option value="" disabled selected>Select method...</option>
                        <option
                          v-for="methodOption in getMethodOptions(ruleData.rule[0], ruleData.rule[1])"
                          :key="`main-method-${methodOption.value}`"
                          :value="methodOption.value"
                        >
                          {{ methodOption.label }}
                        </option>
                      </select>
                      
                      <input
                        v-if="useDateInputForPrimaryCondition"
                        v-model="ruleData.rule[3]"
                        type="date"
                        class="form-input w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 placeholder-gray-300 transition-colors"
                      />

                      <textarea
                        v-else
                        v-model="ruleData.rule[3]" 
                        ref="criterionInput"
                        class="form-input w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 placeholder-gray-300 transition-colors resize-none overflow-hidden"
                        :placeholder="getCriterionPlaceholder()"
                        rows="1"
                        @input="adjustHeight"
                      ></textarea>
                    </div>
                  </template>

                  <!-- AND condition -->
                  <div v-if="supportsAndCondition" class="mt-6 pt-6 border-t-2 border-gray-100 border-dashed">
                    <button 
                      v-if="!hasAndConditions" 
                      @click="addAndCondition" 
                      type="button" 
                      class="text-sm font-bold text-gray-400 bg-white border-2 border-gray-100 px-5 py-3 rounded-xl hover:border-black hover:text-black transition-all flex items-center gap-2"
                    >
                      <Plus class="w-4 h-4" />
                      Add Second Condition
                    </button>
                    
                    <div v-else class="space-y-4 relative">
                      <div class="rounded-xl border-2 border-dashed border-gray-200 bg-white/70 px-4 py-2.5 flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Group 1</span>
                        <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-black">Base Condition</span>
                      </div>

                      <div
                        v-for="(condition, index) in andConditions"
                        :key="`and-condition-${index}`"
                        :class="['space-y-4 rounded-xl border-2 p-3', getConditionGroupClass(index)]"
                      >
                        <div v-if="startsNewConditionGroup(index)" class="flex items-center gap-2">
                          <div class="h-[1px] flex-1 bg-gray-200"></div>
                          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">OR</span>
                          <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-black">
                            Start Group {{ getConditionGroupNumber(index) }}
                          </span>
                          <div class="h-[1px] flex-1 bg-gray-200"></div>
                        </div>
                        <div class="flex justify-between items-center bg-white p-3 rounded-xl border-2 border-gray-100 mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                              Group {{ getConditionGroupNumber(index) }}
                            </span>
                            <span class="text-[10px] font-black text-black uppercase tracking-[0.2em]">Join</span>
                            <select
                              v-model="condition.combinator"
                              class="rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 focus:border-black focus:ring-0"
                            >
                              <option value="and">AND</option>
                              <option value="or">OR</option>
                            </select>
                          </div>
                          <button 
                            @click="removeAndCondition(index)" 
                            type="button" 
                            class="text-gray-400 hover:text-white bg-gray-50 hover:bg-black rounded-lg p-1.5 border-2 border-transparent transition-all flex items-center gap-1.5 text-[10px] font-black px-2.5 uppercase tracking-widest"
                            title="Remove condition"
                          >
                            Remove
                            <X class="w-3.5 h-3.5"/>
                          </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <select
                            v-model="condition.property"
                            class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                          >
                            <option value="" disabled selected>Select property...</option>
                            <option value="amount">Amount</option>
                            <option value="date">Date</option>
                            <option value="name">Name</option>
                            <option value="category">Category</option>
                          </select>

                          <select
                            v-model="condition.method"
                            class="form-select w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 transition-colors"
                          >
                            <option value="" disabled selected>Select method...</option>
                            <option
                              v-for="methodOption in getMethodOptions(ruleData.rule[0], condition.property)"
                              :key="`and-method-${index}-${methodOption.value}`"
                              :value="methodOption.value"
                            >
                              {{ methodOption.label }}
                            </option>
                          </select>

                          <input
                            v-model="condition.value"
                            :type="useDateInputForCondition(condition.property) ? 'date' : 'text'"
                            class="form-input w-full rounded-xl border-2 border-gray-100 bg-white text-base py-3 px-4 focus:border-black focus:ring-0 shadow-none font-bold text-gray-800 placeholder-gray-300 transition-colors"
                            :placeholder="getCriterionPlaceholderForProperty(condition.property)"
                          />
                        </div>
                      </div>
                      <button
                        @click="addAndCondition"
                        type="button"
                        class="text-sm font-bold text-gray-400 bg-white border-2 border-gray-100 px-5 py-3 rounded-xl hover:border-black hover:text-black transition-all flex items-center gap-2"
                      >
                        <Plus class="w-4 h-4" />
                        Add Another Condition
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Result (Categorize specific) -->
              <div v-if="ruleData.rule[0] === 'categorize'" class="space-y-4">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Assign to Category</label>
                <input 
                  v-model="ruleData.rule[4]" 
                  type="text" 
                  class="form-input w-full rounded-2xl border-2 border-gray-100 focus:border-black focus:ring-0 shadow-none text-2xl font-black py-5 px-6 placeholder-gray-200 bg-white"
                  placeholder="e.g. Groceries"
                />
              </div>

              <!-- Settings (Scope & Importance) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="p-6 rounded-2xl border-2 border-gray-50 bg-white">
                  <label class="block text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Apply To</label>
                  <div class="space-y-4">
                    <label class="flex items-center gap-4 cursor-pointer group">
                      <input 
                        v-model="isGlobalRule" 
                        type="radio" 
                        :value="true"
                        class="w-5 h-5 text-black focus:ring-black border-2 border-gray-200 rounded-full bg-gray-50 transition-all"
                      />
                      <span class="text-sm font-bold text-gray-500 group-hover:text-black">All tabs (Global)</span>
                    </label>
                    <label class="flex items-center gap-4 cursor-pointer group">
                      <input 
                        v-model="isGlobalRule" 
                        type="radio" 
                        :value="false"
                        class="w-5 h-5 text-black focus:ring-black border-2 border-gray-200 rounded-full bg-gray-50 transition-all"
                      />
                      <span class="text-sm font-bold text-gray-500 group-hover:text-black">
                        Only "{{ state.selected.tab?.tabName || 'Current Tab' }}"
                      </span>
                    </label>
                  </div>
                </div>

                <div class="p-6 rounded-2xl border-2 border-gray-50 bg-white flex flex-col justify-center">
                  <ToggleSwitch 
                    v-model="ruleData._isImportant"
                    label="High Priority"
                    description="Run this rule before others"
                  />
                </div>
              </div>
            </form>
          </div>
          
          <!-- Sticky Footer -->
          <div class="mt-auto px-6 py-6 bg-white/80 backdrop-blur-sm border-t-2 border-gray-50 sticky bottom-0 flex flex-col sm:flex-row justify-end gap-4">
            <button 
              @click="$emit('close')" 
              type="button" 
              class="px-8 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold text-gray-400 hover:border-black hover:text-black flex-1 sm:flex-none transition-all"
            >
              Cancel
            </button>
            <button 
              @click="saveRule" 
              type="button" 
              class="px-10 py-4 bg-black border-2 border-black rounded-2xl text-base font-bold text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex-1 sm:flex-none"
            >
              {{ isNew ? 'Create Rule' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { X, Plus } from 'lucide-vue-next';
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

const METHOD_OPTIONS = {
  numeric: [
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater/equal to' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less/equal to' }
  ],
  common: [
    { value: '=', label: 'equals' },
    { value: 'is not', label: 'is not' }
  ],
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'includes', label: 'includes' },
    { value: 'excludes', label: 'excludes' }
  ],
  dateCondition: [
    { value: '=', label: 'is equal to' },
    { value: 'is before', label: 'is before' },
    { value: 'is after', label: 'is after' }
  ]
};

const SORT_PROPERTY_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'category', label: 'Category' },
  { value: 'amount', label: 'Amount' }
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
];

const GROUP_BY_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
  { value: 'year_month', label: 'Year + Month' },
  { value: 'day', label: 'Day' },
  { value: 'date', label: 'Date' },
  { value: 'weekday', label: 'Weekday' }
];

// Create a deep copy of the rule to avoid mutating props directly
const ruleData = ref(JSON.parse(JSON.stringify(props.rule)));

const criterionInput = ref(null);

function adjustHeight(el) {
  const target = el?.target || el;
  if (!target) return;
  target.style.height = 'auto';
  target.style.height = target.scrollHeight + 'px';
}

onMounted(() => {
  nextTick(() => {
    if (criterionInput.value) {
      adjustHeight(criterionInput.value);
    }
  });
});

// Also watch for changes in the rule type that might clear the input
watch(() => ruleData.value.rule[3], () => {
  nextTick(() => {
    if (criterionInput.value) {
      adjustHeight(criterionInput.value);
    }
  });
});

// Track whether this is a global or tab-specific rule
const isGlobalRule = computed({
  get: () => ruleData.value.applyForTabs.includes('_GLOBAL'),
  set: (value) => {
    if (value) {
      if (!ruleData.value.applyForTabs.includes('_GLOBAL')) {
        ruleData.value.applyForTabs.push('_GLOBAL');
      }
    } else {
      ruleData.value.applyForTabs = ruleData.value.applyForTabs.filter(id => id !== '_GLOBAL');
      
      const tabId = state.selected.tab?._id;
      if (tabId && !ruleData.value.applyForTabs.includes(tabId)) {
        ruleData.value.applyForTabs.push(tabId);
      }
    }
  }
});

const supportsAndCondition = computed(() =>
  ['filter', 'categorize'].includes(ruleData.value.rule[0])
);

const andConditions = ref(extractAndConditions(ruleData.value.rule));

const hasAndConditions = computed(() => andConditions.value.length > 0);

const useDateInputForPrimaryCondition = computed(() =>
  useDateInputForCondition(ruleData.value.rule[1])
);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function normalizeSortPropertyName(rawSortPropertyName) {
  return String(rawSortPropertyName || '').trim().replace(/^-/, '');
}

function normalizeSortDirection(sortDirection, rawSortPropertyName = '') {
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();
  if (normalizedSortDirection === 'asc' || normalizedSortDirection === 'desc') {
    return normalizedSortDirection;
  }

  return String(rawSortPropertyName || '').trim().startsWith('-')
    ? 'desc'
    : 'asc';
}

function isSortPropertyAllowed(sortPropertyName) {
  return SORT_PROPERTY_OPTIONS.some(option => option.value === sortPropertyName);
}

function isSortDirectionAllowed(sortDirection) {
  return SORT_DIRECTION_OPTIONS.some(option => option.value === sortDirection);
}

function normalizeSortRuleForUi() {
  if (ruleData.value.rule[0] !== 'sort') {
    return;
  }

  const normalizedSortPropertyName = normalizeSortPropertyName(ruleData.value.rule[1]);
  const normalizedSortDirection = normalizeSortDirection(ruleData.value.rule[2], ruleData.value.rule[1]);

  ruleData.value.rule[1] = isSortPropertyAllowed(normalizedSortPropertyName)
    ? normalizedSortPropertyName
    : '';

  ruleData.value.rule[2] = isSortDirectionAllowed(normalizedSortDirection)
    ? normalizedSortDirection
    : 'asc';
}

function updateRuleType() {
  ruleData.value.rule[1] = '';
  ruleData.value.rule[2] = '';
  ruleData.value.rule[3] = '';
  clearAndCondition();

  if (ruleData.value.rule[0] === 'sort') {
    ruleData.value.rule[2] = 'asc';
  }
  
  if (ruleData.value.rule[0] === 'categorize') {
    ruleData.value.rule[4] = '';
  }
}

function getCriterionPlaceholder() {
  const ruleType = ruleData.value.rule[0];
  
  if (ruleType === 'sort') {
    return 'Leave empty for default';
  }

  return getCriterionPlaceholderForProperty(ruleData.value.rule[1]);
}

function getCriterionPlaceholderForProperty(propType) {
  if (propType === 'amount') {
    return 'Enter numeric value';
  } else if (propType === 'date') {
    return useDateInputForCondition(propType)
      ? 'Select a date'
      : 'YYYY-MM-DD or relative date';
  } else {
    return 'Enter text value';
  }
}

function isNumericProperty(propName) {
  return propName === 'amount';
}

function isTextProperty(propName) {
  return propName === 'name' || propName === 'category';
}

function isDateProperty(propName) {
  return propName === 'date';
}

function useDateInputForCondition(propName) {
  return ['filter', 'categorize'].includes(ruleData.value.rule[0]) && isDateProperty(propName);
}

function getMethodOptions(ruleType, propName) {
  if (['filter', 'categorize'].includes(ruleType) && isDateProperty(propName)) {
    return METHOD_OPTIONS.dateCondition;
  }

  const options = [];

  if (isNumericProperty(propName)) {
    options.push(...METHOD_OPTIONS.numeric);
  }

  options.push(...METHOD_OPTIONS.common);

  if (isTextProperty(propName)) {
    options.push(...METHOD_OPTIONS.text);
  }

  return options;
}

function isGroupByOptionAllowed(groupByOption) {
  return GROUP_BY_OPTIONS.some(option => option.value === groupByOption);
}

function isMethodAllowed(ruleType, propName, methodName) {
  if (!methodName || ['groupBy', 'sort'].includes(ruleType)) {
    return false;
  }

  return getMethodOptions(ruleType, propName)
    .some(methodOption => methodOption.value === methodName);
}

function normalizeLegacyDateMethod(methodName) {
  if (methodName === '<') {
    return 'is before';
  }

  if (methodName === '>') {
    return 'is after';
  }

  return methodName;
}

function normalizeDateMethodsForRuleType() {
  if (!['filter', 'categorize'].includes(ruleData.value.rule[0])) {
    return;
  }

  if (isDateProperty(ruleData.value.rule[1])) {
    ruleData.value.rule[2] = normalizeLegacyDateMethod(ruleData.value.rule[2]);
  }

  andConditions.value = andConditions.value.map(condition => {
    if (!isDateProperty(condition.property)) {
      return condition;
    }

    return {
      ...condition,
      method: normalizeLegacyDateMethod(condition.method)
    };
  });
}

watch(
  () => [ruleData.value.rule[0], ruleData.value.rule[1], ruleData.value.rule[2]],
  () => {
    if (ruleData.value.rule[0] === 'groupBy' && !isGroupByOptionAllowed(ruleData.value.rule[1])) {
      ruleData.value.rule[1] = '';
    }

    if (ruleData.value.rule[0] === 'sort') {
      normalizeSortRuleForUi();
      return;
    }

    normalizeDateMethodsForRuleType();

    if (['filter', 'categorize'].includes(ruleData.value.rule[0])
      && !isMethodAllowed(ruleData.value.rule[0], ruleData.value.rule[1], ruleData.value.rule[2])) {
      ruleData.value.rule[2] = '';
    }
  }
);

watch(
  andConditions,
  () => {
    for (const condition of andConditions.value) {
      if (['filter', 'categorize'].includes(ruleData.value.rule[0]) && isDateProperty(condition.property)) {
        const normalizedMethod = normalizeLegacyDateMethod(condition.method);
        if (normalizedMethod !== condition.method) {
          condition.method = normalizedMethod;
        }
      }

      if (!isMethodAllowed(ruleData.value.rule[0], condition.property, condition.method)) {
        condition.method = '';
      }
    }
  },
  { deep: true }
);

normalizeDateMethodsForRuleType();
normalizeSortRuleForUi();

function saveRule() {
  if (!validateRule()) {
    return;
  }

  if (ruleData.value.rule[0] === 'groupBy') {
    ruleData.value.rule[2] = '';
    ruleData.value.rule[3] = '';
  }

  if (ruleData.value.rule[0] === 'sort') {
    ruleData.value.rule[1] = normalizeSortPropertyName(ruleData.value.rule[1]);
    ruleData.value.rule[2] = normalizeSortDirection(ruleData.value.rule[2], ruleData.value.rule[1]);
    ruleData.value.rule[3] = '';
  }

  normalizeAndCondition();
  
  if (!isGlobalRule.value) {
    const tabId = state.selected.tab?._id;
    if (tabId && !ruleData.value.applyForTabs.includes(tabId)) {
      ruleData.value.applyForTabs.push(tabId);
    }
  }
  
  emit('save', ruleData.value);
}

function validateRule() {
  const rule = ruleData.value.rule;
  
  if (!rule[0] || !rule[1]) {
    alert('Please fill out all required fields');
    return false;
  }
  
  if (rule[0] === 'categorize' && !rule[4]) {
    alert('Please provide a category name');
    return false;
  }

  if (rule[0] === 'groupBy' && !isGroupByOptionAllowed(rule[1])) {
    alert('Please select a valid group option');
    return false;
  }

  if (rule[0] === 'sort') {
    if (!isSortPropertyAllowed(rule[1])) {
      alert('Please select a valid sort key');
      return false;
    }

    if (!isSortDirectionAllowed(rule[2])) {
      alert('Please select a valid sort direction');
      return false;
    }
  }
  
  if (['filter', 'categorize'].includes(rule[0]) && !isMethodAllowed(rule[0], rule[1], rule[2])) {
    alert('Please select a valid comparison method');
    return false;
  }

  if (hasAndConditions.value) {
    const allAndRulesComplete = andConditions.value.every(andCondition =>
      andCondition.property &&
      isMethodAllowed(rule[0], andCondition.property, andCondition.method) &&
      String(andCondition.value || '').trim()
    );

    if (!allAndRulesComplete) {
      alert('Please complete all AND condition fields');
      return false;
    }
  }
  
  return true;
}

function normalizeAndCondition() {
  const normalizedRule = [...ruleData.value.rule.slice(0, 5)];

  if (supportsAndCondition.value) {
    for (const andCondition of andConditions.value) {
      normalizedRule.push(
        normalizeConditionCombinator(andCondition.combinator),
        andCondition.property || '',
        andCondition.method || '',
        andCondition.value || ''
      );
    }
  }

  ruleData.value.rule = normalizedRule;
}

function clearAndCondition() {
  andConditions.value = [];
}

function addAndCondition() {
  andConditions.value.push({
    combinator: 'and',
    property: ruleData.value.rule[1] || '',
    method: ruleData.value.rule[2] || '',
    value: ''
  });
}

function removeAndCondition(index) {
  andConditions.value.splice(index, 1);
}

function startsNewConditionGroup(index) {
  return normalizeConditionCombinator(andConditions.value[index]?.combinator) === 'or';
}

function getConditionGroupNumber(index) {
  let groupNumber = 1;

  for (let i = 0; i <= index; i++) {
    if (normalizeConditionCombinator(andConditions.value[i]?.combinator) === 'or') {
      groupNumber += 1;
    }
  }

  return groupNumber;
}

function getConditionGroupClass(index) {
  return getConditionGroupNumber(index) % 2 === 0
    ? 'border-blue-100 bg-blue-50/30'
    : 'border-gray-100 bg-white';
}

function extractAndConditions(rule) {
  const extractedAndConditions = [];

  for (let i = 5; i < rule.length; i += 4) {
    extractedAndConditions.push({
      combinator: normalizeConditionCombinator(rule[i]),
      property: rule[i + 1] || '',
      method: rule[i + 2] || '',
      value: rule[i + 3] || ''
    });
  }

  return extractedAndConditions;
}

function normalizeConditionCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}
</script> 

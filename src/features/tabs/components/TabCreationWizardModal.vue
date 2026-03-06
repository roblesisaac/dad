<template>
  <BaseModal
    :is-open="isOpen"
    :content-padding="false"
    :show-close-button="false"
    :hide-header="true"
    @close="handleCancel"
  >
    <template #content>
      <div class="wizard-shell">
        <div class="wizard-topbar">
          <button
            type="button"
            class="wizard-topbar-cancel"
            :disabled="isSaving"
            @click="handleCancel"
          >
            Cancel
          </button>
        </div>

        <div class="wizard-body">
          <section v-if="currentStep.id === 'name'" class="wizard-step">
            <h1 class="wizard-title">Name</h1>
            <p class="wizard-subtitle">What should we call this view?</p>

            <div class="wizard-field-wrap">
              <input
                v-model="draft.tabName"
                type="text"
                class="wizard-name-input"
                placeholder="e.g. Groceries, Big Purchases..."
                autocomplete="off"
              />
            </div>
          </section>

          <section v-else-if="currentStep.id === 'filters'" class="wizard-step">
            <h1 class="wizard-title">Filters</h1>
            <p class="wizard-subtitle">Show transactions if:</p>

            <div class="wizard-stack">
              <div
                v-for="(filterRule, index) in draft.filters"
                :key="`filter-rule-${index}`"
                class="wizard-card"
              >
                <div class="wizard-card-head">
                  <div class="wizard-card-label-row">
                    <span class="wizard-card-label">Filter {{ index + 1 }}</span>
                    <select
                      v-if="index > 0"
                      v-model="filterRule.joinOperator"
                      class="wizard-inline-select"
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    class="wizard-icon-button"
                    @click="removeFilterRule(index)"
                  >
                    <X class="wizard-icon" />
                  </button>
                </div>

                <div class="wizard-grid">
                  <div class="wizard-field">
                    <label class="wizard-label">Property</label>
                    <select
                      v-model="filterRule.property"
                      class="wizard-select"
                      @change="normalizeRuleMethod(filterRule)"
                    >
                      <option value="" disabled>Select property</option>
                      <option
                        v-for="propertyOption in PROPERTY_OPTIONS"
                        :key="`filter-property-${propertyOption.value}`"
                        :value="propertyOption.value"
                      >
                        {{ propertyOption.label }}
                      </option>
                    </select>
                  </div>

                  <div class="wizard-field">
                    <label class="wizard-label">Method</label>
                    <select
                      v-model="filterRule.method"
                      class="wizard-select"
                    >
                      <option value="" disabled>Select method</option>
                      <option
                        v-for="methodOption in getMethodOptions(filterRule.property)"
                        :key="`filter-method-${index}-${methodOption.value}`"
                        :value="methodOption.value"
                      >
                        {{ methodOption.label }}
                      </option>
                    </select>
                  </div>

                  <div class="wizard-field">
                    <label class="wizard-label">Value</label>
                    <input
                      v-model="filterRule.value"
                      :type="getConditionInputType(filterRule.property)"
                      class="wizard-input"
                      :placeholder="getConditionPlaceholder(filterRule.property)"
                    />
                  </div>
                </div>

                <div class="wizard-condition-list">
                  <div
                    v-for="(condition, conditionIndex) in filterRule.conditions"
                    :key="`filter-condition-${index}-${conditionIndex}`"
                    class="wizard-condition-row"
                  >
                    <select
                      v-model="condition.combinator"
                      class="wizard-combinator-select"
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>

                    <select
                      v-model="condition.property"
                      class="wizard-select"
                      @change="normalizeConditionMethod(condition)"
                    >
                      <option value="" disabled>Property</option>
                      <option
                        v-for="propertyOption in PROPERTY_OPTIONS"
                        :key="`filter-condition-property-${index}-${conditionIndex}-${propertyOption.value}`"
                        :value="propertyOption.value"
                      >
                        {{ propertyOption.label }}
                      </option>
                    </select>

                    <select
                      v-model="condition.method"
                      class="wizard-select"
                    >
                      <option value="" disabled>Method</option>
                      <option
                        v-for="methodOption in getMethodOptions(condition.property)"
                        :key="`filter-condition-method-${index}-${conditionIndex}-${methodOption.value}`"
                        :value="methodOption.value"
                      >
                        {{ methodOption.label }}
                      </option>
                    </select>

                    <input
                      v-model="condition.value"
                      :type="getConditionInputType(condition.property)"
                      class="wizard-input"
                      :placeholder="getConditionPlaceholder(condition.property)"
                    />

                    <button
                      type="button"
                      class="wizard-icon-button"
                      @click="removeFilterCondition(index, conditionIndex)"
                    >
                      <X class="wizard-icon" />
                    </button>
                  </div>

                  <button
                    type="button"
                    class="wizard-add-link"
                    @click="addFilterCondition(index)"
                  >
                    <Plus class="wizard-link-icon" />
                    Add condition
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="wizard-add-card"
                @click="addFilterRule"
              >
                <Plus class="wizard-link-icon" />
                Add filter
              </button>
            </div>
          </section>

          <section v-else-if="currentStep.id === 'custom-rules'" class="wizard-step">
            <h1 class="wizard-title">Custom Rules</h1>
            <p class="wizard-subtitle">Example: IF amount is over 50, set category to splurge.</p>

            <div class="wizard-stack">
              <div
                v-for="(categorizeRule, index) in draft.categorizeRules"
                :key="`categorize-rule-${index}`"
                class="wizard-card"
              >
                <div class="wizard-card-head">
                  <span class="wizard-card-label">Rule {{ index + 1 }}</span>
                  <button
                    type="button"
                    class="wizard-icon-button"
                    @click="removeCategorizeRule(index)"
                  >
                    <X class="wizard-icon" />
                  </button>
                </div>

                <div class="wizard-rule-block-label">IF</div>
                <div class="wizard-grid">
                  <div class="wizard-field">
                    <label class="wizard-label">Property</label>
                    <select
                      v-model="categorizeRule.property"
                      class="wizard-select"
                      @change="normalizeRuleMethod(categorizeRule)"
                    >
                      <option value="" disabled>Select property</option>
                      <option
                        v-for="propertyOption in PROPERTY_OPTIONS"
                        :key="`categorize-property-${index}-${propertyOption.value}`"
                        :value="propertyOption.value"
                      >
                        {{ propertyOption.label }}
                      </option>
                    </select>
                  </div>

                  <div class="wizard-field">
                    <label class="wizard-label">Method</label>
                    <select
                      v-model="categorizeRule.method"
                      class="wizard-select"
                    >
                      <option value="" disabled>Select method</option>
                      <option
                        v-for="methodOption in getMethodOptions(categorizeRule.property)"
                        :key="`categorize-method-${index}-${methodOption.value}`"
                        :value="methodOption.value"
                      >
                        {{ methodOption.label }}
                      </option>
                    </select>
                  </div>

                  <div class="wizard-field">
                    <label class="wizard-label">Value</label>
                    <input
                      v-model="categorizeRule.value"
                      :type="getConditionInputType(categorizeRule.property)"
                      class="wizard-input"
                      :placeholder="getConditionPlaceholder(categorizeRule.property)"
                    />
                  </div>
                </div>

                <div class="wizard-condition-list">
                  <div
                    v-for="(condition, conditionIndex) in categorizeRule.conditions"
                    :key="`categorize-condition-${index}-${conditionIndex}`"
                    class="wizard-condition-row"
                  >
                    <select
                      v-model="condition.combinator"
                      class="wizard-combinator-select"
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>

                    <select
                      v-model="condition.property"
                      class="wizard-select"
                      @change="normalizeConditionMethod(condition)"
                    >
                      <option value="" disabled>Property</option>
                      <option
                        v-for="propertyOption in PROPERTY_OPTIONS"
                        :key="`categorize-condition-property-${index}-${conditionIndex}-${propertyOption.value}`"
                        :value="propertyOption.value"
                      >
                        {{ propertyOption.label }}
                      </option>
                    </select>

                    <select
                      v-model="condition.method"
                      class="wizard-select"
                    >
                      <option value="" disabled>Method</option>
                      <option
                        v-for="methodOption in getMethodOptions(condition.property)"
                        :key="`categorize-condition-method-${index}-${conditionIndex}-${methodOption.value}`"
                        :value="methodOption.value"
                      >
                        {{ methodOption.label }}
                      </option>
                    </select>

                    <input
                      v-model="condition.value"
                      :type="getConditionInputType(condition.property)"
                      class="wizard-input"
                      :placeholder="getConditionPlaceholder(condition.property)"
                    />

                    <button
                      type="button"
                      class="wizard-icon-button"
                      @click="removeCategorizeCondition(index, conditionIndex)"
                    >
                      <X class="wizard-icon" />
                    </button>
                  </div>

                  <button
                    type="button"
                    class="wizard-add-link"
                    @click="addCategorizeCondition(index)"
                  >
                    <Plus class="wizard-link-icon" />
                    Add condition
                  </button>
                </div>

                <div class="wizard-rule-block-label">THEN SET</div>
                <div class="wizard-field">
                  <label class="wizard-label">Category</label>
                  <input
                    v-model="categorizeRule.category"
                    type="text"
                    class="wizard-input"
                    placeholder="to value..."
                  />
                </div>
              </div>

              <button
                type="button"
                class="wizard-add-card"
                @click="addCategorizeRule"
              >
                <Plus class="wizard-link-icon" />
                Add rule
              </button>
            </div>
          </section>

          <section v-else-if="currentStep.id === 'organize'" class="wizard-step">
            <h1 class="wizard-title">Organize</h1>
            <p class="wizard-subtitle">How to sort and group?</p>

            <div class="wizard-stack">
              <div class="wizard-field">
                <label class="wizard-label">Sort By</label>
                <select v-model="draft.organize.sortKey" class="wizard-select">
                  <option
                    v-for="sortKeyOption in SORT_KEY_OPTIONS"
                    :key="`wizard-sort-key-${sortKeyOption.value}`"
                    :value="sortKeyOption.value"
                  >
                    {{ sortKeyOption.label }}
                  </option>
                </select>
              </div>

              <div class="wizard-field">
                <label class="wizard-label">Direction</label>
                <select v-model="draft.organize.sortDirection" class="wizard-select">
                  <option
                    v-for="sortDirectionOption in getSortDirectionOptions(draft.organize.sortKey)"
                    :key="`wizard-sort-direction-${sortDirectionOption.value}`"
                    :value="sortDirectionOption.value"
                  >
                    {{ sortDirectionOption.label }}
                  </option>
                </select>
              </div>

              <div class="wizard-field">
                <label class="wizard-label">Group By</label>
                <select v-model="draft.organize.groupBy" class="wizard-select">
                  <option
                    v-for="groupByOption in GROUP_BY_OPTIONS"
                    :key="`wizard-group-by-${groupByOption.value}`"
                    :value="groupByOption.value"
                  >
                    {{ groupByOption.label }}
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section v-else class="wizard-step">
            <h1 class="wizard-title">Review</h1>
            <p class="wizard-subtitle">Ready to save?</p>

            <div class="wizard-review">
              <div class="wizard-review-block">
                <div class="wizard-review-label">Name</div>
                <div class="wizard-review-value">{{ payloadPreview.tabName || 'Untitled tab' }}</div>
              </div>

              <div class="wizard-review-block">
                <div class="wizard-review-label">Filters</div>
                <div class="wizard-review-value">
                  <template v-if="payloadPreview.filters.length">
                    <div
                      v-for="(filterRule, index) in payloadPreview.filters"
                      :key="`review-filter-${index}`"
                    >
                      {{ formatFilterRuleReview(filterRule, index) }}
                    </div>
                  </template>
                  <template v-else>
                    No filters
                  </template>
                </div>
              </div>

              <div class="wizard-review-block">
                <div class="wizard-review-label">Auto-Rules</div>
                <div class="wizard-review-value">
                  <template v-if="payloadPreview.categorizeRules.length">
                    <div
                      v-for="(categorizeRule, index) in payloadPreview.categorizeRules"
                      :key="`review-categorize-${index}`"
                    >
                      {{ formatCategorizeRuleReview(categorizeRule, index) }}
                    </div>
                  </template>
                  <template v-else>
                    No auto-rules
                  </template>
                </div>
              </div>

              <div class="wizard-review-block">
                <div class="wizard-review-label">Organize</div>
                <div class="wizard-review-value">
                  {{ formatOrganizeReview(payloadPreview.organize) }}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="wizard-footer">
          <div class="wizard-progress-track">
            <div class="wizard-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="wizard-footer-meta">
            <button type="button" class="wizard-footer-link" @click="handleCancel">Cancel</button>
            <span class="wizard-step-counter">STEP {{ currentStepNumber }} OF {{ totalSteps }}</span>
          </div>

          <div class="wizard-footer-actions">
            <button
              v-if="showBackButton"
              type="button"
              class="wizard-secondary-button"
              :disabled="isSaving"
              @click="goBack"
            >
              Back
            </button>

            <button
              v-if="showSkipButton"
              type="button"
              class="wizard-primary-button wizard-skip-button"
              :disabled="isSaving"
              @click="skipStep"
            >
              Skip
            </button>

            <button
              type="button"
              class="wizard-primary-button"
              :disabled="!canContinue || isSaving"
              @click="handleContinue"
            >
              {{ continueButtonLabel }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import BaseModal from '@/shared/components/BaseModal.vue';

const STEP_DEFINITIONS = Object.freeze([
  { id: 'name', skippable: false },
  { id: 'filters', skippable: true },
  { id: 'custom-rules', skippable: true },
  { id: 'organize', skippable: true },
  { id: 'review', skippable: false }
]);
const DEFAULT_ORGANIZE_SETTINGS = Object.freeze({
  sortKey: 'date',
  sortDirection: 'desc',
  groupBy: 'none'
});
const DISCARD_CHANGES_MESSAGE = 'Discard your tab setup changes?';

const PROPERTY_OPTIONS = Object.freeze([
  { value: 'amount', label: 'Amount' },
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' }
]);

const METHOD_OPTIONS = Object.freeze({
  numeric: Object.freeze([
    { value: '>', label: 'is over' },
    { value: '>=', label: 'is at least' },
    { value: '<', label: 'is under' },
    { value: '<=', label: 'is at most' }
  ]),
  common: Object.freeze([
    { value: '=', label: 'equals' },
    { value: 'is not', label: 'is not' }
  ]),
  text: Object.freeze([
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'includes', label: 'includes' },
    { value: 'excludes', label: 'excludes' }
  ]),
  dateCondition: Object.freeze([
    { value: '=', label: 'is equal to' },
    { value: 'is before', label: 'is before' },
    { value: 'is after', label: 'is after' }
  ])
});

const SORT_KEY_OPTIONS = Object.freeze([
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' }
]);

const GROUP_BY_OPTIONS = Object.freeze([
  { value: 'none', label: 'No grouping' },
  { value: 'category', label: 'Category' },
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
  { value: 'year_month', label: 'Year + Month' },
  { value: 'day', label: 'Day' },
  { value: 'date', label: 'Date' },
  { value: 'weekday', label: 'Weekday' }
]);

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  isSaving: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save']);

const currentStepIndex = ref(0);
const totalSteps = STEP_DEFINITIONS.length;

const draft = reactive({
  tabName: '',
  filters: [createEmptyFilterRule()],
  categorizeRules: [createEmptyCategorizeRule()],
  organize: {
    sortKey: DEFAULT_ORGANIZE_SETTINGS.sortKey,
    sortDirection: DEFAULT_ORGANIZE_SETTINGS.sortDirection,
    groupBy: DEFAULT_ORGANIZE_SETTINGS.groupBy
  }
});

const currentStep = computed(() => STEP_DEFINITIONS[currentStepIndex.value]);
const currentStepNumber = computed(() => currentStepIndex.value + 1);
const progressPercent = computed(() => ((currentStepIndex.value + 1) / totalSteps) * 100);
const isReviewStep = computed(() => currentStep.value.id === 'review');
const showBackButton = computed(() => currentStepIndex.value > 0);
const showSkipButton = computed(() => currentStep.value.skippable);
const continueButtonLabel = computed(() => {
  if (isReviewStep.value) {
    return props.isSaving ? 'Saving...' : 'Save View';
  }

  return 'Continue';
});

const canContinue = computed(() => {
  if (currentStep.value.id === 'name') {
    return Boolean(String(draft.tabName || '').trim());
  }

  return true;
});

const payloadPreview = computed(() => buildPayload());
const hasUnsavedChanges = computed(() => {
  if (String(draft.tabName || '').trim()) {
    return true;
  }

  const hasChangedOrganizeValues = String(draft.organize.sortKey || DEFAULT_ORGANIZE_SETTINGS.sortKey) !== DEFAULT_ORGANIZE_SETTINGS.sortKey
    || String(draft.organize.sortDirection || DEFAULT_ORGANIZE_SETTINGS.sortDirection) !== DEFAULT_ORGANIZE_SETTINGS.sortDirection
    || String(draft.organize.groupBy || DEFAULT_ORGANIZE_SETTINGS.groupBy) !== DEFAULT_ORGANIZE_SETTINGS.groupBy;
  if (hasChangedOrganizeValues) {
    return true;
  }

  const hasChangedFilterRows = draft.filters.length > 1
    || draft.filters.some(hasFilterRuleDraftValues);
  if (hasChangedFilterRows) {
    return true;
  }

  return draft.categorizeRules.length > 1
    || draft.categorizeRules.some(hasCategorizeRuleDraftValues);
});

function createEmptyCondition() {
  return {
    combinator: 'and',
    property: '',
    method: '',
    value: ''
  };
}

function createEmptyFilterRule() {
  return {
    joinOperator: 'and',
    property: '',
    method: '',
    value: '',
    conditions: []
  };
}

function createEmptyCategorizeRule() {
  return {
    property: '',
    method: '',
    value: '',
    category: '',
    conditions: []
  };
}

function hasFilterRuleDraftValues(filterRule) {
  if (!filterRule) {
    return false;
  }

  return Boolean(
    String(filterRule.property || '').trim()
      || String(filterRule.method || '').trim()
      || String(filterRule.value || '').trim()
      || (Array.isArray(filterRule.conditions) && filterRule.conditions.length > 0)
  );
}

function hasCategorizeRuleDraftValues(categorizeRule) {
  if (!categorizeRule) {
    return false;
  }

  return Boolean(
    String(categorizeRule.property || '').trim()
      || String(categorizeRule.method || '').trim()
      || String(categorizeRule.value || '').trim()
      || String(categorizeRule.category || '').trim()
      || (Array.isArray(categorizeRule.conditions) && categorizeRule.conditions.length > 0)
  );
}

function isNumericProperty(property) {
  return property === 'amount';
}

function isDateProperty(property) {
  return property === 'date';
}

function isTextProperty(property) {
  return property === 'name' || property === 'category';
}

function normalizeConditionCombinator(combinator) {
  return String(combinator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

function normalizeSortPropertyName(rawSortPropertyName) {
  return String(rawSortPropertyName || '').trim().replace(/^-/, '');
}

function getSortDirectionOptions(sortPropertyName) {
  const normalizedSortPropertyName = normalizeSortPropertyName(sortPropertyName);

  if (normalizedSortPropertyName === 'date') {
    return [
      { value: 'desc', label: 'Newest to Oldest' },
      { value: 'asc', label: 'Oldest to Newest' }
    ];
  }

  if (normalizedSortPropertyName === 'amount') {
    return [
      { value: 'desc', label: 'High to Low' },
      { value: 'asc', label: 'Low to High' }
    ];
  }

  if (normalizedSortPropertyName === 'name' || normalizedSortPropertyName === 'category') {
    return [
      { value: 'asc', label: 'A to Z' },
      { value: 'desc', label: 'Z to A' }
    ];
  }

  return [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' }
  ];
}

function getSortDirectionLabel(sortPropertyName, sortDirection) {
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();
  const sortDirectionOption = getSortDirectionOptions(sortPropertyName)
    .find(option => option.value === normalizedSortDirection);

  return sortDirectionOption?.label || (normalizedSortDirection === 'asc' ? 'Ascending' : 'Descending');
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

function normalizeLegacyTextMethod(methodName) {
  if (methodName === 'contains') {
    return 'includes';
  }

  return methodName;
}

function normalizeMethod(property, methodName) {
  if (isDateProperty(property)) {
    return normalizeLegacyDateMethod(methodName);
  }

  if (isTextProperty(property)) {
    return normalizeLegacyTextMethod(methodName);
  }

  return methodName;
}

function getMethodOptions(property) {
  if (isDateProperty(property)) {
    return METHOD_OPTIONS.dateCondition;
  }

  const options = [];

  if (isNumericProperty(property)) {
    options.push(...METHOD_OPTIONS.numeric);
  }

  options.push(...METHOD_OPTIONS.common);

  if (isTextProperty(property)) {
    options.push(...METHOD_OPTIONS.text);
  }

  return options;
}

function isMethodAllowed(property, methodName) {
  return getMethodOptions(property)
    .some(methodOption => methodOption.value === methodName);
}

function getConditionInputType(property) {
  if (isDateProperty(property)) {
    return 'date';
  }

  if (isNumericProperty(property)) {
    return 'number';
  }

  return 'text';
}

function getConditionPlaceholder(property) {
  if (isDateProperty(property)) {
    return 'Select a date';
  }

  if (isNumericProperty(property)) {
    return '0.00';
  }

  return 'value...';
}

function normalizeRuleMethod(ruleItem) {
  if (!ruleItem) {
    return;
  }

  const normalizedMethod = normalizeMethod(ruleItem.property, ruleItem.method);
  if (!isMethodAllowed(ruleItem.property, normalizedMethod)) {
    ruleItem.method = '';
    return;
  }

  ruleItem.method = normalizedMethod;
}

function normalizeConditionMethod(condition) {
  if (!condition) {
    return;
  }

  const normalizedMethod = normalizeMethod(condition.property, condition.method);
  if (!isMethodAllowed(condition.property, normalizedMethod)) {
    condition.method = '';
    return;
  }

  condition.method = normalizedMethod;
}

function addFilterRule() {
  draft.filters.push(createEmptyFilterRule());
}

function removeFilterRule(index) {
  if (draft.filters.length <= 1) {
    draft.filters = [createEmptyFilterRule()];
    return;
  }

  draft.filters.splice(index, 1);
}

function addFilterCondition(ruleIndex) {
  const filterRule = draft.filters[ruleIndex];
  if (!filterRule) {
    return;
  }

  filterRule.conditions.push(createEmptyCondition());
}

function removeFilterCondition(ruleIndex, conditionIndex) {
  const filterRule = draft.filters[ruleIndex];
  if (!filterRule) {
    return;
  }

  filterRule.conditions.splice(conditionIndex, 1);
}

function addCategorizeRule() {
  draft.categorizeRules.push(createEmptyCategorizeRule());
}

function removeCategorizeRule(index) {
  if (draft.categorizeRules.length <= 1) {
    draft.categorizeRules = [createEmptyCategorizeRule()];
    return;
  }

  draft.categorizeRules.splice(index, 1);
}

function addCategorizeCondition(ruleIndex) {
  const categorizeRule = draft.categorizeRules[ruleIndex];
  if (!categorizeRule) {
    return;
  }

  categorizeRule.conditions.push(createEmptyCondition());
}

function removeCategorizeCondition(ruleIndex, conditionIndex) {
  const categorizeRule = draft.categorizeRules[ruleIndex];
  if (!categorizeRule) {
    return;
  }

  categorizeRule.conditions.splice(conditionIndex, 1);
}

function isConditionComplete(condition) {
  return Boolean(
    condition?.property
      && condition?.method
      && String(condition?.value || '').trim()
  );
}

function normalizeCondition(condition) {
  return {
    combinator: normalizeConditionCombinator(condition.combinator),
    property: String(condition.property || '').trim(),
    method: normalizeMethod(condition.property, String(condition.method || '').trim()),
    value: String(condition.value || '').trim()
  };
}

function serializeConditions(conditions) {
  return (Array.isArray(conditions) ? conditions : [])
    .filter(isConditionComplete)
    .map(normalizeCondition);
}

function serializeFilterRules() {
  return draft.filters
    .filter(isConditionComplete)
    .map((filterRule, index) => ({
      joinOperator: index === 0
        ? 'and'
        : normalizeConditionCombinator(filterRule.joinOperator),
      property: String(filterRule.property || '').trim(),
      method: normalizeMethod(filterRule.property, String(filterRule.method || '').trim()),
      value: String(filterRule.value || '').trim(),
      conditions: serializeConditions(filterRule.conditions)
    }));
}

function serializeCategorizeRules() {
  return draft.categorizeRules
    .filter(categorizeRule =>
      isConditionComplete(categorizeRule)
      && String(categorizeRule.category || '').trim()
    )
    .map(categorizeRule => ({
      property: String(categorizeRule.property || '').trim(),
      method: normalizeMethod(categorizeRule.property, String(categorizeRule.method || '').trim()),
      value: String(categorizeRule.value || '').trim(),
      category: String(categorizeRule.category || '').trim(),
      conditions: serializeConditions(categorizeRule.conditions)
    }));
}

function buildPayload() {
  return {
    tabName: String(draft.tabName || '').trim(),
    filters: serializeFilterRules(),
    categorizeRules: serializeCategorizeRules(),
    organize: {
      sortKey: String(draft.organize.sortKey || DEFAULT_ORGANIZE_SETTINGS.sortKey),
      sortDirection: String(draft.organize.sortDirection || DEFAULT_ORGANIZE_SETTINGS.sortDirection),
      groupBy: String(draft.organize.groupBy || DEFAULT_ORGANIZE_SETTINGS.groupBy)
    }
  };
}

function resetWizardState() {
  currentStepIndex.value = 0;
  draft.tabName = '';
  draft.filters = [createEmptyFilterRule()];
  draft.categorizeRules = [createEmptyCategorizeRule()];
  draft.organize.sortKey = DEFAULT_ORGANIZE_SETTINGS.sortKey;
  draft.organize.sortDirection = DEFAULT_ORGANIZE_SETTINGS.sortDirection;
  draft.organize.groupBy = DEFAULT_ORGANIZE_SETTINGS.groupBy;
}

function formatConditionGroupForReview(conditions = []) {
  if (!conditions.length) {
    return '';
  }

  return conditions
    .map(condition =>
      `${String(condition.combinator || 'and').toUpperCase()} ${condition.property} ${condition.method} ${condition.value}`
    )
    .join(' ');
}

function formatFilterRuleReview(filterRule, index) {
  const joinPrefix = index > 0 ? `${String(filterRule.joinOperator || 'and').toUpperCase()} ` : '';
  const base = `${joinPrefix}${filterRule.property} ${filterRule.method} ${filterRule.value}`;
  const conditionSuffix = formatConditionGroupForReview(filterRule.conditions);
  return conditionSuffix ? `${base} ${conditionSuffix}` : base;
}

function formatCategorizeRuleReview(categorizeRule, index) {
  const base = `Rule ${index + 1}: if ${categorizeRule.property} ${categorizeRule.method} ${categorizeRule.value}`;
  const conditionSuffix = formatConditionGroupForReview(categorizeRule.conditions);
  const whenClause = conditionSuffix ? `${base} ${conditionSuffix}` : base;
  return `${whenClause}, then set category to ${categorizeRule.category}`;
}

function formatOrganizeReview(organize) {
  const sortKeyOption = SORT_KEY_OPTIONS.find(option => option.value === organize.sortKey);
  const groupByOption = GROUP_BY_OPTIONS.find(option => option.value === organize.groupBy);
  const sortDirectionLabel = getSortDirectionLabel(organize.sortKey, organize.sortDirection);

  return `Sorted by ${sortKeyOption?.label || 'Date'} (${sortDirectionLabel}), grouped by ${groupByOption?.label || 'No grouping'}`;
}

function handleCancel() {
  if (props.isSaving) {
    return;
  }

  if (hasUnsavedChanges.value && !window.confirm(DISCARD_CHANGES_MESSAGE)) {
    return;
  }

  emit('close');
}

function goBack() {
  if (currentStepIndex.value === 0 || props.isSaving) {
    return;
  }

  currentStepIndex.value -= 1;
}

function skipStep() {
  if (!showSkipButton.value || props.isSaving) {
    return;
  }

  if (currentStepIndex.value >= totalSteps - 1) {
    return;
  }

  currentStepIndex.value += 1;
}

function handleContinue() {
  if (!canContinue.value || props.isSaving) {
    return;
  }

  if (isReviewStep.value) {
    emit('save', buildPayload());
    return;
  }

  if (currentStepIndex.value < totalSteps - 1) {
    currentStepIndex.value += 1;
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      resetWizardState();
    }
  }
);
</script>

<style scoped>
.wizard-shell {
  --wizard-bg: var(--theme-browser-chrome);
  --wizard-text: var(--theme-text);
  --wizard-muted: var(--theme-text-soft);
  --wizard-border: var(--theme-border);
  --wizard-surface: var(--theme-browser-chrome);
  --wizard-surface-soft: var(--theme-bg-soft);
  --wizard-surface-subtle: var(--theme-bg-subtle);
  --wizard-button-primary-bg: var(--theme-text);
  --wizard-button-primary-text: var(--theme-browser-chrome);
  --wizard-progress-bg: var(--theme-overlay-20);
  --wizard-progress-fill: var(--theme-text);
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--wizard-bg);
  color: var(--wizard-text);
  display: flex;
  flex-direction: column;
}

.wizard-topbar {
  display: flex;
  justify-content: flex-end;
  padding: 0.7rem 1.25rem 0;
}

.wizard-topbar-cancel {
  border: 1px solid var(--wizard-border);
  background: transparent;
  color: var(--wizard-muted);
  padding: 0.5rem 0.9rem;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 0;
}

.wizard-topbar-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.6rem 1.25rem 1.5rem;
}

.wizard-step {
  max-width: 900px;
  margin: 0 auto;
}

.wizard-title {
  margin: 0;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.wizard-subtitle {
  margin-top: 0.75rem;
  font-size: 1rem;
  color: var(--wizard-muted);
}

.wizard-field-wrap {
  margin-top: 5rem;
}

.wizard-name-input {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--wizard-border);
  color: var(--wizard-text);
  font-size: 2rem;
  line-height: 1.3;
  padding: 0.65rem 0;
  outline: none;
  border-radius: 0;
}

.wizard-name-input::placeholder {
  color: var(--wizard-muted);
}

.wizard-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2.5rem;
}

.wizard-card {
  border: 1px solid var(--wizard-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.wizard-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wizard-card-label-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wizard-card-label {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: var(--wizard-muted);
  text-transform: uppercase;
}

.wizard-rule-block-label {
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  color: var(--wizard-muted);
  text-transform: uppercase;
}

.wizard-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.8rem;
}

.wizard-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wizard-label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--wizard-muted);
  text-transform: uppercase;
}

.wizard-select,
.wizard-input,
.wizard-inline-select,
.wizard-combinator-select {
  width: 100%;
  min-height: 2.8rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--wizard-border);
  background: var(--wizard-surface);
  color: var(--wizard-text);
  outline: none;
  border-radius: 0;
  font-size: 1rem;
  box-shadow: none;
}

.wizard-input::placeholder {
  color: var(--wizard-muted);
}

.wizard-inline-select,
.wizard-combinator-select {
  width: auto;
  min-width: 5.2rem;
  font-size: 0.86rem;
  padding: 0.45rem 0.55rem;
}

.wizard-condition-list {
  border-top: 1px dashed var(--wizard-border);
  padding-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.wizard-condition-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.55rem;
  align-items: center;
}

.wizard-add-link {
  border: 1px solid var(--wizard-border);
  background: var(--wizard-surface-soft);
  color: var(--wizard-text);
  padding: 0.65rem 0.85rem;
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  width: fit-content;
  border-radius: 0;
}

.wizard-add-card {
  width: 100%;
  border: 1px dashed var(--wizard-border);
  background: var(--wizard-surface-soft);
  color: var(--wizard-text);
  padding: 0.9rem 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0;
}

.wizard-icon-button {
  border: 1px solid transparent;
  background: transparent;
  color: var(--wizard-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  padding: 0;
}

.wizard-icon-button:hover {
  border-color: var(--wizard-border);
  color: var(--wizard-text);
}

.wizard-icon {
  width: 1rem;
  height: 1rem;
}

.wizard-link-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.wizard-review {
  margin-top: 2.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wizard-review-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.wizard-review-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  color: var(--wizard-muted);
  text-transform: uppercase;
}

.wizard-review-value {
  font-size: 1.65rem;
  line-height: 1.25;
  word-break: break-word;
}

.wizard-footer {
  border-top: 1px solid var(--wizard-border);
  background: var(--wizard-bg);
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.wizard-progress-track {
  width: 100%;
  height: 2px;
  background: var(--wizard-progress-bg);
}

.wizard-progress-fill {
  height: 100%;
  background: var(--wizard-progress-fill);
  transition: width 0.25s ease;
}

.wizard-footer-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.25rem 0.55rem;
}

.wizard-footer-link {
  border: 0;
  background: transparent;
  color: var(--wizard-muted);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.74rem;
  padding: 0;
}

.wizard-step-counter {
  color: var(--wizard-muted);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.74rem;
}

.wizard-footer-actions {
  padding: 0 1.25rem;
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.7rem;
}

.wizard-secondary-button,
.wizard-primary-button {
  border-radius: 0;
  min-height: 3.25rem;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
}

.wizard-secondary-button {
  border: 1px solid var(--wizard-border);
  background: transparent;
  color: var(--wizard-text);
}

.wizard-primary-button {
  border: 1px solid var(--wizard-border);
  background: var(--wizard-button-primary-bg);
  color: var(--wizard-button-primary-text);
}

.wizard-primary-button:disabled,
.wizard-secondary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-skip-button {
  background: transparent;
  color: var(--wizard-text);
}

@media (min-width: 720px) {
  .wizard-topbar {
    padding: 1rem 2rem 0;
  }

  .wizard-body {
    padding: 2.25rem 2rem 2rem;
  }

  .wizard-title {
    font-size: 4rem;
  }

  .wizard-subtitle {
    font-size: 1.3rem;
  }

  .wizard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .wizard-condition-row {
    grid-template-columns: auto 1fr 1fr 1fr auto;
  }

  .wizard-review-value {
    font-size: 2.1rem;
  }

  .wizard-footer-meta {
    padding: 0.95rem 2rem 0.7rem;
  }

  .wizard-footer-actions {
    padding: 0 2rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

<template>
  <div class="flex flex-col bg-white min-h-screen">
    <div class="max-w-3xl mx-auto w-full flex flex-col min-h-screen">
      <!-- Header Area -->
      <div class="px-6 py-0 border-b-2 border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 backdrop-blur-sm bg-white/90">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <div v-if="state.selected.tab && !isEditingTabName" class="relative">
              <button
                @click="toggleTabActionsMenu"
                class="p-2 text-black hover:text-black hover:bg-gray-100 rounded-full transition-all"
                title="Tab actions"
              >
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showTabActionsMenu"
                class="absolute left-0 mt-2 min-w-[180px] bg-white border-2 border-gray-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] p-1 z-30"
              >
                <button
                  @click="startTabNameEdit"
                  class="w-full text-left px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit class="w-4 h-4" />
                  Edit Name
                </button>
              </div>
            </div>

            <h1 class="text-3xl font-bold zfont-black text-gray-900 tracking-tight leading-tight">
              {{ state.selected.tab?.tabName || 'Current Tab' }}
            </h1>
          </div>
          <div
            v-if="state.selected.tab && isEditingTabName"
            class="mt-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 p-4"
          >
            <label class="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Tab Name</label>
            <div class="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                ref="tabNameInput"
                v-model="editedTabName"
                class="w-full px-3 py-2 text-sm font-black bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-0"
                @keyup.enter="saveTabName"
                @keyup.esc="cancelTabNameEdit"
              />
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="saveTabName"
                  :disabled="isSavingTabName || !canSaveTabName"
                  class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white border-black hover:bg-gray-800"
                >
                  <Check class="w-4 h-4" />
                  {{ isSavingTabName ? 'Saving...' : 'Save' }}
                </button>
                <button
                  @click="cancelTabNameEdit"
                  :disabled="isSavingTabName"
                  class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 border-gray-200 text-gray-500 hover:border-black hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 text-black hover:text-black hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="p-6 pb-32">
        <div class="space-y-12">
          <!-- Group By Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <Group class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Group By
              </h3>
              <span
                v-if="groupByRules.length > 0"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ groupByRules.length }}
              </span>
            </div>
            <div class="space-y-4 pt-2">
              <div class="rounded-2xl border-2 border-gray-100 bg-gray-50/40 p-4 space-y-4">
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="groupOption in GROUP_BY_PRIMARY_OPTIONS"
                    :key="`group-by-primary-${groupOption.value}`"
                    @click="selectGroupByOption(groupOption.value)"
                    :disabled="isSavingGroupBy"
                    class="px-3 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    :style="getGroupByButtonStyle(groupOption.value)"
                  >
                    {{ groupOption.label }}
                  </button>
                </div>

                <button
                  @click="showAdvancedGroupBy = !showAdvancedGroupBy"
                  class="w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black hover:border-black transition-colors"
                >
                  <span>Advanced</span>
                  <ChevronDown :class="['w-4 h-4 transition-transform', showAdvancedGroupBy ? 'rotate-180' : '']" />
                </button>

                <div v-if="showAdvancedGroupBy" class="flex flex-wrap gap-2">
                  <button
                    v-for="groupOption in GROUP_BY_ADVANCED_OPTIONS"
                    :key="`group-by-advanced-${groupOption.value}`"
                    @click="selectGroupByOption(groupOption.value)"
                    :disabled="isSavingGroupBy"
                    class="px-3 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    :style="getGroupByButtonStyle(groupOption.value)"
                  >
                    {{ groupOption.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sort Section -->
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <SortAsc class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Sort By
              </h3>
              <span
                v-if="sortRules.length > 0"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ sortRules.length }}
              </span>
            </div>
            <div class="space-y-4 pt-2">
              <div class="rounded-2xl border-2 border-gray-100 bg-gray-50/40 p-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Key</label>
                    <select
                      :value="selectedSortProperty"
                      @change="onSortPropertyChange($event.target.value)"
                      :disabled="isSavingSort"
                      class="w-full rounded-xl border-2 border-gray-100 bg-white text-sm py-2.5 px-3 focus:border-black focus:ring-0 font-black text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option
                        v-for="sortPropertyOption in SORT_PROPERTY_OPTIONS"
                        :key="`sort-property-${sortPropertyOption.value}`"
                        :value="sortPropertyOption.value"
                      >
                        {{ sortPropertyOption.label }}
                      </option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Direction</label>
                    <select
                      :value="selectedSortDirection"
                      @change="onSortDirectionChange($event.target.value)"
                      :disabled="isSavingSort"
                      class="w-full rounded-xl border-2 border-gray-100 bg-white text-sm py-2.5 px-3 focus:border-black focus:ring-0 font-black text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option
                        v-for="sortDirectionOption in getSortDirectionOptions(selectedSortProperty)"
                        :key="`sort-direction-${selectedSortProperty}-${sortDirectionOption.value}`"
                        :value="sortDirectionOption.value"
                      >
                        {{ sortDirectionOption.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Categorize + Filter Rule Sections -->
          <div v-for="ruleType in standardRuleTypes" :key="ruleType.id" class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <component :is="ruleType.icon" class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                {{ ruleType.name }}
              </h3>
              <span
                v-if="getRuleCountByType(ruleType.id, true) > 0"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ getRuleCountByType(ruleType.id, true) }}
              </span>
            </div>

            <div class="space-y-4 pt-2">
              <div class="flex items-center justify-between px-1">
                <button
                  @click="toggleReorderMode(ruleType.id)"
                  class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                  :class="reorderingSectionId === ruleType.id ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:text-black'"
                >
                  {{ reorderingSectionId === ruleType.id ? 'Done' : 'Rearrange' }}
                </button>

                <button
                  v-if="reorderingSectionId !== ruleType.id"
                  @click="createNewRuleWithType(ruleType.id)"
                  class="text-[10px] font-black uppercase tracking-widest text-black hover:opacity-70 flex items-center gap-1.5 transition-opacity"
                >
                  <Plus class="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>

              <div
                v-if="getEnabledRulesByType(ruleType.id).length === 0"
                class="py-12 px-6 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-3"
              >
                <p class="text-sm font-bold text-black">No active {{ ruleType.name.toLowerCase() }}</p>
              </div>

              <div v-else>
                <draggable
                  v-model="enabledRulesByTypeComputed[ruleType.id]"
                  item-key="_id"
                  class="space-y-3"
                  handle=".drag-handle"
                  @end="onDragEnd"
                  :disabled="reorderingSectionId !== ruleType.id"
                  :data-rule-type="ruleType.id"
                >
                  <template #item="{ element, index }">
                    <div class="space-y-3">
                      <div
                        v-if="ruleType.id === 'filter' && index > 0 && reorderingSectionId !== ruleType.id"
                        class="mx-auto w-fit rounded-full border-2 border-dashed border-gray-100 bg-gray-50/50 px-3 py-1 flex items-center gap-2"
                      >
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">Combine with</span>
                        <select
                          :value="getFilterJoinOperator(element)"
                          @change="updateFilterJoinOperator(element, $event.target.value)"
                          class="appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest text-black hover:text-gray-500 cursor-pointer focus:outline-none"
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      </div>

                      <RuleCard
                        :rule="element"
                        :rule-type="ruleType"
                        :is-reordering="reorderingSectionId === ruleType.id"
                        @edit="editRule"
                        @toggle="toggleRuleContextStatus"
                        @delete="confirmDeleteRule"
                      />
                    </div>
                  </template>
                </draggable>
              </div>

              <div v-if="ruleType.id === 'categorize' && getDisabledRulesByType('categorize').length > 0" class="mt-8">
                <button
                  @click="toggleDisabledSection"
                  class="w-full flex items-center gap-4 group py-4"
                >
                  <div class="h-[2px] flex-1 bg-gray-50"></div>
                  <div class="text-[10px] font-black text-black group-hover:text-black transition-colors uppercase tracking-[0.3em] flex items-center gap-2">
                    Disabled ({{ getDisabledRulesByType('categorize').length }})
                    <ChevronDown :class="['w-3 h-3 transition-transform', disabledSectionCollapsed ? '' : 'rotate-180']" />
                  </div>
                  <div class="h-[2px] flex-1 bg-gray-50"></div>
                </button>

                <div v-if="!disabledSectionCollapsed" class="space-y-3 mt-4">
                  <RuleCard
                    v-for="rule in getDisabledRulesByType('categorize')"
                    :key="rule._id"
                    :rule="rule"
                    :rule-type="ruleType"
                    @edit="editRule"
                    @toggle="toggleRuleContextStatus"
                    @delete="confirmDeleteRule"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="state.selected.tab"
            class="pt-8 mt-4 border-t border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p class="text-xs font-black uppercase tracking-[0.2em] text-red-500">Danger Zone</p>
              <p class="text-xs text-gray-500 mt-1">Delete this tab and remove its tab-specific rule assignments.</p>
            </div>
            <button
              @click="deleteCurrentTab"
              :disabled="isDeletingTab"
              class="px-4 py-2 rounded-xl border-2 border-red-200 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 class="w-4 h-4" />
              {{ isDeletingTab ? 'Deleting...' : 'Delete Tab' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div
        v-if="!reorderingSectionId"
        class="mt-auto px-6 py-8 bg-white/80 backdrop-blur-sm border-t-2 border-gray-50 sticky bottom-0 flex justify-center z-20"
      >
        <button
          @click="createNewRule"
          class="w-full max-w-sm px-8 py-5 bg-black border-2 border-black rounded-2xl text-base font-black text-white hover:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex justify-center items-center gap-3"
        >
          <Plus class="w-6 h-6" />
          Create New Rule
        </button>
      </div>
    </div>

    <!-- Modals -->
    <RuleEditModal
      v-if="showRuleEditModal"
      :rule="currentRule"
      :is-new="isNewRule"
      @close="closeRuleEditModal"
      @save="saveRule"
    />

    <DeleteConfirmModal
      v-if="showDeleteModal"
      :rule="ruleToDelete"
      @cancel="showDeleteModal = false"
      @confirm="deleteRule"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import {
  Plus, ChevronDown, SortAsc, FolderCheck, Group, Filter, Edit, X, Check, Trash2, MoreVertical
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRuleManager } from '../composables/useRuleManager';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI';
import { useRulesAPI } from '../composables/useRulesAPI';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing';
import draggable from 'vuedraggable';

import RuleCard from '../components/RuleCard.vue';
import RuleEditModal from '../components/RuleEditModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';

const { state } = useDashboardState();
const { updateTabName, deleteTab: deleteTabById } = useTabsAPI();
const rulesAPI = useRulesAPI();
const { processAllTabsForSelectedGroup } = useTabProcessing();
const {
  createRule,
  updateRule,
  deleteRuleById,
  toggleRuleContext,
  updateRuleOrder
} = useRuleManager();

const emit = defineEmits(['close']);

const GROUP_BY_PRIMARY_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'category', label: 'Category' },
  { value: 'date', label: 'Date' }
];

const GROUP_BY_ADVANCED_OPTIONS = [
  { value: 'year_month', label: 'Month' },
  { value: 'weekday', label: 'Weekday' }
];

const SORT_PROPERTY_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'category', label: 'Category' },
  { value: 'amount', label: 'Amount' }
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'asc' },
  { value: 'desc' }
];

const standardRuleTypes = [
  { id: 'categorize', name: 'Categorize Rules', icon: FolderCheck },
  { id: 'filter', name: 'Filter Rules', icon: Filter }
];

// UI State
const showRuleEditModal = ref(false);
const showDeleteModal = ref(false);
const currentRule = ref(null);
const isNewRule = ref(false);
const ruleToDelete = ref(null);
const disabledSectionCollapsed = ref(true);
const showAdvancedGroupBy = ref(false);
const isSavingGroupBy = ref(false);
const isSavingSort = ref(false);

// Tab name editing state
const isEditingTabName = ref(false);
const editedTabName = ref('');
const tabNameInput = ref(null);
const isSavingTabName = ref(false);
const isDeletingTab = ref(false);
const showTabActionsMenu = ref(false);
const reorderingSectionId = ref(null);

const canSaveTabName = computed(() => {
  if (!state.selected.tab) return false;

  const nextTabName = editedTabName.value.trim();
  const currentTabName = (state.selected.tab.tabName || '').trim();
  if (!nextTabName) return false;

  return nextTabName !== currentTabName;
});

const enabledRules = computed(() => {
  const tabId = state.selected.tab?._id;
  if (!tabId) return [];

  return state.allUserRules.filter(rule =>
    rule.applyForTabs.includes('_GLOBAL') || rule.applyForTabs.includes(tabId)
  );
});

const disabledRules = computed(() => {
  const tabId = state.selected.tab?._id;
  if (!tabId) return [];

  return state.allUserRules.filter(rule =>
    !rule.applyForTabs.includes('_GLOBAL') && !rule.applyForTabs.includes(tabId)
  );
});

const groupByRules = computed(() => getEnabledRulesByType('groupBy'));
const sortRules = computed(() => getEnabledRulesByType('sort'));

const selectedGroupByOption = computed(() => {
  const primaryGroupByRule = getPrimaryRuleForCurrentTab(groupByRules.value);
  if (!primaryGroupByRule) {
    return 'category';
  }

  return normalizeGroupByOptionForUi(primaryGroupByRule.rule?.[1]);
});

const selectedSortProperty = computed(() => {
  const primarySortRule = getPrimaryRuleForCurrentTab(sortRules.value);
  const normalizedSortPropertyName = normalizeSortPropertyName(primarySortRule?.rule?.[1]);

  return isSortPropertyAllowed(normalizedSortPropertyName)
    ? normalizedSortPropertyName
    : 'date';
});

const selectedSortDirection = computed(() => {
  const primarySortRule = getPrimaryRuleForCurrentTab(sortRules.value);
  const normalizedSortDirection = normalizeSortDirection(
    primarySortRule?.rule?.[2],
    primarySortRule?.rule?.[1]
  );
  const sortDirectionOptions = getSortDirectionOptions(selectedSortProperty.value);

  return sortDirectionOptions.some(option => option.value === normalizedSortDirection)
    ? normalizedSortDirection
    : sortDirectionOptions[0]?.value || 'desc';
});

const enabledRulesByTypeComputed = computed({
  get: () => {
    const result = {};
    standardRuleTypes.forEach(type => {
      result[type.id] = getEnabledRulesByType(type.id);
    });
    return result;
  },
  set: () => {
    // This setter is needed for draggable but reordering is handled in onDragEnd
  }
});

function toggleReorderMode(sectionId) {
  if (reorderingSectionId.value === sectionId) {
    reorderingSectionId.value = null;
  } else {
    reorderingSectionId.value = sectionId;
  }
}

function toggleDisabledSection() {
  disabledSectionCollapsed.value = !disabledSectionCollapsed.value;
}

function startTabNameEdit() {
  if (state.selected.tab) {
    showTabActionsMenu.value = false;
    editedTabName.value = state.selected.tab.tabName || '';
    isEditingTabName.value = true;
    nextTick(() => {
      tabNameInput.value?.focus();
      tabNameInput.value?.select?.();
    });
  }
}

async function saveTabName() {
  if (!state.selected.tab || isSavingTabName.value) return;

  const nextTabName = editedTabName.value.trim();
  const previousTabName = state.selected.tab.tabName || '';

  if (!nextTabName) {
    editedTabName.value = previousTabName;
    isEditingTabName.value = false;
    return;
  }

  if (!canSaveTabName.value) {
    isEditingTabName.value = false;
    return;
  }

  isSavingTabName.value = true;
  state.selected.tab.tabName = nextTabName;

  try {
    await updateTabName(state.selected.tab._id, nextTabName);
    editedTabName.value = nextTabName;
    isEditingTabName.value = false;
  } catch (error) {
    state.selected.tab.tabName = previousTabName;
    editedTabName.value = previousTabName;
    console.error('Error updating tab name:', error);
  } finally {
    isSavingTabName.value = false;
  }
}

function cancelTabNameEdit() {
  editedTabName.value = state.selected.tab?.tabName || '';
  isEditingTabName.value = false;
}

function toggleTabActionsMenu() {
  showTabActionsMenu.value = !showTabActionsMenu.value;
}

async function cleanupRulesAfterTabDelete(tabId) {
  const rulesToUpdate = state.allUserRules.filter(rule =>
    Array.isArray(rule.applyForTabs) && rule.applyForTabs.includes(tabId)
  );

  for (const rule of rulesToUpdate) {
    const applyForTabs = rule.applyForTabs.filter(id => id !== tabId);

    if (!applyForTabs.length) {
      await rulesAPI.deleteRule(rule._id);
      state.allUserRules = state.allUserRules.filter(existingRule => existingRule._id !== rule._id);
      continue;
    }

    const updatedRule = await rulesAPI.updateRule(rule._id, { applyForTabs });
    const updatedRuleIndex = state.allUserRules.findIndex(existingRule => existingRule._id === rule._id);

    if (updatedRuleIndex !== -1) {
      state.allUserRules[updatedRuleIndex] = updatedRule || {
        ...state.allUserRules[updatedRuleIndex],
        applyForTabs
      };
    }
  }
}

async function deleteCurrentTab() {
  if (!state.selected.tab || isDeletingTab.value) return;

  const tabToDelete = state.selected.tab;
  const tabName = tabToDelete.tabName || 'this tab';
  const shouldDelete = confirm(`Delete "${tabName}"? This cannot be undone.`);
  if (!shouldDelete) return;

  isDeletingTab.value = true;
  state.blueBar.message = `Deleting "${tabName}"...`;
  state.blueBar.loading = true;

  try {
    await deleteTabById(tabToDelete._id);
    state.allUserTabs = state.allUserTabs.filter(tab => tab._id !== tabToDelete._id);

    await cleanupRulesAfterTabDelete(tabToDelete._id);

    if (state.selected.tabsForGroup.length > 0) {
      await processAllTabsForSelectedGroup();
    } else {
      state.isLoading = false;
    }

    emit('close');
  } catch (error) {
    console.error('Error deleting tab:', error);
  } finally {
    state.blueBar.loading = false;
    state.blueBar.message = '';
    isDeletingTab.value = false;
  }
}

function getEnabledRulesByType(typeId) {
  return enabledRules.value
    .filter(rule => rule.rule[0] === typeId)
    .sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0));
}

function getDisabledRulesByType(typeId) {
  return disabledRules.value.filter(rule => rule.rule[0] === typeId);
}

function getRuleCountByType(typeId, enabledOnly = false) {
  if (enabledOnly) {
    return getEnabledRulesByType(typeId).length;
  }

  return state.allUserRules.filter(rule => rule.rule[0] === typeId).length;
}

function getPrimaryRuleForCurrentTab(rules = []) {
  const tabId = state.selected.tab?._id;
  if (!tabId || !rules.length) {
    return rules[0] || null;
  }

  return rules.find(rule => Array.isArray(rule.applyForTabs) && rule.applyForTabs.includes(tabId))
    || rules[0]
    || null;
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

function normalizeGroupByOptionForUi(rawGroupByOption) {
  const normalizedGroupByOption = String(rawGroupByOption || '').trim();

  if (normalizedGroupByOption === 'day') {
    return 'date';
  }

  if (normalizedGroupByOption === 'month') {
    return 'year_month';
  }

  const allowedGroupByOptions = new Set([
    'none',
    'category',
    'date',
    'year_month',
    'weekday'
  ]);

  if (!allowedGroupByOptions.has(normalizedGroupByOption)) {
    return 'category';
  }

  return normalizedGroupByOption;
}

function getGroupByButtonStyle(groupByOption) {
  const isSelected = selectedGroupByOption.value === groupByOption;

  if (isSelected) {
    return {
      backgroundColor: 'var(--theme-text)',
      color: 'var(--theme-browser-chrome)',
      borderColor: 'var(--theme-text)'
    };
  }

  return {
    backgroundColor: 'var(--theme-browser-chrome)',
    color: 'var(--theme-text-soft)',
    borderColor: 'var(--theme-border)'
  };
}

function isRuleExclusiveToCurrentTab(rule, tabId) {
  const applyForTabs = Array.isArray(rule?.applyForTabs) ? rule.applyForTabs : [];
  if (applyForTabs.includes('_GLOBAL')) {
    return false;
  }

  return applyForTabs.length === 1 && applyForTabs[0] === tabId;
}

async function removeRuleFromCurrentTab(rule) {
  const tabId = state.selected.tab?._id;
  if (!tabId || !rule?._id) return;

  const applyForTabs = Array.isArray(rule.applyForTabs)
    ? [...new Set(rule.applyForTabs)]
    : [];

  if (applyForTabs.includes('_GLOBAL')) {
    const otherTabIds = state.allUserTabs
      .map(tab => tab?._id)
      .filter(tabRuleId => tabRuleId && tabRuleId !== tabId);

    const nextApplyForTabs = [...new Set([
      ...applyForTabs.filter(tabRuleId => tabRuleId !== '_GLOBAL' && tabRuleId !== tabId),
      ...otherTabIds
    ])];

    if (!nextApplyForTabs.length) {
      await deleteRuleById(rule._id);
      return;
    }

    await updateRule({
      ...rule,
      applyForTabs: nextApplyForTabs
    });
    return;
  }

  const nextApplyForTabs = applyForTabs.filter(tabRuleId => tabRuleId !== tabId);

  if (!nextApplyForTabs.length) {
    await deleteRuleById(rule._id);
    return;
  }

  await updateRule({
    ...rule,
    applyForTabs: nextApplyForTabs
  });
}

async function clearRulesForCurrentTabByType(typeId) {
  const rulesToClear = getEnabledRulesByType(typeId);

  for (const rule of rulesToClear) {
    await removeRuleFromCurrentTab(rule);
  }
}

function buildTabScopedRulePayload(ruleArray, orderOfExecution = 0) {
  const tabId = state.selected.tab?._id;

  return {
    applyForTabs: tabId ? [tabId] : [],
    rule: ruleArray,
    filterJoinOperator: 'and',
    _isImportant: false,
    orderOfExecution
  };
}

async function upsertSingleTabScopedRule(typeId, ruleArray, orderOfExecution = 0) {
  const tabId = state.selected.tab?._id;
  if (!tabId) return;

  const rulesByType = getEnabledRulesByType(typeId);
  const tabExclusiveRule = rulesByType.find(rule => isRuleExclusiveToCurrentTab(rule, tabId));

  if (tabExclusiveRule) {
    await updateRule({
      ...tabExclusiveRule,
      ...buildTabScopedRulePayload(ruleArray, orderOfExecution)
    });

    for (const rule of rulesByType) {
      if (rule._id !== tabExclusiveRule._id) {
        await removeRuleFromCurrentTab(rule);
      }
    }

    return;
  }

  for (const rule of rulesByType) {
    await removeRuleFromCurrentTab(rule);
  }

  await createRule(buildTabScopedRulePayload(ruleArray, orderOfExecution));
}

async function selectGroupByOption(groupByOption) {
  const normalizedGroupByOption = normalizeGroupByOptionForUi(groupByOption);

  if (isSavingGroupBy.value) {
    return;
  }

  isSavingGroupBy.value = true;

  try {
    if (normalizedGroupByOption === 'category') {
      await clearRulesForCurrentTabByType('groupBy');
      return;
    }

    await upsertSingleTabScopedRule('groupBy', ['groupBy', normalizedGroupByOption, '', '', '']);
  } catch (error) {
    console.error('Error updating group-by rule:', error);
  } finally {
    isSavingGroupBy.value = false;
  }
}

async function onSortPropertyChange(sortPropertyName) {
  const normalizedSortPropertyName = normalizeSortPropertyName(sortPropertyName);
  if (!isSortPropertyAllowed(normalizedSortPropertyName) || isSavingSort.value) {
    return;
  }

  const sortDirectionOptions = getSortDirectionOptions(normalizedSortPropertyName);
  const resolvedSortDirection = sortDirectionOptions.some(option => option.value === selectedSortDirection.value)
    ? selectedSortDirection.value
    : sortDirectionOptions[0]?.value || 'desc';

  isSavingSort.value = true;

  try {
    await upsertSingleTabScopedRule('sort', [
      'sort',
      normalizedSortPropertyName,
      resolvedSortDirection,
      '',
      ''
    ]);
  } catch (error) {
    console.error('Error updating sort property:', error);
  } finally {
    isSavingSort.value = false;
  }
}

async function onSortDirectionChange(sortDirection) {
  const normalizedSortDirection = normalizeSortDirection(sortDirection, selectedSortProperty.value);
  if (!isSortDirectionAllowed(normalizedSortDirection) || isSavingSort.value) {
    return;
  }

  isSavingSort.value = true;

  try {
    await upsertSingleTabScopedRule('sort', [
      'sort',
      selectedSortProperty.value,
      normalizedSortDirection,
      '',
      ''
    ]);
  } catch (error) {
    console.error('Error updating sort direction:', error);
  } finally {
    isSavingSort.value = false;
  }
}

function getFilterJoinOperator(rule) {
  return String(rule?.filterJoinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

async function updateFilterJoinOperator(rule, joinOperator) {
  if (!rule?._id) return;

  const normalizedJoinOperator = joinOperator === 'or' ? 'or' : 'and';
  const currentJoinOperator = getFilterJoinOperator(rule);

  if (normalizedJoinOperator === currentJoinOperator) {
    return;
  }

  try {
    await updateRule({
      ...rule,
      filterJoinOperator: normalizedJoinOperator
    });
  } catch (error) {
    console.error('Error updating filter join operator:', error);
  }
}

async function onDragEnd(event) {
  const { newIndex, oldIndex, from } = event;
  if (newIndex === oldIndex) return;

  const ruleTypeId = from.getAttribute('data-rule-type');
  if (!ruleTypeId) return;

  const rules = getEnabledRulesByType(ruleTypeId);
  const [removed] = rules.splice(oldIndex, 1);
  rules.splice(newIndex, 0, removed);

  for (let i = 0; i < rules.length; i++) {
    if (rules[i].orderOfExecution !== i) {
      await updateRuleOrder(rules[i]._id, i);
    }
  }
}

function createNewRule() {
  const defaultRuleType = standardRuleTypes.find(type =>
    getRuleCountByType(type.id, true) > 0
  )?.id || 'categorize';

  createNewRuleWithType(defaultRuleType);
}

function createNewRuleWithType(typeId) {
  const tabId = state.selected.tab?._id;

  currentRule.value = {
    rule: [typeId, '', '', '', ''],
    applyForTabs: tabId ? [tabId] : [],
    filterJoinOperator: 'and',
    _isImportant: false,
    orderOfExecution: getEnabledRulesByType(typeId).length
  };
  isNewRule.value = true;
  showRuleEditModal.value = true;
}

function editRule(rule) {
  currentRule.value = JSON.parse(JSON.stringify(rule));
  isNewRule.value = false;
  showRuleEditModal.value = true;
}

function closeRuleEditModal() {
  showRuleEditModal.value = false;
  currentRule.value = null;
}

async function saveRule(rule) {
  const tabId = state.selected.tab?._id;
  if (!tabId) return;

  const tabScopedRule = {
    ...rule,
    applyForTabs: [tabId],
    _isImportant: false
  };

  try {
    if (isNewRule.value) {
      await createRule(tabScopedRule);
    } else {
      await updateRule(tabScopedRule);
    }
    closeRuleEditModal();
  } catch (error) {
    console.error('Error saving rule:', error);
  }
}

async function toggleRuleContextStatus(rule) {
  try {
    const tabId = state.selected.tab?._id;
    const isEnabledForCurrentTab = rule.applyForTabs.includes('_GLOBAL') || rule.applyForTabs.includes(tabId);

    await toggleRuleContext(rule, !isEnabledForCurrentTab);
  } catch (error) {
    console.error('Error toggling rule status:', error);
  }
}

function confirmDeleteRule(rule) {
  ruleToDelete.value = rule;
  showDeleteModal.value = true;
}

async function deleteRule() {
  try {
    if (ruleToDelete.value?._id) {
      await deleteRuleById(ruleToDelete.value._id);
      showDeleteModal.value = false;
      ruleToDelete.value = null;
    }
  } catch (error) {
    console.error('Error deleting rule:', error);
  }
}
</script>

<template>
  <div class="flex flex-col bg-white min-h-screen">
    <div class="max-w-3xl mx-auto w-full flex flex-col min-h-screen">
      <!-- Header Area -->
      <div class="px-6 py-8 border-b-2 border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 backdrop-blur-sm bg-white/90">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <div v-if="state.selected.tab && !isEditingTabName" class="relative">
              <button
                @click="toggleTabActionsMenu"
                class="p-2 text-gray-300 hover:text-black hover:bg-gray-100 rounded-full transition-all"
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
          class="p-2 text-gray-300 hover:text-black hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="p-6 pb-32">
        <div class="space-y-12">
          <!-- Rule Sections -->
          <div v-for="ruleType in ruleTypes" :key="ruleType.id" class="space-y-4">
            <div 
              @click="toggleRuleTypeCollapse(ruleType.id)"
              class="flex items-center justify-between cursor-pointer group"
            >
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg transition-colors bg-gray-50 group-hover:bg-black group-hover:text-white text-gray-400">
                  <component :is="ruleType.icon" class="w-5 h-5" />
                </div>
                <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-black transition-colors">
                  {{ ruleType.name }}
                </h3>
                <span 
                  v-if="getRuleCountByType(ruleType.id, true) > 0" 
                  class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                >
                  {{ getRuleCountByType(ruleType.id, true) }}
                </span>
              </div>
              <ChevronDown 
                :class="[
                  'w-5 h-5 text-gray-300 transition-all duration-300 group-hover:text-black', 
                  collapsedSections[ruleType.id] ? '' : 'rotate-180'
                ]" 
              />
            </div>
            
            <transition name="list-fade">
              <div v-if="!collapsedSections[ruleType.id]" class="space-y-3">
                <!-- No Rules Empty State -->
                <div 
                  v-if="getEnabledRulesByType(ruleType.id).length === 0" 
                  class="py-12 px-6 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-3"
                >
                  <p class="text-sm font-bold text-gray-300">No active {{ ruleType.name.toLowerCase() }}</p>
                  <button 
                    @click="createNewRuleWithType(ruleType.id)"
                    class="text-xs font-black uppercase tracking-widest text-black hover:text-gray-500 py-2"
                  >
                    + Add Rule
                  </button>
                </div>
                
                <!-- Draggable Rule List -->
                <div v-else>
                  <draggable 
                    v-model="enabledRulesByTypeComputed[ruleType.id]" 
                    item-key="_id"
                    class="space-y-3"
                    handle=".drag-handle"
                    @end="onDragEnd"
                    :data-rule-type="ruleType.id"
                  >
                    <template #item="{ element }">
                      <RuleCard 
                        :rule="element"
                        :rule-type="ruleType"
                        @edit="editRule"
                        @toggle="toggleRuleContextStatus"
                        @delete="confirmDeleteRule"
                      />
                    </template>
                  </draggable>
                </div>

                <!-- Disabled categorization rules (hidden in sub-section) -->
                <div v-if="ruleType.id === 'categorize' && getDisabledRulesByType('categorize').length > 0" class="mt-8">
                  <button 
                    @click="toggleDisabledSection"
                    class="w-full flex items-center gap-4 group py-4"
                  >
                    <div class="h-[2px] flex-1 bg-gray-50"></div>
                    <div class="text-[10px] font-black text-gray-300 group-hover:text-black transition-colors uppercase tracking-[0.3em] flex items-center gap-2">
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
            </transition>
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
      <div class="mt-auto px-6 py-8 bg-white/80 backdrop-blur-sm border-t-2 border-gray-50 sticky bottom-0 flex justify-center z-20">
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

// UI State 
const showRuleEditModal = ref(false);
const showDeleteModal = ref(false);
const currentRule = ref(null);
const isNewRule = ref(false);
const ruleToDelete = ref(null);
const disabledSectionCollapsed = ref(true);

// Tab name editing state
const isEditingTabName = ref(false);
const editedTabName = ref('');
const tabNameInput = ref(null);
const isSavingTabName = ref(false);
const isDeletingTab = ref(false);
const showTabActionsMenu = ref(false);

// Collapsible sections state
const collapsedSections = ref({
  sort: true,
  categorize: true,
  filter: true,
  groupBy: true
});

// Define rule types with their properties
const ruleTypes = [
  { id: 'sort', name: 'Sort Rules', icon: SortAsc, description: 'Define how items are ordered' },
  { id: 'categorize', name: 'Categorize Rules', icon: FolderCheck, description: 'Assign categories to items' },
  { id: 'filter', name: 'Filter Rules', icon: Filter, description: 'Control which items are displayed' },
  { id: 'groupBy', name: 'Group Rules', icon: Group, description: 'Determine how items are grouped' }
];

const canSaveTabName = computed(() => {
  if (!state.selected.tab) return false;

  const nextTabName = editedTabName.value.trim();
  const currentTabName = (state.selected.tab.tabName || '').trim();
  if (!nextTabName) return false;

  return nextTabName !== currentTabName;
});

// Toggle functions
function toggleRuleTypeCollapse(typeId) {
  collapsedSections.value[typeId] = !collapsedSections.value[typeId];
}

function toggleDisabledSection() {
  disabledSectionCollapsed.value = !disabledSectionCollapsed.value;
}

// Tab name editing functions
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

// Get enabled rules (rules that apply to current tab or are global)
const enabledRules = computed(() => {
  const tabId = state.selected.tab?._id;
  if (!tabId) return [];
  
  return state.allUserRules.filter(rule => 
    rule.applyForTabs.includes('_GLOBAL') || rule.applyForTabs.includes(tabId)
  );
});

// Get disabled rules (rules that don't apply to current tab)
const disabledRules = computed(() => {
  const tabId = state.selected.tab?._id;
  if (!tabId) return [];
  
  return state.allUserRules.filter(rule => 
    !rule.applyForTabs.includes('_GLOBAL') && !rule.applyForTabs.includes(tabId)
  );
});

// Computed property for draggable to use
const enabledRulesByTypeComputed = computed({
  get: () => {
    const result = {};
    ruleTypes.forEach(type => {
      result[type.id] = getEnabledRulesByType(type.id);
    });
    return result;
  },
  set: (newValue) => {
    // This setter is needed for draggable but reordering is handled in onDragEnd
  }
});

// Get enabled rules by type
function getEnabledRulesByType(typeId) {
  return enabledRules.value.filter(rule => rule.rule[0] === typeId)
    .sort((a, b) => (a.orderOfExecution || 0) - (b.orderOfExecution || 0));
}

// Get disabled rules by type
function getDisabledRulesByType(typeId) {
  return disabledRules.value.filter(rule => rule.rule[0] === typeId);
}

// Get rule count by type
function getRuleCountByType(typeId, enabledOnly = false) {
  if (enabledOnly) {
    return getEnabledRulesByType(typeId).length;
  }
  return state.allUserRules.filter(rule => rule.rule[0] === typeId).length;
}

// Handle drag and drop reordering
async function onDragEnd(event) {
  const { newIndex, oldIndex, from } = event;
  if (newIndex === oldIndex) return;
  
  // Determine which rule type was reordered
  const ruleTypeId = from.getAttribute('data-rule-type');
  
  if (!ruleTypeId) return;
  
  // Update order of execution for all rules of this type
  const rules = getEnabledRulesByType(ruleTypeId); // Get the current ordered list
  
  // Reorder locally first to reflect the change immediately
  const [removed] = rules.splice(oldIndex, 1);
  rules.splice(newIndex, 0, removed);

  // Update all rules with new execution order
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].orderOfExecution !== i) {
      await updateRuleOrder(rules[i]._id, i);
    }
  }
}

// Create a new rule
function createNewRule() {
  // Find first non-empty rule type for default
  const defaultRuleType = ruleTypes.find(type => 
    getRuleCountByType(type.id, true) > 0
  )?.id || 'categorize';
  
  createNewRuleWithType(defaultRuleType);
}

function createNewRuleWithType(typeId) {
  currentRule.value = {
    rule: [typeId, '', '', '', ''],
    applyForTabs: state.selected.tab?._id ? [state.selected.tab._id] : ['_GLOBAL'],
    _isImportant: false,
    orderOfExecution: enabledRules.value.length
  };
  isNewRule.value = true;
  showRuleEditModal.value = true;
}

// Edit an existing rule
function editRule(rule) {
  currentRule.value = JSON.parse(JSON.stringify(rule));
  isNewRule.value = false;
  showRuleEditModal.value = true;
}

// Close the rule edit modal
function closeRuleEditModal() {
  showRuleEditModal.value = false;
  currentRule.value = null;
}

// Save a rule (create or update)
async function saveRule(rule) {
  try {
    if (isNewRule.value) {
      await createRule(rule);
    } else {
      await updateRule(rule);
    }
    closeRuleEditModal();
  } catch (error) {
    console.error('Error saving rule:', error);
  }
}

// Toggle a rule's context status
async function toggleRuleContextStatus(rule) {
  try {
    // If rule is enabled for this tab, disable it; otherwise enable it
    const tabId = state.selected.tab?._id;
    const isEnabledForCurrentTab = rule.applyForTabs.includes('_GLOBAL') || rule.applyForTabs.includes(tabId);
    
    await toggleRuleContext(rule, !isEnabledForCurrentTab);
  } catch (error) {
    console.error('Error toggling rule status:', error);
  }
}

// Show delete confirmation modal
function confirmDeleteRule(rule) {
  ruleToDelete.value = rule;
  showDeleteModal.value = true;
}

// Delete a rule
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

<style scoped>
.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

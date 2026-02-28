<template>
  <div class="flex flex-col bg-white min-h-screen">
    <div class="max-w-3xl mx-auto w-full flex flex-col min-h-screen">
      <!-- Header Area -->
      <div class="px-6 py-8 border-b-2 border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 backdrop-blur-sm bg-white/90">
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <h1 v-if="!isEditingTabName" class="text-3xl font-black text-gray-900 tracking-tight leading-tight">
              Rules for <span class="text-gray-400">"{{ state.selected.tab?.tabName || 'Current Tab' }}"</span>
            </h1>
            <div v-else class="flex-1 max-w-md">
              <input 
                ref="tabNameInput"
                v-model="editedTabName" 
                class="w-full px-3 py-2 text-2xl font-black bg-gray-50 border-2 border-black rounded-xl focus:outline-none focus:ring-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                @keyup.enter="saveTabName"
                @keyup.esc="cancelTabNameEdit"
                @blur="saveTabName"
              />
            </div>
            <button 
              v-if="!isEditingTabName"
              @click="startTabNameEdit" 
              class="p-2 text-gray-300 hover:text-black hover:bg-gray-100 rounded-full transition-all"
              title="Edit tab name"
            >
              <Edit class="w-5 h-5" />
            </button>
          </div>
          <p class="text-sm text-gray-400 mt-1 font-medium">Manage how transactions are automatically processed in this tab.</p>
        </div>
        <button 
          @click="$emit('close')" 
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
  Plus, ChevronDown, SortAsc, FolderCheck, Group, Filter, Edit, X
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRuleManager } from '../composables/useRuleManager';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI';
import draggable from 'vuedraggable';

import RuleCard from '../components/RuleCard.vue';
import RuleEditModal from '../components/RuleEditModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';

const { state } = useDashboardState();
const { updateTabName } = useTabsAPI();
const { 
  createRule,
  updateRule,
  deleteRuleById,
  toggleRuleContext,
  updateRuleOrder
} = useRuleManager();

defineEmits(['close']);

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
    editedTabName.value = state.selected.tab.tabName || '';
    isEditingTabName.value = true;
    nextTick(() => tabNameInput.value?.focus());
  }
}

function saveTabName() {
  if (state.selected.tab && editedTabName.value.trim()) {
    state.selected.tab.tabName = editedTabName.value.trim();
    
    updateTabName(state.selected.tab._id, editedTabName.value.trim());
  }
  isEditingTabName.value = false;
}

function cancelTabNameEdit() {
  isEditingTabName.value = false;
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
<template>
  <div class="bg-gray-50">
    <div class="bg-white overflow-hidden">
      <!-- Header with tab name -->
      <div class="flex items-center justify-between bg-blue-600 text-white p-4">
        <div class="flex items-center space-x-3">
          <div v-if="isEditingTabName" class="flex items-center">
            <input 
              ref="tabNameInput"
              v-model="editedTabName" 
              class="px-2 py-1 text-xl font-semibold bg-blue-700 text-white border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-white"
              @keyup.enter="saveTabName"
              @keyup.esc="cancelTabNameEdit"
              @blur="saveTabName"
            />
          </div>
          <div v-else class="flex items-center">
          <h1 class="text-xl font-semibold">Rules for "{{ state.selected.tab?.tabName || 'Tab' }}"</h1>
            <button 
              @click="startTabNameEdit" 
              class="ml-2 p-1 text-blue-200 hover:text-white rounded-full focus:outline-none"
              title="Edit tab name"
            >
              <Edit class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <!-- Main Content Area -->
      <div class="max-h-[65vh] overflow-auto">
        <!-- Enabled Rules -->
        <div class="pb-2">
          <!-- Rule Type Collapsible Sections -->
          <div v-for="ruleType in ruleTypes" :key="ruleType.id" class="border-b border-gray-200">
            <div 
              @click="toggleRuleTypeCollapse(ruleType.id)"
              class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
            >
              <div class="flex items-center space-x-2">
                <component :is="ruleType.icon" :class="`text-${ruleType.color}-600 w-5 h-5`" />
                <h3 class="font-medium text-gray-800">{{ ruleType.name }}</h3>
                <span 
                  v-if="getRuleCountByType(ruleType.id, true) > 0" 
                  :class="`bg-${ruleType.color}-100 text-${ruleType.color}-800 text-xs font-medium px-2.5 py-0.5 rounded-full`"
                >
                  {{ getRuleCountByType(ruleType.id, true) }}
                </span>
              </div>
              <ChevronDown 
            :class="[
                  'w-5 h-5 transition-transform', 
                  collapsedSections[ruleType.id] ? '' : 'transform rotate-180'
                ]" 
              />
            </div>
            
            <!-- Rules of this type -->
            <div v-if="!collapsedSections[ruleType.id]" class="px-4 pb-4">
              <!-- Enabled Rules -->
              <div v-if="getEnabledRulesByType(ruleType.id).length === 0" class="text-center py-8">
                <p class="text-gray-500">No enabled {{ ruleType.name.toLowerCase() }} for this tab</p>
              </div>
              
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
      
              <!-- For categorize rules, also show disabled rules -->
              <div v-if="ruleType.id === 'categorize' && getDisabledRulesByType('categorize').length > 0" class="mt-8">
                <div 
                  @click="toggleDisabledSection"
                  class="flex items-center mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <div class="flex-grow border-t border-gray-200"></div>
                  <div class="flex-shrink mx-4 text-sm text-gray-500 flex items-center">
                    <ChevronDown 
                      :class="[
                        'w-4 h-4 mr-1 transition-transform', 
                        disabledSectionCollapsed ? '' : 'transform rotate-180'
                      ]" 
                    />
                    <span>Disabled Categorize Rules ({{ getDisabledRulesByType('categorize').length }})</span>
                  </div>
                  <div class="flex-grow border-t border-gray-200"></div>
          </div>
          
                <div v-if="!disabledSectionCollapsed" class="space-y-3">
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
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="bg-gray-50 px-4 py-4 border-t border-gray-200">
        <div class="flex justify-end">
          <button
            @click="createNewRule"
            class="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus class="w-4 h-4 mr-2" />
            Create New Rule
          </button>
        </div>
      </div>
    </div>
    
    <!-- Rule Edit Modal -->
    <RuleEditModal
      v-if="showRuleEditModal"
      :rule="currentRule"
      :is-new="isNewRule"
      @close="closeRuleEditModal"
      @save="saveRule"
    />
    
    <!-- Delete Confirmation Modal -->
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
  Plus, ChevronDown, SortAsc, FolderCheck, Group, Filter, Edit
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRuleManager } from '../composables/useRuleManager';
import draggable from 'vuedraggable';

import RuleCard from '../components/RuleCard.vue';
import RuleEditModal from '../components/RuleEditModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';

const { state } = useDashboardState();
const { 
  createRule,
  updateRule,
  deleteRuleById,
  toggleRuleContext,
  updateRuleOrder
} = useRuleManager();

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
  { 
    id: 'sort', 
    name: 'Sort Rules', 
    color: 'cyan', 
    icon: SortAsc,
    description: 'Define how items are ordered' 
  },
  { 
    id: 'categorize', 
    name: 'Categorize Rules', 
    color: 'teal', 
    icon: FolderCheck,
    description: 'Assign categories to items' 
  },
  { 
    id: 'filter', 
    name: 'Filter Rules', 
    color: 'amber', 
    icon: Filter,
    description: 'Control which items are displayed'
  },
  { 
    id: 'groupBy', 
    name: 'Group Rules', 
    color: 'indigo', 
    icon: Group,
    description: 'Determine how items are grouped'
  }
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
    
    // Focus the input after rendering
    nextTick(() => {
      if (tabNameInput.value) {
        tabNameInput.value.focus();
        tabNameInput.value.select();
      }
    });
  }
}

function saveTabName() {
  if (state.selected.tab && editedTabName.value.trim()) {
    // Update tab name in state
    state.selected.tab.tabName = editedTabName.value.trim();
    
    // Here you would also call an API to persist the change
    // For example: updateTabName(state.selected.tab._id, editedTabName.value.trim());
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
const enabledRulesByTypeComputed = computed(() => {
  const result = {};
  ruleTypes.forEach(type => {
    result[type.id] = getEnabledRulesByType(type.id);
  });
  return result;
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
  const ruleTypeId = from.getAttribute('data-rule-type') || 
    Object.keys(enabledRulesByTypeComputed.value).find(key => 
      enabledRulesByTypeComputed.value[key].length > 0 && 
      enabledRulesByTypeComputed.value[key][0].rule[0] === enabledRulesByTypeComputed.value[key][0].rule[0]
    );
  
  if (!ruleTypeId) return;
  
  // Update order of execution for all rules of this type
  const rules = enabledRulesByTypeComputed.value[ruleTypeId];
  
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
  
  currentRule.value = {
    rule: [defaultRuleType, '', '', '', ''],
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
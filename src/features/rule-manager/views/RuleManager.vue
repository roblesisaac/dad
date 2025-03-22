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
      <div class="max-h-[65vh] overflow-y-auto overflow-x-hidden">
        <!-- Enabled Rules -->
        <div class="pb-2">
          <!-- Rule Type Collapsible Sections -->
          <div v-for="ruleType in ruleTypes" :key="ruleType.id" class="border-b border-gray-200">
            <div 
              @click="toggleRuleTypeCollapse(ruleType.id)"
              class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 relative"
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
                <!-- Rule type tooltip -->
                <Tooltip position="bottom" width="12rem">
                  <template #trigger>
                    <div 
                      class="ml-2 cursor-help"
                      :class="`text-${ruleType.color}-600`"
                    >
                      <Info class="w-4 h-4" />
                    </div>
                  </template>
                  {{ ruleType.description }}
                </Tooltip>
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
              <!-- Create rule button -->
              <div class="mb-4 mt-2 flex justify-end">
                <button
                  @click="createNewRule(ruleType.id)"
                  :class="getButtonClasses(ruleType)"
                >
                  <Plus class="w-3.5 h-3.5 mr-1" />
                  Add {{ ruleType.name.replace(' Rules', '') }} Rule
                </button>
              </div>
              
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
      <div class="px-4 py-4 border-t border-gray-200">
        <div class="flex justify-end">
          <button
            @click="$emit('close')"
            class="inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
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
  Plus, ChevronDown, SortAsc, FolderCheck, Group, Filter, Edit, Info
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRuleManager } from '../composables/useRuleManager';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI';
import draggable from 'vuedraggable';

import RuleCard from '../components/RuleCard.vue';
import RuleEditModal from '../components/RuleEditModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import Tooltip from '@/shared/components/Tooltip.vue';

const { state } = useDashboardState();
const { updateTabName } = useTabsAPI();
const { 
  createRule,
  updateRule,
  deleteRuleById,
  toggleRuleContext,
  updateRuleOrder
} = useRuleManager();

// Define emits
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

// Button classes for each rule type
const buttonClasses = {
  sort: 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500',
  categorize: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500',
  filter: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  groupBy: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
};

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
function createNewRule(ruleType = null) {
  // If no rule type provided, find first non-empty rule type for default
  const defaultRuleType = ruleType || ruleTypes.find(type => 
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

// Helper function to get button classes based on rule type
function getButtonClasses(ruleType) {
  return [
    'inline-flex justify-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2',
    buttonClasses[ruleType.id] || 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  ];
}
</script>

<style scoped>
/* Remove all the old tooltip CSS */
/* .tooltip-container:hover .tooltip,
.relative:hover .tooltip {
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
  left: 5px;
  z-index: 500;
}

.tooltip-arrow-up {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 5px 5px 5px;
  border-color: transparent transparent #1f2937 transparent;
  top: -5px;
  left: 5px;
  z-index: 500;
} */

/* Ensure tooltip container is positioned correctly */
/* .tooltip-container {
  position: relative;
} */

/* Fixed positioning for tooltips to prevent cutoff */
/* .tooltip {
  box-sizing: border-box;
  overflow-wrap: break-word;
  z-index: 500;
  position: fixed;
  max-width: 12rem;
} */

/* Ensure main content doesn't create horizontal overflow */
.max-h-\[65vh\] {
  overflow-x: hidden;
  overflow-y: auto;
}
</style> 
<template>
  <div :class="containerClasses">
    <!-- Enabled Tabs Header -->
    <div
      v-if="!isDashboardVariant"
      class="py-5 bg-white border-b-2 border-gray-100 flex items-center justify-between"
    >
      <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Active Tabs</h2>
      <span class="text-[10px] font-black text-black">{{ enabledTabs.length }} enabled</span>
    </div>
    
    <!-- List of active tabs -->
    <div v-if="enabledTabs.length > 0" :class="isDashboardVariant ? '' : 'py-2'">

      <div v-if="enabledTabs.length > 0">
        <Draggable 
          v-if="shouldUseDraggable"
          v-model="draggableTabs" 
          v-bind="dragOptions" 
          handle=".handler-tab"
          @end="handleDragEnd"
          item-key="_id"
          :disabled="!canDragInCurrentMode"
        >
          <template #item="{element}">
            <AllTabRow
              :element="element"
              :key="element._id" 
              :is-edit-mode="isEditModeForTab(element._id)"
              :show-cancel-edit-button="showCancelEditButtonForTab(element._id)"
              :reorder-reset-token="reorderResetToken"
              :variant="variant"
              @tab-selected="handleTabSelected"
              @request-reorder-mode="handleRequestReorderMode"
              @tab-actions-clicked="handleTabActionsClicked"
              @cancel-edit-mode="exitAllEditModes"
            />
          </template>
        </Draggable>
        
        <!-- Regular list -->
        <div v-else>
          <AllTabRow
            v-for="element in enabledTabs"
            :key="element._id"
            :element="element"
            :is-edit-mode="isEditModeForTab(element._id)"
            :show-cancel-edit-button="showCancelEditButtonForTab(element._id)"
            :reorder-reset-token="reorderResetToken"
            :variant="variant"
            @tab-selected="handleTabSelected"
            @request-reorder-mode="handleRequestReorderMode"
            @tab-actions-clicked="handleTabActionsClicked"
            @cancel-edit-mode="exitAllEditModes"
          />
        </div>
      </div>
    </div>

    <!-- Disabled Tabs Section -->
    <div :class="isDashboardVariant ? '' : 'py-4'">
      <button 
        @click="toggleDisabledSection" 
        :class="isDashboardVariant
          ? 'flex items-center justify-between w-full py-6 hover:bg-gray-50/50 transition-colors group focus:outline-none'
          : 'flex items-center justify-between w-full mb-4 group focus:outline-none'"
      >
        <div class="flex items-center gap-2">
          <h2 :class="isDashboardVariant ? 'text-base font-black text-gray-900 uppercase tracking-tight' : 'text-[10px] font-black uppercase tracking-widest text-black'">Hidden Tabs</h2>
          <span :class="isDashboardVariant ? 'text-sm font-black text-black' : 'text-[10px] font-black text-black'">{{ disabledTabs.length }}</span>
        </div>
        <div class="text-black group-hover:text-black transition-colors">
          <ChevronUp v-if="showDisabledTabs" class="w-4 h-4" />
          <ChevronDown v-else class="w-4 h-4" />
        </div>
      </button>
      
      <div v-if="showDisabledTabs">
        <AllTabRow 
          v-for="tab in disabledTabs"
          :key="tab._id"
          :element="tab"
          :is-edit-mode="isEditModeForTab(tab._id)"
          :show-cancel-edit-button="showCancelEditButtonForTab(tab._id)"
          :reorder-reset-token="reorderResetToken"
          :variant="variant"
          @tab-selected="handleTabSelected"
          @request-reorder-mode="handleRequestReorderMode"
          @tab-actions-clicked="handleTabActionsClicked"
          @cancel-edit-mode="exitAllEditModes"
        />
        <div v-if="disabledTabs.length === 0" class="py-8 text-center text-[10px] font-black uppercase tracking-widest text-black">
          No hidden tabs
        </div>
      </div>
    </div>

    <!-- Create New Tab Button -->
    <div :class="isDashboardVariant ? '' : 'p-6 bg-gray-50/30 border-t-2 border-gray-100'">
      <button 
        @click="handleCreateNew" 
        :class="isDashboardVariant
          ? 'w-full py-6 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors group focus:outline-none'
          : 'w-full py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:shadow-none active:translate-y-0.5'"
      >
        <template v-if="isDashboardVariant">
          <span class="text-base font-black text-gray-900 uppercase tracking-tight">Create New Tab</span>
          <span class="text-black group-hover:text-black transition-colors text-lg leading-none">+</span>
        </template>
        <template v-else>
          <span>+</span>
          Create New Tab
        </template>
      </button>
    </div>

    <TabCreationWizardModal
      v-if="isDashboardVariant"
      :is-open="showCreateWizard"
      :is-saving="isCreatingFromWizard"
      @close="closeCreateWizard"
      @save="handleWizardSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import AllTabRow from './AllTabRow.vue';
import { useTabs } from '../composables/useTabs';
import { useDraggable } from '@/shared/composables/useDraggable';
import TabCreationWizardModal from './TabCreationWizardModal.vue';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';
import {
  resolveTabOrderScopeId,
  setTabSortForScope
} from '@/features/tabs/utils/tabOrder.js';

const props = defineProps({
  variant: {
    type: String,
    default: 'modal',
    validator: (value) => ['modal', 'dashboard'].includes(value)
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  rearrangeActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['tab-selected']);

const { Draggable, dragOptions } = useDraggable();
const { state } = useDashboardState();
const { createNewTab, createTabWithWizardConfig, updateTabSort } = useTabs();
const showDisabledTabs = ref(false);
const longPressReorderTabId = ref('');
const reorderResetToken = ref(0);
const dashboardTabs = ref([]);
const showCreateWizard = ref(false);
const isCreatingFromWizard = ref(false);
const isDashboardVariant = computed(() => props.variant === 'dashboard');
const isHeaderRearrangeActive = computed(() => isDashboardVariant.value && props.rearrangeActive);
const shouldUseDraggable = computed(() => {
  return isDashboardVariant.value || props.isEditMode;
});
const canDragInCurrentMode = computed(() => {
  if (isDashboardVariant.value) {
    return Boolean(longPressReorderTabId.value || isHeaderRearrangeActive.value);
  }

  return props.isEditMode;
});
const draggableTabs = computed({
  get: () => {
    if (isDashboardVariant.value) {
      return dashboardTabs.value;
    }

    return state.selected.tabsForGroup;
  },
  set: (tabs) => {
    if (isDashboardVariant.value) {
      dashboardTabs.value = Array.isArray(tabs) ? tabs : [];
      return;
    }

    state.selected.tabsForGroup = tabs;
  }
});
const containerClasses = computed(() => {
  if (isDashboardVariant.value) {
    return 'bg-white w-full';
  }

  return 'bg-white max-h-[80vh] overflow-y-auto w-full';
});

// Separate tabs into enabled and disabled based on current group
const enabledTabs = computed(() => state.selected.tabsForGroup);
const enabledTabIdSet = computed(() => {
  return new Set(enabledTabs.value.map(tab => tab?._id).filter(Boolean));
});
const isAllAccountsScope = computed(() => {
  return state.selected.group?.isVirtualAllAccounts || state.selected.group?._id === ALL_ACCOUNTS_GROUP_ID;
});

const disabledTabs = computed(() => {
  if (isAllAccountsScope.value) {
    return state.allUserTabs
      .filter((tab) => {
        const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
        return showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
      })
      .sort((a, b) => a.tabName.localeCompare(b.tabName));
  }

  const currentGroupId = state.selected.group?._id;
  if (!currentGroupId) return [];
  
  return state.allUserTabs
    .filter((tab) => {
      const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
      const isEnabledForCurrentGroup = showForGroup.includes(currentGroupId) || showForGroup.includes('_GLOBAL');
      return !isEnabledForCurrentGroup;
    })
    .sort((a, b) => a.tabName.localeCompare(b.tabName));
});

function toggleDisabledSection() {
  showDisabledTabs.value = !showDisabledTabs.value;
}

function handleCreateNew() {
  if (isDashboardVariant.value) {
    showCreateWizard.value = true;
    return;
  }

  createNewTab();
}

function closeCreateWizard() {
  if (isCreatingFromWizard.value) {
    return;
  }

  showCreateWizard.value = false;
}

async function handleWizardSave(config) {
  if (isCreatingFromWizard.value) {
    return;
  }

  isCreatingFromWizard.value = true;
  try {
    const createdTab = await createTabWithWizardConfig(config);
    if (createdTab) {
      showCreateWizard.value = false;
      emit('tab-selected', createdTab);
    }
  } finally {
    isCreatingFromWizard.value = false;
  }
}

function handleTabSelected(tab) {
  emit('tab-selected', tab);
}

function handleRequestReorderMode(tabId) {
  if (!isDashboardVariant.value) return;

  dashboardTabs.value = [...enabledTabs.value];
  longPressReorderTabId.value = tabId || '';
}

function handleTabActionsClicked() {
  if (!isDashboardVariant.value) return;
  if (isHeaderRearrangeActive.value) return;
  if (!longPressReorderTabId.value) return;

  exitAllEditModes();
}

function exitAllEditModes() {
  longPressReorderTabId.value = '';
}

function isEditModeForTab(tabId) {
  if (!isDashboardVariant.value) {
    return props.isEditMode;
  }

  if (isHeaderRearrangeActive.value) {
    return enabledTabIdSet.value.has(tabId);
  }

  return longPressReorderTabId.value === tabId;
}

function showCancelEditButtonForTab(tabId) {
  if (!isDashboardVariant.value) {
    return false;
  }

  if (isHeaderRearrangeActive.value) {
    return false;
  }

  return longPressReorderTabId.value === tabId;
}

// Handle drag end event
async function handleDragEnd() {
  const orderedTabs = isDashboardVariant.value
    ? dashboardTabs.value
    : state.selected.tabsForGroup;

  const scopeId = resolveTabOrderScopeId(state.selected.group);
  const reorderOperations = [];

  // Update tab ordering in memory and persist for the active scope.
  orderedTabs.forEach((tab, index) => {
    setTabSortForScope(tab, scopeId, index);

    if (tab?._id) {
      reorderOperations.push(updateTabSort(tab._id, index, { scopeId }));
    }
  });

  if (reorderOperations.length) {
    await Promise.allSettled(reorderOperations);
  }

  if (longPressReorderTabId.value) {
    longPressReorderTabId.value = '';
  }

  reorderResetToken.value += 1;
}

watch(
  () => enabledTabs.value,
  (tabs) => {
    if (!isDashboardVariant.value) return;

    if (!canDragInCurrentMode.value) {
      dashboardTabs.value = [...tabs];
    }
  },
  { immediate: true }
);

watch(
  () => props.rearrangeActive,
  (isActive) => {
    if (!isDashboardVariant.value) return;

    if (isActive) {
      dashboardTabs.value = [...enabledTabs.value];
    }

    longPressReorderTabId.value = '';
  },
  { immediate: true }
);

onMounted(() => {
  if (isDashboardVariant.value) {
    window.scrollTo(0, 0);
  }
});
</script> 

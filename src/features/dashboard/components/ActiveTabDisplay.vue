<template>
  <div class="flex w-full bg-gray-100 border-b-2 border-black shadow-sm overflow-hidden">
    <!-- Tab Navigation -->
    <div class="flex-shrink-0 flex items-center border-r border-gray-300">
      <button 
        v-if="hasPreviousTab"
        @click="navigateToPreviousTab" 
        class="px-3 py-2.5 hover:text-blue-600 transition-colors text-blue-800"
      >
        <ChevronLeft size="18" />
      </button>
    </div>
    
    <!-- Active Tab Display -->
    <div 
      class="flex-grow flex items-center justify-between overflow-hidden min-w-0 transition-colors"
    >
      <div class="flex items-center px-4 py-2.5 overflow-hidden min-w-0">
        <div class="flex items-center overflow-hidden min-w-0">
          <Transition>
            <span v-if="state.isLoading" class="font-bold text-blue-800 truncate leading-tight max-w-full">
              Loading<LoadingDots />
            </span>
          </Transition>

          <!-- Menu Button -->
          <button 
            v-if="!state.isLoading && state.selected.tab"
            @click="showRuleManagerModal = true" 
            class="mr-2 p-1 hover:bg-gray-200 rounded transition-colors text-gray-600 hover:text-blue-600 flex-shrink-0"
            title="Manage tab rules"
          >
            <EllipsisVertical size="16" />
          </button>
          
          <!-- Tab Name -->
          <span v-if="!state.isLoading" class="font-semibold text-gray-800 truncate leading-tight max-w-full">
            {{ state.selected.tab?.tabName || 'No tab selected' }}
          </span>
          <span 
            v-if="state.selected.tab && !state.isLoading" 
            class="font-bold leading-tight ml-2 flex-shrink-0" 
            :class="fontColor(state.selected.tab.total)"
          >
            {{ tabTotal }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="flex-shrink-0 flex items-center border-l border-gray-300">
      <button 
        v-if="hasNextTab"
        @click="navigateToNextTab" 
        class="px-3 py-2.5 hover:text-blue-600 transition-colors text-blue-800"
      >
        <ChevronRight size="18" />
      </button>
    </div>

    <!-- Rules Manager Button -->
    <div class="w-12 flex-shrink-0">
      <button 
        @click="showAllTabsModal = true"
        class="h-full w-full bg-gray-300 border-l-2 border-black flex items-center justify-center hover:bg-gray-500 transition-colors"
        title="Manage tab rules"
      >
        <Folders size="16" />
      </button>
    </div>
  </div>

  <!-- Use the new AllTabsModal component -->
  <AllTabsModal 
    :is-open="showAllTabsModal"
    @close="showAllTabsModal = false"
    @tab-selected="handleTabSelected"
  />

  <!-- Use the new RuleManagerModal component -->
  <RuleManagerModal
    :is-open="showRuleManagerModal"
    @close="showRuleManagerModal = false"
  />
</template>

<script setup>
import { useDashboardState } from '../composables/useDashboardState';
import { useTabs } from '@/features/tabs/composables/useTabs';
import { ChevronLeft, ChevronRight, EllipsisVertical, Folders } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { computed, ref, nextTick } from 'vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';

const { state } = useDashboardState();
const { selectTab } = useTabs();
const { fontColor, formatPrice } = useUtils();

// Modal states
const showAllTabsModal = ref(false);
const showRuleManagerModal = ref(false);

const tabTotal = computed(() => {
  const tab = state.selected.tab;
  if (!tab) return '';
  
  const total = tab.total || 0;
  return formatPrice(total, { toFixed: 2 });
});

// Navigation logic
const currentTabIndex = computed(() => {
  if (!state.selected.tab || state.selected.tabsForGroup.length === 0) return -1;
  return state.selected.tabsForGroup.findIndex(tab => tab._id === state.selected.tab._id);
});

const hasPreviousTab = computed(() => {
  return currentTabIndex.value > 0;
});

const hasNextTab = computed(() => {
  return currentTabIndex.value !== -1 && currentTabIndex.value < state.selected.tabsForGroup.length - 1;
});

const navigateToPreviousTab = () => {
  if (!hasPreviousTab.value) return;
  const previousTab = state.selected.tabsForGroup[currentTabIndex.value - 1];
  if (previousTab) {
    selectTab(previousTab);
  }
};

const navigateToNextTab = () => {
  if (!hasNextTab.value) return;
  const nextTab = state.selected.tabsForGroup[currentTabIndex.value + 1];
  if (nextTab) {
    selectTab(nextTab);
  }
};

// Handle tab selection from modal
const handleTabSelected = () => {
  // Just close the modal - the actual tab selection is handled in AllTabRow
  nextTick(() => {
    showAllTabsModal.value = false;
  });
};
</script> 
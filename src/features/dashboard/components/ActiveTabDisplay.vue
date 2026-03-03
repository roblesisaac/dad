<template>
  <div class="flex w-full bg-white transition-all items-stretch h-14">
    <!-- Left Navigation -->
    <div class="flex-shrink-0 flex items-center border-r-2 border-gray-50">
      <button 
        v-if="hasPreviousTab"
        @click="navigateToPreviousTab" 
        class="h-full px-5 hover:bg-gray-50 text-gray-400 hover:text-black transition-all flex items-center justify-center group"
      >
        <ChevronLeft class="w-5 h-5 group-active:scale-95 transition-transform" />
      </button>
    </div>
    
    <!-- Active Tab Display -->
    <div 
      class="flex-grow flex items-center justify-between overflow-hidden min-w-0"
    >
      <div class="flex items-center px-6 overflow-hidden min-w-0 w-full justify-between">
        <div class="flex items-center overflow-hidden min-w-0 gap-3">
          <Transition name="fade">
            <span v-if="state.isLoading" class="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
              Syncing<LoadingDots />
            </span>
          </Transition>

          <!-- Tab Name & Total -->
          <div v-if="!state.isLoading" class="flex items-center gap-4 overflow-hidden">
            <!-- Settings Button -->
            <button 
              @click="showRuleManagerModal = true" 
              class="p-2 hover:bg-black hover:text-white rounded-xl transition-all text-black flex-shrink-0"
              title="Manage tab rules"
            >
              <LayoutDashboard class="w-4 h-4" />
            </button>

            <span class="text-lg font-black text-gray-900 truncate tracking-tight">
              {{ state.selected.tab?.tabName || 'No tab selected' }}
            </span>
            <span 
              v-if="state.selected.tab" 
              class="px-3 py-1 rounded-lg text-sm font-black transition-all bg-gray-50" 
              :class="fontColor(state.selected.tab.total)"
            >
              {{ tabTotal }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Right Navigation -->
    <div class="flex-shrink-0 flex items-center border-x-2 border-gray-50">
      <button 
        v-if="hasNextTab"
        @click="navigateToNextTab" 
        class="h-full px-5 hover:bg-gray-50 text-gray-400 hover:text-black transition-all flex items-center justify-center group"
      >
        <ChevronRight class="w-5 h-5 group-active:scale-95 transition-transform" />
      </button>
    </div>

    <!-- All Tabs Button -->
    <div class="flex-shrink-0">
      <button 
        @click="showAllTabsModal = true"
        class="h-full px-6 bg-gray-50 hover:bg-black text-gray-400 hover:text-white transition-all flex items-center justify-center group"
        title="View all tabs"
      >
        <Layers class="w-5 h-5 group-active:scale-90 transition-transform" />
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
import { ChevronLeft, ChevronRight, LayoutDashboard, Layers } from 'lucide-vue-next';
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
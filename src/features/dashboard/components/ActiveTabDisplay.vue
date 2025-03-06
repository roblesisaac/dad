<template>
  <div class="flex w-full bg-gray-100 border-b-2 border-black shadow-sm">
    <!-- Tab Navigation -->
    <div class="flex items-center border-r border-gray-300">
      <button 
        @click="navigateToPreviousTab" 
        class="px-3 py-2.5 text-gray-700 hover:text-blue-600 transition-colors"
        :disabled="!hasPreviousTab"
        :class="{'opacity-50 cursor-not-allowed': !hasPreviousTab}"
      >
        <ChevronLeft size="18" />
      </button>
    </div>
    
    <!-- Active Tab Display -->
    <div class="flex-grow flex items-center justify-between">
      <div class="flex items-center px-4 py-2.5">
        <div class="flex items-center">
          <span class="font-semibold text-gray-800 truncate leading-tight">
            {{ state.selected.tab?.tabName || 'No tab selected' }}
          </span>
          <span 
            v-if="state.selected.tab" 
            class="font-bold leading-tight ml-2" 
            :class="fontColor(state.selected.tab.total)"
          >
            {{ tabTotal }}
          </span>
        </div>
      </div>
      
      <button 
        @click="router.push({ name: 'edit-tab' })" 
        class="px-4 text-gray-600 hover:text-blue-600 transition-colors"
        v-if="state.selected.tab"
        title="Filter and customize tab"
      >
        <Filter size="16" />
      </button>
    </div>
    
    <!-- Tab Navigation -->
    <div class="flex items-center border-l border-gray-300">
      <button 
        @click="navigateToNextTab" 
        class="px-3 py-2.5 text-gray-700 hover:text-blue-600 transition-colors"
        :disabled="!hasNextTab"
        :class="{'opacity-50 cursor-not-allowed': !hasNextTab}"
      >
        <ChevronRight size="18" />
      </button>
    </div>

    <!-- All tabs button -->
    <div class="w-12 flex-shrink-0">
      <button 
        @click="showAllTabsModal = true" 
        class="h-full w-full bg-black flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
        title="View all tabs"
      >
        <LayoutGrid size="16" />
      </button>
    </div>
  </div>

  <!-- Use the new AllTabsModal component -->
  <AllTabsModal 
    :is-open="showAllTabsModal"
    @close="showAllTabsModal = false"
    @tab-selected="handleTabSelected"
  />
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState';
import { useTabs } from '@/features/tabs/composables/useTabs';
import { ChevronLeft, ChevronRight, Filter, LayoutGrid } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils';
import { computed, ref } from 'vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';

const router = useRouter();
const { state } = useDashboardState();
const { selectTab } = useTabs();
const { fontColor, formatPrice } = useUtils();

// Modal state
const showAllTabsModal = ref(false);

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
    selectTab(previousTab, false);
  }
};

const navigateToNextTab = () => {
  if (!hasNextTab.value) return;
  const nextTab = state.selected.tabsForGroup[currentTabIndex.value + 1];
  if (nextTab) {
    selectTab(nextTab, false);
  }
};

// Handle tab selection from modal
const handleTabSelected = () => {
  showAllTabsModal.value = false;
};
</script> 
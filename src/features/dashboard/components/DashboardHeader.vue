<template>
  <div class="sticky top-4 z-10 border-2 border-gray-100 rounded-2xl bg-white shadow-sm flex flex-col transition-all">
    <!-- Top Information Row -->
    <div class="flex flex-wrap sm:flex-nowrap items-center justify-between border-b-2 border-gray-50">
      
      <!-- Group & Tab Names (Left) -->
      <div class="flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 flex-grow min-w-0">
        <!-- Group -->
        <button @click="showGroupModal = true" class="flex items-baseline gap-1.5 hover:opacity-70 transition-opacity flex-shrink min-w-0 truncate text-left">
          <span class="font-bold text-gray-400 text-xs sm:text-sm truncate">
            {{ state.selected.group?.name || 'Account' }}
          </span>
          <span class="font-black text-gray-900 text-sm sm:text-base">
            <NetBalance :accounts="state.selected?.group?.accounts" :state="state" :digits="0" />
          </span>
        </button>

        <!-- Slash -->
        <span class="text-gray-200 font-black text-lg sm:text-xl flex-shrink-0">/</span>

        <!-- Tab -->
        <button @click="showAllTabsModal = true" class="flex items-baseline gap-1.5 hover:opacity-70 transition-opacity flex-shrink min-w-0 truncate text-left">
          <span class="font-bold text-gray-400 text-xs sm:text-sm truncate">
            {{ state.selected.tab?.tabName || 'Tab' }}
          </span>
          <span class="font-black text-sm sm:text-base" :class="fontColor(state.selected.tab?.total || 0)">
            {{ formatPrice(state.selected.tab?.total || 0, { toFixed: 0 }) }}
          </span>
        </button>
      </div>

      <!-- Date Selection (Right, drops below on small screens) -->
      <div class="w-full sm:w-auto border-t-2 sm:border-t-0 sm:border-l-2 border-gray-50 flex-shrink-0">
        <SelectDate class="h-12 sm:h-auto" />
      </div>
    </div>

    <!-- Actions Row (Chevrons & Settings) -->
    <div class="flex items-stretch h-12 bg-gray-50/30">
      <!-- Prev Tab -->
      <button 
        v-if="hasPreviousTab"
        @click="navigateToPreviousTab" 
        class="px-5 hover:bg-black hover:text-white text-gray-400 transition-all flex items-center justify-center border-r-2 border-gray-50 group"
      >
        <ChevronLeft class="w-5 h-5 group-active:scale-90 transition-transform" />
      </button>

      <div class="flex-grow flex items-center justify-center px-4">
         <Transition name="fade">
            <span v-if="state.isLoading" class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              Syncing<LoadingDots />
            </span>
          </Transition>
      </div>

      <!-- Rules Manager -->
      <button 
        @click="showRuleManagerModal = true" 
        class="px-5 hover:bg-black hover:text-white text-gray-400 transition-all flex items-center justify-center border-l-2 border-gray-50 group"
        title="Manage tab rules"
      >
        <LayoutDashboard class="w-4 h-4 group-active:scale-90 transition-transform" />
      </button>

      <!-- Next Tab -->
      <button 
        v-if="hasNextTab"
        @click="navigateToNextTab" 
        class="px-5 hover:bg-black hover:text-white text-gray-400 transition-all flex items-center justify-center border-l-2 border-gray-50 group"
      >
        <ChevronRight class="w-5 h-5 group-active:scale-90 transition-transform" />
      </button>

      <!-- All Tabs -->
      <button 
        @click="showAllTabsModal = true"
        class="px-5 bg-gray-50 hover:bg-black text-gray-500 hover:text-white transition-all flex items-center justify-center group"
        title="View all tabs"
      >
        <Layers class="w-4 h-4 group-active:scale-90 transition-transform" />
      </button>
    </div>

    <!-- Modals -->
    <SelectGroupModal :is-open="showGroupModal" @close="showGroupModal = false" />
    <AllTabsModal :is-open="showAllTabsModal" @close="showAllTabsModal = false" />
    <RuleManagerModal :is-open="showRuleManagerModal" @close="showRuleManagerModal = false" />
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '@/features/tabs/composables/useTabs';
import { useUtils } from '@/shared/composables/useUtils';
import { ChevronLeft, ChevronRight, LayoutDashboard, Layers } from 'lucide-vue-next';

import NetBalance from '@/features/select-group/components/NetBalance.vue';
import SelectGroupModal from '@/features/select-group/components/SelectGroupModal.vue';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
const { selectTab } = useTabs();
const { fontColor, formatPrice } = useUtils();

const showGroupModal = ref(false);
const showAllTabsModal = ref(false);
const showRuleManagerModal = ref(false);

const currentTabIndex = computed(() => {
  if (!state.selected.tab || state.selected.tabsForGroup.length === 0) return -1;
  return state.selected.tabsForGroup.findIndex(tab => tab._id === state.selected.tab._id);
});

const hasPreviousTab = computed(() => currentTabIndex.value > 0);
const hasNextTab = computed(() => currentTabIndex.value !== -1 && currentTabIndex.value < state.selected.tabsForGroup.length - 1);

const navigateToPreviousTab = () => {
  if (!hasPreviousTab.value) return;
  const previousTab = state.selected.tabsForGroup[currentTabIndex.value - 1];
  if (previousTab) selectTab(previousTab);
};

const navigateToNextTab = () => {
  if (!hasNextTab.value) return;
  const nextTab = state.selected.tabsForGroup[currentTabIndex.value + 1];
  if (nextTab) selectTab(nextTab);
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

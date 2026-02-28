<template>
  <div class="sticky top-4 z-10 border-2 border-gray-100 rounded-2xl bg-white shadow-sm flex flex-col transition-all">
    <!-- Row 1: Group & Tab Information -->
    <div class="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-5 border-b-2 border-gray-100">
      <div class="flex items-center gap-2 sm:gap-4 flex-grow min-w-0">
        <!-- Group Selection -->
        <button 
          @click="showGroupModal = true" 
          class="flex items-baseline gap-1.5 hover:opacity-70 transition-opacity flex-shrink min-w-0 truncate text-left group"
        >
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-widest truncate transition-colors">
            {{ state.selected.group?.name || 'Account' }}
          </span>
          <span class="font-black text-gray-900 text-sm sm:text-lg tracking-tight">
            <NetBalance :accounts="state.selected?.group?.accounts" :state="state" :digits="0" />
          </span>
        </button>

        <!-- Minimalist Divider -->
        <span class="text-gray-100 font-black text-xl flex-shrink-0">/</span>

        <!-- Tab Selection -->
        <button 
          @click="showAllTabsModal = true" 
          class="flex items-baseline gap-1.5 hover:opacity-70 transition-opacity flex-shrink min-w-0 truncate text-left group"
        >
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-widest truncate transition-colors">
            {{ state.selected.tab?.tabName || 'Tab' }}
          </span>
          <span class="font-black text-sm sm:text-lg tracking-tight" :class="fontColor(state.selected.tab?.total || 0)">
            {{ formatPrice(state.selected.tab?.total || 0, { toFixed: 0 }) }}
          </span>
        </button>
      </div>

      <!-- Syncing Indicator (Desktop) -->
      <Transition name="fade">
        <div v-if="state.isLoading" class="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Syncing<LoadingDots />
        </div>
      </Transition>
    </div>

    <!-- Row 2: Date Picker & Navigation -->
    <div class="flex items-stretch h-12 sm:h-14">
      <!-- Prev Tab (Left) -->
      <button 
        v-if="hasPreviousTab"
        @click="navigateToPreviousTab" 
        class="px-5 sm:px-6 hover:bg-black hover:text-white text-gray-300 transition-all flex items-center justify-center border-r-2 border-gray-100 group shrink-0"
        title="Previous tab"
      >
        <ChevronLeft class="w-6 h-6 group-active:scale-90 transition-transform" />
      </button>

      <!-- Date Selection (Middle) -->
      <div class="flex-grow min-w-0">
        <SelectDate />
      </div>

      <!-- Next Tab (Right) -->
      <button 
        v-if="hasNextTab"
        @click="navigateToNextTab" 
        class="px-5 sm:px-12 bg-gray-50/50 hover:bg-black hover:text-white text-gray-400 transition-all flex items-center justify-center border-l-2 border-gray-100 group shrink-0 rounded-br-[inherit]"
        title="Next tab"
      >
        <ChevronRight class="w-6 h-6 group-active:translate-x-1 transition-transform" />
      </button>
    </div>

    <!-- Modals -->
    <SelectGroupModal :is-open="showGroupModal" @close="showGroupModal = false" />
    <AllTabsModal :is-open="showAllTabsModal" @close="showAllTabsModal = false" />
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabs } from '@/features/tabs/composables/useTabs';
import { useUtils } from '@/shared/composables/useUtils';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

import NetBalance from '@/features/select-group/components/NetBalance.vue';
import SelectGroupModal from '@/features/select-group/components/SelectGroupModal.vue';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
const { selectTab } = useTabs();
const { fontColor, formatPrice } = useUtils();

const showGroupModal = ref(false);
const showAllTabsModal = ref(false);

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

<template>
  <div class="flex flex-col transition-all pb-12 sm:pb-20 bg-transparent">
    <!-- Row 1: Top Navigation (Group & Date) -->
    <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-8 sm:mb-12 transition-all">
      <!-- Group Selection (Left) -->
      <button 
        @click="showGroupModal = true" 
        class="flex items-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none"
      >
        <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
          {{ state.selected.group?.name || 'Account' }}
        </span>
        <ChevronDown class="w-3 h-3 text-gray-300 group-hover:text-black transition-colors" />
      </button>

      <!-- Syncing Indicator (Subtle Center) -->
      <Transition name="fade">
        <div v-if="state.isLoading" class="absolute left-1/2 -translate-x-1/2">
          <LoadingDots />
        </div>
      </Transition>

      <!-- Date Selection (Right) -->
      <div class="flex-shrink-0">
        <SelectDate />
      </div>
    </div>

    <!-- Row 2: Hero Section (Active Tab Total & Name) -->
    <div class="flex flex-col items-center justify-center text-center">
      <button 
        @click="showAllTabsModal = true" 
        class="flex flex-col items-center group hover:opacity-80 transition-opacity focus:outline-none"
      >
        <!-- Large Tab Amount -->
        <span class="font-black text-black text-6xl sm:text-8xl tracking-tighter mb-4 transition-all group-active:scale-[0.98]">
          {{ formatPrice(state.selected.tab?.total || 0, { toFixed: 0 }) }}
        </span>
        
        <!-- Tab Label -->
        <div class="flex items-center gap-2">
          <span class="text-md uppercase tracking-[0.4em]">
            {{ state.selected.tab?.tabName || 'Tab' }}
          </span>
          <ChevronDown class="w-3 h-3 text-gray-200 group-hover:text-gray-400 transition-colors" />
        </div>
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
import { ChevronDown } from 'lucide-vue-next';

import SelectGroupModal from '@/features/select-group/components/SelectGroupModal.vue';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
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

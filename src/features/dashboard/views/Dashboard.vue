<template>
  <BlueBar />

  <!-- BackButton -->
  <Transition>
    <button v-if="!isHome" @click="router.back()" class="w-full flex items-center justify-start px-4 py-2 bg-blue-100 border-b border-gray-400 font-medium text-black hover:bg-blue-200 transition-colors">
      <ChevronLeft class="w-4 h-4 mr-2" /> Back
    </button>
  </Transition>

  <!-- Main Dashboard Content -->
  <template v-if="isHome">
    <!-- Dashboard Container -->
    <div class="w-full bg-white">

      <!-- Selected Group + Date -->
      <div>
        <div class="grid grid-cols-2 border-b-2 border-black">
          <ShowSelectGroupButton class="col-span-1 border-r-2 border-black" />
          <div class="col-span-1">          
            <DatePickers />
          </div>
        </div>
      </div>

      <!-- Active Tab Display (replacing Scrolling Tabs Totals Row) -->
      <div class="sticky-tabs-row bg-white sticky top-0 z-10">
        <ActiveTabDisplay />
      </div>

      <!-- Category Rows -->
      <Transition>
        <div v-if="!state.isLoading && state.selected.tab" class="w-full">
          <CategoriesWrapper />
        </div>
      </Transition>
      <Transition>
        <div v-if="state.isLoading" class="w-full flex justify-center py-6">
          <LoadingDots></LoadingDots>
        </div>
      </Transition>
    </div>
  </template>

  <!-- Router View for Sub-Routes -->
  <router-view v-else></router-view>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ChevronLeft } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import { useInit } from '../composables/useInit.js';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import DatePickers from '../components/DatePickers.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
import ActiveTabDisplay from '../components/ActiveTabDisplay.vue';

const router = useRouter();
const route = useRoute();
const { stickify } = useAppStore();
const { state } = useDashboardState();
const { init, handleGroupChange } = useInit();

const { processAllTabsForSelectedGroup } = useTabs();
const { syncLatestTransactionsForBanks } = usePlaidSync();

const isHome = computed(() => route.name === 'dashboard');

onMounted(async () => {
  // Register with a short timeout to ensure DOM is ready
  setTimeout(() => {
    try {
      stickify.register('.sticky-tabs-row');
    } catch (e) {
      console.error('Stickify error:', e);
    }
  }, 100);
  
  await init();
  
  // Start syncing transactions for all connected banks
  syncLatestTransactionsForBanks();
});

// Watch route changes
watch(
  () => route.name,
  (newRoute, oldRoute) => {
    if(newRoute === 'dashboard') {
      if(oldRoute === 'select-group') {
        return handleGroupChange();
      }
      setTimeout(processAllTabsForSelectedGroup, 500);
    }
  }
);

watch(() => state.date.start, (newStart, prevStart) => {
  if(prevStart === 'firstOfMonth') return;
  // Only react to date changes when applied via the Apply button
  handleGroupChange();
});

watch(() => state.date.end, (newEnd, prevEnd) => {
  if(prevEnd === 'today') return;
  // Only react to date changes when applied via the Apply button
  handleGroupChange();
});
</script>

<style>
/* Tailwind classes handle all styling */
</style>
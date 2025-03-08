<template>
<BlueBar />
<!-- Dashboard Container -->
<div class="w-full bg-white">

<!-- Selected Group + Date -->
<div>
  <div class="grid grid-cols-2 border-b-2 border-black">
    <ShowSelectGroupButton class="col-span-1 border-r-2 border-black" />
    <div class="col-span-1">          
      <SelectDate />
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

<script setup>
import { onMounted } from 'vue';
import { useAppStore } from '@/stores/state';
import { useDashboardState } from '../composables/useDashboardState.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import { useInit } from '../composables/useInit.js';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import SelectDate from '../../select-date/views/SelectDate.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
import ActiveTabDisplay from '../components/ActiveTabDisplay.vue';

const { stickify } = useAppStore();
const { state } = useDashboardState();
const { init } = useInit();
const { syncLatestTransactionsForBanks } = usePlaidSync();

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
</script>
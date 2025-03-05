<template>
  <!-- BlueBar -->
  <Transition>
    <div v-if="state.blueBar.message" class="w-full bg-indigo-800 border-b-2 border-indigo-900 px-4 py-2">
      <div class="font-bold">
        <small class="text-indigo-100">{{ state.blueBar.message }}<LoadingDots v-if="state.blueBar.loading" /></small>
      </div>
    </div>
  </Transition>

  <!-- BackButton -->
  <Transition>
    <button v-if="!isHome" @click="router.back()" class="w-full flex items-center justify-start px-4 py-3 bg-blue-200 border-b-2 border-black font-medium text-black hover:bg-blue-300 transition-colors">
      <ChevronLeft class="w-5 h-5 mr-2" /> Back
    </button>
  </Transition>

  <!-- Main Dashboard Content -->
  <template v-if="isHome">
    <!-- Small Screens -->
    <div class="w-full">
      <!-- Selected Group + Date -->
      <div class="border-b-2 border-black">
        <div class="grid grid-cols-12">
          <ShowSelectGroupButton class="col-span-4 sm:col-span-3 border-r-2 border-black py-2 px-3" />
          <div class="col-span-8 sm:col-span-9 h-[50px] flex items-center px-3">          
            <DatePickers />
          </div>
        </div>
      </div>

      <!-- Scrolling Tabs Totals Row -->
      <div v-if="!state.isLoading" class="h-[50px] bg-white sticky top-0 z-10 border-b-2 border-black shadow-md">
        <ScrollingTabButtons />
      </div>

      <!-- Category Rows -->
      <Transition>
        <div v-if="!state.isLoading && state.selected.tab" class="w-full">
          <CategoriesWrapper />
        </div>
      </Transition>
      <Transition>
        <div v-if="state.isLoading" class="w-full flex justify-center py-8">
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
import LoadingDots from '@/shared/components/LoadingDots.vue';
import DatePickers from '../components/DatePickers.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
import ScrollingTabButtons from '../components/ScrollingTabButtons.vue';

const router = useRouter();
const route = useRoute();
const { stickify } = useAppStore();
const { state } = useDashboardState();
const { init, handleGroupChange } = useInit();

const { processAllTabsForSelectedGroup, handleTabChange } = useTabs();
const { syncLatestTransactionsForBanks } = usePlaidSync();

const isHome = computed(() => route.name === 'dashboard');

onMounted(async () => {
  // stickify.register('.sticky-tabs-row');
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

watch(() => state.date.start, (_, prevStart) => {
  if(prevStart === 'firstOfMonth') return;
  handleGroupChange();
});

watch(() => state.date.end, (_, prevEnd) => {
  if(prevEnd === 'today') return;
  handleGroupChange();
});

watch(() => state.selected.tab?._id, handleTabChange);
</script>

<style>
/* Tailwind classes handle all styling */
</style>
<template>
  <div class="min-h-screen bg-white">
    <!-- Feedback Bar -->
    <BlueBar />

    <!-- Dashboard Container -->
    <div class="max-w-5xl mx-auto w-full px-4 md:px-6">
      <!-- Dashboard Navigation Row (Group + Date) -->
      <div class="mt-6 border-2 border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col sm:flex-row">
        <ShowSelectGroupButton class="flex-1 border-b-2 sm:border-b-0 sm:border-r-2 border-gray-100" />
        <div class="flex-1">          
          <SelectDate />
        </div>
      </div>

      <!-- Active Tab Display -->
      <div class="mt-6 sticky top-4 z-10">
        <div class="border-2 border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <ActiveTabDisplay />
        </div>
      </div>

      <!-- Category Content -->
      <div class="mt-8 pb-32">
        <Transition name="fade">
          <div v-if="!state.isLoading && state.selected.tab" class="w-full">
            <CategoriesWrapper />
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="state.isLoading" class="w-full flex justify-center py-20">
            <LoadingDots />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

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

<script setup>
import { onMounted } from 'vue';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import SelectDate from '../../select-date/views/SelectDate.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
import ActiveTabDisplay from '../components/ActiveTabDisplay.vue';

const { state } = useDashboardState();
const { init } = useInit();

onMounted(async () => {
  
  await init();
});
</script>
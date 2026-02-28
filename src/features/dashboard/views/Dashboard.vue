<template>
  <div class="min-h-screen bg-white">
    <!-- Feedback Bar -->
    <BlueBar />

    <!-- Dashboard Container -->
    <div class="max-w-5xl mx-auto w-full px-4 md:px-6">


      <!-- Unified Header -->
      <div class="mt-6">
        <DashboardHeader />
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
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import DashboardHeader from '../components/DashboardHeader.vue';

const { state } = useDashboardState();
const { init } = useInit();

onMounted(async () => {
  
  await init();
});
</script>
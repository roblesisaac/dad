<template>
  <div class="min-h-screen bg-white">
    <!-- Feedback Bar -->
    <BlueBar />

    <!-- Dashboard Container -->
    <div class="max-w-5xl mx-auto w-full relative">

      <!-- Unified Header -->
      <div>
        <DashboardHeader />
      </div>

      <!-- Category Content -->
      <div class="mt-4 pb-32">
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

      <!-- Fixed Footer: Filters & Reports -->
      <footer class="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t-2 border-gray-50/50">
        <div class="max-w-5xl mx-auto w-full px-6 py-6 sm:py-8 flex items-center justify-between">
          <!-- Left: Filters -->
          <button 
            @click="showRuleManagerModal = true"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Edit Tab
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition-colors" />
          </button>

          <!-- Right: Reports -->
          <button 
            @click="router.push('/reports')"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Reports
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition-colors" />
          </button>
        </div>
      </footer>

      <!-- Modals -->
      <RuleManagerModal 
        :is-open="showRuleManagerModal" 
        @close="showRuleManagerModal = false" 
      />
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
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';

const router = useRouter();
const { state } = useDashboardState();
const { init } = useInit();
const showRuleManagerModal = ref(false);

onMounted(async () => {
  await init();
});
</script>
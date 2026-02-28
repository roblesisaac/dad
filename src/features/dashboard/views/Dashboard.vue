<template>
  <div class="min-h-screen bg-white">
    <!-- Feedback Bar -->
    <BlueBar />

    <!-- Dashboard Container -->
    <div class="max-w-5xl mx-auto w-full px-4 md:px-6 relative">

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

      <!-- Floating Action Button: Tab Rules (Bottom Left) -->
      <div class="fixed bottom-8 left-8 z-50">
        <button 
          @click="showRuleManagerModal = true"
          class="w-14 h-14 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all duration-300 group"
          title="Tab rules"
        >
          <Filter class="w-6 h-6 group-active:scale-95 transition-transform" />
        </button>
      </div>

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
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';
import { Filter } from 'lucide-vue-next';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';

const { state } = useDashboardState();
const { init } = useInit();
const showRuleManagerModal = ref(false);

onMounted(async () => {
  await init();
});
</script>
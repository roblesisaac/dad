<template>
  <Transition name="toast">
    <div
      v-if="state.blueBar.message"
      class="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4"
    >
      <div
        class="themed-bar pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 shadow-lg ring-1 ring-black/10 backdrop-blur-sm"
      >
        <div class="text-[10px] font-black proper tracking-[0.3em] flex items-center gap-2">
          {{ state.blueBar.message }}
          <LoadingDots v-if="state.blueBar.loading" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.themed-bar {
  background-color: var(--theme-text);
  color: var(--theme-bg);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>

<script setup>
import { useDashboardState } from '../composables/useDashboardState';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
</script>


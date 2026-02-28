<template>
<Transition name="slide-down">
<div v-if="state.blueBar.message" class="w-full text-black px-4 py-2 flex justify-center items-center gap-2 sticky top-0 z-[100]">
    <div class="text-[10px] font-black proper tracking-[0.3em] flex items-center gap-2">
      {{ state.blueBar.message }}
      <LoadingDots v-if="state.blueBar.loading" />
    </div>
</div>
</Transition>

</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>

<script setup>
import { useDashboardState } from '../composables/useDashboardState';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
</script>

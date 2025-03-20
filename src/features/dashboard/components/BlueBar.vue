<template>
<Transition>
<div v-if="state.blueBar.message" class="w-full bg-indigo-700 border-b border-indigo-900 px-4 py-1.5">
    <div class="font-medium">
    <small class="text-indigo-100">{{ state.blueBar.message }}<LoadingDots v-if="state.blueBar.loading" /></small>
    </div>
</div>
</Transition>
</template>

<script setup>
import { useDashboardState } from '../composables/useDashboardState';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { state } = useDashboardState();
</script>

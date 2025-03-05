<template>
<div class="flex items-center w-full max-w-full bg-white border-none px-2">
  <div class="flex-1 min-w-0 overflow-hidden">
    <DatePicker :date="state.date" when="start" />
  </div>
  <div class="flex-none px-1 text-gray-400">-</div>
  <div class="flex-1 min-w-0 overflow-hidden">
    <DatePicker :date="state.date" when="end" />
  </div>
</div>
</template>

<script setup>
  import DatePicker from './DatePicker.vue';
  import { useDashboardState } from '../composables/useDashboardState';

  const { state } = useDashboardState();
</script>
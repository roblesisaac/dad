<template>
<div class="grid datePickers line50">
  <div class="cell-11-24">
    <DatePicker :date="props.state.date" when="start" />
  </div>
  <div class="cell-1-24 bold">-</div>
  <div class="cell-12-24">
    <DatePicker :date="props.state.date" when="end" />
  </div>
</div>
</template>

<script setup>
  import DatePicker from './DatePicker.vue';

  const props = defineProps({
    state: Object
  });
</script>
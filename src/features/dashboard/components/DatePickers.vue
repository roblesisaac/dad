<template>
  <div class="grid grid-cols-24 items-center bg-gray-50">
    <div class="col-span-11">
      <DatePicker :date="props.state.date" when="start" />
    </div>
    <div class="col-span-1 text-center font-bold">-</div>
    <div class="col-span-12">
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
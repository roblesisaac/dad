<template>
  <div>
    <select 
      :style="{ width }" 
      v-model="selectedValue" 
      class="px-2 py-1 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors bg-transparent text-blue-600 font-medium appearance-none cursor-pointer"
    >
      <option class="text-gray-700">{{ title }}</option>
      <option 
        v-for="option in options" 
        :key="option" 
        :value="option"
        class="text-gray-700"
      >
        {{ option }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: Array,
  prop: Number,
  options: Array,
  title: String
});

const selectedValue = computed({
  get: () => props.data[props.prop] || props.title,
  set: (value) => { props.data[props.prop] = value; }
});

const width = computed(() => `${selectedValue.value.length + 2}ch`);
</script>

<style scoped>
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.2rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2rem;
}
</style>
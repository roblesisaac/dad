<template>
  <div>
    <select 
      :style="{ width }" 
      v-model="selectedValue" 
      class="appearance-none bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800 px-0 py-0 cursor-pointer">
      <option>{{ title }}</option>
      <option v-for="option in options" :key="option" :value="option">
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

const width = computed(() => `${selectedValue.value.length || 0}ch` );

</script>
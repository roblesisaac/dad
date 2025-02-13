<template>
  <input 
    :style="{width: `${inputWidth}ch`}" 
    v-model="state[propToUpdate]" 
    ref="inputRef" 
    type="text" 
    :placeholder="placeholder"
    class="px-2 py-1 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors bg-transparent text-gray-700"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const { state, placeholder, propToUpdate } = defineProps({
  state: Object,
  placeholder: String,
  propToUpdate: Number
});

const inputRef = ref(null);
const inputWidth = ref(100);

function adaptWidthToValue() {
  const $input = inputRef.value;
  const inputValue = $input.value || placeholder;
  inputWidth.value = inputValue.length;
}
    
onMounted(adaptWidthToValue);
watch(() => state[propToUpdate], adaptWidthToValue);
</script>
<template>
  <input 
    :style="{width: `${inputWidth}ch`}" 
    v-model="state[propToUpdate]" 
    ref="inputRef" 
    type="text" 
    :placeholder="placeholder"
    class="bg-transparent font-bold text-blue-700 border-b-2 border-blue-600 focus:outline-none focus:border-blue-800 px-0 py-0" 
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  state: Object,
  placeholder: String,
  propToUpdate: Number
});

const { state, placeholder, propToUpdate } = props;

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
<template>
  <input :style="{width: `${inputWidth}ch`}" v-model="state[propToUpdate]" ref="inputRef" type="text" :placeholder="placeholder" />
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

  inputWidth.value = inputValue.length+1;
}
    
onMounted(adaptWidthToValue);
watch(() => state[propToUpdate], adaptWidthToValue);

</script>
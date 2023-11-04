<template>
  <input :style="{width: `${inputWidth}px`}" v-model="state[propToUpdate]" ref="inputRef" type="text" :placeholder="placeholder" />
</template>

<script setup>
import { defineProps, ref, onMounted, watch } from 'vue';

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
  const typedLength = inputValue.length*17;
  const scrollWidth = $input.scrollWidth+3;
  const newWidth = Math.min(typedLength, scrollWidth);

  inputWidth.value = newWidth;
}
    
onMounted(adaptWidthToValue);
watch(() => state[propToUpdate], adaptWidthToValue);

</script>
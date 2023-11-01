<template>
  <input :style="{width: `${inputWidth}px`}" v-model="state[propToUpdate]" ref="inputRef" type="text" />
</template>

<script setup>
import { defineProps, ref, onMounted, watch } from 'vue';

const { state, propToUpdate } = defineProps({
  state: Object,
  propToUpdate: Number
});

const inputRef = ref(null);
const inputWidth = ref(100);

function adaptWidthToValue() {
  const $input = inputRef.value;
  const typedLength = $input.value?.length*15;
  const scrollWidth = $input.scrollWidth+2;
  const newWidth = Math.min(typedLength, scrollWidth);

  inputWidth.value = Math.max(50, newWidth);
}
    
onMounted(adaptWidthToValue);
watch(() => state[propToUpdate], adaptWidthToValue);

</script>
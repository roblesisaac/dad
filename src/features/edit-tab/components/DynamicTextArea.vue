<template>
<textarea 
  v-model="data[prop]" 
  @input="adjustTextarea" 
  ref="inputRef"
  class="w-full resize-none overflow-y-hidden font-mono text-sm font-bold p-2.5 bg-gray-900 text-gray-300 border border-gray-700 rounded shadow-[2px_2px_0px_#6366f1] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_5px_rgba(30,144,255,0.5)]"
></textarea> 
</template>

<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
  data: Object,
  prop: String
});

const inputRef = ref(null);

const adjustTextarea = () => {
  const textarea = inputRef.value;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

onMounted(adjustTextarea);
</script>

<style scoped>
textarea {
  box-sizing: border-box;
  width: 100%;
  resize: none;
  overflow-y: hidden;
}
</style>

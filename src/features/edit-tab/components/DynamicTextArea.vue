<template>
  <textarea 
    v-model="data[prop]" 
    @input="adjustTextarea" 
    ref="inputRef"
    class="w-full resize-none overflow-hidden px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
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

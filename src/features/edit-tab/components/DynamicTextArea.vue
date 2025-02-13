<template>
<textarea v-model="data[prop]" @input="adjustTextarea" ref="inputRef"></textarea> 
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

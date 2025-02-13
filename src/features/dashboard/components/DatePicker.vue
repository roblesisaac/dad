<template>
  <div class="flex items-center space-x-2">
    <label :for="id" class="text-sm font-medium text-gray-500">{{ label }}:</label>
    <input 
      :id="id"
      type="date"
      :value="formattedDate"
      @input="handleInput"
      class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: String,
  modelValue: String
});

const emit = defineEmits(['update:modelValue']);

// Generate unique ID for label association
const id = computed(() => `date-${props.label.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`);

// Format date for input value (YYYY-MM-DD)
const formattedDate = computed(() => {
  if (!props.modelValue) return '';
  const date = new Date(props.modelValue);
  return date.toISOString().split('T')[0];
});

function handleInput(event) {
  emit('update:modelValue', event.target.value);
}
</script>

<style scoped>
/* Override default date input styles for better cross-browser consistency */
input[type="date"] {
  @apply appearance-none;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  @apply opacity-60 hover:opacity-100 cursor-pointer;
}
</style>
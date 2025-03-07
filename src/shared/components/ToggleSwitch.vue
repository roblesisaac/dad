<template>
  <div class="flex items-center">
    <label v-if="label" :for="id" class="mr-3 text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <button 
      type="button"
      :id="id"
      :class="[
        modelValue ? 'bg-blue-600' : 'bg-gray-200',
        'relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      ]"
      :aria-checked="modelValue"
      @click="toggle"
    >
      <span class="sr-only">{{ label || 'Toggle' }}</span>
      <span 
        :class="[
          modelValue ? 'translate-x-6' : 'translate-x-1',
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out'
        ]"
      ></span>
    </button>
    <span v-if="description" class="ml-2 text-xs text-gray-500 italic">
      {{ description }}
    </span>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: () => `toggle-${Math.random().toString(36).substring(2, 9)}`
  }
});

const emit = defineEmits(['update:modelValue']);

function toggle() {
  emit('update:modelValue', !props.modelValue);
}
</script> 
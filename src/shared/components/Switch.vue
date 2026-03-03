<template>
  <label class="inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      class="sr-only peer"
      :id="uniqueId"
      @change="toggleSwitch"
      :checked="props.modelValue"
    />
    <div class="
      relative w-11 h-6 rounded-full peer 
      transition-colors duration-200
      switch-track
      peer-focus:ring-2 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800
      after:content-[''] after:absolute after:top-[4px] after:start-[4px] 
      after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
      peer-checked:after:translate-x-[20px] rtl:peer-checked:after:-translate-x-[20px]
    "></div>
    <span v-if="label" class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{{ label }}</span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  id: {
    type: String,
    default: () => `switch-${Math.random().toString(36).substring(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const uniqueId = computed(() => props.id)

const toggleSwitch = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
/* Track colors - using scoped CSS to avoid global theme overrides on bg-* classes */
.switch-track {
  background-color: #e5e7eb; /* Light mode off: gray-200 */
  border: 1px solid transparent;
}

.peer:checked ~ .switch-track {
  background-color: #111827; /* Light mode on: black (user requested not blue) */
  border-color: #111827;
}

/* Dark Mode logic (bypassing theme-overrides.css) */
[data-theme='dark'] .switch-track {
  background-color: #333333; /* Dark mode off: dark gray (visible on black bg) */
  border: 1px solid #ffffff; /* White border for definition */
}

[data-theme='dark'] .peer:checked ~ .switch-track {
  background-color: #666666; /* Dark mode on: Lighter gray (so white thumb pops) */
  border-color: #ffffff;
}

/* Thumb (after pseudo-element) logic - always white */
.switch-track::after {
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
</style>
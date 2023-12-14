<template>
  <div class="switch">
    <input type="checkbox" id="toggle" class="toggle" @change="toggleSwitch" :checked="props.modelValue">
    <label for="toggle" class="label"></label>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const toggleSwitch = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.switch {
  display: inline-block;
  position: relative;
}

.toggle {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.label {
  display: block;
  width: 50px;
  height: 26px;
  background-color: #ccc;
  border-radius: 25px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.label::before {
  content: "";
  position: absolute;
  width: 22px;
  height: 22px;
  background-color: white;
  border-radius: 50%;
  left: 2px;
  top: 2px;
  transition: transform 0.2s;
}

.toggle:checked + .label {
  background-color: #659ef6;
}

.toggle:checked + .label::before {
  transform: translateX(24px);
}
</style>
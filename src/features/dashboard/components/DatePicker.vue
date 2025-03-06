<template>
<input 
  type="date" 
  :value="formatDateForInput(date[when])" 
  @input="handleDateChange($event)"
  class="bg-white border border-gray-400 px-3 py-2 text-gray-700 font-bold w-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
/>
</template>

<script setup>
import { reactive } from 'vue';

const emit = defineEmits(['date-selected']);

const { date, when } = defineProps({
  date: {
    type: Object,
    required: true
  },
  when: {
    type: String,
    required: true
  }
});

const state = reactive({
  presets: {
    firstOfMonth() {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      return new Date(year, month, 1);
    },
    today() {
      return new Date();
    }
  }
});

function dateIsAPreset() {
  return state.presets.hasOwnProperty(date[when]);
}

function launchPreset() {
  const { presets } = state;
  date[when] = presets[date[when]]();
}

function formatDateForInput(dateValue) {
  if (!dateValue) return '';
  
  const d = new Date(dateValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function handleDateChange(event) {
  const newDate = new Date(event.target.value);
  date[when] = newDate;
  emit('date-selected', { when, date: newDate });
}

function init() {
  if(dateIsAPreset()) {
    launchPreset();
  }
}

init();
</script>
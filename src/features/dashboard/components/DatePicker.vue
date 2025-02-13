<template>
  <VueDatePicker 
    v-model="date[when]" 
    :format="state.format" 
    hide-input-icon 
    :clearable="false" 
    autocomplete="on" 
    :enable-time-picker="false" 
    :auto-apply="true"
    class="date-picker"
  />
</template>

<script setup>
import { reactive } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';

const { date, when } = defineProps({
  date: Object,
  when: String
});

const state = reactive({
  format: (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  },
  presets: {
    firstOfMonth() {
      const currentDate = new Date();
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    },
    today() {
      return new Date();
    }
  }
});

const app = {
  init() {
    if (state.presets.hasOwnProperty(date[when])) {
      date[when] = state.presets[date[when]]();
    }
  }
};

app.init();
</script>

<style>
.date-picker .dp__input {
  @apply bg-transparent border-0 font-bold font-mono p-0 text-center;
}

.date-picker .dp__btn {
  @apply shadow-none;
}

.date-picker .dp__calendar_header_separator {
  @apply bg-transparent;
}

.date-picker .dp__action_buttons {
  @apply hidden;
}

.date-picker .dp__menu {
  @apply shadow-lg border border-gray-200;
}

.date-picker .dp__today {
  @apply text-blue-600 font-bold;
}

.date-picker .dp__active_date {
  @apply bg-blue-600;
}
</style>
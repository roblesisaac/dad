<template>
<VueDatePicker class="section-content bold" v-model="date[when]" :format="state.format" hide-input-icon :clearable="false" autocomplete="on" :enable-time-picker="false" :auto-apply="true" />
</template>

<script setup>
import { reactive } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';

const { date, when } = defineProps({
  date: 'object',
  when: 'string'
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
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      return new Date(year, month, 1);
    },
    today() {
      return new Date();
    }
  }
});

const app = function() {
  function dateIsAPreset() {
    return state.presets.hasOwnProperty(date[when]);
  }

  function launchPreset() {
    const { presets } = state;

    date[when] = presets[date[when]]();
  }

  return {
    init: () => {
      if(dateIsAPreset()) {
        launchPreset();
      }
    }
  }
}();

app.init();

</script>

<style>
.dp__input {
  background: transparent !important;
  border: 0 !important;
  font-weight: bold !important;
  font-family: 'Sometype Mono Variable', monospace !important;
  padding: 0 !important;
  text-align: center !important;
}

.dp__btn {
  box-shadow: none !important;
}

.dp__calendar_header_separator {
  background: transparent !important;
}
</style>
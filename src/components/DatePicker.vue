<template>
<VueDatePicker class="section-content" v-model="date[when]" :format="state.format" hide-input-icon :clearable="false" autocomplete="on" />
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
.dp__input_reg {
  background: transparent;
  border: 0;
  color: blue;
  font-weight: bold;
  font-family: "Fira Code", monospace;
  padding: 0;
  text-align: center;
}

.dp__btn {
  box-shadow: none;
}

.dp__calendar_header_separator {
  background: transparent;
}
</style>
<template>
<a class="section-content" href="#">{{ state.readable(date[when]) }}</a>
</template>

<script setup>
import { reactive } from 'vue';
import { generateDate } from '../utils'

const { date, when } = defineProps({
  date: 'object',
  when: 'string'
});

const state = reactive({
  presets: {
    firstOfMonth() {
      const now = new Date();
      return generateDate(`${now.getFullYear()}-${now.getMonth()+1}-01`);
    },
    today() {
      return generateDate();
    }
  }, 
  readable(input) {
    if(!input) {
      return;
    }

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const [year, month, day] = input.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    const formattedMonth = months[monthIndex];

    return `${formattedMonth} ${parseInt(day, 10)}, ${year}`;
  }
});

const app = function() {
  function dateIsAPreset() {
    return state.presets.hasOwnProperty(date[when]);
  }

  function launcPreset() {
    const { presets } = state;

    date[when] = presets[date[when]]();
  }

  return {
    init: () => {
      if(dateIsAPreset()) {
        launcPreset();
      }
    }
  }
}();

app.init();

</script>
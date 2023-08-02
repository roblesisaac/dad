<template>
<a class="section-content" href="#">{{ state.readable(date[when]) }}</a>
</template>

<script setup>
import { reactive } from 'vue';

const { date, when } = defineProps({
  date: 'object',
  when: 'string'
});

const state = reactive({
  presets: {
    firstOfMonth() {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return first.getTime();
    },
    today() {
      return Date.now()
    }
  }, 
  readable(timestamp) {
    if(isNaN(timestamp)) {
      return;
    }

    const date = new Date(timestamp);
  
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr',
      'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  }
});

const app = function() {
  function dateIsAPreset() {
    return state.presets.hasOwnProperty(date[when]);
  }

  function execPreset() {
    const { presets } = state;

    date[when] = presets[date[when]]();
  }

  return {
    init: () => {
      if(dateIsAPreset()) {
        execPreset();
      }
    }
  }
}();

app.init();

</script>
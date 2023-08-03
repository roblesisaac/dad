<template>
  <a @click="app.selectAcct" href="#" class="section-content">{{ accountName }}</a>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/app';
const { api } = useAppStore();

const { state } = defineProps({
  state: 'object'
});

const accountName = computed(() => {
  return state.account || 'Select Acct. »';
});

const app = function() {
  function launchPlaid() {
    
  }

  return {
    init: () => {
      console.log('app initiated...');
    },
    selectAcct: () => {
      launchPlaid();
    }
  }
}();

app.init();
</script>
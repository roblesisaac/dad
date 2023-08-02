<template>
  <div class="relative">
    <small class="section-title">account #</small>
    <br />
    <div class="section-content">{{ accountName }}</div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app';

const { api } = useAppStore();

const { state } = defineProps({
  state: 'object'
});

const app = function() {
  return {
    init: function() {
      console.log('app initiated...');
    },
    showPlaidLoginScreen: function() {

    }
  }
}();

app.init();
</script>
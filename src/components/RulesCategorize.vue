<template>
<div class="grid">
  {{  selectedTab.rules }}
</div>
</template>

<script setup>
import { reactive, defineProps } from 'vue';

const { selectedTab, state } = defineProps({
  selectedTab: Object,
  state: Object
});

console.log(state);

const app = function() {

  return {

  }
}();

</script>
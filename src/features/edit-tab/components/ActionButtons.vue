<template>
<div class="x-grid middle">
  <div class="cell-1 p20">
    <button @click="duplicateTab" class="button bgBlack expanded">Duplicate Tab</button>
  </div>
  <div class="cell-1 p20b">
    <button @click="deleteTab" class="button transparent colorDarkRed expanded">Delete Tab</button>
  </div>
</div>
</template>

<script setup>
import { useEditTab } from '../composables/useEditTab';

const { duplicateTab, deleteTab } = useEditTab();
</script>

<style scoped>
.bgBlack {
  background: #333;
  color: #fff;
}

.colorDarkRed {
  color: darkred;
}
</style> 
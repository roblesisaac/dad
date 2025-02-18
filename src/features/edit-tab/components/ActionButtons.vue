<template>
<div class="x-grid middle">
  <div class="cell-1 p20">
    <button @click="app.duplicateTab" class="button bgBlack expanded">Duplicate Tab</button>
  </div>
  <div class="cell-1 p20b">
    <button @click="app.deleteTab" class="button transparent colorDarkRed expanded">Delete Tab</button>
  </div>
</div>
</template>

<script setup>
const props = defineProps({
  app: Object
});
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
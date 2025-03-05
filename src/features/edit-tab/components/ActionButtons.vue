<template>
<div class="grid grid-cols-1 gap-4">
  <div class="col-span-1 p-5">
    <button @click="duplicateTab" class="w-full bg-gray-800 text-white font-bold py-2 px-4 border-2 border-black rounded shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] transition-all duration-200">Duplicate Tab</button>
  </div>
  <div class="col-span-1 pb-5">
    <button @click="deleteTab" class="w-full bg-transparent text-red-800 font-bold py-2 px-4 border-2 border-red-800 rounded shadow-[3px_3px_0px_#b91c1c] hover:shadow-[1px_1px_0px_#b91c1c] hover:bg-red-50 transition-all duration-200">Delete Tab</button>
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
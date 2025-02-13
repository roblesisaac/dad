<template>
  <div class="space-y-4 mt-8">
    <!-- Duplicate Button -->
    <button 
      @click="app.duplicateTab" 
      class="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-sm transition-colors font-medium"
    >
      Duplicate Tab
    </button>

    <!-- Delete Button -->
    <button 
      @click="app.deleteTab" 
      class="w-full py-3 px-4 bg-transparent hover:bg-red-50 text-red-600 rounded-lg transition-colors font-medium border-2 border-red-200"
    >
      Delete Tab
    </button>
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
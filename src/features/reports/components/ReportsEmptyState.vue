<template>
  <section class="max-w-3xl mx-auto px-4 py-20 text-center">
    <div class="border-2 border-dashed border-gray-200 rounded-2xl p-12 bg-white">
      <h1 class="text-3xl font-black text-gray-900 tracking-tight">Reports</h1>
      <p class="mt-3 text-sm text-gray-500">
        Create your first report to combine tab totals and manual line items.
      </p>
      <button
        class="mt-8 px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
        @click="$emit('create')"
      >
        Create Report
      </button>
    </div>
  </section>
</template>

<script setup>
defineEmits(['create']);
</script>

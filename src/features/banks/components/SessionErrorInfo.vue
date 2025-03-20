<template>
  <div class="mb-3 bg-red-100 border border-red-200 rounded p-2">
    <div class="font-medium text-red-700">Error Details</div>
    <div class="text-xs text-red-600">
      <div><span class="font-medium">Code:</span> {{ error.code }}</div>
      <div><span class="font-medium">Message:</span> {{ error.message }}</div>
      <div><span class="font-medium">Time:</span> {{ formatDate(error.timestamp) }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: {
    type: Object,
    required: true
  }
});

// Format date helper
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString();
    } else {
      return new Date(timestamp).toLocaleString();
    }
  } catch (err) {
    return timestamp;
  }
};
</script> 
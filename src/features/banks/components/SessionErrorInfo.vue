<template>
  <div class="mb-3 bg-red-100 border border-red-200 rounded p-2">
    <div class="font-medium text-red-700">Error Details</div>
    <div class="text-xs text-red-600">
      <div><span class="font-medium">Code:</span> {{ error.code }}</div>
      <div><span class="font-medium">Message:</span> {{ error.message }}</div>
      <div><span class="font-medium">Time:</span> {{ formatDate(error.timestamp) }}</div>
    </div>

    <!-- Reconnect option if required -->
    <div v-if="error.requiresReconnect" class="mt-2">
      <button 
        @click="$emit('reconnect')"
        class="inline-flex items-center px-2 py-1 border border-black text-xs font-medium rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-gray-50 focus:outline-none"
      >
        <RefreshCw class="h-3 w-3 mr-1" />
        Reconnect Bank
      </button>
    </div>
  </div>
</template>

<script setup>
import { RefreshCw } from 'lucide-vue-next';

const props = defineProps({
  error: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['reconnect']);

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
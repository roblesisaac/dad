<template>
  <div class="mb-3 bg-blue-100 border border-blue-200 rounded p-2">
    <div class="font-medium text-blue-700">Recovery Details</div>
    <div class="text-xs">
      <div v-if="details?.transactionsRemoved">
        <span class="font-medium">Transactions Removed:</span> 
        {{ details.transactionsRemoved }}
      </div>
      <div v-if="details?.previousbranchNumber">
        <span class="font-medium">From Batch:</span> 
        {{ details.previousbranchNumber }}
      </div>
      <div v-if="details?.recoveryTimestamp">
        <span class="font-medium">Recovery Time:</span> 
        {{ formatDate(details.recoveryTimestamp) }}
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  details: {
    type: Object,
    default: null
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
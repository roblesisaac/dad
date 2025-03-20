<template>
  <div class="bg-white p-2 rounded border border-red-200 text-xs">
    <slot name="header">
      <div class="font-medium mb-1">
        {{ transaction?.name || 'Unknown Transaction' }} 
        <span class="text-gray-500">(ID: {{ truncateId(transactionId) }})</span>
      </div>
      
      <div v-if="showDetails" class="grid grid-cols-2 gap-2 mb-2">
        <div>
          <span class="font-medium">Amount:</span> 
          {{ formatCurrency(transaction?.amount) }}
        </div>
        <div>
          <span class="font-medium">Date:</span> 
          {{ transaction?.date || 'Unknown' }}
        </div>
      </div>
    </slot>
    
    <div class="bg-red-50 p-1 rounded border border-red-100" :class="{ 'mt-1': !showDetails }">
      <div class="font-medium text-red-700">Error:</div>
      <div v-if="error?.code">
        <span class="font-medium">Code:</span> {{ error?.code }}
      </div>
      <div>
        <span class="font-medium">Message:</span> {{ error?.message }}
      </div>
      <div v-if="error?.timestamp">
        <span class="font-medium">Time:</span> {{ formatDate(error?.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUtils } from '@/shared/composables/useUtils.js';

const props = defineProps({
  transaction: {
    type: Object,
    default: null
  },
  transactionId: {
    type: String,
    required: true
  },
  error: {
    type: Object,
    required: true
  },
  showDetails: {
    type: Boolean,
    default: true
  }
});

// Use utility functions
const { formatPrice } = useUtils();

// Format currency helper
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  return formatPrice(amount);
};

// Truncate ID helper
const truncateId = (id) => {
  if (!id) return 'Unknown';
  if (id.length <= 10) return id;
  
  return `${id.substring(0, 10)}...`;
};

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
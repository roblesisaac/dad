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
          {{ transaction?.authorized_date || 'Unknown' }}
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
    
    <!-- Add Transaction button for modified transactions -->
    <div v-if="transaction && showAddButton" class="mt-2">
      <button 
        v-if="!disabled"
        @click="addTransaction" 
        class="w-full text-xs py-1 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading"
      >
        <span v-if="isLoading">Adding...</span>
        <span v-else>Add Transaction</span>
      </button>
      <div v-else class="w-full text-xs py-1 px-2 bg-green-100 text-green-700 rounded-sm text-center">
        Already Added
      </div>
      <div v-if="addResult" class="mt-1 text-xs font-medium" :class="addSuccess ? 'text-green-600' : 'text-red-600'">
        {{ addResult }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUtils } from '@/shared/composables/useUtils.js';
import { useBanks } from '@/features/banks/composables/useBanks.js';
import { ref } from 'vue';

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
  },
  showAddButton: {
    type: Boolean,
    default: true
  },
  syncSessionId: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

// Use banks composable for adding transactions
const { addTransactionFromError } = useBanks();

// Use utility functions
const { formatPrice } = useUtils();

// Local state for add transaction
const isLoading = ref(false);
const addResult = ref('');
const addSuccess = ref(false);

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

// Add transaction handler
const addTransaction = async () => {
  if (!props.transaction) return;
  
  isLoading.value = true;
  addResult.value = '';
  addSuccess.value = false;
  
  try {
    const result = await addTransactionFromError(props.transaction, props.syncSessionId);
    
    if (result.success) {
      addSuccess.value = true;
      addResult.value = result.sessionUpdated 
        ? 'Transaction added and session updated' 
        : 'Transaction added successfully';
    } else {
      addSuccess.value = false;
      addResult.value = `Failed: ${result.error}`;
    }
  } catch (err) {
    addSuccess.value = false;
    addResult.value = `Error: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
};
</script> 
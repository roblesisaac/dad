<template>
  <div 
    class="border rounded-md overflow-hidden"
    :class="{
      'border-red-300 bg-red-50': session.status === 'error',
      'border-green-300 bg-green-50': session.status === 'complete',
      'border-yellow-300 bg-yellow-50': session.status === 'in_progress',
      'border-blue-300 bg-blue-50': session.status === 'recovery'
    }"
  >
    <!-- Session header -->
    <div 
      class="p-3 flex justify-between items-center cursor-pointer"
      @click="toggleExpanded"
    >
      <div class="flex items-center space-x-2">
        <!-- Status icon -->
        <div class="w-5 h-5">
          <!-- Error icon -->
          <AlertTriangle v-if="session.status === 'error'" class="h-5 w-5 text-red-500" />
          
          <!-- Success icon -->
          <Check v-else-if="session.status === 'complete'" class="h-5 w-5 text-green-500" />
          
          <!-- In progress icon -->
          <RefreshCw v-else-if="session.status === 'in_progress'" class="h-5 w-5 text-yellow-500 animate-spin" />
          
          <!-- Recovery icon -->
          <RefreshCw v-else-if="session.isRecovery" class="h-5 w-5 text-blue-500" />
        </div>
        
        <!-- Session info -->
        <div>
          <div class="font-medium flex items-center gap-1.5">
            {{ getSessionTitle }}
            <span v-if="session.syncTag" class="text-xs px-1.5 py-0.5 bg-blue-100 rounded text-blue-700 font-normal">
              {{ session.syncTag }}
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {{ formatSyncDate(session.syncTime) }} - Batch #{{ session.batchNumber || 1 }}
          </div>
        </div>
      </div>
      
      <!-- Expand/collapse icon -->
      <div class="text-gray-500">
        <ChevronUp v-if="isExpanded" class="h-5 w-5" />
        <ChevronDown v-else class="h-5 w-5" />
      </div>
    </div>
    
    <!-- Session details (expanded) -->
    <div 
      v-if="isExpanded" 
      class="px-3 pb-3 pt-1 border-t border-gray-200 text-sm"
    >
      <!-- Transaction counts -->
      <div class="grid grid-cols-3 gap-4 mb-3">
        <div class="text-center p-2 bg-white rounded shadow-sm">
          <div class="font-medium">Added</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.added || 0 }}</div>
        </div>
        <div class="text-center p-2 bg-white rounded shadow-sm">
          <div class="font-medium">Modified</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.modified || 0 }}</div>
        </div>
        <div class="text-center p-2 bg-white rounded shadow-sm">
          <div class="font-medium">Removed</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.removed || 0 }}</div>
        </div>
      </div>
      
      <!-- Sync metadata -->
      <div class="mb-3 flex flex-wrap gap-2">
        <!-- Session ID -->
        <div v-if="session._id" class="text-xs inline-flex items-center px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded">
          <span class="font-medium mr-1">ID:</span> {{ session._id }}
        </div>
      </div>
      
      <!-- Last No Changes Time -->
      <div v-if="session.lastNoChangesTime && session.lastNoChangesTime > 0" class="mb-3 bg-gray-50 border border-gray-200 rounded p-2">
        <div class="text-xs">
          <span class="font-medium">Last No Changes:</span> 
          {{ formatDateTime(session.lastNoChangesTime) }}
        </div>
      </div>
      
      <!-- Error information -->
      <SessionErrorInfo v-if="session.error" :error="session.error" />
      
      <!-- Failed transactions section -->
      <div v-if="hasFailedTransactions" class="mb-3">
        <div class="font-medium text-red-700 mb-2">Failed Transactions</div>
        
        <!-- Failed added transactions -->
        <FailedTransactionsGroup 
          v-if="session.failedTransactions?.added?.length" 
          :transactions="session.failedTransactions.added"
          title="Add Failures"
        >
          <template #default="{ transactions }">
            <FailedTransactionItem
              v-for="failedTx in transactions"
              :key="failedTx.transaction_id"
              :transaction="failedTx.transaction"
              :transaction-id="failedTx.transaction_id"
              :error="failedTx.error"
            />
          </template>
        </FailedTransactionsGroup>
        
        <!-- Failed modified transactions -->
        <FailedTransactionsGroup 
          v-if="session.failedTransactions?.modified?.length" 
          :transactions="session.failedTransactions.modified"
          title="Modify Failures"
        >
          <template #default="{ transactions }">
            <FailedTransactionItem
              v-for="failedTx in transactions"
              :key="failedTx.transaction_id"
              :transaction-id="failedTx.transaction_id"
              :error="failedTx.error"
              :show-details="false"
            />
          </template>
        </FailedTransactionsGroup>
        
        <!-- Failed removed transactions -->
        <FailedTransactionsGroup 
          v-if="session.failedTransactions?.removed?.length" 
          :transactions="session.failedTransactions.removed"
          title="Remove Failures"
        >
          <template #default="{ transactions }">
            <FailedTransactionItem
              v-for="failedTx in transactions"
              :key="failedTx.transaction_id"
              :transaction-id="failedTx.transaction_id"
              :error="failedTx.error"
              :show-details="false"
            />
          </template>
        </FailedTransactionsGroup>
      </div>
      
      <!-- Recovery details -->
      <RecoveryDetails 
        v-if="session.isRecovery" 
        :details="session.recoveryDetails" 
      />
      
      <!-- Actions -->
      <div class="flex justify-end space-x-2">
        <button 
          v-if="session.status === 'complete' && session._id !== currentSyncId" 
          @click="requestRevert"
          class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
        >
          Revert to this Session
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { RefreshCw, AlertTriangle, Check, ChevronUp, ChevronDown } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils.js';
import FailedTransactionItem from './FailedTransactionItem.vue';
import FailedTransactionsGroup from './FailedTransactionsGroup.vue';
import SessionErrorInfo from './SessionErrorInfo.vue';
import RecoveryDetails from './RecoveryDetails.vue';

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  currentSyncId: {
    type: String,
    default: null
  },
  formatSyncDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['revert']);

// Setup utils
const { formatPrice } = useUtils();

// Local state
const isExpanded = ref(false);

// Toggle session expanded state
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// Format currency helper - retained for any inline usage
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  return formatPrice(amount);
};

// Get session title based on status
const getSessionTitle = computed(() => {
  if (props.session.isRecovery) {
    return 'Recovery Sync';
  }
  
  switch (props.session.status) {
    case 'error':
      return 'Failed Sync';
    case 'complete':
      return props.session._id === props.currentSyncId ? 'Current Sync' : 'Completed Sync';
    case 'in_progress':
      return 'In Progress';
    default:
      return `Sync (${props.session.status})`;
  }
});

// Check if session has failed transactions
const hasFailedTransactions = computed(() => {
  if (!props.session.failedTransactions) return false;
  
  return (
    (props.session.failedTransactions.added && props.session.failedTransactions.added.length > 0) ||
    (props.session.failedTransactions.modified && props.session.failedTransactions.modified.length > 0) ||
    (props.session.failedTransactions.removed && props.session.failedTransactions.removed.length > 0)
  );
});

// Request to revert to this session
const requestRevert = () => {
  emit('revert', props.session);
};

// Format date helper - retained for local timestamp formatting
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    // Check if timestamp is in milliseconds (typical JS format)
    // or seconds (Unix timestamp)
    const date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    return date.toLocaleString();
  } catch (err) {
    return 'Invalid date';
  }
};
</script> 
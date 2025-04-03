<template>
  <div 
    class="border rounded-md overflow-hidden"
    :class="{
      'border-red-300 bg-red-50': session.status === 'error',
      'border-green-300 bg-green-50': session.status === 'complete',
      'border-yellow-300 bg-yellow-50': session.status === 'in_progress',
      'border-blue-300 bg-blue-50': session.status === 'recovered'
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
          
          <!-- Recovery icon -->
          <RefreshCw v-else-if="session.isRecovery" class="h-5 w-5 text-blue-500" />
          
          <!-- Success icon -->
          <Check v-else-if="session.status === 'complete'" class="h-5 w-5 text-green-500" />
          
          <!-- In progress icon -->
          <RefreshCw v-else-if="session.status === 'in_progress'" class="h-5 w-5 text-yellow-500 animate-spin" />
        </div>
        
        <!-- Session info -->
        <div>
          <div class="font-medium flex items-center gap-1.5">
            {{ getSessionTitle }}
            <span v-if="session.syncTag" class="text-xs px-1.5 py-0.5 bg-blue-100 rounded text-blue-700 font-normal">
              {{ session.syncTag }}
            </span>
            <span 
              v-if="hasSyncCountsMismatch" 
              class="text-xs px-1.5 py-0.5 bg-amber-100 rounded text-amber-700 font-normal flex items-center gap-0.5"
              title="Transaction count mismatch"
            >
              <AlertTriangle class="h-3 w-3" />
              Mismatch
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {{ formatSyncDate(session.syncTime) }} - Batch #{{ session.branchNumber || 1 }}
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
        <div 
          class="text-center p-2 bg-white rounded shadow-sm" 
          :class="{'border border-amber-400': hasMismatch('added')}"
        >
          <div class="font-medium">Added</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.added || 0 }}</div>
          <div 
            v-if="hasMismatch('added')" 
            class="text-xs text-amber-600 font-medium"
          >
            Expected: {{ session.syncCounts?.expected?.added || 0 }}
          </div>
        </div>
        <div 
          class="text-center p-2 bg-white rounded shadow-sm"
          :class="{'border border-amber-400': hasMismatch('modified')}"
        >
          <div class="font-medium">Modified</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.modified || 0 }}</div>
          <div 
            v-if="hasMismatch('modified')" 
            class="text-xs text-amber-600 font-medium"
          >
            Expected: {{ session.syncCounts?.expected?.modified || 0 }}
          </div>
        </div>
        <div 
          class="text-center p-2 bg-white rounded shadow-sm"
          :class="{'border border-amber-400': hasMismatch('removed')}"
        >
          <div class="font-medium">Removed</div>
          <div class="text-lg">{{ session.syncCounts?.actual?.removed || 0 }}</div>
          <div 
            v-if="hasMismatch('removed')" 
            class="text-xs text-amber-600 font-medium"
          >
            Expected: {{ session.syncCounts?.expected?.removed || 0 }}
          </div>
        </div>
      </div>
      
      <!-- Counts mismatch alert -->
      <div 
        v-if="hasSyncCountsMismatch" 
        class="mb-3 p-2 bg-amber-50 border border-amber-300 rounded text-amber-700 text-sm"
      >
        <div class="font-medium mb-1 flex items-center gap-1.5">
          <AlertTriangle class="h-4 w-4" />
          Sync Counts Mismatch
        </div>
        <p class="text-xs">
          There is a discrepancy between expected and actual transaction counts, which may indicate incomplete synchronization or data processing issues.
        </p>
        <div class="mt-1.5 text-xs grid grid-cols-2 gap-1">
          <div>
            <span class="font-medium">Total Expected:</span> 
            {{ getTotalExpected }}
          </div>
          <div>
            <span class="font-medium">Total Actual:</span> 
            {{ getTotalActual }}
          </div>
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
              :transaction="failedTx.transaction"
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
              :transaction="failedTx.transaction"
              :transaction-id="failedTx.transaction_id"
              :error="failedTx.error"
              :show-details="false"
            />
          </template>
        </FailedTransactionsGroup>
      </div>
      
      <!-- Skipped transactions section -->
      <div v-if="hasSkippedTransactions" class="mb-3">
        <div class="font-medium text-amber-700 mb-2">Skipped Transactions</div>
        
        <FailedTransactionsGroup 
          :transactions="session.failedTransactions.skipped"
          title="Duplicate Transactions"
          class="text-amber-600 border-amber-200"
        >
          <template #default="{ transactions }">
            <FailedTransactionItem
              v-for="skippedTx in transactions"
              :key="skippedTx.transaction_id"
              :transaction="skippedTx.transaction"
              :transaction-id="skippedTx.transaction_id"
              :error="skippedTx.error"
              class="border-amber-200"
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

// Check if there is a mismatch for a specific type
const hasMismatch = (type) => {
  if (!props.session.syncCounts || !props.session.syncCounts.actual || !props.session.syncCounts.expected) return false;
  return props.session.syncCounts.actual[type] !== props.session.syncCounts.expected[type];
};

// Check if there are any count mismatches
const hasSyncCountsMismatch = computed(() => {
  return hasMismatch('added') || hasMismatch('modified') || hasMismatch('removed');
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

// Calculate total expected and actual counts
const getTotalExpected = computed(() => {
  if (!props.session.syncCounts || !props.session.syncCounts.expected) return 'N/A';
  return Object.values(props.session.syncCounts.expected).reduce((total, count) => total + count, 0);
});

const getTotalActual = computed(() => {
  if (!props.session.syncCounts || !props.session.syncCounts.actual) return 'N/A';
  return Object.values(props.session.syncCounts.actual).reduce((total, count) => total + count, 0);
});

// Check if session has skipped transactions
const hasSkippedTransactions = computed(() => {
  if (!props.session.failedTransactions || !props.session.failedTransactions.skipped) return false;
  return props.session.failedTransactions.skipped.length > 0;
});
</script> 
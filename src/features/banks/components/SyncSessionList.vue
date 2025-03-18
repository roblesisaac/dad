<template>
  <div class="sync-sessions">
    <div class="mb-4 pb-4 border-b border-gray-200">
      <h3 class="text-lg font-medium">Sync History</h3>
      <p class="text-sm text-gray-500">View past sync sessions and their status</p>
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-pulse mx-auto h-6 w-6 mb-4 text-blue-500">
        <RefreshCw class="h-6 w-6" />
      </div>
      <p class="text-gray-600">Loading sync history...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="py-8 text-center">
      <div class="mx-auto h-6 w-6 mb-4 text-red-500">
        <AlertTriangle class="h-6 w-6" />
      </div>
      <p class="text-red-600 mb-2">{{ error }}</p>
      <button 
        @click="$emit('refresh')" 
        class="inline-flex items-center px-3 py-2 border border-black shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none"
      >
        Retry
      </button>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="syncSessions.length === 0" class="py-8 text-center">
      <div class="mx-auto h-6 w-6 mb-4 text-gray-400">
        <Clock class="h-6 w-6" />
      </div>
      <p class="text-gray-600 mb-2">No sync history available</p>
      <button 
        @click="$emit('sync')" 
        class="inline-flex items-center px-3 py-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none"
      >
        Sync Now
      </button>
    </div>
    
    <!-- Session list -->
    <div v-else class="space-y-3">
      <div 
        v-for="session in syncSessions" 
        :key="session._id" 
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
          @click="toggleSessionExpanded(session._id)"
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
              <RefreshCw v-else-if="session.status === 'recovery'" class="h-5 w-5 text-blue-500" />
            </div>
            
            <!-- Session info -->
            <div>
              <div class="font-medium flex items-center gap-1.5">
                {{ getSessionTitle(session) }}
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
            <ChevronUp v-if="expandedSessions[session._id]" class="h-5 w-5" />
            <ChevronDown v-else class="h-5 w-5" />
          </div>
        </div>
        
        <!-- Session details (expanded) -->
        <div 
          v-if="expandedSessions[session._id]" 
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
              {{ formatDateFromTimestamp(session.lastNoChangesTime) }}
            </div>
          </div>
          
          <!-- Error information -->
          <div v-if="session.error" class="mb-3 bg-red-100 border border-red-200 rounded p-2">
            <div class="font-medium text-red-700">Error Details</div>
            <div class="text-xs text-red-600">
              <div><span class="font-medium">Code:</span> {{ session.error.code }}</div>
              <div><span class="font-medium">Message:</span> {{ session.error.message }}</div>
              <div><span class="font-medium">Time:</span> {{ formatDate(session.error.timestamp) }}</div>
            </div>
          </div>
          
          <!-- Failed transactions section -->
          <div v-if="hasFailedTransactions(session)" class="mb-3">
            <div class="font-medium text-red-700 mb-2">Failed Transactions</div>
            
            <!-- Failed added transactions -->
            <div v-if="session.failedTransactions?.added?.length" class="mb-2">
              <div class="flex justify-between items-center text-xs font-medium text-red-600 border-b border-red-200 pb-1 mb-1">
                <span>{{ session.failedTransactions.added.length }} Add Failures</span>
                <button @click="toggleFailedAddTransactions" class="text-red-700">
                  <ChevronUp v-if="showFailedAddTransactions" class="h-4 w-4" />
                  <ChevronDown v-else class="h-4 w-4" />
                </button>
              </div>
              
              <!-- Expanded failed add transactions -->
              <div v-if="showFailedAddTransactions" class="space-y-2">
                <div 
                  v-for="(failedTx, index) in session.failedTransactions.added" 
                  :key="failedTx.transaction_id"
                  class="bg-white p-2 rounded border border-red-200 text-xs"
                >
                  <div class="font-medium mb-1">
                    {{ failedTx.transaction?.name || 'Unknown Transaction' }} 
                    <span class="text-gray-500">(ID: {{ truncateId(failedTx.transaction_id) }})</span>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <span class="font-medium">Amount:</span> 
                      {{ formatCurrency(failedTx.transaction?.amount) }}
                    </div>
                    <div>
                      <span class="font-medium">Date:</span> 
                      {{ failedTx.transaction?.date || 'Unknown' }}
                    </div>
                  </div>
                  
                  <div class="bg-red-50 p-1 rounded border border-red-100">
                    <div class="font-medium text-red-700">Error:</div>
                    <div>
                      <span class="font-medium">Code:</span> {{ failedTx.error?.code }}
                    </div>
                    <div>
                      <span class="font-medium">Message:</span> {{ failedTx.error?.message }}
                    </div>
                    <div>
                      <span class="font-medium">Time:</span> {{ formatDate(failedTx.error?.timestamp) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Failed modified transactions -->
            <div v-if="session.failedTransactions?.modified?.length" class="mb-2">
              <div class="flex justify-between items-center text-xs font-medium text-red-600 border-b border-red-200 pb-1 mb-1">
                <span>{{ session.failedTransactions.modified.length }} Modify Failures</span>
                <button @click="toggleFailedModifyTransactions" class="text-red-700">
                  <ChevronUp v-if="showFailedModifyTransactions" class="h-4 w-4" />
                  <ChevronDown v-else class="h-4 w-4" />
                </button>
              </div>
              
              <!-- Expanded failed modify transactions -->
              <div v-if="showFailedModifyTransactions" class="space-y-2">
                <div 
                  v-for="failedTx in session.failedTransactions.modified" 
                  :key="failedTx.transaction_id"
                  class="bg-white p-2 rounded border border-red-200 text-xs"
                >
                  <!-- Similar structure to added transactions -->
                  <div>ID: {{ truncateId(failedTx.transaction_id) }}</div>
                  <div class="bg-red-50 p-1 rounded border border-red-100 mt-1">
                    <div class="font-medium">Error: {{ failedTx.error?.message }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Failed removed transactions -->
            <div v-if="session.failedTransactions?.removed?.length" class="mb-2">
              <div class="flex justify-between items-center text-xs font-medium text-red-600 border-b border-red-200 pb-1 mb-1">
                <span>{{ session.failedTransactions.removed.length }} Remove Failures</span>
                <button @click="toggleFailedRemoveTransactions" class="text-red-700">
                  <ChevronUp v-if="showFailedRemoveTransactions" class="h-4 w-4" />
                  <ChevronDown v-else class="h-4 w-4" />
                </button>
              </div>
              
              <!-- Expanded failed remove transactions -->
              <div v-if="showFailedRemoveTransactions" class="space-y-2">
                <div 
                  v-for="failedTx in session.failedTransactions.removed" 
                  :key="failedTx.transaction_id"
                  class="bg-white p-2 rounded border border-red-200 text-xs"
                >
                  <!-- Similar structure to added transactions -->
                  <div>ID: {{ truncateId(failedTx.transaction_id) }}</div>
                  <div class="bg-red-50 p-1 rounded border border-red-100 mt-1">
                    <div class="font-medium">Error: {{ failedTx.error?.message }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Recovery details -->
          <div v-if="session.isRecovery" class="mb-3 bg-blue-100 border border-blue-200 rounded p-2">
            <div class="font-medium text-blue-700">Recovery Details</div>
            <div class="text-xs">
              <div v-if="session.recoveryDetails?.transactionsRemoved">
                <span class="font-medium">Transactions Removed:</span> 
                {{ session.recoveryDetails.transactionsRemoved }}
              </div>
              <div v-if="session.recoveryDetails?.previousBatchNumber">
                <span class="font-medium">From Batch:</span> 
                {{ session.recoveryDetails.previousBatchNumber }}
              </div>
              <div v-if="session.recoveryDetails?.recoveryTimestamp">
                <span class="font-medium">Recovery Time:</span> 
                {{ formatDate(session.recoveryDetails.recoveryTimestamp) }}
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end space-x-2">
            <button 
              v-if="session.status === 'complete' && session._id !== currentSyncId" 
              @click="confirmRevert(session)"
              class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            >
              Revert to this Session
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Confirmation modal for reversion -->
    <BaseModal 
      v-if="showRevertConfirmation" 
      :is-open="showRevertConfirmation"
      title="Confirm Reversion"
      @close="cancelRevert"
    >
      <template #content>
        <div class="p-4">
          <div class="text-red-500 mb-4">
            <AlertTriangle class="h-12 w-12 mx-auto mb-2" />
            <p class="text-center text-xl font-bold">Warning: This action cannot be undone</p>
          </div>
          
          <p class="mb-4">
            You are about to revert to the sync session from 
            <strong>{{ formatSyncDate(sessionToRevert?.syncTime) }}</strong>.
          </p>
          
          <p class="mb-4">
            This will remove all transactions that were added after this session. 
            Any transactions that were modified or categorized after this point 
            will be reverted to their previous state.
          </p>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button 
              @click="cancelRevert" 
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button 
              @click="confirmRevertSession" 
              class="px-4 py-2 border border-transparent rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
            >
              Revert
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { RefreshCw, AlertTriangle, Check, Clock, ChevronUp, ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  syncSessions: {
    type: Array,
    default: () => []
  },
  currentSyncId: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  formatSyncDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['refresh', 'sync', 'revert-to-session']);

// Local state
const expandedSessions = ref({});
const showRevertConfirmation = ref(false);
const sessionToRevert = ref(null);
const showFailedAddTransactions = ref(false);
const showFailedModifyTransactions = ref(false);
const showFailedRemoveTransactions = ref(false);

// Toggle session expanded state
const toggleSessionExpanded = (sessionId) => {
  expandedSessions.value[sessionId] = !expandedSessions.value[sessionId];
};

// Toggle failed transactions sections
const toggleFailedAddTransactions = () => {
  showFailedAddTransactions.value = !showFailedAddTransactions.value;
};

const toggleFailedModifyTransactions = () => {
  showFailedModifyTransactions.value = !showFailedModifyTransactions.value;
};

const toggleFailedRemoveTransactions = () => {
  showFailedRemoveTransactions.value = !showFailedRemoveTransactions.value;
};

// Format currency helper
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  
  // Handle negative values
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format as USD currency
  return `${isNegative ? '-' : ''}$${absAmount.toFixed(2)}`;
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

// Format date from timestamp (milliseconds)
const formatDateFromTimestamp = (timestamp) => {
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

// Get session title based on status
const getSessionTitle = (session) => {
  if (session.isRecovery) {
    return 'Recovery Sync';
  }
  
  switch (session.status) {
    case 'error':
      return 'Failed Sync';
    case 'complete':
      return session._id === props.currentSyncId ? 'Current Sync' : 'Completed Sync';
    case 'in_progress':
      return 'In Progress';
    default:
      return `Sync (${session.status})`;
  }
};

// Check if session has failed transactions
const hasFailedTransactions = (session) => {
  if (!session.failedTransactions) return false;
  
  return (
    (session.failedTransactions.added && session.failedTransactions.added.length > 0) ||
    (session.failedTransactions.modified && session.failedTransactions.modified.length > 0) ||
    (session.failedTransactions.removed && session.failedTransactions.removed.length > 0)
  );
};

// Open revert confirmation modal
const confirmRevert = (session) => {
  sessionToRevert.value = session;
  showRevertConfirmation.value = true;
};

// Cancel reversion
const cancelRevert = () => {
  showRevertConfirmation.value = false;
  sessionToRevert.value = null;
};

// Confirm and execute reversion
const confirmRevertSession = () => {
  if (sessionToRevert.value) {
    emit('revert-to-session', sessionToRevert.value);
  }
  showRevertConfirmation.value = false;
  sessionToRevert.value = null;
};
</script> 
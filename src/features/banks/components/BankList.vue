<template>
  <div class="banks-list">
    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <div class="animate-pulse mx-auto h-8 w-8 mb-4 text-blue-500">
        <RefreshCw class="h-8 w-8" />
      </div>
      <p class="text-gray-600">Loading your connected banks...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="py-8 text-center">
      <div class="mx-auto h-8 w-8 mb-4 text-red-500">
        <AlertTriangle class="h-8 w-8" />
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
    <div v-else-if="banks.length === 0" class="py-8 text-center">
      <div class="mx-auto h-8 w-8 mb-4 text-gray-400">
        <CreditCard class="h-8 w-8" />
      </div>
      <p class="text-gray-600 mb-2">You don't have any connected banks</p>
      <button 
        @click="$emit('connect-bank')" 
        class="inline-flex items-center px-3 py-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none"
      >
        Connect a Bank
      </button>
    </div>
    
    <!-- Bank list -->
    <div v-else class="space-y-4">
      <div v-for="bank in banks" :key="bank.itemId" 
           :class="[
             'border-2 border-black rounded-md p-4 hover:bg-gray-50 transition-colors cursor-pointer',
             { 'border-blue-500 shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]': isSelected(bank) }
           ]"
           @click="$emit('select-bank', bank)"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <!-- Status indicator -->
            <div 
              :class="[getBankStatusClass(bank), 'w-3 h-3 rounded-full flex-shrink-0']" 
              :title="getBankStatusText(bank)"
            ></div>
            
            <!-- Bank name -->
            <h3 class="font-medium">{{ bank.institutionName || 'Connected Bank' }}</h3>
          </div>
          
          <!-- Sync button -->
          <div class="flex space-x-2">
            <button 
              @click.stop="$emit('edit-bank-name', bank)"
              class="inline-flex items-center px-3 py-1 text-sm rounded-md text-gray-600 border border-gray-600 hover:bg-gray-50 focus:outline-none"
            >
              Edit
            </button>
            <button 
              @click.stop="$emit('sync-bank', bank)"
              :disabled="isSyncing && selectedBankId === bank.itemId"
              class="inline-flex items-center px-3 py-1 text-sm rounded-md text-blue-600 border border-blue-600 hover:bg-blue-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSyncing && selectedBankId === bank.itemId">
                Syncing...
              </span>
              <span v-else>
                Sync
              </span>
            </button>
          </div>
        </div>
        
        <!-- Last sync time & status -->
        <div class="mt-2 text-sm text-gray-500 flex flex-col space-y-1">
          <!-- Error indicator if bank has error status -->
          <div v-if="bank.status === 'error'" class="text-red-500 font-medium flex items-center space-x-1">
            <AlertTriangle class="h-4 w-4" />
            <span>Sync failed. Click to view details.</span>
          </div>
          
          <!-- Sync in progress indicator -->
          <div v-else-if="bank.status === 'in_progress'" class="text-yellow-600 font-medium flex items-center space-x-1">
            <RefreshCw class="h-4 w-4 animate-spin" />
            <span>Sync in progress...</span>
          </div>
          
          <!-- Last sync time -->
          <div>
            <span class="font-medium">Last sync:</span> 
            {{ bank.lastSyncTime ? formatDate(bank.lastSyncTime) : 'Never' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RefreshCw, AlertTriangle, CreditCard } from 'lucide-vue-next';

const props = defineProps({
  banks: {
    type: Array,
    default: () => []
  },
  selectedBank: {
    type: Object,
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
  isSyncing: {
    type: Boolean,
    default: false
  },
  getBankStatusClass: {
    type: Function,
    required: true
  },
  getBankStatusText: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['select-bank', 'sync-bank', 'refresh', 'connect-bank', 'edit-bank-name']);

// Computed
const selectedBankId = computed(() => props.selectedBank?.itemId);
const isSelected = (bank) => bank.itemId === selectedBankId.value;

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (err) {
    return 'Invalid date';
  }
};
</script> 
<template>
  <div class="w-full">
    <!-- Loading state -->
    <div v-if="loading" class="py-12 text-center">
      <div class="animate-pulse mx-auto h-8 w-8 mb-4 text-[var(--theme-text)]">
        <RefreshCw class="h-8 w-8 animate-spin" />
      </div>
      <p class="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]">Loading banks...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="py-12 text-center">
      <div class="mx-auto h-8 w-8 mb-4 text-red-500">
        <AlertTriangle class="h-8 w-8" />
      </div>
      <p class="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">{{ error }}</p>
      <button 
        @click="$emit('refresh')" 
        class="px-6 py-4 bg-[var(--theme-bg-soft)] hover:opacity-70 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)] rounded-2xl transition-all inline-flex mx-auto border border-[var(--theme-border)]"
      >
        Retry
      </button>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="banks.length === 0" class="py-12 text-center flex flex-col items-center">
      <div class="mx-auto h-8 w-8 mb-4 text-[var(--theme-text-soft)]">
        <CreditCard class="h-8 w-8" />
      </div>
      <p class="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-soft)]">No connected banks</p>
    </div>
    
    <!-- Bank list -->
    <div v-else class="w-full flex flex-col">
      <div 
        v-for="bank in banks" 
        :key="bank.itemId" 
        class="relative bg-[var(--theme-browser-chrome)] transition-colors duration-150 w-full group shrink-0 select-none cursor-pointer block border-b border-[var(--theme-border)] last:border-0"
        @click="$emit('select-bank', bank)"
      >
        <div class="flex items-center justify-between py-5 px-6 w-full relative">
          <!-- Active bank indicator line -->
          <div v-if="selectedBank?.itemId === bank.itemId" class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-text)]"></div>

          <div class="flex items-center min-w-0 flex-1">
            <div class="flex flex-col min-w-0 gap-1.5 w-full">
              <div class="flex items-center gap-2 min-w-0">
                <div 
                  :class="[getBankStatusClass(bank), 'w-2 h-2 rounded-full flex-shrink-0']" 
                  :title="getBankStatusText(bank)"
                ></div>
                <h3 class="text-base font-black text-[var(--theme-text)] truncate uppercase tracking-tight min-w-0 flex-1">
                  {{ getBankDisplayName(bank) }}
                </h3>
              </div>
              
              <div class="text-[10px] font-black text-[var(--theme-text-soft)] uppercase tracking-widest truncate flex items-center gap-2">
                <span>{{ getBankStatusText(bank) }}</span>
                <template v-if="bank.syncData?.lastSyncTime">
                  <span class="w-1 h-1 rounded-full bg-[var(--theme-border)] flex-shrink-0"></span>
                  <span class="truncate">Sync: {{ formatDate(bank.syncData.lastSyncTime) }}</span>
                </template>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 ml-4 shrink-0">
            <button 
              @click.stop="$emit('edit-bank-name', bank)"
              class="p-2 rounded-xl text-[var(--theme-text-soft)] hover:text-[var(--theme-text)] transition-colors focus:outline-none"
              title="Edit bank settings"
            >
              <Settings size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RefreshCw, AlertTriangle, CreditCard, History, Settings } from 'lucide-vue-next';

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

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getBankDisplayName = (bank) => {
  return (
    normalizeText(bank?.institutionName) ||
    normalizeText(bank?.institution_name) ||
    normalizeText(bank?.institutionId) ||
    normalizeText(bank?.institution_id) ||
    'Connected Bank'
  );
};

const getBankMetaLine = (bank) => {
  const institutionId = normalizeText(bank?.institutionId) || normalizeText(bank?.institution_id);
  const itemId = normalizeText(bank?.itemId);
  const metadata = [];

  if (institutionId && institutionId !== getBankDisplayName(bank)) {
    metadata.push(`Institution: ${institutionId}`);
  }

  if (itemId) {
    metadata.push(`Item: ${itemId}`);
  }

  return metadata.join(' | ');
};

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

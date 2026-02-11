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
      <SessionListItem 
        v-for="session in syncSessions" 
        :key="session._id"
        :session="session"
        :current-sync-id="currentSyncId"
        :format-sync-date="formatSyncDate"
        @revert="confirmRevert"
      />
      
      <!-- Loading more indicator -->
      <div v-if="loadingMore" class="py-4 text-center">
        <div class="animate-pulse mx-auto h-5 w-5 text-gray-400">
          <RefreshCw class="h-5 w-5" />
        </div>
        <p class="text-sm text-gray-400 mt-1">Loading more...</p>
      </div>
      
      <!-- Infinite scroll sentinel -->
      <div ref="sentinelRef" class="h-1" />
    </div>
    
    <!-- Confirmation modal for reversion -->
    <ConfirmReversionModal
      :is-open="showRevertConfirmation"
      :session="sessionToRevert"
      :format-sync-date="formatSyncDate"
      @confirm="confirmRevertSession"
      @cancel="cancelRevert"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { RefreshCw, AlertTriangle, Clock } from 'lucide-vue-next';
import SessionListItem from './SessionListItem.vue';
import ConfirmReversionModal from './ConfirmReversionModal.vue';

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
  },
  loadingMore: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['refresh', 'sync', 'revert-to-session', 'load-more']);

// Local state for reversion modal
const showRevertConfirmation = ref(false);
const sessionToRevert = ref(null);

// Infinite scroll
const sentinelRef = ref(null);
let observer = null;

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  if (!sentinelRef.value) return;

  observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && props.hasMore && !props.loadingMore) {
      emit('load-more');
    }
  }, {
    rootMargin: '100px'
  });

  observer.observe(sentinelRef.value);
};

// Watch for the sentinel element to appear (it only renders when sessions exist)
watch(() => props.syncSessions.length, async (len) => {
  if (len > 0) {
    await nextTick();
    setupObserver();
  }
});

onMounted(() => {
  if (sentinelRef.value) {
    setupObserver();
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

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
const confirmRevertSession = (session) => {
  emit('revert-to-session', session);
  showRevertConfirmation.value = false;
  sessionToRevert.value = null;
};
</script> 
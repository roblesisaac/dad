<template>
  <div class="w-full">
    <div v-if="state.onboardingStep === 'syncing'" class="sync-status">
      <div class="bg-[var(--theme-bg-soft)] p-8 rounded-2xl">
        <h3 class="text-sm font-black uppercase tracking-[0.2em] mb-2 text-[var(--theme-text)] text-center">Syncing Transactions</h3>
        <p class="mb-8 text-sm opacity-70 text-[var(--theme-text)] text-center">This may take a few minutes...</p>
        
        <div class="relative h-2 bg-[var(--theme-bg)] rounded-full mb-8 overflow-hidden">
          <div class="absolute top-0 left-0 h-full bg-[var(--theme-text)] transition-all duration-500 rounded-full" :style="{ width: progressWidth }"></div>
        </div>
        
        <div class="flex justify-between items-center px-2">
          <div class="flex flex-col items-center">
            <span class="text-[0.65rem] font-bold uppercase tracking-wider opacity-50 text-[var(--theme-text)] mb-1">Added</span>
            <span class="text-2xl font-black text-[var(--theme-text)]">{{ state.syncProgress.added }}</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-[0.65rem] font-bold uppercase tracking-wider opacity-50 text-[var(--theme-text)] mb-1">Modified</span>
            <span class="text-2xl font-black text-[var(--theme-text)]">{{ state.syncProgress.modified }}</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-[0.65rem] font-bold uppercase tracking-wider opacity-50 text-[var(--theme-text)] mb-1">Removed</span>
            <span class="text-2xl font-black text-[var(--theme-text)]">{{ state.syncProgress.removed }}</span>
          </div>
        </div>

        <div class="flex justify-center mt-8">
          <div class="inline-block px-4 py-1.5 rounded-full text-[0.65rem] font-black uppercase tracking-wider"
               :class="{
                 'bg-[var(--theme-bg)] text-[var(--theme-text)] opacity-70': state.syncProgress.status === 'queued',
                 'bg-[var(--theme-text)] text-[var(--theme-bg)]': ['syncing', 'in_progress'].includes(state.syncProgress.status),
                 'bg-green-100 text-green-800': state.syncProgress.status === 'completed',
                 'bg-red-100 text-red-800': state.syncProgress.status === 'error'
               }">
            {{ formatStatus(state.syncProgress.status) }}
          </div>
        </div>

        <div v-if="state.error" class="text-center mt-6">
          <p class="text-sm text-red-600 mb-4">{{ state.error }}</p>
          <button 
            class="px-6 py-3 bg-[var(--theme-text)] text-[var(--theme-bg)] hover:opacity-70 transition-opacity rounded-xl text-xs font-black uppercase tracking-[0.2em]"
            @click="retrySync">
            Retry Sync
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="state.onboardingStep === 'complete'" class="text-center">
      <div class="bg-[var(--theme-bg-soft)] p-8 rounded-2xl mb-8">
        <h3 class="text-sm font-black uppercase tracking-[0.2em] mb-2 text-[var(--theme-text)]">Setup Complete</h3>
        <p class="mb-8 text-sm opacity-70 text-[var(--theme-text)]">Successfully synced your accounts</p>
        
        <div class="space-y-4 text-left">
          <div class="flex justify-between items-center py-3 border-b border-[var(--theme-text)] border-opacity-10">
            <span class="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-70">Transactions Added</span>
            <span class="text-xl font-black text-[var(--theme-text)]">{{ state.syncProgress.added }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-[var(--theme-text)] border-opacity-10">
            <span class="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-70">Last Synced</span>
            <span class="text-sm font-black text-[var(--theme-text)]">{{ formatLastSync }}</span>
          </div>
        </div>
      </div>
      
      <button 
        class="w-full py-4 px-6 bg-[var(--theme-text)] hover:opacity-70 text-[var(--theme-bg)] transition-opacity flex items-center justify-center rounded-xl" 
        @click="$emit('complete')">
        <span class="text-sm font-black uppercase tracking-[0.2em]">Go to Dashboard</span>
        <ArrowRight class="ml-3 w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-vue-next';

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['retry', 'complete']);

const formatStatus = (status) => {
  const statusMap = {
    'queued': 'Queued',
    'syncing': 'Syncing',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'error': 'Error'
  };
  return statusMap[status] || status;
};

const progressWidth = computed(() => {
  // Simple progress calculation based on status
  const status = props.state.syncProgress.status;
  if (status === 'completed') return '100%';
  if (status === 'in_progress') return '75%';
  if (status === 'syncing') return '50%';
  if (status === 'queued') return '25%';
  return '0%';
});

const formatLastSync = computed(() => {
  if (!props.state.syncProgress.lastSync) return 'Just now';
  try {
    return formatDistanceToNow(new Date(props.state.syncProgress.lastSync), { addSuffix: true });
  } catch (e) {
    return 'Just now';
  }
});

const retrySync = () => {
  emit('retry');
};
</script> 
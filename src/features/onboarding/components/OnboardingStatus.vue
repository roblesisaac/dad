<template>
  <div class="max-w-xl mx-auto px-6 py-8 bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
    <div v-if="state.onboardingStep === 'syncing'" class="sync-status">
      <h3 class="text-2xl font-bold mb-2 text-purple-800">Setting Up Your Account</h3>
      <p class="mb-6 text-gray-700">We're syncing your transactions. This may take a few minutes...</p>
      
      <div class="bg-gray-100 p-6 border-2 border-black shadow-[3px_3px_0px_#000]">
        <div class="relative h-4 bg-gray-300 mb-4 overflow-hidden border border-gray-800">
          <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500" :style="{ width: progressWidth }"></div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="flex flex-col items-center text-center">
            <span class="text-sm text-gray-600 mb-1">Added</span>
            <span class="text-2xl font-bold text-purple-800">{{ state.syncProgress.added }}</span>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-sm text-gray-600 mb-1">Modified</span>
            <span class="text-2xl font-bold text-purple-800">{{ state.syncProgress.modified }}</span>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-sm text-gray-600 mb-1">Removed</span>
            <span class="text-2xl font-bold text-purple-800">{{ state.syncProgress.removed }}</span>
          </div>
        </div>

        <div class="flex justify-center mb-4">
          <div class="inline-block px-4 py-1 rounded-full text-sm font-medium border-2"
               :class="{
                 'bg-gray-200 border-gray-800 text-gray-800': state.syncProgress.status === 'queued',
                 'bg-blue-100 border-blue-800 text-blue-800': ['syncing', 'in_progress'].includes(state.syncProgress.status),
                 'bg-green-100 border-green-800 text-green-800': state.syncProgress.status === 'completed',
                 'bg-red-100 border-red-800 text-red-800': state.syncProgress.status === 'error'
               }">
            {{ formatStatus(state.syncProgress.status) }}
          </div>
        </div>

        <div v-if="state.error" class="text-center mt-4 text-red-600">
          {{ state.error }}
          <button class="mt-2 px-4 py-2 bg-white border-2 border-red-600 text-red-600 hover:bg-red-100 font-medium shadow-[2px_2px_0px_#a40000]" @click="retrySync">
            Retry Sync
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="state.onboardingStep === 'complete'" class="text-center">
      <h3 class="text-2xl font-bold mb-2 text-purple-800">Setup Complete!</h3>
      <p class="mb-6 text-gray-700">Successfully synced your accounts:</p>
      <div class="mb-6 space-y-4">
        <div class="flex justify-between items-center bg-gray-100 p-4 border-2 border-black shadow-[2px_2px_0px_#000]">
          <span class="text-gray-700">Transactions Added</span>
          <span class="text-xl font-bold text-purple-800">{{ state.syncProgress.added }}</span>
        </div>
        <div class="flex justify-between items-center bg-gray-100 p-4 border-2 border-black shadow-[2px_2px_0px_#000]">
          <span class="text-gray-700">Last Synced</span>
          <span class="text-xl font-bold text-purple-800">{{ formatLastSync }}</span>
        </div>
      </div>
      <button class="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] transition-all duration-200 flex items-center justify-center" @click="router.push('/dashboard')">
        Go to Dashboard <ArrowRight class="ml-2 w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'vue-router';
import { ArrowRight } from 'lucide-vue-next';

const router = useRouter();

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['retry']);

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
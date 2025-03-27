<template>
  <div class="sync-performance-metrics">
    <h3 class="text-lg font-medium mb-2">Sync Performance</h3>
    
    <div v-if="hasMetrics" class="grid grid-cols-2 gap-2 text-sm">
      <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded">
        <div class="text-xs text-gray-500 dark:text-gray-400">Last Sync Duration</div>
        <div class="font-semibold">{{ formatDuration(syncMetrics.lastSyncDuration) }}</div>
      </div>
      
      <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded">
        <div class="text-xs text-gray-500 dark:text-gray-400">Average Sync Time</div>
        <div class="font-semibold">{{ formatDuration(syncMetrics.averageSyncDuration) }}</div>
        <div class="text-xs text-gray-500">
          from {{ syncMetrics.sessionsWithPerformanceData }} sync(s)
        </div>
      </div>
      
      <div v-if="syncMetrics.lastSuccessfulSync" class="col-span-2 bg-gray-100 dark:bg-gray-800 p-3 rounded">
        <div class="text-xs text-gray-500 dark:text-gray-400">Last Successful Sync</div>
        <div class="font-semibold">{{ formatLastSuccessfulSyncTime }}</div>
        <div v-if="syncMetrics.lastSuccessfulSync.duration" class="text-xs">
          Completed in {{ formatDuration(syncMetrics.lastSuccessfulSync.duration) }}
        </div>
      </div>
    </div>
    
    <div v-else class="text-sm text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-800 rounded">
      No performance data available yet
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  syncMetrics: {
    type: Object,
    required: true
  },
  formatDuration: {
    type: Function,
    required: true
  }
});

const hasMetrics = computed(() => {
  return props.syncMetrics.lastSyncDuration || 
         props.syncMetrics.averageSyncDuration || 
         props.syncMetrics.lastSuccessfulSync;
});

const formatLastSuccessfulSyncTime = computed(() => {
  if (!props.syncMetrics.lastSuccessfulSync?.timestamp) return 'Unknown';
  
  const date = new Date(props.syncMetrics.lastSuccessfulSync.timestamp);
  return date.toLocaleString();
});
</script> 
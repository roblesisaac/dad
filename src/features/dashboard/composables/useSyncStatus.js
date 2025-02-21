import { ref, computed } from 'vue';
import { useApi } from '@/shared/composables/useApi';

export function useSyncStatus() {
  const api = useApi();
  const syncStatus = ref('idle');
  const syncProgress = ref(0);
  const syncError = ref(null);

  const isSyncing = computed(() => syncStatus.value === 'syncing');
  const isComplete = computed(() => syncStatus.value === 'complete');
  const hasFailed = computed(() => syncStatus.value === 'failed');

  const startSync = async (itemId) => {
    try {
      syncStatus.value = 'syncing';
      syncProgress.value = 0;

      // Poll for sync status
      const pollStatus = async () => {
        const response = await api.get(`plaid/onboarding/status/${itemId}`);
        
        if (response.error) {
          throw new Error(response.error);
        }

        // Update progress based on sync data
        if (response.progress) {
          const { added = 0, modified = 0, removed = 0 } = response.progress;
          syncProgress.value = Math.min(
            ((added + modified + removed) / Math.max(added + modified + removed, 1)) * 100,
            99
          );
        }

        if (response.completed) {
          syncStatus.value = 'complete';
          syncProgress.value = 100;
          return;
        }

        if (response.error) {
          throw new Error(response.error);
        }

        // Continue polling
        setTimeout(pollStatus, 2000);
      };

      await pollStatus();
    } catch (err) {
      syncStatus.value = 'failed';
      syncError.value = err.message;
    }
  };

  return {
    syncStatus,
    syncProgress,
    syncError,
    isSyncing,
    isComplete,
    hasFailed,
    startSync
  };
} 
import { reactive, ref } from 'vue';
import { useApi } from '@/shared/composables/useApi';
import { useRouter } from 'vue-router';
import { useSyncStatus } from './useSyncStatus';

export function usePlaidIntegration() {
  const api = useApi();
  const router = useRouter();
  const isConnecting = ref(false);
  const error = ref(null);

  const state = reactive({
    syncedItems: [],
    hasItems: false,
    loading: false,
    isOnboarding: false,
    onboardingStep: 'connect' // 'connect', 'syncing', 'complete'
  });

  const { checkSyncStatus } = useSyncStatus(api, state);

  function getErrorMessage(error) {
    const errorMessages = {
      'ITEM_LOGIN_REQUIRED': 'Your login information needs to be updated',
      'INVALID_CREDENTIALS': 'The provided credentials are no longer valid',
      'INVALID_MFA': 'Additional authentication required',
      'DEFAULT': 'There was an issue connecting to this account'
    };

    return errorMessages[error] || errorMessages.DEFAULT;
  }

  function createPlaidLink(token) {
    if (!token) {
      console.error('No token provided to createPlaidLink');
      error.value = 'Configuration error. Please contact support.';
      return null;
    }

    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        try {
          state.loading = true;
          error.value = null;
          
          await handlePlaidSuccess(publicToken);
        } catch (error) {
          console.error('Error completing connection:', error);
          error.value = 'Failed to complete connection. Please try again.';
        } finally {
          state.loading = false;
        }
      },
      onExit: function(err, metadata) {
        state.loading = false;
        if (err != null) {
          error.value = 'Connection process was interrupted. Please try again.';
          console.error('Link exit error:', err, metadata);
        } else if (metadata.status === 'requires_credentials') {
          error.value = null;
        }
      },
      onEvent: function(eventName, metadata) {
        // Log events for debugging
        // console.log('Link event:', eventName, metadata);
      },
    });
  }

  async function syncItems() {
    try {
      const response = await api.get('plaid/sync/items');
      state.syncedItems = response;
      state.hasItems = response?.length > 0;
      return response;
    } catch (error) {
      error.value = 'Failed to fetch account status. Please refresh the page.';
      console.error('Sync error:', error);
      return [];
    }
  }

  async function initializePlaid() {
    try {
      isConnecting.value = true;
      const { link_token } = await api.post('plaid/connect/link');
      return link_token;
    } catch (err) {
      error.value = 'Failed to initialize Plaid connection';
      throw err;
    } finally {
      isConnecting.value = false;
    }
  }

  async function repairItem(itemId) {
    try {
      state.loading = true;
      error.value = null;
      
      const linkToken = await api.post(`plaid/connect/link/${itemId}`);
      const link = createPlaidLink(linkToken);
      link.open();
    } catch (error) {
      error.value = 'Failed to start reconnection process. Please try again.';
      state.loading = false;
      console.error('Repair initiation error:', error);
    }
  }

  async function startInitialSync(itemId) {
    try {
      await api.post(`plaid/onboarding/sync/${itemId}`);
      router.push('/onboarding');
      await checkSyncStatus(); // Start monitoring sync status
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  async function connectBank() {
    try {
      state.loading = true;
      error.value = null;
      state.isOnboarding = true;
      state.onboardingStep = 'connect';
      
      const { link_token } = await api.post('plaid/connect/link');
      
      if (!link_token) {
        throw new Error('No link token received from server');
      }

      const link = createPlaidLink(link_token);
      link.open();
    } catch (error) {
      console.error('Connection initiation error:', error);
      handleConnectionError(error);
    } finally {
      state.loading = false;
    }
  }

  async function handlePlaidSuccess(publicToken) {
    try {
      state.loading = true;
      error.value = null;

      const response = await api.post('plaid/exchange/token', { publicToken });
      
      if (response.error) {
        throw new Error(response.error);
      }

      const { itemId } = response.data;
      state.onboardingStep = 'syncing';

      // Start the initial sync
      await api.post(`plaid/onboarding/sync/${itemId}`);
      
      return { itemId };
    } catch (err) {
      error.value = 'Failed to complete bank connection';
      throw err;
    } finally {
      state.loading = false;
    }
  }

  async function pollSyncStatus(itemId) {
    const maxAttempts = 50; // 5 minutes maximum
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await api.get(`plaid/onboarding/status/${itemId}`);
        
        // Update progress in state with more detailed information
        if (status.progress) {
          state.syncProgress = {
            added: status.progress.added || 0,
            modified: status.progress.modified || 0,
            removed: status.progress.removed || 0,
            status: status.status || 'queued',
            lastSync: status.progress.lastSync,
            nextSync: status.progress.nextSync,
            cursor: status.progress.cursor
          };
        }

        if (status.error) {
          throw new Error(status.error);
        }

        if (status.completed) {
          return status;
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

      } catch (error) {
        console.error('Polling error:', error);
        throw new Error(getErrorMessage(error));
      }
    }

    throw new Error('SYNC_TIMEOUT: Initial sync took too long');
  }

  return {
    state,
    getErrorMessage,
    initializePlaid,
    repairItem,
    connectBank,
    syncItems,
    checkSyncStatus,
    isConnecting,
    error
  };
} 
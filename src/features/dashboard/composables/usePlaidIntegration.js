import { reactive } from 'vue';
import { useApi } from '@/shared/composables/useApi';

export function usePlaidIntegration() {
  const api = useApi();
  
  const state = reactive({
    syncedItems: [],
    isRepairing: false,
    error: null,
    hasItems: false,
    loading: false,
    isOnboarding: false,
    onboardingStep: 'connect', // 'connect', 'syncing', 'complete'
    syncProgress: {
      added: 0,
      modified: 0,
      removed: 0,
      status: null
    }
  });

  function getErrorMessage(error) {
    const errorMessages = {
      'ITEM_LOGIN_REQUIRED': 'Your login information needs to be updated',
      'INVALID_CREDENTIALS': 'The provided credentials are no longer valid',
      'INVALID_MFA': 'Additional authentication required',
      'DEFAULT': 'There was an issue connecting to this account'
    };

    return errorMessages[error] || errorMessages.DEFAULT;
  }

  function createPlaidLink(token, onSuccess) {
    if (!token) {
      console.error('No token provided to createPlaidLink');
      state.error = 'Configuration error. Please contact support.';
      return null;
    }

    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        try {
          state.isRepairing = true;
          state.error = null;
          
          await handlePlaidSuccess(publicToken);
        } catch (error) {
          console.error('Error completing connection:', error);
          state.error = 'Failed to complete connection. Please try again.';
        } finally {
          state.isRepairing = false;
        }
      },
      onExit: function(err, metadata) {
        state.isRepairing = false;
        if (err != null) {
          state.error = 'Connection process was interrupted. Please try again.';
          console.error('Link exit error:', err, metadata);
        } else if (metadata.status === 'requires_credentials') {
          state.error = null;
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
      state.error = 'Failed to fetch account status. Please refresh the page.';
      console.error('Sync error:', error);
      return [];
    }
  }

  async function initializePlaid() {
    try {
      const items = await api.get('plaid/items');
      state.syncedItems = items;
      state.hasItems = items?.length > 0;
    } catch (err) {
      console.error('Error fetching items:', err);
      state.hasItems = false;
    }
  }

  async function repairItem(itemId) {
    try {
      state.isRepairing = true;
      state.error = null;
      
      const linkToken = await api.post(`plaid/connect/link/${itemId}`);
      const link = createPlaidLink(linkToken);
      link.open();
    } catch (error) {
      state.error = 'Failed to start reconnection process. Please try again.';
      state.isRepairing = false;
      console.error('Repair initiation error:', error);
    }
  }

  async function startInitialSync(itemId) {
    try {
      await api.post(`plaid/onboarding/sync/${itemId}`);
      
      const checkSyncStatus = async () => {
        const status = await api.get(`plaid/onboarding/status/${itemId}`);
        if (status.completed) {
          state.onboardingStep = 'complete';
          console.log('Initial sync completed');
        } else if (status.error) {
          throw new Error(status.error);
        } else {
          setTimeout(checkSyncStatus, 2000);
        }
      };

      await checkSyncStatus();
    } catch (error) {
      console.error('Sync error:', error);
      state.error = 'Error syncing your account. Please try again.';
      state.onboardingStep = 'connect';
    }
  }

  async function connectBank() {
    try {
      state.loading = true;
      state.error = null;
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
      state.error = null;

      // Exchange token and start sync
      const response = await api.post('plaid/exchange/token', {
        publicToken
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const { itemId } = response.data;

      // Start polling for sync status
      state.onboardingStep = 'syncing';
      await pollSyncStatus(itemId);

      // Update state after successful sync
      state.onboardingStep = 'complete';
      state.hasItems = true;
      
      console.log('Initial sync completed');

    } catch (error) {
      console.error('Error completing connection:', error);
      state.error = getErrorMessage(error);
      state.onboardingStep = 'connect';
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
        
        // Update progress in state
        if (status.progress) {
          state.syncProgress = {
            ...status.progress,
            status: status.status
          };
        }

        if (status.error) {
          throw new Error(status.error);
        }

        if (status.completed) {
          return status;
        }

        // Wait 10 seconds before next poll
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
    syncItems
  };
} 
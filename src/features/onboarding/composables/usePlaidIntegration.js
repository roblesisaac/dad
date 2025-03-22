import { reactive, onMounted } from 'vue';
import { useApi } from '@/shared/composables/useApi';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import loadScript from '@/shared/utils/loadScript';

// Load Plaid script
const loadPlaidScript = async () => {
  if (window.Plaid) {
    return;
  }

  await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');
};

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
      status: null,
      lastSync: null,
      nextSync: null,
      cursor: null,
      branchNumber: 0
    },
    blueBar: {
      message: null,
      loading: false
    }
  });

  // Use our unified composable directly
  const { syncLatestTransactionsForBank, syncLatestTransactionsForAllBanks } = usePlaidSync(api, state);

  // Initialize Plaid on component mount
  onMounted(async () => {
    try {
      await loadPlaidScript();
    } catch (error) {
      console.error('Failed to load Plaid:', error);
      state.error = 'Failed to initialize banking connection. Please try again.';
    }
  });

  // Replacement for checkSyncStatus that uses our direct sync methods
  async function resyncTransactions(itemId = null) {
    try {
      state.error = null;
      state.blueBar.message = itemId 
        ? 'Resyncing transaction data for account...'
        : 'Resyncing transaction data for all accounts...';
      state.blueBar.loading = true;
      
      // If an itemId is provided, sync that specific bank
      // Otherwise, sync all banks
      const result = itemId 
        ? await syncLatestTransactionsForBank(itemId)
        : await syncLatestTransactionsForAllBanks();
      
      return result;
    } catch (error) {
      console.error('Error resyncing transactions:', error);
      state.error = 'Failed to sync transactions. Please try again.';
      state.blueBar.loading = false;
      state.blueBar.message = 'Sync failed. Please try again.';
      return { completed: false, error: error.message };
    }
  }

  function handleConnectionError(error) {
    state.error = error.message || 'Failed to establish connection. Please try again.';
    state.loading = false;
    state.isOnboarding = false;
    console.error('Connection error:', error);
  }

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
      state.error = 'Configuration error. Please contact support.';
      return null;
    }

    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        try {
          state.isRepairing = true;
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
      handleConnectionError(error);
    } finally {
      state.loading = false;
    }
  }

  async function handlePlaidSuccess(publicToken) {
    try {
      state.loading = true;
      state.error = null;
      state.onboardingStep = 'syncing';

      // Exchange token
      const response = await api.post('plaid/exchange/token', {
        publicToken
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Fix: response.data contains the itemId
      const { itemId } = response.data || response;

      // Sync transactions for the newly connected bank
      const syncResult = await syncLatestTransactionsForBank(itemId);

      if (syncResult && syncResult.completed) {
        // Update state after successful sync
        state.onboardingStep = 'complete';
        state.hasItems = true;
        console.log('Sync completed successfully:', syncResult);

        // Render the 'Go to Dashboard' button
        return;
      }

      // If sync encountered an error
      if (syncResult.error) {
        state.error = `Sync error: ${syncResult.error}`;
        console.error('Sync failed:', syncResult.error);
        return;
      }

      console.log('Sync result:', syncResult);
    } catch (error) {
      state.error = getErrorMessage(error);
      state.onboardingStep = 'connect';
    } finally {
      state.loading = false;
    }
  }

  return {
    state,
    getErrorMessage,
    initializePlaid,
    repairItem,
    connectBank,
    syncItems,
    resyncTransactions
  };
} 
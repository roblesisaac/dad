import { reactive } from 'vue';
import { useApi } from '@/shared/composables/useApi';

export function usePlaidIntegration() {
  const api = useApi();
  
  const state = reactive({
    syncedItems: [],
    isRepairing: false,
    error: null,
    hasItems: false,
    loading: false
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
    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        try {
          state.isRepairing = true;
          state.error = null;
          
          await api.post('plaid/exchange/token', { publicToken });
          
          if (onSuccess) {
            await onSuccess();
          }
          
          // Refresh the items list
          await syncItems();
        } catch (error) {
          state.error = 'Failed to complete reconnection. Please try again.';
          console.error('Error completing repair:', error);
        } finally {
          state.isRepairing = false;
        }
      },
      onExit: function(err, metadata) {
        state.isRepairing = false;
        if (err) {
          state.error = 'Connection process was interrupted. Please try again.';
        }
        console.log('Link exit:', { err, metadata });
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

  async function connectBank() {
    try {
      state.loading = true;
      state.error = null;
      
      const linkToken = await api.post('plaid/connect/link');
      const link = createPlaidLink(linkToken);
      link.open();
    } catch (error) {
      state.error = 'Failed to start connection process. Please try again.';
      console.error('Connection initiation error:', error);
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
    syncItems
  };
} 
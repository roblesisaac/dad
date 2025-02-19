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
          
          const response = await api.post('plaid/exchange/token', { 
            publicToken,
            // Add any additional required data here
          });
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          if (onSuccess) {
            await onSuccess();
          }
          
          await syncItems();
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
          // Handle exit errors
          state.error = 'Connection process was interrupted. Please try again.';
          console.error('Link exit error:', err, metadata);
        } else if (metadata.status === 'requires_credentials') {
          state.error = null; // User closed modal, no error needed
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

  async function connectBank() {
    try {
      state.loading = true;
      state.error = null;
      
      const { link_token } = await api.post('plaid/connect/link');
      
      if (!link_token) {
        throw new Error('No link token received from server');
      }

      const link = createPlaidLink(link_token);

      link.open();
    } catch (error) {
      console.error('Connection initiation error:', error);
      
      // Handle different types of errors
      if (error.response?.data?.error === 'PLAID_ERROR') {
        state.error = 'Unable to connect to banking services. Please try again later.';
      } else if (error.response?.status === 400) {
        state.error = error.response.data.message || 'Invalid request. Please try again.';
      } else if (error.message === 'No link token received from server') {
        state.error = 'Server configuration error. Please contact support.';
      } else {
        state.error = 'Failed to start connection process. Please try again.';
      }
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
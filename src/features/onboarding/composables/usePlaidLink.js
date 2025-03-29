import { ref } from 'vue';
import { useApi } from '@/shared/composables/useApi.js';

export function usePlaidLink() {
  const api = useApi();
  const loading = ref(false);
  const error = ref(null);
  
  /**
   * Create a Plaid Link token
   * @param {string|null} itemId - Optional itemId for reconnection flows
   * @returns {Promise<string>} - The link token
   */
  const createLinkToken = async (itemId = null) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Use the correct endpoint from plaid.js routes
      const endpoint = `plaid/connect/link${itemId ? `/${itemId}` : ''}`;
      
      const response = await api.post(endpoint);
      
      if (!response?.link_token) {
        throw new Error('No link token received from server');
      }
      
      return response.link_token;
    } catch (err) {
      error.value = err.message || 'Failed to create link token';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Exchange a public token for an access token
   * @param {Object} data - Exchange data
   * @param {string} data.publicToken - The public token from Plaid
   * @param {Object} data.metadata - Metadata from Plaid Link
   * @param {string|null} data.itemId - Optional itemId for reconnection flows
   * @returns {Promise<Object>} - The exchange result
   */
  const exchangePublicToken = async ({ publicToken, metadata, itemId = null }) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Use different endpoints based on whether this is a reconnection
      const endpoint = 'plaid/exchange/token';
      
      const response = await api.post(endpoint, {
        public_token: publicToken,
        metadata,
        item_id: itemId
      });

      console.log('response', response);
      
      if (!response) {
        throw new Error('No response received from server');
      }
      
      return response;
    } catch (err) {
      console.error('Token exchange error:', err);
      error.value = err.message || 'Failed to exchange public token';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Initialize and open Plaid Link
   * @param {string} token - Link token
   * @param {Function} onSuccess - Success callback
   * @param {Function} onExit - Exit callback
   * @param {Function} onError - Error callback
   */
  const openPlaidLink = async (token, { onSuccess, onExit, onError }) => {
    try {
      // Load Plaid Link script if not already loaded
      if (!window.Plaid) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      // Create and open Plaid Link
      const handler = window.Plaid.create({
        token,
        onSuccess: (public_token, metadata) => {
          if (onSuccess) onSuccess(public_token, metadata);
        },
        onExit: (err, metadata) => {
          if (err && onError) {
            onError(err);
          } else if (onExit) {
            onExit(metadata);
          }
        },
        onLoad: () => {
          // Plaid Link loaded
        },
        receivedRedirectUri: null,
      });
      
      handler.open();
      
      return handler;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  };

  return {
    loading,
    error,
    createLinkToken,
    exchangePublicToken,
    openPlaidLink
  };
} 
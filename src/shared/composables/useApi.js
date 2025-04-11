import { useAuth } from './useAuth';
import { useNotifications } from '@/shared/composables/useNotifications';
import { ref } from 'vue';

const API_URL = `${window.location.origin}/api`;

export function useApi() {
  // Make these reactive for component usage
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const { getToken } = useAuth();
  const { showError, showWarning } = useNotifications();

  async function request(method, url, body = null, settings = {}) {
    loading.value = true;

    const auth0Token = await getToken();
    try {
      const baseUrl = settings.baseUrl || API_URL;
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;

      const headers = {
        ...settings.headers
      };

      if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (auth0Token) {
        headers.Authorization = `Bearer ${auth0Token}`;
      }

      const response = await fetch(normalizedBaseUrl + normalizedUrl, {
        method,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
        headers
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        // Handle both 400 and 500 errors
        const error = new Error(responseData?.message || 'API Request Failed');
        error.response = {
          status: response.status,
          data: responseData
        };
        throw error;
      }

      data.value = responseData;
      return responseData;
    } catch (err) {
      error.value = err;
      console.error('Request error:', err);
      console.log('Error response:', err.response);

      // Handle different error types using the helper functions
      if (err.name === 'AbortError') {
        showError('Request timed out. Please try again.');
      } else if (!navigator.onLine) {
        showWarning('No internet connection. Please check your network.');
      } else {
        showError(err.response?.data?.message || err.message);
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Helper method for retrying failed requests
  async function retryRequest(...args) {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        return await request(...args);
      } catch (err) {
        attempts++;
        if (attempts === maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  return {
    data,
    loading,
    error,
    get: (url, settings) => request('GET', url, null, settings),
    post: (url, body, settings) => request('POST', url, body, settings),
    put: (url, body, settings) => request('PUT', url, body, settings),
    patch: (url, body, settings) => request('PATCH', url, body, settings),
    delete: (url, body, settings) => request('DELETE', url, body, settings),
    retry: retryRequest
  };
}

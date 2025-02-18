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
  const { notify } = useNotifications();

  async function request(method, url, body = null, settings = {}) {
    loading.value = true;
    error.value = null;

    const auth0Token = await getToken();
    try {
      const baseUrl = settings.baseUrl || API_URL;
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;

      const headers = {
        ...settings.headers
      };

      // Only set Content-Type to application/json if body is not FormData
      if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (auth0Token) {
        headers.Authorization = `Bearer ${auth0Token}`;
      }

      const controller = new AbortController();
      const timeout = settings.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(normalizedBaseUrl + normalizedUrl, {
        method,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || responseData || 'API Request Failed';
        if (response.status === 401) {
          // Handle auth errors specifically
          notify({
            message: 'Your session has expired. Please log in again.',
            type: 'WARNING'
          });
        }
        throw new Error(errorMessage);
      }

      data.value = responseData;
      return responseData;
    } catch (err) {
      error.value = err;
      console.error('Request error:', err);

      // Handle different error types
      if (err.name === 'AbortError') {
        notify({
          message: 'Request timed out. Please try again.',
          type: 'ERROR'
        });
      } else if (!navigator.onLine) {
        notify({
          message: 'No internet connection. Please check your network.',
          type: 'WARNING'
        });
      } else {
        notify({
          message: err.message,
          type: 'ERROR'
        });
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
    remove: (url, body, settings) => request('DELETE', url, body, settings),
    retry: retryRequest
  };
}

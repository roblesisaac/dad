import { useAuth } from './useAuth';
const API_URL = `${window.location.origin}/api`;
import { useNotifications } from '@/shared/composables/useNotifications';

export function useApi() {
  let data = null;
  let loading = false;

  const { getToken } = useAuth();
  const { notify } = useNotifications();

  async function request(method, url, body = null, settings = {}) {
    loading = true;

    const auth0Token = await getToken();
    try {
      const baseUrl = settings.baseUrl || API_URL;
      url = removeStartingSlash(url);

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

      const response = await fetch(baseUrl + url, {
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
        const errorMessage = responseData?.message || responseData?.error || responseData || 'API Request Failed';
        throw new Error(errorMessage);
      }

      data = responseData;
      return responseData;
    } catch (err) {
      console.error('Request error:', err);
      const error = err;
      notify({
        message: error.message,
        type: 'ERROR'
      });
      throw error;
    } finally {
      loading = false;
    }
  }

  function removeStartingSlash(url) {
    return url.startsWith('/') ? url.slice(1) : url;
  }

  return {
    data,
    loading,
    get: (url, settings) => request('GET', url, null, settings),
    post: (url, body, settings) => request('POST', url, body, settings),
    put: (url, body, settings) => request('PUT', url, body, settings),
    patch: (url, body, settings) => request('PATCH', url, body, settings),
    remove: (url, body, settings) => request('DELETE', url, body, settings)
  };
}

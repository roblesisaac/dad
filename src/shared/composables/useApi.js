import { useAuth } from './useAuth';
import { useNotifications } from '@/shared/composables/useNotifications';

const API_URL = `${window.location.origin}/api`;
const TIMEOUT = 30000; // 30 seconds

export function useApi() {
  const { getToken, logout } = useAuth();
  const { notify } = useNotifications();

  async function handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      
      if (data?.error && data?.message) {
        errorMessage = data.message;
      } else if (response.status === 401) {
        errorMessage = 'Please log in again';
        logout();
      } else if (response.status === 403) {
        errorMessage = 'You don\'t have permission to perform this action';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later';
      }

      notify({
        type: 'error',
        message: errorMessage
      });

      const error = new Error(errorMessage);
      error.response = { data, status: response.status };
      throw error;
    }

    return data;
  }

  async function request(url, options = {}) {
    try {
      const token = getToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      };

      const response = await fetch(`${API_URL}/${url}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        notify({
          type: 'error',
          message: 'Request timed out. Please try again.'
        });
        throw new Error('Request timed out');
      }

      if (!error.response) {
        // Network error
        notify({
          type: 'error',
          message: 'Unable to connect to server. Please check your internet connection.'
        });
        error.message = 'Unable to connect to server. Please check your internet connection.';
      }
      throw error;
    }
  }

  return {
    get: (url, config = {}) => 
      request(url, { 
        method: 'GET',
        ...config 
      }),

    post: (url, data, config = {}) => 
      request(url, {
        method: 'POST',
        body: JSON.stringify(data),
        ...config
      }),

    put: (url, data, config = {}) => 
      request(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        ...config
      }),

    delete: (url, config = {}) => 
      request(url, {
        method: 'DELETE',
        ...config
      })
  };
}

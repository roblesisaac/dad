import { useAuth0 } from '@auth0/auth0-vue';
import { ref, computed, watch } from 'vue';

export function useAuth() {
  // Create a separate local loading state
  const authInitialized = ref(false);
  const isLoading = ref(false);
  const error = ref(null);
  
  // Get Auth0 hooks - add a try/catch for safety
  let auth0Instance;
  try {
    auth0Instance = useAuth0();
  } catch (e) {
    console.error('Failed to initialize Auth0 hook:', e);
    error.value = e;
  }
  
  // Safely extract Auth0 methods with fallbacks
  const { 
    loginWithRedirect = () => {}, 
    logout = () => {}, 
    user = ref(null), 
    handleRedirectCallback = async () => {},
    isAuthenticated = ref(false), 
    getAccessTokenSilently = async () => null,
    isLoading: auth0IsLoading = ref(false)
  } = auth0Instance || {};

  const userProfile = computed(() => {
    if (!user.value) return undefined;
    
    const roles = user.value[`${import.meta.env.VITE_ZERO_AUDIENCE}/roles`] || [];
    const metadata = user.value[`${import.meta.env.VITE_ZERO_AUDIENCE}/user_metadata`] || {};
    return {
      ...user.value,
      roles,
      isAdmin: roles.includes('admin'),
      metadata
    };
  });
  
  const isAuthed = computed(() => isAuthenticated.value);

  const login = async () => {
    try {
      isLoading.value = true;
      await loginWithRedirect();
    } catch (e) {
      error.value = e;
    } finally {
      isLoading.value = false;
    }
  };

  const logoutUser = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const waitUntilInitialized = async () => {
    // If we couldn't even get the Auth0 instance, wait and retry once
    if (!auth0Instance) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        auth0Instance = useAuth0();
        // If we still can't get it, throw an error
        if (!auth0Instance) {
          throw new Error('Auth0 context not available');
        }
      } catch (e) {
        console.error('Auth0 initialization failed after retry:', e);
        throw e;
      }
    }
    
    // Wait for Auth0 loading to complete
    if (auth0IsLoading.value) {
      await new Promise((resolve) => {
        const unwatch = watch(
          () => auth0IsLoading.value,
          (loading) => {
            if (!loading) {
              authInitialized.value = true;
              unwatch();
              resolve();
            }
          },
          { immediate: true }
        );
        
        // Add a timeout to prevent infinite waiting
        setTimeout(() => {
          if (!authInitialized.value) {
            unwatch();
            console.warn('Auth0 initialization timed out, proceeding anyway');
            authInitialized.value = true;
            resolve();
          }
        }, 5000);
      });
    } else {
      authInitialized.value = true;
    }
  };

  const getToken = async () => {
    try {
      await waitUntilInitialized();
      
      // Extra safety check
      if (!getAccessTokenSilently) {
        console.error('getAccessTokenSilently is not available');
        return null;
      }
      
      return isAuthenticated.value ? await getAccessTokenSilently({
        authorizationParams: {
          scope: 'openid profile email manage:users update:user_roles',
        }
      }) : null;
    } catch (e) {
      console.error('Error getting token:', e);
      error.value = e;
      return null;
    }
  };

  return {
    login,
    logoutUser,
    handleRedirectCallback,
    userProfile,
    isAuthed,
    isLoading: computed(() => isLoading.value || auth0IsLoading.value),
    error,
    getToken,
    waitUntilInitialized
  };
}
import { useAuth0 } from '@auth0/auth0-vue';
import { ref, computed, watch } from 'vue';

export function useAuth() {
  const { 
    loginWithRedirect, 
    logout, 
    user, 
    handleRedirectCallback,
    isAuthenticated, 
    getAccessTokenSilently,
    isLoading: auth0IsLoading
  } = useAuth0();

  const isLoading = ref(false);
  const error = ref(null);

  const userProfile = computed(() => {
    if (!user.value) return undefined;
    
    const roles = user.value[`${import.meta.env.VITE_ZERO_AUDIENCE}/roles`] || [];
    const metadata = user.value[`${import.meta.env.VITE_ZERO_AUDIENCE}/user_metadata`] || {};

    console.log({
      message: 'hi',
      metadata
    });
    
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
    if (auth0IsLoading.value) {
      await new Promise((resolve) => {
        const unwatch = watch(
          () => auth0IsLoading.value,
          (loading) => {
            if (!loading) {
              unwatch();
              resolve();
            }
          },
          { immediate: true }
        );
      });
    }
  };

  const getToken = async () => {
    try {
      await waitUntilInitialized();
      return isAuthenticated.value ? await getAccessTokenSilently() : null;
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
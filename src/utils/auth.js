import { ref } from 'vue'

// Create a reactive auth state
export const isAuthenticated = ref(false)
export const user = ref(null)

// Auth0 configuration
const config = {
  domain: import.meta.env.VITE_ZERO_DOMAIN,
  clientId: import.meta.env.VITE_ZERO_CLIENT_ID,
  audience: import.meta.env.VITE_ZERO_AUDIENCE,
}

export const loginWithAuth0 = async () => {
  const params = new URLSearchParams({
    response_type: 'token id_token',
    client_id: config.clientId,
    redirect_uri: `${window.location.origin}/callback`,
    scope: 'openid profile email',
    audience: config.audience,
  })

  window.location.href = `https://${config.domain}/authorize?${params.toString()}`
} 
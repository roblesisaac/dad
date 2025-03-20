import { createAuth0 } from '@auth0/auth0-vue'

const auth0 = createAuth0({
  domain: import.meta.env.VITE_ZERO_DOMAIN,
  clientId: import.meta.env.VITE_ZERO_CLIENT_ID,
  authorizationParams: {
    redirect_uri: `${window.location.origin}/callback`,
    audience: import.meta.env.VITE_ZERO_AUDIENCE,
    scope: 'openid profile email manage:users update:user_roles',
    response_type: 'token id_token'
  },
  useRefreshTokens: true,
  useRefreshTokensFallback: true
});

export default auth0;
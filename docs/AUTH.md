# Authentication Architecture

This document explains how authentication works in TrackTabs at a practical level.

## TL;DR

- Auth0 handles login, session, token issuance, and user metadata.
- The backend validates Auth0 JWTs on protected routes.
- App data is stored in Ampt (`@ampt/data`) collections and scoped by `userId`.
- There is no active runtime `users` database model in this codebase today.

## Frontend Flow

1. Auth0 is initialized in the Vue app plugin setup.
2. Protected routes use `authGuard` from `@auth0/auth0-vue`.
3. After Auth0 redirects back to `/callback`, the app processes the callback and sends the user to `/dashboard`.
4. API requests fetch an access token with `getAccessTokenSilently()` and send it as `Authorization: Bearer <token>`.

## Backend Flow

1. `checkJWT` validates the bearer token (`issuer`, `audience`, `RS256`).
2. `checkLoggedIn` builds `req.user` from token claims:
   - `sub` from Auth0 token
   - namespaced claims for `email`, `roles`, `user_metadata`, `app_metadata`
   - internal `_id` set to `metadata.legacyId || email`
3. The backend ensures `req.user.encryptedKey` exists:
   - If missing, generate one and write it to Auth0 `user_metadata` using the Management API.
4. Route-level authorization is role-based via `Protect.route(...).<method>()`, using `req.user.roles`.

## Where User Data Lives

### Identity and auth metadata

- Stored in Auth0 (user profile, roles, user/app metadata, subject ID).
- Updated via Auth0 Management API when needed (for `encryptedKey`).

### Application domain data

- Stored in Ampt collections (`plaiditems`, `plaidaccounts`, `plaidgroups`, `plaidtransactions`, `rules`, `tabs`, etc.).
- Records are scoped to a user via `userId` derived from `req.user._id`.

## Important Clarification

- Runtime auth is Auth0-based.
- There are stale references to a local users model in:
  - `api/models/index.js`
  - `api/models/tests/users.test.js`
- But `api/models/users.js` is not present, and current runtime routes/services do not use a local users collection for authentication.

## Environment Variables Used By Auth

### Frontend

- `VITE_ZERO_DOMAIN`
- `VITE_ZERO_CLIENT_ID`
- `VITE_ZERO_AUDIENCE`

### Backend token validation

- `VITE_ZERO_DOMAIN`
- `VITE_ZERO_AUDIENCE`

### Backend Auth0 Management API (metadata updates)

- `ZERO_MGMT_DOMAIN`
- `ZERO_MGMT_CLIENT_ID`
- `ZERO_MGMT_CLIENT_SECRET`

## Key Files

- `src/shared/utils/auth.js`
- `src/shared/composables/useAuth.js`
- `src/shared/composables/useApi.js`
- `src/shared/components/CallbackView.vue`
- `src/router/routes/dashboardRoutes.js`
- `api/middlewares/auth.js`
- `api/middlewares/protect.js`
- `api/services/userService.js`


# Plaid "Revert to this Session" Runtime Flow

This document traces what happens when a user clicks **"Revert to this Session"** in the sync history UI, from frontend event handling through backend router/controller/service logic.

## 1. Frontend Event Flow

1. In `SessionListItem.vue`, clicking the button calls `requestRevert()` and emits `revert` with the full session object.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SessionListItem.vue:219`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SessionListItem.vue:312`

2. `SyncSessionList.vue` listens for `@revert`, stores the session in local state, and opens the confirmation modal.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionList.vue:52`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionList.vue:166`

3. In `ConfirmReversionModal.vue`, clicking **Revert** emits `confirm` with the selected session.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/ConfirmReversionModal.vue:33`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/ConfirmReversionModal.vue:70`

4. `SyncSessionList.vue` handles modal confirm via `confirmRevertSession()`, emits `revert-to-session` upward, and closes the modal.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionList.vue:72`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionList.vue:178`

5. `SyncSessionsModal.vue` handles `@revert-to-session` with `handleRevertToSession(session)`, which calls `useBanks().revertToSession(session)`.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionsModal.vue:38`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/components/SyncSessionsModal.vue:111`

## 2. Frontend Request Construction

1. `useBanks.revertToSession(session)` validates both:
   - selected bank has `itemId`
   - session has `_id`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:156`

2. It sends:
   - `POST plaid/items/${selectedBank.itemId}/revert/${session._id}`
   - No request body
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:165`

3. `useApi.request()` converts that to a full URL under `${window.location.origin}/api`, adds headers, and executes `fetch(...)`:
   - `Content-Type: application/json` (because body is not FormData)
   - `Authorization: Bearer <Auth0 token>` if token exists
   - Source: `/Users/isaacrobles/Documents/code/dad/src/shared/composables/useApi.js:5`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/shared/composables/useApi.js:25`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/shared/composables/useApi.js:37`

Effective HTTP request path:

`POST /api/plaid/items/:itemId/revert/:sessionId`

## 3. Backend Router + Middleware

1. Route is registered in Plaid routes:
   - `member.post('/plaid/items/:itemId/revert/:sessionId', transactionController.revertToSyncSession)`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/routes/plaid.js:26`

2. Plaid routes are mounted with base path `/api`.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/routes/index.js:27`

3. `member` routes run protection middleware stack:
   - `checkJWT` (JWT validation)
   - `checkLoggedIn` (hydrates `req.user`)
   - `permit('member')` (role enforcement)
   - Source: `/Users/isaacrobles/Documents/code/dad/api/middlewares/protect.js:24`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/middlewares/auth.js:12`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/middlewares/auth.js:26`

## 4. Controller Flow

Method: `transactionController.revertToSyncSession(req, res)`
- Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:157`

Execution steps:

1. Read `itemId` and `sessionId` from params, return `400 INVALID_PARAMS` if missing.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:160`

2. Resolve item with `itemService.getItem(itemId, user._id)`, return `404 ITEM_NOT_FOUND` if absent.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:170`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/itemService.js:42`

3. Resolve target session with `syncSessionService.getSyncSession(sessionId, user)`, return `404 SESSION_NOT_FOUND` if absent.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:180`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:230`

4. Verify session belongs to the same item (`targetSession.itemId === itemId`), else `400 INVALID_SESSION`.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:190`

5. Call service layer: `syncSessionService.revertToSyncSession(targetSession, item, user)`.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:198`

6. If service returns success, respond with:
   - `success`, `itemId`, `revertedTo`, `removedCount`, `recoverySession`, `message`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:204`

7. If any unexpected exception bubbles, controller returns `500` with error code/message.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:213`

## 5. Service Flow

Method: `syncSessionService.revertToSyncSession(targetSession, item, user)`
- Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:481`

### 5.1 Remove transactions newer than target session time

1. Calls:
   - `transactionRecoveryService.removeTransactionsAfterSyncTime(item.itemId, user._id, targetSession.syncTime)`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:488`

2. `removeTransactionsAfterSyncTime(...)`:
   - validates params
   - fetches matching transactions by synthetic sync-time key
   - if none found, returns success with `removedCount: 0`
   - otherwise loops and removes each transaction by `transaction_id`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionRecoveryService.js:109`

3. Fetch query path:
   - `_fetchTransactionsAfterSyncTime()` builds `syncTime` query as `>${itemId}:${referenceSyncTime}`
   - then calls `transactionsCrudService.fetchTransactionsBySyncTime(syncTime, userId)`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionRecoveryService.js:88`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionsCrudService.js:103`

4. Removal path:
   - `transactionsCrudService.processRemovedTransactions(...)`
   - `removeTransaction(transactionId, userId)` for each
   - model erase: `plaidTransactions.erase({ transaction_id, userId })`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionsCrudService.js:369`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionsCrudService.js:337`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/transactionsCrudService.js:343`

### 5.2 Create recovery sync session and repoint item

1. Creates a recovery sync session:
   - `createRecoverySyncSession(targetSession, { _id: item.sync_id, syncNumber: targetSession.syncNumber }, revertResult)`
   - marks status `recovery`, `isRecovery: true`, sets new `syncTime` and `syncId`
   - records `recoveryDetails.transactionsRemoved`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:499`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:92`

2. Updates Plaid item to point to this new recovery session:
   - `status: 'complete'`
   - `sync_id: recoverySyncSession._id`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:506`

3. Returns service result:
   - `{ success: true, revertedTo, removedCount, recoverySession }`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:511`

## 6. Frontend Post-Success Refresh

If backend returns `success: true`, `useBanks.revertToSession()` immediately runs:

1. `fetchBanks()` -> `GET /api/plaid/items`
2. `fetchSyncSessions(selectedBank.itemId)` -> `GET /api/plaid/items/:itemId/sync-sessions`

This refreshes both bank state (`sync_id`, status) and sync history UI.

- Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:170`
- Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:40`
- Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:62`

## 7. Error Behavior Summary

1. Frontend request failures throw from `useApi`, trigger notification, and set `error.value.revert`.
   - Source: `/Users/isaacrobles/Documents/code/dad/src/shared/composables/useApi.js:64`
   - Source: `/Users/isaacrobles/Documents/code/dad/src/features/banks/composables/useBanks.js:179`

2. Controller returns explicit domain errors for missing params/item/session/invalid item-session mismatch.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:162`

3. Service-level failures return `success: false` with message; controller converts that into `REVERT_FAILED` and `500`.
   - Source: `/Users/isaacrobles/Documents/code/dad/api/services/plaid/syncSessionService.js:519`
   - Source: `/Users/isaacrobles/Documents/code/dad/api/controllers/plaid/transactionController.js:200`

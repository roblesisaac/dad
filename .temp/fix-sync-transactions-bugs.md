# Fix Sync Transactions Bugs

## Problem

Two bugs were discovered when performing a full sync (empty cursor, ~50k+ expected transactions across ~500 batches):

### Bug 1: Sync sessions do not appear in real-time
When clicking "Sync Now" in the `SyncSessionsModal`, completed sync sessions do not appear in the UI as each batch response comes in. The frontend runs a multi-batch loop (`usePlaidSync.syncLatestTransactionsForBank`) fetching until `hasMore === false`, but the `SyncSessionList` is only refreshed **after** the entire sync completes (`syncSelectedBank` calls `fetchSyncSessions` only after the loop finishes). Each batch creates a new `SyncSession` on the backend, so the UI should show each one as it arrives.

### Bug 2: Full sync stops prematurely (~130 batches instead of ~500)
With an empty cursor (fresh sync), only ~130 batches were fetched instead of the expected ~500. Something in the sync loop or backend logic is causing the sync to terminate early. The likely causes are:

1. **Backend `_getAndLockItem` lock conflict**: Each batch call hits `syncTransactions()` which calls `_getAndLockItem()`. This sets item `status` to `in_progress`. On subsequent batch calls, the `isSyncRecent` check (line 349 of `syncTransactionsService.js`) may detect the item is still `in_progress` with a recent `syncTime` and throw `SYNC_IN_PROGRESS`, causing the frontend to fail and exit the loop.

2. **Frontend `batchResults` vs direct result properties mismatch**: In `usePlaidSync.js` (line 100-105), the frontend reads `result.batchResults` for stats, but that property is only set in the controller response. The actual `added`/`modified`/`removed` counts from the API response are on `result.batchResults`, which is correct. However, the `hasMore` is read from `result.hasMore` (line 132) — this comes from `syncTransactionsService._buildSyncResponse` which sets `hasMore: syncResult.hasMore`. If `_handleNoChangesCase` is reached on any batch (which returns `hasMore: plaidData.has_more`), the `noChanges: true` path returns early with the wrong `hasMore` value (from Plaid's raw `has_more`), potentially stopping the loop.

3. **Item status not released between batches**: `_updateItemAfterSync` sets item status back to `complete` or `error`, but `_getAndLockItem` is called at the start of each batch. If a previous batch set status to `complete` and the new batch arrives quickly, it should work. But if it set status to `error` (due to count mismatch or failures), subsequent calls to `_getAndLockItem` will find `status !== 'in_progress'`, pass the lock check, then re-lock. However, `isRecoveryNeeded` (syncSessionService line 354) checks `item.status === 'error'` and would trigger recovery mode instead of continuing normal sync — potentially eating batches in recovery loops.

4. **Controller response missing `recovery` field mapping**: In `transactionController.js` (line 75), the controller checks `syncResult.recoveryPerformed` but `_buildRecoveryResponse` returns `{ recovery: { performed: true } }` — so `syncResult.recovery.performed` exists but `syncResult.recoveryPerformed` does not. This means the frontend never gets the `recovery` flag set, and `result?.recovery?.performed` in `usePlaidSync.js` line 63 would never trigger, potentially causing the frontend to mishandle recovery responses.

## Plan

### Part 1: Real-time sync session display
- Modify `usePlaidSync.syncLatestTransactionsForBank` to emit/callback after each batch completes so that `useBanks.syncSelectedBank` can refresh the sync session list incrementally.
- Either pass a callback to `syncLatestTransactionsForBank` or have `syncSelectedBank` poll/refresh sync sessions after each batch.
- The simplest approach: have `syncLatestTransactionsForBank` accept an `onBatchComplete` callback, and in `useBanks.syncSelectedBank`, pass a callback that calls `fetchSyncSessions(itemId)` to refresh the list.

### Part 2: Fix premature sync termination
- Audit the `_getAndLockItem` logic to ensure repeated batch calls from the same client don't get blocked by `SYNC_IN_PROGRESS`.
- Fix the `recovery.performed` property path mismatch between `_buildRecoveryResponse` and `transactionController`.
- Ensure `_handleNoChangesCase` returns the correct response shape so the frontend loop doesn't break.
- Trace the full loop to ensure `hasMore` is correctly propagated end-to-end.

## Tasks

- [x] 1. **Investigate the `SYNC_IN_PROGRESS` lock issue**: Traced the full flow. The lock itself is NOT the primary issue — for successful batches, `_updateItemAfterSync` sets status back to `complete`, so the next batch passes the lock check. **The real problem is Task 4** — when counts don't match, status is set to `error`, which triggers recovery on the next batch. See Task 4 fix.
  > **Finding**: `_getAndLockItem` is fine for sequential calls. The `isSyncRecent` check only fires when `status === 'in_progress'`, and each batch sets status back to `complete` on success. No code change needed here; the fix is in `_updateItemAfterSync` (Task 4).

- [x] 2. **Fix the `recoveryPerformed` property mismatch**: Fixed in `transactionController.js`. Changed `syncResult.recoveryPerformed` → `syncResult.recovery?.performed` and forward the entire `syncResult.recovery` object instead of manually reconstructing it.
  > **File changed**: `api/controllers/plaid/transactionController.js` (line 75)

- [x] 3. **Audit `_handleNoChangesCase` response shape**: Audited — this path is reached only when `!hasChanges && prevSyncSession`. During a fresh sync (empty cursor), every batch should have transactions, so this path is unlikely to fire. The `hasMore: plaidData.has_more` is correct (it's the raw Plaid value). No change needed.
  > **Finding**: The `_handleNoChangesCase` correctly releases the lock (`status: 'complete'`) and returns the right `hasMore`. This is not a contributor to premature termination.

- [x] 4. **Ensure `_updateItemAfterSync` doesn't set `error` status prematurely**: **This was the primary bug.** Fixed by adding `hasMore` parameter. When `hasMore === true` (mid-sync), status is always set to `complete` and `sync_id` is always updated, preventing recovery cascades. Error status is only set on the final batch.
  > **File changed**: `api/services/plaid/syncTransactionsService.js` — `_updateItemAfterSync` now accepts `hasMore` param, and the call site passes `syncResult.hasMore`.

- [x] 5. **Add `onBatchComplete` callback to `syncLatestTransactionsForBank`**: Added optional `{ onBatchComplete }` options parameter. After each successful batch (after processing transactions and updating progress), the callback is awaited. Errors in the callback are caught and logged to avoid breaking the sync loop.
  > **File changed**: `src/shared/composables/usePlaidSync.js` — signature changed to `syncLatestTransactionsForBank(itemId, { onBatchComplete } = {})`

- [x] 6. **Wire up real-time session refresh in `useBanks.syncSelectedBank`**: Passes `onBatchComplete` callback that calls `fetchSyncSessions(itemId)` to refresh the session list after each batch.
  > **File changed**: `src/features/banks/composables/useBanks.js` — `syncSelectedBank` now passes callback to `syncLatestTransactionsForBank`

- [ ] 7. **Test real-time session display**: Reset cursor to empty, click "Sync Now", and verify that `SyncSessionList` updates with each new session as batches complete. Sessions should appear one by one as responses arrive.

- [ ] 8. **Test full sync completion**: Reset cursor to empty and run a full sync. Verify that all ~500 batches complete without premature termination. Monitor the console for `SYNC_IN_PROGRESS` errors, unexpected recovery triggers, or other errors that would cause the loop to exit early.

## Key Files

| File | Role |
|------|------|
| `src/shared/composables/usePlaidSync.js` | Frontend sync loop — runs multi-batch fetch |
| `src/features/banks/composables/useBanks.js` | Orchestrates sync + session refresh |
| `src/features/banks/components/SyncSessionsModal.vue` | UI — triggers sync, displays sessions |
| `src/features/banks/components/SyncSessionList.vue` | UI — renders session list |
| `api/services/plaid/syncTransactionsService.js` | Backend — core sync logic per batch |
| `api/services/plaid/syncSessionService.js` | Backend — sync session CRUD |
| `api/controllers/plaid/transactionController.js` | Backend — API endpoint handler |
| `api/services/plaid/plaidService.js` | Backend — Plaid API wrapper |

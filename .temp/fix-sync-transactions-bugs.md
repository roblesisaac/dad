# Fix Sync Transactions Bugs

## Problem

Multiple bugs found in the transaction sync flow spanning both frontend (`usePlaidSync.js`) and backend (`syncSessionService.js`, `syncTransactionsService.js`).

### Bug 1: `isSyncRecent` crashes — sync lock is never enforced

`syncSessionService.isSyncRecent(item)` (line 295) calls `this.getSyncSession(item.sync_id)` with **only 1 argument**. But `getSyncSession(sync_id, user)` accesses `user._id` on line 242, which throws `TypeError: Cannot read properties of undefined (reading '_id')`. The error is caught and returns `null`, so `isSyncRecent` always returns `false`.

**Impact:** The sync lock in `_getAndLockItem` (syncTransactionsService.js:349) never blocks concurrent syncs. Two simultaneous sync requests for the same item will both proceed, potentially causing duplicate transactions or data corruption.

- File: `api/services/plaid/syncSessionService.js:295-297`
- Called from: `api/services/plaid/syncTransactionsService.js:349`

### Bug 2: `isSyncing` never reset to `false` on success path

In `usePlaidSync.js`, `isSyncing.value = true` is set on line 37. On the **error** path (line 187), it's correctly set back to `false`. But on the **success** path (lines 153-174), `isSyncing` is **never reset**. It only gets cleared when the component unmounts (line 354) or if `syncLatestTransactionsForAllBanks` wraps the call (line 252).

**Impact:** When `syncLatestTransactionsForBank` is called standalone (e.g. from `useBanks.syncSelectedBank()`), the UI stays stuck in "syncing" state after a successful sync. The "Sync Now" button remains disabled.

- File: `src/shared/composables/usePlaidSync.js:37,187,153-174`

### Bug 3: `_handleNoChangesCase` lock release uses inconsistent filter

`_handleNoChangesCase` (syncTransactionsService.js:161) releases the sync lock using `plaidItems.update({ itemId: item.itemId, userId: user._id }, ...)` but doesn't pass `user._id` — it receives only `(prevSyncSession, item, user, plaidData)` so `user._id` is available. However it uses a filter-based update while the rest of the codebase uses `item._id` directly. This works but is inconsistent and slightly less efficient (requires a `findOne` lookup inside `update`).

- File: `api/services/plaid/syncTransactionsService.js:161-164`

## Plan

Fix bugs in order of severity: Bug 1 (sync lock broken) → Bug 2 (UI stuck syncing) → Bug 3 (consistency).

## Tasks

- [x] 1. **Fix `isSyncRecent`**: Added `user` param to `isSyncRecent(item, user)` in syncSessionService.js and passed `user` from `_getAndLockItem` in syncTransactionsService.js. Sync lock now works.
- [x] 2. **Fix `isSyncing` not reset on success**: *Done — added `isSyncing.value = false` before final return.* Add `isSyncing.value = false` at the end of the success path in `syncLatestTransactionsForBank` (before the return on line 169).
- [x] 3. **Fix `_handleNoChangesCase` filter**: *Done — changed to `plaidItems.update(item._id, ...)`.* Change `plaidItems.update({ itemId: item.itemId, userId: user._id }, ...)` to `plaidItems.update(item._id, ...)` for consistency.
- [ ] 4. **Verify**: Confirm sync lock actually blocks concurrent syncs by checking logs when triggering two rapid syncs.
- [ ] 5. **Verify**: Confirm "Sync Now" button re-enables after a successful sync.

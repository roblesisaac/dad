# Fix "Last sync: Never" Always Displaying in BankList

## Problem

`BankList.vue` always shows **"Last sync: Never"** even when sync sessions exist and are visible in the Sync History modal (`SyncSessionsModal.vue` → `SyncSessionList.vue`).

**Root cause:** `BankList.vue` (line 94) reads `bank.lastSyncTime`, but this property does not exist as a top-level field on the bank object returned by the API. In the `plaidItems` model, `lastSyncTime` is nested inside the `syncData` object (`syncData.lastSyncTime`). The template should be reading `bank.syncData?.lastSyncTime` instead of `bank.lastSyncTime`.

### Relevant Files

- **Frontend:**
  - `src/features/banks/components/BankList.vue` — displays `bank.lastSyncTime` (wrong path)
  - `src/features/banks/composables/useBanks.js` — fetches banks via `api.get('plaid/items')`
- **Backend:**
  - `api/models/plaidItems.js` — schema defines `syncData.lastSyncTime` (nested)
  - `api/services/plaid/itemService.js` — `getUserItems()` returns raw items; `updateItemSyncStatus()` writes to `syncData`
  - `api/controllers/plaid/itemController.js` — returns items as-is (after scrubbing `accessToken`)

## Plan

Determine the best fix approach — either update the frontend to read the correct nested path, or update the backend to surface `lastSyncTime` at the top level. The frontend fix is simpler and more consistent with how the data is stored. Alternatively, derive `lastSyncTime` from the most recent sync session if `syncData.lastSyncTime` is also not being reliably populated.

## Tasks

- [x] 1. Verify the actual shape of a bank object returned by `GET /plaid/items` (check whether `syncData.lastSyncTime` is populated after a sync completes, or if it's also `null`).
  > **Finding:** `syncData.lastSyncTime` was **never written** by the new sync flow. `_updateItemAfterSync` in `syncTransactionsService.js` only wrote `status` and `sync_id` — it never touched `syncData`. The old `updateItemSyncStatus` in `itemService.js` wrote to `syncData`, but it's not called by the current sync flow. So both the frontend path AND the backend write were broken.

- [x] 2. If `syncData.lastSyncTime` is reliably populated: Update `BankList.vue` line 94 to read `bank.syncData?.lastSyncTime` instead of `bank.lastSyncTime`.
  > **Done:** Fixed `BankList.vue` to read `bank.syncData?.lastSyncTime` instead of `bank.lastSyncTime`.

- [x] 3. If `syncData.lastSyncTime` is **not** reliably populated: Trace the sync completion flow in `syncTransactionsService.js` and `syncSessionService.js` to determine where `syncData.lastSyncTime` should be set upon sync completion, and add/fix the update accordingly.
  > **Done:** Updated `_updateItemAfterSync` in `syncTransactionsService.js` to accept `syncTime` and write `syncData.lastSyncTime` on every sync completion. The `syncTime` is passed through from the sync session creation.

- [ ] 4. As a fallback/enhancement, consider deriving the "last sync" timestamp from the most recent sync session's `syncTime` field when displaying in `BankList.vue`, since sync sessions are the source of truth for sync history.

- [ ] 5. Test the fix by triggering a sync and confirming the "Last sync" field in `BankList.vue` updates to the correct timestamp instead of "Never".

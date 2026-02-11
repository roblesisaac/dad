# Fix Stale Bank State After Modal Actions (Revert / Sync)

## Problem

`BanksView.vue` and `SyncSessionsModal.vue` each call `useBanks()` independently. Since `useBanks()` is a **factory function** (not a singleton/store), they get completely separate reactive state.

After a successful "Revert to this Session" (or "Sync Now") inside the modal:
- The modal's internal `useBanks()` instance calls `fetchBanks()` and `fetchSyncSessions()`, but this only updates **its own** refs.
- `BanksView.vue`'s `banks` ref (which renders the `BankList` component) is **never updated**.
- `closeSyncSessionsModal()` in `BanksView.vue` simply sets `isSyncSessionsModalOpen = false` with no re-fetch.

**Result:** After reverting/syncing and closing the modal, the bank list on the main page shows stale data (old `sync_id`, old status, etc.). The user must manually refresh the entire page to see the updated bank info.

## Plan

Convert `useBanks()` to a shared singleton composable (or emit events from the modal to the parent to trigger a re-fetch). The simplest approach is to have `SyncSessionsModal` emit events when data changes so `BanksView` can re-fetch. The more robust approach is to make `useBanks()` a singleton store so all consumers share the same reactive state.

## Tasks

- [x] 1. **Decide on approach**: **Chose event-driven re-fetch.** Singleton would change semantics for all `useBanks()` consumers and risks shared-state side effects. Event approach is minimal: modal emits `@data-changed`, parent re-fetches.
- [x] 2. Add `@data-changed` emit from `SyncSessionsModal.vue` after revert/sync succeeds. — *Done: emits after `revertToSession` returns `success` and after `syncSelectedBank` returns `completed`.*
- [x] 3. Handle `@data-changed` in `BanksView.vue` by calling its own `fetchBanks()`. — *Done: added `@data-changed="fetchBanks"` on the `<SyncSessionsModal>` tag.*
- [ ] 4. **Verify**: After applying the fix, confirm that reverting to a session inside the modal correctly updates the bank list on the main `BanksView` page without requiring a page refresh. *(Requires manual testing with a connected Plaid item.)*
- [ ] 5. **Verify sync**: Also confirm that syncing inside the modal correctly updates the parent bank list state. *(Requires manual testing.)*


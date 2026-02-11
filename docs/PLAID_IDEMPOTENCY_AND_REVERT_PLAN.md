# Plaid Sync Idempotency and Revert Plan

This document captures:

- What the current system does for idempotency and revert/recovery
- Gaps identified during code review
- A concrete implementation plan
- Expected UX for sync, recovery, and manual revert

Related doc: `docs/PLAID_ITEM_CONNECTION_FLOW.md`

## Files Reviewed

Backend:
- `api/controllers/plaid/transactionController.js`
- `api/services/plaid/syncTransactionsService.js`
- `api/services/plaid/syncSessionService.js`
- `api/services/plaid/transactionRecoveryService.js`
- `api/services/plaid/transactionsCrudService.js`
- `api/models/syncSession.js`
- `api/models/plaidTransactions.js`
- `api/models/plaidItems.js`

Frontend:
- `src/shared/composables/usePlaidSync.js`
- `src/features/banks/composables/useBanks.js`
- `src/features/banks/components/SyncSessionList.vue`
- `src/features/banks/components/SessionListItem.vue`
- `src/features/banks/components/ConfirmReversionModal.vue`

## Current Behavior (Today)

### 1) Idempotency primitives currently in place

- Cursor-based progression:
  - Every sync call uses previous session `nextCursor` as the next request cursor.
  - Frontend loops until `hasMore === false`.
- Transaction identity:
  - `plaidtransactions.transaction_id` is unique.
- Session trail:
  - Every batch creates a `syncsession` row with expected vs actual counts.
- Item status:
  - `plaiditems.status` is used as a soft lock (`in_progress`, `complete`, `error`).

### 2) Automatic recovery currently in place

On each sync request:

1. Check if recovery is needed (item/session in `error`, or sync count mismatch).
2. If yes, revert to a previous sync point:
   - Determine session to retry (currently `failedSyncSession.prevSession_id`).
   - Remove transactions with `syncTime > referenceSyncTime`.
   - Create a recovery sync session.
   - Set item status to `complete`, point item `sync_id` to recovery session.
3. Return recovery response.
4. Frontend sees `recovery.performed` and immediately calls sync again.
5. Frontend stops after 3 consecutive recoveries and surfaces manual intervention error.

Current gap: recovery exhaustion does not map to a dedicated backend item state.

### 3) Manual revert currently in place

User can revert to a prior completed session in Sync History UI:

- Frontend calls `POST /api/plaid/items/:itemId/revert/:sessionId`.
- Backend:
  - Removes transactions with `syncTime > targetSession.syncTime`.
  - Creates a recovery session derived from target session.
  - Sets item `sync_id` to that recovery session.
- User may sync again after revert to replay deltas from the target cursor.

## Gaps and Risks Identified

### 1) Operation-level idempotency is incomplete

Transaction operations are not idempotent yet:

- Add: duplicate `transaction_id` is treated as failure (not no-op success).
- Modify: missing transaction is treated as failure (no upsert).
- Remove: missing transaction is treated as failure (not no-op success).

Impact:
- Replay from older cursor can fail for valid histories.
- Recoveries can loop due to count mismatches caused by strict CRUD behavior.

### 2) Revert strategy is coarse-grained

Current revert removes all rows with `syncTime > targetSyncTime`.

Impact:
- Modified transactions can be deleted, then later `modified` events fail because row is missing.
- Already-removed transactions can trigger remove failures during replay.
- Revert is closer to "truncate recent local state and replay" than a true transactional rollback.

### 3) Locking is soft and race-prone

- Concurrent sync protection depends on `item.status` + recency check.
- `isSyncRecent` path is weak and can miss true in-flight work.
- There is also a concrete implementation issue: `isSyncRecent` calls `getSyncSession` without a user argument, which weakens ownership validation in the current path.

Impact:
- Two syncs for same item can overlap and create non-deterministic outcomes.

### 4) UX and response shape inconsistencies

- Response shapes differ across normal/no-change/recovery paths.
- Manual revert UX warns about reverting modified/categorized state, but current backend behavior is local truncation + replay (not direct state restore).
- Manual revert does not automatically run catch-up sync.

## Target Idempotency Model

Goal: make sync operations safe under retries, repeated requests, and replay from older cursors.

### Invariants

1. Processing the same Plaid batch twice must converge to the same DB state.
2. Replaying from an older cursor must not fail due to local state differences.
3. Recovery must be bounded and observable.
4. Concurrent sync attempts for the same item must be rejected or deduped.

### Transaction operation rules (required)

- Add (`added`):
  - If `transaction_id` already exists for user, treat as no-op success.
- Modify (`modified`):
  - If missing locally, upsert instead of fail.
- Remove (`removed`):
  - If missing locally, treat as no-op success.

These three changes are the core idempotency requirement.

### Session dedupe rule (required)

Before creating a new sync session for `itemId + cursor`:

- If a recent `in_progress` session exists for same `itemId + cursor`, return `409 SYNC_IN_PROGRESS`.
- If a completed session exists for same `itemId + cursor` and same `nextCursor`, return cached response summary only when it is within a short TTL/staleness window.
- Otherwise, create a new session and process.

This prevents duplicate processing of the same cursor window.

Recommended staleness guard:
- Add `responseCachedAt` on sync session.
- Use cache only for short-lived retries (for example, 30-120 seconds).
- After TTL, reprocess normally to avoid stale reuse in edge-case upstream changes.

### Lock rule (required)

Add explicit lock metadata on item:

- `lockOwner` (session id)
- `lockAcquiredAt` (timestamp)
- `lockExpiresAt` (timestamp)

Acquire lock at sync start; release on complete/error/recovery; allow takeover only when expired.

## Revert Model (Target)

Keep "truncate local recent state + replay from cursor" as short-term approach, but make replay idempotent with rules above.

Definition:

- Revert to session S means:
  1. Delete/undo local transaction effects newer than S boundary.
  2. Set item cursor reference back to S.
  3. Run forward sync to current state safely.

With idempotent CRUD semantics, replay converges even if local state is partially present/missing.

Long-term option (strong rollback):

- Persist per-session mutation journal (added ids, before/after snapshots for modified, removed snapshots).
- Enable precise rollback without requiring replay.

## Expected UX

### 1) Syncing UX

- Trigger: user starts sync (onboarding or bank modal).
- Show:
  - "Syncing transactions..."
  - Running totals: added/modified/removed
  - Current batch number when `hasMore`
- On no changes:
  - "Everything is up to date."
- On recovery:
  - "We detected inconsistent sync data and automatically repaired it. Resyncing now."
- On repeated recoveries:
  - After 3 consecutive recoveries, show blocking error with next step:
    - "Sync needs attention. Please retry or reconnect this bank."
  - Backend sets item status to `needs_attention` for clear operational state.

### 2) Manual revert UX

- User chooses a completed session from history.
- Confirmation modal must state exact behavior:
  - "We will roll local data back to this sync point and then replay from Plaid."
  - "You may temporarily see count changes while replay completes."
- After confirm:
  - Show "Reverting..." state in modal.
  - On success, auto-start catch-up sync (default behavior).
  - Show final summary:
    - reverted to session id/time
    - local rows removed
    - rows added/modified/removed during replay
  - If catch-up sync fails, keep item in `needs_attention` with reconnect/retry CTA.

### 3) Error UX

- 409 sync in progress:
  - "Another sync is running for this bank."
- Auth/relink errors:
  - "Bank needs reconnection."
- Partial failures:
  - Keep session error details in history; provide retry CTA.

## Implementation Plan

### Phase 1: Idempotent transaction operations

Backend (`transactionsCrudService`):

1. `createTransaction`:
   - detect duplicate transaction id and return idempotent success
2. `updateTransaction`:
   - if transaction missing, create it (upsert path)
3. `removeTransaction`:
   - if transaction missing, return success/no-op

Result: replay/retry no longer fails due to strict CRUD assumptions.

### Phase 2: Sync dedupe and lock hardening

Backend (`syncTransactionsService`, `syncSessionService`):

1. Fix concrete bug in `isSyncRecent`/`getSyncSession` call path (missing user argument and ownership validation path).
2. Add lock metadata to `plaiditems`.
3. Add `itemId + cursor` dedupe check before processing.
4. Persist response summary in session for safe cached return with TTL/staleness guard.
5. Add/handle explicit `needs_attention` item state on recovery exhaustion.

Result: duplicate requests converge and concurrent runs are controlled.

### Phase 3: Revert reliability and semantics

Backend (`transactionRecoveryService`, `syncSessionService`, controller):

1. Keep revert boundary behavior, but rely on idempotent replay.
2. Return consistent structured response for manual and auto recovery.
3. Auto-trigger catch-up sync after manual revert by default; only fall back to `nextAction: "sync_required"` when auto-run is disabled or blocked.

Result: revert path is predictable and operationally safe.

### Phase 4: Response contract normalization

Backend + Frontend:

Use one response schema for all sync calls:

```json
{
  "success": true,
  "hasMore": false,
  "cursor": "string|null",
  "batch": { "number": 1, "added": 0, "modified": 0, "removed": 0 },
  "recovery": { "performed": false, "removedCount": 0, "revertedTo": null },
  "noChanges": false,
  "error": null
}
```

Result: simpler frontend orchestration and fewer edge-case branches.

### Phase 5: UX updates

Frontend (`usePlaidSync`, banks sync modals):

1. Add explicit `reverting` and `recovering` states.
2. Update confirm copy to match backend behavior.
3. Auto-run catch-up sync after successful manual revert.
4. Keep recovery feedback visible until complete/error.

Result: users understand what is happening and what to do next.

### Phase 6: Tests and observability

Add tests for:

- Duplicate add, missing modify, missing remove (all idempotent)
- Replay from older cursor with mixed added/modified/removed history
- Concurrent sync attempt returns 409
- Auto recovery then successful replay
- Manual revert then catch-up sync

Track metrics:

- `sync_recovery_count`
- `sync_consecutive_recoveries`
- `sync_idempotent_noop_add_count`
- `sync_idempotent_upsert_modify_count`
- `sync_idempotent_noop_remove_count`
- `sync_revert_duration_ms`
- `sync_lock_contention_count`
- `sync_needs_attention_count`

## Recommended Sequence

1. Phase 1 (idempotent CRUD semantics)
2. Phase 2 (locking and dedupe)
3. Phase 4 (response normalization)
4. Phase 5 (UX)
5. Phase 3 (revert auto-catch-up finalization)
6. Phase 6 (tests + metrics throughout)

This order reduces risk fastest: make data operations idempotent first, then tighten orchestration and UX.

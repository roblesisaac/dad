# Fix Plaid Sync Transactions for Serverless Architecture

## Problem

The current transaction sync implementation has issues that conflict with serverless architecture requirements. While the backend API correctly processes one batch per request and returns a `hasMore` flag, the interaction between frontend and backend needs refinement to ensure fast, predictable responses.

**Current Issues:**

1. **Frontend batching logic complexity**: The `usePlaidSync.js` composable handles the `while (hasMore)` loop internally, making sequential API calls until completion. This works but creates complex error handling and retry logic within a single composable.

2. **Status bar and progress feedback inconsistency**: The UI feedback during sync is managed inline, which can cause confusing user experiences when errors or recoveries occur.

3. **Backend response consistency**: The `syncLatestTransactionsForItem` endpoint returns different response shapes depending on whether recovery was performed, no changes were detected, or normal sync occurred. This makes frontend parsing unpredictable.

4. **Recovery response handling**: When recovery is performed, the backend returns `hasMore: true` but with a different response structure (`recovery` object instead of `batchResults`), requiring special frontend handling.

**Desired UX Flow:**
1. User logs in
2. Frontend syncs transactions with one GET request per batch
3. Server sends batch with `hasMore` flag
4. If frontend sees `hasMore: true`, it repeats the GET until `hasMore: false`
5. All responses complete within fast serverless response times

---

## Plan

### Phase 1: Normalize Backend Response Structure
Ensure all response types from `syncLatestTransactionsForItem` follow a consistent schema so the frontend can parse them uniformly.

### Phase 2: Refactor Frontend Sync Logic
Simplify the frontend composable to handle one batch at a time with clear state management and consistent UI feedback.

### Phase 3: Add Comprehensive Error Handling
Ensure errors at both batch and session level are surfaced clearly to the user and don't leave the UI in an inconsistent state.

### Phase 4: Testing & Validation
Test all scenarios: normal sync, multi-batch sync, no changes, recovery, and error conditions.

---

## Task List

### Phase 1: Normalize Backend Response Structure

- [ ] 1. Review current response shapes from `transactionController.syncLatestTransactionsForItem`:
  - Normal sync response with `batchResults`
  - No changes response with `noChanges: true`
  - Recovery response with `recovery` object

- [ ] 2. Create a standardized response interface in `syncTransactionsService.js`:
  ```javascript
  {
    success: true,
    hasMore: boolean,
    cursor: string | null,
    batch: {
      number: number,
      added: number,
      modified: number,
      removed: number
    },
    recovery: { performed: boolean, removedCount?: number, revertedTo?: string } | null,
    transactions: [] | null,  // Only for added transactions
    noChanges: boolean,
    error: { code: string, message: string } | null
  }
  ```

- [ ] 3. Update `_buildSyncResponse` to return the standardized shape

- [ ] 4. Update `_buildRecoveryResponse` to return the standardized shape

- [ ] 5. Update `_handleNoChangesCase` to return the standardized shape

- [ ] 6. Update `transactionController.syncLatestTransactionsForItem` to ensure consistent response mapping

### Phase 2: Refactor Frontend Sync Logic

- [ ] 7. Review `usePlaidSync.js` composable structure and identify state management improvements

- [ ] 8. Separate batch sync into a pure function that makes a single API call:
  ```javascript
  const fetchSingleBatch = async (itemId) => {
    // Single GET request, returns normalized response
  }
  ```

- [ ] 9. Create a sync orchestrator function that loops and calls `fetchSingleBatch`:
  ```javascript
  const syncAllBatches = async (itemId) => {
    // Loop until hasMore === false
    // Update progress after each batch
    // Handle recovery and error cases
  }
  ```

- [ ] 10. Update progress tracking to use a cleaner state object:
  ```javascript
  syncState: {
    status: 'idle' | 'syncing' | 'recovery' | 'error' | 'complete',
    currentBatch: number,
    totals: { added: 0, modified: 0, removed: 0 },
    error: string | null
  }
  ```

- [ ] 11. Simplify `updateStatusBar` calls to use fewer, clearer messages

- [ ] 12. Ensure the composable handles component unmounting gracefully (abort in-flight requests)

### Phase 3: Error Handling Improvements

- [ ] 13. Add request timeout handling for serverless cold starts (increase timeout tolerance)

- [ ] 14. Add retry logic with exponential backoff for transient failures (network errors, 5xx):
  - Max 3 retries
  - Backoff: 1s, 2s, 4s

- [ ] 15. Distinguish between recoverable errors (network, timeout) and fatal errors (auth, validation)

- [ ] 16. Add user-actionable error messages:
  - "Connection failed. Retrying..."
  - "Sync failed. Please try again."
  - "Authentication required. Please relink your account."

- [ ] 17. Ensure status bar clears properly on success and shows persistent errors

### Phase 4: Testing & Validation

- [ ] 18. Test normal sync flow: single batch, multi-batch

- [ ] 19. Test no changes scenario: verify quick response and UI feedback

- [ ] 20. Test recovery scenario: verify recovery message shown, sync resumes correctly

- [ ] 21. Test error scenarios:
  - Network timeout
  - Backend error (500)
  - Auth error (401/403)
  - SYNC_IN_PROGRESS conflict (409)

- [ ] 22. Test consecutive recovery limit (3 recoveries triggers manual intervention message)

- [ ] 23. Verify all response shapes match the standardized interface

---

## Files to Modify

**Backend:**
- `api/controllers/plaid/transactionController.js`
- `api/services/plaid/syncTransactionsService.js`

**Frontend:**
- `src/shared/composables/usePlaidSync.js`

**Documentation:**
- `api/services/plaid/README-TransactionSync.md` (update response schema section)

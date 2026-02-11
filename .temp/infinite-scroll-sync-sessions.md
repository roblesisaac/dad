# Infinite Scroll for Sync Session List

## Problem

The `SyncSessionList.vue` component currently loads a fixed number of sync sessions (default limit of 20) in a single request and displays them all at once. Users with extensive sync history cannot see sessions older than this initial batch. We need to implement infinite scroll so that as the user scrolls toward the bottom of the list, additional sessions are automatically loaded and appended.

**Current behavior:**
- `useBanks.fetchSyncSessions(itemId)` calls `GET /api/plaid/items/:itemId/sync-sessions?limit=20`
- The backend `syncSessionService.getSyncSessionsForItem` queries with `{ limit, reverse: true }` (most recent first)
- The `amptModel.find()` method already returns a `lastKey` property for cursor-based pagination, but it is not being used
- All sessions are loaded in a single request and rendered at once

**Desired behavior:**
- Load an initial batch of sessions (e.g., 20)
- As the user scrolls near the bottom of the session list, automatically fetch the next batch using cursor-based pagination (`lastKey` / `start`)
- Append new sessions to the existing list (not replace)
- Show a loading indicator at the bottom while fetching more
- Stop fetching when there are no more sessions (`lastKey` is null)

---

## Plan

### Phase 1: Backend – Return `lastKey` for Pagination
Update the backend API to return the `lastKey` cursor in the response so the frontend can request the next page.

### Phase 2: Frontend Composable – Support Paginated Fetching
Update `useBanks.js` to support appending sessions (load more) in addition to the initial fetch, using the `lastKey` cursor.

### Phase 3: Frontend Component – Implement Infinite Scroll
Update `SyncSessionList.vue` to detect when the user scrolls near the bottom and emit an event to load more sessions. Wire this through `SyncSessionsModal.vue`.

---

## Task List

### Phase 1: Backend – Return `lastKey` for Pagination

- [x] 1. Update `syncSessionService.getSyncSessionsForItem` in `api/services/plaid/syncSessionService.js`:
  - Accept a `start` option (cursor) in addition to `limit`
  - Pass `{ limit, reverse: true, start }` to `SyncSessions.find()`
  - Return both `items` and `lastKey` from the result (instead of just `items`)
  - Return shape: `{ sessions: [...], lastKey: string | null }`

- [x] 2. Update `transactionController.getSyncSessionsForItem` in `api/controllers/plaid/transactionController.js`:
  - Accept `start` query parameter (in addition to existing `limit`)
  - Pass `start` to `syncSessionService.getSyncSessionsForItem`
  - Include `lastKey` in the JSON response alongside `syncSessions`
  - Response shape: `{ itemId, syncSessions, currentSyncId, count, lastKey }`

### Phase 2: Frontend Composable – Support Paginated Fetching

- [x] 3. Update `useBanks.js` composable in `src/features/banks/composables/useBanks.js`:
  - Add a `syncSessionsLastKey` ref to track the pagination cursor
  - Add a `loadingMoreSessions` ref (separate from the initial `loading.syncSessions`)
  - Modify `fetchSyncSessions` to store `lastKey` from the response into `syncSessionsLastKey`
  - Add a new `fetchMoreSyncSessions(itemId)` method that:
    - Returns early if `syncSessionsLastKey` is null (no more pages) or `loadingMoreSessions` is true
    - Calls `GET /api/plaid/items/:itemId/sync-sessions?limit=20&start={lastKey}`
    - Appends the returned sessions to the existing `syncSessions` array
    - Updates `syncSessionsLastKey` with the new `lastKey`
  - Add a `hasMoreSyncSessions` computed property based on `syncSessionsLastKey !== null`
  - Export `fetchMoreSyncSessions`, `loadingMoreSessions`, and `hasMoreSyncSessions`

### Phase 3: Frontend Components – Implement Infinite Scroll

- [x] 4. Update `SyncSessionList.vue` in `src/features/banks/components/SyncSessionList.vue`:
  - Add new props: `loadingMore` (Boolean) and `hasMore` (Boolean)
  - Add a sentinel `div` element at the bottom of the session list (after the `v-for` loop)
  - Use an `IntersectionObserver` in an `onMounted` / `onUnmounted` lifecycle hook to watch the sentinel element
  - When the sentinel becomes visible and `hasMore` is true and `loadingMore` is false, emit a `load-more` event
  - Show a small loading spinner at the bottom when `loadingMore` is true
  - Clean up the `IntersectionObserver` on unmount

- [x] 5. Update `SyncSessionsModal.vue` in `src/features/banks/components/SyncSessionsModal.vue`:
  - Destructure `fetchMoreSyncSessions`, `loadingMoreSessions`, and `hasMoreSyncSessions` from `useBanks()`
  - Pass `:loading-more="loadingMoreSessions"` and `:has-more="hasMoreSyncSessions"` to `SyncSessionList`
  - Handle the `@load-more` event by calling `fetchMoreSyncSessions(props.bank.itemId)`

### Phase 4: Validation

- [ ] 6. Test the full flow:
  - Verify initial load fetches the first batch of sessions
  - Verify scrolling to the bottom triggers loading of additional sessions
  - Verify sessions are appended (not replaced) and maintain correct order (most recent first)
  - Verify the loading spinner appears while fetching more
  - Verify scrolling stops triggering fetches when all sessions have been loaded (`lastKey` is null)
  - Verify a new sync or revert correctly resets the list and pagination cursor

---

## Files to Modify

**Backend:**
- `api/services/plaid/syncSessionService.js` – return `lastKey` from `getSyncSessionsForItem`
- `api/controllers/plaid/transactionController.js` – accept `start` param, return `lastKey`

**Frontend:**
- `src/features/banks/composables/useBanks.js` – add `fetchMoreSyncSessions`, pagination state
- `src/features/banks/components/SyncSessionList.vue` – infinite scroll with IntersectionObserver
- `src/features/banks/components/SyncSessionsModal.vue` – wire new props and events
